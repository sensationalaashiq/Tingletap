// Input validation + in-memory rate limiter for Netlify Functions
// Rate limit store resets on cold starts (acceptable for low-volume auth emails)
const rateLimitStore = new Map();

/**
 * Check rate limit for a key.
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

/** Validate email format. */
export function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Trim and truncate a string safely. */
export function sanitizeString(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}
