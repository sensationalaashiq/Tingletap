// netlify/functions/uploadBadgeMedia.js
// Receives a badge verification media file (base64-encoded) and uploads it
// directly to Cloudflare R2 using the server-side S3 SDK.
//
// WHY: Browser→R2 presigned PUT requires CORS configured on the R2 bucket.
// Cloudflare R2 CORS can only be set via the Cloudflare dashboard or API
// (the S3 PutBucketCors endpoint is not reliably supported with API tokens
// that have Object-only scope). Routing through this Netlify function avoids
// CORS entirely — the upload goes Browser→Netlify→R2.
//
// File sizes at our MediaRecorder bitrates:
//   video 600kbps × 15s ≈ 1.1MB  →  well under Netlify's 6MB body limit
//   audio  48kbps × 15s ≈ 90KB   →  trivial

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, getBucketName } from './shared/r2Client.js';
import { verifyToken } from './shared/firestoreAdmin.js';
import { randomUUID } from 'crypto';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_MIME = {
  video: ['video/webm', 'video/mp4', 'video/quicktime', 'video/ogg'],
  audio: ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav'],
};

// Conservative limits that stay within Netlify's 6 MB body limit even after
// JSON + base64 overhead (~33% expansion → raw limit ≈ 4.5 MB).
const MAX_BYTES = {
  video: 4.5 * 1024 * 1024,
  audio: 2   * 1024 * 1024,
};

function resp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return resp({ error: 'Method not allowed' }, 405);

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return resp({ error: 'Invalid JSON' }, 400); }

  const { mediaType, data: base64Data } = body;
  // Strip codec qualifiers from content type (same as getUploadUrl)
  const rawCT     = body.contentType || '';
  const contentType = rawCT.split(';')[0].trim().toLowerCase();

  // ── Validate inputs ───────────────────────────────────────────────────────
  if (!mediaType || !['video', 'audio'].includes(mediaType))
    return resp({ error: 'mediaType must be "video" or "audio"' }, 400);
  if (!contentType || !(ALLOWED_MIME[mediaType] || []).includes(contentType))
    return resp({ error: `Unsupported contentType "${contentType}" for ${mediaType}` }, 400);
  if (!base64Data || typeof base64Data !== 'string')
    return resp({ error: 'Missing or invalid file data' }, 400);

  // ── Verify Firebase token ─────────────────────────────────────────────────
  const user = await verifyToken(token);
  if (!user.ok)           return resp({ error: user.err }, 401);
  if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);

  // ── Decode & size-check ───────────────────────────────────────────────────
  let buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    return resp({ error: 'Invalid base64 data' }, 400);
  }

  if (buffer.length > MAX_BYTES[mediaType]) {
    const mb = (MAX_BYTES[mediaType] / 1024 / 1024).toFixed(1);
    return resp({ error: `File too large for proxy upload (max ${mb} MB). Reduce recording length or quality.` }, 413);
  }

  // ── Build R2 object key ───────────────────────────────────────────────────
  const ext = contentType.includes('mp4') ? 'mp4'
            : contentType.includes('ogg') ? 'ogg'
            : contentType.includes('wav') ? 'wav'
            : 'webm';
  const key = `verifications/${user.uid}/${mediaType}-${randomUUID()}.${ext}`;

  // ── Upload to R2 via server-side S3 SDK (no CORS needed) ─────────────────
  try {
    const client = createR2Client();
    const bucket = getBucketName();
    await client.send(new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
    }));
  } catch (e) {
    console.error('[uploadBadgeMedia] R2 upload failed:', e.message);
    return resp({ error: 'Storage upload failed. Please try again.' }, 503);
  }

  return resp({ key, contentType });
};
