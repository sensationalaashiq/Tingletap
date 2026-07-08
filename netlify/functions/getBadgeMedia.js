// netlify/functions/getBadgeMedia.js
// Owner/Admin only: fetches badge verification media from R2 server-side
// and streams it back to the browser as binary with inline Content-Disposition.
//
// WHY: Presigned GET URLs from R2 require bucket-level CORS configuration for
// browser fetch() requests. Rather than depend on CORS being configured,
// this proxy function fetches from R2 on the server (no CORS needed) and
// returns the raw bytes to the same-origin browser request.

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, getBucketName } from './shared/r2Client.js';
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
  if (!key || typeof key !== 'string' || !key.startsWith('verifications/'))
    return errResp('Invalid or missing key', 400);

  // Restrict to owner / admin
  const user = await verifyToken(token, ['owner', 'admin']);
  if (!user.ok) return errResp(user.err, 403);

  try {
    const client = createR2Client();
    const bucket = getBucketName();
    const r2Resp = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    // Collect the stream into a buffer
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
    console.error('[getBadgeMedia] R2 error:', e.message);
    return errResp('Storage service unavailable. Ensure R2 credentials are configured.', 503);
  }
};
