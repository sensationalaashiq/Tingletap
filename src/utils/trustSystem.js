import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const TRUST_RANKS = {
  squire: {
    id: 'squire',
    name: 'Squire',
    emoji: '🛡️',
    minScore: 0,
    maxScore: 20,
    color: '#8B7355',
    gradient: 'linear-gradient(135deg, #8B7355, #C4A882)',
    glowColor: 'rgba(139,115,85,0.4)',
    description: 'A newcomer to the realm',
    perks: ['Basic profile access', 'Standard chat colors'],
    frameColor: '#8B7355',
    animated: false,
    dailyMessageLimit: 100,
    prestige: false
  },
  noble: {
    id: 'noble',
    name: 'Noble',
    emoji: '⚜️',
    minScore: 21,
    maxScore: 40,
    color: '#C0C0C0',
    gradient: 'linear-gradient(135deg, #A8A8A8, #E8E8E8, #A8A8A8)',
    glowColor: 'rgba(192,192,192,0.5)',
    description: 'A trusted member of the court',
    perks: ['Custom profile frame', 'Extended chat colors', 'Profile decorations'],
    frameColor: '#C0C0C0',
    animated: false,
    dailyMessageLimit: 200,
    prestige: false
  },
  regent: {
    id: 'regent',
    name: 'Regent',
    emoji: '👑',
    minScore: 41,
    maxScore: 60,
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #F7B733, #FC4A1A, #FFD700)',
    glowColor: 'rgba(255,215,0,0.6)',
    description: 'A distinguished ruler of the land',
    perks: ['Premium profile frame', 'Exclusive chat colors', 'Profile highlights', 'Priority status'],
    frameColor: '#FFD700',
    animated: true,
    dailyMessageLimit: 500,
    prestige: false
  },
  monarch: {
    id: 'monarch',
    name: 'Monarch',
    emoji: '🏰',
    minScore: 61,
    maxScore: 80,
    color: '#9B59B6',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2, #9B59B6)',
    glowColor: 'rgba(155,89,182,0.7)',
    description: 'A great sovereign of TingleTap',
    perks: ['Animated badge effects', 'Prestige profile frame', 'All exclusive colors', 'Profile glow effect', 'VIP status'],
    frameColor: '#9B59B6',
    animated: true,
    dailyMessageLimit: 1000,
    prestige: true
  },
  eternal_crown: {
    id: 'eternal_crown',
    name: 'Eternal Crown',
    emoji: '💎',
    minScore: 81,
    maxScore: 100,
    color: '#00D4FF',
    gradient: 'linear-gradient(135deg, #00D4FF, #7B2FBE, #FF6B6B, #FFD700)',
    glowColor: 'rgba(0,212,255,0.8)',
    description: 'The highest honor of the realm',
    perks: ['All perks unlocked', 'Diamond prestige badge', 'Legendary profile aura', 'Infinite daily messages', 'Supreme royal title'],
    frameColor: '#00D4FF',
    animated: true,
    dailyMessageLimit: Infinity,
    prestige: true
  }
};

export const getRankFromScore = (score) => {
  const s = Math.max(0, Math.min(100, score || 0));
  if (s <= 20) return TRUST_RANKS.squire;
  if (s <= 40) return TRUST_RANKS.noble;
  if (s <= 60) return TRUST_RANKS.regent;
  if (s <= 80) return TRUST_RANKS.monarch;
  return TRUST_RANKS.eternal_crown;
};

export const TRUST_SCORE_CHANGES = {
  MESSAGE_SENT: 0.05,
  ACCOUNT_AGE_DAILY: 0.2,
  WARNING_RECEIVED: -5,
  MUTE_RECEIVED: -8,
  SPAM_VIOLATION: -3,
  ABUSE_VIOLATION: -10,
  BAN_ISSUED: -30,
  REPORT_RESOLVED: -2,
  CLEAN_WEEK: 1,
  CLEAN_MONTH: 3,
  FIRST_LOGIN: 0,
};

export const getInitialTrustData = () => ({
  trustScore: 10,
  trustRank: 'squire',
  trustData: {
    messagesCount: 0,
    violationsCount: 0,
    warningsCount: 0,
    muteCount: 0,
    spamCount: 0,
    abuseCount: 0,
    lastViolation: null,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    lastCleanCheck: new Date().toISOString()
  }
});

// ─────────────────────────────────────────────────────────────────
// IN-MEMORY TRUST DATA CACHE
// Eliminates per-event Firestore getDoc calls.
// TTL: 60 seconds — stale data for trust scoring is acceptable.
// Cache is invalidated immediately after any write to the user's
// trust fields, so subsequent reads always get fresh data.
// ─────────────────────────────────────────────────────────────────
const _trustCache = new Map(); // uid → { data, ts }
const TRUST_CACHE_TTL = 60_000; // 60 seconds

const _getCachedUserData = async (uid) => {
  const now = Date.now();
  const hit = _trustCache.get(uid);
  if (hit && (now - hit.ts) < TRUST_CACHE_TTL) return hit.data;
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  _trustCache.set(uid, { data, ts: now });
  return data;
};

const _setCacheData = (uid, data) => {
  _trustCache.set(uid, { data, ts: Date.now() });
};

const _invalidateCache = (uid) => {
  _trustCache.delete(uid);
};

// In-memory accumulator: batches MESSAGE_SENT increments, flushes every 5 minutes
const _msgSentCache = {};

export const getUserTrustData = async (uid) => {
  try {
    const data = await _getCachedUserData(uid);
    if (!data) return null;
    return {
      trustScore: data.trustScore ?? 10,
      trustRank: data.trustRank ?? 'squire',
      trustData: data.trustData ?? {}
    };
  } catch (err) {
    console.error('[TrustSystem] Error getting trust data:', err);
    return null;
  }
};

export const updateTrustScore = async (uid, changeType, customDelta = null) => {
  try {
    if (!uid) return;
    const delta = customDelta !== null ? customDelta : (TRUST_SCORE_CHANGES[changeType] || 0);

    // ── MESSAGE_SENT: accumulate locally, flush to Firestore every 5 minutes ──
    if (changeType === 'MESSAGE_SENT') {
      if (!_msgSentCache[uid]) {
        _msgSentCache[uid] = { pendingDelta: 0, pendingCount: 0, flushTimer: null };
      }
      const cache = _msgSentCache[uid];
      cache.pendingDelta += delta;
      cache.pendingCount += 1;
      if (cache.flushTimer) return;
      cache.flushTimer = setTimeout(async () => {
        const { pendingDelta, pendingCount } = cache;
        delete _msgSentCache[uid];
        try {
          // Use cache if fresh; otherwise fetch once
          const data = await _getCachedUserData(uid);
          if (!data) return;
          const newScore = Math.max(0, Math.min(100, (data.trustScore ?? 10) + pendingDelta));
          const updates = {
            trustScore: newScore,
            trustRank: getRankFromScore(newScore).id,
            'trustData.messagesCount': (data.trustData?.messagesCount || 0) + pendingCount,
            'trustData.lastUpdated': new Date().toISOString()
          };
          await updateDoc(doc(db, 'users', uid), updates);
          // Update cache with new values rather than invalidating
          _setCacheData(uid, { ...data, ...updates, trustScore: newScore, trustRank: getRankFromScore(newScore).id });
        } catch (err) {
          console.error('[TrustSystem] Error flushing MESSAGE_SENT batch:', err);
        }
      }, 5 * 60 * 1000);
      return;
    }

    // ── All other event types (admin-triggered, rare) ──
    const data = await _getCachedUserData(uid);
    if (!data) return;

    const currentScore = data.trustScore ?? 10;
    const currentTrustData = data.trustData ?? {};
    const newScore = Math.max(0, Math.min(100, currentScore + delta));
    const newRank = getRankFromScore(newScore).id;

    const updates = {
      trustScore: newScore,
      trustRank: newRank,
      'trustData.lastUpdated': new Date().toISOString()
    };

    if (changeType === 'WARNING_RECEIVED') {
      updates['trustData.warningsCount'] = (currentTrustData.warningsCount || 0) + 1;
      updates['trustData.violationsCount'] = (currentTrustData.violationsCount || 0) + 1;
      updates['trustData.lastViolation'] = new Date().toISOString();
    } else if (changeType === 'MUTE_RECEIVED') {
      updates['trustData.muteCount'] = (currentTrustData.muteCount || 0) + 1;
      updates['trustData.violationsCount'] = (currentTrustData.violationsCount || 0) + 1;
      updates['trustData.lastViolation'] = new Date().toISOString();
    } else if (changeType === 'SPAM_VIOLATION') {
      updates['trustData.spamCount'] = (currentTrustData.spamCount || 0) + 1;
      updates['trustData.violationsCount'] = (currentTrustData.violationsCount || 0) + 1;
      updates['trustData.lastViolation'] = new Date().toISOString();
    } else if (changeType === 'ABUSE_VIOLATION') {
      updates['trustData.abuseCount'] = (currentTrustData.abuseCount || 0) + 1;
      updates['trustData.violationsCount'] = (currentTrustData.violationsCount || 0) + 1;
      updates['trustData.lastViolation'] = new Date().toISOString();
    }

    await updateDoc(doc(db, 'users', uid), updates);
    // Invalidate so next read gets the fresh server data
    _invalidateCache(uid);
    return { newScore, newRank, delta };
  } catch (err) {
    console.error('[TrustSystem] Error updating trust score:', err);
  }
};

export const applyAccountAgeTrustBonus = async (uid, createdAt) => {
  try {
    if (!uid || !createdAt) return;

    const data = await _getCachedUserData(uid);
    if (!data) return;

    const lastCheck = data.trustData?.lastCleanCheck;
    const now = Date.now();

    if (lastCheck) {
      const lastCheckMs = new Date(lastCheck).getTime();
      const daysSinceCheck = (now - lastCheckMs) / (1000 * 60 * 60 * 24);
      if (daysSinceCheck < 1) return;
    }

    const createdMs = new Date(createdAt).getTime();
    const accountAgeDays = (now - createdMs) / (1000 * 60 * 60 * 24);
    const lastViolation = data.trustData?.lastViolation;
    let bonus = TRUST_SCORE_CHANGES.ACCOUNT_AGE_DAILY;

    if (lastViolation) {
      const daysSinceViolation = (now - new Date(lastViolation).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceViolation >= 7) bonus += TRUST_SCORE_CHANGES.CLEAN_WEEK;
      if (daysSinceViolation >= 30) bonus += TRUST_SCORE_CHANGES.CLEAN_MONTH;
    } else if (accountAgeDays >= 7) {
      bonus += TRUST_SCORE_CHANGES.CLEAN_WEEK;
    }

    // Invalidate before calling updateTrustScore so it fetches fresh if needed
    _invalidateCache(uid);
    await updateTrustScore(uid, 'ACCOUNT_AGE_DAILY', bonus);
    await updateDoc(doc(db, 'users', uid), { 'trustData.lastCleanCheck': new Date().toISOString() });
    _invalidateCache(uid);
  } catch (err) {
    console.error('[TrustSystem] Error applying age bonus:', err);
  }
};

export const initializeUserTrust = async (uid) => {
  try {
    const data = await _getCachedUserData(uid);
    if (!data) return;
    if (data.trustScore !== undefined) return;
    await updateDoc(doc(db, 'users', uid), getInitialTrustData());
    _invalidateCache(uid);
  } catch (err) {
    console.error('[TrustSystem] Error initializing trust:', err);
  }
};
