// netlify/functions/generateSignedMediaUrl.js
// Owner/Admin only: generates a short-lived (5-min) presigned GET URL for
// viewing badge verification media stored in Cloudflare R2.
//
// BUCKET ROUTING (backward-compat):
//   key starts with "badge/"          → NEW private bucket (tingletap-verification)
//   key starts with "verifications/"  → OLD legacy bucket  (R2_BUCKET_NAME)

import { createPresignedGetUrl } from './shared/r2Client.js';
import { verifyToken } from './shared/firestoreAdmin.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return resp({ error: 'Method not allowed' }, 405);

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return resp({ error: 'Invalid JSON' }, 400); }

  const { key } = body;

  // Accept new "badge/" prefix and legacy "verifications/" prefix
  if (!key || typeof key !== 'string' ||
      (!key.startsWith('badge/') && !key.startsWith('verifications/'))) {
    return resp({ error: 'Invalid or missing key' }, 400);
  }

  // Only owner/admin can generate signed URLs
  const user = await verifyToken(token, ['owner', 'admin']);
  if (!user.ok) return resp({ error: user.err }, 403);

  let signedUrl;
  try {
    // createPresignedGetUrl auto-routes to the correct bucket based on key prefix
    signedUrl = await createPresignedGetUrl(key, 300); // 5-minute expiry
  } catch (e) {
    console.error('[generateSignedMediaUrl] R2 error:', e.message);
    return resp({ error: 'Storage service unavailable. Ensure R2 credentials are configured.' }, 503);
  }

  return resp({ signedUrl, expiresIn: 300, generatedAt: new Date().toISOString() });
};
