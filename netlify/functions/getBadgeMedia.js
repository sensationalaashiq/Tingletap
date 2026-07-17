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
import { verifyToken, getAdminDb } from './shared/firestoreAdmin.js';

const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
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

  const { key, applicantUid } = body;

  // Accept both new "badge/" prefix and legacy "verifications/" prefix
  const isNewKey    = key && typeof key === 'string' && key.startsWith('badge/');
  const isLegacyKey = key && typeof key === 'string' && key.startsWith('verifications/');

  if (!isNewKey && !isLegacyKey) {
    return errResp('Invalid or missing key', 400);
  }

  // applicantUid is REQUIRED — callers must always scope requests to a specific applicant.
  // Accepting requests without it would allow bypassing the ownership check entirely.
  if (!applicantUid || typeof applicantUid !== 'string' || applicantUid.trim() === '') {
    return errResp('applicantUid is required', 400);
  }

  // Restrict to owner / admin
  const user = await verifyToken(token, ['owner', 'admin']);
  if (!user.ok) return errResp(user.err, 403);

  // FIX M-20 (fail-closed): Verify the key belongs to this specific applicant's
  // application document. Prevents IDOR — a staff member fetching any applicant's
  // private verification media by guessing or manipulating R2 key paths.
  //
  // Fail-closed policy:
  //   • Admin SDK unavailable → 503 (never skip the check)
  //   • App doc missing       → 403 (no application = no entitlement)
  //   • Admin SDK error       → 503 (safe failure, not silent bypass)
  //   • Key not in allowed list → 403
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error('[getBadgeMedia] Firebase Admin not configured — cannot perform ownership check.');
      return errResp('Server configuration error — media access unavailable.', 503);
    }
    const appSnap = await adminDb.collection('badgeApplications').doc(applicantUid).get();
    if (!appSnap.exists) {
      console.warn('[getBadgeMedia] Application not found for applicantUid:', applicantUid);
      return errResp('Application not found or media access denied.', 403);
    }
    const { videoKey, audioKey } = appSnap.data();
    const allowedKeys = [videoKey, audioKey].filter(Boolean);
    if (!allowedKeys.includes(key)) {
      console.warn('[getBadgeMedia] Key mismatch — applicant:', applicantUid, 'requested key:', key, 'allowed:', allowedKeys);
      return errResp('Media key does not match this application.', 403);
    }
  } catch (e) {
    console.error('[getBadgeMedia] Ownership check error:', e.message);
    return errResp('Media access check failed — try again.', 503);
  }

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
