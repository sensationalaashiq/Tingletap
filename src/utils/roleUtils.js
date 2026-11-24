import { Badges } from '../data/Badges';
import tinglebotAvatarImg from '../assets/tinglebot-avatar.png';
import animeMale1 from '../assets/avatars/anime_male_1.jpg';
import animeMale2 from '../assets/avatars/anime_male_2.jpg';
import animeMale3 from '../assets/avatars/anime_male_3.jpg';
import animeFemale1 from '../assets/avatars/anime_female_1.jpg';
import animeFemale2 from '../assets/avatars/anime_female_2.jpg';
import animeFemale3 from '../assets/avatars/anime_female_3.jpg';

const ANIME_MALE_AVATARS = [animeMale1, animeMale2, animeMale3];
const ANIME_FEMALE_AVATARS = [animeFemale1, animeFemale2, animeFemale3];
const ANIME_ALL_AVATARS = [...ANIME_FEMALE_AVATARS, ...ANIME_MALE_AVATARS];

/**
 * TingleBot's fixed uid (used across chat rooms, private messages, and
 * Admin Panel Feedback/Complaints replies) so its avatar is never resolved
 * to a random user avatar.
 */
export const TINGLEBOT_UID = 'tinglebot_system_official_2024';

/** Dedicated cute bot mascot avatar — always used for TingleBot, everywhere. */
export const TINGLEBOT_AVATAR_URL = tinglebotAvatarImg;

/**
 * Returns true only when `url` is a genuinely uploaded user photo (e.g. R2 / custom image),
 * and false for legacy randomuser/dicebear or built-in generated/anime defaults.
 */
export const isRealAvatarUpload = (url) => {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  if (
    lower.includes('randomuser.me') ||
    lower.includes('dicebear.com') ||
    lower.startsWith('data:image/svg+xml') ||
    /anime_(male|female)_[1-3]/.test(lower)
  ) {
    return false;
  }
  return true;
};

/**
 * Deterministic unsigned integer hash from a uid string (djb2 variant).
 */
const uidToHash = (uid, offset = 0) => {
  let h = 5381;
  const s = String(uid || 'default');
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return (h + offset) >>> 0;
};

const MALE_ICON_PALETTES = [
  ['#0f172a', '#1d4ed8', '#38bdf8', '#e0f2fe'],
  ['#1e1b4b', '#4338ca', '#818cf8', '#eef2ff'],
  ['#064e3b', '#047857', '#34d399', '#ecfdf5'],
  ['#172554', '#0284c7', '#22d3ee', '#ecfeff'],
  ['#1e293b', '#475569', '#94a3b8', '#f8fafc'],
  ['#311042', '#6d28d9', '#a78bfa', '#f5f3ff'],
];

const FEMALE_ICON_PALETTES = [
  ['#4c0519', '#be123c', '#fb7185', '#fff1f2'],
  ['#500724', '#be185d', '#f472b6', '#fdf2f8'],
  ['#3b0764', '#7e22ce', '#e879f9', '#faf5ff'],
  ['#451a03', '#b45309', '#fbbf24', '#fffbeb'],
  ['#4a044e', '#a21caf', '#f0abfc', '#fdf4ff'],
  ['#7f1d1d', '#dc2626', '#fca5a5', '#fef2f2'],
];

const TRANS_ICON_PALETTES = [
  ['#0f172a', '#0284c7', '#f472b6', '#fdf4ff'],
  ['#1e1b4b', '#7c3aed', '#38bdf8', '#f0f9ff'],
  ['#3b0764', '#db2777', '#22d3ee', '#ecfeff'],
  ['#164e63', '#0d9488', '#e879f9', '#faf5ff'],
];

/**
 * Generates a unique, stylish, non-human vector Male / Female / Transgender Icon DP
 * as an inline SVG data URI for guest users.
 */
export const getGuestIconAvatarUrl = (uid, gender) => {
  const g = (gender || '').toLowerCase().trim();
  const hash = uidToHash(uid);
  const variant = hash % 3;
  const accentPos = (hash >> 3) % 2;

  let palettes = MALE_ICON_PALETTES;
  let iconBodySvg = '';

  if (g === 'female') {
    palettes = FEMALE_ICON_PALETTES;
    const [, , accent, ink] = palettes[hash % palettes.length];
    // Distinct female stylized icon hairstyles + silhouette
    if (variant === 0) {
      iconBodySvg = `
        <path d="M35 55 C35 31 50 23 64 23 C78 23 93 31 93 55 L96 74 C96 79 90 81 86 78 L86 58 C84 44 74 37 64 37 C54 37 44 44 42 58 L42 78 C38 81 32 79 32 74 Z" fill="${ink}" opacity="0.92"/>
        <circle cx="64" cy="52" r="16" fill="${ink}"/>
        <path d="M30 112 C32 90 46 79 64 79 C82 79 96 90 98 112 Z" fill="${ink}"/>
        <path d="M54 80 L64 91 L74 80" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    } else if (variant === 1) {
      iconBodySvg = `
        <circle cx="64" cy="23" r="10" fill="${ink}" opacity="0.92"/>
        <path d="M40 52 C40 34 50 27 64 27 C78 27 88 34 88 52 C82 44 73 41 64 41 C55 41 46 44 40 52 Z" fill="${ink}" opacity="0.95"/>
        <circle cx="64" cy="53" r="16" fill="${ink}"/>
        <path d="M29 112 C31 89 45 78 64 78 C83 78 97 89 99 112 Z" fill="${ink}"/>
        <path d="M51 82 Q64 95 77 82" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
      `;
    } else {
      iconBodySvg = `
        <path d="M36 58 C36 33 48 24 64 24 C80 24 92 33 92 58 C92 67 87 72 82 72 L82 54 C76 46 69 42 64 42 C57 42 50 47 46 54 L46 72 C41 72 36 67 36 58 Z" fill="${ink}" opacity="0.92"/>
        <circle cx="64" cy="53" r="15.5" fill="${ink}"/>
        <path d="M31 112 C33 90 46 79 64 79 C82 79 95 90 97 112 Z" fill="${ink}"/>
        <circle cx="64" cy="88" r="3" fill="${accent}"/>
      `;
    }
  } else if (g === 'transgender' || g === 'other') {
    palettes = TRANS_ICON_PALETTES;
    const [, , accent, ink] = palettes[hash % palettes.length];
    if (variant === 0) {
      iconBodySvg = `
        <path d="M40 50 C40 31 50 24 64 24 C78 24 88 31 88 50 L90 66 C86 67 83 64 82 58 C78 44 71 39 64 39 C57 39 50 44 46 58 C45 64 42 67 38 66 Z" fill="${ink}" opacity="0.92"/>
        <circle cx="64" cy="52" r="16" fill="${ink}"/>
        <path d="M30 112 C32 89 46 78 64 78 C82 78 96 89 98 112 Z" fill="${ink}"/>
        <path d="M54 81 L64 90 L74 81" fill="none" stroke="${accent}" stroke-width="2.8" stroke-linecap="round"/>
      `;
    } else if (variant === 1) {
      iconBodySvg = `
        <path d="M43 46 C44 30 53 24 64 24 C75 24 84 30 85 46 C77 38 70 37 64 37 C58 37 51 38 43 46 Z" fill="${ink}" opacity="0.95"/>
        <circle cx="64" cy="52" r="16" fill="${ink}"/>
        <path d="M29 112 C31 89 46 79 64 79 C82 79 97 89 99 112 Z" fill="${ink}"/>
        <circle cx="64" cy="89" r="3.5" fill="${accent}"/>
      `;
    } else {
      iconBodySvg = `
        <circle cx="64" cy="51" r="16.5" fill="${ink}"/>
        <path d="M44 43 C47 30 56 26 67 27 C77 28 84 35 84 44 C75 37 55 37 44 43 Z" fill="${accent}" opacity="0.85"/>
        <path d="M30 112 C32 89 45 78 64 78 C83 78 96 89 98 112 Z" fill="${ink}"/>
      `;
    }
  } else {
    palettes = MALE_ICON_PALETTES;
    const [, , accent, ink] = palettes[hash % palettes.length];
    if (variant === 0) {
      iconBodySvg = `
        <path d="M44 47 C44 31 53 25 65 25 C77 25 84 32 84 47 C79 39 71 37 63 37 C55 37 48 40 44 47 Z" fill="${ink}" opacity="0.95"/>
        <circle cx="64" cy="52" r="16" fill="${ink}"/>
        <path d="M27 112 C29 88 45 78 64 78 C83 78 99 88 101 112 Z" fill="${ink}"/>
        <path d="M52 79 L64 93 L76 79" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    } else if (variant === 1) {
      iconBodySvg = `
        <path d="M43 47 L46 31 L56 34 L65 23 L74 33 L83 29 L85 47 C78 39 50 39 43 47 Z" fill="${ink}" opacity="0.95"/>
        <circle cx="64" cy="53" r="15.5" fill="${ink}"/>
        <path d="M28 112 C30 89 45 79 64 79 C83 79 98 89 100 112 Z" fill="${ink}"/>
        <path d="M56 80 L64 88 L72 80" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
      `;
    } else {
      iconBodySvg = `
        <path d="M44 46 C45 30 55 24 66 25 C77 26 84 34 84 46 C77 41 69 39 60 39 C53 39 48 42 44 46 Z" fill="${ink}" opacity="0.95"/>
        <circle cx="64" cy="52" r="16" fill="${ink}"/>
        <path d="M27 112 C29 88 44 78 64 78 C84 78 99 88 101 112 Z" fill="${ink}"/>
        <rect x="57" y="80" width="14" height="4" rx="2" fill="${accent}"/>
      `;
    }
  }

  const [bgDark, bgMid, accent] = palettes[hash % palettes.length];
  const gradId = `gi_${hash.toString(36)}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgDark}"/>
        <stop offset="55%" stop-color="${bgMid}"/>
        <stop offset="100%" stop-color="${accent}"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#${gradId})"/>
    <circle cx="64" cy="64" r="59" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
    <circle cx="${accentPos === 0 ? 28 : 100}" cy="28" r="3.2" fill="#ffffff" opacity="0.45"/>
    <circle cx="${accentPos === 0 ? 38 : 90}" cy="22" r="1.8" fill="#ffffff" opacity="0.35"/>
    ${iconBodySvg}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Generates a deterministic Cartoon/Anime Male or Female DP for registered users.
 */
export const getRegisteredAnimeAvatarUrl = (uid, gender) => {
  const g = (gender || '').toLowerCase().trim();
  const hash = uidToHash(uid);
  if (g === 'female') {
    return ANIME_FEMALE_AVATARS[hash % ANIME_FEMALE_AVATARS.length];
  }
  if (g === 'transgender' || g === 'other') {
    return ANIME_ALL_AVATARS[hash % ANIME_ALL_AVATARS.length];
  }
  return ANIME_MALE_AVATARS[hash % ANIME_MALE_AVATARS.length];
};

/**
 * Returns the appropriate default avatar URL:
 *   - TingleBot -> mascot avatar
 *   - Guests    -> unique stylized vector Male / Female / Transgender icon DP
 *   - Registered -> deterministic Cartoon / Anime Male or Female DP
 */
export const getDefaultAvatarUrl = (uid, gender, isGuest = false) => {
  if (uid === TINGLEBOT_UID) {
    return TINGLEBOT_AVATAR_URL;
  }
  const guestFlag = isGuest === true || String(isGuest) === 'true';
  if (guestFlag) {
    return getGuestIconAvatarUrl(uid, gender);
  }
  return getRegisteredAnimeAvatarUrl(uid, gender);
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
 * Normalise any gender string. Kept only for backwards-compatibility exports.
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

const ROLE_RANK = {
  guest: 0,
  user: 1,
  rj: 2,
  moderator: 3,
  admin: 4,
  owner: 5,
};

const BADGE_TO_ROLE = {
  the_olympian: 'owner',
  godfather: 'owner',
  titans: 'admin',
  high_council: 'admin',
  'high council': 'admin',
  spartans: 'moderator',
  guardian: 'moderator',
  rj: 'rj',
  verified_rj: 'rj',
  radio_jockey: 'rj',
};

export const resolveRoleFromBadge = (badge) => {
  const b = String(badge || '').toLowerCase().trim();
  return BADGE_TO_ROLE[b] || null;
};

const normalizeRawRole = (role) => {
  const r = String(role || '').toLowerCase().trim();
  if (r === 'owner' || r === 'superowner' || r === 'godfather') return 'owner';
  if (r === 'admin' || r === 'high_council' || r === 'high council') return 'admin';
  if (r === 'moderator' || r === 'mod' || r === 'guardian') return 'moderator';
  if (r === 'rj' || r === 'verified_rj' || r === 'radio_jockey') return 'rj';
  if (r === 'guest') return 'guest';
  return 'user';
};

export const normalizeRole = (roleOrUser, badgeArg) => {
  if (roleOrUser && typeof roleOrUser === 'object') {
    const isGuestFlag = roleOrUser.isGuest === true || String(roleOrUser.isGuest) === 'true';
    const roleNorm = normalizeRawRole(roleOrUser.role);
    if (isGuestFlag) return 'guest';
    const badgeRole = resolveRoleFromBadge(roleOrUser.badge);
    if (roleNorm === 'guest' && !badgeRole) return 'guest';
    if (badgeRole && (ROLE_RANK[badgeRole] || 0) > (ROLE_RANK[roleNorm] || 0)) {
      return badgeRole;
    }
    return roleNorm;
  }

  const roleNorm = normalizeRawRole(roleOrUser);
  const badgeRole = resolveRoleFromBadge(badgeArg);
  if (roleNorm === 'guest' && !badgeRole) return 'guest';
  if (badgeRole && (ROLE_RANK[badgeRole] || 0) > (ROLE_RANK[roleNorm] || 0)) {
    return badgeRole;
  }
  return roleNorm;
};

export const isOwnerRole = (roleOrUser, badge) => normalizeRole(roleOrUser, badge) === 'owner';
export const isAdminRole = (roleOrUser, badge) => ['owner', 'admin'].includes(normalizeRole(roleOrUser, badge));
export const isModRole   = (roleOrUser, badge) => ['owner', 'admin', 'moderator'].includes(normalizeRole(roleOrUser, badge));
export const isStaffRole = (roleOrUser, badge) => ['owner', 'admin', 'moderator'].includes(normalizeRole(roleOrUser, badge));

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

export const isRjRole = (roleOrUser, badge) => {
  const b = (roleOrUser && typeof roleOrUser === 'object') ? roleOrUser.badge : badge;
  return normalizeRole(roleOrUser, badge) === 'rj' || resolveBadgeKey(b) === 'rj';
};

export const isGuestUser = (userOrProps) => {
  if (!userOrProps) return false;
  return (
    userOrProps.isGuest === true ||
    String(userOrProps.isGuest) === 'true' ||
    normalizeRole(userOrProps) === 'guest'
  );
};

export const getRoleDisplayLabel = ({ role, gender, isGuest, badge } = {}) => {
  const g = (gender || '').toLowerCase().trim();

  if (isGuestUser({ isGuest, role })) {
    if (g === 'female') return 'Female';
    if (g === 'transgender' || g === 'other') return 'Transgender';
    return 'Male';
  }

  const norm = normalizeRole(role, badge);
  if (norm === 'owner') return 'Godfather';

  const badgeKey = resolveBadgeKey(badge);
  if (badgeKey && Badges[badgeKey]?.name) {
    return Badges[badgeKey].name;
  }

  if (norm === 'admin') return 'High Council';
  if (norm === 'moderator') return 'Guardian';
  if (norm === 'rj') return 'RJ';

  return 'Member';
};

/**
 * Normalizes a Firestore Timestamp, {seconds}, epoch ms, Date, or ISO string
 * and returns the earliest valid Date between Firestore createdAt and Firebase
 * Auth metadata.creationTime so transient doc overwrites can never shrink
 * visible account age.
 */
export const resolveEarliestCreatedAt = (firestoreCreatedAt, authCreationTime) => {
  const toValidDate = (val) => {
    if (!val) return null;
    try {
      let d = null;
      if (val instanceof Date) d = val;
      else if (typeof val?.toDate === 'function') d = val.toDate();
      else if (typeof val?.seconds === 'number') d = new Date(val.seconds * 1000);
      else if (typeof val?._seconds === 'number') d = new Date(val._seconds * 1000);
      else if (typeof val === 'number' || typeof val === 'string') d = new Date(val);
      if (!d || Number.isNaN(d.getTime())) return null;
      if (d.getFullYear() < 2020) return null;
      return d;
    } catch {
      return null;
    }
  };

  const fsDate = toValidDate(firestoreCreatedAt);
  const authDate = toValidDate(authCreationTime);
  if (fsDate && authDate) return authDate.getTime() < fsDate.getTime() ? authDate : fsDate;
  return fsDate || authDate || null;
};

