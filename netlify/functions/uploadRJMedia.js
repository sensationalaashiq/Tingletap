// netlify/functions/uploadRJMedia.js
// Receives an RJ verification audio recording (base64-encoded) and uploads it
// to the PRIVATE Cloudflare R2 bucket (R2_Private_Bucket).
//
// Key prefix: rj/{uid}/{section}-{uuid}.{ext}
// (Old prefix "rj-verifications/" was on the legacy single bucket — still readable
//  via getRJMedia backward-compat path.)

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, getPrivateBucketName } from './shared/r2Client.js';
import { verifyToken } from './shared/firestoreAdmin.js';
import { verifyFileSignature } from './shared/fileSignature.js';
import { randomUUID } from 'crypto';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_MIME = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav'];

// RJ recordings can run longer (song, welcome script) so the ceiling is higher
// while staying under Netlify's 6 MB body limit (~4.5 MB raw after base64 overhead).
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
  const rawCT      = body.contentType || '';
  const contentType = rawCT.split(';')[0].trim().toLowerCase();

  // ── Validate inputs ──────────────────────────────────────────────────────────
  if (!section || !ALLOWED_SECTIONS.includes(section))
    return resp({ error: 'section must be "intro", "song", or "welcome"' }, 400);
  if (!contentType || !ALLOWED_MIME.includes(contentType))
    return resp({ error: `Unsupported contentType "${contentType}"` }, 400);
  if (!base64Data || typeof base64Data !== 'string')
    return resp({ error: 'Missing or invalid file data' }, 400);

  // ── Verify Firebase token ────────────────────────────────────────────────────
  const user = await verifyToken(token);
  if (!user.ok)              return resp({ error: user.err }, 401);
  if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);

  // ── Decode & size-check ──────────────────────────────────────────────────────
  let buffer;
  try { buffer = Buffer.from(base64Data, 'base64'); }
  catch { return resp({ error: 'Invalid base64 data' }, 400); }

  if (buffer.length > MAX_BYTES) {
    const mb = (MAX_BYTES / 1024 / 1024).toFixed(1);
    return resp({ error: `File too large for proxy upload (max ${mb} MB). Reduce recording length.` }, 413);
  }

  // ── Verify actual file content matches the claimed contentType ─────────────
  if (!verifyFileSignature(buffer, contentType)) {
    return resp({ error: `File content does not match declared type "${contentType}"` }, 400);
  }

  // ── Build R2 object key (NEW private bucket prefix) ──────────────────────────
  const ext = contentType.includes('mp4') ? 'mp4'
            : contentType.includes('ogg') ? 'ogg'
            : contentType.includes('wav') ? 'wav'
            : 'webm';
  const key = `rj/${user.uid}/${section}-${randomUUID()}.${ext}`;

  // ── Upload to PRIVATE R2 bucket ──────────────────────────────────────────────
  try {
    await createR2Client().send(new PutObjectCommand({
      Bucket:      getPrivateBucketName(),
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
    }));
  } catch (e) {
    console.error('[uploadRJMedia] R2 upload failed:', e.message);
    return resp({ error: 'Storage upload failed. Please try again.' }, 503);
  }

  // Return only the key — never a URL.
  return resp({ key, contentType });
};
