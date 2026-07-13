// netlify/functions/moderationAction.js
// Owner/Admin/Moderator only: ban, unban, mute, unmute, kick, unkick a user.
//
// Why this exists: previously these writes happened directly from the client
// (BanKickMutePanel.jsx) via the Firestore client SDK, guarded only by a
// client-side role check + Firestore Security Rules. That means a rules
// misconfiguration alone would have been enough to let any signed-in user
// perform moderation actions. This function adds an independent, server-side
// role check (verifyToken with requiredRoles) that must pass before any write
// happens — defense in depth on top of (not instead of) the existing rules.
//
// The actual Firestore write still goes through the Firestore REST API using
// the caller's own ID token, so Firestore Security Rules remain the second,
// independent layer of enforcement (staffOnly fields in firestore.rules).

import { verifyToken, getDoc, setDoc, objectToFirestoreFields } from './shared/firestoreAdmin.js';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resp(data, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(data) };
}

const STAFF_ROLES = ['owner', 'admin', 'moderator'];
const ALLOWED_ACTIONS = ['ban', 'unban', 'mute', 'unmute', 'kick', 'unkick'];

// PATCH only the given top-level fields on a document (Firestore updateMask
// prevents accidentally clobbering unrelated fields).
async function patchTopLevelFields(path, fields, token) {
  const fsFields = objectToFirestoreFields(fields);
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
    throw new Error(`PATCH ${path} -> ${res.status}: ${err}`);
  }
  return res.json();
}

async function deleteDocPath(path, token) {
  const res = await fetch(`${FS_BASE}/${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  // 404 is fine — nothing to delete.
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`DELETE ${path} -> ${res.status}: ${err}`);
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return resp({ error: 'Method not allowed' }, 405);

  const token = (event.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return resp({ error: 'Authorization required' }, 401);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return resp({ error: 'Invalid JSON' }, 400); }

  const { targetUid, action } = body;
  if (!targetUid) return resp({ error: 'targetUid required' }, 400);
  if (!ALLOWED_ACTIONS.includes(action)) return resp({ error: `action must be one of ${ALLOWED_ACTIONS.join(', ')}` }, 400);

  // ── Independent server-side role check (the actual fix) ──────────────────
  const staff = await verifyToken(token, STAFF_ROLES);
  if (!staff.ok) return resp({ error: staff.err || 'Access denied' }, 403);

  // Staff can never moderate another staff member's account through this path.
  const target = await getDoc(`users/${targetUid}`, token).catch(() => null);
  if (!target) return resp({ error: 'Target user not found' }, 404);
  const targetRole = target.role === 'superowner' ? 'owner' : target.role;
  if (STAFF_ROLES.includes(targetRole) && staff.role !== 'owner') {
    return resp({ error: 'Only the owner can moderate a staff account' }, 403);
  }

  const now = new Date().toISOString();
  const staffName = staff.displayName || staff.uid;

  // B5: Strip HTML tags and cap text fields to prevent stored XSS and oversized payloads.
  const sanitizeText = (s, max = 500) => String(s || '').replace(/<[^>]*>/g, '').trim().slice(0, max);

  try {
    switch (action) {
      case 'ban': {
        const { reason: _reason = '', duration = null, expiresAt = null, adminNotes: _adminNotes = '', appealAllowed = false } = body;
        const reason = sanitizeText(_reason);
        const adminNotes = sanitizeText(_adminNotes);
        const banInfo = {
          reason, bannedBy: staffName, bannedAt: now,
          banUntil: expiresAt || null, duration, adminNotes,
          appealAllowed: !!appealAllowed,
        };
        await patchTopLevelFields(`users/${targetUid}`, { isBanned: true, banInfo }, token);
        return resp({ ok: true, banInfo });
      }

      case 'unban': {
        await patchTopLevelFields(`users/${targetUid}`, { isBanned: false, banInfo: null }, token);
        return resp({ ok: true });
      }

      case 'mute': {
        const { reason: _muteReason = '', duration = null, expiresAt = null } = body;
        const reason = sanitizeText(_muteReason);
        const mutedInfo = {
          isMuted: true, mutedAt: now, mutedBy: staffName,
          reason, duration, muteUntil: expiresAt || null,
        };
        await patchTopLevelFields(`users/${targetUid}`, { mutedInfo }, token);
        return resp({ ok: true, mutedInfo });
      }

      case 'unmute': {
        const mutedInfo = { isMuted: false, mutedAt: null, mutedBy: null, reason: null, muteUntil: null };
        await patchTopLevelFields(`users/${targetUid}`, { mutedInfo }, token);
        return resp({ ok: true, mutedInfo });
      }

      case 'kick': {
        const { reason: _kickReason = 'Kicked by admin', duration = null, expiresAt = null, roomId = null, roomName = null } = body;
        const reason = sanitizeText(_kickReason);
        if (roomId) {
          await setDoc(`rooms/${roomId}/kickedUsers/${targetUid}`, {
            uid: targetUid,
            displayName: target.displayName || '',
            reason, kickedBy: staffName, kickedAt: now,
            duration, kickDuration: duration,
            kickUntil: expiresAt || null,
            roomId, roomName: roomName || roomId,
          }, token);
        }
        const kickedFrom = roomId ? { roomId, kickedAt: now, kickedBy: staffName, reason } : null;
        await patchTopLevelFields(`users/${targetUid}`, { kickedFrom }, token);
        return resp({ ok: true, kickedFrom });
      }

      case 'unkick': {
        const { roomId = null } = body;
        if (roomId) {
          await deleteDocPath(`rooms/${roomId}/kickedUsers/${targetUid}`, token);
        }
        await patchTopLevelFields(`users/${targetUid}`, { kickedFrom: null }, token);
        return resp({ ok: true });
      }

      default:
        return resp({ error: 'Unhandled action' }, 400);
    }
  } catch (e) {
    console.error('[moderationAction] error:', e.message);
    return resp({ error: 'Action failed' }, 500);
  }
};
