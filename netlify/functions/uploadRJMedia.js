// netlify/functions/uploadRJMedia.js
// Receives an RJ verification audio recording (base64-encoded) and uploads it
// directly to Cloudflare R2 using the server-side S3 SDK.
// Mirrors uploadBadgeMedia.js — see that file for the CORS rationale.
//
// File sizes at our MediaRecorder bitrate: audio 48kbps × 90s ≈ 540KB → trivial

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

const ALLOWED_MIME = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav'];

// RJ recordings can run longer than the badge declaration (song, welcome script),
// so the byte ceiling is a bit more generous while staying well under Netlify's
// 6MB body limit (~4.5MB raw after base64 overhead).
const MAX_BYTES = 3 * 1024 * 1024;

const ALLOWED_SECTIONS = ['intro', 'song', 'welcome'];

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

  const { section, data: base64Data } = body;
  const rawCT     = body.contentType || '';
  const contentType = rawCT.split(';')[0].trim().toLowerCase();

  // ── Validate inputs ───────────────────────────────────────────────────────
  if (!section || !ALLOWED_SECTIONS.includes(section))
    return resp({ error: 'section must be "intro", "song", or "welcome"' }, 400);
  if (!contentType || !ALLOWED_MIME.includes(contentType))
    return resp({ error: `Unsupported contentType "${contentType}"` }, 400);
  if (!base64Data || typeof base64Data !== 'string')
    return resp({ error: 'Missing or invalid file data' }, 400);

  // ── Verify Firebase token ─────────────────────────────────────────────────
  const user = await verifyToken(token);
  if (!user.ok)              return resp({ error: user.err }, 401);
  if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);

  // ── Decode & size-check ───────────────────────────────────────────────────
  let buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    return resp({ error: 'Invalid base64 data' }, 400);
  }

  if (buffer.length > MAX_BYTES) {
    const mb = (MAX_BYTES / 1024 / 1024).toFixed(1);
    return resp({ error: `File too large for proxy upload (max ${mb} MB). Reduce recording length.` }, 413);
  }

  // ── Build R2 object key ───────────────────────────────────────────────────
  const ext = contentType.includes('mp4') ? 'mp4'
            : contentType.includes('ogg') ? 'ogg'
            : contentType.includes('wav') ? 'wav'
            : 'webm';
  const key = `rj-verifications/${user.uid}/${section}-${randomUUID()}.${ext}`;

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
    console.error('[uploadRJMedia] R2 upload failed:', e.message);
    return resp({ error: 'Storage upload failed. Please try again.' }, 503);
  }

  return resp({ key, contentType });
};
