// src/services/r2StorageService.js
// Client-side R2 storage service — all uploads proxy through Netlify Functions.
// Never exposes credentials. No direct browser→R2 connection (avoids CORS).

import { auth } from '../firebase/config';

/**
 * Extract the R2 object key from a presigned GET URL.
 * R2 signed URL format: https://{account}.r2.cloudflarestorage.com/{bucket}/{key}?...
 * The key is still present in the URL path even after the signature has expired,
 * allowing callers to obtain a fresh signed URL without storing the key separately.
 * @param {string} url  — any URL string
 * @returns {string|null} the R2 key, or null if the URL is not a recognised R2 signed URL
 */
export function extractR2Key(url) {
  try {
    if (!url || !url.includes('r2.cloudflarestorage.com')) return null;
    const u = new URL(url);
    // pathname = /{bucket}/{key...}
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return parts.slice(1).join('/'); // drop the bucket segment
  } catch { return null; }
}

// ─── Image compression ────────────────────────────────────────────────────────

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
      // Proportional downscale — never upscale
      if (w > maxDim || h > maxDim) {
        if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else        { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
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

// ─── Generic media upload ─────────────────────────────────────────────────────

/**
 * Upload any media file to Cloudflare R2 via the Netlify proxy.
 *
 * @param {Blob|File}  blob
 * @param {'profile'|'cover'|'chat-image'|'homepage-audio'|'private-chat-image'|'private-chat-audio'} uploadType
 * @param {{ roomId?: string }} [opts]   roomId / conversationId for chat uploads
 * @param {(pct: number) => void} [onProgress]  0–100 callback
 * @returns {Promise<{ key: string, url: string }>}
 */
export async function uploadMediaFile(blob, uploadType, opts = {}, onProgress) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  // Report encode start
  if (onProgress) onProgress(5);
  const base64Data = await blobToBase64(blob);
  if (onProgress) onProgress(20);

  const rawType     = blob.type || 'application/octet-stream';
  const contentType = rawType.split(';')[0].trim().toLowerCase();

  // One retry on network failure
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
      break; // success — exit retry loop
    } catch (networkErr) {
      if (attempt === 1) throw new Error('Network error — upload failed after retry');
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  if (onProgress) onProgress(95);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (HTTP ${res.status})`);
  }

  const result = await res.json();
  if (onProgress) onProgress(100);
  return result; // { key, url }
}

const BASE = '/.netlify/functions';

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

/**
 * Convert a Blob to a base64 string (no data-URL prefix).
 * Used to send binary media through a JSON Netlify function body.
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = /** @type {string} */ (reader.result);
      // Split on ';base64,' — NOT ',' — because codec strings can contain commas,
      // e.g. "data:video/webm;codecs=vp8,opus;base64,<data>".
      // Using split(',')[1] would yield "opus;base64" instead of the actual data.
      const base64 = result.split(';base64,')[1];
      if (!base64) reject(new Error('Failed to extract base64 from DataURL'));
      else resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload a Blob/File to Cloudflare R2 via the Netlify proxy function.
 * The proxy uses the server-side S3 SDK — no browser CORS required.
 *
 * @param {Blob|File} blob
 * @param {'video'|'audio'} mediaType
 * @param {(progress: number) => void} [onProgress]  0–100
 * @returns {Promise<string>} R2 object key
 */
export async function uploadMedia(blob, mediaType, onProgress) {
  const token = await getIdToken();

  // Strip codec qualifiers so the content-type matches what the server expects
  // (e.g. "video/webm;codecs=vp8,opus" → "video/webm")
  const rawType    = blob.type || (mediaType === 'video' ? 'video/webm' : 'audio/webm');
  const contentType = rawType.split(';')[0].trim().toLowerCase();

  // Encode blob to base64 — report ~10% progress while encoding
  if (onProgress) onProgress(5);
  const base64Data = await blobToBase64(blob);
  if (onProgress) onProgress(15);

  // POST to proxy upload function
  const res = await fetch(`${BASE}/uploadBadgeMedia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mediaType, contentType, data: base64Data }),
  });

  if (onProgress) onProgress(90);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }

  const { key } = await res.json();
  if (onProgress) onProgress(100);
  return key;
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
 * Fetch badge media as a Blob via a server-side proxy (no browser CORS needed).
 * Owner/admin only.
 * @param {string} key  R2 object key
 * @returns {Promise<Blob>}
 */
export async function getBadgeMedia(key) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/getBadgeMedia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch media (${res.status})`);
  }
  return res.blob();
}

/**
 * Get a signed GET URL for any R2 media key (profiles, covers, chat images, audio).
 * Any authenticated (non-guest) user may call this.
 * Used to refresh expired signed URLs stored in Firestore.
 * @param {string} key        R2 object key
 * @param {number} [expiresIn] Seconds until expiry (60–86400). Default: 3600 (1 hour).
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
 * Get a 5-minute presigned GET URL for admin media viewing (fallback).
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
export async function reviewApplication(applicantUid, action, reviewNotes = '') {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/reviewBadgeApplication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ applicantUid, action, reviewNotes }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Review action failed (${res.status})`);
  return json;
}

// ─── RJ Verification — same proxy pattern, separate endpoints/collection ─────

/**
 * Upload an RJ verification audio recording via the Netlify proxy function.
 * @param {Blob} blob
 * @param {'intro'|'song'|'welcome'} section
 * @param {(progress: number) => void} [onProgress]
 * @returns {Promise<string>} R2 object key
 */
export async function uploadRJMedia(blob, section, onProgress) {
  const token = await getIdToken();
  const rawType     = blob.type || 'audio/webm';
  const contentType = rawType.split(';')[0].trim().toLowerCase();

  if (onProgress) onProgress(5);
  const base64Data = await blobToBase64(blob);
  if (onProgress) onProgress(15);

  const res = await fetch(`${BASE}/uploadRJMedia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ section, contentType, data: base64Data }),
  });

  if (onProgress) onProgress(90);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }

  const { key } = await res.json();
  if (onProgress) onProgress(100);
  return key;
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
 * Fetch RJ verification audio as a Blob via a server-side proxy. Owner/admin only.
 * @param {string} key  R2 object key
 * @returns {Promise<Blob>}
 */
export async function getRJMedia(key) {
  const token = await getIdToken();
  const res = await fetch(`${BASE}/getRJMedia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key }),
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
