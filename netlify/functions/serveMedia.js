// netlify/functions/serveMedia.js
// Public image/audio proxy — no authentication required.
// Fetches the object from R2 server-side and streams the bytes back to the
// browser. Profile pictures, cover photos, and chat media must be visible
// to all visitors without a Firebase login.
//
// URL: /.netlify/functions/serveMedia?key=profiles/uid/profile.webp
//
// Uses GetObjectCommand (same @aws-sdk/client-s3 package as uploadMedia) so
// there is no dependency on @aws-sdk/s3-request-presigner at all.
// Response is cached for 24 hours by browsers and Netlify's CDN.

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { createR2Client, getBucketName } from './shared/r2Client.js';

const ALLOWED_PREFIXES = [
  'profiles/',
  'covers/',
  'chat-images/',
  'chat-audio/',
  'homepage-audio/',
  'verifications/',
  'rj-verifications/',
];

export const handler = async (event) => {
  // Only GET is needed — browsers load images with GET
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
      body: '',
    };
  }

  const key = event.queryStringParameters?.key;

  if (!key) {
    return { statusCode: 400, body: 'Missing key' };
  }

  // Prevent path traversal
  const decoded = decodeURIComponent(key);
  if (decoded.includes('..') || decoded.startsWith('/') || decoded.startsWith('\\')) {
    return { statusCode: 400, body: 'Invalid key' };
  }

  const allowed = ALLOWED_PREFIXES.some(p => decoded.startsWith(p));
  if (!allowed) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  try {
    const client = createR2Client();
    const bucket = getBucketName();

    const response = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: decoded,
      ResponseContentDisposition: 'inline',
    }));

    // Buffer the stream — profile pics / covers / chat images are ≤ 2 MB each
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Content-Length': String(buffer.length),
        // Cache for 24 hours — Netlify CDN and browser both cache this
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('[serveMedia] R2 error:', e.message, 'key:', decoded);
    // Return a transparent 1x1 PNG so broken-image icons don't show
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' },
      body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      isBase64Encoded: true,
    };
  }
};
