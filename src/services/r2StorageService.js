// src/services/r2StorageService.js
// Client-side R2 storage service — all uploads proxy through Netlify Functions.
// Never exposes credentials. No direct browser→R2 connection (avoids CORS).

import { auth } from '../firebase/config';

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
    reader.onload  = () => resolve(/** @type {string} */(reader.result).split(',')[1]);
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
 * Get a 5-minute presigned GET URL for admin media viewing.
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
