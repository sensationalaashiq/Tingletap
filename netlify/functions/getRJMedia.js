// netlify/functions/getRJMedia.js
// Owner/Admin only: fetches RJ verification audio from R2 and streams it back
// to the browser as binary with inline Content-Disposition.
//
// BUCKET ROUTING (backward-compat):
//   key starts with "rj/"               → NEW private bucket (tingletap-verification)
//   key starts with "rj-verifications/" → OLD legacy bucket  (R2_BUCKET_NAME)

import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  createR2Client,
  getPrivateBucketName,
  getBucketName,
} from './shared/r2Client.js';
import { verifyToken } from './shared/firestoreAdmin.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function errResp(msg, status = 500) {
  return {
    statusCode: status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: msg }),
  };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return errResp('Method not allowed', 405);

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return errResp('Authorization required', 401);

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return errResp('Invalid JSON', 400); }

  const { key } = body;

  // Accept both new "rj/" prefix and legacy "rj-verifications/" prefix
  const isNewKey    = key && typeof key === 'string' && key.startsWith('rj/');
  const isLegacyKey = key && typeof key === 'string' && key.startsWith('rj-verifications/');

  if (!isNewKey && !isLegacyKey) {
    return errResp('Invalid or missing key', 400);
  }

  // Restrict to owner / admin
  const user = await verifyToken(token, ['owner', 'admin']);
  if (!user.ok) return errResp(user.err, 403);

  // Choose bucket based on key prefix
  let bucketName;
  try {
    bucketName = isNewKey ? getPrivateBucketName() : getBucketName();
  } catch (e) {
    console.error('[getRJMedia] Bucket config error:', e.message);
    return errResp('Storage not configured. Contact admin.', 503);
  }

  try {
    const r2Resp = await createR2Client().send(
      new GetObjectCommand({ Bucket: bucketName, Key: key })
    );

    const chunks = [];
    for await (const chunk of r2Resp.Body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const contentType = r2Resp.ContentType || 'application/octet-stream';

    return {
      statusCode: 200,
      headers: {
        ...CORS,
        'Content-Type':        contentType,
        'Content-Disposition': 'inline',
        'Cache-Control':       'private, no-store',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('[getRJMedia] R2 error:', e.message, 'key:', key);
    return errResp('Storage service unavailable.', 503);
  }
};
