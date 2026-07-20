// netlify/functions/computeLeaderboard.js
// H-03 fix: server-side pre-computation of leaderboard snapshots.
//
// Problem: every user visiting the leaderboard page fetched up to 500
// coinTransaction docs, aggregated them client-side, and the result grew
// less accurate as total transaction volume exceeded 500. Also wasted
// Firestore quota proportional to leaderboard visitors.
//
// Fix: this scheduled function runs hourly, queries ALL transactions
// (no client-side limit), aggregates them server-side, and writes
// pre-computed snapshots to leaderboard/{type}_{period} documents.
// Leaderboard.jsx reads the pre-computed doc first (1 read per visit)
// and falls back to the old client-side aggregation if the doc is missing.
//
// Firestore path: leaderboard/{type}_{period}
//   e.g. leaderboard/senders_today, leaderboard/receivers_all
//
// Rule: leaderboard/* — read: auth != null; write: false (Admin SDK only)

import { schedule } from '@netlify/functions';
import { getAdminDb } from './shared/firestoreAdmin.js';

const TYPES   = ['senders', 'receivers'];
const PERIODS = ['today', 'week', 'month', 'all'];

// Leaderboard.jsx shows top 20 per combination
const TOP_N = 20;

async function computeAll(adminDb) {
  const now        = new Date();
  const todayKey   = now.toISOString().slice(0, 10);
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = { computed: 0, errors: 0 };

  for (const type of TYPES) {
    const txType = type === 'senders' ? 'gift_sent' : 'gift_received';

    // Fetch ALL transactions of this type in one pass (no limit — server-side).
    // Paginate in batches of 1000 to avoid memory spikes on very large datasets.
    let allTxs = [];
    let lastDoc = null;
    const BATCH_SIZE = 1000;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let q = adminDb
        .collection('coinTransactions')
        .where('type', '==', txType)
        .orderBy('timestamp', 'desc')
        .limit(BATCH_SIZE);
      if (lastDoc) q = q.startAfter(lastDoc);

      const snap = await q.get();
      if (snap.empty) break;

      allTxs = allTxs.concat(snap.docs.map(d => d.data()));
      lastDoc = snap.docs[snap.docs.length - 1];

      if (snap.size < BATCH_SIZE) break; // last page
    }

    // Aggregate per period
    for (const period of PERIODS) {
      try {
        const filtered = allTxs.filter(tx => {
          if (!tx.timestamp) return false;
          const ts = tx.timestamp.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp);
          if (period === 'today')  return ts.toISOString().slice(0, 10) === todayKey;
          if (period === 'week')   return ts >= weekStart;
          if (period === 'month')  return ts >= monthStart;
          return true; // 'all'
        });

        const map = {};
        for (const tx of filtered) {
          const uid = tx.uid;
          if (!uid) continue;
          if (!map[uid]) map[uid] = { uid, coins: 0, gifts: 0 };
          map[uid].coins += Math.abs(tx.coins || 0);
          map[uid].gifts += 1;
        }

        const top = Object.values(map)
          .sort((a, b) => b.coins - a.coins)
          .slice(0, TOP_N);

        const docId  = `${type}_${period}`;
        const docRef = adminDb.collection('leaderboard').doc(docId);
        await docRef.set({
          type,
          period,
          top,
          computedAt: now.toISOString(),
          totalTransactions: allTxs.length,
        });

        stats.computed++;
      } catch (e) {
        console.error(`[computeLeaderboard] Error for ${type}/${period}:`, e.message);
        stats.errors++;
      }
    }
  }

  return stats;
}

const handler = schedule('@hourly', async () => {
  const start = Date.now();
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.warn('[computeLeaderboard] Firebase Admin not configured — skipping.');
      return { statusCode: 200, body: JSON.stringify({ skipped: true }) };
    }

    const result = await computeAll(adminDb);
    const ms = Date.now() - start;
    console.log(`[computeLeaderboard] Done in ${ms}ms:`, result);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, durationMs: ms, ...result }),
    };
  } catch (e) {
    console.error('[computeLeaderboard] Fatal:', e.message, e.stack);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
});

export { handler };
