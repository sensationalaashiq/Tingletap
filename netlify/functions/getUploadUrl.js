// netlify/functions/getUploadUrl.js
// Returns a presigned PUT URL for uploading badge verification media directly
// to the PRIVATE Cloudflare R2 bucket (R2_Private_Bucket).
// Key prefix: badge/{uid}/{mediaType}-{uuid}.{ext}

import { createPresignedPutUrl } from './shared/r2Client.js';
import { verifyToken } from './shared/firestoreAdmin.js';
import { randomUUID } from 'crypto';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_TYPES = {
  video: ['video/webm', 'video/mp4', 'video/quicktime'],
  audio: ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav'],
};

const MAX_SIZES = { video: 30 * 1024 * 1024, audio: 10 * 1024 * 1024 };

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

  const { mediaType, fileSize } = body;
  const rawContentType = body.contentType || '';
  const contentType    = rawContentType.split(';')[0].trim().toLowerCase();

  if (!mediaType || !['video', 'audio'].includes(mediaType))
    return resp({ error: 'mediaType must be "video" or "audio"' }, 400);
  if (!contentType || !ALLOWED_TYPES[mediaType].includes(contentType))
    return resp({ error: `Invalid contentType for ${mediaType}: "${contentType}" (raw: "${rawContentType}")` }, 400);
  if (!fileSize || fileSize > MAX_SIZES[mediaType])
    return resp({ error: `File too large (max ${MAX_SIZES[mediaType] / 1024 / 1024}MB)` }, 413);

  const user = await verifyToken(token);
  if (!user.ok) return resp({ error: user.err }, 401);
  if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);

  // Build key using the new "badge/" prefix in the private bucket
  const uuid = randomUUID();
  const ext  = contentType.includes('mp4') ? 'mp4'
             : contentType.includes('ogg') ? 'ogg'
             : contentType.includes('wav') ? 'wav'
             : 'webm';
  const key = `badge/${user.uid}/${mediaType}-${uuid}.${ext}`;

  let uploadUrl;
  try {
    // createPresignedPutUrl targets the private bucket by default
    uploadUrl = await createPresignedPutUrl(key, contentType, 600); // 10-min window
  } catch (e) {
    console.error('[getUploadUrl] R2 error:', e.message);
    return resp({ error: 'Storage service unavailable. Ensure R2 credentials are configured.' }, 503);
  }

  return resp({ uploadUrl, key, contentType, expiresIn: 600 });
};
