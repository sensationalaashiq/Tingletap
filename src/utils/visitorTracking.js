/**
 * TingleTap — Real-time Visitor Tracking via Firebase RTDB
 *
 * RTDB paths:
 *   siteVisitors/active/{sessionId}   — live session (auto-deleted on disconnect)
 *   siteVisitors/daily/{YYYY-MM-DD}   — daily unique-session counter
 *
 * RTDB Rules needed (add in Firebase Console > Realtime Database > Rules):
 * {
 *   "rules": {
 *     "siteVisitors": {
 *       ".read": "auth != null",
 *       "active": { "$sid": { ".write": true, ".validate": "newData.hasChildren(['device','browser','joinedAt'])" } },
 *       "daily":  { "$date": { ".write": true } }
 *     }
 *   }
 * }
 */

import { ref, set, onDisconnect, runTransaction, update } from 'firebase/database';
import { rtdb } from '../firebase/config';

// ── Session ID (persisted for this browser tab only) ──────────────────────────
const getSessionId = () => {
  let sid = sessionStorage.getItem('_tt_vsid');
  if (!sid) {
    sid = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('_tt_vsid', sid);
  }
  return sid;
};

// ── Device detection ──────────────────────────────────────────────────────────
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

// ── Browser detection ─────────────────────────────────────────────────────────
const getBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  if (ua.includes('Firefox/')) return 'Firefox';
  return 'Other';
};

const todayKey = () => new Date().toISOString().slice(0, 10);

let _initialized = false;

// ── Main init — call once on app start ────────────────────────────────────────
export const initVisitorTracking = async ({ uid = null, userType = 'anonymous', page = '/' } = {}) => {
  if (_initialized) return;
  _initialized = true;

  const sid = getSessionId();
  const activeRef = ref(rtdb, `siteVisitors/active/${sid}`);

  try {
    await set(activeRef, {
      uid:       uid || null,
      userType,                // 'registered' | 'guest' | 'anonymous'
      page,
      device:    getDeviceType(),
      browser:   getBrowser(),
      joinedAt:  Date.now(),
    });

    // Auto-remove when the tab/browser closes
    onDisconnect(activeRef).remove();

    // Increment today's counter (safe concurrent increment via transaction)
    const dailyRef = ref(rtdb, `siteVisitors/daily/${todayKey()}`);
    await runTransaction(dailyRef, (cur) => (cur === null ? 1 : cur + 1));
  } catch (err) {
    // Fails if RTDB rules don't allow siteVisitors writes yet — see note above
    console.warn('[VisitorTracking] RTDB write blocked (update RTDB rules):', err?.code);
  }
};

// ── Call on every route change ────────────────────────────────────────────────
export const updateVisitorPage = (page) => {
  if (!_initialized) return;
  const sid = getSessionId();
  update(ref(rtdb, `siteVisitors/active/${sid}`), { page }).catch(() => {});
};

// ── Call when user logs in / becomes guest ────────────────────────────────────
export const updateVisitorIdentity = (uid, userType) => {
  if (!_initialized) return;
  const sid = getSessionId();
  update(ref(rtdb, `siteVisitors/active/${sid}`), {
    uid: uid || null,
    userType,
  }).catch(() => {});
};
