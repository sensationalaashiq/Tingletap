// netlify/functions/cleanupExpiredVerifications.js
// Scheduled Netlify Function — runs hourly.
// Finds pending badge applications older than 48h, deletes R2 media, marks them expired.
// Requires: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (Firebase Admin SDK)

import { schedule } from '@netlify/functions';
import { deleteObjects } from './shared/r2Client.js';
import { getAdminDb } from './shared/firestoreAdmin.js';

const EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

async function runCleanup() {
  const adminDb = getAdminDb();
  if (!adminDb) {
    console.warn('[cleanupExpiredVerifications] Firebase Admin not configured — skipping.');
    return { cleaned: 0, error: 'admin_not_configured' };
  }

  const cutoff = new Date(Date.now() - EXPIRY_MS);
  const { Timestamp } = await import('firebase-admin/firestore');

  const snap = await adminDb
    .collection('badgeApplications')
    .where('status', '==', 'pending')
    .where('submittedAt', '<', Timestamp.fromDate(cutoff))
    .limit(50) // process in batches
    .get();

  if (snap.empty) {
    console.log('[cleanupExpiredVerifications] Nothing to clean up.');
    return { cleaned: 0 };
  }

  let cleaned = 0;
  const batch = adminDb.batch();

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const keysToDelete = [data.videoKey, data.audioKey].filter(Boolean);

    // Delete R2 objects
    if (keysToDelete.length > 0) {
      try {
        await deleteObjects(keysToDelete);
        console.log(`[cleanup] Deleted R2 keys for ${docSnap.id}:`, keysToDelete);
      } catch (e) {
        console.error(`[cleanup] R2 delete failed for ${docSnap.id}:`, e.message);
      }
    }

    // Update Firestore in batch
    batch.update(docSnap.ref, {
      status:    'expired',
      expiredAt: new Date().toISOString(),
      videoKey:  null,
      audioKey:  null,
    });

    cleaned++;
  }

  await batch.commit();
  console.log(`[cleanupExpiredVerifications] Cleaned up ${cleaned} expired application(s).`);
  return { cleaned };
}

// Netlify Scheduled Function — runs every hour
const handler = schedule('@hourly', async () => {
  try {
    const result = await runCleanup();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, ...result }),
    };
  } catch (e) {
    console.error('[cleanupExpiredVerifications] Error:', e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
});

export { handler };
