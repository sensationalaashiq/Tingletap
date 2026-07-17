// netlify/functions/submitRJApplication.js
// After client uploads the three audio recordings to R2, this function:
// 1. Verifies the Firebase ID token
// 2. Confirms R2 objects exist
// 3. Collects IP/geo metadata
// 4. Writes an rjApplications/{uid} document to Firestore
//
// Mirrors submitBadgeApplication.js — same workflow, applied to RJ Verification.

import { objectExists } from './shared/r2Client.js';
import { verifyToken, getAdminDb } from './shared/firestoreAdmin.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function resp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

function getClientIP(event) {
  return (
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    '0.0.0.0'
  );
}

const IPv4_RE = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

async function fetchGeoInfo(ip) {
  const abstractKey = process.env.ABSTRACT_API_KEY;
  if (abstractKey) {
    try {
      const url =
        `https://ipgeolocation.abstractapi.com/v1/?api_key=${encodeURIComponent(abstractKey)}` +
        `&ip_address=${encodeURIComponent(ip)}&fields=ip_address,city,region,country,timezone,connection`;
      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const d = await res.json();
        const conn = d.connection || {};
        return {
          country:  d.country    || '',
          region:   d.region     || '',
          city:     d.city       || '',
          timezone: d.timezone?.name || '',
          isp:      conn.isp_name || conn.isp || '',
          asn:      conn.autonomous_system_number ? String(conn.autonomous_system_number) : '',
        };
      }
    } catch { /* fall through */ }
  }

  if (!IPv4_RE.test(ip)) return {};
  try {
    const res = await fetch(
      `https://ip-api.com/json/${ip}?fields=status,country,regionName,city,timezone,isp,org,as`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return {};
    const d = await res.json();
    if (d.status !== 'success') return {};
    return {
      country:  d.country    || '',
      region:   d.regionName || '',
      city:     d.city       || '',
      timezone: d.timezone   || '',
      isp:      d.isp        || '',
      asn:      d.as         || '',
    };
  } catch { return {}; }
}

async function writeApplication(uid, data, token) {
  const adminDb = getAdminDb();

  const now    = new Date();
  const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const docData = {
    ...data,
    submittedAt:       now,
    expiresAt:         expiry,
    reviewedAt:        null,
    reviewNotes:       '',
    reviewedBy:        '',
    reapplyEligibleAt: null,
  };

  if (adminDb) {
    await adminDb.collection('rjApplications').doc(uid).set(docData);
    return;
  }

  // REST fallback (user token) — requires Firestore rules to permit self-write.
  const url = `${FS_BASE}/rjApplications/${uid}`;
  const fields = {};
  for (const [k, v] of Object.entries(docData)) {
    if (v === null || v === undefined)    fields[k] = { nullValue: null };
    else if (v instanceof Date)           fields[k] = { timestampValue: v.toISOString() };
    else if (typeof v === 'boolean')      fields[k] = { booleanValue: v };
    else if (typeof v === 'number')       fields[k] = { integerValue: String(Math.round(v)) };
    else                                  fields[k] = { stringValue: String(v) };
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore write failed ${res.status}: ${err}`);
  }
}

async function getExistingApplication(uid, token) {
  const url = `${FS_BASE}/rjApplications/${uid}?fields=status,expiresAt`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = await res.json();
  const f = data.fields || {};
  return {
    status:    f.status?.stringValue || null,
    expiresAt: f.expiresAt?.timestampValue || null,
  };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return resp({ error: 'Method not allowed' }, 405);

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return resp({ error: 'Invalid JSON' }, 400); }

  const {
    introKey, songKey, welcomeKey,
    username, displayName, email, gender,
    browser, platform, device, userAgent,
  } = body;

  if (!introKey || !songKey || !welcomeKey)
    return resp({ error: 'All three recordings (intro, song, welcome) are required' }, 400);

  // Verify Firebase token
  const user = await verifyToken(token);
  if (!user.ok) return resp({ error: user.err }, 401);
  if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);

  // Check for existing pending/approved application
  const existing = await getExistingApplication(user.uid, token);
  if (existing) {
    const isExpired = existing.expiresAt && new Date(existing.expiresAt) < new Date();
    if (existing.status === 'pending' && !isExpired)
      return resp({ error: 'You already have a pending RJ application. Please wait for review.' }, 409);
    if (existing.status === 'approved')
      return resp({ error: 'You are already a verified RJ.' }, 409);
  }

  // Enforce media key ownership — keys must belong to this user's prefix
  const expectedPrefix = `rj-verifications/${user.uid}/`;
  for (const [label, key] of [['intro', introKey], ['song', songKey], ['welcome', welcomeKey]]) {
    if (!key.startsWith(expectedPrefix))
      return resp({ error: `Invalid ${label} key: key does not belong to this user.` }, 403);
  }

  // Validate R2 objects exist
  try {
    const [introOk, songOk, welcomeOk] = await Promise.all([
      objectExists(introKey), objectExists(songKey), objectExists(welcomeKey),
    ]);
    if (!introOk)   return resp({ error: 'Funny Introduction file not found in storage. Please re-record.' }, 422);
    if (!songOk)    return resp({ error: 'Song file not found in storage. Please re-record.' }, 422);
    if (!welcomeOk) return resp({ error: 'Welcome Message file not found in storage. Please re-record.' }, 422);
  } catch (e) {
    console.error('[submitRJApplication] R2 check error:', e.message);
    return resp({ error: 'Storage verification failed' }, 503);
  }

  // Collect IP & geo
  const ip = getClientIP(event);
  const geo = await fetchGeoInfo(ip);

  const applicationData = {
    uid:         user.uid,
    username:    username    || '',
    displayName: displayName || user.displayName || '',
    email:       email || user.email || '',
    gender:      gender || '',
    status:      'pending',
    introKey,
    songKey,
    welcomeKey,
    ipAddress:   ip,
    country:     geo.country  || '',
    region:      geo.region   || '',
    city:        geo.city     || '',
    timezone:    geo.timezone || '',
    isp:         geo.isp      || '',
    asn:         geo.asn      || '',
    browser:     browser  || '',
    platform:    platform || '',
    device:      device   || '',
    userAgent:   userAgent || '',
  };

  try {
    await writeApplication(user.uid, applicationData, token);
  } catch (e) {
    console.error('[submitRJApplication] Firestore error:', e.message);
    return resp({ error: 'Failed to submit application. Please try again.' }, 500);
  }

  return resp({ success: true, message: 'RJ application submitted successfully. You will be notified after review.' });
};
