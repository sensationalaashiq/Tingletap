// netlify/functions/serveMedia.js
// Public media proxy — no authentication required.
// Fetches objects from R2 server-side and streams bytes back to the browser.
//
// TWO-BUCKET ROUTING:
//   Legacy prefixes (profiles/, covers/, chat-images/, chat-audio/, homepage-audio/)
//     → OLD single bucket (R2_BUCKET_NAME) — backward compat for existing Firestore URLs
//
//   New private-chat prefixes (private-chat/images/, private-chat/audio/)
//     → PRIVATE bucket (R2_PRIVATE_BUCKET_NAME)
//
// Public bucket (tingletap-media) media is served via permanent R2 public URLs —
// it does NOT go through this proxy at all.

import { GetObjectCommand } from '@aws-sdk/client-s3';
import {
  createR2Client,
  getBucketName,
  getPrivateBucketName,
} from './shared/r2Client.js';

// Legacy prefixes that still live in the old single bucket
const LEGACY_PREFIXES = [
  'profiles/',
  'covers/',
  'chat-images/',
  'chat-audio/',
  'homepage-audio/',
  'verifications/',
  'rj-verifications/',
];

// New private-chat prefixes that live in the private bucket.
// NOTE — intentionally NO auth check here. Security for private-chat media
// relies on URL possession: keys contain a cryptographically random UUID
// that is stored only in the sender's and receiver's Firestore message docs.
// This is the same "unguessable URL" model used by Discord, Slack, and
// WhatsApp Web for inline media. <img>/<audio> tags cannot send auth headers,
// so a server-side auth check would break all inline image/audio rendering.
// If strict access control is ever required, migrate to a fetch-with-auth +
// blob-URL pattern in the React components instead.
const PRIVATE_CHAT_PREFIXES = [
  'private-chat/images/',
  'private-chat/audio/',
];

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
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

  if (!isLegacy && !isPrivateChat) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  let bucketName;
  try {
    bucketName = isPrivateChat ? getPrivateBucketName() : getBucketName();
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
        'Access-Control-Allow-Origin': '*',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('[serveMedia] R2 error:', e.message, 'key:', decoded, 'bucket:', bucketName);
    // Return transparent 1×1 PNG so broken-image icons don't flash
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' },
      body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      isBase64Encoded: true,
    };
  }
};
