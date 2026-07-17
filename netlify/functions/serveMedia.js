// netlify/functions/serveMedia.js
// Public media proxy — no authentication required.
// Fetches objects from R2 server-side and streams bytes back to the browser.
//
// TWO-BUCKET ROUTING:
//   Legacy prefixes (profiles/, covers/, chat-images/, chat-audio/, homepage-audio/)
//     → PRIVATE bucket (R2_PRIVATE_BUCKET) — backward compat for existing Firestore URLs
//
//   New private-chat prefixes (private-chat/images/, private-chat/audio/)
//     → PRIVATE bucket (R2_PRIVATE_BUCKET_NAME)
//
// Public bucket (R2_Public_Bucket) media is served via permanent R2 public URLs —
// it does NOT go through this proxy at all.

import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  createR2Client,
  getBucketName,
  getPrivateBucketName,
  getPublicBucketName,
} from './shared/r2Client.js';

// Legacy prefixes — served from the private bucket (R2_PRIVATE_BUCKET)
const LEGACY_PREFIXES = [
  'profiles/',
  'covers/',
  'chat-images/',
  'chat-audio/',
  'homepage-audio/',
  'verifications/',
  'rj-verifications/',
];

// New PUBLIC bucket prefixes — served here as fallback if CDN URL fails
const PUBLIC_BUCKET_PREFIXES = [
  'profile/',
  'cover/',
  'homepage/images/',
  'homepage/audio/',
];

// New private-chat prefixes — private bucket.
// NOTE — intentionally NO auth check here. Security relies on unguessable
// UUIDs in keys (same model as Discord/Slack). <img>/<audio> tags cannot
// send auth headers, so server-side authz would break inline rendering.
const PRIVATE_CHAT_PREFIXES = [
  'private-chat/images/',
  'private-chat/audio/',
];

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: { 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
      body: '',
    };
  }

  const key = event.queryStringParameters?.key;
  if (!key) return { statusCode: 400, body: 'Missing key' };

  // Prevent path traversal
  const decoded = decodeURIComponent(key);
  if (decoded.includes('..') || decoded.startsWith('/') || decoded.startsWith('\\')) {
    return { statusCode: 400, body: 'Invalid key' };
  }

  // Determine which bucket to use
  const isLegacy      = LEGACY_PREFIXES.some(p => decoded.startsWith(p));
  const isPrivateChat = PRIVATE_CHAT_PREFIXES.some(p => decoded.startsWith(p));
  const isPublicNew   = PUBLIC_BUCKET_PREFIXES.some(p => decoded.startsWith(p));

  if (!isLegacy && !isPrivateChat && !isPublicNew) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  let bucketName;
  try {
    if (isPrivateChat) bucketName = getPrivateBucketName();
    else if (isPublicNew) bucketName = getPublicBucketName();
    else bucketName = getBucketName();
  } catch (e) {
    console.error('[serveMedia] Bucket config error:', e.message);
    return { statusCode: 503, body: 'Storage not configured' };
  }

  try {
    const response = await createR2Client().send(new GetObjectCommand({
      Bucket: bucketName,
      Key: decoded,
      ResponseContentDisposition: 'inline',
    }));

    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return {
      statusCode: 200,
      headers: {
        'Content-Type':  response.ContentType || 'application/octet-stream',
        'Content-Length': String(buffer.length),
        'Cache-Control': isPrivateChat
          ? 'private, max-age=3600'
          : 'public, max-age=86400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('[serveMedia] R2 error:', e.message, 'key:', decoded, 'bucket:', bucketName);
    // Return transparent 1×1 PNG so broken-image icons don't flash
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*' },
      body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      isBase64Encoded: true,
    };
  }
};
