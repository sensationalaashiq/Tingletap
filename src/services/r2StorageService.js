// src/services/r2StorageService.js
// Client-side R2 storage service — proxies through Netlify Functions.
// Never exposes credentials. Handles presigned URL retrieval and direct uploads.

import { auth } from '../firebase/config';

const BASE = '/.netlify/functions';

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

/**
 * Upload a Blob/File directly to Cloudflare R2 via a presigned PUT URL.
 * @param {Blob|File} blob
 * @param {'video'|'audio'} mediaType
 * @param {(progress: number) => void} [onProgress]  0–100
 * @returns {Promise<string>} R2 object key
 */
export async function uploadMedia(blob, mediaType, onProgress) {
  const token       = await getIdToken();
  const contentType = blob.type || (mediaType === 'video' ? 'video/webm' : 'audio/webm');

  // Step 1: get presigned PUT URL
  const urlRes = await fetch(`${BASE}/getUploadUrl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mediaType, contentType, fileSize: blob.size }),
  });
  if (!urlRes.ok) {
    const err = await urlRes.json().catch(() => ({}));
    throw new Error(err.error || `Failed to get upload URL (${urlRes.status})`);
  }
  const { uploadUrl, key, contentType: signedContentType } = await urlRes.json();
  // Use the canonical content-type returned by the server — it strips codec
  // qualifiers (e.g., video/webm;codecs=vp8,opus → video/webm) to match the
  // signed value. Mismatching causes SignatureDoesNotMatch on R2/S3.
  const putContentType = signedContentType || contentType;

  // Step 2: PUT blob directly to R2
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', putContentType);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(blob);
  });

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
