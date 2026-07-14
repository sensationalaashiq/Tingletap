// src/utils/syncPublicProfile.js
// B1: Write-through mirror of the safe public subset of a user's profile.
//
// The `users/{uid}` collection contains private fields (email, lastIP, device IDs,
// fcmToken, etc.) that must never be readable by other users. This utility mirrors
// only the display-safe subset to `publicProfiles/{uid}`, which carries a permissive
// Firestore read rule (any authenticated user may read).
//
// Call syncPublicProfile fire-and-forget after every users/{uid} write.

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Top-level fields from users/{uid} that are safe to expose publicly.
// NEVER include: email, lastIP, lastIPUpdate, lastDeviceId, lastDeviceInfo,
// lastUserAgent, fcmToken, pushToken, autoModHistory, trustData, blockedUsers,
// friends, fontPreferences, messageFontPreferences, usernameFontPreferences,
// notificationPreferences, banReason, bannedBy, bannedAt, mutedInfo, autoModStats.
const PUBLIC_FIELDS = [
  'uid', 'displayName', 'username', 'photoURL', 'avatar', 'role', 'badge', 'badges',
  'gender', 'bio', 'profession', 'age', 'country', 'relationship', 'achievements',
  'isOnline', 'lastSeenAt', 'createdAt', 'isGuest', 'isBanned', 'trustScore', 'trustRank',
  'isVerified', 'selectedTheme', 'status', 'statusMessage', 'statusColor', 'statusStyle',
  'statusStyles', 'darkMode',
];

// Sub-fields from settings that other users legitimately need (for PM / whisper permission checks).
const PUBLIC_SETTINGS_FIELDS = [
  'allowPrivateMessagesLevel', 'allowFriendRequests', 'allowWhisperMessages',
];

/**
 * Build the public-safe profile object from a full user data object.
 * @param {object} userData  Full or partial users/{uid} document data.
 * @returns {object|null}
 */
export function buildPublicProfile(userData) {
  if (!userData || typeof userData !== 'object') return null;
  const pub = {};
  PUBLIC_FIELDS.forEach(f => {
    if (userData[f] !== undefined) pub[f] = userData[f];
  });
  // Include only the PM/whisper-relevant subset of settings.
  if (userData.settings && typeof userData.settings === 'object') {
    const pubSettings = {};
    PUBLIC_SETTINGS_FIELDS.forEach(f => {
      if (userData.settings[f] !== undefined) pubSettings[f] = userData.settings[f];
    });
    if (Object.keys(pubSettings).length) pub.settings = pubSettings;
  }
  pub._syncedAt = new Date().toISOString();
  return pub;
}

/**
 * Mirror the public-safe subset of `userData` to `publicProfiles/{uid}`.
 * Always resolves — errors are logged but never thrown.
 * @param {string} uid
 * @param {object} userData  Full or partial users/{uid} document data.
 */
export async function syncPublicProfile(uid, userData) {
  if (!uid || !userData) return;
  try {
    const pub = buildPublicProfile(userData);
    if (!pub) return;
    await setDoc(doc(db, 'publicProfiles', uid), pub, { merge: true });
  } catch (err) {
    console.error('[syncPublicProfile] Failed to sync:', err?.message ?? err);
  }
}
