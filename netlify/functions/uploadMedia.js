// netlify/functions/uploadMedia.js
// Generic media upload proxy — Browser → Netlify → Cloudflare R2.
// Handles profile pictures, cover photos, chat images, and chat audio.
// R2 credentials are NEVER exposed to the browser.
// Replaces all previous ImgBB / Catbox / tmpfiles / file.io upload paths.

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, getBucketName } from './shared/r2Client.js';
import { verifyToken, decodeJwt } from './shared/firestoreAdmin.js';
import { randomUUID } from 'crypto';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Extension helpers ──────────────────────────────────────────────────────────
const EXT_IMAGE = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' };
const EXT_AUDIO = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav' };

// ── Upload type configuration ─────────────────────────────────────────────────
// pathFn receives { uid, roomId, uuid } — all sanitised server-side.
const UPLOAD_CONFIG = {
  // Profile picture — fixed key, overwrites on every DP change
  'profile': {
    allowed: Object.keys(EXT_IMAGE),
    maxMB: 2,
    pathFn: ({ uid }) => `profiles/${uid}/profile.webp`,
    cacheControl: 'public, max-age=86400, must-revalidate',
  },
  // Cover photo — fixed key, overwrites on every cover change
  'cover': {
    allowed: Object.keys(EXT_IMAGE),
    maxMB: 2,
    pathFn: ({ uid }) => `covers/${uid}/cover.webp`,
    cacheControl: 'public, max-age=86400, must-revalidate',
  },
  // Main-room chat images
  'chat-image': {
    allowed: Object.keys(EXT_IMAGE),
    maxMB: 2,
    pathFn: ({ roomId, uuid, ct }) => `chat-images/${roomId}/${uuid}.${EXT_IMAGE[ct] || 'webp'}`,
    requiresRoomId: true,
    cacheControl: 'public, max-age=31536000, immutable',
  },
  // Main-room / homepage audio posts
  'homepage-audio': {
    allowed: Object.keys(EXT_AUDIO),
    maxMB: 4,
    pathFn: ({ uuid, ct }) => `homepage-audio/${uuid}.${EXT_AUDIO[ct] || 'webm'}`,
    cacheControl: 'public, max-age=31536000, immutable',
  },
  // Private-message images (roomId = conversationId)
  'private-chat-image': {
    allowed: Object.keys(EXT_IMAGE),
    maxMB: 2,
    pathFn: ({ roomId, uuid, ct }) => `chat-images/${roomId}/${uuid}.${EXT_IMAGE[ct] || 'webp'}`,
    requiresRoomId: true,
    cacheControl: 'public, max-age=31536000, immutable',
  },
  // Private-message audio (roomId = conversationId)
  'private-chat-audio': {
    allowed: Object.keys(EXT_AUDIO),
    maxMB: 4,
    pathFn: ({ roomId, uuid, ct }) => `chat-audio/${roomId}/${uuid}.${EXT_AUDIO[ct] || 'webm'}`,
    requiresRoomId: true,
    cacheControl: 'public, max-age=31536000, immutable',
  },
};

// ── Public URL builder ─────────────────────────────────────────────────────────
// R2_PUBLIC_URL should be set to your bucket's public access domain,
// e.g. https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
// Falls back to the Cloudflare default R2 dev URL if unset.
function getPublicUrl(key) {
  const base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
  if (!base) {
    const bucket  = process.env.R2_BUCKET_NAME || '';
    const account = process.env.R2_ACCOUNT_ID  || '';
    return `https://${bucket}.${account}.r2.dev/${key}`;
  }
  return `${base}/${key}`;
}

function resp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

// ── Sanitise roomId so it can't escape the path ───────────────────────────────
function sanitiseId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return resp({ error: 'Method not allowed' }, 405);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return resp({ error: 'Invalid JSON' }, 400); }

  const { uploadType, data: base64Data, roomId: rawRoomId } = body;
  const rawCT      = body.contentType || '';
  const contentType = rawCT.split(';')[0].trim().toLowerCase();

  // ── Validate uploadType ───────────────────────────────────────────────────
  const config = UPLOAD_CONFIG[uploadType];
  if (!config) return resp({ error: `Invalid uploadType "${uploadType}". Valid: ${Object.keys(UPLOAD_CONFIG).join(', ')}` }, 400);

  // ── Validate MIME ─────────────────────────────────────────────────────────
  if (!contentType || !config.allowed.includes(contentType))
    return resp({ error: `Unsupported contentType "${contentType}" for ${uploadType}` }, 400);

  // ── Validate data present ─────────────────────────────────────────────────
  if (!base64Data || typeof base64Data !== 'string')
    return resp({ error: 'Missing or invalid file data' }, 400);

  // ── Require roomId for chat/audio uploads ─────────────────────────────────
  if (config.requiresRoomId && !rawRoomId)
    return resp({ error: 'roomId required for this uploadType' }, 400);

  // ── Verify Firebase token ─────────────────────────────────────────────────
  const user = await verifyToken(token);
  let resolvedUid;

  if (!user.ok) {
    // Newly registered users upload their profile pic before their Firestore doc
    // is written, so verifyToken returns 404. The Firebase JWT is still valid —
    // extract the UID directly for profile uploads only.
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

  // ── Decode base64 → Buffer ────────────────────────────────────────────────
  let buffer;
  try { buffer = Buffer.from(base64Data, 'base64'); }
  catch { return resp({ error: 'Invalid base64 data' }, 400); }

  const maxBytes = config.maxMB * 1024 * 1024;
  if (buffer.length > maxBytes)
    return resp({ error: `File too large (max ${config.maxMB} MB). Compress before uploading.` }, 413);

  // ── Build R2 key ──────────────────────────────────────────────────────────
  const roomId = sanitiseId(rawRoomId);
  const uuid   = randomUUID();
  const key    = config.pathFn({ uid: resolvedUid, roomId, uuid, ct: contentType });

  // ── Upload to R2 ──────────────────────────────────────────────────────────
  try {
    const client = createR2Client();
    const bucket = getBucketName();
    await client.send(new PutObjectCommand({
      Bucket:       bucket,
      Key:          key,
      Body:         buffer,
      ContentType:  contentType,
      CacheControl: config.cacheControl,
    }));
  } catch (e) {
    console.error('[uploadMedia] R2 upload failed:', e.message);
    return resp({ error: 'Storage upload failed. Please try again.' }, 503);
  }

  const url = getPublicUrl(key);
  return resp({ key, url });
};
