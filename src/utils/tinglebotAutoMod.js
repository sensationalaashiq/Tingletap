/**
 * TingleBot Intelligent Auto-Moderation System
 *
 * Architecture:
 *   • Detection (pattern matching, rate tracking) — runs on ALL clients.
 *   • Enforcement (delete msg, mute, kick, TingleBot notice) — runs ONLY on staff
 *     clients (owner / admin / moderator). Staff act as privileged enforcement agents,
 *     matching the Firestore security rules that already restrict those writes to staff.
 *   • A Firestore claim doc (rooms/{id}/automod/{msgId}) ensures only ONE staff client
 *     enforces each violation even when multiple staff members are in the room.
 *   • processedMsgIds Set prevents re-running detection on the same message within
 *     a single client session. Cleared via resetAutoModState() on room change.
 *
 * Actions (escalating by total session violations for that UID):
 *   1st offence        → warn only (TingleBot notice, no delete)
 *   2nd offence        → delete + warn
 *   3rd offence        → delete + 5-min mute
 *   4th offence        → delete + 30-min mute
 *   5th offence        → delete + 3-hour mute
 *   6th+ offence       → delete + kick
 *
 *   High/severe violations skip warn-only and always delete.
 *   Severe (threats/harassment) also fast-tracks to 5-min mute on first offence.
 */

import {
    collection, doc, addDoc, deleteDoc, getDoc, setDoc,
    updateDoc, serverTimestamp, arrayUnion, runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/* ─── In-memory session state ──────────────────────────────────────────── */
const userMsgTimestamps     = new Map(); // uid → number[]
const userRecentTexts       = new Map(); // uid → {text, ts}[]
const userSessionViolations = new Map(); // uid → violation counters
const processedMsgIds       = new Set(); // message IDs already seen this session

/* ─── Configurable thresholds ──────────────────────────────────────────── */
export const CFG = {
    FLOOD_COUNT       : 5,        // N messages…
    FLOOD_WINDOW_MS   : 9000,     // …within this window = flood
    REPEAT_COUNT      : 3,        // M near-identical messages…
    REPEAT_SIMILARITY : 0.82,     // …at this similarity threshold…
    REPEAT_WINDOW_MS  : 90000,    // …within this window = repeat spam
    // Escalation (by prior violation count)
    DELETE_WARN_AT    : 1,        // ≥1 → delete + warn
    MUTE_5_AT         : 2,        // ≥2 → 5-min mute
    MUTE_30_AT        : 3,        // ≥3 → 30-min mute
    MUTE_3H_AT        : 4,        // ≥4 → 3-hour mute
    KICK_AT           : 5,        // ≥5 → kick
    NOTICE_TTL_MS     : 3 * 60 * 1000,  // auto-delete TingleBot notice after
    CLAIM_TTL_MS      : 30 * 60 * 1000, // Firestore claim document lifetime
};

/* ─── Detection patterns ───────────────────────────────────────────────── */

const SPAM_KEYWORDS = [
    'click here', 'click now', 'click link', 'free money', 'earn daily',
    'make money fast', 'guaranteed profit', 'double your money',
    'investment opportunity', 'get rich', 'passive income',
    'whatsapp me', 'telegram me', 'contact me on', 'dm me for',
    'cheap followers', 'buy followers', 'buy likes', 'cheap services',
    'join now for free', 'limited offer', 'register now',
];

const EXPLICIT_PATTERNS = [
    /\bsend\s*(me\s*)?nud(e|es)\b/i,
    /\bnude\s*(photo|pic|video|clip|img|image)\b/i,
    /\b(sex\s*(video|chat|cam|live|pic))\b/i,
    /\b(pornhub|xvideos|xnxx|xhamster|redtube|onlyfans)\b/i,
    /\b(see|watch)\s*me\s*naked\b/i,
    /\berotic\s*(chat|video|photo)\b/i,
    /\bmasturbat(e|ion|ing)\b/i,
    /\b(nangi\s*(photo|pic|video)|chudai\s*(video|pic))\b/i,
    /\bmujhse\s*sex\b/i,
    /\bsex\s*karo\b/i,
];

const SCAM_PATTERNS = [
    /\b(bitcoin|btc|eth|usdt|crypto)\s*(send|transfer|earn|invest|profit|doubl)\b/i,
    /\b(send|transfer|give)\s*(me\s*)?(money|cash|fund|rs|rupee|\$|usd|inr)\b/i,
    /\bclick\s*(here|this\s*link|now|below)\b/i,
    /\bfree\s*(recharge|gift|iphone|money|cash|data|prize|reward|bitcoin)\b/i,
    /\b(you\s*(won|win|are\s*selected|have\s*been\s*selected))\b/i,
    /\b(lottery|jackpot|sweepstake|lucky\s*winner)\b/i,
    /\b(paytm\s*me|gpay\s*me|phonepe\s*me|upi\s*me)\b/i,
    /\b(account\s*(number|no\.?|num)|bank\s*detail|upi\s*id)\b/i,
    /\bverify\s*your\s*(account|card|identity)\b/i,
    /\benter\s*(your\s*)?(otp|pin|password|credit\s*card)\b/i,
    /\bpaise\s*(bhejo|do|transfer|chahiye)\b/i,
    /\bpaisa\s*(bhejo|do|transfer)\b/i,
];

const HATE_PATTERNS = [
    /\ball\s*(muslims?|hindus?|christians?|jews?|sikhs?)\s*(are|should|must|deserve|need\s*to)\b/i,
    /\bkill\s*all\s*(muslims?|hindus?|christians?|blacks?|whites?)\b/i,
    /\bgo\s*back\s*to\s*(your\s*country|pakistan|india|africa|china|bangladesh)\b/i,
    /\bthese\s*(muslims?|hindus?|dalits?)\s*(are\s*)?(terrorist|jihadi|dirty|filthy)\b/i,
    /\breservation\s*(beggars?|thieves?|quota\s*cheat)\b/i,
];

const HARASSMENT_PATTERNS = [
    /\bkill\s*(your|ur|u)\s*self\b/i,
    /\bkys\b/i,
    /\bgo\s*(die|hang|kill)\b/i,
    /\bi\s*(will|gonna|am\s*going\s*to)\s*(kill|hurt|rape|beat|destroy|find)\s*(you|u|ur)\b/i,
    /\byou\s*(should|deserve)\s*(to\s*)?(die|suffer|get\s*hurt)\b/i,
    /\bi\s*know\s*where\s*you\s*live\b/i,
];

// Known-safe domains that never trigger link warnings
const SAFE_DOMAINS = [
    'youtube.com', 'youtu.be', 'music.youtube.com',
    'google.com', 'instagram.com', 'facebook.com',
    'twitter.com', 'x.com', 'tiktok.com', 'reddit.com',
    'wikipedia.org', 'tenor.com', 'giphy.com',
    'imgbb.com', 'imgur.com', 'i.ytimg.com',
    'open.spotify.com', 'soundcloud.com',
];

const SUSPICIOUS_LINK_RX = [
    /https?:\/\/(\d{1,3}\.){3}\d{1,3}/,
    /https?:\/\/[^\s/]+\.(xyz|tk|ml|ga|cf|pw|top|icu|vip)\b/i,
    /\b(bit\.ly|tinyurl\.com|cutt\.ly|rb\.gy|short\.link|goo\.gl|t\.co)\//i,
    /\b(t\.me|telegram\.me)\/\w+/i,
    /\bdiscord\.gg\/\w+/i,
];

/* ─── Helpers ──────────────────────────────────────────────────────────── */

const strSimilarity = (a, b) => {
    if (!a || !b) return 0;
    const la = a.toLowerCase().trim();
    const lb = b.toLowerCase().trim();
    if (la === lb) return 1;
    const longer  = la.length > lb.length ? la : lb;
    const shorter = la.length > lb.length ? lb : la;
    if (longer.length === 0) return 1;
    const dp = Array.from({ length: shorter.length + 1 }, (_, i) => i);
    for (let i = 1; i <= longer.length; i++) {
        let prev = i;
        for (let j = 1; j <= shorter.length; j++) {
            const temp = dp[j];
            dp[j] = longer[i-1] === shorter[j-1] ? dp[j-1] : 1 + Math.min(dp[j], prev, dp[j-1]);
            prev = temp;
        }
    }
    return (longer.length - dp[shorter.length]) / longer.length;
};

const isSafeDomain = (url) => {
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        return SAFE_DOMAINS.some(d => host === d || host.endsWith('.' + d));
    } catch { return false; }
};

const getSessionViolations = (uid) => {
    if (!userSessionViolations.has(uid)) {
        userSessionViolations.set(uid, {
            total: 0, spam: 0, abuse: 0, explicit: 0, scam: 0, link: 0, hate: 0, harassment: 0,
        });
    }
    return userSessionViolations.get(uid);
};

const fmtDuration = (ms) => {
    const m = Math.ceil(ms / 60000);
    if (m >= 60) return `${Math.ceil(m / 60)} hour${Math.ceil(m / 60) !== 1 ? 's' : ''}`;
    return `${m} minute${m !== 1 ? 's' : ''}`;
};

/* ─── Detectors ────────────────────────────────────────────────────────── */

const detectSpam = (uid, text, now) => {
    // Flood rate
    const ts = (userMsgTimestamps.get(uid) || []).filter(t => now - t < CFG.FLOOD_WINDOW_MS);
    ts.push(now);
    userMsgTimestamps.set(uid, ts);
    if (ts.length >= CFG.FLOOD_COUNT) {
        return { detected: true, type: 'spam', severity: 'medium', label: 'Message flooding' };
    }

    // Repeat messages
    const recent = (userRecentTexts.get(uid) || []).filter(e => now - e.ts < CFG.REPEAT_WINDOW_MS);
    const matches = recent.filter(e => strSimilarity(e.text, text) >= CFG.REPEAT_SIMILARITY).length;
    recent.push({ text, ts: now });
    if (recent.length > 30) recent.shift();
    userRecentTexts.set(uid, recent);
    if (matches >= CFG.REPEAT_COUNT) {
        return { detected: true, type: 'spam', severity: 'medium', label: 'Repeated messages' };
    }

    // Spam keywords
    const lower = text.toLowerCase();
    for (const kw of SPAM_KEYWORDS) {
        if (lower.includes(kw)) {
            return { detected: true, type: 'spam', severity: 'low', label: 'Spam content' };
        }
    }

    return { detected: false };
};

const detectContent = (text) => {
    for (const p of HARASSMENT_PATTERNS) {
        if (p.test(text)) return { detected: true, type: 'harassment', severity: 'severe', label: 'Threats / harassment' };
    }
    for (const p of EXPLICIT_PATTERNS) {
        if (p.test(text)) return { detected: true, type: 'explicit', severity: 'high', label: 'Explicit sexual content' };
    }
    for (const p of HATE_PATTERNS) {
        if (p.test(text)) return { detected: true, type: 'hate', severity: 'high', label: 'Hate speech' };
    }
    for (const p of SCAM_PATTERNS) {
        if (p.test(text)) return { detected: true, type: 'scam', severity: 'high', label: 'Scam / fraud attempt' };
    }
    // Suspicious links
    const urls = text.match(/https?:\/\/[^\s]+/gi) || [];
    for (const url of urls) {
        if (!isSafeDomain(url) && SUSPICIOUS_LINK_RX.some(p => p.test(url))) {
            return { detected: true, type: 'link', severity: 'medium', label: 'Suspicious link' };
        }
    }
    // Non-https suspicious patterns (t.me, discord.gg, raw IPs)
    if (!urls.length) {
        for (const p of SUSPICIOUS_LINK_RX) {
            if (p.test(text)) return { detected: true, type: 'link', severity: 'medium', label: 'Suspicious link' };
        }
    }
    return { detected: false };
};

/* ─── Firestore enforcement helpers (staff-only) ───────────────────────── */

/**
 * Atomically claim enforcement rights for this message.
 * Only the first staff client to run this wins; others return false.
 * Writes to rooms/{roomId}/automod/{messageId} — staff can write to room sub-collections.
 */
const claimEnforcement = async (roomId, messageId, action, violationType, uid) => {
    try {
        const ref = doc(db, 'rooms', roomId, 'automod', messageId);
        await runTransaction(db, async (t) => {
            const snap = await t.get(ref);
            if (snap.exists()) throw new Error('already_claimed');
            t.set(ref, {
                action, violationType, uid,
                handledAt: serverTimestamp(),
                expiresAt: Date.now() + CFG.CLAIM_TTL_MS,
            });
        });
        return true;
    } catch {
        return false;
    }
};

const removeMessage = async (roomId, messageId) => {
    try { await deleteDoc(doc(db, 'rooms', roomId, 'messages', messageId)); } catch (_) {}
};

const muteUser = async (uid, durationMs, reason) => {
    try {
        const until = new Date(Date.now() + durationMs).toISOString();
        await updateDoc(doc(db, 'users', uid), {
            'mutedInfo.isMuted'  : true,
            'mutedInfo.mutedBy'  : 'TingleBot',
            'mutedInfo.reason'   : reason,
            'mutedInfo.mutedAt'  : new Date().toISOString(),
            'mutedInfo.muteUntil': until,
            'mutedInfo.duration' : durationMs,
        });
        return until;
    } catch { return null; }
};

const kickUser = async (roomId, uid, displayName, reason) => {
    try {
        await setDoc(doc(db, 'rooms', roomId, 'kickedUsers', uid), {
            uid, displayName, reason,
            kickedBy: 'TingleBot AutoMod',
            kickedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'users', uid), {
            kickedFrom: { roomId, reason, time: Date.now(), kickedBy: 'TingleBot AutoMod' },
        });
    } catch (_) {}
};

const logViolation = async (uid, roomId, msgId, text, detection, action) => {
    try {
        await updateDoc(doc(db, 'users', uid), {
            autoModHistory: arrayUnion({
                roomId, messageId: msgId,
                text: (text || '').slice(0, 200),
                violationType: detection.type,
                severity: detection.severity,
                label: detection.label,
                action,
                timestamp: new Date().toISOString(),
            }),
        });
    } catch (_) {}
};

const postNotice = async (roomId, text, tinglebotType) => {
    try {
        const ref = await addDoc(collection(db, 'rooms', roomId, 'messages'), {
            text,
            uid: 'tinglebot_system_official_2024',
            displayName: 'TingleBot',
            isBot: true, systemBot: true,
            tinglebotType,
            createdAt: serverTimestamp(),
            noReply: true, noReaction: true, noReport: true, noUnread: true,
        });
        if (ref?.id) {
            setTimeout(
                () => deleteDoc(doc(db, 'rooms', roomId, 'messages', ref.id)).catch(() => {}),
                CFG.NOTICE_TTL_MS
            );
        }
    } catch (_) {}
};

/* ─── Main entry point ─────────────────────────────────────────────────── */

/**
 * processAutoMod(msg, roomId, currentUid, isStaff)
 *
 * @param {object}  msg         Firestore message object (must have .id)
 * @param {string}  roomId      Room being moderated
 * @param {string}  currentUid  UID of the viewing client (skip their own messages)
 * @param {boolean} isStaff     True if the viewing client is owner/admin/moderator.
 *                              Only staff clients execute Firestore enforcement.
 */
export const processAutoMod = async (msg, roomId, currentUid = null, isStaff = false) => {
    if (!msg?.id || !roomId) return;

    // Deduplicate: skip already-processed messages this session
    if (processedMsgIds.has(msg.id)) return;
    processedMsgIds.add(msg.id);

    // Exempt: bots, staff senders, system messages
    const senderRole = (msg.role || '').toLowerCase();
    const isSenderStaff = ['owner', 'admin', 'moderator'].includes(senderRole);
    const isBot = msg.isBot || msg.systemBot || msg.uid === 'tinglebot_system_official_2024';
    if (isBot || isSenderStaff) return;
    if (!msg.uid || !msg.text?.trim()) return;

    const uid = msg.uid;
    const text = msg.text;
    const displayName = msg.displayName || 'User';
    const now = Date.now();

    // ── Run detectors (all clients) ──
    const contentHit = detectContent(text);
    const spamHit    = detectSpam(uid, text, now);
    // Content violations take priority over spam
    const hit = contentHit.detected ? contentHit : (spamHit.detected ? spamHit : null);
    if (!hit) return;

    // ── Update in-memory session violation counters ──
    const sv = getSessionViolations(uid);
    const priorTotal = sv.total;
    sv.total += 1;
    sv[hit.type] = (sv[hit.type] || 0) + 1;

    // ── Non-staff clients stop here (detection only) ──
    if (!isStaff) return;

    // ── Determine escalation action ──
    let action       = 'warn';
    let shouldDelete = false;
    let muteDuration = 0;
    let shouldKick   = false;

    if (priorTotal >= CFG.KICK_AT) {
        action = 'kick'; shouldDelete = true; shouldKick = true;
    } else if (priorTotal >= CFG.MUTE_3H_AT) {
        action = 'mute_3h'; shouldDelete = true; muteDuration = 3 * 60 * 60 * 1000;
    } else if (priorTotal >= CFG.MUTE_30_AT) {
        action = 'mute_30'; shouldDelete = true; muteDuration = 30 * 60 * 1000;
    } else if (priorTotal >= CFG.MUTE_5_AT) {
        action = 'mute_5'; shouldDelete = true; muteDuration = 5 * 60 * 1000;
    } else if (priorTotal >= CFG.DELETE_WARN_AT) {
        action = 'delete_warn'; shouldDelete = true;
    } else {
        action = 'warn'; // 1st offence: warn without deleting
    }

    // Severity overrides: high/severe always delete; severe fast-tracks to mute
    if ((hit.severity === 'high' || hit.severity === 'severe') && !shouldDelete) {
        shouldDelete = true;
        action = 'delete_warn';
    }
    if (hit.severity === 'severe' && muteDuration === 0 && !shouldKick) {
        muteDuration = 5 * 60 * 1000;
        action = 'mute_5';
    }

    // ── Atomic Firestore claim (prevents duplicate enforcement by multiple staff) ──
    const claimed = await claimEnforcement(roomId, msg.id, action, hit.type, uid);
    if (!claimed) return; // Another staff client got there first

    // ── Execute enforcement ──
    if (shouldDelete) await removeMessage(roomId, msg.id);
    if (muteDuration > 0) await muteUser(uid, muteDuration, `TingleBot: ${hit.label} (violation #${priorTotal + 1})`);
    if (shouldKick)    await kickUser(roomId, uid, displayName, `AutoMod: ${priorTotal + 1} violations — persistent rule-breaking`);
    await logViolation(uid, roomId, msg.id, text, hit, action);

    // ── Post TingleBot moderation notice ──
    let noticeText;
    let tinglebotType;

    if (shouldKick) {
        noticeText   = `${displayName} was automatically removed from the room after repeated violations.`;
        tinglebotType = 'kicked';
    } else if (muteDuration > 0) {
        noticeText   = `${displayName} has been muted for ${fmtDuration(muteDuration)} by TingleBot — ${hit.label}.`;
        tinglebotType = 'muted';
    } else if (shouldDelete) {
        noticeText   = `A message by ${displayName} was removed — ${hit.label}. Next violation will result in a mute.`;
        tinglebotType = 'automod';
    } else {
        noticeText   = `${displayName}, please keep the chat respectful. ${hit.label} detected — this is your first warning.`;
        tinglebotType = 'automod';
    }

    await postNotice(roomId, noticeText, tinglebotType);
};

/**
 * resetAutoModState — call when the user changes or leaves a room.
 * Clears all in-memory tracking so the next room starts clean.
 */
export const resetAutoModState = () => {
    userMsgTimestamps.clear();
    userRecentTexts.clear();
    userSessionViolations.clear();
    processedMsgIds.clear();
};
