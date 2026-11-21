// src/utils/userProfileCache.js
// FIX 20: Shared in-memory cache for user profile documents.
// Many components independently call getDoc(doc(db, 'users', uid)) for the
// same uids (leaderboard, follow lists, admin panel, wallet, etc). This
// utility lets them share results within a short TTL window to cut down on
// redundant Firestore reads, without changing what data is ultimately shown
// (callers still get a fresh read once the TTL expires).

import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { isStaffRole, isRjRole, resolveBadgeKey } from './roleUtils';

const DEFAULT_TTL_MS = 60 * 1000; // 1 minute

const cache = new Map(); // uid -> { data, ts }
const inFlight = new Map(); // uid -> Promise

/**
 * Fetch a user profile document, using a short-lived in-memory cache shared
 * across the app. Falls back to a direct Firestore read on cache miss/expiry.
 * @param {string} uid
 * @param {{ ttlMs?: number, force?: boolean }} [options]
 * @returns {Promise<object|null>} profile data or null if the doc doesn't exist
 */
export async function getCachedUserProfile(uid, options = {}) {
  if (!uid) return null;
  const { ttlMs = DEFAULT_TTL_MS, force = false } = options;

  if (!force) {
    const entry = cache.get(uid);
    if (entry && (Date.now() - entry.ts) < ttlMs) {
      return entry.data;
    }
  }

  if (inFlight.has(uid)) {
    return inFlight.get(uid);
  }

  // B1: Read from publicProfiles (readable by all authenticated users) instead
  // of users/{uid} (now restricted to the owner and staff). publicProfiles
  // contains all display-safe fields (displayName, photoURL, role, badges, etc.)
  // synced by syncPublicProfile after every users/{uid} write.
  const promise = getDoc(doc(db, 'publicProfiles', uid))
    .then(async (snap) => {
      let data = snap.exists() ? snap.data() : null;
      const needsAuthoritative =
        !data ||
        (!isStaffRole(data.role) && !isRjRole(data.role, data.badge) && !resolveBadgeKey(data.badge));
      if (needsAuthoritative && auth.currentUser) {
        try {
          const uSnap = await getDoc(doc(db, 'users', uid));
          if (uSnap.exists()) {
            const uData = uSnap.data();
            const mergedRole = isStaffRole(uData.role)
              ? uData.role
              : (isStaffRole(data?.role) ? data.role : (uData.role || data?.role));
            const mergedBadge = resolveBadgeKey(uData.badge)
              ? uData.badge
              : (uData.badge !== undefined && uData.badge !== null ? uData.badge : data?.badge);
            data = { ...(data || {}), ...uData, role: mergedRole, badge: mergedBadge, uid };
          }
        } catch (_) {}
      }
      cache.set(uid, { data, ts: Date.now() });
      inFlight.delete(uid);
      return data;
    })
    .catch(err => {
      inFlight.delete(uid);
      throw err;
    });

  inFlight.set(uid, promise);
  return promise;
}

/** Manually seed/refresh the cache (e.g. after a known local update). */
export function setCachedUserProfile(uid, data) {
  if (!uid) return;
  cache.set(uid, { data, ts: Date.now() });
}

/** Drop a single cached entry, forcing the next lookup to refetch. */
export function invalidateCachedUserProfile(uid) {
  cache.delete(uid);
}

/** Clear the entire cache (e.g. on logout). */
export function clearUserProfileCache() {
  cache.clear();
  inFlight.clear();
}
