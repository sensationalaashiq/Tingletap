// netlify/functions/getPublicUploadUrl.js
//
// M-14 fix: generates a presigned PUT URL for uploading large public media
// (profile photos, cover photos, chat images, homepage audio) directly to the
// PUBLIC Cloudflare R2 bucket — bypassing Netlify's 4.5 MB request-body limit.
//
// Flow:
//   1. Client requests a presigned PUT URL (POST with auth + metadata).
//   2. This function validates the request and returns { uploadUrl, key, publicUrl }.
//   3. Client PUTs the blob directly to R2 (no Netlify in the path).
//   4. Client stores key/publicUrl in Firestore.
//
// Key prefixes mirror uploadMedia.js routing:
//   profile/        — avatar / display picture
//   cover/          — profile cover photo
//   chat-images/    — public chat room images
//   homepage/audio/ — homepage background audio

import { createPublicPresignedPutUrl, getPublicMediaUrl } from './shared/r2Client.js';
import { verifyToken } from './shared/firestoreAdmin.js';
import { firestoreRateLimitCheck } from './shared/validation.js';
import { randomUUID } from 'crypto';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Allowed upload types — must match uploadMedia.js routing exactly
const UPLOAD_CONFIGS = {
  'profile':         { prefix: 'profile',         maxMB: 5,  allowedTypes: ['image/jpeg','image/png','image/webp','image/gif'] },
  'cover':           { prefix: 'cover',           maxMB: 5,  allowedTypes: ['image/jpeg','image/png','image/webp'] },
  'chat-image':      { prefix: 'chat-images',     maxMB: 10, allowedTypes: ['image/jpeg','image/png','image/webp','image/gif'] },
  'homepage-audio':  { prefix: 'homepage/audio',  maxMB: 20, allowedTypes: ['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/mp4'] },
};

function resp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return resp({ error: 'Method not allowed' }, 405);

  // Rate limit: max 20 presigned URL requests per IP per hour
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = await firestoreRateLimitCheck(`pub-upload-url:${ip}`, 20, 60 * 60 * 1000);
  if (!rl.ok) {
    return resp({ error: `Rate limited. Retry in ${rl.retryAfter}s.` }, 429);
  }

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  const user = await verifyToken(token);
  if (!user.ok) return resp({ error: user.err }, 401);
  if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return resp({ error: 'Invalid JSON' }, 400); }

  const { uploadType, contentType: rawContentType, fileSize } = body;
  const contentType = (rawContentType || '').split(';')[0].trim().toLowerCase();

  const config = UPLOAD_CONFIGS[uploadType];
  if (!config) {
    return resp({ error: `Invalid uploadType. Must be one of: ${Object.keys(UPLOAD_CONFIGS).join(', ')}` }, 400);
  }

  if (!contentType || !config.allowedTypes.includes(contentType)) {
    return resp({ error: `Invalid contentType "${contentType}" for uploadType "${uploadType}"` }, 400);
  }

  const maxBytes = config.maxMB * 1024 * 1024;
  if (!fileSize || typeof fileSize !== 'number' || fileSize <= 0) {
    return resp({ error: 'fileSize (bytes) is required' }, 400);
  }
  if (fileSize > maxBytes) {
    return resp({ error: `File too large. Max ${config.maxMB} MB for ${uploadType}.` }, 413);
  }

  // Build a unique, uid-scoped key under the correct prefix
  const uuid = randomUUID();
  const ext  = contentType.includes('png')  ? 'png'
             : contentType.includes('gif')  ? 'gif'
             : contentType.includes('webp') ? 'webp'
             : contentType.includes('mp3') || contentType.includes('mpeg') ? 'mp3'
             : contentType.includes('ogg')  ? 'ogg'
             : contentType.includes('wav')  ? 'wav'
             : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
             : 'bin';

  const key = `${config.prefix}/${user.uid}/${uuid}.${ext}`;

  let uploadUrl, publicUrl;
  try {
    uploadUrl = await createPublicPresignedPutUrl(key, contentType, 600); // 10-min window
    publicUrl = getPublicMediaUrl(key);
  } catch (e) {
    console.error('[getPublicUploadUrl] R2 error:', e.message);
    return resp({ error: 'Storage service unavailable. Check R2_PUBLIC_BUCKET and R2_PUBLIC_BUCKET_URL env vars.' }, 503);
  }

  return resp({ uploadUrl, key, publicUrl, contentType, expiresIn: 600 });
};
