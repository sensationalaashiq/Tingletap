// netlify/functions/getPrivateUploadUrl.js
//
// Task #3 / M-14 fix: generates a presigned PUT URL for uploading large
// private-chat media (images and audio) directly to the PRIVATE Cloudflare R2
// bucket — bypassing Netlify's 4.5 MB request-body limit.
//
// Flow:
//   1. Client requests a presigned PUT URL (POST with auth + metadata).
//   2. This function authenticates the user, validates type/size, and returns
//      { uploadUrl, key, serveUrl } — serveUrl is the /.netlify/functions/serveMedia proxy URL.
//   3. Client PUTs the blob directly to R2 (no Netlify in the data path).
//   4. Client stores key/serveUrl in Firestore as it would from the proxy upload.
//
// Key prefixes mirror uploadMedia.js routing:
//   private-chat/images/{roomId}/{uuid}.{ext}   — private chat images
//   private-chat/audio/{roomId}/{uuid}.{ext}    — private chat audio messages

import { createPresignedPutUrl } from './shared/r2Client.js';
import { verifyToken } from './shared/firestoreAdmin.js';
import { firestoreRateLimitCheck } from './shared/validation.js';
import { randomUUID } from 'crypto';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UPLOAD_CONFIGS = {
  'private-chat-image': {
    prefix:       'private-chat/images',
    maxMB:        10,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    extMap:       { jpeg: 'jpg', jpg: 'jpg', png: 'png', webp: 'webp', gif: 'gif' },
    defaultExt:   'jpg',
    requiresRoomId: true,
  },
  'private-chat-audio': {
    prefix:       'private-chat/audio',
    maxMB:        10,
    allowedTypes: ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'],
    extMap:       { webm: 'webm', ogg: 'ogg', mp4: 'm4a', mpeg: 'mp3', wav: 'wav' },
    defaultExt:   'webm',
    requiresRoomId: true,
  },
};

// Sanitise a conversationId / roomId — must be alphanumeric, underscore, or hyphen.
function sanitiseRoomId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
}

function resp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return resp({ error: 'Method not allowed' }, 405);

  // Rate limit: max 30 presigned URL requests per IP per hour
  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = await firestoreRateLimitCheck(`priv-upload-url:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.ok) return resp({ error: `Rate limited. Retry in ${rl.retryAfter}s.` }, 429);

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  const user = await verifyToken(token);
  if (!user.ok) return resp({ error: user.err }, 401);
  if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return resp({ error: 'Invalid JSON' }, 400); }

  const { uploadType, contentType: rawContentType, fileSize, roomId: rawRoomId } = body;
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

  // roomId is required for private-chat types (it's the conversationId)
  if (config.requiresRoomId) {
    const roomId = sanitiseRoomId(rawRoomId);
    if (!roomId) return resp({ error: 'roomId (conversationId) is required for private-chat uploads' }, 400);

    // Security: verify that auth.uid is a participant in this conversation.
    // ConversationIds are always "<uidA>_<uidB>" (sorted); check both positions.
    const isParticipant =
      roomId.startsWith(user.uid + '_') || roomId.endsWith('_' + user.uid);
    if (!isParticipant) {
      return resp({ error: 'You are not a participant in this conversation' }, 403);
    }

    const uuid = randomUUID();
    const mimeSubtype = contentType.split('/')[1] || '';
    const ext = config.extMap[mimeSubtype] || config.defaultExt;
    const key = `${config.prefix}/${roomId}/${uuid}.${ext}`;

    // serveMedia proxy URL — same pattern as uploadMedia.js urlFn
    const serveUrl = `/.netlify/functions/serveMedia?key=${encodeURIComponent(key)}`;

    let uploadUrl;
    try {
      uploadUrl = await createPresignedPutUrl(key, contentType, 600); // 10-min window
    } catch (e) {
      console.error('[getPrivateUploadUrl] R2 error:', e.message);
      return resp({ error: 'Storage service unavailable. Check R2_Private_Bucket env var.' }, 503);
    }

    return resp({ uploadUrl, key, serveUrl, contentType, expiresIn: 600 });
  }

  return resp({ error: 'Internal configuration error' }, 500);
};
