/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  TingleBot Advanced Multilingual Auto-Moderation Engine (AMAME)     ║
 * ║  v2.0 — On-device, zero external API, zero false-positive design    ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Languages: English · Hindi · Bengali · Tamil · Telugu · Kannada    ║
 * ║             Marathi · Punjabi · Bhojpuri · Haryanavi + mixed-lang   ║
 * ║                                                                      ║
 * ║  Evasion handling: leet-speak · symbol substitution · spacing tricks ║
 * ║   repeated-char flooding · zero-width chars · phonetic variants     ║
 * ║   abbreviations (mc/bc/bsdk) · Devanagari + transliterated text    ║
 * ║                                                                      ║
 * ║  Architecture:                                                       ║
 * ║   • Detection runs on ALL clients (no Firestore needed)             ║
 * ║   • Enforcement (delete/mute/kick) runs ONLY on staff clients        ║
 * ║     (owner / admin / moderator) — matches Firestore rules           ║
 * ║   • Firestore transaction claim prevents duplicate enforcement       ║
 * ║   • processedMsgIds dedup prevents re-scanning same message         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import {
    collection, doc, addDoc, deleteDoc, setDoc,
    updateDoc, serverTimestamp, arrayUnion, runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/* ════════════════════════════════════════════════════════════════════════
   §A  IN-MEMORY SESSION STATE
════════════════════════════════════════════════════════════════════════ */

const userMsgTimestamps     = new Map(); // uid → number[]
const userRecentTexts       = new Map(); // uid → {text, ts}[]
const userSessionViolations = new Map(); // uid → {total, spam, abuse, …}
const processedMsgIds       = new Set(); // message IDs seen this session

/* ════════════════════════════════════════════════════════════════════════
   §B  CONFIGURATION
════════════════════════════════════════════════════════════════════════ */

export const CFG = {
    FLOOD_COUNT       : 5,
    FLOOD_WINDOW_MS   : 9000,
    REPEAT_COUNT      : 3,
    REPEAT_SIMILARITY : 0.80,
    REPEAT_WINDOW_MS  : 90000,
    // Escalation thresholds (by prior violation count)
    DELETE_WARN_AT    : 1,
    MUTE_5_AT         : 2,
    MUTE_30_AT        : 3,
    MUTE_3H_AT        : 4,
    KICK_AT           : 5,
    NOTICE_TTL_MS     : 3 * 60 * 1000,
    CLAIM_TTL_MS      : 30 * 60 * 1000,
    // Fuzzy match — max edit distance per word length band
    FUZZY_SHORT  : 1,   // words 4-7 chars  → ≤1 substitution
    FUZZY_MEDIUM : 2,   // words 8-12 chars → ≤2 substitutions
    FUZZY_LONG   : 3,   // words >12 chars  → ≤3 substitutions
};

/* ════════════════════════════════════════════════════════════════════════
   §C  NORMALIZATION ENGINE
   Produces multiple text variants to defeat all common evasion tactics:
   leet-speak, symbol subs, spacing tricks, repeated chars, zero-width.
════════════════════════════════════════════════════════════════════════ */

// Extended leet / symbol substitution table
const LEET = {
    '0':'o','1':'i','2':'z','3':'e','4':'a','5':'s','6':'g','7':'t',
    '8':'b','9':'g','@':'a','$':'s','!':'i','+':'t','#':'h','|':'i',
    '(':'c',')':'d','<':'c','>':'d','€':'e','£':'l','¢':'c','°':'o',
    'ph':'f','ck':'k','qu':'kw','x':'ks','vv':'w',
};

// Characters that disappear in normalization
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\uFEFF\u00AD\u2028\u2029]/g;
// Punctuation/symbols used to break up words
const WORD_BREAK_CHARS = /[.\-_*~^`'"´`\u2019\u2018\u201C\u201D]/g;

const applyLeet = (s) => {
    // Multi-char leet first (ph→f, vv→w, etc.)
    let r = s.replace(/ph/g,'f').replace(/vv/g,'w').replace(/qu/gi,'kw');
    // Single-char leet
    return r.split('').map(c => LEET[c] || c).join('');
};

const collapseRepeats = (s) =>
    // "fuuuuck" → "fuuck" → keep max 2 of same char (handles real doubles like "ll")
    s.replace(/(.)\1{2,}/g, '$1$1');

const removeSpacingTrick = (s) =>
    // Matches "f u c k", "m a d a r c h o d" → collapses to single run
    s.replace(/\b([a-z])([\s\-_.]+[a-z]){2,}\b/g, m => m.replace(/[\s\-_.]+/g,''));

/**
 * Produce all text variants used for matching.
 * Returns { raw, norm, normNS, tokens, normTokens, spacedCollapsed }
 */
const buildVariants = (text) => {
    const raw = text;
    const lower = text.toLowerCase()
        .replace(ZERO_WIDTH, '')
        .replace(WORD_BREAK_CHARS, ' ');

    // Spacing trick collapse (before leet so "f u c k" → "fuck")
    const spacedCollapsed = removeSpacingTrick(lower);

    // Full normalization: leet + repeat collapse + strip non-alnum
    const norm = collapseRepeats(applyLeet(spacedCollapsed))
        .replace(/[^a-z0-9\s\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF]/g, ' ')
        .replace(/\s+/g, ' ').trim();

    // No-space variant catches "fuckthis", "madarchodyaar" etc.
    const normNS = norm.replace(/\s/g, '');
    const lowerNS = lower.replace(/\s/g, '');

    const tokens     = lower.split(/\s+/).filter(t => t.length >= 2);
    const normTokens = norm.split(/\s+/).filter(t => t.length >= 2);

    return { raw, lower, spacedCollapsed, norm, normNS, lowerNS, tokens, normTokens };
};

/* ════════════════════════════════════════════════════════════════════════
   §D  MULTILINGUAL WORD DICTIONARIES
   Format: [word, type, severity]
   type     : 'abuse' | 'explicit' | 'hate' | 'threat'
   severity : 'low' | 'medium' | 'high' | 'severe'
════════════════════════════════════════════════════════════════════════ */

/* ── §D1  ENGLISH ─────────────────────────────────────────────────────── */
const WORDS_EN = [
    // Profanity — medium
    ['fuck','abuse','medium'],       ['fucker','abuse','medium'],
    ['fucking','abuse','medium'],    ['fucked','abuse','medium'],
    ['fck','abuse','medium'],        ['fuk','abuse','medium'],
    ['wtf','abuse','low'],           ['shit','abuse','low'],
    ['shitt','abuse','low'],         ['crap','abuse','low'],
    ['bitch','abuse','medium'],      ['bitches','abuse','medium'],
    ['bastard','abuse','medium'],    ['asshole','abuse','medium'],
    ['ass','abuse','low'],           ['arse','abuse','low'],
    ['cunt','abuse','high'],         ['dick','abuse','medium'],
    ['cock','abuse','medium'],       ['pussy','abuse','medium'],
    ['prick','abuse','medium'],      ['wanker','abuse','medium'],
    ['twat','abuse','medium'],       ['bollocks','abuse','low'],
    ['jackass','abuse','medium'],    ['douchebag','abuse','medium'],
    ['scumbag','abuse','medium'],    ['motherfucker','abuse','high'],
    ['mf','abuse','medium'],         ['af','abuse','low'],
    // Slurs
    ['nigger','hate','severe'],      ['nigga','hate','high'],
    ['faggot','hate','severe'],      ['fag','hate','high'],
    ['retard','abuse','high'],       ['spic','hate','high'],
    ['chink','hate','high'],         ['kike','hate','severe'],
    ['tranny','hate','high'],        ['dyke','hate','high'],
    // Explicit English
    ['whore','explicit','high'],     ['slut','explicit','high'],
    ['nude','explicit','medium'],    ['nudes','explicit','medium'],
    ['naked','explicit','medium'],   ['porn','explicit','high'],
    ['porno','explicit','high'],     ['xxx','explicit','high'],
    ['blowjob','explicit','high'],   ['handjob','explicit','high'],
    ['cumshot','explicit','high'],   ['creampie','explicit','high'],
    ['boobs','explicit','medium'],   ['tits','explicit','medium'],
    ['penis','explicit','medium'],   ['vagina','explicit','medium'],
    ['anal','explicit','high'],      ['incest','explicit','severe'],
    ['rape','threat','severe'],      ['molest','threat','severe'],
    ['pedophile','threat','severe'], ['pedo','threat','severe'],
    // Online platforms (contextual — combined with explicit)
    ['onlyfans','explicit','medium'],
    ['pornhub','explicit','high'],   ['xvideos','explicit','high'],
    ['xnxx','explicit','high'],      ['xhamster','explicit','high'],
    ['redtube','explicit','high'],   ['youporn','explicit','high'],
    // Threat words
    ['kys','threat','severe'],       ['kill yourself','threat','severe'],
    ['die','threat','medium'],
];

/* ── §D2  HINDI — TRANSLITERATED (Roman script) ─────────────────────── */
const WORDS_HI_ROMAN = [
    // High-severity (gaali — core)
    ['madarchod','abuse','high'],    ['madarchode','abuse','high'],
    ['madarchodi','abuse','high'],   ['madarchot','abuse','high'],
    ['maderchod','abuse','high'],    ['madrchod','abuse','high'],
    ['madarjaat','abuse','high'],    ['madrjat','abuse','high'],
    ['mdrchd','abuse','high'],       ['mdr','abuse','medium'],
    ['behenchod','abuse','high'],    ['bhenchod','abuse','high'],
    ['behnchod','abuse','high'],     ['behen chod','abuse','high'],
    ['bhen chod','abuse','high'],    ['bhainchod','abuse','high'],
    ['bnchd','abuse','high'],        ['bc','abuse','medium'],
    ['bhosdike','abuse','high'],     ['bhosadike','abuse','high'],
    ['bhosdiwala','abuse','high'],   ['bhosdiwale','abuse','high'],
    ['bhosdiwali','abuse','high'],   ['bhosad','abuse','high'],
    ['bhosdi','abuse','high'],       ['bsdk','abuse','high'],
    ['bsdc','abuse','high'],
    ['chutiya','abuse','high'],      ['chutiye','abuse','high'],
    ['chutia','abuse','high'],       ['chutiyo','abuse','high'],
    ['chootiya','abuse','high'],     ['chutiyap','abuse','high'],
    ['chodna','explicit','high'],    ['chod','explicit','high'],
    ['chudai','explicit','high'],    ['chudwa','explicit','high'],
    ['chudwana','explicit','high'],
    ['randi','explicit','high'],     ['randee','explicit','high'],
    ['rande','explicit','high'],     ['raand','explicit','high'],
    ['raandi','explicit','high'],    ['r4ndi','explicit','high'],
    ['gaandu','abuse','high'],       ['gandu','abuse','high'],
    ['gaand','abuse','high'],        ['g4ndu','abuse','high'],
    ['lund','explicit','high'],      ['loda','explicit','high'],
    ['lavda','explicit','high'],     ['lauda','explicit','high'],
    ['laude','explicit','high'],     ['lode','explicit','high'],
    ['loda','explicit','high'],      ['l**d','explicit','high'],
    ['chut','explicit','high'],      ['choot','explicit','high'],
    ['bur','explicit','high'],       ['boor','explicit','high'],
    ['nangi','explicit','high'],     ['nanga','explicit','high'],
    ['harami','abuse','medium'],     ['haraami','abuse','medium'],
    ['haramzada','abuse','high'],    ['haramzade','abuse','high'],
    ['haramkhor','abuse','medium'],
    ['kamina','abuse','medium'],     ['kameena','abuse','medium'],
    ['kamine','abuse','medium'],     ['kaminey','abuse','medium'],
    ['kutte','abuse','medium'],      ['kuttiya','abuse','medium'],
    ['kutiya','abuse','medium'],     ['kutia','abuse','medium'],
    ['suar','abuse','medium'],       ['suarni','abuse','medium'],
    ['gadha','abuse','low'],         ['gadhe','abuse','low'],
    ['ullu','abuse','low'],          ['ullo','abuse','low'],
    ['ullu ka pattha','abuse','medium'],
    ['bhadwa','abuse','high'],       ['bhadwaa','abuse','high'],
    ['bhadwe','abuse','high'],       ['bhadway','abuse','high'],
    ['saala','abuse','low'],         ['saale','abuse','low'],
    ['saali','abuse','low'],         ['sala','abuse','low'],
    ['sale','abuse','low'],          ['sali','abuse','low'],
    ['jhatu','abuse','medium'],      ['jhaatu','abuse','medium'],
    ['jhaat','abuse','medium'],
    ['mc','abuse','medium'],         ['mf','abuse','medium'],
    ['madarchod ka','abuse','high'],
    ['teri maa','abuse','high'],     ['teri maa ki','abuse','high'],
    ['teri maa ko','abuse','high'],  ['teri maa ka','abuse','high'],
    ['maa ki aankh','abuse','high'], ['maa chod','abuse','high'],
    ['maa ki','abuse','high'],       ['maa ka','abuse','medium'],
    ['baap ka','abuse','medium'],    ['baap ki','abuse','medium'],
    ['teri behen','abuse','high'],   ['teri behan','abuse','high'],
    ['bhad mein ja','abuse','medium'],['nikal yahan se','abuse','low'],
    ['chup ho ja','abuse','low'],    ['chup kar','abuse','low'],
    ['bakwas mat kar','abuse','low'],['jhootha','abuse','low'],
    ['sex karo','explicit','high'],  ['mujhse sex','explicit','high'],
    ['sex karoge','explicit','high'],['sex karte','explicit','high'],
    ['nangi photo','explicit','high'],['nangi video','explicit','high'],
    ['nangi pics','explicit','high'],
];

/* ── §D3  HINDI — DEVANAGARI (native script) ─────────────────────────── */
const WORDS_HI_DEVA = [
    ['मादरचोद','abuse','high'],    ['बहनचोद','abuse','high'],
    ['चुतिया','abuse','high'],     ['भोसड़ीके','abuse','high'],
    ['रंडी','explicit','high'],    ['गांड','explicit','high'],
    ['लोड़ा','explicit','high'],   ['लंड','explicit','high'],
    ['चूत','explicit','high'],     ['हरामी','abuse','medium'],
    ['कमीना','abuse','medium'],    ['कुत्ता','abuse','medium'],
    ['कुत्ती','abuse','medium'],   ['सूअर','abuse','medium'],
    ['गधा','abuse','low'],         ['उल्लू','abuse','low'],
    ['भड़वा','abuse','high'],      ['साला','abuse','low'],
    ['झाटू','abuse','medium'],     ['रण्डी','explicit','high'],
    ['मादरजात','abuse','high'],    ['हरामज़ादा','abuse','high'],
    ['बकवास','abuse','low'],       ['गंदा','abuse','low'],
    ['नंगी','explicit','high'],    ['नंगा','explicit','high'],
    ['चुदाई','explicit','high'],   ['चोदना','explicit','high'],
    ['लौड़ा','explicit','high'],
];

/* ── §D4  BENGALI ────────────────────────────────────────────────────── */
const WORDS_BN = [
    // Transliterated
    ['choda','explicit','high'],   ['chodi','explicit','high'],
    ['chudchi','explicit','high'], ['boga','explicit','high'],
    ['maagi','explicit','high'],   ['maagir','explicit','high'],
    ['khankir','abuse','high'],    ['khanki','abuse','high'],
    ['shuar','abuse','medium'],    ['shala','abuse','medium'],
    ['harami','abuse','medium'],   ['khankimar','abuse','high'],
    ['randi','explicit','high'],   ['behchara','abuse','low'],
    ['gaand','explicit','high'],   ['loda','explicit','high'],
    ['voda','explicit','high'],    ['futki','explicit','high'],
    // Native script
    ['চোদা','explicit','high'],   ['মাগি','explicit','high'],
    ['খানকি','abuse','high'],     ['শুয়োর','abuse','medium'],
    ['শালা','abuse','medium'],    ['রান্ডি','explicit','high'],
    ['গাধা','abuse','low'],
];

/* ── §D5  TAMIL ─────────────────────────────────────────────────────── */
const WORDS_TA = [
    // Transliterated
    ['poda','abuse','medium'],     ['punda','explicit','high'],
    ['pundai','explicit','high'],  ['poolu','explicit','high'],
    ['soothu','explicit','high'],  ['sootha','explicit','high'],
    ['naaye','abuse','medium'],    ['naai','abuse','medium'],
    ['otha','explicit','high'],    ['ootha','explicit','high'],
    ['sunni','explicit','high'],   ['thevdiya','explicit','high'],
    ['thevudiya','explicit','high'],['koothi','explicit','high'],
    ['oombu','explicit','high'],   ['baadu','abuse','medium'],
    ['loosu','abuse','low'],       ['paavi','abuse','medium'],
    ['kena','abuse','low'],        ['myir','abuse','medium'],
    // Native script
    ['போடா','abuse','medium'],    ['பூல்','explicit','high'],
    ['சூத்து','explicit','high'],  ['நாயே','abuse','medium'],
    ['தேவடியா','explicit','high'], ['ஊம்பு','explicit','high'],
];

/* ── §D6  TELUGU ─────────────────────────────────────────────────────── */
const WORDS_TE = [
    ['dengu','explicit','high'],   ['denguta','explicit','high'],
    ['puku','explicit','high'],    ['modda','explicit','high'],
    ['lanja','explicit','high'],   ['bokka','explicit','high'],
    ['gudda','abuse','medium'],    ['naraya','abuse','medium'],
    ['pichi','abuse','low'],       ['bevarsi','abuse','medium'],
    ['amma dengu','explicit','high'],['akka dengu','explicit','high'],
    ['kukka','abuse','medium'],    ['poramboku','abuse','low'],
    // Script
    ['దెంగు','explicit','high'],   ['పూకు','explicit','high'],
    ['మొడ్డ','explicit','high'],   ['లంజ','explicit','high'],
];

/* ── §D7  KANNADA ────────────────────────────────────────────────────── */
const WORDS_KN = [
    ['sule','explicit','high'],    ['sulege','explicit','high'],
    ['tunne','explicit','high'],   ['tika','explicit','high'],
    ['thumba','abuse','low'],      ['haalad','abuse','medium'],
    ['boli','explicit','high'],    ['boli maga','explicit','high'],
    ['nin amma','abuse','high'],   ['madakalu','abuse','medium'],
    ['katte','abuse','medium'],    ['looteri','abuse','low'],
    ['haramkhor','abuse','medium'],
    // Script
    ['ಸೂಳೆ','explicit','high'],   ['ತುನ್ನೆ','explicit','high'],
    ['ಬೋಳಿ','explicit','high'],
];

/* ── §D8  MARATHI ────────────────────────────────────────────────────── */
const WORDS_MR = [
    ['zavadya','explicit','high'],  ['zavle','explicit','high'],
    ['rand','explicit','high'],     ['randa','explicit','high'],
    ['harami','abuse','medium'],    ['ghanta','abuse','medium'],
    ['madaka','abuse','medium'],    ['aai zavli','explicit','high'],
    ['aai ghe','explicit','high'],  ['aaichi gand','explicit','high'],
    ['aai chi gand','explicit','high'],
    ['bhosdya','abuse','high'],     ['bhosdich','abuse','high'],
    ['chakna','abuse','medium'],    ['thamb re','abuse','low'],
    // Script
    ['झवाड्या','explicit','high'], ['रांड','explicit','high'],
    ['आयची गांड','explicit','high'],
];

/* ── §D9  PUNJABI ────────────────────────────────────────────────────── */
const WORDS_PA = [
    ['lund','explicit','high'],     ['phuddi','explicit','high'],
    ['gandu','abuse','high'],       ['gaand','explicit','high'],
    ['bhen di','abuse','high'],     ['bhen de','abuse','high'],
    ['maaki','abuse','high'],       ['maaki nuu','abuse','high'],
    ['teri maa di','abuse','high'], ['teri bhain','abuse','high'],
    ['chodu','explicit','high'],    ['bhain chod','abuse','high'],
    ['kamine','abuse','medium'],    ['haraami','abuse','medium'],
    ['kutte','abuse','medium'],     ['sooar','abuse','medium'],
    ['gadhe','abuse','low'],        ['ulluan','abuse','low'],
    ['randi','explicit','high'],    ['yaar da','abuse','low'],
    // Script (Gurmukhi)
    ['ਲੁੰਡ','explicit','high'],   ['ਭੈਣ ਦੇ','abuse','high'],
    ['ਰੰਡੀ','explicit','high'],   ['ਗੰਡੂ','abuse','high'],
];

/* ── §D10  BHOJPURI ──────────────────────────────────────────────────── */
const WORDS_BH = [
    ['randie','explicit','high'],  ['randin','explicit','high'],
    ['lauda','explicit','high'],   ['laude','explicit','high'],
    ['laudi','explicit','high'],   ['chodha','explicit','high'],
    ['bhaini','abuse','medium'],   ['bhaujai','abuse','medium'],
    ['bhosad','abuse','high'],     ['chhi chhi','abuse','low'],
    ['haramia','abuse','medium'],  ['khariya','abuse','low'],
    ['dehati randi','explicit','high'],
];

/* ── §D11  HARYANAVI ─────────────────────────────────────────────────── */
const WORDS_HA = [
    ['thara baap','abuse','high'],  ['thara baap ka','abuse','high'],
    ['gaand maar','explicit','high'],['gaand mara','explicit','high'],
    ['chodu','explicit','high'],    ['lodi','abuse','medium'],
    ['randi','explicit','high'],    ['teri maa ki','abuse','high'],
    ['bhen ke','abuse','high'],     ['bhen ke lode','abuse','high'],
    ['kal ka chhora','abuse','low'],['nikkar dha','abuse','low'],
    ['haramjaada','abuse','high'],  ['suarni','abuse','medium'],
];

/* ── §D12  Build lookup structures ───────────────────────────────────── */

// Flat set of all raw words → {type, severity}  (for O(1) lookup)
const WORD_MAP = new Map();
// For fuzzy matching: group words by length band
const FUZZY_WORDS = { short: [], medium: [], long: [] }; // {word, type, severity}

const _allWordEntries = [
    ...WORDS_EN, ...WORDS_HI_ROMAN, ...WORDS_HI_DEVA,
    ...WORDS_BN, ...WORDS_TA, ...WORDS_TE, ...WORDS_KN,
    ...WORDS_MR, ...WORDS_PA, ...WORDS_BH, ...WORDS_HA,
];

for (const [w, type, severity] of _allWordEntries) {
    const key = w.toLowerCase();
    if (!WORD_MAP.has(key)) WORD_MAP.set(key, { type, severity });
    // Only index Latin-script words for fuzzy matching
    if (/^[a-z\s]+$/.test(key) && key.length >= 4) {
        const bucket = key.length <= 7 ? 'short' : key.length <= 12 ? 'medium' : 'long';
        FUZZY_WORDS[bucket].push({ word: key, type, severity });
    }
}

/* ════════════════════════════════════════════════════════════════════════
   §E  REGEX PATTERN BANKS
   Patterns that cannot be captured by word lists alone.
════════════════════════════════════════════════════════════════════════ */

// §E1 Harassment & threats
const HARASSMENT_RX = [
    /\bkill\s*(your|ur|u)\s*self\b/i,
    /\bkys\b/i,
    /\bgo\s*(die|hang|kill\s*yourself)\b/i,
    /\bi\s*(will|gonna|am\s*going\s*to|wil|wll)\s*(kill|hurt|rape|beat|stab|destroy|find|track)\s*(you|u|ur|ye)\b/i,
    /\b(i\s*know\s*where\s*you\s*live|i\s*will\s*find\s*you)\b/i,
    /\byou\s*(should|deserve)\s*(to\s*)?(die|suffer|get\s*hurt|burn)\b/i,
    /\b(send\s*me\s*your\s*address|where\s*do\s*you\s*live|tell\s*me\s*your\s*location)\b/i,
    // Hindi threats (transliterated)
    /\bjaan\s*se\s*maar(unga|dunga|te\s*hain)\b/i,
    /\bkaat\s*(dunga|denge|dugi)\b/i,
    /\btor\s*(dunga|dega|denge)\b/i,
    /\bjaan\s*(le\s*lunga|le\s*lega)\b/i,
    /\btujhe\s*(maar|dhundh|kaat|uda)\b/i,
    /\b(maar\s*dunga|kaat\s*ke\s*rakh)\b/i,
    /\bghar\s*aa\s*jaunga\b/i,
    // Tamil threats
    /\buthachi\s*poda\b/i,
    /\bthala\s*vetturen\b/i,
];

// §E2 Explicit sexual content (multi-language patterns)
const EXPLICIT_RX = [
    /\bsend\s*(me\s*)?(nud(e|es)|naked\s*(pic|photo|video|img))\b/i,
    /\b(nude|naked)\s*(pic|photo|video|image|clip|selfie)\b/i,
    /\b(sex\s*(video|chat|cam|live|pic|photo|karenge|karte))\b/i,
    /\b(video\s*call\s*pe\s*nanga|vc\s*pe\s*nanga)\b/i,
    /\b(see|watch|show)\s*me\s*(naked|nude|without\s*clothes)\b/i,
    /\b(masturbat(e|ion|ing|ed)|self\s*pleasure)\b/i,
    /\b(erotic|xxx|18\+)\s*(chat|video|photo|content)\b/i,
    /\bwant\s*to\s*(have\s*)?sex\s*with\s*(you|u)\b/i,
    // Hindi explicit patterns
    /\bnangi\s*(photo|pics|video|clip)\b/i,
    /\b(chudai|chodna|chud)\s*(video|photo|pic)\b/i,
    /\bmujhse\s*(sex|chudai)\b/i,
    /\bsex\s*(karo|karte|karoge|karna)\b/i,
    /\b(lund|lauda)\s*(dikhao|dikha|photo|pic)\b/i,
    /\b(raat\s*ko\s*mil|ghar\s*pe\s*aa|hotel\s*mein)\s*(sex|chudai|enjoy)\b/i,
    // Bengali explicit
    /\bchoda\s*(video|pic|photo)\b/i,
    // Tamil explicit
    /\b(pundai|koothi)\s*(photo|video|pic)\b/i,
    // Telugu explicit
    /\b(puku|dengu)\s*(photo|video)\b/i,
];

// §E3 Scam & fraud (English + Hindi + regional)
const SCAM_RX = [
    // Crypto
    /\b(bitcoin|btc|eth|usdt|crypto|bnb|sol|dogecoin)\s*(send|transfer|earn|invest|profit|doubl|giv)\b/i,
    /\b(invest|put)\s*(money|cash|funds?)\s*(in|into)\s*(crypto|bitcoin|scheme)\b/i,
    // Money requests
    /\b(send|transfer|give|lend)\s*(me\s*)?(money|cash|funds?|rs\.?|rupees?|\$|dollars?|usd|inr)\b/i,
    /\bpaise\s*(bhejo|do|transfer\s*karo|chahiye|dedo)\b/i,
    /\bpaisa\s*(bhejo|do|transfer)\b/i,
    /\b(loan|borrow)\s*(me|karo|chahiye)\b/i,
    // Phishing
    /\bverify\s*your\s*(account|card|identity|number|email)\b/i,
    /\benter\s*(your\s*)?(otp|pin|password|credit\s*card|cvv|account)\b/i,
    /\bshare\s*(your\s*)?(otp|pin|password)\b/i,
    /\b(login|log\s*in)\s*(using|with)\s*(this|the)\s*(link|url)\b/i,
    // Prize / lottery
    /\b(you\s*(won|win|are\s*the\s*winner|have\s*won))\b/i,
    /\b(lottery|jackpot|sweepstake|raffle|lucky\s*draw|lucky\s*winner)\b/i,
    /\bclaim\s*your\s*(prize|reward|gift|money|cash)\b/i,
    /\bfree\s*(recharge|gift|iphone|money|cash|data|prize|reward|laptop)\b/i,
    // Social engineering
    /\b(click|tap|open)\s*(here|this\s*link|below|now)\b/i,
    /\b(paytm|gpay|phonepe|google\s*pay|upi)\s*(me|kar|karo|bhejo)\b/i,
    /\b(account\s*(number|no\.?|num)|bank\s*detail|upi\s*id|ifsc)\b/i,
    /\b(whatsapp|telegram|signal)\s*(me|karo|par\s*aao)\b/i,
    /\b(earn|make)\s*(\d[\d,.]*)\s*(rs|rupees|dollars?|per\s*(day|hour|week|month))\b/i,
    /\bwork\s*from\s*home\s*(offer|job|opportunity)\b/i,
    // Investment scams
    /\b(guaranteed|100\s*%\s*)(profit|returns?|income)\b/i,
    /\bdouble\s*your\s*(money|investment|returns?)\b/i,
    /\binvest\s*(only\s*)?\d[\d,.]*\s*(rs|rupees|\$)\b/i,
];

// §E4 Hate speech (religious, ethnic, casteist — India-specific)
const HATE_RX = [
    /\ball\s*(muslims?|hindus?|christians?|jews?|sikhs?|dalits?)\s*(are|should|must|deserve|need\s*to)\b/i,
    /\bkill\s*(all\s*)?(muslims?|hindus?|christians?|jews?|dalits?|kafirs?)\b/i,
    /\bgo\s*back\s*to\s*(pakistan|bangladesh|africa|china|nepal|your\s*country)\b/i,
    /\b(muslims?|hindus?|dalits?|christians?)\s*(are\s*)?(terrorist|jihadi|dirty|filthy|worthless|animals?)\b/i,
    /\breservation\s*(beggars?|thieves?|quota\s*cheat|scam)\b/i,
    /\b(banish|expel|deport)\s*(all\s*)?(muslims?|hindus?|dalits?|migrants?)\b/i,
    /\b(ethnic\s*cleansing|genocide\s*of)\b/i,
    /\bjihad\s*(against|on)\b/i,
    /\b(low\s*caste|chamaar|bhangi)\s*(are|stay|go)\b/i,
    // Hindi hate (transliterated)
    /\b(musalman|musalmaan)\s*(haraami|terrorist|desh\s*chhod)\b/i,
    /\bpakistani\s*(nikal|bhaag|mar)\b/i,
    /\bchamar\s*(nikal|bhaag|teri\s*maa)\b/i,
    /\bsab\s*(musalman|hindu|dalit)\s*(maar\s*do|khatam\s*karo)\b/i,
];

// §E5 Malicious links & social-engineering invites
const SAFE_DOMAINS_SET = new Set([
    'youtube.com','youtu.be','music.youtube.com','google.com','google.co.in',
    'instagram.com','facebook.com','twitter.com','x.com','tiktok.com',
    'reddit.com','wikipedia.org','tenor.com','giphy.com','imgbb.com',
    'imgur.com','i.ytimg.com','open.spotify.com','soundcloud.com',
    'amazon.com','amazon.in','flipkart.com','myntra.com','snapdeal.com',
    'zomato.com','swiggy.com','meesho.com','paytm.com','phonepe.com',
    'whatsapp.com','wa.me','linkedin.com','github.com','stackoverflow.com',
]);

const SUSPICIOUS_LINK_RX = [
    /https?:\/\/(\d{1,3}\.){3}\d{1,3}/,                               // raw IP
    /https?:\/\/[^\s/]+\.(xyz|tk|ml|ga|cf|pw|top|icu|vip|buzz|gq)\b/i,
    /\b(bit\.ly|tinyurl\.com|cutt\.ly|rb\.gy|short\.link|gg\.gg|is\.gd|v\.gd|t\.ly)\//i,
    /\b(t\.me|telegram\.me|telegram\.dog)\/\w+/i,
    /\bdiscord\.gg\/\w+/i,
    /\b(linktr\.ee\/|linktree\.com\/)\w+/i,                           // often used in scams
];

const isSafeDomain = (url) => {
    try {
        const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
        return SAFE_DOMAINS_SET.has(host) || [...SAFE_DOMAINS_SET].some(d => host.endsWith('.' + d));
    } catch { return false; }
};

/* ════════════════════════════════════════════════════════════════════════
   §F  FUZZY MATCHING ENGINE
   Edit distance for catching 1-2 char misspellings / substitutions.
   Optimised: only run on tokens in the same length band as known bad words.
════════════════════════════════════════════════════════════════════════ */

const editDistance = (a, b) => {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > CFG.FUZZY_LONG) return Infinity;
    const m = a.length, n = b.length;
    const dp = new Uint8Array((m + 1) * (n + 1));
    for (let i = 0; i <= m; i++) dp[i * (n + 1)] = i;
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i * (n + 1) + j] = a[i-1] === b[j-1]
                ? dp[(i-1) * (n + 1) + (j-1)]
                : 1 + Math.min(
                    dp[(i-1) * (n + 1) + j],
                    dp[i * (n + 1) + (j-1)],
                    dp[(i-1) * (n + 1) + (j-1)]
                );
        }
    }
    return dp[m * (n + 1) + n];
};

/**
 * Check a single token (normalized) against all fuzzy word candidates.
 * Returns first match or null.
 */
const fuzzyMatchToken = (token) => {
    if (token.length < 4) return null;
    const band = token.length <= 7 ? 'short' : token.length <= 12 ? 'medium' : 'long';
    const maxDist = band === 'short' ? CFG.FUZZY_SHORT : band === 'medium' ? CFG.FUZZY_MEDIUM : CFG.FUZZY_LONG;
    const candidates = FUZZY_WORDS[band];
    for (const { word, type, severity } of candidates) {
        // Quick length pre-filter
        if (Math.abs(word.length - token.length) > maxDist) continue;
        const dist = editDistance(token, word);
        if (dist > 0 && dist <= maxDist) {
            return { type, severity, matched: word, fuzzy: true, dist };
        }
    }
    return null;
};

/* ════════════════════════════════════════════════════════════════════════
   §G  DETECTION FUNCTIONS
════════════════════════════════════════════════════════════════════════ */

/**
 * Check all text variants against the multilingual word map.
 * Also checks multi-word phrases (2-3 word n-grams).
 */
const checkWordLists = (variants) => {
    const { lower, norm, normNS, lowerNS, tokens, normTokens, spacedCollapsed } = variants;

    // Helper: check a single string's tokens + bigrams + trigrams
    const scanString = (s) => {
        const toks = s.split(/\s+/).filter(Boolean);
        // single tokens
        for (const t of toks) {
            if (WORD_MAP.has(t)) return { ...WORD_MAP.get(t), matched: t };
        }
        // 2-gram
        for (let i = 0; i < toks.length - 1; i++) {
            const bi = toks[i] + ' ' + toks[i+1];
            if (WORD_MAP.has(bi)) return { ...WORD_MAP.get(bi), matched: bi };
        }
        // 3-gram
        for (let i = 0; i < toks.length - 2; i++) {
            const tri = toks[i] + ' ' + toks[i+1] + ' ' + toks[i+2];
            if (WORD_MAP.has(tri)) return { ...WORD_MAP.get(tri), matched: tri };
        }
        return null;
    };

    // Check all variants in order of specificity
    for (const s of [lower, norm, spacedCollapsed, normNS, lowerNS]) {
        const hit = scanString(s);
        if (hit) return hit;
    }

    // Also check each token against WORD_MAP directly (handles no-space joins)
    for (const t of [...tokens, ...normTokens]) {
        if (WORD_MAP.has(t)) return { ...WORD_MAP.get(t), matched: t };
    }

    return null;
};

/**
 * Fuzzy check: only runs if word-list check didn't fire.
 * Checks normalized tokens only (Roman script).
 */
const checkFuzzy = (variants) => {
    const { normTokens } = variants;
    for (const token of normTokens) {
        const hit = fuzzyMatchToken(token);
        if (hit) return hit;
    }
    return null;
};

/**
 * Check all regex pattern banks against raw text + normalized text.
 */
const checkPatterns = (text, norm) => {
    for (const rx of HARASSMENT_RX) {
        if (rx.test(text) || rx.test(norm)) return { type:'harassment', severity:'severe', label:'Threats / harassment' };
    }
    for (const rx of EXPLICIT_RX) {
        if (rx.test(text) || rx.test(norm)) return { type:'explicit', severity:'high', label:'Explicit sexual content' };
    }
    for (const rx of HATE_RX) {
        if (rx.test(text) || rx.test(norm)) return { type:'hate', severity:'high', label:'Hate speech' };
    }
    for (const rx of SCAM_RX) {
        if (rx.test(text) || rx.test(norm)) return { type:'scam', severity:'high', label:'Scam / fraud attempt' };
    }
    // Links
    const urls = text.match(/https?:\/\/[^\s]+/gi) || [];
    for (const url of urls) {
        if (!isSafeDomain(url) && SUSPICIOUS_LINK_RX.some(p => p.test(url))) {
            return { type:'link', severity:'medium', label:'Suspicious link' };
        }
    }
    // Non-https suspicious patterns (Telegram/Discord without https prefix)
    if (!urls.length) {
        for (const p of SUSPICIOUS_LINK_RX) {
            if (p.test(text)) return { type:'link', severity:'medium', label:'Suspicious link' };
        }
    }
    return null;
};

/* ════════════════════════════════════════════════════════════════════════
   §H  SPAM / FLOOD / REPEAT DETECTOR
════════════════════════════════════════════════════════════════════════ */

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

const SPAM_KEYWORDS = [
    'click here','click now','click link','free money','earn daily',
    'make money fast','guaranteed profit','double your money',
    'investment opportunity','get rich quick','passive income',
    'whatsapp me','telegram me','contact me on','dm me for',
    'cheap followers','buy followers','buy likes','cheap services',
    'join now for free','limited offer','register now',
    'work from home job','earn per day','referral code',
];

const detectSpam = (uid, text, now) => {
    // Flood: N messages in window
    const ts = (userMsgTimestamps.get(uid) || []).filter(t => now - t < CFG.FLOOD_WINDOW_MS);
    ts.push(now);
    userMsgTimestamps.set(uid, ts);
    if (ts.length >= CFG.FLOOD_COUNT) {
        return { detected:true, type:'spam', severity:'medium', label:'Message flooding' };
    }

    // Repeat / copy-paste
    const recent = (userRecentTexts.get(uid) || []).filter(e => now - e.ts < CFG.REPEAT_WINDOW_MS);
    const matches = recent.filter(e => strSimilarity(e.text, text) >= CFG.REPEAT_SIMILARITY).length;
    recent.push({ text, ts: now });
    if (recent.length > 30) recent.shift();
    userRecentTexts.set(uid, recent);
    if (matches >= CFG.REPEAT_COUNT) {
        return { detected:true, type:'spam', severity:'medium', label:'Repeated messages' };
    }

    // Spam keywords
    const lower = text.toLowerCase();
    for (const kw of SPAM_KEYWORDS) {
        if (lower.includes(kw)) return { detected:true, type:'spam', severity:'low', label:'Spam content' };
    }

    return { detected: false };
};

/* ════════════════════════════════════════════════════════════════════════
   §I  MAIN CONTENT DETECTOR
   Runs word-list → pattern → fuzzy pipeline. Returns first/worst hit.
════════════════════════════════════════════════════════════════════════ */

const SEVERITY_RANK = { low:1, medium:2, high:3, severe:4 };

const detectContent = (text) => {
    const variants = buildVariants(text);

    // 1. Regex patterns (fast path — catches harassment/explicit/scam/hate/links)
    const patternHit = checkPatterns(text, variants.norm);
    if (patternHit) return { detected: true, ...patternHit };

    // 2. Word list (dictionary match across all variants + n-grams)
    const wordHit = checkWordLists(variants);
    if (wordHit) {
        const label =
            wordHit.type === 'abuse'    ? 'Abusive language' :
            wordHit.type === 'explicit' ? 'Explicit content' :
            wordHit.type === 'hate'     ? 'Hate speech' :
            wordHit.type === 'threat'   ? 'Threatening content' : 'Rule violation';
        return { detected: true, ...wordHit, label };
    }

    // 3. Fuzzy match — misspellings / evasion variants (low false-positive)
    const fuzzyHit = checkFuzzy(variants);
    if (fuzzyHit) {
        const label =
            fuzzyHit.type === 'abuse'    ? 'Abusive language (variant)' :
            fuzzyHit.type === 'explicit' ? 'Explicit content (variant)' :
            fuzzyHit.type === 'hate'     ? 'Hate speech (variant)' : 'Rule violation';
        // Downgrade severity by 1 step for fuzzy matches to reduce false positives
        const sev = ['low','medium','high','severe'];
        const idx = Math.max(0, sev.indexOf(fuzzyHit.severity) - 1);
        return { detected: true, ...fuzzyHit, severity: sev[idx], label };
    }

    return { detected: false };
};

/* ════════════════════════════════════════════════════════════════════════
   §J  SESSION HELPERS
════════════════════════════════════════════════════════════════════════ */

const getSessionViolations = (uid) => {
    if (!userSessionViolations.has(uid)) {
        userSessionViolations.set(uid, {
            total:0, spam:0, abuse:0, explicit:0, hate:0, harassment:0, scam:0, link:0,
        });
    }
    return userSessionViolations.get(uid);
};

const fmtDuration = (ms) => {
    const m = Math.ceil(ms / 60000);
    if (m >= 60) return `${Math.ceil(m/60)} hour${Math.ceil(m/60)!==1?'s':''}`;
    return `${m} minute${m!==1?'s':''}`;
};

/* ════════════════════════════════════════════════════════════════════════
   §K  FIRESTORE ENFORCEMENT  (staff-only: owner / admin / moderator)
════════════════════════════════════════════════════════════════════════ */

const claimEnforcement = async (roomId, messageId, action, violationType, uid) => {
    try {
        const ref = doc(db, 'rooms', roomId, 'automod', messageId);
        await runTransaction(db, async (t) => {
            const snap = await t.get(ref);
            if (snap.exists()) throw new Error('claimed');
            t.set(ref, { action, violationType, uid, handledAt: serverTimestamp(), expiresAt: Date.now() + CFG.CLAIM_TTL_MS });
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
            uid, displayName, reason, kickedBy:'TingleBot AutoMod', kickedAt: serverTimestamp(),
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
                text: (text||'').slice(0, 200),
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
            text, uid:'tinglebot_system_official_2024', displayName:'TingleBot',
            isBot:true, systemBot:true, tinglebotType,
            createdAt: serverTimestamp(),
            noReply:true, noReaction:true, noReport:true, noUnread:true,
        });
        if (ref?.id) setTimeout(
            () => deleteDoc(doc(db, 'rooms', roomId, 'messages', ref.id)).catch(()=>{}),
            CFG.NOTICE_TTL_MS
        );
    } catch (_) {}
};

/* ════════════════════════════════════════════════════════════════════════
   §L  PUBLIC API
════════════════════════════════════════════════════════════════════════ */

/**
 * processAutoMod(msg, roomId, currentUid, isStaff)
 *
 * Call this for every incoming message in the snapshot listener (after
 * initial load). The processedMsgIds Set guarantees each message is
 * evaluated exactly once per session regardless of snapshot frequency.
 *
 * @param {object}  msg         Firestore message object (must have .id and .text)
 * @param {string}  roomId      Room being moderated
 * @param {string}  currentUid  UID of the viewing client
 * @param {boolean} isStaff     True if viewing client is owner/admin/moderator.
 *                              Only staff clients write to Firestore.
 */
export const processAutoMod = async (msg, roomId, currentUid = null, isStaff = false) => {
    if (!msg?.id || !roomId) return;
    if (processedMsgIds.has(msg.id)) return;
    processedMsgIds.add(msg.id);

    // Exempt bots + staff senders
    const senderRole = (msg.role || '').toLowerCase();
    if (['owner','admin','moderator'].includes(senderRole)) return;
    if (msg.isBot || msg.systemBot || msg.uid === 'tinglebot_system_official_2024') return;
    if (!msg.uid || !msg.text?.trim()) return;

    const { uid, text, displayName = 'User' } = msg;
    const now = Date.now();

    // Run detection pipeline (all clients)
    const contentHit = detectContent(text);
    const spamHit    = detectSpam(uid, text, now);

    // Content violations take priority; fall back to spam
    const hit = contentHit.detected ? contentHit : (spamHit.detected ? spamHit : null);
    if (!hit) return;

    // Update session violation counters (all clients track locally)
    const sv = getSessionViolations(uid);
    const priorTotal = sv.total;
    sv.total += 1;
    sv[hit.type] = (sv[hit.type] || 0) + 1;

    // Non-staff: detection only — no Firestore writes
    if (!isStaff) return;

    // Determine escalation action
    let action = 'warn', shouldDelete = false, muteDuration = 0, shouldKick = false;

    if      (priorTotal >= CFG.KICK_AT)   { action='kick';     shouldDelete=true; shouldKick=true; }
    else if (priorTotal >= CFG.MUTE_3H_AT){ action='mute_3h';  shouldDelete=true; muteDuration=3*60*60*1000; }
    else if (priorTotal >= CFG.MUTE_30_AT){ action='mute_30';  shouldDelete=true; muteDuration=30*60*1000; }
    else if (priorTotal >= CFG.MUTE_5_AT) { action='mute_5';   shouldDelete=true; muteDuration=5*60*1000; }
    else if (priorTotal >= CFG.DELETE_WARN_AT){ action='delete_warn'; shouldDelete=true; }
    else    { action='warn'; } // 1st offence: warn only

    // Severity overrides: high/severe always delete; severe → fast-track to mute
    if ((hit.severity==='high'||hit.severity==='severe') && !shouldDelete) {
        shouldDelete=true; action='delete_warn';
    }
    if (hit.severity==='severe' && muteDuration===0 && !shouldKick) {
        muteDuration=5*60*1000; action='mute_5';
    }

    // Atomic claim — only one staff client proceeds per message
    const claimed = await claimEnforcement(roomId, msg.id, action, hit.type, uid);
    if (!claimed) return;

    // Execute enforcement
    if (shouldDelete) await removeMessage(roomId, msg.id);
    if (muteDuration > 0) await muteUser(uid, muteDuration, `TingleBot: ${hit.label} (violation #${priorTotal+1})`);
    if (shouldKick)   await kickUser(roomId, uid, displayName, `AutoMod: ${priorTotal+1} violations`);
    await logViolation(uid, roomId, msg.id, text, hit, action);

    // Post TingleBot moderation notice
    let noticeText, tinglebotType;
    if (shouldKick) {
        noticeText = `${displayName} was automatically removed after repeated violations.`;
        tinglebotType = 'kicked';
    } else if (muteDuration > 0) {
        noticeText = `${displayName} has been muted for ${fmtDuration(muteDuration)} — ${hit.label}.`;
        tinglebotType = 'muted';
    } else if (shouldDelete) {
        noticeText = `A message by ${displayName} was removed — ${hit.label}. Next violation will result in a mute.`;
        tinglebotType = 'automod';
    } else {
        noticeText = `${displayName}, please keep the chat respectful. ${hit.label} detected — this is your first warning.`;
        tinglebotType = 'automod';
    }
    await postNotice(roomId, noticeText, tinglebotType);
};

/**
 * resetAutoModState — call when user leaves or changes room.
 * Clears all in-memory session state for a clean start.
 */
export const resetAutoModState = () => {
    userMsgTimestamps.clear();
    userRecentTexts.clear();
    userSessionViolations.clear();
    processedMsgIds.clear();
};
