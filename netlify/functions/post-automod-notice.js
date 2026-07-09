/**
 * Netlify Function: post-automod-notice
 * ─────────────────────────────────────
 * Writes a TingleBot automoderation notice to Firestore using Firebase Admin
 * SDK so that the security rules (which require isTingleBot() or isStaff())
 * are bypassed server-side. This allows any authenticated client (registered
 * user, RJ, badge holder, guest) to trigger a visible warning notice without
 * the < 1 second optimistic-flash / rollback that occurs when a non-staff
 * client tries to write isBot/systemBot flags directly.
 *
 * POST body: { roomId, text, tinglebotType, violatorUid }
 * Header:    Authorization: Bearer <Firebase ID token>
 */

import admin from 'firebase-admin';

const CORS = {
  'Content-Type':                'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':'Content-Type, Authorization',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};

const ALLOWED_TYPES = new Set([
  'automod', 'kicked', 'muted', 'unmuted', 'banned', 'unbanned',
  'promoted', 'demoted', 'rule', 'announcement', 'system',
]);

const TTL_MS = 60 * 1000; // notice visible for 60 s (matches NOTICE_TTL_MS in tinglebotAutoMod.js)

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

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Auth token verification ─────────────────────────────────────────────
  const idToken = (event.headers['authorization'] || event.headers['Authorization'] || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!idToken) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized — no token' }) };
  }

  if (!initFirebase()) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  let callerUid;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    callerUid = decoded.uid;
  } catch (e) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid or expired token' }) };
  }

  // ── Input validation ────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { roomId, text, tinglebotType, violatorUid } = body;
  if (!roomId || !text || !tinglebotType) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing required fields: roomId, text, tinglebotType' }) };
  }
  if (!ALLOWED_TYPES.has(tinglebotType)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Invalid tinglebotType: ${tinglebotType}` }) };
  }
  if (typeof text !== 'string' || text.length < 2 || text.length > 600) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid text length' }) };
  }
  if (typeof roomId !== 'string' || roomId.length > 100) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid roomId' }) };
  }

  const db = admin.firestore();

  // ── Deduplication lock ──────────────────────────────────────────────────
  // Prevents multiple clients (e.g. two staff members both watching a room)
  // from each posting the same automod notice within the TTL window.
  // Lock key is scoped to the violator so a second violation from a different
  // user always gets its own notice.
  const lockKey = violatorUid ? `notice_${violatorUid}` : `notice_caller_${callerUid}`;
  const lockRef = db.collection('rooms').doc(roomId).collection('automod').doc(lockKey);

  let alreadyPosted = false;
  try {
    await db.runTransaction(async (t) => {
      const snap = await t.get(lockRef);
      if (snap.exists()) {
        const { expiresAt } = snap.data();
        if (typeof expiresAt === 'number' && expiresAt > Date.now()) {
          alreadyPosted = true;
          return; // don't throw — just mark and let outer code handle
        }
      }
      // Claim the lock
      t.set(lockRef, {
        expiresAt:  Date.now() + TTL_MS,
        postedAt:   admin.firestore.FieldValue.serverTimestamp(),
        callerUid,
        violatorUid: violatorUid || callerUid,
        tinglebotType,
      });
    });
  } catch (e) {
    console.error('[post-automod-notice] Lock transaction error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Dedup lock failed' }) };
  }

  if (alreadyPosted) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, skipped: true, reason: 'duplicate' }) };
  }

  // ── Write TingleBot message via Admin SDK (bypasses client security rules) ─
  try {
    const msgRef = await db
      .collection('rooms').doc(roomId)
      .collection('messages').add({
        text,
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
