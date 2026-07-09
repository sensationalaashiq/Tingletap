// src/services/rjApplicationService.js
// Client-side Firestore service for RJ verification applications.
// Mirrors badgeApplicationService.js — same one-shot read pattern, applied
// to the rjApplications collection.

import { db, auth } from '../firebase/config';
import {
  doc, getDoc, getDocs, collection, query,
  where, orderBy, limit, startAfter,
} from 'firebase/firestore';

const COLLECTION = 'rjApplications';
const PAGE_SIZE  = 30;

// ─── User-facing ──────────────────────────────────────────────────────────────

/**
 * Fetch the current user's RJ application (if any).
 * Single getDoc — O(1) cost since uid is the document ID.
 */
export async function getMyRJApplication() {
  const user = auth.currentUser;
  if (!user) return null;
  const snap = await getDoc(doc(db, COLLECTION, user.uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Format the remaining 48-hour review window for admin display.
 */
export function formatRJReviewTimeRemaining(expiresAt) {
  if (!expiresAt) return 'Expired';
  const exp = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
  const diff = exp.getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// ─── Admin-facing ─────────────────────────────────────────────────────────────

const _cache = new Map();

/**
 * Paginated list of RJ applications for admin panel.
 * @param {'all'|'pending'|'approved'|'rejected'|'expired'|'resubmit_requested'} statusFilter
 */
export async function getRJApplicationsPage(statusFilter = 'all', searchTerm = '', lastDoc = null, forceRefresh = false) {
  const cacheKey = `${statusFilter}__${searchTerm}__${lastDoc?.id || 'start'}`;
  if (!forceRefresh && _cache.has(cacheKey)) return _cache.get(cacheKey);

  let q = collection(db, COLLECTION);
  const constraints = [];

  // A composite index on (status ASC, submittedAt DESC) is defined in firestore.indexes.json.
  if (statusFilter !== 'all') {
    constraints.push(where('status', '==', statusFilter));
  }
  constraints.push(orderBy('submittedAt', 'desc'));
  constraints.push(limit(PAGE_SIZE));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(q, ...constraints));
  const docs = snap.docs.map(d => ({ id: d.id, _snap: d, ...d.data() }));

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

export function invalidateRJCache() { _cache.clear(); }

export async function getRJApplicationDetail(uid) {
  const cacheKey = `detail__${uid}`;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = { id: snap.id, ...snap.data() };
  _cache.set(cacheKey, data);
  return data;
}

/** Summary stats for the admin dashboard header */
export async function getRJApplicationStats() {
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
