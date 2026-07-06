/**
 * Achievement Title System — TingleTap
 *
 * Lightweight, event-driven achievement evaluation.
 * Rules:
 *  - Evaluate only when relevant events occur (e.g. message sent).
 *  - Never poll; no background jobs; no duplicate listeners.
 *  - Unlock each title only once, with a single Firestore write per batch.
 *  - Sequential: each title requires the prior one to be unlocked first.
 *  - Reuses existing users/{uid} document — adds one `achievements` array field.
 *  - In-memory cooldown prevents redundant evaluations within the same session.
 */

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/* ── Achievement Title Definitions ───────────────────────────────────────── */
export const ACHIEVEMENT_TITLES = [
  {
    id: 'tingle_member',
    name: 'Tingle Member',
    description: 'Welcome to TingleTap! You sent your first message and completed your profile.',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 55%, #6ee7b7 100%)',
    borderColor: '#10b981',
    glowColor: 'rgba(16,185,129,0.38)',
    svg: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="20" cy="20" r="19" fill="#ecfdf5"/>
      <circle cx="20" cy="20" r="19" fill="none" stroke="#10b981" stroke-width="1.5"/>
      <circle cx="20" cy="14" r="5" fill="#059669"/>
      <path d="M10 30c0-5.5 4.5-9 10-9s10 3.5 10 9" fill="#059669"/>
      <path d="M28.5 8l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="#34d399"/>
    </svg>`,
  },
  {
    id: 'tingle_explorer',
    name: 'Tingle Explorer',
    description: '2 months of active participation. You are truly exploring TingleTap!',
    color: '#d97706',
    gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 55%, #fcd34d 100%)',
    borderColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.38)',
    svg: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="20" cy="20" r="19" fill="#fefce8"/>
      <circle cx="20" cy="20" r="19" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
      <circle cx="20" cy="20" r="8" fill="none" stroke="#d97706" stroke-width="1.5"/>
      <circle cx="20" cy="20" r="2.5" fill="#f59e0b"/>
      <path d="M20 10v4M20 26v4M10 20h4M26 20h4" stroke="#d97706" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M20 10l2.5 8h-5z" fill="#ef4444"/>
      <path d="M20 30l-2.5-8h5z" fill="#9ca3af"/>
      <path d="M10 20l8-2.5v5z" fill="#9ca3af"/>
      <path d="M30 20l-8 2.5v-5z" fill="#ef4444"/>
    </svg>`,
  },
  {
    id: 'tingle_star',
    name: 'Tingle Star',
    description: '6 months of meaningful participation. You shine bright in our community!',
    color: '#b45309',
    gradient: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 55%, #fde047 100%)',
    borderColor: '#eab308',
    glowColor: 'rgba(234,179,8,0.42)',
    svg: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="20" cy="20" r="19" fill="#fefce8"/>
      <circle cx="20" cy="20" r="19" fill="none" stroke="#eab308" stroke-width="1.5"/>
      <path d="M20 8l3.1 8.2 8.9 1.3-6.5 6.3 1.5 8.7L20 28.2l-7 3.3 1.5-8.7-6.5-6.3 8.9-1.3z" fill="#f59e0b"/>
      <path d="M20 11l2.3 6.2 6.5 1-4.8 4.6 1.1 6.5L20 26l-5.1 2.3 1.1-6.5-4.8-4.6 6.5-1z" fill="#fde047"/>
      <circle cx="20" cy="20" r="2.8" fill="#f59e0b"/>
    </svg>`,
  },
  {
    id: 'tingle_icon',
    name: 'Tingle Icon',
    description: '9 months of long-term active participation. A true TingleTap icon!',
    color: '#0369a1',
    gradient: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 55%, #7dd3fc 100%)',
    borderColor: '#0ea5e9',
    glowColor: 'rgba(14,165,233,0.38)',
    svg: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="20" cy="20" r="19" fill="#f0f9ff"/>
      <circle cx="20" cy="20" r="19" fill="none" stroke="#0ea5e9" stroke-width="1.5"/>
      <path d="M20 8l11 9.5-4.5 13.5H13.5L9 17.5z" fill="#38bdf8"/>
      <path d="M9 17.5h22" stroke="#0284c7" stroke-width="1.3" fill="none"/>
      <path d="M14 8l-2 9.5M26 8l2 9.5" stroke="#0284c7" stroke-width="1" fill="none" opacity=".6"/>
      <path d="M20 8l-6 9.5h12z" fill="#bae6fd" opacity=".8"/>
      <path d="M13.5 17.5l3 13M26.5 17.5l-3 13" stroke="#0284c7" stroke-width="1" fill="none" opacity=".4"/>
    </svg>`,
  },
  {
    id: 'tingle_legend',
    name: 'Tingle Legend',
    description: '12 months of consistent positive participation. You are a TingleTap Legend!',
    color: '#6d28d9',
    gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)',
    borderColor: '#7c3aed',
    glowColor: 'rgba(124,58,237,0.42)',
    svg: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
      <circle cx="20" cy="20" r="19" fill="#faf5ff"/>
      <circle cx="20" cy="20" r="19" fill="none" stroke="#7c3aed" stroke-width="1.5"/>
      <path d="M14 10h12v9a6 6 0 01-12 0V10z" fill="#a855f7"/>
      <path d="M10 11h4v5.5a3.5 3.5 0 01-4-3.5V11zM26 11h4v2a3.5 3.5 0 01-4 3.5V11z" fill="#c084fc"/>
      <rect x="18.5" y="25" width="3" height="4" fill="#a855f7"/>
      <rect x="14.5" y="29" width="11" height="2.5" rx="1.25" fill="#7c3aed"/>
      <path d="M20 13l1.4 4.1H26l-3.5 2.5 1.3 4.1-3.8-2.7-3.8 2.7 1.3-4.1L14 17.1h4.6z" fill="#fbbf24"/>
    </svg>`,
  },
];

/* ── Unlock criteria (sequential) ────────────────────────────────────────── */
const CRITERIA = [
  { id: 'tingle_member',   ageDays: 0,   msgCount: 1,   requiresProfile: true  },
  { id: 'tingle_explorer', ageDays: 60,  msgCount: 10,  requiresProfile: false },
  { id: 'tingle_star',     ageDays: 180, msgCount: 50,  requiresProfile: false },
  { id: 'tingle_icon',     ageDays: 270, msgCount: 150, requiresProfile: false },
  { id: 'tingle_legend',   ageDays: 365, msgCount: 300, requiresProfile: false },
];

/* ── Per-session evaluation cooldown (45 s per uid) ──────────────────────── */
// Short cooldown so the first qualifying message unlocks immediately,
// while rapid successive sends don't trigger repeated evaluations.
// The actual Firestore write only fires when there are new achievements.
const _evalCache = new Map(); // uid → lastEvalTimestamp ms
const COOLDOWN_MS = 45 * 1000;

/**
 * Evaluate and grant newly-earned achievement titles for a registered user.
 * Called event-driven (on message send). One Firestore write per new batch.
 *
 * @param {string}  uid         - Firebase Auth uid
 * @param {object}  userProfile - Firestore user document data (incl. trustData)
 * @param {object}  [opts]
 * @param {boolean} [opts.justSentMessage=false] - True when called from handleSendMessage
 * @returns {Promise<string[]>} Newly-unlocked achievement IDs (empty if none)
 */
export const checkAndGrantAchievements = async (uid, userProfile, opts = {}) => {
  const { justSentMessage = false } = opts;

  // Only registered (non-guest) users earn achievements
  if (!uid || !userProfile || userProfile.isGuest || userProfile.role === 'guest') return [];

  // Fast path: already earned all titles — skip entirely
  const current = Array.isArray(userProfile.achievements) ? userProfile.achievements : [];
  if (current.length >= CRITERIA.length) return [];

  // Owner fast-path: grant all titles immediately as a platform perk
  if (userProfile.role === 'owner') {
    const toGrant = CRITERIA.map(c => c.id).filter(id => !current.includes(id));
    if (toGrant.length === 0) return [];
    const updated = [...new Set([...current, ...toGrant])];
    try {
      await updateDoc(doc(db, 'users', uid), { achievements: updated });
    } catch (err) {
      console.error('[Achievements] Owner grant failed:', err);
      return [];
    }
    return toGrant;
  }

  // In-session cooldown: prevents redundant evaluations on rapid sends
  const lastEval = _evalCache.get(uid) || 0;
  if (Date.now() - lastEval < COOLDOWN_MS) return [];
  _evalCache.set(uid, Date.now());

  // Account age
  const createdRaw = userProfile.createdAt;
  const createdMs = createdRaw
    ? new Date(createdRaw?.toDate?.() || createdRaw).getTime()
    : Date.now();
  const accountAgeDays = (Date.now() - createdMs) / 86400000;

  // Message count (add 1 for just-sent message before batch flush)
  const msgCount = (userProfile.trustData?.messagesCount || 0) + (justSentMessage ? 1 : 0);

  const profileComplete =
    !!userProfile.gender &&
    userProfile.gender !== 'Not specified' &&
    userProfile.gender !== '';

  const toGrant = [];

  for (let i = 0; i < CRITERIA.length; i++) {
    const c = CRITERIA[i];

    // Already unlocked
    if (current.includes(c.id) || toGrant.includes(c.id)) continue;

    // Sequential gate: require previous title
    if (i > 0) {
      const prevId = CRITERIA[i - 1].id;
      if (!current.includes(prevId) && !toGrant.includes(prevId)) break;
    }

    const ageOk     = accountAgeDays >= c.ageDays;
    const msgOk     = msgCount >= c.msgCount;
    const profileOk = !c.requiresProfile || profileComplete;

    if (ageOk && msgOk && profileOk) {
      toGrant.push(c.id);
    } else {
      break; // stop — higher titles can't be earned if this one isn't
    }
  }

  if (toGrant.length === 0) return [];

  // Single Firestore write for all newly unlocked titles
  const updated = [...new Set([...current, ...toGrant])];
  try {
    await updateDoc(doc(db, 'users', uid), { achievements: updated });
  } catch (err) {
    console.error('[Achievements] Failed to persist:', err);
    _evalCache.delete(uid); // Allow retry on next event
    return [];
  }

  return toGrant;
};

/**
 * Returns ACHIEVEMENT_TITLES with an `unlocked` boolean for each,
 * suitable for rendering in the profile modal.
 */
export const getAchievementsDisplay = (userProfile) => {
  const unlocked = Array.isArray(userProfile?.achievements) ? userProfile.achievements : [];
  return ACHIEVEMENT_TITLES.map(t => ({ ...t, unlocked: unlocked.includes(t.id) }));
};
