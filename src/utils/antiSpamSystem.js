import { db, auth } from '../firebase/config';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { updateTrustScore } from './trustSystem';

const messageHistory = new Map();
const mutedUsers = new Map();
const slowModeRooms = new Map();

const SPAM_CONFIG = {
  RATE_LIMIT_WINDOW_MS: 10000,
  RATE_LIMIT_MAX_MESSAGES: 6,
  EMOJI_FLOOD_THRESHOLD: 8,
  CAPS_PERCENTAGE_THRESHOLD: 0.7,
  CAPS_MIN_LENGTH: 8,
  REPEAT_MESSAGE_COUNT: 3,
  REPEAT_SIMILARITY_THRESHOLD: 0.85,
  COOLDOWN_DURATION_MS: 15000,
  AUTO_MUTE_DURATION_MS: 5 * 60 * 1000,
  SLOW_MODE_DELAY_MS: 3000,
  VIOLATIONS_BEFORE_MUTE: 3,
};

const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;

// FIX M-10: For messages longer than 100 chars, Levenshtein is O(N×M) — 40 000+
// cell fills per comparison when both strings are ~200 chars, repeated for every
// entry in the 10-message history window. Use fast Jaccard token-overlap instead
// for long messages; Levenshtein is still used for short messages where its
// character-level precision matters most for catching near-duplicate spam.
const stringSimilarity = (a, b) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;

  // Fast path for long messages: Jaccard word-overlap (O(N+M))
  if (la.length > 100 || lb.length > 100) {
    const wordsA = new Set(la.split(/\s+/).filter(Boolean));
    const wordsB = new Set(lb.split(/\s+/).filter(Boolean));
    let intersection = 0;
    wordsA.forEach(w => { if (wordsB.has(w)) intersection++; });
    const union = wordsA.size + wordsB.size - intersection;
    return union === 0 ? 1 : intersection / union;
  }

  // Levenshtein for short messages (≤100 chars)
  const longer = la.length > lb.length ? la : lb;
  const shorter = la.length > lb.length ? lb : la;
  if (longer.length === 0) return 1;
  const editDistance = (s1, s2) => {
    const dp = Array.from({ length: s1.length + 1 }, (_, i) =>
      Array.from({ length: s2.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        dp[i][j] = s1[i - 1] === s2[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[s1.length][s2.length];
  };
  return (longer.length - editDistance(longer, shorter)) / longer.length;
};

export const initUserSpamData = (uid) => {
  if (!messageHistory.has(uid)) {
    messageHistory.set(uid, {
      timestamps: [],
      recentMessages: [],
      violations: 0,
      cooldownUntil: 0,
      lastMessageTime: 0
    });
  }
  return messageHistory.get(uid);
};

export const isUserMuted = (uid) => {
  const muteData = mutedUsers.get(uid);
  if (!muteData) return false;
  if (Date.now() < muteData.until) return true;
  mutedUsers.delete(uid);
  return false;
};

export const getMuteTimeRemaining = (uid) => {
  const muteData = mutedUsers.get(uid);
  if (!muteData) return 0;
  const remaining = muteData.until - Date.now();
  return remaining > 0 ? remaining : 0;
};

export const setRoomSlowMode = (roomId, enabled, delayMs = SPAM_CONFIG.SLOW_MODE_DELAY_MS) => {
  if (enabled) {
    slowModeRooms.set(roomId, { delayMs, lastMessage: {} });
  } else {
    slowModeRooms.delete(roomId);
  }
};

export const checkSlowMode = (roomId, uid) => {
  const slowMode = slowModeRooms.get(roomId);
  if (!slowMode) return { allowed: true };
  const lastMsg = slowMode.lastMessage[uid] || 0;
  const elapsed = Date.now() - lastMsg;
  if (elapsed < slowMode.delayMs) {
    return {
      allowed: false,
      waitMs: slowMode.delayMs - elapsed,
      type: 'slow_mode'
    };
  }
  slowMode.lastMessage[uid] = Date.now();
  return { allowed: true };
};

// violationDetails (optional) lets a caller that just logged a violation and is
// now auto-muting in the same breath fold both into a single updateDoc call
// instead of two sequential writes.
const applyAutoMute = async (uid, durationMs, reason, violationDetails = null) => {
  const until = Date.now() + durationMs;
  mutedUsers.set(uid, { until, reason });

  try {
    const userRef = doc(db, 'users', uid);
    const nowIso = new Date().toISOString();
    const violationEntries = violationDetails
      ? [
          { type: violationDetails.violationType, message: violationDetails.messageText?.slice(0, 100), timestamp: nowIso },
          { reason, timestamp: nowIso, autoMuted: true }
        ]
      : [{ reason, timestamp: nowIso, autoMuted: true }];

    await updateDoc(userRef, {
      'mutedInfo.isMuted': true,
      'mutedInfo.mutedBy': 'AutoMod',
      'mutedInfo.muteReason': reason,
      'mutedInfo.muteTime': nowIso,
      'mutedInfo.muteUntil': new Date(until).toISOString(),
      spamViolations: arrayUnion(...violationEntries)
    });
    if (violationDetails) updateTrustScore(uid, 'SPAM_VIOLATION');
    updateTrustScore(uid, 'MUTE_RECEIVED');
  } catch (err) {
    console.error('[AntiSpam] Error applying auto-mute:', err);
  }

  // FIX M-09: Snapshot the expected muteUntil timestamp at the moment we set the mute.
  // The auto-unmute timer checks both mutedBy AND muteUntil so that an admin who
  // manually extends the mute (changing muteUntil forward) prevents this timer from
  // firing early and silently reverting their action.
  const expectedMuteUntilIso = new Date(until).toISOString();

  setTimeout(async () => {
    mutedUsers.delete(uid);
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const info = data.mutedInfo || {};
        // Only clear if: (a) still AutoMod-owned AND (b) muteUntil matches
        // what THIS timer originally set — guards against admin extending the mute.
        if (info.mutedBy === 'AutoMod' && info.muteUntil === expectedMuteUntilIso) {
          await updateDoc(userRef, {
            'mutedInfo.isMuted': false,
            'mutedInfo.mutedBy': null,
            'mutedInfo.muteReason': null,
            'mutedInfo.muteTime': null,
            'mutedInfo.muteUntil': null
          });
        }
      }
    } catch (err) {
      console.error('[AntiSpam] Error auto-unmuting:', err);
    }
  }, durationMs);

  return { until, reason };
};

const logSpamViolation = async (uid, violationType, messageText) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      spamViolations: arrayUnion({
        type: violationType,
        message: messageText?.slice(0, 100),
        timestamp: new Date().toISOString()
      })
    });
    updateTrustScore(uid, 'SPAM_VIOLATION');
  } catch (err) {
    console.error('[AntiSpam] Error logging violation:', err);
  }
};

export const checkSpam = async (uid, messageText, roomId) => {
  if (!uid || !messageText) return { isSpam: false };

  const data = initUserSpamData(uid);
  const now = Date.now();
  const text = messageText.trim();

  if (isUserMuted(uid)) {
    const remaining = getMuteTimeRemaining(uid);
    const mins = Math.ceil(remaining / 60000);
    return {
      isSpam: true,
      type: 'muted',
      message: `You are muted for ${mins} more minute${mins !== 1 ? 's' : ''} by AutoMod.`
    };
  }

  if (data.cooldownUntil > now) {
    const remaining = Math.ceil((data.cooldownUntil - now) / 1000);
    return {
      isSpam: true,
      type: 'cooldown',
      message: `Please wait ${remaining} second${remaining !== 1 ? 's' : ''} before sending another message.`
    };
  }

  const slowModeCheck = checkSlowMode(roomId, uid);
  if (!slowModeCheck.allowed) {
    const secs = Math.ceil(slowModeCheck.waitMs / 1000);
    return {
      isSpam: true,
      type: 'slow_mode',
      message: `Slow mode is on. Wait ${secs} second${secs !== 1 ? 's' : ''}.`
    };
  }

  data.timestamps = data.timestamps.filter(ts => now - ts < SPAM_CONFIG.RATE_LIMIT_WINDOW_MS);
  data.timestamps.push(now);

  if (data.timestamps.length > SPAM_CONFIG.RATE_LIMIT_MAX_MESSAGES) {
    data.violations++;
    data.cooldownUntil = now + SPAM_CONFIG.COOLDOWN_DURATION_MS;

    if (data.violations >= SPAM_CONFIG.VIOLATIONS_BEFORE_MUTE) {
      const muteDuration = SPAM_CONFIG.AUTO_MUTE_DURATION_MS * Math.pow(2, data.violations - SPAM_CONFIG.VIOLATIONS_BEFORE_MUTE);
      // Combined into a single write — logSpamViolation's entry is folded into
      // the same updateDoc as the mute, instead of two sequential writes.
      await applyAutoMute(uid, muteDuration, 'Automatic mute: sending messages too fast', {
        violationType: 'RATE_LIMIT',
        messageText: text
      });
      data.violations = 0;
      return {
        isSpam: true,
        type: 'auto_muted',
        message: `You have been automatically muted for ${Math.round(muteDuration / 60000)} minute(s) for spamming.`
      };
    }

    await logSpamViolation(uid, 'RATE_LIMIT', text);
    return {
      isSpam: true,
      type: 'rate_limit',
      message: `You're sending messages too fast! Please slow down.`
    };
  }

  const emojiMatches = text.match(EMOJI_REGEX) || [];
  if (emojiMatches.length >= SPAM_CONFIG.EMOJI_FLOOD_THRESHOLD) {
    data.violations++;
    await logSpamViolation(uid, 'EMOJI_FLOOD', text);
    return {
      isSpam: true,
      type: 'emoji_flood',
      message: `Please don't flood the chat with emojis! 🚫`
    };
  }

  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= SPAM_CONFIG.CAPS_MIN_LENGTH) {
    const capsRatio = (letters.match(/[A-Z]/g) || []).length / letters.length;
    if (capsRatio >= SPAM_CONFIG.CAPS_PERCENTAGE_THRESHOLD) {
      data.violations++;
      await logSpamViolation(uid, 'EXCESSIVE_CAPS', text);
      return {
        isSpam: true,
        type: 'excessive_caps',
        message: `Please don't use excessive CAPITAL LETTERS!`
      };
    }
  }

  if (data.recentMessages.length >= SPAM_CONFIG.REPEAT_MESSAGE_COUNT) {
    const repeatCount = data.recentMessages.filter(prev =>
      stringSimilarity(prev, text) >= SPAM_CONFIG.REPEAT_SIMILARITY_THRESHOLD
    ).length;
    if (repeatCount >= SPAM_CONFIG.REPEAT_MESSAGE_COUNT - 1) {
      data.violations++;
      data.cooldownUntil = now + SPAM_CONFIG.COOLDOWN_DURATION_MS;
      await logSpamViolation(uid, 'REPEAT_MESSAGE', text);
      return {
        isSpam: true,
        type: 'repeat_message',
        message: `Stop copy-pasting the same message!`
      };
    }
  }

  data.recentMessages.push(text);
  if (data.recentMessages.length > 10) data.recentMessages.shift();
  data.lastMessageTime = now;

  return { isSpam: false };
};

export const clearSpamData = (uid) => {
  messageHistory.delete(uid);
  mutedUsers.delete(uid);
};
