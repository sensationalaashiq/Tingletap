// src/services/r2StorageService.js
// Client-side R2 storage service — all uploads proxy through Netlify Functions.
// Never exposes credentials. No direct browser→R2 connection (avoids CORS).
//
// TWO-BUCKET ARCHITECTURE:
//   PUBLIC  bucket:  profile, cover, homepage images/audio
//     → returns permanent public URL stored directly in Firestore
//   PRIVATE bucket:  badge/RJ verifications, private-chat media
//     → returns /.netlify/functions/serveMedia?key=... proxy URL
//     → keys stored in Firestore (never presigned URLs)

import { auth } from '../firebase/config';

const BASE = '/.netlify/functions';

// ── Auth helpers ───────────────────────────────────────────────────────────────

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

// ── Key extraction ─────────────────────────────────────────────────────────────

/**
 * Extract the R2 object key from any URL stored in Firestore.
 *
 * Handles:
 *   - Proxy URL:  /.netlify/functions/serveMedia?key=private-chat/images/...
 *   - Direct R2:  https://<account>.r2.cloudflarestorage.com/<bucket>/<key>?...
 *   - Public URL: https://pub-xxxx.r2.dev/profile/uid/profile.webp
 *     (no key extraction needed for public URLs — they never expire)
 *
 * @param {string} url
 * @returns {string|null}
 */
export function extractR2Key(url) {
  try {
    if (!url) return null;

    // Proxy URL: /.netlify/functions/serveMedia?key=<key>
    if (url.includes('serveMedia')) {
      const u = new URL(url, 'https://placeholder.invalid');
      return u.searchParams.get('key') || null;
    }

    // Legacy signed R2 URL: https://{account}.r2.cloudflarestorage.com/{bucket}/{key}?...
    if (url.includes('r2.cloudflarestorage.com')) {
      const u    = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length < 2) return null;
      return parts.slice(1).join('/'); // drop bucket segment
    }

    // Public R2 URL (pub-xxx.r2.dev or custom domain) — key is everything after the host
    // e.g. https://pub-xxxx.r2.dev/profile/uid/profile.webp → "profile/uid/profile.webp"
    // These never expire so callers should not need to "refresh" them, but we can
    // still extract the key in case the component needs it.
    if (url.includes('.r2.dev/')) {
      const u     = new URL(url);
      const key   = u.pathname.replace(/^\//, '');
      return key || null;
    }

    // C16: Log clearly when a URL doesn't match any known R2 pattern so misconfigurations surface.
    if (import.meta.env?.DEV) {
      console.warn('[extractR2Key] URL did not match any known R2 pattern:', url);
    }
    return null;
  } catch { return null; }
}

/**
 * Returns true if this URL is a permanent public R2 URL that never expires.
 * Used by image/audio components to skip the signed-URL refresh logic.
 */
export function isPublicR2Url(url) {
  if (!url) return false;
  // Public bucket URLs don't contain "serveMedia", "cloudflarestorage", or look like signed URLs
  if (url.includes('serveMedia'))              return false;
  if (url.includes('r2.cloudflarestorage.com')) return false;
  if (url.includes('X-Amz-Signature'))          return false;
  // Likely a direct CDN URL (pub-xxx.r2.dev, custom domain, or http fallback)
  return url.startsWith('http://') || url.startsWith('https://');
}

// ── Image compression ──────────────────────────────────────────────────────────

/**
 * Compress an image File/Blob to WebP in the browser using Canvas.
 * @param {File|Blob} file
 * @param {{ maxDim?: number, quality?: number }} [opts]
 * @returns {Promise<Blob>} WebP blob
 */
export function compressImageToWebP(file, { maxDim = 1080, quality = 0.80 } = {}) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > maxDim || h > maxDim) {
        if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else        { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('WebP compression failed')),
        'image/webp',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image for compression')); };
    img.src = objectUrl;
  });
}

// ── Generic media upload ───────────────────────────────────────────────────────

/**
 * Upload any media file to Cloudflare R2 via the Netlify proxy.
 *
 * PUBLIC types  (profile, cover, chat-image, homepage-audio):
 *   returns { key, url } where url is a permanent public R2 URL — store url in Firestore
 *
 * PRIVATE types (private-chat-image, private-chat-audio):
 *   returns { key, url } where url is /.netlify/functions/serveMedia?key=... — store url in Firestore
 *
 * @param {Blob|File}  blob
 * @param {'profile'|'cover'|'chat-image'|'homepage-audio'|'private-chat-image'|'private-chat-audio'} uploadType
 * @param {{ roomId?: string }} [opts]
 * @param {(pct: number) => void} [onProgress]  0–100 callback
 * @returns {Promise<{ key: string, url: string }>}
 */
// Upload types that support presigned PUT (M-14 fix — Task #3 extends to private types).
// Files above this threshold bypass Netlify's 4.5 MB body limit by uploading
// directly to R2 via a presigned PUT URL.
const PUBLIC_UPLOAD_TYPES  = new Set(['profile', 'cover', 'chat-image', 'homepage-audio']);
const PRIVATE_UPLOAD_TYPES = new Set(['private-chat-image', 'private-chat-audio']);
const PRESIGNED_THRESHOLD_BYTES = 3 * 1024 * 1024; // 3 MB
export const MAX_AUDIO_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB audio upload cap

const AUDIO_MIME_ALIASES = {
  'audio/mp3': 'audio/mpeg',
  'audio/x-mpeg': 'audio/mpeg',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/x-m4a': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'audio/x-aac': 'audio/aac',
  'audio/x-flac': 'audio/flac',
  'audio/opus': 'audio/ogg',
  'image/jpg': 'image/jpeg',
};

const EXT_TO_MIME = {
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  mpga: 'audio/mpeg',
  wav: 'audio/wav',
  wave: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  webm: 'audio/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

function normalizeClientMime(rawType, fileName = '') {
  let base = String(rawType || '').split(';')[0].trim().toLowerCase();
  if (!base || base === 'application/octet-stream' || base === 'audio/unknown') {
    const ext = String(fileName || '').split('.').pop()?.toLowerCase() || '';
    if (EXT_TO_MIME[ext]) base = EXT_TO_MIME[ext];
  }
  if (!base) base = 'application/octet-stream';
  return AUDIO_MIME_ALIASES[base] || base;
}

async function _blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to encode file'));
    reader.readAsDataURL(blob);
  });
}

async function _uploadViaFreeHost(blob, contentType, token, onProgress) {
  if (blob.size > 4.1 * 1024 * 1024) {
    throw new Error('File exceeds 4 MB Netlify proxy limit');
  }
  if (onProgress) onProgress(30);
  const base64Data = await blobToBase64(blob);
  if (onProgress) onProgress(55);

  const res = await fetch(`${BASE}/freeMediaUpload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      contentType,
      data: base64Data,
      filename: blob.name || undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Free upload failed (HTTP ${res.status})`);
  }

  const result = await res.json();
  if (!result?.url) throw new Error('Free host returned empty URL');
  if (onProgress) onProgress(100);
  return { key: null, url: result.url };
}

async function _uploadDirectFreeCorsHost(blob, contentType, onProgress) {
  if (contentType.startsWith('audio/') && blob.size > MAX_AUDIO_UPLOAD_BYTES) {
    throw new Error('Audio size must be less than 15MB!');
  }
  if (onProgress) onProgress(35);

  const subtype = contentType.split('/')[1] || 'bin';
  const ext = subtype === 'mpeg' ? 'mp3' : subtype === 'mp4' ? 'm4a' : subtype;
  const filename = blob.name || `tingletap-media-${Date.now()}.${ext}`;

  // Host 1: tmpfiles.org (supports up to 100 MB, CORS enabled)
  try {
    const form = new FormData();
    form.append('file', blob, filename);
    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: form,
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const rawUrl = data?.data?.url;
      if (rawUrl && typeof rawUrl === 'string') {
        const directUrl = rawUrl
          .replace(/^http:\/\//i, 'https://')
          .replace(/tmpfiles\.org\/(?!dl\/)/i, 'tmpfiles.org/dl/');
        if (onProgress) onProgress(100);
        return { key: null, url: directUrl };
      }
    }
  } catch {}

  if (onProgress) onProgress(60);

  // Host 2: litterbox.catbox.moe (72h free audio/media host up to 1 GB)
  try {
    const lbForm = new FormData();
    lbForm.append('reqtype', 'fileupload');
    lbForm.append('time', '72h');
    lbForm.append('fileToUpload', blob, filename);
    const lbRes = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: lbForm,
    });
    if (lbRes.ok) {
      const txt = (await lbRes.text()).trim();
      if (txt.startsWith('https://')) {
        if (onProgress) onProgress(100);
        return { key: null, url: txt };
      }
    }
  } catch {}

  throw new Error('Free CDN hosts unavailable for this file. Please try again.');
}

async function _buildCompactDataUrlFallback(blob, contentType) {
  if (contentType.startsWith('image/')) {
    const presets = [
      { maxDim: 800, quality: 0.72 },
      { maxDim: 640, quality: 0.58 },
      { maxDim: 480, quality: 0.45 },
    ];
    for (const preset of presets) {
      try {
        const compressed = await compressImageToWebP(blob, preset);
        if (compressed.size <= 580 * 1024) {
          return { key: null, url: await _blobToDataUrl(compressed) };
        }
      } catch {
        break;
      }
    }
    if (blob.size <= 580 * 1024) {
      return { key: null, url: await _blobToDataUrl(blob) };
    }
    throw new Error('Image is too large for fallback encoding');
  }

  if (contentType.startsWith('audio/') && blob.size <= 680 * 1024) {
    return { key: null, url: await _blobToDataUrl(blob) };
  }

  throw new Error('Audio upload failed (15 MB max). Please check your connection and try again.');
}

async function _tryR2Upload(blob, uploadType, contentType, token, opts, onProgress) {
  if (PUBLIC_UPLOAD_TYPES.has(uploadType) && blob.size > PRESIGNED_THRESHOLD_BYTES) {
    return _uploadPublicMediaDirect(blob, uploadType, contentType, token, onProgress);
  }
  if (PRIVATE_UPLOAD_TYPES.has(uploadType) && blob.size > PRESIGNED_THRESHOLD_BYTES) {
    return _uploadPrivateMediaDirect(blob, uploadType, contentType, token, opts, onProgress);
  }

  if (onProgress) onProgress(5);
  const base64Data = await blobToBase64(blob);
  if (onProgress) onProgress(20);

  let res;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(`${BASE}/uploadMedia`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ uploadType, contentType, data: base64Data, ...opts }),
      });
      break;
    } catch (networkErr) {
      if (attempt === 1) throw new Error('Network error — upload failed after retry');
      await new Promise(r => setTimeout(r, 800));
    }
  }

  if (onProgress) onProgress(95);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (HTTP ${res.status})`);
  }

  const result = await res.json();
  if (onProgress) onProgress(100);
  return result;
}

export async function uploadMediaFile(blob, uploadType, opts = {}, onProgress) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  const contentType = normalizeClientMime(blob.type, blob.name);
  if (contentType.startsWith('audio/') && blob.size > MAX_AUDIO_UPLOAD_BYTES) {
    throw new Error('Audio size must be less than 15MB!');
  }

  // 1. Primary: Cloudflare R2 via Netlify Functions
  try {
    const res = await _tryR2Upload(blob, uploadType, contentType, token, opts, onProgress);
    if (
      res?.url &&
      (uploadType === 'profile' || uploadType === 'cover') &&
      !res.url.startsWith('data:') &&
      !/[?&]v=/.test(res.url)
    ) {
      res.url = `${res.url}${res.url.includes('?') ? '&' : '?'}v=${Date.now()}`;
    }
    return res;
  } catch (r2Err) {
    console.warn('[uploadMediaFile] R2 unavailable, trying free media host:', r2Err.message);
  }

  // 2. Secondary: Unlimited free temporary media host via Netlify proxy (uguu.se, <= 4 MB)
  try {
    return await _uploadViaFreeHost(blob, contentType, token, onProgress);
  } catch (freeErr) {
    console.warn('[uploadMediaFile] Free proxy host unavailable, trying direct CORS host:', freeErr.message);
  }

  // 3. Tertiary: Direct CORS free CDN host (tmpfiles.org — supports up to 15 MB audio)
  try {
    return await _uploadDirectFreeCorsHost(blob, contentType, onProgress);
  } catch (cdnErr) {
    console.warn('[uploadMediaFile] Direct CORS host unavailable, trying compact inline fallback:', cdnErr.message);
  }

  // 4. Quaternary: Compact WebP / small audio DataURL fallback
  if (onProgress) onProgress(85);
  const fallbackResult = await _buildCompactDataUrlFallback(blob, contentType);
  if (onProgress) onProgress(100);
  return fallbackResult;
}

/**
 * M-14: Upload a large public media blob directly to R2 via a presigned PUT URL.
 * Used automatically by uploadMediaFile() for PUBLIC upload types > 3 MB.
 *
 * @param {Blob|File} blob
 * @param {string}    uploadType  — one of PUBLIC_UPLOAD_TYPES
 * @param {string}    contentType — MIME type (no codec suffix)
 * @param {string}    token       — Firebase ID token
 * @param {Function}  [onProgress]
 * @returns {Promise<{ key: string, url: string }>}
 */
async function _uploadPublicMediaDirect(blob, uploadType, contentType, token, onProgress) {
  if (onProgress) onProgress(5);

  // Step 1 — get a presigned PUT URL from the Netlify function
  const urlRes = await fetch(`${BASE}/getPublicUploadUrl`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body:    JSON.stringify({ uploadType, contentType, fileSize: blob.size }),
  });
  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({}));
    throw new Error(err.error || `Failed to get presigned upload URL (HTTP ${urlRes.status})`);
  }
  const { uploadUrl, key, publicUrl } = await urlRes.json();
  if (onProgress) onProgress(15);

  // Step 2 — PUT blob directly to R2 (no Netlify in the path)
  let putRes;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      putRes = await fetch(uploadUrl, {
        method:  'PUT',
        headers: { 'Content-Type': contentType },
        body:    blob,
      });
      break;
    } catch (networkErr) {
      if (attempt === 1) throw new Error('Network error — direct R2 upload failed after retry');
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  if (!putRes.ok) throw new Error(`R2 upload failed (HTTP ${putRes.status})`);

  if (onProgress) onProgress(100);
  return { key, url: publicUrl };
}

/**
 * Task #3: Upload a large private-chat media blob directly to the PRIVATE R2
 * bucket via a presigned PUT URL, bypassing Netlify's 4.5 MB body limit.
 * Used automatically by uploadMediaFile() for private-chat types > 3 MB.
 * Returns { key, url } where url is the serveMedia proxy URL (same as proxy path).
 *
 * @param {Blob|File} blob
 * @param {string}    uploadType  — 'private-chat-image' | 'private-chat-audio'
 * @param {string}    contentType — MIME type (no codec suffix)
 * @param {string}    token       — Firebase ID token
 * @param {{ roomId?: string }} opts — roomId (conversationId) is required
 * @param {Function}  [onProgress]
 * @returns {Promise<{ key: string, url: string }>}
 */
async function _uploadPrivateMediaDirect(blob, uploadType, contentType, token, opts, onProgress) {
  if (onProgress) onProgress(5);

  const roomId = opts?.roomId;
  if (!roomId) throw new Error('roomId (conversationId) is required for private-chat uploads');

  // Step 1 — get a presigned PUT URL from the Netlify function
  const urlRes = await fetch(`${BASE}/getPrivateUploadUrl`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body:    JSON.stringify({ uploadType, contentType, fileSize: blob.size, roomId }),
  });
  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({}));
    throw new Error(err.error || `Failed to get private upload URL (HTTP ${urlRes.status})`);
  }
  const { uploadUrl, key, serveUrl } = await urlRes.json();
  if (onProgress) onProgress(15);

  // Step 2 — PUT blob directly to R2 (no Netlify in the data path)
  let putRes;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      putRes = await fetch(uploadUrl, {
        method:  'PUT',
        headers: { 'Content-Type': contentType },
        body:    blob,
      });
      break;
    } catch (networkErr) {
      if (attempt === 1) throw new Error('Network error — direct R2 upload failed after retry');
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  if (!putRes.ok) throw new Error(`R2 upload failed (HTTP ${putRes.status})`);

  if (onProgress) onProgress(100);
  return { key, url: serveUrl }; // serveUrl is the /.netlify/functions/serveMedia proxy URL
}

// ── Base64 encode ──────────────────────────────────────────────────────────────

/**
 * Convert a Blob to a base64 string (no data-URL prefix).
 * Splits on ';base64,' — NOT ',' — because codec strings can contain commas,
 * e.g. "data:video/webm;codecs=vp8,opus;base64,<data>".
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = /** @type {string} */ (reader.result);
      const base64 = result.split(';base64,')[1];
      if (!base64) reject(new Error('Failed to extract base64 from DataURL'));
      else resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}

// ── Badge verification ─────────────────────────────────────────────────────────

// ── Presigned PUT helper (M-14) ────────────────────────────────────────────────

/**
 * Upload a Blob directly to R2 via a presigned PUT URL.
 * Bypasses the Netlify 4.5 MB body limit entirely — the blob goes straight
 * from the browser to Cloudflare R2.
 *
 * Flow:
 *  1. Call getUploadUrl (Netlify) → { uploadUrl, key }
 *  2. PUT the blob directly to uploadUrl (no Netlify in the path)
 *  3. Return the key to the caller
 *
 * @param {Blob|File} blob
 * @param {string}    contentType  e.g. 'video/webm'
 * @param {Object}    urlPayload   body sent to getUploadUrl (mediaType, prefix, section, …)
 * @param {string}    token        Firebase ID token
 * @param {(n:number)=>void} [onProgress]
 * @returns {Promise<string>} R2 object key
 */
async function uploadViaPresignedUrl(blob, contentType, urlPayload, token, onProgress) {
  if (onProgress) onProgress(5);

  // Step 1 — ask Netlify for a presigned PUT URL
  const urlRes = await fetch(`${BASE}/getUploadUrl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...urlPayload, contentType, fileSize: blob.size }),
  });
  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({}));
    throw new Error(err.error || `Failed to get upload URL (${urlRes.status})`);
  }
  const { uploadUrl, key } = await urlRes.json();
  if (onProgress) onProgress(15);

  // Step 2 — PUT the blob directly to R2 (no Netlify body-size limit)
  let putRes;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      break;
    } catch (networkErr) {
      if (attempt === 1) throw new Error('Network error — upload to R2 failed after retry');
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  if (!putRes.ok) throw new Error(`R2 upload failed (HTTP ${putRes.status})`);
  if (onProgress) onProgress(100);
  return key;
}

// ── Badge verification ─────────────────────────────────────────────────────────

/**
 * Upload a badge verification media blob directly to R2 via a presigned PUT URL
 * (M-14 fix — bypasses Netlify 4.5 MB body limit).
 * Stored in the PRIVATE bucket under badge/{uid}/{type}-{uuid}.{ext}.
 * Returns the R2 object key only — never a URL.
 *
 * @param {Blob|File} blob
 * @param {'video'|'audio'} mediaType
 * @param {(progress: number) => void} [onProgress]  0–100
 * @returns {Promise<string>} R2 object key
 */
export async function uploadMedia(blob, mediaType, onProgress) {
  const token = await getIdToken();
  const rawType     = blob.type || (mediaType === 'video' ? 'video/webm' : 'audio/webm');
  const contentType = rawType.split(';')[0].trim().toLowerCase();
  return uploadViaPresignedUrl(blob, contentType, { prefix: 'badge', mediaType }, token, onProgress);
}

/**
 * Submit the badge application after media uploads complete.
 */
export async function submitBadgeApplication(data) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/submitBadgeApplication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Submit failed (${res.status})`);
  return json;
}

/**
 * Fetch badge verification media as a Blob via the auth-gated server proxy.
 * Owner/admin only. Works with both new "badge/" and legacy "verifications/" keys.
 * @param {string} key            R2 object key
 * @param {string} [applicantUid] UID of the applicant — used server-side to verify the key
 *                                belongs to this specific application (IDOR protection M-20).
 * @returns {Promise<Blob>}
 */
export async function getBadgeMedia(key, applicantUid) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/getBadgeMedia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key, ...(applicantUid ? { applicantUid } : {}) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch media (${res.status})`);
  }
  return res.blob();
}

// ── Signed URL refresh ─────────────────────────────────────────────────────────

/**
 * Get a fresh presigned GET URL for any private R2 media key.
 * Only needed for private/legacy proxy URLs — public bucket URLs never expire.
 * Any authenticated non-guest user may call this for non-verification keys.
 *
 * @param {string} key        R2 object key
 * @param {number} [expiresIn] seconds (60–3600). Default: 3600
 * @returns {Promise<string>} fresh signed URL
 */
export async function getMediaUrl(key, expiresIn = 3600) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/getMediaUrl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key, expiresIn }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Failed to get media URL (${res.status})`);
  return json.signedUrl;
}

/**
 * Get a 5-minute presigned GET URL for admin badge verification viewing.
 * Works with both new "badge/" and legacy "verifications/" keys.
 * @param {string} key  R2 object key
 * @returns {Promise<string>} temporary signed URL
 */
export async function getSignedMediaUrl(key) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/generateSignedMediaUrl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Failed to generate signed URL (${res.status})`);
  return json.signedUrl;
}

/**
 * Admin: approve, reject, or request resubmission.
 */
export async function reviewApplication(applicantUid, action, reviewNotes = '', badgeKey = null) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/reviewBadgeApplication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ applicantUid, action, reviewNotes, badgeKey }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Review action failed (${res.status})`);
  return json;
}

// ── RJ Verification ────────────────────────────────────────────────────────────

/**
 * Upload an RJ verification audio recording via the Netlify proxy.
 * Stored in the PRIVATE bucket under rj/{uid}/{section}-{uuid}.{ext}.
 * Returns the R2 object key only — never a URL.
 *
 * @param {Blob} blob
 * @param {'intro'|'song'|'welcome'} section
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<string>} R2 object key
 */
/**
 * Upload RJ verification audio directly to R2 via a presigned PUT URL
 * (M-14 fix — bypasses Netlify 4.5 MB body limit).
 * Stored in the PRIVATE bucket under rj/{uid}/{section}-{uuid}.{ext}.
 * Returns the R2 object key only — never a URL.
 *
 * @param {Blob|File} blob
 * @param {'intro'|'song'|'welcome'} section
 * @param {(progress: number) => void} [onProgress]  0–100
 * @returns {Promise<string>} R2 object key
 */
export async function uploadRJMedia(blob, section, onProgress) {
  const token = await getIdToken();
  const rawType     = blob.type || 'audio/webm';
  const contentType = rawType.split(';')[0].trim().toLowerCase();
  return uploadViaPresignedUrl(blob, contentType, { prefix: 'rj', section }, token, onProgress);
}

/**
 * Submit the RJ verification application after all three recordings are uploaded.
 */
export async function submitRJApplication(data) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/submitRJApplication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Submit failed (${res.status})`);
  return json;
}

/**
 * Fetch RJ verification audio as a Blob via the auth-gated server proxy.
 * Owner/admin only. Works with both new "rj/" and legacy "rj-verifications/" keys.
 * @param {string} key            R2 object key
 * @param {string} [applicantUid] UID of the applicant — used server-side to verify the key
 *                                belongs to this specific application (IDOR protection M-20).
 * @returns {Promise<Blob>}
 */
export async function getRJMedia(key, applicantUid) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/getRJMedia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key, ...(applicantUid ? { applicantUid } : {}) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch media (${res.status})`);
  }
  return res.blob();
}

/**
 * Admin: approve, reject, or request resubmission of an RJ application.
 */
export async function reviewRJApplication(applicantUid, action, reviewNotes = '') {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/reviewRJApplication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ applicantUid, action, reviewNotes }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Review action failed (${res.status})`);
  return json;
}
