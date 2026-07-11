// netlify/functions/getMediaUrl.js
// Generate a short-lived presigned GET URL for any R2 media key.
// Access control enforced per media class:
//   - verifications/, rj-verifications/ → owner or admin only (sensitive legal/ID docs)
//   - profiles/{uid}/…, covers/{uid}/…, chat-images/, chat-audio/, homepage-audio/
//       → any authenticated non-guest user
//     (these are user-facing media shown to all room members, not private docs)

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

/**
 * Return whether the caller is allowed to sign this key.
 * @param {string} key        R2 object key (already validated: no '..' or leading '/')
 * @param {string} callerRole role field from Firestore ('owner'|'admin'|'moderator'|'user'|'guest')
 */
function checkAccess(key, callerRole) {
  const isStaff = callerRole === 'owner' || callerRole === 'admin';

  // ── Sensitive verification docs — owner/admin only ────────────────────────
  if (key.startsWith('verifications/') || key.startsWith('rj-verifications/')) {
    if (!isStaff) return { allowed: false, reason: 'Owner or admin required for verification media' };
    return { allowed: true };
  }

  // ── User-facing media (profiles, covers, chat images/audio) ───────────────
  // These are displayed to every member in a chat room, so any registered user
  // (non-guest) is allowed to fetch a fresh signed URL.
  const publicPrefixes = [
    'profiles/',
    'covers/',
    'chat-images/',
    'chat-audio/',
    'homepage-audio/',
  ];
  if (publicPrefixes.some(p => key.startsWith(p))) {
    return { allowed: true };
  }

  // Unknown prefix — deny
  return { allowed: false, reason: 'Key prefix not recognised' };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return resp({ error: 'Method not allowed' }, 405);

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return resp({ error: 'Invalid JSON' }, 400); }

  const { key, expiresIn = 3600 } = body;

  // ── Validate key format ───────────────────────────────────────────────────
  if (!key || typeof key !== 'string' || key.length > 512)
    return resp({ error: 'Invalid or missing key' }, 400);
  if (key.includes('..') || key.startsWith('/'))
    return resp({ error: 'Invalid key format' }, 400);

  // ── Verify auth — guests cannot refresh ──────────────────────────────────
  const user = await verifyToken(token);
  if (!user.ok) return resp({ error: user.err }, 401);
  if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);

  // ── Per-class access check ────────────────────────────────────────────────
  const { allowed, reason } = checkAccess(key, user.role);
  if (!allowed) return resp({ error: reason || 'Access denied' }, 403);

  // ── Clamp expiry: 60 s min, 3600 s (1 h) max for regular users; 24 h for staff ──
  const isStaff = user.role === 'owner' || user.role === 'admin';
  const maxExpiry = isStaff ? 86400 : 3600;
  const clampedExpiry = Math.min(maxExpiry, Math.max(60, Number(expiresIn) || 3600));

  let signedUrl;
  try {
    signedUrl = await createPresignedGetUrl(key, clampedExpiry);
  } catch (e) {
    console.error('[getMediaUrl] R2 error:', e.message);
    return resp({ error: 'Storage service unavailable' }, 503);
  }

  return resp({ signedUrl, expiresIn: clampedExpiry, key });
};
