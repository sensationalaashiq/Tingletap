// netlify/functions/submitBadgeApplication.js
// After client uploads media directly to R2, this function:
// 1. Verifies the Firebase ID token
// 2. Confirms R2 objects exist
// 3. Collects IP/geo metadata
// 4. Writes a badgeApplications/{uid} document to Firestore

import { objectExists } from './shared/r2Client.js';
import { verifyToken, getAdminDb } from './shared/firestoreAdmin.js';

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

// Get client IP from Netlify event
function getClientIP(event) {
  return (
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    '0.0.0.0'
  );
}

// Fetch geo info for IP
async function fetchGeoInfo(ip) {
  try {
    const res = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,regionName,city,timezone,isp,org,as`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return {};
    const d = await res.json();
    if (d.status !== 'success') return {};
    return {
      country:  d.country   || '',
      region:   d.regionName|| '',
      city:     d.city      || '',
      timezone: d.timezone  || '',
      isp:      d.isp       || '',
      asn:      d.as        || '',
    };
  } catch { return {}; }
}

// Check VPN/proxy via vpnapi.io (free tier)
async function checkVPN(ip) {
  try {
    const apiKey = process.env.VPNAPI_KEY;
    if (!apiKey) return { vpn: false, proxy: false, tor: false, hosting: false };
    const res = await fetch(`https://vpnapi.io/api/${ip}?key=${apiKey}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { vpn: false, proxy: false, tor: false, hosting: false };
    const d = await res.json();
    return {
      vpn:     d.security?.vpn     ?? false,
      proxy:   d.security?.proxy   ?? false,
      tor:     d.security?.tor     ?? false,
      hosting: d.security?.hosting ?? false,
    };
  } catch {
    return { vpn: false, proxy: false, tor: false, hosting: false };
  }
}

// Write badge application to Firestore.
// Tries Firebase Admin SDK first (bypasses security rules — correct for
// server-side writes). Falls back to REST with the user's ID token only
// if Admin credentials are unavailable (local dev / missing env vars).
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

  // ── Admin SDK path ────────────────────────────────────────────────────────
  if (adminDb) {
    await adminDb.collection('badgeApplications').doc(uid).set(docData);
    return;
  }

  // ── REST fallback (user token) ────────────────────────────────────────────
  // NOTE: this path requires Firestore rules to allow the user to write their
  // own badgeApplications/{uid} document. If rules block it, the write will
  // fail with 403. Prefer setting up Admin credentials in Netlify env vars.
  const url = `${FS_BASE}/badgeApplications/${uid}`;
  const fields = {};
  for (const [k, v] of Object.entries(docData)) {
    if (v === null || v === undefined)    fields[k] = { nullValue: null };
    else if (v instanceof Date)           fields[k] = { timestampValue: v.toISOString() };
    else if (typeof v === 'boolean')      fields[k] = { booleanValue: v };
    else if (typeof v === 'number')       fields[k] = { integerValue: String(Math.round(v)) };
    else if (Array.isArray(v))            fields[k] = { arrayValue: { values: v.map(i => ({ stringValue: String(i) })) } };
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

// Read existing application to enforce one-pending-per-user
async function getExistingApplication(uid, token) {
  const url = `${FS_BASE}/badgeApplications/${uid}?fields=status,expiresAt`;
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
    gender, videoKey, audioKey,
    livenessPassed, challengeResults,
    username, displayName, email,
    accountAge, browser, platform, device, userAgent,
  } = body;

  if (!gender || !['male', 'female'].includes(gender))
    return resp({ error: 'Invalid gender' }, 400);
  if (!videoKey && gender === 'female')
    return resp({ error: 'videoKey required for female applicants' }, 400);
  if (gender === 'female' && !livenessPassed)
    return resp({ error: 'Liveness verification required for female applicants' }, 400);

  // Verify Firebase token
  const user = await verifyToken(token);
  if (!user.ok) return resp({ error: user.err }, 401);
  if (user.role === 'guest') return resp({ error: 'Registered accounts only' }, 403);

  // Check for existing pending application
  const existing = await getExistingApplication(user.uid, token);
  if (existing) {
    const isExpired = existing.expiresAt && new Date(existing.expiresAt) < new Date();
    if (existing.status === 'pending' && !isExpired)
      return resp({ error: 'You already have a pending application. Please wait for review.' }, 409);
    if (existing.status === 'approved')
      return resp({ error: 'Your badge has already been approved.' }, 409);
  }

  // Enforce media key ownership — keys must belong to this user's prefix
  const expectedPrefix = `verifications/${user.uid}/`;
  if (videoKey && !videoKey.startsWith(expectedPrefix))
    return resp({ error: 'Invalid video key: key does not belong to this user.' }, 403);
  if (audioKey && !audioKey.startsWith(expectedPrefix))
    return resp({ error: 'Invalid audio key: key does not belong to this user.' }, 403);

  // Validate R2 objects exist (female only — video required, audio optional)
  if (gender === 'female') {
    try {
      const videoOk = await objectExists(videoKey);
      if (!videoOk) return resp({ error: 'Video file not found in storage. Please re-upload.' }, 422);
      if (audioKey) {
        const audioOk = await objectExists(audioKey);
        if (!audioOk) return resp({ error: 'Audio file not found in storage. Please re-upload.' }, 422);
      }
    } catch (e) {
      console.error('[submitBadgeApplication] R2 check error:', e.message);
      return resp({ error: 'Storage verification failed' }, 503);
    }
  }

  // Collect IP & geo
  const ip = getClientIP(event);
  const [geo, vpnInfo] = await Promise.all([fetchGeoInfo(ip), checkVPN(ip)]);

  // Build application document
  const applicationData = {
    uid:              user.uid,
    username:         username  || '',
    displayName:      displayName || user.displayName || '',
    email:            email || user.email || '',
    gender,
    status:           'pending',
    accountAge:       typeof accountAge === 'number' ? accountAge : 0,
    videoKey:         videoKey || null,
    audioKey:         audioKey || null,
    livenessPassed:   livenessPassed === true,
    challengeResults: JSON.stringify(challengeResults || []),
    ipAddress:        ip,
    country:          geo.country  || '',
    region:           geo.region   || '',
    city:             geo.city     || '',
    timezone:         geo.timezone || '',
    isp:              geo.isp      || '',
    asn:              geo.asn      || '',
    browser:          browser      || '',
    platform:         platform     || '',
    device:           device       || '',
    userAgent:        userAgent    || '',
    vpn:              vpnInfo.vpn,
    proxy:            vpnInfo.proxy,
    tor:              vpnInfo.tor,
    hosting:          vpnInfo.hosting,
  };

  try {
    await writeApplication(user.uid, applicationData, token);
  } catch (e) {
    console.error('[submitBadgeApplication] Firestore error:', e.message);
    return resp({ error: 'Failed to submit application. Please try again.' }, 500);
  }

  return resp({ success: true, message: 'Application submitted successfully. You will be notified after review.' });
};
