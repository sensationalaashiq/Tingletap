// netlify/functions/uploadMedia.js
// Generic media upload proxy — Browser → Netlify → Cloudflare R2.
//
// TWO-BUCKET ROUTING:
//   PUBLIC  bucket (R2_Public_Bucket):  profile, cover, chat-image, homepage-audio
//   PRIVATE bucket (R2_Private_Bucket): private-chat-image, private-chat-audio
//
// PUBLIC  media  → returns permanent public URL (${R2_PUBLIC_BUCKET_URL}/key)
// PRIVATE media  → returns Netlify proxy URL   (/.netlify/functions/serveMedia?key=...)

import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  createR2Client,
  getPublicBucketName,
  getPrivateBucketName,
  getPublicMediaUrl,
} from './shared/r2Client.js';
import { verifyToken, decodeJwt } from './shared/firestoreAdmin.js';
import { verifyFileSignature } from './shared/fileSignature.js';
import { randomUUID } from 'crypto';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Extension maps ─────────────────────────────────────────────────────────────
const EXT_IMAGE = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' };
const EXT_AUDIO = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav' };

// ── Upload type configuration ──────────────────────────────────────────────────
//   bucket: 'public' | 'private'
//   pathFn:  receives { uid, roomId, uuid, ct } — all server-sanitised
//   urlFn:   receives (key) → URL stored in Firestore
const UPLOAD_CONFIG = {
  // ── PUBLIC bucket ────────────────────────────────────────────────────────────

  'profile': {
    bucket: 'public',
    allowed: Object.keys(EXT_IMAGE),
    maxMB: 2,
    pathFn: ({ uid }) => `profile/${uid}/profile.webp`,
    cacheControl: 'public, max-age=31536000, immutable',
    urlFn: key => getPublicMediaUrl(key),
  },

  'cover': {
    bucket: 'public',
    allowed: Object.keys(EXT_IMAGE),
    maxMB: 2,
    pathFn: ({ uid }) => `cover/${uid}/cover.webp`,
    cacheControl: 'public, max-age=31536000, immutable',
    urlFn: key => getPublicMediaUrl(key),
  },

  // Public room chat images
  'chat-image': {
    bucket: 'public',
    allowed: Object.keys(EXT_IMAGE),
    maxMB: 2,
    pathFn: ({ roomId, uuid, ct }) => `homepage/images/${roomId}/${uuid}.${EXT_IMAGE[ct] || 'webp'}`,
    requiresRoomId: true,
    cacheControl: 'public, max-age=31536000, immutable',
    urlFn: key => getPublicMediaUrl(key),
  },

  // Homepage / main-room audio posts
  'homepage-audio': {
    bucket: 'public',
    allowed: Object.keys(EXT_AUDIO),
    maxMB: 4,
    pathFn: ({ uuid, ct }) => `homepage/audio/${uuid}.${EXT_AUDIO[ct] || 'webm'}`,
    cacheControl: 'public, max-age=31536000, immutable',
    urlFn: key => getPublicMediaUrl(key),
  },

  // ── PRIVATE bucket ───────────────────────────────────────────────────────────

  // Private-message images (roomId = conversationId)
  'private-chat-image': {
    bucket: 'private',
    allowed: Object.keys(EXT_IMAGE),
    maxMB: 2,
    pathFn: ({ roomId, uuid, ct }) => `private-chat/images/${roomId}/${uuid}.${EXT_IMAGE[ct] || 'webp'}`,
    requiresRoomId: true,
    cacheControl: 'private, no-store',
    urlFn: key => `/.netlify/functions/serveMedia?key=${encodeURIComponent(key)}`,
  },

  // Private-message audio (roomId = conversationId)
  'private-chat-audio': {
    bucket: 'private',
    allowed: Object.keys(EXT_AUDIO),
    maxMB: 4,
    pathFn: ({ roomId, uuid, ct }) => `private-chat/audio/${roomId}/${uuid}.${EXT_AUDIO[ct] || 'webm'}`,
    requiresRoomId: true,
    cacheControl: 'private, no-store',
    urlFn: key => `/.netlify/functions/serveMedia?key=${encodeURIComponent(key)}`,
  },
};

function resp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

function sanitiseId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return resp({ error: 'Method not allowed' }, 405);

  // ── Auth header ──────────────────────────────────────────────────────────────
  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return resp({ error: 'Invalid JSON' }, 400); }

  const { uploadType, data: base64Data, roomId: rawRoomId } = body;
  const rawCT      = body.contentType || '';
  const contentType = rawCT.split(';')[0].trim().toLowerCase();

  // ── Validate uploadType ──────────────────────────────────────────────────────
  const config = UPLOAD_CONFIG[uploadType];
  if (!config) {
    return resp({ error: `Invalid uploadType "${uploadType}". Valid: ${Object.keys(UPLOAD_CONFIG).join(', ')}` }, 400);
  }

  // ── Validate MIME ────────────────────────────────────────────────────────────
  if (!contentType || !config.allowed.includes(contentType)) {
    return resp({ error: `Unsupported contentType "${contentType}" for ${uploadType}` }, 400);
  }

  // ── Validate data ────────────────────────────────────────────────────────────
  if (!base64Data || typeof base64Data !== 'string') {
    return resp({ error: 'Missing or invalid file data' }, 400);
  }

  // ── Require roomId for chat uploads ─────────────────────────────────────────
  if (config.requiresRoomId && !rawRoomId) {
    return resp({ error: 'roomId required for this uploadType' }, 400);
  }

  // ── Verify Firebase token ────────────────────────────────────────────────────
  const user = await verifyToken(token);
  let resolvedUid;

  if (!user.ok) {
    // New-user race: profile upload happens before Firestore doc is created.
    const isNewUserRace = user.err && /Firestore error 4/.test(user.err);
    if (uploadType === 'profile' && isNewUserRace) {
      const payload = decodeJwt(token);
      resolvedUid = payload?.user_id || payload?.sub;
      if (!resolvedUid) return resp({ error: 'Authentication failed' }, 401);
    } else {
      return resp({ error: user.err }, 401);
    }
  } else {
    if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);
    resolvedUid = user.uid;
  }

  // ── Decode base64 → Buffer ───────────────────────────────────────────────────
  let buffer;
  try { buffer = Buffer.from(base64Data, 'base64'); }
  catch { return resp({ error: 'Invalid base64 data' }, 400); }

  const maxBytes = config.maxMB * 1024 * 1024;
  if (buffer.length > maxBytes) {
    return resp({ error: `File too large (max ${config.maxMB} MB). Compress before uploading.` }, 413);
  }

  // ── Verify actual file content matches the claimed contentType ─────────────
  if (!verifyFileSignature(buffer, contentType)) {
    return resp({ error: `File content does not match declared type "${contentType}"` }, 400);
  }

  // ── Build R2 key ─────────────────────────────────────────────────────────────
  const roomId = sanitiseId(rawRoomId);
  const uuid   = randomUUID();
  const key    = config.pathFn({ uid: resolvedUid, roomId, uuid, ct: contentType });

  // ── Choose bucket ────────────────────────────────────────────────────────────
  let bucketName;
  try {
    bucketName = config.bucket === 'public' ? getPublicBucketName() : getPrivateBucketName();
  } catch (e) {
    console.error('[uploadMedia] Bucket config error:', e.message);
    return resp({ error: 'Storage not configured. Contact admin.' }, 503);
  }

  // ── Upload to R2 ─────────────────────────────────────────────────────────────
  try {
    const client = createR2Client();
    await client.send(new PutObjectCommand({
      Bucket:       bucketName,
      Key:          key,
      Body:         buffer,
      ContentType:  contentType,
      CacheControl: config.cacheControl,
    }));
  } catch (e) {
    console.error('[uploadMedia] R2 upload failed:', e.message);
    return resp({ error: 'Storage upload failed. Please try again.' }, 503);
  }

  // ── Build URL ─────────────────────────────────────────────────────────────────
  let url;
  try {
    url = config.urlFn(key);
  } catch (e) {
    // R2_PUBLIC_BUCKET_URL not set — fall back to serveMedia proxy
    console.warn('[uploadMedia] Public URL not available, falling back to proxy:', e.message);
    url = `/.netlify/functions/serveMedia?key=${encodeURIComponent(key)}`;
  }

  return resp({ key, url });
};
