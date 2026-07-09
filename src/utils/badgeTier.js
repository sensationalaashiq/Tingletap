/**
 * Badge Tier System — centralized access-level computation.
 *
 * Tiers (lowest → highest):
 *   guest  — anonymous / Stree / Purush / Navrang
 *   member — registered user, no badge
 *   tier1  — Crown Prince (gold_knight), Ruby Queen (ruby_queen)
 *   tier2  — Platinum Lord (platinum_lord), Emerald Empress (emerald_empress)
 *   tier3  — Diamond King (diamond_king), Sapphire Goddess (sapphire_goddess), RJ badge
 *   staff  — owner, admin, moderator (full access, always)
 */

export const TIER_WEIGHTS = {
  guest:  0,
  member: 1,
  tier1:  2,
  tier2:  3,
  tier3:  4,
  staff:  5,
};

const TIER3_BADGES = new Set([
  'diamond_king', 'sapphire_goddess',
  // RJ / verified creator variants
  'rj', 'verified_rj', 'streamers', 'content_creator',
]);
const TIER2_BADGES = new Set(['platinum_lord', 'emerald_empress']);
const TIER1_BADGES = new Set(['gold_knight', 'ruby_queen']);
const STAFF_ROLES  = new Set(['owner', 'admin', 'moderator']);

/**
 * Returns the user's access tier string.
 * @param {string|null} badge   — user's badge field value
 * @param {string|null} role    — user's role field value
 * @param {boolean}     isGuest — whether the user is a guest
 * @returns {'guest'|'member'|'tier1'|'tier2'|'tier3'|'staff'}
 */
export const getBadgeTier = (badge, role, isGuest) => {
  if (isGuest) return 'guest';
  const r = (role || '').toLowerCase();
  if (STAFF_ROLES.has(r)) return 'staff';
  if (!badge || badge === '') return 'member';
  if (TIER3_BADGES.has(badge)) return 'tier3';
  if (TIER2_BADGES.has(badge)) return 'tier2';
  if (TIER1_BADGES.has(badge)) return 'tier1';
  return 'tier1'; // any unrecognized badge → minimum tier1 access
};

/**
 * Returns true when the user's tier is >= requiredTier.
 * @param {string|null} badge
 * @param {string|null} role
 * @param {boolean}     isGuest
 * @param {'guest'|'member'|'tier1'|'tier2'|'tier3'|'staff'} requiredTier
 */
export const hasMinTier = (badge, role, isGuest, requiredTier) =>
  TIER_WEIGHTS[getBadgeTier(badge, role, isGuest)] >= TIER_WEIGHTS[requiredTier];

/** Friendly label shown in "upgrade" prompts. */
export const TIER_UPGRADE_LABEL = {
  guest:  'Register to unlock this feature',
  member: 'Get a badge to unlock this feature',
  tier1:  'Upgrade to Platinum Lord or higher',
  tier2:  'Upgrade to Diamond King or higher',
  tier3:  'Available for Diamond King, Sapphire Goddess & RJ',
  staff:  '',
};
