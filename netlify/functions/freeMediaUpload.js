// netlify/functions/freeMediaUpload.js
// Free unlimited temporary-media upload proxy -> uguu.se
// Used as an automatic fallback when Cloudflare R2 is unconfigured or unavailable,
// so users can always send chat images, audio recordings, music files, and covers.

import { verifyToken, decodeJwt } from './shared/firestoreAdmin.js';
import { verifyFileSignature, normalizeMediaContentType } from './shared/fileSignature.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXT_MAP = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
};

const MAX_BYTES = 4.2 * 1024 * 1024; // ~4.2 MB safe within Netlify JSON payload limit

function resp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return resp({ error: 'Method not allowed' }, 405);

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return resp({ error: 'Invalid JSON' }, 400);
  }

  const { data: base64Data, contentType: rawCT, filename: rawName } = body;
  const contentType = normalizeMediaContentType(rawCT);

  if (!contentType || !EXT_MAP[contentType]) {
    return resp({ error: `Unsupported media type "${contentType || 'unknown'}"` }, 400);
  }

  if (!base64Data || typeof base64Data !== 'string') {
    return resp({ error: 'Missing file data' }, 400);
  }

  // Verify Firebase ID token (allow guests/new users whose Firestore user doc may not exist yet)
  const user = await verifyToken(token);
  if (!user.ok) {
    const isMissingUserDoc = user.err && /Firestore error 404/.test(user.err);
    if (isMissingUserDoc) {
      const payload = decodeJwt(token);
      if (!payload?.user_id && !payload?.sub) {
        return resp({ error: 'Authentication failed' }, 401);
      }
    } else {
      return resp({ error: user.err || 'Authentication failed' }, 401);
    }
  }

  let buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    return resp({ error: 'Invalid base64 payload' }, 400);
  }

  if (!buffer.length || buffer.length > MAX_BYTES) {
    return resp({ error: 'File exceeds 4 MB upload limit' }, 413);
  }

  if (!verifyFileSignature(buffer, contentType)) {
    return resp({ error: `File signature does not match "${contentType}"` }, 400);
  }

  const ext = EXT_MAP[contentType] || 'bin';
  const safeName = String(rawName || `tingletap-media.${ext}`)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 64);
  const finalName = safeName.includes('.') ? safeName : `${safeName}.${ext}`;

  try {
    const form = new FormData();
    const blob = new Blob([buffer], { type: contentType });
    form.append('files[]', blob, finalName);

    const upstream = await fetch('https://uguu.se/upload', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(20000),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return resp({ error: `Free host upload failed (${upstream.status}) ${text.slice(0, 120)}` }, 502);
    }

    const result = await upstream.json();
    const uploadedUrl = result?.files?.[0]?.url;
    if (!result?.success || !uploadedUrl) {
      return resp({ error: 'Free host did not return a media URL' }, 502);
    }

    return resp({ key: null, url: uploadedUrl, provider: 'uguu' });
  } catch (err) {
    console.error('[freeMediaUpload] upstream error:', err);
    return resp({ error: 'Media hosting request failed' }, 502);
  }
};
