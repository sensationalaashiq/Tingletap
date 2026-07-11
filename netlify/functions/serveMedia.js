// netlify/functions/serveMedia.js
// Public image proxy — no authentication required.
// Generates a short-lived presigned GET URL for an R2 object and
// redirects the browser to it. Profile pictures and covers must be
// visible to every visitor without any Firebase login.
//
// URL format:  /.netlify/functions/serveMedia?key=profiles/abc.webp
// Response:    302 → fresh 1-hour presigned R2 GET URL
//
// The redirect is cached for 50 minutes so browsers and Netlify's CDN
// avoid calling this function on every page load.

import { createPresignedGetUrl } from './shared/r2Client.js';

const ALLOWED_PREFIXES = [
  'profiles/',
  'covers/',
  'chat-images/',
  'chat-audio/',
  'homepage-audio/',
  'verifications/',
  'rj-verifications/',
];

const PRESIGN_TTL  = 3600; // 1-hour presigned URL
const CACHE_TTL    = 3000; // 50-min browser/CDN cache (safely under presign TTL)

export const handler = async (event) => {
  const key = event.queryStringParameters?.key;

  if (!key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing key' }) };
  }

  // Block path traversal
  if (key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid key' }) };
  }

  const allowed = ALLOWED_PREFIXES.some(p => key.startsWith(p));
  if (!allowed) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden prefix' }) };
  }

  try {
    const url = await createPresignedGetUrl(decodeURIComponent(key), PRESIGN_TTL);
    return {
      statusCode: 302,
      headers: {
        Location: url,
        'Cache-Control': `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
    };
  } catch (e) {
    console.error('[serveMedia] Error generating presigned URL:', e.message);
    return { statusCode: 502, body: JSON.stringify({ error: 'Could not generate URL' }) };
  }
};
