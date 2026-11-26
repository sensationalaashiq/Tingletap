// src/services/privacyService.js
// Centralized privacy, blocking, message request, and discovery enforcement.

export const normalizePrivacyLevel = (val, fallback = 'all') => {
  const v = String(val || '').toLowerCase().trim();
  if (v === 'all' || v === 'everyone') return 'all';
  if (v === 'friends' || v === 'connections') return 'friends';
  if (v === 'requests') return 'requests';
  if (v === 'none' || v === 'nobody') return 'none';
  return fallback;
};

export const isGuestProfile = (user) => {
  if (!user) return false;
  return user.isGuest === true || String(user.isGuest) === 'true' || String(user.role || '').toLowerCase() === 'guest';
};

export const isBidirectionallyBlocked = (userA, userB, blockedUsers = [], usersWhoBlockedMe = []) => {
  const uidA = userA?.uid || userA;
  const uidB = userB?.uid || userB;
  if (!uidA || !uidB || uidA === uidB) return false;

  if (Array.isArray(blockedUsers) && blockedUsers.includes(uidB)) return true;
  if (Array.isArray(usersWhoBlockedMe) && usersWhoBlockedMe.includes(uidB)) return true;

  if (typeof userA === 'object' && userA) {
    if (Array.isArray(userA.blockedUsers) && userA.blockedUsers.includes(uidB)) return true;
    if (Array.isArray(userA.blockedBy) && userA.blockedBy.includes(uidB)) return true;
  }
  if (typeof userB === 'object' && userB) {
    if (Array.isArray(userB.blockedUsers) && userB.blockedUsers.includes(uidA)) return true;
    if (Array.isArray(userB.blockedBy) && userB.blockedBy.includes(uidA)) return true;
  }
  return false;
};

export const areUsersFriends = (userA, userB) => {
  const uidA = userA?.uid || userA;
  const uidB = userB?.uid || userB;
  if (!uidA || !uidB || uidA === uidB) return false;

  const listA = Array.isArray(userA?.friends) ? userA.friends : [];
  const listB = Array.isArray(userB?.friends) ? userB.friends : [];
  return listA.includes(uidB) || listB.includes(uidA);
};

export const computeMutualFriendsCount = (userA, userB) => {
  const listA = Array.isArray(userA?.friends) ? userA.friends : [];
  const listB = Array.isArray(userB?.friends) ? userB.friends : [];
  if (!listA.length || !listB.length) return 0;
  const setA = new Set(listA.filter(Boolean));
  let count = 0;
  listB.forEach((uid) => {
    if (uid && uid !== userA?.uid && uid !== userB?.uid && setA.has(uid)) {
      count += 1;
    }
  });
  return count;
};

/**
 * Evaluates whether `senderProfile` can send a direct message or must route through Message Requests.
 * Returns:
 *  - { mode: 'direct', allowed: true }
 *  - { mode: 'request', allowed: true }
 *  - { mode: 'blocked', allowed: false, reason: string }
 *  - { mode: 'guest_restricted', allowed: false, reason: string }
 *  - { mode: 'closed', allowed: false, reason: string }
 */
export const evaluatePrivateMessageAccess = (
  senderProfile,
  recipientProfile,
  existingRequest = null,
  { blockedUsers = [], usersWhoBlockedMe = [] } = {}
) => {
  if (!senderProfile?.uid || !recipientProfile?.uid) {
    return { mode: 'closed', allowed: false, reason: 'User unavailable' };
  }

  const senderGuest = isGuestProfile(senderProfile);
  const targetGuest = isGuestProfile(recipientProfile);

  if (senderGuest && !targetGuest) {
    return { mode: 'guest_restricted', allowed: false, reason: 'Guest accounts can only message other guests' };
  }

  if (isBidirectionallyBlocked(senderProfile, recipientProfile, blockedUsers, usersWhoBlockedMe)) {
    return { mode: 'blocked', allowed: false, reason: 'You cannot message this user' };
  }

  if (targetGuest) {
    const guestAllows = recipientProfile?.settings?.allowPrivateMessages !== false;
    return guestAllows
      ? { mode: 'direct', allowed: true }
      : { mode: 'closed', allowed: false, reason: `${recipientProfile.displayName || 'This user'} has turned off private messages` };
  }

  const level = normalizePrivacyLevel(recipientProfile?.settings?.allowPrivateMessagesLevel, 'all');

  if (level === 'none') {
    return { mode: 'closed', allowed: false, reason: `${recipientProfile.displayName || 'This user'} is not accepting private messages` };
  }

  if (areUsersFriends(senderProfile, recipientProfile) || existingRequest?.status === 'accepted') {
    return { mode: 'direct', allowed: true };
  }

  if (level === 'friends' || level === 'requests') {
    return { mode: 'request', allowed: true };
  }

  return { mode: 'direct', allowed: true };
};

export const canAddToGroupDm = (actorProfile, targetProfile, ctx = {}) => {
  if (!actorProfile?.uid || !targetProfile?.uid) return { allowed: false, reason: 'User unavailable' };
  if (actorProfile.uid === targetProfile.uid) return { allowed: true };
  if (isGuestProfile(targetProfile)) {
    return { allowed: false, reason: 'Guest accounts cannot be added to Group DMs' };
  }
  if (isBidirectionallyBlocked(actorProfile, targetProfile, ctx.blockedUsers, ctx.usersWhoBlockedMe)) {
    return { allowed: false, reason: 'Cannot add this user due to privacy settings' };
  }

  const level = normalizePrivacyLevel(targetProfile?.settings?.whoCanGroupDm, 'all');
  if (level === 'none') {
    return { allowed: false, reason: 'User does not allow Group DM invites' };
  }
  if (level === 'friends' && !areUsersFriends(actorProfile, targetProfile)) {
    return { allowed: false, reason: 'Only friends can add this user to Group DMs' };
  }
  return { allowed: true };
};

export const resolveEffectiveOnlineLevel = (profile, rtdbStatusEntry) => {
  const explicit = profile?.settings?.onlineStatusLevel;
  if (explicit) return normalizePrivacyLevel(explicit, 'all');
  if (profile?.settings?.showOnlineStatus === false || rtdbStatusEntry?.showOnlineStatus === false) {
    return 'none';
  }
  return 'all';
};

export const resolveEffectiveLastSeenLevel = (profile, rtdbStatusEntry) => {
  const explicit = profile?.settings?.lastSeenLevel;
  if (explicit) return normalizePrivacyLevel(explicit, 'friends');
  if (rtdbStatusEntry?.lastSeenLevel) return normalizePrivacyLevel(rtdbStatusEntry.lastSeenLevel, 'friends');
  if (profile?.settings?.showLastSeen === true || rtdbStatusEntry?.showLastSeen === true) return 'all';
  if (profile?.settings?.showLastSeen === false || rtdbStatusEntry?.showLastSeen === false) return 'none';
  return 'none';
};

export const canSeeOnlineStatus = (viewerProfile, targetProfile, rtdbStatusEntry, ctx = {}) => {
  if (!targetProfile?.uid) return false;
  if (viewerProfile?.uid === targetProfile.uid) return true;
  if (isBidirectionallyBlocked(viewerProfile, targetProfile, ctx.blockedUsers, ctx.usersWhoBlockedMe)) return false;

  const level = resolveEffectiveOnlineLevel(targetProfile, rtdbStatusEntry);
  if (level === 'none') return false;
  if (level === 'friends') return areUsersFriends(viewerProfile, targetProfile);
  return true;
};

export const canSeeLastSeen = (viewerProfile, targetProfile, rtdbStatusEntry, ctx = {}) => {
  if (!targetProfile?.uid) return false;
  if (viewerProfile?.uid === targetProfile.uid) return true;
  if (isBidirectionallyBlocked(viewerProfile, targetProfile, ctx.blockedUsers, ctx.usersWhoBlockedMe)) return false;

  const level = resolveEffectiveLastSeenLevel(targetProfile, rtdbStatusEntry);
  if (level === 'none') return false;
  if (level === 'friends') return areUsersFriends(viewerProfile, targetProfile);
  return true;
};

export const isDiscoverableInSearch = (viewerProfile, targetProfile, ctx = {}) => {
  if (!targetProfile?.uid) return false;
  if (targetProfile.isBanned) return false;
  if (viewerProfile?.uid === targetProfile.uid) return false;
  if (isBidirectionallyBlocked(viewerProfile, targetProfile, ctx.blockedUsers, ctx.usersWhoBlockedMe)) return false;
  return targetProfile?.settings?.showInSearch !== false;
};

export const shouldSendReadReceipts = (myProfile, partnerProfile) => {
  const mySetting = myProfile?.settings?.readReceipts !== false;
  const partnerSetting = partnerProfile ? partnerProfile?.settings?.readReceipts !== false : true;
  return mySetting && partnerSetting;
};

export const shouldShowTypingIndicator = (myProfile, targetProfile) => {
  const mySetting = myProfile?.settings?.typingIndicator !== false;
  const targetSetting = targetProfile ? targetProfile?.settings?.typingIndicator !== false : true;
  return mySetting && targetSetting;
};
