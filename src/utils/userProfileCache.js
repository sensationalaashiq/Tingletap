// src/utils/userProfileCache.js
// FIX 20: Shared in-memory cache for user profile documents.
// Many components independently call getDoc(doc(db, 'users', uid)) for the
// same uids (leaderboard, follow lists, admin panel, wallet, etc). This
// utility lets them share results within a short TTL window to cut down on
// redundant Firestore reads, without changing what data is ultimately shown
// (callers still get a fresh read once the TTL expires).

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

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

  const promise = getDoc(doc(db, 'users', uid))
    .then(snap => {
      const data = snap.exists() ? snap.data() : null;
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
