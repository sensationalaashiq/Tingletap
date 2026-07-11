// netlify/functions/getMediaUrl.js
// Generate a short-lived presigned GET URL for private R2 media.
// Used as a fallback refresh when a stored URL is stale/broken.
//
// BUCKET ROUTING:
//   badge/, verifications/             → private bucket (or legacy for old keys)
//   rj/, rj-verifications/             → private bucket (or legacy)
//   private-chat/images/, private-chat/audio/ → private bucket
//   profiles/, covers/, chat-images/, chat-audio/, homepage-audio/ → legacy bucket
//   profile/, cover/, homepage/        → NOT needed (these are permanent public URLs)
//
// Access control:
//   verifications/, rj-verifications/, badge/, rj/  → owner/admin only
//   private-chat/*                                  → authenticated non-guest users
//   profiles/, covers/, chat-images/, etc.          → any authenticated non-guest user

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

function checkAccess(key, callerRole) {
  const isStaff = callerRole === 'owner' || callerRole === 'admin';

  // Verification media (new and legacy prefixes) — owner/admin only
  if (
    key.startsWith('verifications/')    ||
    key.startsWith('rj-verifications/') ||
    key.startsWith('badge/')            ||
    key.startsWith('rj/')
  ) {
    if (!isStaff) return { allowed: false, reason: 'Owner or admin required for verification media' };
    return { allowed: true };
  }

  // Private chat media — any authenticated non-guest user
  if (key.startsWith('private-chat/')) {
    return { allowed: true };
  }

  // Legacy user-facing media — any authenticated non-guest user
  const legacyPrefixes = [
    'profiles/', 'covers/', 'chat-images/', 'chat-audio/', 'homepage-audio/',
  ];
  if (legacyPrefixes.some(p => key.startsWith(p))) {
    return { allowed: true };
  }

  // Public bucket prefixes don't need a signed URL (they have permanent public URLs)
  if (key.startsWith('profile/') || key.startsWith('cover/') || key.startsWith('homepage/')) {
    return { allowed: false, reason: 'Public media does not require a signed URL — use the permanent R2 public URL directly.' };
  }

  return { allowed: false, reason: 'Key prefix not recognised' };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return resp({ error: 'Method not allowed' }, 405);

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return resp({ error: 'Invalid JSON' }, 400); }

  const { key, expiresIn = 3600 } = body;

  if (!key || typeof key !== 'string' || key.length > 512)
    return resp({ error: 'Invalid or missing key' }, 400);
  if (key.includes('..') || key.startsWith('/'))
    return resp({ error: 'Invalid key format' }, 400);

  // Verify auth
  const user = await verifyToken(token);
  if (!user.ok) return resp({ error: user.err }, 401);
  if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);

  const { allowed, reason } = checkAccess(key, user.role);
  if (!allowed) return resp({ error: reason || 'Access denied' }, 403);

  const isStaff      = user.role === 'owner' || user.role === 'admin';
  const maxExpiry    = isStaff ? 86400 : 3600;
  const clampedExpiry = Math.min(maxExpiry, Math.max(60, Number(expiresIn) || 3600));

  let signedUrl;
  try {
    // createPresignedGetUrl auto-routes to the correct bucket based on key prefix
    signedUrl = await createPresignedGetUrl(key, clampedExpiry);
  } catch (e) {
    console.error('[getMediaUrl] R2 error:', e.message);
    return resp({ error: 'Storage service unavailable' }, 503);
  }

  return resp({ signedUrl, expiresIn: clampedExpiry, key });
};
