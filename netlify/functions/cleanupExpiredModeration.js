// netlify/functions/cleanupExpiredModeration.js
//
// Netlify Scheduled Function — runs every 15 minutes.
//
// Purpose: server-side cleanup of expired bans, mutes, and kicks.
// Previously expiry was client-only (modExpiryService.js), meaning a user
// stayed banned/muted/kicked indefinitely if no browser session was open to
// trigger the client-side timer check. This function is the authoritative sweep.
//
// Data schema (written by moderationAction.js):
//   Mute  → users/{uid}.mutedInfo.{ isMuted, muteUntil (ISO|null) }
//   Ban   → users/{uid}.{ isBanned, banInfo.banUntil (ISO|null) }
//   Kick  → rooms/{roomId}/kickedUsers/{uid}.{ kickUntil (ISO|null) }
//            + users/{uid}.kickedFrom.{ roomId, ... }
//
// null expiry  = permanent → never auto-lifted here.
// Runs with Firebase Admin SDK (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY).

import { schedule } from '@netlify/functions';
import { getAdminDb } from './shared/firestoreAdmin.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Commit a Firestore Admin batch and start a fresh one. */
async function flushBatch(db, batch, ops) {
  if (ops > 0) await batch.commit();
  return { batch: db.batch(), ops: 0 };
}

// ── main cleanup ──────────────────────────────────────────────────────────────

async function runCleanup() {
  const adminDb = getAdminDb();
  if (!adminDb) {
    console.warn('[cleanupExpiredModeration] Firebase Admin not configured — skipping.');
    return { mutesCleared: 0, bansCleared: 0, kicksCleared: 0, error: 'admin_not_configured' };
  }

  const now = new Date().toISOString();
  const stats = { mutesCleared: 0, bansCleared: 0, kicksCleared: 0 };

  // ── 1. EXPIRED MUTES ────────────────────────────────────────────────────────
  // Query: all currently muted users.
  // Filter in code: muteUntil is non-null AND in the past.
  // (Permanent mutes have muteUntil: null → skipped.)
  // Single-field equality query — no composite index needed.
  {
    const snap = await adminDb
      .collection('users')
      .where('mutedInfo.isMuted', '==', true)
      .limit(200)
      .get();

    let { batch, ops } = { batch: adminDb.batch(), ops: 0 };

    for (const userDoc of snap.docs) {
      const { mutedInfo = {} } = userDoc.data();
      const muteUntil = mutedInfo.muteUntil;
      if (!muteUntil) continue;             // permanent — skip
      if (muteUntil >= now) continue;        // still active — skip

      batch.update(userDoc.ref, {
        'mutedInfo.isMuted'   : false,
        'mutedInfo.muteUntil' : null,
        'mutedInfo.mutedAt'   : null,
        'mutedInfo.duration'  : null,
        'mutedInfo.reason'    : null,
        'mutedInfo.mutedBy'   : null,
        'mutedInfo.unmutedAt' : now,
        'mutedInfo.unmutedBy' : 'System (scheduled expiry)',
      });
      ops++;
      stats.mutesCleared++;

      // Firestore batches cap at 500 ops
      if (ops >= 490) ({ batch, ops } = await flushBatch(adminDb, batch, ops));
    }
    await flushBatch(adminDb, batch, ops);
  }

  // ── 2. EXPIRED BANS ─────────────────────────────────────────────────────────
  // Query: all currently banned users.
  // Filter in code: banInfo.banUntil is non-null AND in the past.
  // Permanent bans have banInfo.banUntil: null → skipped.
  {
    const snap = await adminDb
      .collection('users')
      .where('isBanned', '==', true)
      .limit(200)
      .get();

    let { batch, ops } = { batch: adminDb.batch(), ops: 0 };

    for (const userDoc of snap.docs) {
      const data = userDoc.data();
      const banUntil = data.banInfo?.banUntil;

      // Also support legacy schema: bannedAt + banDuration (duration string)
      let expired = false;
      if (banUntil) {
        expired = banUntil < now;
      } else if (data.bannedAt && data.banDuration && data.banDuration !== 'permanent') {
        // Legacy: compute absolute expiry from bannedAt + banDuration
        const bannedAtMs = typeof data.bannedAt === 'string'
          ? new Date(data.bannedAt).getTime()
          : data.bannedAt?.seconds ? data.bannedAt.seconds * 1000 : null;
        if (bannedAtMs) {
          const durMs = parseDurationString(data.banDuration);
          if (durMs !== Infinity) expired = Date.now() > bannedAtMs + durMs;
        }
      }

      if (!expired) continue;

      batch.update(userDoc.ref, {
        isBanned   : false,
        banInfo    : null,
        // legacy field cleanup
        banReason  : null,
        bannedAt   : null,
        banDuration: null,
        unbannedAt : now,
        unbannedBy : 'System (scheduled expiry)',
      });
      ops++;
      stats.bansCleared++;

      if (ops >= 490) ({ batch, ops } = await flushBatch(adminDb, batch, ops));
    }
    await flushBatch(adminDb, batch, ops);
  }

  // ── 3. EXPIRED KICKS ────────────────────────────────────────────────────────
  // Collection-group query across ALL rooms/{roomId}/kickedUsers subcollections.
  // Index: collectionGroup=kickedUsers, fields=[kickUntil ASC] — already defined
  // in firestore.indexes.json.
  // Permanent kicks have kickUntil: null → not returned by this range query.
  {
    const snap = await adminDb
      .collectionGroup('kickedUsers')
      .where('kickUntil', '<', now)
      .limit(200)
      .get();

    let { batch, ops } = { batch: adminDb.batch(), ops: 0 };

    for (const kickDoc of snap.docs) {
      const data = kickDoc.data();

      // Delete the kickedUsers subcollection doc
      batch.delete(kickDoc.ref);
      ops++;

      // Clear kickedFrom on the user doc IF it points to this specific room
      // (a user can only be tracked in one room at a time via kickedFrom)
      if (data.uid) {
        const userRef = adminDb.collection('users').doc(data.uid);
        // Use a conditional update — only null kickedFrom if it matches this room
        // We do a best-effort update; if the doc is gone or doesn't match, the
        // catch below swallows the error gracefully.
        batch.update(userRef, {
          kickedFrom: null,
          // Mark when the system auto-cleared this so it is auditable
          lastAutoUnkick: now,
        });
        ops++;
      }

      stats.kicksCleared++;
      if (ops >= 488) ({ batch, ops } = await flushBatch(adminDb, batch, ops));
    }
    await flushBatch(adminDb, batch, ops);
  }

  // ── 4. EXPIRED RATE-LIMIT COUNTERS ──────────────────────────────────────────
  // _rateLimits docs have a `resetAt` epoch-ms field. Once resetAt < now the
  // counter is stale — future requests will overwrite it anyway, but leaving
  // docs accumulating forever wastes storage and slows queries.
  // Cap the sweep to 200 docs per run to stay within batch limits.
  {
    const nowMs = Date.now();
    const snap = await adminDb
      .collection('_rateLimits')
      .where('resetAt', '<', nowMs)
      .limit(200)
      .get();

    let { batch, ops } = { batch: adminDb.batch(), ops: 0 };

    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      ops++;
      if (ops >= 490) ({ batch, ops } = await flushBatch(adminDb, batch, ops));
    }
    await flushBatch(adminDb, batch, ops);
    stats.rateLimitsCleared = snap.size;
  }

  return stats;
}

// ── Legacy duration parser (mirrors modExpiryService.parseDurationMs) ─────────
// Kept here so the server never needs to import client-side code.
function parseDurationString(value) {
  if (!value || value === 'permanent') return Infinity;
  const s = String(value).toLowerCase().trim();
  if (s === 'permanent' || s === 'never') return Infinity;
  const n = parseFloat(s);
  if (!n || isNaN(n)) return Infinity;
  if (s.includes('d'))  return n * 86_400_000;
  if (s.includes('h'))  return n * 3_600_000;
  if (s.includes('mo')) return n * 30 * 86_400_000;
  if (s.includes('m'))  return n * 60_000;
  if (s.includes('w'))  return n * 7 * 86_400_000;
  if (s.includes('y'))  return n * 365 * 86_400_000;
  return n * 60_000; // bare number → minutes
}

// ── Scheduled entry point ─────────────────────────────────────────────────────
// Runs every 15 minutes. Netlify Scheduled Functions require at least a
// Level 1 (Pro) plan; the project already uses @hourly in cleanupExpiredVerifications.js
// so this plan requirement is already met.
const handler = schedule('*/15 * * * *', async () => {
  const start = Date.now();
  try {
    const result = await runCleanup();
    const ms = Date.now() - start;
    console.log(`[cleanupExpiredModeration] Done in ${ms}ms:`, result);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, durationMs: ms, ...result }),
    };
  } catch (e) {
    console.error('[cleanupExpiredModeration] Fatal error:', e.message, e.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
});

export { handler };
