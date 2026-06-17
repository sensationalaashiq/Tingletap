import { db } from '../firebase/config';
import { doc, getDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { updateTrustScore } from './trustSystem';

const ABUSE_WORDS_EN = [
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'ass', 'cunt', 'dick', 'cock', 'pussy',
  'whore', 'slut', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'idiot', 'moron', 'stupid',
  'dumbass', 'motherfucker', 'fucker', 'prick', 'wanker', 'twat', 'bollocks', 'arse',
  'jackass', 'douchebag', 'scumbag', 'loser', 'trash', 'garbage', 'screw you', 'go to hell',
  'kill yourself', 'kys', 'die', 'i will kill', 'i\'ll kill', 'gonna kill', 'threat',
  'rape', 'molest', 'pedophile', 'pedo', 'abuse', 'harass',
  'ugly', 'fat pig', 'fat bitch', 'dumb bitch', 'stupid bitch', 'worthless',
];

const ABUSE_WORDS_HI = [
  'madarchod', 'behenchod', 'chutiya', 'bhosdike', 'bhosdi', 'randi', 'gaandu', 'gandu',
  'loda', 'lund', 'chut', 'bhen ke lode', 'teri maa', 'maa ki aankh', 'maa ka', 'baap ka',
  'harami', 'kamina', 'kutta', 'kutti', 'suar', 'gadha', 'ullu', 'ullu ka pattha',
  'saala', 'saali', 'haraami', 'mc', 'bc', 'mf', 'bhad mein ja', 'nikal', 'chup kar',
  'chup ho ja', 'shut up', 'bakwas', 'jhatu', 'bhadwa', 'bhadwaa', 'rande', 'randee',
  'madarchod', 'mader chod', 'bhen chod', 'behen chod', 'chod', 'chodna',
  'teri maa ki', 'teri maa ko', 'tera baap', 'bhosdiwale', 'bhosdiwala'
];

const LEET_MAP = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't',
  '@': 'a', '$': 's', '!': 'i', '+': 't', '#': 'h'
};

const normalizeLeet = (text) => {
  return text.toLowerCase().split('').map(c => LEET_MAP[c] || c).join('');
};

const removeRepeatedChars = (text) => {
  return text.replace(/(.)\1{2,}/g, '$1$1');
};

const normalizeText = (text) => {
  let normalized = text.toLowerCase();
  normalized = normalizeLeet(normalized);
  normalized = removeRepeatedChars(normalized);
  normalized = normalized.replace(/[^a-z0-9\s']/g, '');
  return normalized;
};

const HARASSMENT_PATTERNS = [
  /\b(kill\s*(your|ur|u)\s*self)\b/i,
  /\bkys\b/i,
  /\b(go\s*(die|hang|kill))\b/i,
  /\b(i('ll|\s*will|\s*gonna)\s*(kill|hurt|find|rape|beat|destroy)\s*(you|u|ur))\b/i,
  /\b(you\s*(deserve|should)\s*(to\s*)?(die|suffer|hurt))\b/i,
  /\b(nobody\s*(likes|wants)\s*(you|u))\b/i,
  /\b(ugly\s*(bitch|whore|slut|piece|fat))\b/i,
  /\b(fat\s*(ugly|stupid|dumb|bitch|pig))\b/i,
];

const offenseHistory = new Map();

const OFFENSE_CONFIG = {
  WARNING_THRESHOLD: 1,
  MUTE_THRESHOLD: 2,
  MUTE_DURATIONS: [
    5 * 60 * 1000,
    15 * 60 * 1000,
    60 * 60 * 1000,
    24 * 60 * 60 * 1000,
  ],
  SEVERE_BAN_THRESHOLD: 5,
  OFFENSE_COOLDOWN_MS: 7 * 24 * 60 * 60 * 1000,
};

export const detectAbuse = (messageText) => {
  if (!messageText || typeof messageText !== 'string') {
    return { isAbusive: false };
  }

  const normalized = normalizeText(messageText);
  const words = normalized.split(/\s+/);

  for (const word of ABUSE_WORDS_EN) {
    const wordNorm = normalizeText(word);
    if (normalized.includes(wordNorm)) {
      return {
        isAbusive: true,
        severity: word.length <= 4 ? 'low' : 'high',
        type: 'abusive_language',
        language: 'en',
        matched: word
      };
    }
  }

  for (const word of ABUSE_WORDS_HI) {
    const wordNorm = word.toLowerCase().replace(/\s+/g, '');
    const cleanNorm = normalized.replace(/\s+/g, '');
    if (cleanNorm.includes(wordNorm) || normalized.includes(word.toLowerCase())) {
      return {
        isAbusive: true,
        severity: 'high',
        type: 'abusive_language',
        language: 'hi',
        matched: word
      };
    }
  }

  for (const pattern of HARASSMENT_PATTERNS) {
    if (pattern.test(messageText)) {
      return {
        isAbusive: true,
        severity: 'severe',
        type: 'harassment_threat',
        language: 'en',
        matched: pattern.toString()
      };
    }
  }

  const capsOnlyWords = words.filter(w => w.length >= 3 && /^[A-Z]+$/.test(messageText.split(/\s+/).find(orig => orig.toLowerCase() === w) || ''));

  return { isAbusive: false };
};

const getUserOffenseCount = (uid) => {
  const data = offenseHistory.get(uid);
  if (!data) return 0;
  const now = Date.now();
  const recentOffenses = data.filter(o => now - o.time < OFFENSE_CONFIG.OFFENSE_COOLDOWN_MS);
  offenseHistory.set(uid, recentOffenses);
  return recentOffenses.length;
};

const addUserOffense = (uid, offenseData) => {
  if (!offenseHistory.has(uid)) offenseHistory.set(uid, []);
  offenseHistory.get(uid).push({ ...offenseData, time: Date.now() });
};

const applyMute = async (uid, durationMs, reason) => {
  const until = new Date(Date.now() + durationMs).toISOString();
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      'mutedInfo.isMuted': true,
      'mutedInfo.mutedBy': 'AutoMod',
      'mutedInfo.muteReason': reason,
      'mutedInfo.muteTime': new Date().toISOString(),
      'mutedInfo.muteUntil': until
    });
    updateTrustScore(uid, 'MUTE_RECEIVED');
  } catch (err) {
    console.error('[AbuseDetection] Mute error:', err);
  }
  return until;
};

const applyBan = async (uid, reason) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isBanned: true,
      banReason: reason,
      bannedBy: 'AutoMod',
      bannedAt: new Date().toISOString(),
      banType: 'auto'
    });
    updateTrustScore(uid, 'BAN_ISSUED');
  } catch (err) {
    console.error('[AbuseDetection] Ban error:', err);
  }
};

const logAbuseViolation = async (uid, messageText, detection, action) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      abuseHistory: arrayUnion({
        message: messageText?.slice(0, 200),
        type: detection.type,
        severity: detection.severity,
        language: detection.language,
        action,
        timestamp: new Date().toISOString()
      })
    });
    updateTrustScore(uid, 'ABUSE_VIOLATION');
  } catch (err) {
    console.error('[AbuseDetection] Log error:', err);
  }
};

export const handleAbuseViolation = async (uid, messageText, messageDocRef, detection) => {
  if (!uid) return { action: 'none' };

  const offenseCount = getUserOffenseCount(uid);
  addUserOffense(uid, { type: detection.type, severity: detection.severity });

  let action = 'none';
  let userMessage = '';
  let muteUntil = null;

  if (messageDocRef) {
    try {
      await deleteDoc(messageDocRef);
    } catch (err) {
      console.error('[AbuseDetection] Error deleting message:', err);
    }
  }

  if (detection.severity === 'severe' || offenseCount >= OFFENSE_CONFIG.SEVERE_BAN_THRESHOLD) {
    await applyBan(uid, `Automatic ban: severe abuse/threats (${offenseCount + 1} offenses)`);
    await logAbuseViolation(uid, messageText, detection, 'auto_ban');
    action = 'auto_ban';
    userMessage = '🚫 You have been automatically banned for severe abuse or repeated violations.';
  } else if (offenseCount >= OFFENSE_CONFIG.MUTE_THRESHOLD) {
    const muteIndex = Math.min(
      offenseCount - OFFENSE_CONFIG.MUTE_THRESHOLD,
      OFFENSE_CONFIG.MUTE_DURATIONS.length - 1
    );
    const muteDuration = OFFENSE_CONFIG.MUTE_DURATIONS[muteIndex];
    muteUntil = await applyMute(uid, muteDuration, `AutoMod: abusive language (offense #${offenseCount + 1})`);
    await logAbuseViolation(uid, messageText, detection, 'auto_mute');
    action = 'auto_mute';
    const mins = Math.ceil(muteDuration / 60000);
    userMessage = `⚠️ Your message was removed and you have been muted for ${mins >= 60 ? Math.ceil(mins / 60) + ' hour(s)' : mins + ' minute(s)'} for abusive language.`;
  } else {
    await logAbuseViolation(uid, messageText, detection, 'warning');
    action = 'warning';
    userMessage = '⚠️ Warning: Your message was removed for violating community guidelines. Further violations will result in a mute.';
  }

  return { action, userMessage, muteUntil };
};

export const checkUserBanStatus = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return { isBanned: false };
    const data = snap.data();
    return { isBanned: data.isBanned || false, banReason: data.banReason };
  } catch (err) {
    return { isBanned: false };
  }
};
