import { Badges } from '../data/Badges';
import tinglebotAvatarImg from '../assets/tinglebot-avatar.png';

/**
 * TingleBot's fixed uid (used across chat rooms, private messages, and
 * Admin Panel Feedback/Complaints replies) so its avatar is never resolved
 * to a random human portrait like a normal user.
 */
export const TINGLEBOT_UID = 'tinglebot_system_official_2024';

/** Dedicated cute bot mascot avatar — always used for TingleBot, everywhere. */
export const TINGLEBOT_AVATAR_URL = tinglebotAvatarImg;

/**
 * Deterministic 0–99 index from a uid string (djb2 variant).
 */
const uidToIndex = (uid, offset = 0) => {
  let h = 5381;
  const s = uid || 'default';
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return (h + offset) % 100;
};

/**
 * Returns a stylish, gender-correct default avatar URL (real human portraits).
 * Uses randomuser.me CDN — static files, no rate limiting.
 *   Male       → men/{0-99}.jpg
 *   Female     → women/{0-99}.jpg
 *   Transgender/Other → women/{37-99+37 mod 100}.jpg  (distinct subset)
 */
export const getDefaultAvatarUrl = (uid, gender) => {
  if (uid === TINGLEBOT_UID) {
    return TINGLEBOT_AVATAR_URL;
  }
  const g = (gender || '').toLowerCase();
  if (g === 'female') {
    return `https://randomuser.me/api/portraits/women/${uidToIndex(uid)}.jpg`;
  }
  if (g === 'transgender' || g === 'other') {
    return `https://randomuser.me/api/portraits/women/${uidToIndex(uid, 37)}.jpg`;
  }
  return `https://randomuser.me/api/portraits/men/${uidToIndex(uid)}.jpg`;
};

/**
 * Reads the stored guest gender directly from localStorage.
 * Use instead of inline JSON-parsing IIFEs.
 */
export const getStoredGuestGender = () => {
  try {
    const direct = localStorage.getItem('guestGender');
    if (direct) return direct;
    const raw = localStorage.getItem('guestUser');
    if (!raw) return '';
    return JSON.parse(raw).gender || '';
  } catch {
    return '';
  }
};

/**
 * Normalise any gender string to a value DiceBear accepts ('male' | 'female').
 * Kept for any remaining DiceBear usage; prefer getDefaultAvatarUrl for new code.
 */
export const dicebearSex = (gender) => {
  return (gender || '').toLowerCase() === 'female' ? 'female' : 'male';
};

const BADGE_ALIASES = {
  verified_rj: 'rj',
  radio_jockey: 'rj',
  godfather: 'the_olympian',
  high_council: 'titans',
  'high council': 'titans',
  guardian: 'spartans',
};

export const normalizeRole = (role) => {
  const r = String(role || '').toLowerCase().trim();
  if (r === 'owner' || r === 'superowner' || r === 'godfather') return 'owner';
  if (r === 'admin' || r === 'high_council' || r === 'high council') return 'admin';
  if (r === 'moderator' || r === 'mod' || r === 'guardian') return 'moderator';
  if (r === 'rj' || r === 'verified_rj' || r === 'radio_jockey') return 'rj';
  if (r === 'guest') return 'guest';
  return 'user';
};

export const isOwnerRole = (role) => normalizeRole(role) === 'owner';
export const isAdminRole = (role) => ['owner', 'admin'].includes(normalizeRole(role));
export const isModRole   = (role) => ['owner', 'admin', 'moderator'].includes(normalizeRole(role));
export const isStaffRole = (role) => ['owner', 'admin', 'moderator'].includes(normalizeRole(role));

export const resolveBadgeKey = (badge) => {
  if (!badge) return null;
  const raw = String(badge).trim();
  if (!raw) return null;
  if (Badges[raw]) return raw;
  const lower = raw.toLowerCase();
  const aliased = BADGE_ALIASES[lower];
  if (aliased && Badges[aliased]) return aliased;
  const matched = Object.keys(Badges).find(k => k.toLowerCase() === lower);
  return matched || null;
};

export const isRjRole = (role, badge) =>
  normalizeRole(role) === 'rj' || resolveBadgeKey(badge) === 'rj';

export const isGuestUser = (userOrProps) => {
  if (!userOrProps) return false;
  return (
    userOrProps.isGuest === true ||
    String(userOrProps.isGuest) === 'true' ||
    normalizeRole(userOrProps.role) === 'guest'
  );
};

export const getRoleDisplayLabel = ({ role, gender, isGuest, badge } = {}) => {
  const g = (gender || '').toLowerCase().trim();

  if (isGuestUser({ isGuest, role })) {
    if (g === 'female') return 'Female';
    if (g === 'transgender' || g === 'other') return 'Transgender';
    return 'Male';
  }

  const badgeKey = resolveBadgeKey(badge);
  if (badgeKey && Badges[badgeKey]?.name) {
    return Badges[badgeKey].name;
  }

  const norm = normalizeRole(role);
  if (norm === 'owner') return 'Godfather';
  if (norm === 'admin') return 'High Council';
  if (norm === 'moderator') return 'Guardian';
  if (norm === 'rj') return 'RJ';

  return 'Member';
};
