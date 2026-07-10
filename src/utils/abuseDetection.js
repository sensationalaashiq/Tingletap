import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, deleteDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { updateTrustScore } from './trustSystem';
import { detectModerationContent } from './tinglebotAutoMod';

// v5.0 — This module is a thin pre-send wrapper around the shared TingleBot
// rule-based moderation engine (tinglebotAutoMod.js). It no longer maintains
// its own dictionaries. detectModerationContent() only ever flags the fixed
// set of "immediate action" safety categories (minors/grooming, non-consensual
// content, threats, doxxing, hate/terrorism, scams/phishing) — ordinary
// profanity, slang, flirting, and adult conversation are never flagged here,
// in any room, by design. Both entry points (pre-send here, post-send in
// tinglebotAutoMod.js) share this single source of truth.

const offenseHistory = new Map();

const OFFENSE_CONFIG = {
  // Raised thresholds — pre-send wrapper should only act on genuine repeat
  // safety violations, not catch normal users on the first or second hit.
  WARNING_THRESHOLD: 2,   // was 1
  MUTE_THRESHOLD: 3,      // was 2
  MUTE_DURATIONS: [
    5 * 60 * 1000,
    15 * 60 * 1000,
    60 * 60 * 1000,
    24 * 60 * 60 * 1000,
  ],
  // NOTE: there is intentionally NO ban threshold/action here. Kick is the
  // maximum automatic action this module can take, matching the AutoMod
  // engine's policy of Warning → Mute → Kick only (never an automatic ban).
  KICK_THRESHOLD: 7,      // was 5
  OFFENSE_COOLDOWN_MS: 7 * 24 * 60 * 60 * 1000,
};

// detectAbuse(messageText, role, opts)
// Owners are never automatically moderated — if the sender's role is 'owner'
// this always returns not-abusive, regardless of message content.
// opts.roomName is passed straight through to detectModerationContent() so
// the one room-based exception that still exists — family-abuse words being
// allowed in the Adult Room only — is applied consistently with the post-send
// engine in tinglebotAutoMod.js. (opts.isAdultRoom, if passed by an older
// caller, is ignored — roomName is now the single source of truth.)
export const detectAbuse = (messageText, role, opts = {}) => {
  if (!messageText || typeof messageText !== 'string') {
    return { isAbusive: false };
  }
  if ((role || '').toLowerCase() === 'owner') {
    return { isAbusive: false };
  }

  const hit = detectModerationContent(messageText, opts.roomName);
  if (!hit.detected) {
    return { isAbusive: false };
  }

  return {
    isAbusive: true,
    severity: hit.severity,
    type: hit.type,
    category: hit.label,
    matched: hit.matched,
  };
};

const getUserOffenseCount = (uid) => {
  const data = offenseHistory.get(uid);
  if (!data) return 0;
  const now = Date.now();
  const recentOffenses = data.filter(o => now - o.time < OFFENSE_CONFIG.OFFENSE_COOLDOWN_MS);
  offenseHistory.set(uid, recentOffenses);
  return recentOffenses.length;
};

const addUserOffense = (uid, offenseData) => {
  if (!offenseHistory.has(uid)) offenseHistory.set(uid, []);
  offenseHistory.get(uid).push({ ...offenseData, time: Date.now() });
};

const applyMute = async (uid, durationMs, reason) => {
  const until = new Date(Date.now() + durationMs).toISOString();
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      'mutedInfo.isMuted': true,
      'mutedInfo.mutedBy': 'AutoMod',
      'mutedInfo.muteReason': reason,
      'mutedInfo.muteTime': new Date().toISOString(),
      'mutedInfo.muteUntil': until
    });
    updateTrustScore(uid, 'MUTE_RECEIVED');
  } catch (err) {
    console.error('[AbuseDetection] Mute error:', err);
  }
  return until;
};

// applyKick — replaces the old applyBan(). Kicks the user from the room the
// violating message was sent in (never bans them account-wide). Uses the same
// rooms/{roomId}/kickedUsers + users/{uid}.kickedFrom schema as the main
// TingleBot AutoMod engine (tinglebotAutoMod.js kickUser) for consistency.
const applyKick = async (uid, roomId, displayName, reason) => {
  if (!roomId) return;
  try {
    await setDoc(doc(db, 'rooms', roomId, 'kickedUsers', uid), {
      uid, displayName: displayName || 'User', reason, kickedBy: 'AutoMod', kickedAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, 'users', uid), {
      kickedFrom: { roomId, reason, time: Date.now(), kickedBy: 'AutoMod' },
    });
    updateTrustScore(uid, 'KICK_RECEIVED');
  } catch (err) {
    console.error('[AbuseDetection] Kick error:', err);
  }
};

const logAbuseViolation = async (uid, messageText, detection, action) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      abuseHistory: arrayUnion({
        message: messageText?.slice(0, 200),
        type: detection.type,
        severity: detection.severity,
        action,
        timestamp: new Date().toISOString()
      })
    });
    updateTrustScore(uid, 'ABUSE_VIOLATION');
  } catch (err) {
    console.error('[AbuseDetection] Log error:', err);
  }
};

// handleAbuseViolation(uid, messageText, messageDocRef, detection, opts)
// opts: { role, displayName } — owners are always skipped (defense in depth;
// detectAbuse() should already have prevented this from being called for them).
export const handleAbuseViolation = async (uid, messageText, messageDocRef, detection, opts = {}) => {
  if (!uid) return { action: 'none' };
  if ((opts.role || '').toLowerCase() === 'owner') return { action: 'none' };

  const offenseCount = getUserOffenseCount(uid);
  addUserOffense(uid, { type: detection.type, severity: detection.severity });

  let action = 'none';
  let userMessage = '';
  let muteUntil = null;

  if (messageDocRef) {
    try {
      await deleteDoc(messageDocRef);
    } catch (err) {
      console.error('[AbuseDetection] Error deleting message:', err);
    }
  }

  const roomId = messageDocRef?.parent?.parent?.id || null;

  if (detection.severity === 'severe' || offenseCount >= OFFENSE_CONFIG.KICK_THRESHOLD) {
    await applyKick(uid, roomId, opts.displayName, `Automatic kick: ${detection.category || 'severe violation'} (${offenseCount + 1} offenses)`);
    await logAbuseViolation(uid, messageText, detection, 'auto_kick');
    action = 'auto_kick';
    userMessage = '🚫 You have been automatically kicked from this room for a serious violation.';
  } else if (offenseCount >= OFFENSE_CONFIG.MUTE_THRESHOLD) {
    const muteIndex = Math.min(
      offenseCount - OFFENSE_CONFIG.MUTE_THRESHOLD,
      OFFENSE_CONFIG.MUTE_DURATIONS.length - 1
    );
    const muteDuration = OFFENSE_CONFIG.MUTE_DURATIONS[muteIndex];
    muteUntil = await applyMute(uid, muteDuration, `AutoMod: ${detection.category || 'abusive language'} (offense #${offenseCount + 1})`);
    await logAbuseViolation(uid, messageText, detection, 'auto_mute');
    action = 'auto_mute';
    const mins = Math.ceil(muteDuration / 60000);
    userMessage = `⚠️ Your message was removed and you have been muted for ${mins >= 60 ? Math.ceil(mins / 60) + ' hour(s)' : mins + ' minute(s)'} for violating community guidelines.`;
  } else {
    await logAbuseViolation(uid, messageText, detection, 'warning');
    action = 'warning';
    userMessage = '⚠️ Warning: Your message was removed for violating community guidelines. Further violations will result in a mute.';
  }

  return { action, userMessage, muteUntil };
};

export const checkUserBanStatus = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return { isBanned: false };
    const data = snap.data();
    return { isBanned: data.isBanned || false, banReason: data.banReason };
  } catch (err) {
    return { isBanned: false };
  }
};
