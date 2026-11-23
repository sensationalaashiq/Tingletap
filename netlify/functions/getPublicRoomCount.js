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

async function fetchRestRoomCount() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  try {
    const aggRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runAggregationQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredAggregationQuery: {
            aggregations: [{ alias: 'total', count: {} }],
            structuredQuery: { from: [{ collectionId: 'rooms' }] },
          },
        }),
        signal: AbortSignal.timeout(6000),
      }
    );
    if (aggRes.ok) {
      const rows = await aggRes.json();
      const val = rows?.[0]?.result?.aggregateFields?.total?.integerValue;
      if (val !== undefined) return Number(val);
    }
    const listRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/rooms?pageSize=200`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (listRes.ok) {
      const data = await listRes.json();
      return Array.isArray(data?.documents) ? data.documents.length : 0;
    }
  } catch {
    return null;
  }
  return null;
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  try {
    const db = getAdminDb();
    if (!db) {
      const restCount = await fetchRestRoomCount();
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
        body: JSON.stringify({ count: typeof restCount === 'number' ? restCount : 0, source: typeof restCount === 'number' ? 'rest' : 'fallback' }),
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
    const restCount = await fetchRestRoomCount();
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: typeof restCount === 'number' ? restCount : 0, error: typeof restCount === 'number' ? undefined : 'fetch_failed' }),
    };
  }
};
