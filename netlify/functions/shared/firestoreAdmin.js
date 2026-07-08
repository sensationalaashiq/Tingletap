// netlify/functions/shared/firestoreAdmin.js
// Lightweight Firestore REST helpers for server-side Netlify functions.
// Uses Firebase ID token (passed from client) to authenticate REST calls.
// No Firebase Admin SDK required for reads/writes on behalf of users.
// Admin writes (e.g. cleanup job) use Firebase Admin if credentials are set.

import admin from 'firebase-admin';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── Firebase Admin (optional, needed for server-initiated writes) ─────────────
let _adminApp = null;
let _adminDb  = null;

export function getAdminDb() {
  if (_adminDb) return _adminDb;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) return null;
  try {
    if (!admin.apps.length) {
      _adminApp = admin.initializeApp({
        credential: admin.credential.cert({ projectId: PROJECT_ID, clientEmail, privateKey }),
      });
    } else {
      _adminApp = admin.app();
    }
    _adminDb = _adminApp.firestore();
    return _adminDb;
  } catch (e) {
    console.warn('[firestoreAdmin] Firebase Admin init failed:', e.message);
    return null;
  }
}

// ─── JWT decode (no sig verify — Firestore REST implicit verify) ───────────────
export function decodeJwt(token) {
  try {
    const b64 = token.split('.')[1];
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  } catch { return null; }
}

/**
 * Verify Firebase ID token and fetch user Firestore doc.
 * Returns { ok, uid, role, displayName, email, gender, createdAt, err }
 */
export async function verifyToken(token, requiredRoles = null) {
  const p = decodeJwt(token);
  if (!p) return { ok: false, err: 'Invalid token' };

  const uid = p.user_id || p.sub;
  if (!uid)  return { ok: false, err: 'Token missing UID' };
  if (p.exp && Date.now() / 1000 > p.exp + 30)
    return { ok: false, err: 'Token expired' };
  if (p.aud !== PROJECT_ID)
    return { ok: false, err: 'Token audience mismatch' };

  const url = `${FS_BASE}/users/${uid}?fields=role,displayName,email,gender,createdAt`;
  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    return { ok: false, err: 'Network error' };
  }
  if (res.status === 401 || res.status === 403)
    return { ok: false, err: 'Auth failed' };
  if (!res.ok)
    return { ok: false, err: `Firestore error ${res.status}` };

  const data = await res.json();
  const f    = data.fields || {};
  const role = f.role?.stringValue || 'user';

  if (requiredRoles && !requiredRoles.includes(role))
    return { ok: false, err: 'Access denied' };

  return {
    ok: true,
    uid,
    role,
    displayName: f.displayName?.stringValue || '',
    email:       f.email?.stringValue       || p.email || '',
    gender:      f.gender?.stringValue      || 'male',
    createdAt:   f.createdAt?.stringValue   || null,
  };
}

/**
 * Read a Firestore document via REST.
 * @param {string} path  – e.g. 'badgeApplications/uid123'
 * @param {string} token – Firebase ID token
 */
export async function getDoc(path, token) {
  const res = await fetch(`${FS_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore GET ${path} → ${res.status}`);
  const data = await res.json();
  return firestoreDocToObject(data);
}

/**
 * Write (set) a Firestore document via REST PATCH (merge=true).
 */
export async function setDoc(path, fields, token) {
  const body = { fields: objectToFirestoreFields(fields) };
  const qs   = new URLSearchParams({ 'currentDocument.exists': 'false' });
  // Try create; if exists, update
  let res = await fetch(`${FS_BASE}/${path}?${qs}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  // If already exists, fall back to PATCH
  if (res.status === 409 || res.status === 400) {
    res = await fetch(`${FS_BASE}/${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore SET ${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── Firestore value converters ───────────────────────────────────────────────
export function objectToFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    } else if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    } else if (v instanceof Date) {
      fields[k] = { timestampValue: v.toISOString() };
    } else if (v?.__serverTimestamp) {
      fields[k] = { timestampValue: new Date().toISOString() };
    } else if (Array.isArray(v)) {
      fields[k] = { arrayValue: { values: v.map(item => objectToFirestoreValue(item)) } };
    } else if (typeof v === 'object') {
      fields[k] = { mapValue: { fields: objectToFirestoreFields(v) } };
    }
  }
  return fields;
}

function objectToFirestoreValue(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(objectToFirestoreValue) } };
  if (typeof v === 'object') return { mapValue: { fields: objectToFirestoreFields(v) } };
  return { nullValue: null };
}

export function firestoreDocToObject(doc) {
  if (!doc?.fields) return null;
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    obj[k] = firestoreValueToJs(v);
  }
  // attach doc id
  if (doc.name) obj._id = doc.name.split('/').pop();
  return obj;
}

function firestoreValueToJs(v) {
  if ('nullValue'      in v) return null;
  if ('booleanValue'   in v) return v.booleanValue;
  if ('integerValue'   in v) return Number(v.integerValue);
  if ('doubleValue'    in v) return v.doubleValue;
  if ('stringValue'    in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue'     in v) return (v.arrayValue.values || []).map(firestoreValueToJs);
  if ('mapValue'       in v) {
    const m = {};
    for (const [k2, v2] of Object.entries(v.mapValue.fields || {})) m[k2] = firestoreValueToJs(v2);
    return m;
  }
  return null;
}
