// src/utils/syncPublicProfile.js
// B1: Write-through mirror of the safe public subset of a user's profile.
//
// The `users/{uid}` collection contains private fields (email, lastIP, device IDs,
// fcmToken, etc.) that must never be readable by other users. This utility mirrors
// only the display-safe subset to `publicProfiles/{uid}`, which carries a permissive
// Firestore read rule (any authenticated user may read).
//
// Call syncPublicProfile fire-and-forget after every users/{uid} write.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  isRealAvatarUpload,
  isStaffRole,
  resolveBadgeKey,
  resolveEarliestCreatedAt,
} from './roleUtils';

// Top-level fields from users/{uid} that are safe to expose publicly.
// NEVER include: email, lastIP, lastIPUpdate, lastDeviceId, lastDeviceInfo,
// lastUserAgent, fcmToken, pushToken, autoModHistory, trustData, blockedUsers,
// fontPreferences, messageFontPreferences, usernameFontPreferences.
// friends array is intentionally mirrored to publicProfiles so any viewer
// can see accurate friend counts & lists on profile modals without reading private users/{uid}.
const PUBLIC_FIELDS = [
  'uid', 'displayName', 'username', 'photoURL', 'avatar', 'role', 'badge', 'badges',
  'gender', 'bio', 'profession', 'age', 'country', 'relationship', 'achievements',
  'friends', 'isOnline', 'lastSeenAt', 'createdAt', 'isGuest', 'isBanned', 'trustScore', 'trustRank',
  'isVerified', 'selectedTheme', 'status', 'statusMessage', 'statusColor', 'statusStyle',
  'statusStyles', 'darkMode', 'coverPhotoURL', 'coverPhotoKey', 'coverVideoURL', 'coverVideoType',
  'spotifyTrackURL', 'spotifyTrackData',
];

// Sub-fields from settings that other users legitimately need (for PM / request / group / invite / visibility checks).
const PUBLIC_SETTINGS_FIELDS = [
  'allowPrivateMessagesLevel', 'allowPrivateMessages', 'allowFriendRequests', 'allowWhisperMessages',
  'whoCanGroupDm', 'whoCanInviteRooms', 'readReceipts', 'typingIndicator',
  'onlineStatusLevel', 'lastSeenLevel', 'showOnlineStatus', 'showLastSeen', 'showInSearch',
];

const DEFAULT_STATUS_STRINGS = new Set([
  '',
  "i'm new here!",
  'hey there! i am using tingletap.',
]);

const isBlankOrDefaultText = (val, extraDefaults = []) => {
  if (val === undefined || val === null) return true;
  const trimmed = String(val).trim();
  if (!trimmed) return true;
  return extraDefaults.includes(trimmed.toLowerCase());
};

const hasAchievementsData = (ach) => {
  if (!ach) return false;
  if (Array.isArray(ach)) return ach.length > 0;
  if (typeof ach === 'object') return Object.keys(ach).length > 0;
  return false;
};

/**
 * Build the public-safe profile object from a full user data object.
 * When `preserveExisting` is true (background syncs), skip empty/default placeholders
 * so a partially-wiped users/{uid} doc cannot clobber real fields in publicProfiles/{uid}.
 * @param {object} userData  Full or partial users/{uid} document data.
 * @param {object} [options]
 * @returns {object|null}
 */
export function buildPublicProfile(userData, { preserveExisting = false } = {}) {
  if (!userData || typeof userData !== 'object') return null;
  const pub = {};
  PUBLIC_FIELDS.forEach(f => {
    const val = userData[f];
    if (val === undefined) return;
    if (preserveExisting) {
      if (f === 'friends' && (!Array.isArray(val) || val.length === 0)) return;
      if (f === 'achievements' && !hasAchievementsData(val)) return;
      if (f === 'badges' && (!Array.isArray(val) || val.length === 0)) return;
      if (f === 'badge' && !val) return;
      if (f === 'photoURL' && !isRealAvatarUpload(val)) return;
      if (f === 'bio' && isBlankOrDefaultText(val)) return;
      if (f === 'profession' && isBlankOrDefaultText(val, ['not set'])) return;
      if (f === 'country' && isBlankOrDefaultText(val, ['unknown'])) return;
      if (f === 'relationship' && isBlankOrDefaultText(val, ['not set', 'single'])) return;
      if ((f === 'coverPhotoURL' || f === 'coverPhotoKey' || f === 'coverVideoURL' || f === 'coverVideoType' || f === 'spotifyTrackURL' || f === 'spotifyTrackData') && !val) return;
      if (f === 'status' && typeof val === 'string' && DEFAULT_STATUS_STRINGS.has(val.trim().toLowerCase())) return;
      if (f === 'statusStyles' && (!val || (typeof val === 'object' && Object.keys(val).length === 0))) return;
      if (f === 'role' && (!val || String(val).toLowerCase() === 'user')) return;
    }
    pub[f] = val;
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
 * @param {object} [options]
 */
export async function syncPublicProfile(uid, userData, options = {}) {
  if (!uid || !userData) return;
  try {
    const pub = buildPublicProfile(userData, options);
    if (!pub) return;
    await setDoc(doc(db, 'publicProfiles', uid), pub, { merge: true });
  } catch (err) {
    console.error('[syncPublicProfile] Failed to sync:', err?.message ?? err);
  }
}

/**
 * Self-heal missing or accidentally overwritten profile fields on `users/{uid}` using
 * `publicProfiles/{uid}`, Auth metadata, and reverse friend lookups (`where('friends', 'array-contains', uid)`).
 * Safe under firestore.rules (never writes restricted staff/moderation fields unless caller is already staff).
 */
export async function recoverUserProfileFromPublic(uid, currentProfile = {}, authUser = null, { docExists = true } = {}) {
  if (!uid) {
    return { healedProfile: currentProfile, patchApplied: false };
  }

  const base = { ...(currentProfile || {}), uid };
  let pubData = {};

  try {
    const pubSnap = await getDoc(doc(db, 'publicProfiles', uid));
    if (pubSnap.exists()) {
      pubData = pubSnap.data() || {};
    }
  } catch (err) {
    console.warn('[recoverUserProfileFromPublic] publicProfiles read skipped:', err?.message ?? err);
  }

  const currentFriends = Array.isArray(base.friends) ? [...new Set(base.friends.filter(Boolean))] : [];
  const pubFriends = Array.isArray(pubData.friends) ? [...new Set(pubData.friends.filter(Boolean))] : [];
  let recoveredFriends = currentFriends.length > 0 ? currentFriends : pubFriends;

  // Fallback: reconstruct mutual friendships from friends' docs (e.g. Bhoomi's friends list)
  if (recoveredFriends.length === 0) {
    const discovered = new Set();
    try {
      const revPubSnap = await getDocs(
        query(collection(db, 'publicProfiles'), where('friends', 'array-contains', uid), limit(100))
      );
      revPubSnap.forEach(d => {
        if (d.id && d.id !== uid) discovered.add(d.id);
      });
    } catch (_) {}

    if (discovered.size === 0) {
      try {
        const revUserSnap = await getDocs(
          query(collection(db, 'users'), where('friends', 'array-contains', uid), limit(100))
        );
        revUserSnap.forEach(d => {
          if (d.id && d.id !== uid) discovered.add(d.id);
        });
      } catch (_) {}
    }

    if (discovered.size > 0) {
      recoveredFriends = Array.from(discovered);
    }
  }

  const firestorePatch = {};
  const merged = { ...base };

  if (currentProfile?.uid !== uid) {
    firestorePatch.uid = uid;
  }

  if (currentFriends.length === 0 && recoveredFriends.length > 0) {
    merged.friends = recoveredFriends;
    firestorePatch.friends = recoveredFriends;
  } else if (!Array.isArray(merged.friends)) {
    merged.friends = recoveredFriends;
  }

  // Earliest createdAt across users/{uid}, publicProfiles/{uid}, and Firebase Auth metadata
  const earliestJoin = resolveEarliestCreatedAt(
    resolveEarliestCreatedAt(base.createdAt, pubData.createdAt),
    authUser?.metadata?.creationTime
  );
  const currentCreated = resolveEarliestCreatedAt(base.createdAt, null);
  if (earliestJoin && (!currentCreated || (currentCreated.getTime() - earliestJoin.getTime()) > 60 * 60 * 1000)) {
    const iso = earliestJoin.toISOString();
    merged.createdAt = iso;
    firestorePatch.createdAt = iso;
  } else if (!merged.createdAt && earliestJoin) {
    const iso = earliestJoin.toISOString();
    merged.createdAt = iso;
    firestorePatch.createdAt = iso;
  }

  // Recover media/cover/Spotify fields
  const mediaKeys = [
    'coverVideoURL', 'coverVideoType', 'coverPhotoURL', 'coverPhotoKey',
    'spotifyTrackURL', 'spotifyTrackData', 'photoKey', 'avatar',
  ];
  mediaKeys.forEach(k => {
    if (!merged[k] && pubData[k]) {
      merged[k] = pubData[k];
      firestorePatch[k] = pubData[k];
    }
  });

  if (!isRealAvatarUpload(merged.photoURL) && isRealAvatarUpload(pubData.photoURL)) {
    merged.photoURL = pubData.photoURL;
    firestorePatch.photoURL = pubData.photoURL;
  }

  // Recover display/identity fields when missing or wiped to defaults
  if (isBlankOrDefaultText(merged.displayName, ['user', 'anonymous'])) {
    const bestName = !isBlankOrDefaultText(pubData.displayName, ['user', 'anonymous'])
      ? pubData.displayName
      : (authUser?.displayName || null);
    if (bestName) {
      merged.displayName = bestName;
      firestorePatch.displayName = bestName;
    }
  }
  if (!merged.username && pubData.username) {
    merged.username = pubData.username;
    firestorePatch.username = pubData.username;
  }
  if (!merged.email && authUser?.email) {
    merged.email = authUser.email;
    firestorePatch.email = authUser.email;
  }
  if (!merged.gender && pubData.gender) {
    merged.gender = pubData.gender;
    firestorePatch.gender = pubData.gender;
  }
  if ((merged.age === undefined || merged.age === null || merged.age === '') && pubData.age) {
    merged.age = pubData.age;
    firestorePatch.age = pubData.age;
  }
  if (isBlankOrDefaultText(merged.bio) && !isBlankOrDefaultText(pubData.bio)) {
    merged.bio = pubData.bio;
    firestorePatch.bio = pubData.bio;
  }
  if (isBlankOrDefaultText(merged.profession, ['not set']) && !isBlankOrDefaultText(pubData.profession, ['not set'])) {
    merged.profession = pubData.profession;
    firestorePatch.profession = pubData.profession;
  }
  if (isBlankOrDefaultText(merged.country, ['unknown']) && !isBlankOrDefaultText(pubData.country, ['unknown'])) {
    merged.country = pubData.country;
    firestorePatch.country = pubData.country;
  }
  if (isBlankOrDefaultText(merged.relationship, ['not set']) && !isBlankOrDefaultText(pubData.relationship, ['not set'])) {
    merged.relationship = pubData.relationship;
    firestorePatch.relationship = pubData.relationship;
  }
  if (!merged.selectedTheme && pubData.selectedTheme) {
    merged.selectedTheme = pubData.selectedTheme;
    firestorePatch.selectedTheme = pubData.selectedTheme;
  }

  // Extra profile arrays if present in publicProfiles
  ['languages', 'interests', 'hobbies', 'badges'].forEach(k => {
    if ((!Array.isArray(merged[k]) || merged[k].length === 0) && Array.isArray(pubData[k]) && pubData[k].length > 0) {
      merged[k] = pubData[k];
      firestorePatch[k] = pubData[k];
    }
  });

  // Recover custom status if users/{uid} still has blank or default status
  const curStatusStr = typeof merged.status === 'string' ? merged.status.trim().toLowerCase() : '';
  const pubStatusStr = typeof pubData.status === 'string' ? pubData.status.trim() : '';
  if (DEFAULT_STATUS_STRINGS.has(curStatusStr) && pubStatusStr && !DEFAULT_STATUS_STRINGS.has(pubStatusStr.toLowerCase())) {
    merged.status = pubData.status;
    firestorePatch.status = pubData.status;
    if (pubData.statusStyles) {
      merged.statusStyles = pubData.statusStyles;
      firestorePatch.statusStyles = pubData.statusStyles;
    }
  }
  ['statusMessage', 'statusColor', 'statusStyle'].forEach(k => {
    if (!merged[k] && pubData[k]) {
      merged[k] = pubData[k];
      firestorePatch[k] = pubData[k];
    }
  });

  if (!hasAchievementsData(merged.achievements) && hasAchievementsData(pubData.achievements)) {
    merged.achievements = pubData.achievements;
    firestorePatch.achievements = pubData.achievements;
  }

  if ((merged.trustScore === undefined || merged.trustScore <= 10) && typeof pubData.trustScore === 'number' && pubData.trustScore > (merged.trustScore || 0)) {
    merged.trustScore = pubData.trustScore;
    firestorePatch.trustScore = pubData.trustScore;
    if (pubData.trustRank) {
      merged.trustRank = pubData.trustRank;
      firestorePatch.trustRank = pubData.trustRank;
    }
  }
  if (!merged.isVerified && pubData.isVerified) {
    merged.isVerified = true;
    firestorePatch.isVerified = true;
  }

  // Badge/role recovery: only write badge/role to users/{uid} if the doc already holds staff privileges
  // (otherwise firestore.rules rejects reserved role/badge self-writes). Still surface in UI if publicProfiles holds it.
  const callerAlreadyStaff = docExists && isStaffRole(base);
  if (!resolveBadgeKey(merged.badge) && resolveBadgeKey(pubData.badge)) {
    merged.badge = pubData.badge;
    if (callerAlreadyStaff) {
      firestorePatch.badge = pubData.badge;
    }
  }
  if (!isStaffRole(merged) && isStaffRole(pubData)) {
    merged.role = pubData.role;
  }

  const patchKeys = Object.keys(firestorePatch);
  if (patchKeys.length > 0) {
    try {
      if (docExists) {
        await updateDoc(doc(db, 'users', uid), firestorePatch);
      } else {
        const safeCreate = {
          ...firestorePatch,
          uid,
          role: 'user',
          isGuest: false,
          displayName: merged.displayName || authUser?.displayName || 'User',
          email: merged.email || authUser?.email || '',
        };
        delete safeCreate.badge;
        await setDoc(doc(db, 'users', uid), safeCreate, { merge: true });
      }
    } catch (err) {
      console.warn('[recoverUserProfileFromPublic] Failed to persist recovered fields:', err?.message ?? err);
    }
  }

  // Keep publicProfiles/{uid} synchronized with newly reconstructed friends/earliest createdAt if missing there
  if (recoveredFriends.length > pubFriends.length || (!pubData.createdAt && merged.createdAt)) {
    const pubBackfill = { uid };
    if (recoveredFriends.length > pubFriends.length) pubBackfill.friends = recoveredFriends;
    if (!pubData.createdAt && merged.createdAt) pubBackfill.createdAt = merged.createdAt;
    syncPublicProfile(uid, pubBackfill, { preserveExisting: true }).catch(() => {});
  }

  return {
    healedProfile: merged,
    patchApplied: patchKeys.length > 0,
  };
}

