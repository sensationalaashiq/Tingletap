// src/utils/liveUsernames.js
// Shared, refcounted real-time username resolver.
//
// Many places in the app render a username that was denormalized (copied)
// into a message/report/log/conversation doc at write time. If a user later
// changes their username (self via WelcomeDashboard, or admin via Admin
// Panel), those old copies go stale. This module keeps a single live
// onSnapshot listener per uid (shared across every consumer) so any
// component can resolve "what is this uid's *current* username" and have it
// update instantly everywhere, without adding a new listener per row.

import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { db } from '../firebase/config';

// uid -> { name, role, photoURL, listeners: Set<fn>, unsub: fn }
const registry = new Map();

function ensureEntry(uid) {
  let entry = registry.get(uid);
  if (entry) return entry;

  entry = { name: undefined, role: undefined, photoURL: undefined, listeners: new Set(), unsub: null };
  registry.set(uid, entry);

  entry.unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
    const data = snap.exists() ? snap.data() : null;
    entry.name = data?.displayName || null;
    entry.role = data?.role || null;
    entry.photoURL = data?.photoURL || null;
    entry.listeners.forEach((cb) => cb(entry));
  }, () => {
    // Ignore permission/offline errors — consumers keep their fallback name.
  });

  return entry;
}

/**
 * Subscribe to live changes of a user's profile (name/role/photoURL).
 * Shares one Firestore listener per uid across all subscribers.
 * @param {string} uid
 * @param {(entry: {name:string|null, role:string|null, photoURL:string|null}) => void} cb
 * @returns {() => void} unsubscribe
 */
export function subscribeToLiveUser(uid, cb) {
  if (!uid) return () => {};
  const entry = ensureEntry(uid);
  entry.listeners.add(cb);
  // Fire immediately with whatever we currently know (may be undefined until first snapshot).
  if (entry.name !== undefined) cb(entry);

  return () => {
    entry.listeners.delete(cb);
    if (entry.listeners.size === 0) {
      entry.unsub && entry.unsub();
      registry.delete(uid);
    }
  };
}

/**
 * React hook: resolves a uid's CURRENTLY uploaded photoURL in real time.
 * Returns `null` while unknown or if the user never uploaded one — callers
 * should fall back to a generated avatar in that case, never a random one
 * when an upload actually exists.
 * @param {string|undefined|null} uid
 */
export function useLivePhotoURL(uid) {
  const [photoURL, setPhotoURL] = useState(null);

  useEffect(() => {
    if (!uid) {
      setPhotoURL(null);
      return;
    }
    const unsub = subscribeToLiveUser(uid, (entry) => {
      setPhotoURL(entry.photoURL || null);
    });
    return unsub;
  }, [uid]);

  return photoURL;
}

/**
 * React hook: resolves a uid's CURRENT display name in real time.
 * Falls back to `fallbackName` until the live value is known, and stays on
 * the fallback if the uid has no profile doc (e.g. deleted/guest user).
 * @param {string|undefined|null} uid
 * @param {string} [fallbackName]
 */
export function useLiveDisplayName(uid, fallbackName) {
  const [name, setName] = useState(fallbackName || '');
  const fallbackRef = useRef(fallbackName);
  fallbackRef.current = fallbackName;

  useEffect(() => {
    if (!uid) {
      setName(fallbackRef.current || '');
      return;
    }
    const unsub = subscribeToLiveUser(uid, (entry) => {
      // entry.name is `null` when the uid has no profile doc (deleted/guest
      // without one) — always fall back to the latest fallback in that case,
      // never a closed-over stale one.
      setName(entry.name || fallbackRef.current || '');
    });
    return unsub;
  }, [uid]);

  // If the fallback itself changes (e.g. a fresher stale copy arrives) and
  // we don't have a live name for this uid, reflect the new fallback too.
  useEffect(() => {
    const entry = uid ? registry.get(uid) : null;
    if (!entry || !entry.name) {
      setName(fallbackName || '');
    }
  }, [fallbackName, uid]);

  return name;
}
