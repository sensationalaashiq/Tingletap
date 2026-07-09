/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TingleBot Moderation Engine v5.0 — Rule-Based, Room-Aware, No Blacklist  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Policy (see project moderation spec):                                  ║
 * ║   • NO global keyword blacklist. Profanity / sexual slang / Hindi,      ║
 * ║     English, Hinglish, regional slang is NEVER punished on its own.     ║
 * ║   • Adult Room: consenting-adult conversation, flirting, dirty talk,    ║
 * ║     roleplay, and adult-chat ads are allowed.                           ║
 * ║   • General rooms: friendly banter, teasing, casual profanity, slang,   ║
 * ║     jokes and memes are allowed.                                        ║
 * ║   • Harassment is only flagged when ALL of: a specific user is          ║
 * ║     repeatedly targeted, abuse continues after the target objects,      ║
 * ║     multiple abusive messages hit the same person, targeting is done    ║
 * ║     via @mention/reply, and/or threats/intimidation/stalking exist.     ║
 * ║   • Spam is only flagged for repetition, flooding, mass advertising,    ║
 * ║     bot-like posting, or rapid copy-paste — never for isolated content. ║
 * ║   • A fixed set of "immediate action" categories are ALWAYS moderated   ║
 * ║     regardless of room: minors/grooming, non-consensual sexual content, ║
 * ║     threats of violence, doxxing/personal info leaks, hate speech       ║
 * ║     (religious/caste/racist), terrorism promotion, scams/phishing/      ║
 * ║     malware links, and other illegal-activity promotion. These are      ║
 * ║     detected with narrow behavioural patterns, not a slang dictionary.  ║
 * ║   • Automatic enforcement never exceeds Kick — bans stay a manual,      ║
 * ║     staff-only Admin Panel action.                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import {
    collection, doc, addDoc, deleteDoc, setDoc,
    updateDoc, serverTimestamp, arrayUnion, runTransaction, increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/* ════════════════════════════════════════════════════════════════════════════
   §A  IN-MEMORY SESSION STATE
════════════════════════════════════════════════════════════════════════════ */

const userMsgTimestamps     = new Map(); // uid → number[]                       (flood)
const userRecentTexts       = new Map(); // uid → {text, ts}[]                   (repeat/copy-paste)
const userAdCounts          = new Map(); // uid → {count, windowStart}           (mass-advertise)
const userSessionViolations = new Map(); // uid → {total, byType:{}}
const processedMsgIds       = new Set(); // message IDs seen this session
const lastNoticeTime        = new Map(); // uid → {[type]: ts}
const lastActionTime        = new Map(); // uid → ts
// Harassment tracking: `${roomId}::${targetKey}` → {
//   hits: [{ senderUid, ts, threat:boolean }],
//   objected: boolean,   // target has asked the sender(s) to stop
// }
const targetingState        = new Map();

/* ════════════════════════════════════════════════════════════════════════════
   §B  CONFIGURATION
════════════════════════════════════════════════════════════════════════════ */

// Warning → Mute → Kick are the ONLY automatic actions. No auto-ban.
export const CFG = {
    // Flood / repeat (spam)
    FLOOD_COUNT          : 5,
    FLOOD_WINDOW_MS      : 9000,
    REPEAT_COUNT         : 3,
    REPEAT_SIMILARITY    : 0.80,
    REPEAT_WINDOW_MS     : 90000,
    // Mass-advertise
    AD_WINDOW_MS         : 5 * 60 * 1000,
    AD_COUNT             : 3,
    // Harassment
    HARASSMENT_WINDOW_MS : 15 * 60 * 1000,
    HARASSMENT_MIN_HITS  : 3,   // same target must be hit at least this many times
    // Escalation thresholds (cumulative violation count, per user per session)
    DELETE_WARN_AT       : 1,
    MUTE_5_AT            : 2,
    MUTE_30_AT           : 3,
    MUTE_3H_AT           : 4,
    MUTE_24H_AT          : 5,
    KICK_AT              : 6,
    // TTLs
    NOTICE_TTL_MS        : 1 * 60 * 1000,
    CLAIM_TTL_MS         : 30 * 60 * 1000,
    NOTICE_COOLDOWN_MS   : 60 * 1000,
    ACTION_COOLDOWN_MS   : 8 * 1000,
    PERSIST_AT           : 1,
};

/* ════════════════════════════════════════════════════════════════════════════
   §C  ROOM CLASSIFICATION
   Every moderation decision starts by knowing what kind of room this is.
════════════════════════════════════════════════════════════════════════════ */

export const ROOM_TYPES = {
    ADULT: 'adult',
    INDIAN: 'indian',
    INTERNATIONAL: 'international',
    GAMING: 'gaming',
    MUSIC: 'music',
    GENERAL: 'general',
};

export const getRoomType = (roomName = '') => {
    const n = roomName.toLowerCase();
    if (n.includes('adult') || n.includes('18+') || n.includes('mature')) return ROOM_TYPES.ADULT;
    if (n.includes('indian') || n.includes('india') || n.includes('hindi') || n.includes('desi') ||
        n.includes('bollywood') || n.includes('mumbai') || n.includes('delhi') || n.includes('punjabi') ||
        n.includes('bhojpuri') || n.includes('haryanvi')) return ROOM_TYPES.INDIAN;
    if (n.includes('international') || n.includes('global') || n.includes('world')) return ROOM_TYPES.INTERNATIONAL;
    if (n.includes('game') || n.includes('gaming') || n.includes('esports')) return ROOM_TYPES.GAMING;
    if (n.includes('music') || n.includes('song') || n.includes('rj ') || n.includes('radio')) return ROOM_TYPES.MUSIC;
    return ROOM_TYPES.GENERAL;
};

/* ════════════════════════════════════════════════════════════════════════════
   §D  TEXT NORMALIZATION (only used to defeat evasion of the IMMEDIATE-ACTION
   patterns below — not used to run a slang/profanity dictionary anymore).
════════════════════════════════════════════════════════════════════════════ */

const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD\u2028\u2029\u180E\u034F]/g;

const HOMOGLYPH_MAP = {
    '\u0430':'a','\u0435':'e','\u043e':'o','\u0440':'p','\u0441':'c','\u0445':'x','\u0443':'y',
    '\u03B1':'a','\u03B5':'e','\u03BF':'o','\u03C1':'p','\u03C4':'t','\u03C5':'u',
};
const applyHomoglyphs = (s) => s.split('').map(c => HOMOGLYPH_MAP[c] || c).join('');

const LEET = { '0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','!':'i' };
const applyLeet = (s) => s.split('').map(c => LEET[c] || c).join('');

const collapseRepeats = (s) => s.replace(/(.)\1{2,}/g, '$1$1');

const normalize = (text) => {
    const stage1 = applyHomoglyphs(text).replace(ZERO_WIDTH, '');
    const lower = stage1.toLowerCase();
    const norm = collapseRepeats(applyLeet(lower))
        .replace(/[^a-z0-9\s\u0900-\u097F\u0980-\u09FF]/g, ' ')
        .replace(/\s+/g, ' ').trim();
    return { raw: text, lower, norm };
};

/* ════════════════════════════════════════════════════════════════════════════
   §E  IMMEDIATE-ACTION DETECTION
   These categories are ALWAYS moderated, in every room, regardless of
   context, consent, or room policy. They are narrow behavioural patterns —
   not a dictionary of slang/profanity — designed to catch genuine safety
   issues while leaving ordinary adult conversation, banter, and slang alone.
════════════════════════════════════════════════════════════════════════════ */

// §E1 — Minors / grooming / non-consensual sexual content
const MINOR_GROOMING_RX = [
    /\b(under[\s-]?age|minor)\s*(sex|nude|naked|porn|pic|photo|video)\b/i,
    /\b(child|kid|teen|schoolgirl|schoolboy)\s*(porn|sex|nude|naked)\b/i,
    /\b1[0-6]\s*year[\s-]?old\s*(sex|nude|naked|girl|boy)\b/i,
    /\b(loli(con)?|shota(con)?|jailbait|preteen\s*(sex|nude|naked|pic)|kiddie\s*porn|cp\b)\b/i,
    /\b(send\s*me\s*your\s*(school|class)|what\s*grade\s*are\s*you\s*in|are\s*you\s*(a\s*)?(minor|underage))\b/i,
    /\b(don'?t\s*tell\s*your\s*parents|keep\s*this\s*(a\s*)?secret\s*from\s*your\s*(mom|dad|parents))\b/i,
    /\b(meet\s*me\s*after\s*school|come\s*alone\s*don'?t\s*tell\s*anyone)\b/i,
];

const NON_CONSENSUAL_RX = [
    /\b(rape\s*(her|him|them|fantasy|roleplay)|non[\s-]?consensual|force\s*(sex|fuck|her|him|them)\s*to)\b/i,
    /\b(drugged?|spike\s*(her|his)\s*drink)\s*(and\s*)?(sex|rape|fuck)\b/i,
    /\b(i\s*will|gonna|going\s*to)\s*(rape|molest|force\s*myself\s*on)\s*(you|her|him|them)\b/i,
];

// §E2 — Threats of violence / intimidation / self-harm incitement
const VIOLENCE_THREAT_RX = [
    /\bkill\s*(your|ur|u)\s*self\b/i, /\bkys\b/i,
    /\bgo\s*(die|hang|kill\s*yourself|rope\s*yourself|end\s*yourself)\b/i,
    /\b(end|take)\s*your\s*(own\s*)?(life|existence)\b/i,
    /\bi\s*(will|gonna|am\s*going\s*to|wil|wll)\s*(kill|hurt|rape|beat|stab|destroy|find|track)\s*(you|u|ur|ye)\b/i,
    /\b(i\s*know\s*where\s*you\s*live|i\s*will\s*find\s*you|i('ll|ll)\s*come\s*find\s*you)\b/i,
    /\byou\s*(should|deserve)\s*(to\s*)?(die|suffer|get\s*hurt|burn|rot)\b/i,
    /\bhope\s*you\s*(die|suffer|get\s*(cancer|aids|sick|hurt|raped))\b/i,
    /\bjaan\s*se\s*maar(unga|dunga|te\s*hain)\b/i,
    /\bkaat\s*(dunga|denge|dugi)\b/i,
    /\btujhe\s*(maar|dhundh|kaat|uda)\s*(dunga|denge)\b/i,
    /\bghar\s*aa\s*(jaunga|jaoonga)\b/i,
    /\b(will|gonna|going\s*to)\s*(beat|smash|pound|destroy|crush)\s*(you|ur|your\s*face|you\s*up)\b/i,
];

// §E3 — Doxxing / personal-information leaks
const PERSONAL_INFO_RX = [
    /\b(\+91[\s\-]?)?[6-9]\d{4}[\s\-]?\d{5}\b/,               // Indian mobile
    /\b(\+91[\s\-]?)?[6-9]\d{9}\b/,
    /\b\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{4}\b/, // international phone
    /\b[\w.\-]+@(okaxis|okicici|oksbi|okhdfcbank|paytm|upi|ybl|ibl|axl)\b/i, // UPI ID
    /\baccount\s*(number|no\.?|#)\s*:?\s*\d{9,18}\b/i,          // bank account
    /\b[A-Z]{4}0[A-Z0-9]{6}\b/,                                 // IFSC
    /\b[A-Z]{5}\d{4}[A-Z]\b/,                                   // PAN
    /\b\d{4}\s?\d{4}\s?\d{4}\b/,                                // Aadhaar
    /\b(flat|house|plot|door)\s*(no\.?|number|#)?\s*\d+[,\s]+[a-z\s]+\s*(street|road|nagar|colony|sector|block)\b/i,
    /\b(dox\s*(you|this|them)|doxing|leak\s*(your|their)\s*(info|address|number|details))\b/i,
    /\b(send\s*me\s*your\s*address|where\s*do\s*you\s*live|tell\s*me\s*your\s*location)\b/i,
    /\b(swat\s*(you|u|this\s*server)|hack\s*(you|ur|your)\s*(account|pc|phone|ip))\b/i,
];

// §E4 — Hate speech: religious / caste / racial targeting, terrorism promotion
const HATE_TERROR_RX = [
    /\ball\s*(muslims?|hindus?|christians?|jews?|sikhs?|dalits?|buddhists?)\s*(are|should|must|deserve|need\s*to)\b/i,
    /\bkill\s*(all\s*)?(muslims?|hindus?|christians?|jews?|dalits?|kafirs?|sikhs?)\b/i,
    /\bgo\s*back\s*to\s*(pakistan|bangladesh|africa|china|nepal|your\s*country|your\s*land)\b/i,
    /\b(muslims?|hindus?|dalits?|christians?|jews?|sikhs?)\s*(are\s*)?(terrorist|jihadi|filthy|worthless|animals?|dogs?|scum|rats?)\b/i,
    /\b(banish|expel|deport)\s*(all\s*)?(muslims?|hindus?|dalits?|migrants?|immigrants?)\b/i,
    /\b(ethnic\s*cleansing|genocide\s*of|religious\s*cleansing)\b/i,
    /\b(low\s*caste|chamaar|bhangi|chamar|untouchable)\s*(are|stay\s*away|go\s*away)\b/i,
    /\bsab\s*(musalman|hindu|dalit)\s*(maar\s*do|khatam\s*karo|bhagao)\b/i,
    /\b(join|support|glory\s*to|praise)\s*(isis|isil|al[\s-]?qaeda|taliban|boko\s*haram|lashkar|jaish)\b/i,
    /\b(become|be)\s*a\s*(suicide\s*bomber|jihadi\s*fighter|martyr\s*for\s*(allah|jihad))\b/i,
    /\b(plan|planning|carry\s*out)\s*a\s*(terror(ist)?\s*attack|bomb(ing)?|mass\s*shooting)\b/i,
    /\bhow\s*to\s*(make|build)\s*a\s*(bomb|explosive|ied)\b/i,
    /\b(death\s*to|destroy)\s*(america|india|the\s*west|infidels?|kafirs?)\b/i,
];

// §E5 — Scam / phishing / malware / illegal-activity promotion
const SCAM_PHISHING_RX = [
    /\bverify\s*your\s*(account|card|identity|number|email|kyc|aadhaar|pan)\b/i,
    /\benter\s*(your\s*)?(otp|pin|password|credit\s*card|cvv|aadhaar|pan)\b/i,
    /\bshare\s*(your\s*)?(otp|pin|password|bank\s*detail|cvv)\b/i,
    /\b(kyc|aadhaar|pan)\s*(update|verify|complete|submit|required)\b/i,
    /\b(you\s*(won|win|are\s*the\s*winner|have\s*won|are\s*selected))\b/i,
    /\b(lottery|jackpot|sweepstake|lucky\s*draw|lucky\s*winner)\b/i,
    /\bclaim\s*your\s*(prize|reward|gift|money|cash|voucher|coupon)\b/i,
    /\bfree\s*(recharge|gift|iphone|money|cash|data|prize|reward|ps5|xbox)\b/i,
    /\b(guaranteed|100\s*%\s*)(profit|returns?|income|growth)\b/i,
    /\bdouble\s*your\s*(money|investment|returns?|income)\b/i,
    /\b(bitcoin|btc|crypto|usdt)\s*(send|transfer|earn|invest|double|mine)\b/i,
    /\b(buy|sell)\s*(drugs|weapons|guns|firearms|explosives|fake\s*(id|passport|currency))\b/i,
    /\b(pirated|cracked)\s*(software|movie|game)\s*(download|link)\b/i,
];

// NOTE: per explicit product decision, links are NOT judged "suspicious vs
// safe" — users may not send ANY link at all, in any room. Every link in a
// message is blocked.
const ANY_LINK_RX = /\b(?:https?:\/\/|www\.)\S+\.\S{2,}\b|\b[a-z0-9-]+\.(?:com|in|net|org|co|io|me|xyz|ly|gg|to|app|link|club|info|biz)\b(?:\/\S*)?/i;

/**
 * §E6 — Family-abuse words (mother/sister-targeting abuse + explicit "randi").
 * Per explicit product policy: these are enforced in EVERY room EXCEPT the
 * Adult Room. All other casual slang (pagal, bewakoof, chutiya, lund, chut,
 * gaand, kutta, harami, kamina, saala, bhosdi, etc.) stays allowed everywhere,
 * including the Indian Room — this is a narrow, explicitly-named exception,
 * not a return to a general profanity blacklist.
 */
const FAMILY_ABUSE_RX = [
    /\b(madarchod|madarchode|madarchodi|madarchot|maderchod|madrchod|mdrchd)\b/i,
    /\b(behenchod|bhenchod|behnchod|bhainchod|bnchd|bhai\s*chod|bhen\s*chod)\b/i,
    /\brandi\b/i, /\brandee\b/i, /\brande\b/i, /\braand\b/i, /\braandi\b/i,
    /\b(teri|tera|tere|tumhari|tumhare)\s+(maa|ma|mother)\s*(ki|ko|ka)?\b.{0,10}\b(chod|gaali|gali|maar|randi)\b/i,
    /\bmaa\s*ki\s*(chod|gaali|gali|aankh)\b/i, /\bmaa\s*chod\b/i,
    /\b(teri|tera|tere|tumhari|tumhare)\s+(behen|behan|sister)\s*(ki|ko|ka)?\b.{0,10}\b(chod|gaali|gali|randi)\b/i,
    /\bbehen\s*ki\s*(chod|gaali|gali)\b/i,
];

/**
 * checkImmediateAction(text, roomType) — runs every message through the
 * always-enforced safety categories, plus the family-abuse exception which
 * is enforced everywhere except the Adult Room. Returns a hit object or null.
 */
const checkImmediateAction = (text, roomType = ROOM_TYPES.GENERAL) => {
    const { norm } = normalize(text);
    const test = (rx) => rx.test(text) || rx.test(norm);

    if (MINOR_GROOMING_RX.some(test)) {
        return { type: 'minor_grooming', severity: 'severe', label: 'Minor safety / grooming' };
    }
    if (NON_CONSENSUAL_RX.some(test)) {
        return { type: 'non_consensual', severity: 'severe', label: 'Non-consensual sexual content' };
    }
    if (VIOLENCE_THREAT_RX.some(test)) {
        return { type: 'threat', severity: 'severe', label: 'Threat of violence' };
    }
    if (PERSONAL_INFO_RX.some(test)) {
        return { type: 'doxxing', severity: 'high', label: 'Personal information / doxxing' };
    }
    if (HATE_TERROR_RX.some(test)) {
        return { type: 'hate', severity: 'high', label: 'Hate speech / terrorism promotion' };
    }
    if (SCAM_PHISHING_RX.some(test)) {
        return { type: 'scam', severity: 'high', label: 'Scam / phishing / illegal activity' };
    }

    // Links: per explicit product policy, users may not send ANY link, in
    // ANY room. Matches http(s)://, bare www./domain.tld, and shortener-style
    // hostnames without a scheme.
    if (ANY_LINK_RX.test(text)) {
        return { type: 'link', severity: 'medium', label: 'Link sharing is not allowed' };
    }

    // Family-abuse exception — enforced everywhere EXCEPT the Adult Room.
    if (roomType !== ROOM_TYPES.ADULT && FAMILY_ABUSE_RX.some(test)) {
        return { type: 'family_abuse', severity: 'high', label: 'Family-targeting abuse' };
    }

    return null;
};

/* ════════════════════════════════════════════════════════════════════════════
   §F  HARASSMENT DETECTION (targeted, repeated abuse — never a single word)
════════════════════════════════════════════════════════════════════════════ */

// A lightweight *signal* (not a punishable-on-its-own list) that a message is
// hostile in tone. Used only as one ingredient of harassment scoring — a hit
// here never causes any action by itself.
const HOSTILITY_SIGNAL_RX = [
    /\b(shut\s*up|get\s*lost|f+u+c+k+\s*(off|you)|screw\s*you|piss\s*off)\b/i,
    /\byou\s*(are|r)\s+(a\s+)?(loser|idiot|pathetic|worthless|trash|garbage|disgusting)\b/i,
    /\b(chutiya|chodu|harami|kutta|kutte|kamina|randi|gandu|bhosdi\w*|madarchod\w*|behenchod\w*)\b.{0,15}\b(tu|tum|you|u)\b/i,
    /\b(tu|tum)\s+\S+\s+(hai|ho)\b.*\b(chutiya|kutta|harami|kamina|gandu|pagal)\b/i,
];

// Phrases that indicate the target is objecting / asking the sender to stop.
const OBJECTION_RX = [
    /\b(stop|please\s*stop|leave\s*me\s*alone|back\s*off|don'?t\s*talk\s*to\s*me|stop\s*(messaging|texting|pinging)\s*me)\b/i,
    /\b(ruk\s*ja|bas\s*karo|chhod\s*do|mujhe\s*akela\s*chhodo|baat\s*mat\s*karo)\b/i,
    /\bstop\s*(harassing|bothering|following)\s*me\b/i,
];

/** Extracts the @mention target(s) from a message, if any. */
const extractMentions = (text) => {
    const matches = text.match(/@([a-z0-9_]{2,})/gi) || [];
    return matches.map(m => m.slice(1).toLowerCase());
};

/**
 * recordAndCheckHarassment(roomId, senderUid, senderDisplayName, text)
 *
 * Target identity note: the app currently only supports @mention targeting
 * (by display name) — there is no reply/UID-based targeting in the chat UI.
 * To keep objection-tracking and repeated-targeting counts consistent, the
 * canonical target key is ALWAYS the lower-cased display name: it's the only
 * identity available both when someone is @mentioned and when that same
 * person later speaks (and we need to recognize them as "the target replying").
 *
 * Updates per-target tracking and returns a harassment hit only when the
 * conditions from policy are satisfied (see scoring below).
 */
const recordAndCheckHarassment = (roomId, senderUid, senderDisplayName, text) => {
    const now = Date.now();
    const targets = extractMentions(text); // lower-cased display names mentioned in this message
    const senderKey = (senderDisplayName || '').toLowerCase();

    // If THIS message is itself an objection from a previously-targeted user
    // (identified by their own display name matching a tracked target key),
    // mark that thread as "objected" so future hits against them escalate.
    if (senderKey) {
        const stateKey = `${roomId}::${senderKey}`;
        const state = targetingState.get(stateKey);
        if (state && OBJECTION_RX.some(rx => rx.test(text))) {
            state.objected = true;
            targetingState.set(stateKey, state);
        }
    }

    if (!targets.length) return null; // no identifiable target → cannot be "targeted" harassment

    const isHostile = HOSTILITY_SIGNAL_RX.some(rx => rx.test(text));
    const isThreat = VIOLENCE_THREAT_RX.some(rx => rx.test(text));
    if (!isHostile && !isThreat) return null; // friendly @mentions are never harassment

    let harassmentHit = null;
    for (const targetKey of targets) {
        if (targetKey === senderKey) continue; // can't harass yourself
        const key = `${roomId}::${targetKey}`;
        const state = targetingState.get(key) || { hits: [], objected: false };
        state.hits = state.hits.filter(h => now - h.ts < CFG.HARASSMENT_WINDOW_MS);
        state.hits.push({ senderUid, ts: now, threat: isThreat });
        targetingState.set(key, state);

        const hitsFromThisSender = state.hits.filter(h => h.senderUid === senderUid);
        const repeatedTargeting = hitsFromThisSender.length >= CFG.HARASSMENT_MIN_HITS;
        const multipleAbusiveMessages = state.hits.length >= CFG.HARASSMENT_MIN_HITS;
        const continuedAfterObjection = state.objected && hitsFromThisSender.length >= 2;
        const stalkingOrThreat = isThreat && hitsFromThisSender.length >= 2;

        if ((repeatedTargeting && multipleAbusiveMessages) || continuedAfterObjection || stalkingOrThreat) {
            harassmentHit = {
                type: 'harassment',
                severity: 'high',
                label: continuedAfterObjection
                    ? 'Harassment — continued after target objected'
                    : stalkingOrThreat
                        ? 'Harassment — repeated threats/intimidation'
                        : 'Harassment — repeated targeting of one user',
            };
        }
    }

    return harassmentHit;
};

/* ════════════════════════════════════════════════════════════════════════════
   §G  SPAM / FLOOD / MASS-ADVERTISE DETECTION
   Rule-based on behaviour (rate, repetition, promotion volume) — never on
   the presence of any particular word.
════════════════════════════════════════════════════════════════════════════ */

const strSimilarity = (a, b) => {
    if (!a || !b) return 0;
    const la = a.toLowerCase().trim(), lb = b.toLowerCase().trim();
    if (la === lb) return 1;
    const longer = la.length > lb.length ? la : lb;
    const shorter = la.length > lb.length ? lb : la;
    if (!longer.length) return 1;
    const dp = Array.from({ length: shorter.length + 1 }, (_, i) => i);
    for (let i = 1; i <= longer.length; i++) {
        let prev = i;
        for (let j = 1; j <= shorter.length; j++) {
            const tmp = dp[j];
            dp[j] = longer[i-1] === shorter[j-1] ? dp[j-1] : 1 + Math.min(dp[j], prev, dp[j-1]);
            prev = tmp;
        }
    }
    return (longer.length - dp[shorter.length]) / longer.length;
};

// Structural signal of an advertisement (links, contact handles, "DM me",
// phone/whatsapp solicitation) — used only to COUNT repeated promotion, not
// to punish a single ad-like message by itself (single ads may be normal
// conversation, e.g. sharing a song link).
const AD_SIGNAL_RX = /\b(dm\s*me|whatsapp\s*me|telegram\s*me|contact\s*me\s*on|join\s*my\s*(channel|group)|buy\s*now|limited\s*offer|check\s*out\s*my|follow\s*me\s*on)\b/i;

const detectSpam = (uid, text, now) => {
    // Flood: N messages in a short window
    const ts = (userMsgTimestamps.get(uid) || []).filter(t => now - t < CFG.FLOOD_WINDOW_MS);
    ts.push(now);
    userMsgTimestamps.set(uid, ts);
    if (ts.length >= CFG.FLOOD_COUNT) {
        return { detected: true, type: 'spam', severity: 'medium', label: 'Message flooding' };
    }

    // Repeat / rapid copy-paste
    const recent = (userRecentTexts.get(uid) || []).filter(e => now - e.ts < CFG.REPEAT_WINDOW_MS);
    const matches = recent.filter(e => strSimilarity(e.text, text) >= CFG.REPEAT_SIMILARITY).length;
    recent.push({ text, ts: now });
    if (recent.length > 40) recent.shift();
    userRecentTexts.set(uid, recent);
    if (matches >= CFG.REPEAT_COUNT) {
        return { detected: true, type: 'spam', severity: 'medium', label: 'Repeated / copy-pasted messages' };
    }

    // Mass advertising: repeated ad-signal messages within a window
    if (AD_SIGNAL_RX.test(text)) {
        const ad = userAdCounts.get(uid) || { count: 0, windowStart: now };
        if (now - ad.windowStart > CFG.AD_WINDOW_MS) { ad.count = 0; ad.windowStart = now; }
        ad.count += 1;
        userAdCounts.set(uid, ad);
        if (ad.count >= CFG.AD_COUNT) {
            return { detected: true, type: 'spam', severity: 'medium', label: 'Mass advertising' };
        }
    }

    return { detected: false };
};

/* ════════════════════════════════════════════════════════════════════════════
   §H  MAIN CONTENT DETECTOR — used by both this engine (post-send) and the
   pre-send wrapper in abuseDetection.js so both entry points agree.
   Room policy is intentionally NOT applied here — that happens in
   processAutoMod / detectAbuse, which know the room type. This function only
   answers "is this content in an always-enforced safety category?".
════════════════════════════════════════════════════════════════════════════ */

export const detectModerationContent = (text, roomName) => {
    if (!text || typeof text !== 'string') return { detected: false };
    const roomType = getRoomType(roomName);
    const hit = checkImmediateAction(text, roomType);
    if (hit) return { detected: true, ...hit };
    return { detected: false };
};

/**
 * isAdultRoomSafe / isRoomSafe — kept for backward compatibility with
 * abuseDetection.js. Under v5.0, ALL detectModerationContent hits are
 * immediate-action categories, so nothing is ever "safe" to allow through
 * regardless of room — the room-based leniency now only applies to slang/
 * profanity (never detected) and to family-abuse words, which are already
 * gated by room inside detectModerationContent/checkImmediateAction itself.
 */
export const isAdultRoomSafe = () => false;

/* ════════════════════════════════════════════════════════════════════════════
   §I  SESSION HELPERS
════════════════════════════════════════════════════════════════════════════ */

const getSessionViolations = (uid) => {
    if (!userSessionViolations.has(uid)) {
        userSessionViolations.set(uid, { total: 0, byType: {} });
    }
    return userSessionViolations.get(uid);
};

const fmtDuration = (ms) => {
    const m = Math.ceil(ms / 60000);
    if (m >= 1440) return `${Math.ceil(m/1440)} day${Math.ceil(m/1440)!==1?'s':''}`;
    if (m >= 60)   return `${Math.ceil(m/60)} hour${Math.ceil(m/60)!==1?'s':''}`;
    return `${m} minute${m!==1?'s':''}`;
};

const canPostNotice = (uid, noticeType) => {
    const map = lastNoticeTime.get(uid) || {};
    const last = map[noticeType] || 0;
    if (Date.now() - last < CFG.NOTICE_COOLDOWN_MS) return false;
    map[noticeType] = Date.now();
    lastNoticeTime.set(uid, map);
    return true;
};

const canTakeAction = (uid) => {
    const last = lastActionTime.get(uid) || 0;
    if (Date.now() - last < CFG.ACTION_COOLDOWN_MS) return false;
    lastActionTime.set(uid, Date.now());
    return true;
};

/* ════════════════════════════════════════════════════════════════════════════
   §J  FIRESTORE ENFORCEMENT (staff-only: owner / admin / moderator)
════════════════════════════════════════════════════════════════════════════ */

const claimEnforcement = async (roomId, messageId, action, violationType, uid) => {
    try {
        const ref = doc(db, 'rooms', roomId, 'automod', messageId);
        await runTransaction(db, async (t) => {
            const snap = await t.get(ref);
            if (snap.exists()) throw new Error('claimed');
            t.set(ref, {
                action, violationType, uid,
                handledAt: serverTimestamp(),
                expiresAt: Date.now() + CFG.CLAIM_TTL_MS,
            });
        });
        return true;
    } catch { return false; }
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
            uid, displayName, reason, kickedBy: 'TingleBot AutoMod', kickedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'users', uid), {
            kickedFrom: { roomId, reason, time: Date.now(), kickedBy: 'TingleBot AutoMod' },
        });
    } catch (_) {}
};

const logViolation = async (uid, roomId, msgId, text, detection, action, extra = {}) => {
    const { displayName = 'Unknown User', photoURL = '', roomName = '', roomType = '', matchedWord = '' } = extra;
    const entry = {
        uid, userId: uid, roomId, roomName, roomType, messageId: msgId,
        text: (text||'').slice(0, 200), message: (text||'').slice(0, 200),
        violationType: detection.type, type: detection.type,
        severity: detection.severity, label: detection.label,
        action, actionTaken: action,
        username: displayName, displayName, photoURL,
        matchedWord: matchedWord || '',
        timestamp: new Date().toISOString(), ts: Date.now(),
    };
    try { await addDoc(collection(db, 'modLogs'), entry); } catch (_) {}
    try {
        await updateDoc(doc(db, 'users', uid), {
            autoModHistory: arrayUnion({
                roomId, messageId: msgId, text: entry.text,
                violationType: detection.type, severity: detection.severity,
                label: detection.label, action, timestamp: entry.timestamp,
            }),
        });
    } catch (_) {}
};

const persistViolationCount = async (uid, violationType) => {
    try {
        await updateDoc(doc(db, 'users', uid), {
            'autoModStats.totalViolations': increment(1),
            [`autoModStats.${violationType}`]: increment(1),
            'autoModStats.lastViolationAt': new Date().toISOString(),
        });
    } catch (_) {}
};

const NOTICE_VARIANTS = {
    warn: [
        (name, label) => `Hey ${name}, let's keep the chat welcoming for everyone. ${label} is not allowed here. This is your first warning.`,
        (name, label) => `${name}, please mind the community guidelines. ${label} detected — first warning.`,
        (name, label) => `Heads up, ${name}! ${label} isn't acceptable here. Please keep it respectful.`,
    ],
    delete_warn: [
        (name, label) => `A message from ${name} was removed — ${label}. Another violation may result in a mute.`,
        (name, label) => `${name}'s message was deleted for: ${label}. Please review the chat rules.`,
        (name, label) => `Message removed (${label}). ${name}, this is a final warning before muting.`,
    ],
    muted: (name, dur, label) => [
        `${name} has been muted for ${dur} — ${label}.`,
        `${name} was temporarily silenced (${dur}) due to: ${label}.`,
        `Chat muted for ${name} (${dur}). Reason: ${label}.`,
    ],
    kicked: (name) => [
        `${name} was automatically removed after repeated violations.`,
        `${name} has been removed from the chat due to continued violations.`,
        `${name} was kicked by AutoMod after exceeding the violation limit.`,
    ],
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * postNotice — write a TingleBot system message that is visible to everyone
 * in the room for NOTICE_TTL_MS (60 s), then auto-deleted by the owner client.
 *
 * Routing:
 *  • Calls the server-side Netlify function `post-automod-notice` so that the
 *    write uses Firebase Admin SDK and bypasses the Firestore security rules
 *    that only allow isBot/systemBot flags for isTingleBot() or isStaff().
 *    This fixes the < 1 second optimistic-flash / server-rollback that non-staff
 *    clients experienced when trying to write system-flagged messages directly.
 *  • A per-violator deduplication lock inside the function prevents multiple
 *    clients from each posting the same notice within the TTL window.
 *
 * @param {string}  roomId         Firestore room document ID
 * @param {string}  text           Human-readable notice text
 * @param {string}  tinglebotType  One of 'automod' | 'kicked' | 'muted' | …
 * @param {string}  [violatorUid]  UID of the user who triggered the violation
 */
export const postNotice = async (roomId, text, tinglebotType, violatorUid = '') => {
    try {
        const { getAuth } = await import('firebase/auth');
        const currentUser = getAuth().currentUser;
        if (!currentUser) return; // caller must be authenticated

        const idToken = await currentUser.getIdToken();

        // In development Vite proxies /.netlify/functions/* → local server.js
        // In production the Netlify CDN routes it to the function.
        const fnUrl = '/.netlify/functions/post-automod-notice';

        const res = await fetch(fnUrl, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ roomId, text, tinglebotType, violatorUid }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('[TingleBot] postNotice server error:', res.status, err?.error || '');
        }
    } catch (e) {
        console.warn('[TingleBot] postNotice fetch error:', e?.message || e);
    }
};

/* ════════════════════════════════════════════════════════════════════════════
   §K  PUBLIC API
════════════════════════════════════════════════════════════════════════════ */

/**
 * processAutoMod(msg, roomId, currentUid, isStaff, roomName)
 *
 * Call for every incoming message in the snapshot listener (after initial
 * load). Detection pipeline, in order:
 *   1. Immediate-action safety categories (always enforced, every room)
 *   2. Harassment (targeted, repeated abuse — room-agnostic)
 *   3. Spam / flood / mass-advertise (behavioural, room-agnostic)
 * Ordinary profanity/slang/banter/flirting/roleplay never reaches an action.
 */
export const processAutoMod = async (msg, roomId, currentUid = null, isStaff = false, roomName = '') => {
    if (!msg?.id || !roomId) return;
    if (processedMsgIds.has(msg.id)) return;
    processedMsgIds.add(msg.id);

    const senderRole = (msg.role || '').toLowerCase();
    if (['owner', 'admin', 'moderator'].includes(senderRole)) return;
    if (msg.isBot || msg.systemBot || msg.uid === 'tinglebot_system_official_2024') return;
    if (!msg.uid || !msg.text?.trim()) return;

    const { uid, text, displayName = 'User' } = msg;
    const now = Date.now();
    const roomType = getRoomType(roomName);

    // 1. Immediate-action categories — always enforced except family-abuse,
    // which is exempted only in the Adult Room (see checkImmediateAction).
    let hit = checkImmediateAction(text, roomType);

    // 2. Harassment — targeted + repeated + (objection/threat), room-agnostic.
    if (!hit) {
        hit = recordAndCheckHarassment(roomId, uid, displayName, text);
    }

    // 3. Spam — behavioural, room-agnostic.
    if (!hit) {
        const spamHit = detectSpam(uid, text, now);
        if (spamHit.detected) hit = spamHit;
    }

    if (!hit) return; // ordinary conversation, banter, slang, flirting — no action

    // ── Update session violation counters ──────────────────────────────────
    const sv = getSessionViolations(uid);
    const priorTotal = sv.total;
    sv.total += 1;
    sv.byType[hit.type] = (sv.byType[hit.type] || 0) + 1;

    // ── Determine escalation action (deterministic from violation count + severity)
    // Calculated here so ALL clients (staff and non-staff) can build the same notice.
    let action = 'warn', shouldDelete = false, muteDuration = 0, shouldKick = false;

    if      (priorTotal >= CFG.KICK_AT)        { action = 'kick';        shouldDelete = true; shouldKick = true; }
    else if (priorTotal >= CFG.MUTE_24H_AT)    { action = 'mute_24h';    shouldDelete = true; muteDuration = 24*60*60*1000; }
    else if (priorTotal >= CFG.MUTE_3H_AT)     { action = 'mute_3h';     shouldDelete = true; muteDuration = 3*60*60*1000; }
    else if (priorTotal >= CFG.MUTE_30_AT)     { action = 'mute_30';     shouldDelete = true; muteDuration = 30*60*1000; }
    else if (priorTotal >= CFG.MUTE_5_AT)      { action = 'mute_5';      shouldDelete = true; muteDuration = 5*60*1000; }
    else if (priorTotal >= CFG.DELETE_WARN_AT) { action = 'delete_warn'; shouldDelete = true; }

    // Severity overrides — severe/high safety categories delete immediately.
    if ((hit.severity === 'high' || hit.severity === 'severe') && !shouldDelete) {
        shouldDelete = true; action = 'delete_warn';
    }
    if (hit.severity === 'severe' && muteDuration === 0 && !shouldKick) {
        muteDuration = 60 * 60 * 1000; action = 'mute_3h';
    }
    // Scam / doxxing always delete regardless of prior count.
    if ((hit.type === 'scam' || hit.type === 'doxxing') && !shouldDelete) {
        shouldDelete = true;
        if (action === 'warn') action = 'delete_warn';
    }

    // ── Post notice — ALL clients (staff and non-staff) via server-side function ──
    // The Netlify function (post-automod-notice) writes with Firebase Admin SDK,
    // bypassing the Firestore rules that only allow isBot/systemBot for staff.
    // A per-violator dedup lock in the function prevents multiple clients posting
    // the same notice within the 60-second TTL window.
    const noticeCooldownType = shouldKick ? 'kick' : muteDuration > 0 ? 'mute' : 'warn';
    if (canPostNotice(uid, noticeCooldownType)) {
        let noticeText, noticeTinglebotType;
        if (shouldKick) {
            noticeText = getRandom(NOTICE_VARIANTS.kicked(displayName));
            noticeTinglebotType = 'kicked';
        } else if (muteDuration > 0) {
            noticeText = getRandom(NOTICE_VARIANTS.muted(displayName, fmtDuration(muteDuration), hit.label));
            noticeTinglebotType = 'muted';
        } else if (shouldDelete) {
            noticeText = getRandom(NOTICE_VARIANTS.delete_warn.map(fn => fn(displayName, hit.label)));
            noticeTinglebotType = 'automod';
        } else {
            noticeText = getRandom(NOTICE_VARIANTS.warn.map(fn => fn(displayName, hit.label)));
            noticeTinglebotType = 'automod';
        }
        postNotice(roomId, noticeText, noticeTinglebotType, uid).catch(() => {});
    }

    // ── Enforcement — staff clients only ────────────────────────────────────
    if (!isStaff) return;

    if (!canTakeAction(uid)) return;

    const claimed = await claimEnforcement(roomId, msg.id, action, hit.type, uid);
    if (!claimed) return;

    if (shouldDelete) await removeMessage(roomId, msg.id);
    if (muteDuration > 0) await muteUser(uid, muteDuration, `TingleBot: ${hit.label} (violation #${priorTotal+1})`);
    if (shouldKick)       await kickUser(roomId, uid, displayName, `AutoMod: ${priorTotal+1} violations`);

    await logViolation(uid, roomId, msg.id, text, hit, action, {
        displayName, photoURL: msg.photoURL || '', roomName, roomType, matchedWord: hit.matched || '',
    });
    if (sv.total >= CFG.PERSIST_AT) {
        persistViolationCount(uid, hit.type).catch(() => {});
    }
};

/**
 * resetAutoModState — call when user leaves or changes room.
 */
export const resetAutoModState = () => {
    userMsgTimestamps.clear();
    userRecentTexts.clear();
    userAdCounts.clear();
    userSessionViolations.clear();
    processedMsgIds.clear();
    lastNoticeTime.clear();
    lastActionTime.clear();
    // targetingState intentionally persists across room switches within the
    // same session so cross-room stalking is still tracked; it self-expires
    // via the HARASSMENT_WINDOW_MS filter on each check.
};
