// netlify/functions/getPublicRoomCount.js
//
// Public endpoint — NO auth required.
//
// Returns the total count of chat rooms from Firestore via Firebase Admin SDK.
// Used by LandingPage.jsx to show a real live room count BEFORE the user logs in,
// without requiring Firestore read access on the `rooms` collection for
// unauthenticated users (fixing L-13: rooms were fully public-readable).
//
// Fix L-13: rooms Firestore rule is now `auth != null` for full doc reads;
// this function provides the only public surface (just a count, no room data).

import { getAdminDb } from './shared/firestoreAdmin.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    const db = getAdminDb();
    if (!db) {
      // Firebase Admin not configured (e.g. local dev without credentials) — return 0 gracefully.
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
        body: JSON.stringify({ count: 0, source: 'fallback' }),
      };
    }

    // Use Admin SDK aggregate count — 1 Firestore read, no document data sent to client.
    const countSnap = await db.collection('rooms').count().get();
    const count = countSnap.data().count;

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        // 5-minute browser/CDN cache — room count doesn't change often.
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
      body: JSON.stringify({ count }),
    };
  } catch (err) {
    console.error('[getPublicRoomCount] Error:', err.message);
    // Return 200 with count:0 so the UI shows '—' rather than crashing.
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 0, error: 'fetch_failed' }),
    };
  }
};
