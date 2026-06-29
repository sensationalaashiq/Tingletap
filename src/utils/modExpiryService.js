/**
 * modExpiryService.js
 * Auto-expires timed Mute / Ban / Kick when the timer runs out.
 * Works purely client-side: any logged-in client (including the
 * affected user) that sees the expired record will clean it up.
 */
import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

/* ─── Duration parser ────────────────────────────────────────
   Accepts:
   • "permanent" / null / undefined  → Infinity (never expires)
   • number (ms)                     → that many ms
   • "1h", "24h", "3d", "30m", "5m", "72h", "7d" … → ms
   • custom strings like "2 hours", "3 days"
──────────────────────────────────────────────────────────── */
export const parseDurationMs = (value) => {
  if (!value || value === 'permanent') return Infinity;
  if (typeof value === 'number') return value > 0 ? value : Infinity;
  const s = value.toString().toLowerCase().trim();
  if (s === 'permanent' || s === 'never' || s === '0') return Infinity;
  const n = parseFloat(s);
  if (!n || isNaN(n)) return Infinity;
  if (s.includes('d'))                           return n * 86_400_000;
  if (s.includes('h'))                           return n * 3_600_000;
  if (s.includes('m') && !s.includes('mo'))      return n * 60_000;
  if (s.includes('s') && !s.includes('sec') === false) return n * 1_000;
  return n * 60_000; // bare number → minutes
};

/* ─── Helper: normalise Firestore/ISO timestamp to epoch ms ── */
const toMs = (raw) => {
  if (!raw) return null;
  if (raw?.toDate) return raw.toDate().getTime();
  if (raw?.seconds) return raw.seconds * 1_000;
  if (typeof raw === 'string') { const d = new Date(raw); return isNaN(d) ? null : d.getTime(); }
  if (typeof raw === 'number') return raw;
  return null;
};

/* ─── 1. Auto-unmute ─────────────────────────────────────── */
export const autoCheckUnmute = async (uid, mutedInfo) => {
  if (!uid || !mutedInfo?.isMuted) return false;

  let endTime = null;
  if (mutedInfo.muteUntil) {
    endTime = toMs(mutedInfo.muteUntil);
  } else {
    const mutedAt = toMs(mutedInfo.mutedAt);
    const dur = parseDurationMs(mutedInfo.duration);
    if (mutedAt && dur !== Infinity) endTime = mutedAt + dur;
  }

  if (!endTime || isNaN(endTime)) return false;
  if (Date.now() < endTime) return false; // not yet

  try {
    await updateDoc(doc(db, 'users', uid), {
      'mutedInfo.isMuted'   : false,
      'mutedInfo.muteUntil' : null,
      'mutedInfo.reason'    : '',
      'mutedInfo.unmutedAt' : serverTimestamp(),
      'mutedInfo.unmutedBy' : 'System (timer expired)',
    });
    return true;
  } catch { return false; }
};

/* ─── 2. Auto-unban ──────────────────────────────────────── */
export const autoCheckUnban = async (uid, userProfile) => {
  if (!uid || !userProfile?.isBanned) return false;

  const dur = parseDurationMs(userProfile.banDuration);
  if (dur === Infinity) return false; // permanent – never auto-lifts

  const bannedAt = toMs(userProfile.bannedAt);
  if (!bannedAt) return false;
  if (Date.now() < bannedAt + dur) return false; // not yet

  try {
    await updateDoc(doc(db, 'users', uid), {
      isBanned   : false,
      banReason  : null,
      bannedAt   : null,
      banDuration: null,
      banInfo    : null,
      unbannedAt : serverTimestamp(),
      unbannedBy : 'System (timer expired)',
    });
    return true;
  } catch { return false; }
};

/* ─── 3. Auto-unkick (single room) ───────────────────────── */
export const autoCheckUnkick = async (uid, roomId) => {
  if (!uid || !roomId) return false;
  try {
    const kickedRef = doc(db, 'rooms', roomId, 'kickedUsers', uid);
    const snap = await getDoc(kickedRef);
    if (!snap.exists()) return false;

    const kd = snap.data();
    const dur = parseDurationMs(kd.duration);
    if (dur === Infinity) return false; // permanent kick

    const kickedAt = toMs(kd.kickedAt);
    if (!kickedAt) return false;
    if (Date.now() < kickedAt + dur) return false; // still running

    /* Expired → clean both places */
    await deleteDoc(kickedRef);
    await updateDoc(doc(db, 'users', uid), { kickedFrom: null }).catch(() => {});
    return true;
  } catch { return false; }
};

/* ─── 4. Full check (call this on a timer) ───────────────── */
export const runFullExpiryCheck = async (uid, userProfile, currentRoomId) => {
  if (!uid || !userProfile) return;
  await Promise.allSettled([
    autoCheckUnmute(uid, userProfile.mutedInfo),
    autoCheckUnban (uid, userProfile),
    autoCheckUnkick(uid, currentRoomId),
  ]);
};

/* ─── 5. Instant kick-expiry check (no Firestore read) ───── */
export const isKickExpired = (kickData) => {
  if (!kickData) return true;
  const dur = parseDurationMs(kickData.duration);
  if (dur === Infinity) return false;
  const t = toMs(kickData.kickedAt ?? kickData.time);
  if (!t) return false;
  return Date.now() >= t + dur;
};
