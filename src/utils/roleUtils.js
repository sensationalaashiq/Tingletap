import { Badges } from '../data/Badges';

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

export const getRoleDisplayLabel = ({ role, gender, isGuest, badge } = {}) => {
  const r = (role || '').toLowerCase();
  const g = (gender || '').toLowerCase();

  if (isGuest || r === 'guest') {
    if (g === 'female') return 'Stree';
    if (g === 'transgender' || g === 'other') return 'Navrang';
    if (g === 'male') return 'Purush';
    return 'Purush';
  }

  if (badge && Badges[badge]?.name) {
    return Badges[badge].name;
  }

  if (r === 'owner' || r === 'superowner') return 'Godfather';
  if (r === 'admin') return 'High Council';
  if (r === 'moderator') return 'Guardian';

  return 'Member';
};
