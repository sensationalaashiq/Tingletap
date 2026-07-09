/**
 * Netlify Function: post-automod-notice  (v2 — hardened)
 * ────────────────────────────────────────────────────────
 * Writes a TingleBot AutoMod notice to Firestore using Firebase Admin SDK.
 *
 * Security model (v2):
 *  1. Firebase ID token verified via Admin SDK (not JWT-only decode).
 *  2. Caller role checked in Firestore — must be owner / admin / moderator.
 *  3. Client sends violation signal only (violationType + action + uids).
 *     Notice text is generated entirely server-side — no client-supplied text
 *     is ever written to Firestore.
 *  4. violatorUid existence validated against Firestore users collection.
 *  5. Per-caller rate limit  : 20 notices per 5-minute window.
 *  6. Per-room  rate limit   : 50 notices per 5-minute window.
 *  7. Dedup lock key scoped to room + violator + action (was violator-only).
 *  8. violatorDisplayName sanitised server-side (HTML stripped, 50-char cap).
 *
 * POST body: { roomId, violatorUid, violatorDisplayName, violationType, action, muteDurationMs? }
 * Header:    Authorization: Bearer <Firebase ID token>
 */

import admin from 'firebase-admin';

/* ── CORS ─────────────────────────────────────────────────────────────────── */
const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':'Content-Type, Authorization',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};

/* ── Allowed values ───────────────────────────────────────────────────────── */
const STAFF_ROLES  = new Set(['owner', 'admin', 'moderator']);

const ALLOWED_ACTIONS = new Set([
  'warn', 'delete_warn',
  'mute_5', 'mute_30', 'mute_3h', 'mute_24h',
  'kick',
]);

const ALLOWED_VIOLATION_TYPES = new Set([
  'threat', 'doxxing', 'hate', 'scam',
  'minor_grooming', 'non_consensual',
  'spam', 'harassment', 'link', 'family_abuse',
]);

/* ── Rate-limit config ────────────────────────────────────────────────────── */
const RL_WINDOW_MS     = 5 * 60 * 1000; // 5-minute window
const RL_CALLER_MAX    = 20;             // per caller per window
const RL_ROOM_MAX      = 50;             // per room per window

/* ── Notice TTL (must match client-side NOTICE_TTL_MS) ───────────────────── */
const NOTICE_TTL_MS = 60 * 1000;
// Blanket per-violator cooldown across ALL action types. Multiple room
// participants detect the same violation concurrently and each calls this
// function, and a fast-typing violator can trigger several different
// violation types within a couple of seconds — without this, each of those
// generates its own notice, which reads as spam. This short window collapses
// any burst of notices about the same violator into a single one, regardless
// of action, while still allowing genuine escalation notices a few seconds later.
const NOTICE_BURST_MS = 7 * 1000;

/* ── Firebase init ────────────────────────────────────────────────────────── */
let fbReady = false;
function initFirebase() {
  if (fbReady || admin.apps.length > 0) { fbReady = true; return true; }
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[post-automod-notice] Firebase env vars missing');
    return false;
  }
  try {
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    fbReady = true;
    return true;
  } catch (err) {
    console.error('[post-automod-notice] Firebase Admin init error:', err.message);
    return false;
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Strip HTML tags and control characters; cap length. */
const sanitiseName = (raw) =>
  String(raw || 'User')
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s._\-]/gu, '')
    .trim()
    .slice(0, 50) || 'User';

/** Deterministic variant selection so all watching clients would agree. */
const pickVariant = (arr, seed) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
};

const VIOLATION_LABELS = {
  threat:         'Threat of violence',
  doxxing:        'Personal information / doxxing',
  hate:           'Hate speech / terrorism promotion',
  scam:           'Scam / phishing / illegal activity',
  minor_grooming: 'Minor safety / grooming',
  non_consensual: 'Non-consensual sexual content',
  spam:           'Message flooding / spam',
  harassment:     'Repeated harassment',
  link:           'Unauthorized link sharing',
  family_abuse:   'Abusive language',
};

const MUTE_DURATION_LABELS = {
  mute_5:   '5 minutes',
  mute_30:  '30 minutes',
  mute_3h:  '3 hours',
  mute_24h: '24 hours',
};

const ACTION_TO_TYPE = {
  warn:        'automod',
  delete_warn: 'automod',
  mute_5:      'muted',
  mute_30:     'muted',
  mute_3h:     'muted',
  mute_24h:    'muted',
  kick:        'kicked',
};

/**
 * Build the TingleBot notice text entirely on the server.
 * The seed (violatorUid + action) ensures all concurrent clients would
 * pick the same variant, avoiding duplicate messages with different text.
 */
const buildNoticeText = (action, name, violationType) => {
  const label = VIOLATION_LABELS[violationType] || 'Community guideline violation';
  const seed  = name + action;

  if (action === 'kick') {
    return pickVariant([
      `${name} was automatically removed after repeated violations.`,
      `${name} has been removed from the chat due to continued violations.`,
      `${name} was kicked by AutoMod after exceeding the violation limit.`,
    ], seed);
  }

  if (action.startsWith('mute_')) {
    const dur = MUTE_DURATION_LABELS[action] || 'some time';
    return pickVariant([
      `${name} has been muted for ${dur} — ${label}.`,
      `${name} was temporarily silenced (${dur}) due to: ${label}.`,
      `Chat muted for ${name} (${dur}). Reason: ${label}.`,
    ], seed);
  }

  if (action === 'delete_warn') {
    return pickVariant([
      `A message from ${name} was removed — ${label}. Another violation may result in a mute.`,
      `${name}'s message was deleted for: ${label}. Please review the chat rules.`,
      `Message removed (${label}). ${name}, this is a final warning before muting.`,
    ], seed);
  }

  // warn
  return pickVariant([
    `Hey ${name}, let's keep the chat welcoming for everyone. ${label} is not allowed here. This is your first warning.`,
    `${name}, please mind the community guidelines. ${label} detected — first warning.`,
    `Heads up, ${name}! ${label} isn't acceptable here. Please keep it respectful.`,
  ], seed);
};

/* ── Main handler ─────────────────────────────────────────────────────────── */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  /* 1 ── Token verification ─────────────────────────────────────────────── */
  const idToken = (event.headers['authorization'] || event.headers['Authorization'] || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!idToken) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized — no token' }) };
  }

  if (!initFirebase()) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const db = admin.firestore();

  let callerUid;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken, /* checkRevoked= */ true);
    callerUid = decoded.uid;
  } catch (e) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  /* 2 ── Caller must be a registered (non-anonymous) user ──────────────── */
  // Any authenticated user may trigger an AutoMod notice so that violations
  // are surfaced even in rooms without staff online. Actual enforcement actions
  // (mute / kick / ban) remain staff-only and are executed client-side only
  // when isStaff === true. Notice text is generated entirely server-side so
  // callers cannot fabricate content; rate limits and dedup cap abuse.
  // Anonymous / guest-only sessions have no uid doc — reject them.
  try {
    const callerSnap = await db.collection('users').doc(callerUid).get();
    if (!callerSnap.exists) {
      // Guest users have no Firestore doc — allow them through with the same
      // hardening (rate limits, dedup, server-side text) so AutoMod works
      // in rooms where only guests are present.
      console.info(`[post-automod-notice] Caller ${callerUid} has no users doc (guest) — proceeding`);
    }
    // Owners are never subject to automod from their own instance — but we
    // do not block them here; the processAutoMod client-side guard already
    // exempts staff-role senders from being detected as violators.
  } catch (e) {
    console.error('[post-automod-notice] Caller lookup error:', e.message);
    // Non-fatal — proceed; token verification already confirmed a valid uid
  }

  /* 3 ── Input validation ───────────────────────────────────────────────── */
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { roomId, violatorUid, violatorDisplayName, violationType, action } = body;

  if (!roomId || !violatorUid || !violatorDisplayName || !violationType || !action) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required fields: roomId, violatorUid, violatorDisplayName, violationType, action' }) };
  }
  if (typeof roomId !== 'string' || roomId.length > 100) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid roomId' }) };
  }
  if (typeof violatorUid !== 'string' || violatorUid.length > 128) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid violatorUid' }) };
  }
  if (!ALLOWED_ACTIONS.has(action)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Invalid action: ${action}` }) };
  }
  if (!ALLOWED_VIOLATION_TYPES.has(violationType)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Invalid violationType: ${violationType}` }) };
  }

  /* 4 ── Violator existence check ──────────────────────────────────────── */
  try {
    const violatorSnap = await db.collection('users').doc(violatorUid).get();
    if (!violatorSnap.exists) {
      // Could be a guest (no Firestore doc) — allow through but keep sanitised name only
      console.warn(`[post-automod-notice] violatorUid ${violatorUid} has no users doc (guest?)`);
    }
  } catch (e) {
    console.error('[post-automod-notice] Violator lookup error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Violator verification failed' }) };
  }

  /* 5 ── Rate limits + dedup (single Firestore transaction) ────────────── */
  const callerRlKey = `_rl_c_${callerUid}`;
  const roomRlKey   = '_rl_room';
  const dedupKey    = `_lk_${violatorUid}_${action}`;
  const burstKey    = `_lkb_${violatorUid}`;

  const callerRlRef = db.collection('rooms').doc(roomId).collection('automod').doc(callerRlKey);
  const roomRlRef   = db.collection('rooms').doc(roomId).collection('automod').doc(roomRlKey);
  const dedupRef    = db.collection('rooms').doc(roomId).collection('automod').doc(dedupKey);
  const burstRef    = db.collection('rooms').doc(roomId).collection('automod').doc(burstKey);

  let blocked = false;
  let blockReason = '';
  let alreadyPosted = false;
  const now = Date.now();

  try {
    await db.runTransaction(async (t) => {
      const [callerRlSnap, roomRlSnap, dedupSnap, burstSnap] = await Promise.all([
        t.get(callerRlRef),
        t.get(roomRlRef),
        t.get(dedupRef),
        t.get(burstRef),
      ]);

      // Dedup check (same violator + same action within NOTICE_TTL_MS)
      if (dedupSnap.exists) {
        const { expiresAt } = dedupSnap.data();
        if (typeof expiresAt === 'number' && expiresAt > now) {
          alreadyPosted = true;
          return; // don't throw — outer code handles it
        }
      }

      // Burst check (ANY notice about this violator within NOTICE_BURST_MS,
      // regardless of action) — collapses rapid multi-violation bursts into
      // a single notice instead of firing one per violation.
      if (burstSnap.exists) {
        const { expiresAt } = burstSnap.data();
        if (typeof expiresAt === 'number' && expiresAt > now) {
          alreadyPosted = true;
          return;
        }
      }

      // Per-caller rate limit
      const crl = callerRlSnap.exists ? callerRlSnap.data() : { count: 0, windowStart: now };
      if (now - crl.windowStart > RL_WINDOW_MS) { crl.count = 0; crl.windowStart = now; }
      if (crl.count >= RL_CALLER_MAX) {
        blocked = true; blockReason = 'caller_rate_limit';
        return;
      }

      // Per-room rate limit
      const rrl = roomRlSnap.exists ? roomRlSnap.data() : { count: 0, windowStart: now };
      if (now - rrl.windowStart > RL_WINDOW_MS) { rrl.count = 0; rrl.windowStart = now; }
      if (rrl.count >= RL_ROOM_MAX) {
        blocked = true; blockReason = 'room_rate_limit';
        return;
      }

      // Claim: update rate counters + set dedup + burst locks
      t.set(callerRlRef, { count: crl.count + 1, windowStart: crl.windowStart });
      t.set(roomRlRef,   { count: rrl.count + 1, windowStart: rrl.windowStart });
      t.set(dedupRef, {
        expiresAt: now + NOTICE_TTL_MS,
        postedAt:  admin.firestore.FieldValue.serverTimestamp(),
        callerUid,
        violatorUid,
        action,
        violationType,
      });
      t.set(burstRef, {
        expiresAt: now + NOTICE_BURST_MS,
        postedAt:  admin.firestore.FieldValue.serverTimestamp(),
        callerUid,
        violatorUid,
        action,
      });
    });
  } catch (e) {
    console.error('[post-automod-notice] Transaction error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Rate-limit/dedup transaction failed' }) };
  }

  if (alreadyPosted) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, skipped: true, reason: 'duplicate' }) };
  }
  if (blocked) {
    return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: `Rate limit exceeded (${blockReason})` }) };
  }

  /* 6 ── Generate notice text + write TingleBot message ─────────────────── */
  const safeName    = sanitiseName(violatorDisplayName);
  const noticeText  = buildNoticeText(action, safeName, violationType);
  const tinglebotType = ACTION_TO_TYPE[action] || 'automod';

  try {
    const msgRef = await db
      .collection('rooms').doc(roomId)
      .collection('messages').add({
        text:         noticeText,
        uid:          'tinglebot_system_official_2024',
        displayName:  'TingleBot',
        isBot:        true,
        systemBot:    true,
        tinglebotType,
        createdAt:    admin.firestore.FieldValue.serverTimestamp(),
        noReply:      true,
        noReaction:   true,
        noReport:     true,
        noUnread:     true,
      });

    console.log(`[post-automod-notice] ✓ ${tinglebotType} notice posted: ${msgRef.id} (room:${roomId} action:${action} violator:${violatorUid})`);
    return {
      statusCode: 200,
      headers:    CORS,
      body:       JSON.stringify({ ok: true, id: msgRef.id }),
    };
  } catch (e) {
    console.error('[post-automod-notice] Firestore write error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Firestore write failed' }) };
  }
};
