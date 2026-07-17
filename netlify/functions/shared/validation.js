// Input validation + rate limiters for Netlify Functions
// In-memory store (cold-start-aware fallback)
const rateLimitStore = new Map();

/**
 * In-memory rate limit check.
 * Resets on cold starts — use firestoreRateLimitCheck for persistent enforcement.
 * @param {string} key          e.g. 'reset:1.2.3.4'
 * @param {number} maxRequests  max allowed in window
 * @param {number} windowMs     window in milliseconds
 * @returns {{ ok: boolean, retryAfter?: number }}
 */
export function rateLimitCheck(key, maxRequests, windowMs) {
  const now   = Date.now();
  const entry = rateLimitStore.get(key) || { count: 0, start: now };

  if (now - entry.start > windowMs) {
    rateLimitStore.set(key, { count: 1, start: now });
    return { ok: true };
  }
  if (entry.count >= maxRequests) {
    return { ok: false, retryAfter: Math.ceil((entry.start + windowMs - now) / 1000) };
  }
  entry.count++;
  rateLimitStore.set(key, entry);
  return { ok: true };
}

/**
 * Firestore-backed rate limit check (H-06).
 * Persists across cold starts — counters live in _rateLimits/{key} in Firestore.
 * Falls back to in-memory rateLimitCheck when Firebase Admin is not configured.
 *
 * @param {string} key          e.g. 'reset:1.2.3.4'
 * @param {number} maxRequests  max allowed in window
 * @param {number} windowMs     window in milliseconds
 * @returns {Promise<{ ok: boolean, retryAfter?: number }>}
 */
export async function firestoreRateLimitCheck(key, maxRequests, windowMs) {
  try {
    const { getAdminDb } = await import('./firestoreAdmin.js');
    const adminDb = getAdminDb();
    if (!adminDb) {
      // Admin SDK not configured — degrade gracefully to in-memory
      return rateLimitCheck(key, maxRequests, windowMs);
    }

    // Firestore doc key: replace chars not allowed in doc IDs
    const docId = key.replace(/[:/\s]/g, '_').slice(0, 1500);
    const ref   = adminDb.collection('_rateLimits').doc(docId);
    const now   = Date.now();

    const result = await adminDb.runTransaction(async (txn) => {
      const snap = await txn.get(ref);
      const data = snap.exists ? snap.data() : null;

      if (!data || now > data.resetAt) {
        txn.set(ref, { count: 1, resetAt: now + windowMs });
        return { ok: true };
      }
      if (data.count >= maxRequests) {
        return { ok: false, retryAfter: Math.ceil((data.resetAt - now) / 1000) };
      }
      txn.update(ref, { count: data.count + 1 });
      return { ok: true };
    });

    return result;
  } catch (e) {
    console.warn('[firestoreRateLimitCheck] Firestore unavailable, using in-memory fallback:', e.message);
    return rateLimitCheck(key, maxRequests, windowMs);
  }
}

/** Validate email format. */
export function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Trim and truncate a string safely. */
export function sanitizeString(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}
