// src/services/badgeApplicationService.js
// Client-side Firestore service for badge applications.
// ONE-SHOT reads only — no realtime listeners, no polling.

import { db, auth } from '../firebase/config';
import {
  doc, getDoc, getDocs, collection, query,
  where, orderBy, limit, startAfter,
  serverTimestamp, updateDoc, setDoc, Timestamp
} from 'firebase/firestore';

const COLLECTION = 'badgeApplications';
const PAGE_SIZE  = 30;

// ─── User-facing ──────────────────────────────────────────────────────────────

/**
 * Fetch the current user's application (if any).
 * Single getDoc — O(1) cost since uid is the document ID.
 */
export async function getMyApplication() {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, COLLECTION, user.uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Calculate account age in days from Firebase auth createdAt.
 * @param {string|number} creationTime  – e.g. auth.currentUser.metadata.creationTime
 */
export function getAccountAgeDays(creationTime) {
  if (!creationTime) return 0;
  const created = new Date(creationTime).getTime();
  const now     = Date.now();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

/**
 * Returns ms until the account is 60 days old.
 * Negative means already past 60 days.
 */
export function msUntil60Days(creationTime) {
  if (!creationTime) return Infinity;
  const created = new Date(creationTime).getTime();
  const target  = created + 60 * 24 * 60 * 60 * 1000;
  return target - Date.now();
}

/**
 * Format remaining time until 60-day account age.
 * Returns human-readable string like "23 days, 4 hours".
 */
export function formatRemainingTime(ms) {
  if (ms <= 0) return '0 days';
  const days  = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins  = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}, ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Format the remaining 48-hour review window for admin display.
 */
export function formatReviewTimeRemaining(expiresAt) {
  if (!expiresAt) return 'Expired';
  const exp = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
  const diff = exp.getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// ─── Admin-facing ─────────────────────────────────────────────────────────────

/** Session-level cache to avoid re-reading unchanged documents */
const _cache = new Map();

/**
 * Paginated list of badge applications for admin panel.
 * Cached per session — only fetches from Firestore if cache is stale.
 * @param {'all'|'pending'|'approved'|'rejected'|'expired'|'resubmit_requested'} statusFilter
 * @param {string} searchTerm
 * @param {import('firebase/firestore').QueryDocumentSnapshot|null} lastDoc
 * @param {boolean} forceRefresh
 */
export async function getApplicationsPage(statusFilter = 'all', searchTerm = '', lastDoc = null, forceRefresh = false) {
  const cacheKey = `${statusFilter}__${searchTerm}__${lastDoc?.id || 'start'}`;
  if (!forceRefresh && _cache.has(cacheKey)) return _cache.get(cacheKey);

  let q = collection(db, COLLECTION);
  const constraints = [];

  // A composite index on (status ASC, submittedAt DESC) is defined in firestore.indexes.json.
  // Both filter strategies therefore use server-side orderBy + cursor pagination.
  if (statusFilter !== 'all') {
    constraints.push(where('status', '==', statusFilter));
  }
  constraints.push(orderBy('submittedAt', 'desc'));
  constraints.push(limit(PAGE_SIZE));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(q, ...constraints));
  const docs = snap.docs.map(d => ({ id: d.id, _snap: d, ...d.data() }));

  // Client-side search filter (name/email/uid/country)
  const filtered = searchTerm.trim()
    ? docs.filter(app => {
        const s = searchTerm.toLowerCase();
        return (
          app.username?.toLowerCase().includes(s) ||
          app.displayName?.toLowerCase().includes(s) ||
          app.email?.toLowerCase().includes(s) ||
          app.uid?.toLowerCase().includes(s) ||
          app.country?.toLowerCase().includes(s)
        );
      })
    : docs;

  const hasMore = snap.docs.length === PAGE_SIZE;
  const result = { docs: filtered, lastDoc: snap.docs[snap.docs.length - 1] || null, hasMore };
  _cache.set(cacheKey, result);
  return result;
}

/** Invalidate cache — call after any write action */
export function invalidateCache() { _cache.clear(); }

/**
 * Fetch single application detail (used when admin expands a row).
 */
export async function getApplicationDetail(uid) {
  const cacheKey = `detail__${uid}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = { id: snap.id, ...snap.data() };
  _cache.set(cacheKey, data);
  return data;
}

/** Summary stats for the admin dashboard header */
export async function getApplicationStats() {
  const cacheKey = 'stats__summary';
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const [pending, approved, rejected, expired] = await Promise.all([
    getDocs(query(collection(db, COLLECTION), where('status', '==', 'pending'),  limit(1000))),
    getDocs(query(collection(db, COLLECTION), where('status', '==', 'approved'), limit(1000))),
    getDocs(query(collection(db, COLLECTION), where('status', '==', 'rejected'), limit(1000))),
    getDocs(query(collection(db, COLLECTION), where('status', '==', 'expired'),  limit(1000))),
  ]);

  const stats = {
    pending:  pending.size,
    approved: approved.size,
    rejected: rejected.size,
    expired:  expired.size,
    total:    pending.size + approved.size + rejected.size + expired.size,
  };
  _cache.set(cacheKey, stats);
  return stats;
}
