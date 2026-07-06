/**
 * Birthday Badge Utilities — TingleTap
 *
 * Pure client-side birthday detection from stored dateOfBirth.
 * Zero Firebase reads or writes — computes visibility at render time.
 */

/**
 * Returns true if today (local time) matches the month/day of dateOfBirth.
 *
 * @param {string} dateOfBirth - ISO date string "YYYY-MM-DD" (HTML date input)
 */
export const isTodayBirthday = (dateOfBirth) => {
  if (!dateOfBirth || typeof dateOfBirth !== 'string') return false;
  try {
    const parts = dateOfBirth.split('-');
    if (parts.length < 3) return false;
    const dobMonth = parseInt(parts[1], 10); // 1–12
    const dobDay   = parseInt(parts[2], 10); // 1–31
    if (isNaN(dobMonth) || isNaN(dobDay)) return false;
    const now = new Date();
    return dobMonth === (now.getMonth() + 1) && dobDay === now.getDate();
  } catch {
    return false;
  }
};

/**
 * Premium colorful birthday cake SVG badge — inline size (18×18).
 * No gradient IDs to avoid conflicts when multiple instances render on the same page.
 * Used beside usernames in the Sidebar user list.
 */
export const BIRTHDAY_BADGE_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
  <rect x="10.5" y="5.5" width="3" height="4" rx="1.5" fill="#f0abfc"/>
  <ellipse cx="12" cy="3.8" rx="1" ry="1.8" fill="#fb923c"/>
  <ellipse cx="12" cy="4.2" rx="0.55" ry="0.9" fill="#fef08a"/>
  <rect x="3" y="9.5" width="18" height="4.5" rx="2" fill="#f472b6"/>
  <path d="M3 12q2.25-2.1 4.5 0t4.5 0 4.5 0 4.5 0" stroke="white" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <rect x="2" y="14" width="20" height="6.5" rx="2" fill="#c026d3"/>
  <circle cx="7"   cy="17.5" r="1.1" fill="#fbbf24"/>
  <circle cx="12"  cy="17.5" r="1.1" fill="#7dd3fc"/>
  <circle cx="17"  cy="17.5" r="1.1" fill="#fbbf24"/>
  <circle cx="9.5" cy="20"   r="0.9" fill="#f0abfc"/>
  <circle cx="14.5" cy="20"  r="0.9" fill="#86efac"/>
</svg>`;

/**
 * Larger variant (22×22) for the VPM profile modal badge row.
 * Matches the sizing of .vpm-badge-wrap svg rules.
 */
export const BIRTHDAY_BADGE_SVG_LG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
  <rect x="10.5" y="5.5" width="3" height="4" rx="1.5" fill="#f0abfc"/>
  <ellipse cx="12" cy="3.8" rx="1" ry="1.8" fill="#fb923c"/>
  <ellipse cx="12" cy="4.2" rx="0.55" ry="0.9" fill="#fef08a"/>
  <rect x="3" y="9.5" width="18" height="4.5" rx="2" fill="#f472b6"/>
  <path d="M3 12q2.25-2.1 4.5 0t4.5 0 4.5 0 4.5 0" stroke="white" stroke-width="1.3" fill="none" stroke-linecap="round"/>
  <rect x="2" y="14" width="20" height="6.5" rx="2" fill="#c026d3"/>
  <circle cx="7"   cy="17.5" r="1.1" fill="#fbbf24"/>
  <circle cx="12"  cy="17.5" r="1.1" fill="#7dd3fc"/>
  <circle cx="17"  cy="17.5" r="1.1" fill="#fbbf24"/>
  <circle cx="9.5" cy="20"   r="0.9" fill="#f0abfc"/>
  <circle cx="14.5" cy="20"  r="0.9" fill="#86efac"/>
</svg>`;
