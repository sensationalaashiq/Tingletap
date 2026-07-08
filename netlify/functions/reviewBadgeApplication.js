// netlify/functions/reviewBadgeApplication.js
// Owner/Admin only: approve, reject, or request resubmission of a badge application.
// On approve/reject: deletes R2 media, updates badgeApplications/{uid}, updates users/{uid} if approved.

import { deleteObjects } from './shared/r2Client.js';
import { verifyToken } from './shared/firestoreAdmin.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function resp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

async function fsGet(path, token) {
  const res = await fetch(`${FS_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  const data = await res.json();
  const f = data.fields || {};
  const obj = {};
  for (const [k, v] of Object.entries(f)) {
    if ('stringValue'  in v) obj[k] = v.stringValue;
    else if ('booleanValue' in v) obj[k] = v.booleanValue;
    else if ('integerValue' in v) obj[k] = Number(v.integerValue);
    else if ('nullValue' in v) obj[k] = null;
    else if ('timestampValue' in v) obj[k] = v.timestampValue;
    else obj[k] = null;
  }
  return obj;
}

// fsPatch uses updateMask to safely update only the supplied fields,
// never overwriting or clearing unrelated fields in the document.
async function fsPatch(path, fields, token) {
  const fsFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null)            fsFields[k] = { nullValue: null };
    else if (typeof v === 'boolean') fsFields[k] = { booleanValue: v };
    else if (typeof v === 'number')  fsFields[k] = { doubleValue: v };
    else                             fsFields[k] = { stringValue: String(v) };
  }
  // Build update mask query string — prevents full-document replace
  const maskParams = Object.keys(fields)
    .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  const url = `${FS_BASE}/${path}?${maskParams}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: fsFields }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PATCH ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return resp({ error: 'Method not allowed' }, 405);

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return resp({ error: 'Invalid JSON' }, 400); }

  const { applicantUid, action, reviewNotes } = body;
  if (!applicantUid) return resp({ error: 'applicantUid required' }, 400);
  if (!['approve', 'reject', 'request_resubmit'].includes(action))
    return resp({ error: 'action must be approve, reject, or request_resubmit' }, 400);

  // Only owner/admin can review
  const reviewer = await verifyToken(token, ['owner', 'admin']);
  if (!reviewer.ok) return resp({ error: reviewer.err }, 403);

  // Fetch the application
  let app;
  try {
    app = await fsGet(`badgeApplications/${applicantUid}`, token);
  } catch (e) {
    return resp({ error: 'Failed to fetch application' }, 500);
  }
  if (!app) return resp({ error: 'Application not found' }, 404);
  if (app.status === 'approved' && action === 'approve')
    return resp({ error: 'Already approved' }, 409);

  const now = new Date().toISOString();
  const reviewerName = reviewer.displayName || reviewer.uid;

  // ── Delete media from R2 on approve/reject ────────────────────────────────
  if (action === 'approve' || action === 'reject') {
    const keysToDelete = [app.videoKey, app.audioKey].filter(Boolean);
    if (keysToDelete.length > 0) {
      try {
        await deleteObjects(keysToDelete);
      } catch (e) {
        console.error('[reviewBadgeApplication] R2 delete error:', e.message);
        // Non-fatal — continue with Firestore update
      }
    }
  }

  // ── Update badgeApplications ──────────────────────────────────────────────
  const appUpdate = {
    status:      action === 'approve' ? 'approved'
               : action === 'reject'  ? 'rejected'
               : 'resubmit_requested',
    reviewNotes: reviewNotes || '',
    reviewedBy:  reviewerName,
    reviewedAt:  now,
  };

  // After approve/reject, clear media keys from Firestore
  if (action === 'approve' || action === 'reject') {
    appUpdate.videoKey = null;
    appUpdate.audioKey = null;
  }

  // Set reapplyEligibleAt for rejected (can reapply immediately, per spec: "user may immediately submit fresh application")
  if (action === 'reject') {
    appUpdate.reapplyEligibleAt = now;
  }

  try {
    await fsPatch(`badgeApplications/${applicantUid}`, appUpdate, token);
  } catch (e) {
    console.error('[reviewBadgeApplication] Firestore app update error:', e.message);
    return resp({ error: 'Failed to update application' }, 500);
  }

  // ── On approve: update users/{uid}.badge = 'verified' ────────────────────
  if (action === 'approve') {
    try {
      await fsPatch(`users/${applicantUid}`, {
        badge:            'verified',
        verifiedAt:       now,
        badgeVerifiedBy:  reviewerName,
      }, token);
    } catch (e) {
      console.error('[reviewBadgeApplication] users update error:', e.message);
      // Non-fatal — badge status is in badgeApplications too
    }
  }

  return resp({
    success: true,
    action,
    applicantUid,
    reviewedBy: reviewerName,
    reviewedAt: now,
  });
};
