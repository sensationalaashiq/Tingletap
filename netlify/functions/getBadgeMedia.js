// netlify/functions/getBadgeMedia.js
// Owner/Admin only: fetches badge verification media from R2 and streams it
// back to the browser as binary with inline Content-Disposition.
//
// BUCKET ROUTING (backward-compat):
//   key starts with "badge/"          → private bucket (R2_PRIVATE_BUCKET)
//   key starts with "verifications/"  → same private bucket (legacy key prefix)

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

  // Accept both new "badge/" prefix and legacy "verifications/" prefix
  const isNewKey    = key && typeof key === 'string' && key.startsWith('badge/');
  const isLegacyKey = key && typeof key === 'string' && key.startsWith('verifications/');

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
    console.error('[getBadgeMedia] Bucket config error:', e.message);
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
    console.error('[getBadgeMedia] R2 error:', e.message, 'key:', key);
    return errResp('Storage service unavailable.', 503);
  }
};
