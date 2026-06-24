import { Badges } from '../data/Badges';

/**
 * Reads the stored guest gender directly from localStorage.
 * Returns the raw gender string or '' if not available.
 * Use this instead of parsing guestUser JSON inline.
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
 * Normalise a gender string to a value DiceBear accepts ('male' | 'female').
 * DiceBear's adventurer style only supports 'male' and 'female'.
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
    return 'Purush'; // only if gender is truly unset on a guest
  }

  if (badge && Badges[badge]?.name) {
    return Badges[badge].name;
  }

  if (r === 'owner' || r === 'superowner') return 'Godfather';
  if (r === 'admin') return 'High Council';
  if (r === 'moderator') return 'Guardian';

  return 'Member';
};
