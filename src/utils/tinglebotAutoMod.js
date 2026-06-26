/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TingleBot Advanced Multilingual Moderation Engine (AMAME) v3.0         ║
 * ║  On-device · Zero external API · Intelligent · Multilingual             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Languages: English · Hindi · Bengali · Tamil · Telugu · Kannada        ║
 * ║             Marathi · Punjabi · Bhojpuri · Haryanavi + mixed-lang       ║
 * ║                                                                          ║
 * ║  Evasion defeat: leet-speak · symbol substitution · spacing tricks      ║
 * ║    repeated-char flooding · zero-width chars · phonetic variants        ║
 * ║    homoglyph (Cyrillic/Greek/Unicode) · hashtag content · emoji abuse   ║
 * ║    abbreviations (mc/bc/bsdk) · Devanagari + transliterated text        ║
 * ║                                                                          ║
 * ║  New in v3.0:                                                            ║
 * ║    • Homoglyph normalization (Cyrillic а→a, Greek ο→o, etc.)            ║
 * ║    • Personal info / doxxing detection (phone, UPI, email, bank)        ║
 * ║    • Emoji abuse signals (🖕 🔞 ☠️ in context)                          ║
 * ║    • CAPS / shouting detection                                           ║
 * ║    • Multi-signal confidence scoring (weak signals accumulate)           ║
 * ║    • Contextual whitelist (false-positive reduction)                     ║
 * ║    • Abbreviation context guard (bc/mc/af need surrounding context)      ║
 * ║    • Persistent cross-session violation tracking via Firestore           ║
 * ║    • Dedicated modLogs Firestore collection                              ║
 * ║    • Varied, natural notice messages                                     ║
 * ║    • Per-type enforcement cooldowns                                      ║
 * ║    • Massively expanded multilingual dictionaries                        ║
 * ║                                                                          ║
 * ║  Architecture:                                                           ║
 * ║   • Detection runs on ALL clients (no Firestore needed)                  ║
 * ║   • Enforcement (delete/mute/kick) runs ONLY on staff clients            ║
 * ║     (owner / admin / moderator) — matches Firestore rules               ║
 * ║   • Firestore transaction claim prevents duplicate enforcement           ║
 * ║   • processedMsgIds dedup prevents re-scanning same message             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import {
    collection, doc, addDoc, deleteDoc, setDoc, getDoc,
    updateDoc, serverTimestamp, arrayUnion, runTransaction, increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';

/* ════════════════════════════════════════════════════════════════════════════
   §A  IN-MEMORY SESSION STATE
════════════════════════════════════════════════════════════════════════════ */

const userMsgTimestamps     = new Map(); // uid → number[]
const userRecentTexts       = new Map(); // uid → {text, ts, normText}[]
const userSessionViolations = new Map(); // uid → {total, spam, abuse, …, scoreAccum}
const processedMsgIds       = new Set(); // message IDs seen this session
const lastNoticeTime        = new Map(); // uid → {[type]: timestamp} — per-type cooldown
const lastActionTime        = new Map(); // uid → timestamp — global action cooldown

/* ════════════════════════════════════════════════════════════════════════════
   §B  CONFIGURATION
════════════════════════════════════════════════════════════════════════════ */

export const CFG = {
    // Flood / repeat
    FLOOD_COUNT          : 5,
    FLOOD_WINDOW_MS      : 9000,
    REPEAT_COUNT         : 3,
    REPEAT_SIMILARITY    : 0.80,
    REPEAT_WINDOW_MS     : 90000,
    // Escalation thresholds (cumulative violation count)
    DELETE_WARN_AT       : 1,
    MUTE_5_AT            : 2,
    MUTE_30_AT           : 3,
    MUTE_3H_AT           : 4,
    MUTE_24H_AT          : 5,
    KICK_AT              : 6,
    // TTLs
    NOTICE_TTL_MS        : 3 * 60 * 1000,
    CLAIM_TTL_MS         : 30 * 60 * 1000,
    // Fuzzy matching — max edit distance per length band
    FUZZY_SHORT          : 1,   // 4-7 chars  → ≤1 substitution
    FUZZY_MEDIUM         : 2,   // 8-12 chars → ≤2 substitutions
    FUZZY_LONG           : 3,   // >12 chars  → ≤3 substitutions
    // CAPS / shouting
    CAPS_MIN_LENGTH      : 8,   // minimum message char count to apply caps check
    CAPS_THRESHOLD       : 0.72,// fraction of alpha chars that must be uppercase
    CAPS_MIN_ALPHA       : 6,   // minimum alphabetic chars in message for caps check
    // Multi-signal scoring
    MULTI_SIGNAL_THRESHOLD : 2.5, // score sum that triggers a multi-signal violation
    // Per-type notice cooldown (don't spam identical notices)
    NOTICE_COOLDOWN_MS   : 60 * 1000,
    // Action cooldown per user (won't take two actions on same user within window)
    ACTION_COOLDOWN_MS   : 8 * 1000,
    // Persist violation record to Firestore when total reaches this
    PERSIST_AT           : 1,
};

/* ════════════════════════════════════════════════════════════════════════════
   §C  NORMALIZATION ENGINE
   Produces multiple text variants to defeat all known evasion tactics.
   Order: homoglyphs → zero-width → spacing tricks → leet → repeat-collapse
════════════════════════════════════════════════════════════════════════════ */

// §C1 — Zero-width / invisible chars
const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD\u2028\u2029\u180E\u034F\u2800]/g;

// §C2 — Punctuation / word-break chars used to split words
const WORD_BREAK_CHARS = /[.\-_*~^`'"´\u2019\u2018\u201C\u201D\u00B7\u2022\u2024]/g;

// §C3 — Homoglyph map: Cyrillic, Greek, and look-alike Unicode → Latin
const HOMOGLYPH_MAP = {
    // Cyrillic look-alikes
    '\u0430':'a','\u0435':'e','\u043e':'o','\u0440':'p','\u0441':'c',
    '\u0445':'x','\u0443':'y','\u0411':'b','\u0412':'b','\u041C':'m',
    '\u041D':'h','\u041E':'o','\u0420':'r','\u0421':'c','\u0422':'t',
    '\u0423':'y','\u0425':'x','\u0410':'a','\u0415':'e','\u0406':'i',
    '\u0456':'i','\u0458':'j','\u04CF':'l','\u0470':'p',
    // Greek look-alikes
    '\u03B1':'a','\u03B2':'b','\u03B5':'e','\u03BF':'o','\u03C1':'p',
    '\u03C4':'t','\u03C5':'u','\u03BD':'v','\u03B7':'n','\u03B9':'i',
    '\u03BA':'k','\u03BD':'v','\u03BC':'m','\u03BE':'x','\u03C9':'w',
    '\u0391':'a','\u0392':'b','\u0395':'e','\u039F':'o','\u03A1':'p',
    '\u03A4':'t','\u03A5':'y','\u039D':'n','\u0399':'i',
    // Latin extended / accented (common substitutions)
    '\u00E0':'a','\u00E1':'a','\u00E2':'a','\u00E3':'a','\u00E4':'a','\u00E5':'a',
    '\u00E8':'e','\u00E9':'e','\u00EA':'e','\u00EB':'e',
    '\u00EC':'i','\u00ED':'i','\u00EE':'i','\u00EF':'i',
    '\u00F2':'o','\u00F3':'o','\u00F4':'o','\u00F5':'o','\u00F6':'o',
    '\u00F9':'u','\u00FA':'u','\u00FB':'u','\u00FC':'u',
    '\u00FF':'y','\u00FD':'y',
    '\u00C0':'a','\u00C1':'a','\u00C2':'a','\u00C3':'a','\u00C4':'a','\u00C5':'a',
    '\u00C8':'e','\u00C9':'e','\u00CA':'e','\u00CB':'e',
    '\u00CC':'i','\u00CD':'i','\u00CE':'i','\u00CF':'i',
    '\u00D2':'o','\u00D3':'o','\u00D4':'o','\u00D5':'o','\u00D6':'o',
    '\u00D9':'u','\u00DA':'u','\u00DB':'u','\u00DC':'u',
    '\u00D1':'n','\u00F1':'n',
    // Math/script variants
    '\uFF41':'a','\uFF42':'b','\uFF43':'c','\uFF44':'d','\uFF45':'e',
    '\uFF46':'f','\uFF47':'g','\uFF48':'h','\uFF49':'i','\uFF4A':'j',
    '\uFF4B':'k','\uFF4C':'l','\uFF4D':'m','\uFF4E':'n','\uFF4F':'o',
    '\uFF50':'p','\uFF51':'q','\uFF52':'r','\uFF53':'s','\uFF54':'t',
    '\uFF55':'u','\uFF56':'v','\uFF57':'w','\uFF58':'x','\uFF59':'y','\uFF5A':'z',
};

const applyHomoglyphs = (s) =>
    s.split('').map(c => HOMOGLYPH_MAP[c] || c).join('');

// §C4 — Leet / symbol substitution table
const LEET = {
    '0':'o','1':'i','2':'z','3':'e','4':'a','5':'s','6':'g','7':'t',
    '8':'b','9':'g','@':'a','$':'s','!':'i','+':'t','#':'h','|':'i',
    '(':'c',')':'d','<':'c','>':'d','€':'e','£':'l','¢':'c','°':'o',
    '\\':'l','/':'l',
};

const applyLeet = (s) => {
    let r = s.replace(/ph/g,'f').replace(/vv/g,'w').replace(/qu/gi,'kw');
    return r.split('').map(c => LEET[c] || c).join('');
};

const collapseRepeats = (s) =>
    s.replace(/(.)\1{2,}/g, '$1$1');

const removeSpacingTrick = (s) =>
    s.replace(/\b([a-z])([\s\-_.]+[a-z]){2,}\b/g, m => m.replace(/[\s\-_.]+/g,''));

// Strip hashtags but keep content for scanning (e.g. #fuckyou → fuckyou)
const stripHashtags = (s) => s.replace(/#([a-zA-Z0-9_\u0900-\u09FF]+)/g, ' $1 ');

/**
 * Produce all text variants used for matching.
 */
const buildVariants = (text) => {
    const raw = text;

    // Stage 1: homoglyphs + zero-width + hashtag content
    const stage1 = applyHomoglyphs(text)
        .replace(ZERO_WIDTH, '')
        .replace(/\s*\n\s*/g, ' ');

    const withHashContent = stripHashtags(stage1);
    const lower = withHashContent.toLowerCase().replace(WORD_BREAK_CHARS, ' ');

    // Stage 2: spacing trick collapse
    const spacedCollapsed = removeSpacingTrick(lower);

    // Stage 3: leet + repeat collapse + strip non-alnum (preserve Indian scripts)
    const norm = collapseRepeats(applyLeet(spacedCollapsed))
        .replace(/[^a-z0-9\s\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0B80-\u0BFF\u0A00-\u0A7F]/g,' ')
        .replace(/\s+/g, ' ').trim();

    const normNS  = norm.replace(/\s/g, '');
    const lowerNS = lower.replace(/\s/g, '');

    const tokens     = lower.split(/\s+/).filter(t => t.length >= 2);
    const normTokens = norm.split(/\s+/).filter(t => t.length >= 2);

    return { raw, lower, spacedCollapsed, norm, normNS, lowerNS, tokens, normTokens };
};

/* ════════════════════════════════════════════════════════════════════════════
   §D  MULTILINGUAL WORD DICTIONARIES
   Format: [word, type, severity]
   type     : 'abuse' | 'explicit' | 'hate' | 'threat' | 'spam' | 'info'
   severity : 'low' | 'medium' | 'high' | 'severe'
════════════════════════════════════════════════════════════════════════════ */

/* ── §D1  ENGLISH ──────────────────────────────────────────────────────────── */
const WORDS_EN = [
    // Profanity — mild
    ['wtf','abuse','low'],           ['omfg','abuse','low'],
    ['stfu','abuse','low'],          ['gtfo','abuse','low'],
    ['crap','abuse','low'],          ['damn','abuse','low'],
    ['damnit','abuse','low'],        ['bullshit','abuse','medium'],
    ['bs','abuse','low'],            ['horseshit','abuse','low'],
    ['bollocks','abuse','low'],      ['dork','abuse','low'],
    ['jerk','abuse','low'],          ['dumbass','abuse','medium'],
    ['dipshit','abuse','medium'],
    // Profanity — medium
    ['fuck','abuse','medium'],       ['fucker','abuse','medium'],
    ['fucking','abuse','medium'],    ['fucked','abuse','medium'],
    ['fck','abuse','medium'],        ['fuk','abuse','medium'],
    ['fvck','abuse','medium'],       ['f*ck','abuse','medium'],
    ['fu*k','abuse','medium'],       ['fawk','abuse','medium'],
    ['effing','abuse','medium'],     ['fooking','abuse','medium'],
    ['phuck','abuse','medium'],      ['phucker','abuse','medium'],
    ['shit','abuse','low'],          ['shitt','abuse','low'],
    ['sh*t','abuse','low'],          ['shite','abuse','low'],
    ['bitch','abuse','medium'],      ['bitches','abuse','medium'],
    ['b*tch','abuse','medium'],      ['biatch','abuse','medium'],
    ['beeyatch','abuse','medium'],   ['bastard','abuse','medium'],
    ['asshole','abuse','medium'],    ['a**hole','abuse','medium'],
    ['ass','abuse','low'],           ['arse','abuse','low'],
    ['jackass','abuse','medium'],    ['jackass','abuse','medium'],
    ['douchebag','abuse','medium'],  ['scumbag','abuse','medium'],
    ['prick','abuse','medium'],      ['wanker','abuse','medium'],
    ['twat','abuse','medium'],       ['tosser','abuse','low'],
    ['git','abuse','low'],           ['numpty','abuse','low'],
    ['moron','abuse','low'],         ['idiot','abuse','low'],
    ['imbecile','abuse','low'],      ['retard','abuse','high'],
    ['retarded','abuse','high'],     ['mf','abuse','medium'],
    ['motherfucker','abuse','high'], ['motherf*cker','abuse','high'],
    ['muthafucker','abuse','high'],  ['mfkr','abuse','medium'],
    ['dick','abuse','medium'],       ['d*ck','abuse','medium'],
    ['cock','abuse','medium'],       ['c*ck','abuse','medium'],
    ['pussy','abuse','medium'],      ['p*ssy','abuse','medium'],
    // Slurs
    ['nigger','hate','severe'],      ['nigga','hate','high'],
    ['n*gger','hate','severe'],      ['n1gger','hate','severe'],
    ['faggot','hate','severe'],      ['fag','hate','high'],
    ['f*ggot','hate','severe'],      ['spic','hate','high'],
    ['chink','hate','high'],         ['kike','hate','severe'],
    ['tranny','hate','high'],        ['dyke','hate','high'],
    ['coon','hate','severe'],        ['gook','hate','high'],
    ['wetback','hate','high'],       ['beaner','hate','high'],
    ['honky','hate','high'],         ['cracker','hate','medium'],
    ['paki','hate','high'],          ['towelhead','hate','severe'],
    ['raghead','hate','severe'],     ['sandnigger','hate','severe'],
    ['jigaboo','hate','severe'],     ['zipperhead','hate','severe'],
    ['halfbreed','hate','high'],
    // Explicit English
    ['whore','explicit','high'],     ['slut','explicit','high'],
    ['hoe','explicit','medium'],     ['thot','explicit','medium'],
    ['nude','explicit','medium'],    ['nudes','explicit','medium'],
    ['naked','explicit','medium'],   ['porn','explicit','high'],
    ['porno','explicit','high'],     ['xxx','explicit','high'],
    ['blowjob','explicit','high'],   ['handjob','explicit','high'],
    ['cumshot','explicit','high'],   ['creampie','explicit','high'],
    ['boobs','explicit','medium'],   ['tits','explicit','medium'],
    ['titties','explicit','medium'], ['boobies','explicit','medium'],
    ['penis','explicit','medium'],   ['vagina','explicit','medium'],
    ['clitoris','explicit','medium'],['testicles','explicit','medium'],
    ['anal','explicit','high'],      ['incest','explicit','severe'],
    ['bdsm','explicit','high'],      ['fetish','explicit','medium'],
    ['orgasm','explicit','high'],    ['masturbate','explicit','high'],
    ['masturbation','explicit','high'],['horny','explicit','medium'],
    ['sexting','explicit','high'],   ['sext','explicit','high'],
    ['rape','threat','severe'],      ['molest','threat','severe'],
    ['pedophile','threat','severe'], ['pedo','threat','severe'],
    ['grooming','threat','severe'],  ['lolita','threat','severe'],
    // Adult platforms
    ['onlyfans','explicit','medium'],['pornhub','explicit','high'],
    ['xvideos','explicit','high'],   ['xnxx','explicit','high'],
    ['xhamster','explicit','high'],  ['redtube','explicit','high'],
    ['youporn','explicit','high'],   ['brazzers','explicit','high'],
    ['spankbang','explicit','high'], ['eporner','explicit','high'],
    // Threats
    ['kys','threat','severe'],       ['kill yourself','threat','severe'],
    ['end yourself','threat','severe'],['rope yourself','threat','severe'],
];

/* ── §D2  HINDI — TRANSLITERATED ───────────────────────────────────────────── */
const WORDS_HI_ROMAN = [
    // Core abuse
    ['madarchod','abuse','high'],    ['madarchode','abuse','high'],
    ['madarchodi','abuse','high'],   ['madarchot','abuse','high'],
    ['maderchod','abuse','high'],    ['madrchod','abuse','high'],
    ['madarjaat','abuse','high'],    ['madrjat','abuse','high'],
    ['mdrchd','abuse','high'],
    ['behenchod','abuse','high'],    ['bhenchod','abuse','high'],
    ['behnchod','abuse','high'],     ['bhen chod','abuse','high'],
    ['bhai chod','abuse','high'],    ['bhainchod','abuse','high'],
    ['bnchd','abuse','high'],
    ['bhosdike','abuse','high'],     ['bhosadike','abuse','high'],
    ['bhosdiwala','abuse','high'],   ['bhosdiwale','abuse','high'],
    ['bhosdiwali','abuse','high'],   ['bhosdike','abuse','high'],
    ['bhosad','abuse','high'],       ['bhosdi','abuse','high'],
    ['bsdk','abuse','high'],         ['bsdc','abuse','high'],
    ['chutiya','abuse','high'],      ['chutiye','abuse','high'],
    ['chutia','abuse','high'],       ['chutiyo','abuse','high'],
    ['chootiya','abuse','high'],     ['chutiyap','abuse','high'],
    ['chootiyapa','abuse','high'],   ['chutiyagiri','abuse','high'],
    ['chodna','explicit','high'],    ['chod','explicit','high'],
    ['chudai','explicit','high'],    ['chudwa','explicit','high'],
    ['chudwana','explicit','high'],  ['chudwao','explicit','high'],
    ['randi','explicit','high'],     ['randee','explicit','high'],
    ['rande','explicit','high'],     ['raand','explicit','high'],
    ['raandi','explicit','high'],    ['r4ndi','explicit','high'],
    ['randi ki aulad','explicit','high'],
    ['gaandu','abuse','high'],       ['gandu','abuse','high'],
    ['gaand','abuse','high'],        ['g4ndu','abuse','high'],
    ['gaand mara','explicit','high'],['gaand maar','explicit','high'],
    ['lund','explicit','high'],      ['loda','explicit','high'],
    ['lavda','explicit','high'],     ['lauda','explicit','high'],
    ['laude','explicit','high'],     ['lode','explicit','high'],
    ['loda','explicit','high'],      ['l**d','explicit','high'],
    ['chut','explicit','high'],      ['choot','explicit','high'],
    ['bur','explicit','high'],       ['boor','explicit','high'],
    ['nangi','explicit','high'],     ['nanga','explicit','high'],
    ['harami','abuse','medium'],     ['haraami','abuse','medium'],
    ['haramzada','abuse','high'],    ['haramzade','abuse','high'],
    ['haramzadi','abuse','high'],    ['haramkhor','abuse','medium'],
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
    ['dalal','abuse','medium'],      ['dalali','abuse','medium'],
    ['saala','abuse','low'],         ['saale','abuse','low'],
    ['saali','abuse','low'],         ['sala','abuse','low'],
    ['sale','abuse','low'],          ['sali','abuse','low'],
    ['jhatu','abuse','medium'],      ['jhaatu','abuse','medium'],
    ['jhaat','abuse','medium'],
    ['teri maa','abuse','high'],     ['teri maa ki','abuse','high'],
    ['teri maa ko','abuse','high'],  ['teri maa ka','abuse','high'],
    ['maa ki aankh','abuse','high'], ['maa chod','abuse','high'],
    ['maa ki','abuse','high'],
    ['teri behen','abuse','high'],   ['teri behan','abuse','high'],
    ['sex karo','explicit','high'],  ['mujhse sex','explicit','high'],
    ['sex karoge','explicit','high'],['sex karte','explicit','high'],
    ['nangi photo','explicit','high'],['nangi video','explicit','high'],
    ['nangi pics','explicit','high'],['nangi dikha','explicit','high'],
    ['raat ko mil','explicit','high'],['ghar pe aa','explicit','high'],
    ['patli gali se nikal','abuse','low'],
    ['bakri ki aulad','abuse','medium'],
    ['suar ki aulad','abuse','medium'],
    ['kutte ki aulad','abuse','high'],
    ['randwa','explicit','high'],    ['randua','explicit','high'],
    ['chakka','abuse','medium'],     ['hijda','abuse','high'],
    ['hijra','abuse','high'],        ['maal','abuse','low'],
    ['chikna','abuse','low'],        ['luchcha','abuse','medium'],
    ['lafanga','abuse','medium'],    ['awara','abuse','low'],
    ['nikamma','abuse','low'],       ['nalayak','abuse','low'],
    ['bevkoof','abuse','low'],       ['bewakoof','abuse','low'],
    ['pagal','abuse','low'],         ['pagli','abuse','low'],
    ['dhakkan','abuse','low'],       ['anpad','abuse','low'],
    ['bewda','abuse','low'],         ['sharaabi','abuse','low'],
    ['jhootha','abuse','low'],       ['jhoota','abuse','low'],
    ['chor','abuse','medium'],       ['thuggee','abuse','medium'],
    ['thug','abuse','medium'],       ['dakait','abuse','medium'],
    ['gunda','abuse','medium'],      ['goonda','abuse','medium'],
    ['danga','abuse','medium'],      ['fasaad','abuse','medium'],
];

/* ── §D3  HINDI — DEVANAGARI ────────────────────────────────────────────────── */
const WORDS_HI_DEVA = [
    ['मादरचोद','abuse','high'],    ['बहनचोद','abuse','high'],
    ['भेनचोद','abuse','high'],     ['चुतिया','abuse','high'],
    ['भोसड़ीके','abuse','high'],   ['रंडी','explicit','high'],
    ['गांड','explicit','high'],    ['लोड़ा','explicit','high'],
    ['लंड','explicit','high'],     ['चूत','explicit','high'],
    ['हरामी','abuse','medium'],    ['कमीना','abuse','medium'],
    ['कुत्ता','abuse','medium'],   ['कुत्ती','abuse','medium'],
    ['सूअर','abuse','medium'],     ['गधा','abuse','low'],
    ['उल्लू','abuse','low'],       ['भड़वा','abuse','high'],
    ['साला','abuse','low'],        ['झाटू','abuse','medium'],
    ['रण्डी','explicit','high'],   ['मादरजात','abuse','high'],
    ['हरामज़ादा','abuse','high'],  ['बकवास','abuse','low'],
    ['गंदा','abuse','low'],        ['नंगी','explicit','high'],
    ['नंगा','explicit','high'],    ['चुदाई','explicit','high'],
    ['चोदना','explicit','high'],   ['लौड़ा','explicit','high'],
    ['हिजड़ा','abuse','high'],     ['चक्का','abuse','medium'],
    ['बेशर्म','abuse','low'],      ['निकम्मा','abuse','low'],
    ['बेवकूफ','abuse','low'],      ['पागल','abuse','low'],
    ['चोर','abuse','medium'],      ['गुंडा','abuse','medium'],
    ['दलाल','abuse','medium'],     ['लुच्चा','abuse','medium'],
    ['लफंगा','abuse','medium'],    ['आवारा','abuse','low'],
    ['रंडीबाज़','explicit','high'],['वेश्या','explicit','high'],
    ['कसम','abuse','low'],
];

/* ── §D4  BENGALI ────────────────────────────────────────────────────────────── */
const WORDS_BN = [
    // Transliterated
    ['choda','explicit','high'],    ['chodi','explicit','high'],
    ['chudchi','explicit','high'],  ['boga','explicit','high'],
    ['maagi','explicit','high'],    ['maagir','explicit','high'],
    ['khankir','abuse','high'],     ['khanki','abuse','high'],
    ['shuar','abuse','medium'],     ['shala','abuse','medium'],
    ['harami','abuse','medium'],    ['khankimar','abuse','high'],
    ['randi','explicit','high'],    ['gaand','explicit','high'],
    ['loda','explicit','high'],     ['voda','explicit','high'],
    ['futki','explicit','high'],    ['banchod','abuse','high'],
    ['benchod','abuse','high'],     ['magi','explicit','high'],
    ['kuttar baccha','abuse','high'],['pagla','abuse','low'],
    ['haramjada','abuse','high'],   ['bokachoda','abuse','high'],
    ['gadha','abuse','low'],        ['chagol','abuse','low'],
    ['shala maagi','explicit','high'],
    // Native script
    ['চোদা','explicit','high'],    ['মাগি','explicit','high'],
    ['খানকি','abuse','high'],      ['শুয়োর','abuse','medium'],
    ['শালা','abuse','medium'],     ['রান্ডি','explicit','high'],
    ['গাধা','abuse','low'],        ['বাঞ্চোদ','abuse','high'],
    ['হারামি','abuse','medium'],   ['বোকা','abuse','low'],
];

/* ── §D5  TAMIL ──────────────────────────────────────────────────────────────── */
const WORDS_TA = [
    // Transliterated
    ['poda','abuse','medium'],      ['punda','explicit','high'],
    ['pundai','explicit','high'],   ['poolu','explicit','high'],
    ['soothu','explicit','high'],   ['sootha','explicit','high'],
    ['naaye','abuse','medium'],     ['naai','abuse','medium'],
    ['otha','explicit','high'],     ['ootha','explicit','high'],
    ['sunni','explicit','high'],    ['thevdiya','explicit','high'],
    ['thevudiya','explicit','high'],['koothi','explicit','high'],
    ['oombu','explicit','high'],    ['baadu','abuse','medium'],
    ['loosu','abuse','low'],        ['paavi','abuse','medium'],
    ['kena','abuse','low'],         ['myir','abuse','medium'],
    ['koodhi','explicit','high'],   ['onnuku','abuse','low'],
    ['thayoli','abuse','high'],     ['naye','abuse','medium'],
    ['thevidiya','explicit','high'],['mundai katti','abuse','high'],
    ['venna thevidiya','explicit','high'],
    ['mokkai','abuse','low'],       ['puluthi','abuse','low'],
    ['etthu poda','abuse','medium'],['kai adicha','explicit','high'],
    // Native script
    ['போடா','abuse','medium'],     ['பூல்','explicit','high'],
    ['சூத்து','explicit','high'],  ['நாயே','abuse','medium'],
    ['தேவடியா','explicit','high'],  ['ஊம்பு','explicit','high'],
    ['குத்தி','explicit','high'],  ['தாயோலி','abuse','high'],
];

/* ── §D6  TELUGU ─────────────────────────────────────────────────────────────── */
const WORDS_TE = [
    ['dengu','explicit','high'],    ['denguta','explicit','high'],
    ['dengadu','explicit','high'],  ['puku','explicit','high'],
    ['modda','explicit','high'],    ['lanja','explicit','high'],
    ['bokka','explicit','high'],    ['gudda','abuse','medium'],
    ['naraya','abuse','medium'],    ['pichi','abuse','low'],
    ['bevarsi','abuse','medium'],   ['amma dengu','explicit','high'],
    ['akka dengu','explicit','high'],['kukka','abuse','medium'],
    ['poramboku','abuse','low'],    ['okadu','abuse','low'],
    ['dengina','explicit','high'],  ['lanjakodaka','explicit','high'],
    ['lanjadi','explicit','high'],  ['gadida','abuse','low'],
    ['puka','explicit','high'],     ['nayana','abuse','low'],
    ['modda petta','explicit','high'],
    // Script
    ['దెంగు','explicit','high'],   ['పూకు','explicit','high'],
    ['మొడ్డ','explicit','high'],   ['లంజ','explicit','high'],
    ['బెవర్సీ','abuse','medium'],
];

/* ── §D7  KANNADA ────────────────────────────────────────────────────────────── */
const WORDS_KN = [
    ['sule','explicit','high'],     ['sulege','explicit','high'],
    ['tunne','explicit','high'],    ['tika','explicit','high'],
    ['haalad','abuse','medium'],    ['boli','explicit','high'],
    ['boli maga','explicit','high'],['nin amma','abuse','high'],
    ['madakalu','abuse','medium'],  ['katte','abuse','medium'],
    ['haramkhor','abuse','medium'], ['sulemagane','explicit','high'],
    ['sule magne','explicit','high'],['thumbi','abuse','low'],
    ['bekku','abuse','low'],        ['nayi','abuse','medium'],
    ['huccha','abuse','low'],       ['gottilla','abuse','low'],
    ['huda','explicit','high'],     ['huduga','abuse','low'],
    // Script
    ['ಸೂಳೆ','explicit','high'],    ['ತುನ್ನೆ','explicit','high'],
    ['ಬೋಳಿ','explicit','high'],    ['ನಾಯಿ','abuse','medium'],
    ['ಕತ್ತೆ','abuse','medium'],
];

/* ── §D8  MARATHI ────────────────────────────────────────────────────────────── */
const WORDS_MR = [
    ['zavadya','explicit','high'],  ['zavle','explicit','high'],
    ['rand','explicit','high'],     ['randa','explicit','high'],
    ['harami','abuse','medium'],    ['ghanta','abuse','medium'],
    ['madaka','abuse','medium'],    ['aai zavli','explicit','high'],
    ['aai ghe','explicit','high'],  ['aaichi gand','explicit','high'],
    ['aai chi gand','explicit','high'],['aai chi','explicit','high'],
    ['bhosdya','abuse','high'],     ['bhosdich','abuse','high'],
    ['chakna','abuse','medium'],    ['zavnarya','explicit','high'],
    ['randwa','explicit','high'],   ['randi','explicit','high'],
    ['navra','abuse','low'],        ['baya','abuse','low'],
    ['mhais','abuse','low'],        ['khottya','abuse','medium'],
    ['paja','abuse','medium'],      ['baila','abuse','low'],
    // Script
    ['झवाड्या','explicit','high'], ['रांड','explicit','high'],
    ['आयची गांड','explicit','high'],['भोसड्या','abuse','high'],
    ['हरामी','abuse','medium'],
];

/* ── §D9  PUNJABI ─────────────────────────────────────────────────────────────── */
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
    ['randi','explicit','high'],    ['phudi','explicit','high'],
    ['lauda','explicit','high'],    ['munda','abuse','low'],
    ['bebe teri','abuse','high'],   ['bhain de lode','abuse','high'],
    ['teri maa de','abuse','high'], ['teri phudddi','explicit','high'],
    ['lun','explicit','high'],      ['phuddimaar','explicit','high'],
    // Script (Gurmukhi)
    ['ਲੁੰਡ','explicit','high'],    ['ਭੈਣ ਦੇ','abuse','high'],
    ['ਰੰਡੀ','explicit','high'],    ['ਗੰਡੂ','abuse','high'],
    ['ਫੁੱਦੀ','explicit','high'],
];

/* ── §D10  BHOJPURI ──────────────────────────────────────────────────────────── */
const WORDS_BH = [
    ['randie','explicit','high'],   ['randin','explicit','high'],
    ['lauda','explicit','high'],    ['laude','explicit','high'],
    ['laudi','explicit','high'],    ['chodha','explicit','high'],
    ['bhaini','abuse','medium'],    ['bhaujai','abuse','medium'],
    ['bhosad','abuse','high'],      ['haramia','abuse','medium'],
    ['khariya','abuse','low'],      ['dehati randi','explicit','high'],
    ['gaandbaj','explicit','high'], ['chudabaj','explicit','high'],
    ['boshad','abuse','high'],      ['chodab','explicit','high'],
    ['chodi','explicit','high'],    ['maiya ke','abuse','high'],
    ['tohar maiya','abuse','high'], ['tohar baap','abuse','high'],
];

/* ── §D11  HARYANAVI ─────────────────────────────────────────────────────────── */
const WORDS_HA = [
    ['thara baap','abuse','high'],  ['thara baap ka','abuse','high'],
    ['gaand maar','explicit','high'],['gaand mara','explicit','high'],
    ['chodu','explicit','high'],    ['lodi','abuse','medium'],
    ['randi','explicit','high'],    ['teri maa ki','abuse','high'],
    ['bhen ke','abuse','high'],     ['bhen ke lode','abuse','high'],
    ['haramjaada','abuse','high'],  ['suarni','abuse','medium'],
    ['tharra','abuse','low'],       ['ghochu','abuse','medium'],
    ['tharki','abuse','medium'],    ['chikara','abuse','low'],
    ['teri maa ka','abuse','high'], ['teri behan ka','abuse','high'],
    ['phus','abuse','low'],         ['nikkar phaad','abuse','medium'],
    ['thar thar','abuse','low'],    ['mhara','abuse','low'],
];

/* ── §D12  CONTEXT-REQUIRED ABBREVIATIONS ───────────────────────────────────── */
// These short abbreviations only flag when combined with other abuse signals
// They are NOT put in WORD_MAP directly — checked in multi-signal path
export const CONTEXT_ABBREVS = new Set([
    'bc','mc','mf','af','lc','fc','sc',
]);

/* ── §D13  CONTEXTUAL WHITELIST (false-positive reduction) ──────────────────── */
// Exact normalized phrases / tokens that are SAFE and should NOT trigger
const WHITELIST_PHRASES = new Set([
    // Common "die" false positives
    'die hard','die hard fan','die cast','dye','dice','diet','diehard',
    // "cock" false positives
    'cockroach','cocktail','weathercock','cockatoo','cockerel','cock robin','hancock',
    // "ass" false positives
    'class','grass','bass','pass','mass','brass','glass','cassette',
    'assistant','assassin','assistance','assignment','assess','asset',
    // "sex" false positives
    'sex education','sex ed','sextet','sextuple','gender','intersex rights',
    // "nude" false positives
    'nude art','nude painting','nude sculpture','renaissance nude',
    // "pussy" false positives
    'pussy cat','pussycat','pussy willow','puss in boots',
    // "bitch" as female dog
    'female dog','b*tch slap means',
    // Hindi safe words
    'saala bhai','saali behan','pagal deewana','kya baat',
    // Tamil/Telugu innocuous
    'poda poya','naye naye',
    // Common "rape" in agricultural/gaming context
    'rapeseed','rape blossom','rape oil',
]);

/* ── §D14  Build lookup structures ──────────────────────────────────────────── */

const WORD_MAP = new Map();
const FUZZY_WORDS = { short: [], medium: [], long: [] };

const _allWordEntries = [
    ...WORDS_EN, ...WORDS_HI_ROMAN, ...WORDS_HI_DEVA,
    ...WORDS_BN, ...WORDS_TA, ...WORDS_TE, ...WORDS_KN,
    ...WORDS_MR, ...WORDS_PA, ...WORDS_BH, ...WORDS_HA,
];

for (const [w, type, severity] of _allWordEntries) {
    const key = w.toLowerCase();
    if (!WORD_MAP.has(key)) WORD_MAP.set(key, { type, severity });
    if (/^[a-z\s]+$/.test(key) && key.length >= 4) {
        const bucket = key.length <= 7 ? 'short' : key.length <= 12 ? 'medium' : 'long';
        FUZZY_WORDS[bucket].push({ word: key, type, severity });
    }
}

/* ════════════════════════════════════════════════════════════════════════════
   §E  REGEX PATTERN BANKS
════════════════════════════════════════════════════════════════════════════ */

/* §E1 — Harassment, threats & self-harm */
const HARASSMENT_RX = [
    /\bkill\s*(your|ur|u)\s*self\b/i,
    /\bkys\b/i,
    /\bgo\s*(die|hang|kill\s*yourself|rope\s*yourself|end\s*yourself)\b/i,
    /\b(end|take)\s*your\s*(own\s*)?(life|existence)\b/i,
    /\bi\s*(will|gonna|am\s*going\s*to|wil|wll)\s*(kill|hurt|rape|beat|stab|destroy|find|track)\s*(you|u|ur|ye)\b/i,
    /\b(i\s*know\s*where\s*you\s*live|i\s*will\s*find\s*you|i('ll|ll)\s*come\s*find\s*you)\b/i,
    /\byou\s*(should|deserve)\s*(to\s*)?(die|suffer|get\s*hurt|burn|rot)\b/i,
    /\b(send\s*me\s*your\s*address|where\s*do\s*you\s*live|tell\s*me\s*your\s*location|i\s*will\s*come\s*to\s*your\s*house)\b/i,
    /\b(dox\s*you|doxing|dox\s*(your|this)|leak\s*your\s*(info|address|number|details))\b/i,
    /\b(swat\s*(you|u|this\s*server))\b/i,
    /\b(hack\s*(you|ur|your)\s*(account|pc|phone|ip))\b/i,
    /\bhope\s*you\s*(die|suffer|get\s*(cancer|aids|sick|hurt|raped))\b/i,
    // Hindi threats
    /\bjaan\s*se\s*maar(unga|dunga|te\s*hain)\b/i,
    /\bkaat\s*(dunga|denge|dugi)\b/i,
    /\bjaan\s*(le\s*lunga|le\s*lega|lelo)\b/i,
    /\btujhe\s*(maar|dhundh|kaat|uda|nanga)\b/i,
    /\b(maar\s*dunga|kaat\s*ke\s*rakh|uda\s*dunga|tod\s*dunga)\b/i,
    /\bghar\s*aa\s*(jaunga|jaoonga)\b/i,
    /\bip\s*(track|trace|leak|nikal)\b/i,
    /\btujhe\s*(ghar|school|college)\s*(se\s*uthaunga|pe\s*aaunga)\b/i,
    // Tamil threats
    /\buthachi\s*poda\b/i,
    /\bthala\s*vetturen\b/i,
    /\bummachi\s*poda\b/i,
    // Bengali threats
    /\btoke\s*dhekai\s*debe\b/i,
    /\bkhun\s*kore\s*debe\b/i,
    // Generic violence patterns
    /\b(will|gonna|going\s*to)\s*(beat|smash|pound|destroy|crush|annihilate)\s*(you|ur|your\s*face|you\s*up)\b/i,
];

/* §E2 — Explicit sexual content */
const EXPLICIT_RX = [
    /\bsend\s*(me\s*)?(nud(e|es)|naked\s*(pic|photo|video|img|selfie))\b/i,
    /\b(nude|naked)\s*(pic|photo|video|image|clip|selfie|snap)\b/i,
    /\b(sex\s*(video|chat|cam|live|pic|photo|karenge|karte|tape))\b/i,
    /\b(video\s*call\s*pe\s*nanga|vc\s*pe\s*nanga|vc\s*pe\s*nangi)\b/i,
    /\b(see|watch|show)\s*me\s*(naked|nude|without\s*clothes|undress)\b/i,
    /\b(masturbat(e|ion|ing|ed)|self\s*pleasure|jerk\s*off|jack\s*off|finger\s*yourself)\b/i,
    /\b(erotic|xxx|18\+)\s*(chat|video|photo|content|story|rp|roleplay)\b/i,
    /\bwant\s*to\s*(have\s*)?sex\s*with\s*(you|u)\b/i,
    /\b(let'?s\s*have|wanna\s*have)\s*sex\b/i,
    /\bhow\s*(big|long|thick)\s*is\s*your\s*(dick|cock|penis|rod|shaft)\b/i,
    /\bshow\s*me\s*your\s*(dick|cock|penis|boobs|tits|body|ass|butt)\b/i,
    /\b(cybersex|phone\s*sex|cam\s*sex|cam\s*girl|cam\s*boy)\b/i,
    /\b(hentai|doujin|loli|shota)\b/i,
    // Hindi explicit patterns
    /\bnangi\s*(photo|pics|video|clip|dikha)\b/i,
    /\b(chudai|chodna|chud)\s*(video|photo|pic|karte|kar)\b/i,
    /\bmujhse\s*(sex|chudai|pyaar)\b/i,
    /\bsex\s*(karo|karte|karoge|karna|chahiye)\b/i,
    /\b(lund|lauda)\s*(dikhao|dikha|photo|pic|measure)\b/i,
    /\braat\s*ko\s*mil\s*(ke\s*)?(sex|maza)\b/i,
    /\bkya\s*tum\s*(sex|chudai)\s*karogi\b/i,
    // Bengali explicit
    /\bchoda\s*(video|pic|photo|kar)\b/i,
    // Tamil explicit
    /\b(pundai|koothi|soothu)\s*(photo|video|pic|kaatu)\b/i,
    // Telugu explicit
    /\b(puku|dengu)\s*(photo|video|pic|chepu)\b/i,
    // Kannada explicit
    /\b(sule|boli)\s*(photo|video|pic)\b/i,
];

/* §E3 — Scam, fraud, phishing */
const SCAM_RX = [
    // Crypto
    /\b(bitcoin|btc|eth|usdt|crypto|bnb|sol|dogecoin|doge|xrp|ada|shiba)\s*(send|transfer|earn|invest|profit|doubl|giv|mine|stake)\b/i,
    /\b(invest|put)\s*(money|cash|funds?|savings?)\s*(in|into)\s*(crypto|bitcoin|scheme|platform|this)\b/i,
    /\b(nft|web3|defi|dao)\s*(opportunity|profit|earn|invest|project)\b/i,
    // Money requests
    /\b(send|transfer|give|lend)\s*(me\s*)?(money|cash|funds?|rs\.?|rupees?|\$|dollars?|usd|inr)\b/i,
    /\bpaise\s*(bhejo|do|transfer\s*karo|chahiye|dedo)\b/i,
    /\bpaisa\s*(bhejo|do|transfer|send)\b/i,
    /\b(loan|borrow|lending)\s*(me|karo|chahiye|do)\b/i,
    /\b(need|urgent|urgently)\s*(money|cash|help\s*financially|financial\s*help)\b/i,
    // Phishing
    /\bverify\s*your\s*(account|card|identity|number|email|kyc|aadhaar|pan)\b/i,
    /\benter\s*(your\s*)?(otp|pin|password|credit\s*card|cvv|account|aadhaar|pan)\b/i,
    /\bshare\s*(your\s*)?(otp|pin|password|bank\s*detail)\b/i,
    /\b(login|log\s*in)\s*(using|with|through|via)\s*(this|the)\s*(link|url)\b/i,
    /\b(kyc|aadhaar|pan)\s*(update|verify|complete|submit|required)\b/i,
    // Prize / lottery
    /\b(you\s*(won|win|are\s*the\s*winner|have\s*won|are\s*selected))\b/i,
    /\b(lottery|jackpot|sweepstake|raffle|lucky\s*draw|lucky\s*winner)\b/i,
    /\bclaim\s*your\s*(prize|reward|gift|money|cash|voucher|coupon)\b/i,
    /\bfree\s*(recharge|gift|iphone|money|cash|data|prize|reward|laptop|samsung|ps5|xbox)\b/i,
    /\b(cash\s*prize|cash\s*reward|instant\s*cash)\s*(of|worth|upto|up\s*to)\b/i,
    // Social engineering
    /\b(click|tap|open)\s*(here|this\s*link|below|now|the\s*link)\b/i,
    /\b(paytm|gpay|phonepe|google\s*pay|upi|bhim|amazon\s*pay)\s*(me|kar|karo|bhejo|pe)\b/i,
    /\b(account\s*(number|no\.?|num)|bank\s*detail|upi\s*id|ifsc\s*code)\b/i,
    /\b(whatsapp|telegram|signal|instagram)\s*(me|karo|par\s*aao|pe\s*message)\b/i,
    /\b(earn|make)\s*(\d[\d,.]*)\s*(rs|rupees|dollars?|per\s*(day|hour|week|month))\b/i,
    /\bwork\s*from\s*home\s*(offer|job|opportunity|earn|income)\b/i,
    /\bpart\s*time\s*(job|work|earn|income|opportunity)\b/i,
    // Investment scams
    /\b(guaranteed|100\s*%\s*)(profit|returns?|income|growth)\b/i,
    /\bdouble\s*your\s*(money|investment|returns?|income)\b/i,
    /\binvest\s*(only\s*)?\d[\d,.]*\s*(rs|rupees|\$|dollars?|k|lakh)\b/i,
    /\b(mlm|multi\s*level\s*marketing|network\s*marketing|direct\s*selling)\b/i,
    /\bjoin\s*(our|my|this)\s*(team|group|network|channel|business)\b/i,
    /\breferral\s*(code|link|id|bonus|scheme)\b/i,
    // Adult scam
    /\b(cam\s*site|webcam\s*model|onlyfans\s*link|join\s*my\s*onlyfans)\b/i,
];

/* §E4 — Hate speech */
const HATE_RX = [
    /\ball\s*(muslims?|hindus?|christians?|jews?|sikhs?|dalits?|buddhists?)\s*(are|should|must|deserve|need\s*to)\b/i,
    /\bkill\s*(all\s*)?(muslims?|hindus?|christians?|jews?|dalits?|kafirs?|sikhs?)\b/i,
    /\bgo\s*back\s*to\s*(pakistan|bangladesh|africa|china|nepal|your\s*country|your\s*land)\b/i,
    /\b(muslims?|hindus?|dalits?|christians?|jews?|sikhs?)\s*(are\s*)?(terrorist|jihadi|dirty|filthy|worthless|animals?|dogs?|scum|rats?)\b/i,
    /\breservation\s*(beggars?|thieves?|quota\s*cheat|scam|loafers?)\b/i,
    /\b(banish|expel|deport)\s*(all\s*)?(muslims?|hindus?|dalits?|migrants?|immigrants?)\b/i,
    /\b(ethnic\s*cleansing|genocide\s*of|religious\s*cleansing)\b/i,
    /\bjihad\s*(against|on|ke\s*liye)\b/i,
    /\b(low\s*caste|chamaar|bhangi|chamar|untouchable)\s*(are|stay|go|log|people)\b/i,
    /\b(upper\s*caste\s*scum|brahmin\s*(dog|pig|snake))\b/i,
    // Hindi hate
    /\b(musalman|musalmaan|mullah)\s*(haraami|terrorist|desh\s*chhod|bhagao)\b/i,
    /\bpakistani\s*(nikal|bhaag|mar|chor)\b/i,
    /\bchamar\s*(nikal|bhaag|teri\s*maa|log)\b/i,
    /\bsab\s*(musalman|hindu|dalit)\s*(maar\s*do|khatam\s*karo|bhagao)\b/i,
    /\bhindu\s*(rashtra|radical)\s*(zindabad|forever)\b/i,
    /\b(rohingya|bangladeshi)\s*(nikal|bhago|wapas)\b/i,
    // Casteist
    /\b(sc|st)\s*(quota|beggars?|loafers?|chamaar)\b/i,
    /\bcaste\s*(discrimination|slur|abuse|attack)\b/i,
    // Gender hate
    /\b(all\s*)?(women|girls|females)\s*(should|deserve|must)\s*(stay|cook|shut|obey|be\s*home)\b/i,
    /\b(feminism|feminists?)\s*(is\s*)?(cancer|trash|garbage|hate)\b/i,
    /\btransgender\s*(freak|sick|disgusting|abomination|groomer)\b/i,
];

/* §E5 — Personal info / doxxing (NEW in v3.0) */
const PERSONAL_INFO_RX = [
    // Indian mobile numbers (10 digits starting 6-9, with or without +91)
    /\b(\+91[\s\-]?)?[6-9]\d{4}[\s\-]?\d{5}\b/,
    /\b(\+91[\s\-]?)?[6-9]\d{9}\b/,
    // International formats
    /\b\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{4}\b/,
    // UPI IDs
    /\b[\w.\-]+@(okaxis|okicici|oksbi|okhdfcbank|paytm|upi|ybl|ibl|axl|waicici|apl|barodampay|centralbank|dbs|freecharge|hdfcbank|icici|idfcbank|indus|kotak|mahb|rbl|sbi|ubi|unionbank|utib|vijb)\b/i,
    // Email addresses shared in chat (potential phishing/scam)
    /\b[a-zA-Z0-9._%+\-]{3,}@[a-zA-Z0-9.\-]+\.(com|in|net|org|co\.in|io|me|info)\b/,
    // Bank account numbers (typically 9-18 digits)
    /\baccount\s*(number|no\.?|#)\s*:?\s*\d{9,18}\b/i,
    // IFSC codes
    /\b[A-Z]{4}0[A-Z0-9]{6}\b/,
    // PAN card
    /\b[A-Z]{5}\d{4}[A-Z]\b/,
    // Aadhaar (12 digits, optional spaces every 4)
    /\b\d{4}\s?\d{4}\s?\d{4}\b/,
    // CVV / OTP solicitation (already in SCAM_RX but here for info-leak angle)
    /\bshare\s*(your\s*)?(otp|cvv|pin|password|card\s*number)\b/i,
    // Home address
    /\b(flat|house|plot|door)\s*(no\.?|number|#)?\s*\d+[,\s]+[a-z\s]+\s*(street|road|nagar|colony|sector|block)\b/i,
];

/* §E6 — Malicious links & social-engineering invites */
const SAFE_DOMAINS_SET = new Set([
    'youtube.com','youtu.be','music.youtube.com','google.com','google.co.in',
    'instagram.com','facebook.com','twitter.com','x.com','tiktok.com',
    'reddit.com','wikipedia.org','tenor.com','giphy.com','imgbb.com',
    'imgur.com','i.ytimg.com','open.spotify.com','soundcloud.com',
    'amazon.com','amazon.in','flipkart.com','myntra.com','snapdeal.com',
    'zomato.com','swiggy.com','meesho.com','paytm.com','phonepe.com',
    'whatsapp.com','wa.me','linkedin.com','github.com','stackoverflow.com',
    'replit.com','vercel.app','netlify.app','firebase.google.com',
    'medium.com','substack.com','quora.com','news.google.com',
    'ndtv.com','timesofindia.com','hindustantimes.com','thehindu.com',
]);

const SUSPICIOUS_LINK_RX = [
    /https?:\/\/(\d{1,3}\.){3}\d{1,3}/,                               // raw IP
    /https?:\/\/[^\s/]+\.(xyz|tk|ml|ga|cf|pw|top|icu|vip|buzz|gq|ws|gg|cc|loan|work|click|win|bid|date|review|stream|download)\b/i,
    /\b(bit\.ly|tinyurl\.com|cutt\.ly|rb\.gy|short\.link|gg\.gg|is\.gd|v\.gd|t\.ly|qr\.ae|lnk\.bio|solo\.to)\//i,
    /\b(t\.me|telegram\.me|telegram\.dog)\/[^\s]+/i,
    /\bdiscord\.gg\/[^\s]+/i,
    /\b(linktr\.ee\/|linktree\.com\/)[^\s]+/i,
];

const isSafeDomain = (url) => {
    try {
        const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
        return SAFE_DOMAINS_SET.has(host) || [...SAFE_DOMAINS_SET].some(d => host.endsWith('.' + d));
    } catch { return false; }
};

/* §E7 — Emoji abuse signals (NEW in v3.0) */
const ABUSE_EMOJIS = new Set([
    '🖕','🖕🏻','🖕🏼','🖕🏽','🖕🏾','🖕🏿',        // middle finger
    '🔞',                                              // adult content signal (in soliciting context)
    '☠️','💀','🗡️','⚔️','🔫','🪓','🧨',             // threat context
    '🍆','🍑','💦','🌮','🌭','🍌',                    // explicit sexual context
    '👁️👄👁️',                                        // harassment/mocking
]);

const EXPLICIT_EMOJI_COMBOS = [
    ['🍆','💦'],['🍑','💦'],['🍌','💦'],['🍆','🍑'],
    ['😈','💦'],['🥵','💦'],['😍','🍆'],
];

/* ════════════════════════════════════════════════════════════════════════════
   §F  FUZZY MATCHING ENGINE
════════════════════════════════════════════════════════════════════════════ */

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

const fuzzyMatchToken = (token) => {
    if (token.length < 4) return null;
    const band = token.length <= 7 ? 'short' : token.length <= 12 ? 'medium' : 'long';
    const maxDist = band === 'short' ? CFG.FUZZY_SHORT : band === 'medium' ? CFG.FUZZY_MEDIUM : CFG.FUZZY_LONG;
    for (const { word, type, severity } of FUZZY_WORDS[band]) {
        if (Math.abs(word.length - token.length) > maxDist) continue;
        const dist = editDistance(token, word);
        if (dist > 0 && dist <= maxDist) return { type, severity, matched: word, fuzzy: true, dist };
    }
    return null;
};

/* ════════════════════════════════════════════════════════════════════════════
   §G  DETECTION FUNCTIONS
════════════════════════════════════════════════════════════════════════════ */

/** Check if any whitelist phrase cancels out the detection for this text */
const isWhitelisted = (text) => {
    const lower = text.toLowerCase();
    for (const phrase of WHITELIST_PHRASES) {
        if (lower.includes(phrase)) return true;
    }
    return false;
};

/** Check all text variants against the word map */
const checkWordLists = (variants) => {
    const { lower, norm, normNS, lowerNS, tokens, normTokens, spacedCollapsed } = variants;

    const scanString = (s) => {
        const toks = s.split(/\s+/).filter(Boolean);
        for (const t of toks) {
            if (WORD_MAP.has(t)) return { ...WORD_MAP.get(t), matched: t };
        }
        for (let i = 0; i < toks.length - 1; i++) {
            const bi = toks[i] + ' ' + toks[i+1];
            if (WORD_MAP.has(bi)) return { ...WORD_MAP.get(bi), matched: bi };
        }
        for (let i = 0; i < toks.length - 2; i++) {
            const tri = toks[i] + ' ' + toks[i+1] + ' ' + toks[i+2];
            if (WORD_MAP.has(tri)) return { ...WORD_MAP.get(tri), matched: tri };
        }
        return null;
    };

    for (const s of [lower, norm, spacedCollapsed, normNS, lowerNS]) {
        const hit = scanString(s);
        if (hit) return hit;
    }
    for (const t of [...tokens, ...normTokens]) {
        if (WORD_MAP.has(t)) return { ...WORD_MAP.get(t), matched: t };
    }
    return null;
};

/** Fuzzy match on normalized tokens */
const checkFuzzy = (variants) => {
    for (const token of variants.normTokens) {
        const hit = fuzzyMatchToken(token);
        if (hit) return hit;
    }
    return null;
};

/** Check all regex banks */
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
    if (!urls.length) {
        for (const p of SUSPICIOUS_LINK_RX) {
            if (p.test(text)) return { type:'link', severity:'medium', label:'Suspicious link' };
        }
    }
    return null;
};

/** Personal info detection (NEW) */
const checkPersonalInfo = (text) => {
    for (const rx of PERSONAL_INFO_RX) {
        if (rx.test(text)) return { type:'info', severity:'medium', label:'Personal / sensitive information shared' };
    }
    return null;
};

/** CAPS / shouting detection (NEW) */
const checkCapsAbuse = (text) => {
    const stripped = text.replace(/[^a-zA-Z]/g, '');
    if (stripped.length < CFG.CAPS_MIN_ALPHA) return null;
    const originalLen = text.replace(/\s/g,'').length;
    if (originalLen < CFG.CAPS_MIN_LENGTH) return null;
    const uppers = (stripped.match(/[A-Z]/g) || []).length;
    if (uppers / stripped.length >= CFG.CAPS_THRESHOLD) {
        return { type:'spam', severity:'low', label:'Excessive caps / shouting', score: 1.0 };
    }
    return null;
};

/** Emoji abuse detection (NEW) */
const checkEmojiAbuse = (text) => {
    // Count abuse emojis present
    let abuseCount = 0;
    for (const e of ABUSE_EMOJIS) {
        if (text.includes(e)) abuseCount++;
    }
    if (abuseCount >= 2) return { type:'abuse', severity:'medium', label:'Abusive emoji usage', score: 1.5 };
    if (text.includes('🖕')) return { type:'abuse', severity:'medium', label:'Abusive gesture', score: 2.0 };

    // Explicit emoji combos
    for (const [a, b] of EXPLICIT_EMOJI_COMBOS) {
        if (text.includes(a) && text.includes(b)) {
            return { type:'explicit', severity:'medium', label:'Explicit emoji content', score: 1.5 };
        }
    }
    return null;
};

/* ════════════════════════════════════════════════════════════════════════════
   §H  SPAM / FLOOD / REPEAT DETECTOR
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

const SPAM_KEYWORDS = [
    'click here','click now','click link','free money','earn daily',
    'make money fast','guaranteed profit','double your money',
    'investment opportunity','get rich quick','passive income',
    'whatsapp me','telegram me','contact me on','dm me for',
    'cheap followers','buy followers','buy likes','cheap services',
    'join now for free','limited offer','register now',
    'work from home job','earn per day','referral code',
    'earn from home','ghar baithe paise','online job',
    'part time earning','sirf invest karo','sirf ek baar',
    'paisa double','paise kamao','free ka','aaj hi join',
    'abhi join karo','whatsapp number','telegram link',
    'offer expires','today only','100 percent profit',
];

const detectSpam = (uid, text, now) => {
    // Flood: N messages in window
    const ts = (userMsgTimestamps.get(uid) || []).filter(t => now - t < CFG.FLOOD_WINDOW_MS);
    ts.push(now);
    userMsgTimestamps.set(uid, ts);
    if (ts.length >= CFG.FLOOD_COUNT) {
        return { detected:true, type:'spam', severity:'medium', label:'Message flooding' };
    }

    // Repeat / copy-paste detection
    const recent = (userRecentTexts.get(uid) || []).filter(e => now - e.ts < CFG.REPEAT_WINDOW_MS);
    const matches = recent.filter(e => strSimilarity(e.text, text) >= CFG.REPEAT_SIMILARITY).length;
    recent.push({ text, ts: now });
    if (recent.length > 40) recent.shift();
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

/* ════════════════════════════════════════════════════════════════════════════
   §I  MULTI-SIGNAL CONFIDENCE SCORING (NEW in v3.0)
   Weak signals (caps, emoji, abbreviation-in-context, spam keywords) can
   accumulate into a violation even when no single signal crosses the threshold.
════════════════════════════════════════════════════════════════════════════ */

const SIGNAL_WEIGHTS = {
    wordlist  : 3.0,  // dictionary hit
    pattern   : 3.5,  // regex hit
    fuzzy     : 2.0,  // fuzzy match
    emoji     : 1.5,  // emoji abuse
    caps      : 1.0,  // caps shouting
    spam_kw   : 1.0,  // spam keyword
    abbrev    : 1.5,  // context abbreviation (bc/mc/mf present + another signal)
    personalInfo: 2.5,// phone/UPI/email
};

/* ════════════════════════════════════════════════════════════════════════════
   §J  MAIN CONTENT DETECTOR
════════════════════════════════════════════════════════════════════════════ */

const SEVERITY_RANK = { low:1, medium:2, high:3, severe:4 };

const detectContent = (text) => {
    // Guard: check whitelist first (saves false positives)
    if (isWhitelisted(text)) return { detected: false };

    const variants = buildVariants(text);

    // 1. Regex patterns — fast, high confidence
    const patternHit = checkPatterns(text, variants.norm);
    if (patternHit) return { detected: true, ...patternHit, signalScore: SIGNAL_WEIGHTS.pattern };

    // 2. Personal info detection
    const infoHit = checkPersonalInfo(text);
    if (infoHit) return { detected: true, ...infoHit, signalScore: SIGNAL_WEIGHTS.personalInfo };

    // 3. Word list match
    const wordHit = checkWordLists(variants);
    if (wordHit) {
        const label =
            wordHit.type === 'abuse'    ? 'Abusive language' :
            wordHit.type === 'explicit' ? 'Explicit content' :
            wordHit.type === 'hate'     ? 'Hate speech' :
            wordHit.type === 'threat'   ? 'Threatening content' : 'Rule violation';
        return { detected: true, ...wordHit, label, signalScore: SIGNAL_WEIGHTS.wordlist };
    }

    // 4. Fuzzy match — misspelling evasion
    const fuzzyHit = checkFuzzy(variants);
    if (fuzzyHit) {
        const label =
            fuzzyHit.type === 'abuse'    ? 'Abusive language (variant)' :
            fuzzyHit.type === 'explicit' ? 'Explicit content (variant)' :
            fuzzyHit.type === 'hate'     ? 'Hate speech (variant)' : 'Rule violation';
        const sev = ['low','medium','high','severe'];
        const idx = Math.max(0, sev.indexOf(fuzzyHit.severity) - 1);
        return { detected: true, ...fuzzyHit, severity: sev[idx], label, signalScore: SIGNAL_WEIGHTS.fuzzy };
    }

    // 5. Multi-signal aggregation
    let totalScore = 0;
    let dominantHit = null;

    const emojiHit = checkEmojiAbuse(text);
    if (emojiHit) {
        totalScore += emojiHit.score || SIGNAL_WEIGHTS.emoji;
        dominantHit = emojiHit;
    }

    const capsHit = checkCapsAbuse(text);
    if (capsHit) {
        totalScore += SIGNAL_WEIGHTS.caps;
        if (!dominantHit) dominantHit = capsHit;
    }

    // Check context abbreviations: fire only if another signal is present
    const lower = text.toLowerCase();
    for (const abbrev of CONTEXT_ABBREVS) {
        if (lower.split(/\s+/).includes(abbrev) && totalScore > 0) {
            totalScore += SIGNAL_WEIGHTS.abbrev;
            if (!dominantHit) dominantHit = { type:'abuse', severity:'medium', label:'Abusive language' };
            break;
        }
    }

    if (totalScore >= CFG.MULTI_SIGNAL_THRESHOLD && dominantHit) {
        return { detected: true, ...dominantHit, signalScore: totalScore };
    }

    return { detected: false };
};

/* ════════════════════════════════════════════════════════════════════════════
   §K  SESSION HELPERS
════════════════════════════════════════════════════════════════════════════ */

const getSessionViolations = (uid) => {
    if (!userSessionViolations.has(uid)) {
        userSessionViolations.set(uid, {
            total:0, spam:0, abuse:0, explicit:0, hate:0,
            harassment:0, scam:0, link:0, info:0, scoreAccum:0,
        });
    }
    return userSessionViolations.get(uid);
};

const fmtDuration = (ms) => {
    const m = Math.ceil(ms / 60000);
    if (m >= 1440) return `${Math.ceil(m/1440)} day${Math.ceil(m/1440)!==1?'s':''}`;
    if (m >= 60)   return `${Math.ceil(m/60)} hour${Math.ceil(m/60)!==1?'s':''}`;
    return `${m} minute${m!==1?'s':''}`;
};

// Per-type notice cooldown: prevent the same notice type from firing twice within window
const canPostNotice = (uid, noticeType) => {
    const map = lastNoticeTime.get(uid) || {};
    const last = map[noticeType] || 0;
    if (Date.now() - last < CFG.NOTICE_COOLDOWN_MS) return false;
    map[noticeType] = Date.now();
    lastNoticeTime.set(uid, map);
    return true;
};

// Global action cooldown: don't take two enforcement actions on same user too fast
const canTakeAction = (uid) => {
    const last = lastActionTime.get(uid) || 0;
    if (Date.now() - last < CFG.ACTION_COOLDOWN_MS) return false;
    lastActionTime.set(uid, Date.now());
    return true;
};

/* ════════════════════════════════════════════════════════════════════════════
   §L  FIRESTORE ENFORCEMENT  (staff-only: owner / admin / moderator)
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
            uid, displayName, reason, kickedBy:'TingleBot AutoMod', kickedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'users', uid), {
            kickedFrom: { roomId, reason, time: Date.now(), kickedBy: 'TingleBot AutoMod' },
        });
    } catch (_) {}
};

/** Log to dedicated modLogs collection + user doc (v3.0) */
const logViolation = async (uid, roomId, msgId, text, detection, action) => {
    const entry = {
        uid, roomId, messageId: msgId,
        text: (text||'').slice(0, 200),
        violationType: detection.type,
        severity: detection.severity,
        label: detection.label,
        action,
        timestamp: new Date().toISOString(),
        ts: Date.now(),
    };
    try {
        await addDoc(collection(db, 'modLogs'), entry);
    } catch (_) {}
    try {
        await updateDoc(doc(db, 'users', uid), {
            autoModHistory: arrayUnion({
                roomId, messageId: msgId,
                text: entry.text,
                violationType: detection.type,
                severity: detection.severity,
                label: detection.label,
                action,
                timestamp: entry.timestamp,
            }),
        });
    } catch (_) {}
};

/** Persist cross-session violation count to Firestore */
const persistViolationCount = async (uid, violationType) => {
    try {
        await updateDoc(doc(db, 'users', uid), {
            'autoModStats.totalViolations': increment(1),
            [`autoModStats.${violationType}`]: increment(1),
            'autoModStats.lastViolationAt': new Date().toISOString(),
        });
    } catch (_) {}
};

/** Post TingleBot notice with varied messages (v3.0) */
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

/* ════════════════════════════════════════════════════════════════════════════
   §M  PUBLIC API
════════════════════════════════════════════════════════════════════════════ */

/**
 * processAutoMod(msg, roomId, currentUid, isStaff)
 *
 * Call for every incoming message in the snapshot listener (after initial load).
 * processedMsgIds guarantees each message is evaluated exactly once per session.
 *
 * @param {object}  msg         Firestore message object (.id, .text required)
 * @param {string}  roomId      Room being moderated
 * @param {string}  currentUid  UID of the viewing client
 * @param {boolean} isStaff     owner/admin/moderator → may write to Firestore
 */
export const processAutoMod = async (msg, roomId, currentUid = null, isStaff = false) => {
    if (!msg?.id || !roomId) return;
    if (processedMsgIds.has(msg.id)) return;
    processedMsgIds.add(msg.id);

    // Exempt bots and staff senders
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
    sv.scoreAccum = (sv.scoreAccum || 0) + (hit.signalScore || 1);

    // Non-staff: detection only — no Firestore writes
    if (!isStaff) return;

    // Per-user action cooldown — prevents hammering same user with rapid actions
    if (!canTakeAction(uid)) return;

    // Determine escalation action
    let action = 'warn', shouldDelete = false, muteDuration = 0, shouldKick = false;

    if      (priorTotal >= CFG.KICK_AT)    { action='kick';     shouldDelete=true; shouldKick=true; }
    else if (priorTotal >= CFG.MUTE_24H_AT){ action='mute_24h'; shouldDelete=true; muteDuration=24*60*60*1000; }
    else if (priorTotal >= CFG.MUTE_3H_AT) { action='mute_3h';  shouldDelete=true; muteDuration=3*60*60*1000; }
    else if (priorTotal >= CFG.MUTE_30_AT) { action='mute_30';  shouldDelete=true; muteDuration=30*60*1000; }
    else if (priorTotal >= CFG.MUTE_5_AT)  { action='mute_5';   shouldDelete=true; muteDuration=5*60*1000; }
    else if (priorTotal >= CFG.DELETE_WARN_AT){ action='delete_warn'; shouldDelete=true; }
    else    { action='warn'; }

    // Severity overrides
    if ((hit.severity==='high'||hit.severity==='severe') && !shouldDelete) {
        shouldDelete=true; action='delete_warn';
    }
    if (hit.severity==='severe' && muteDuration===0 && !shouldKick) {
        muteDuration=5*60*1000; action='mute_5';
    }

    // Special case: scam / personal info → always delete regardless of severity
    if ((hit.type==='scam'||hit.type==='info') && !shouldDelete) {
        shouldDelete=true;
        if (action==='warn') action='delete_warn';
    }

    // Atomic claim — only one staff client proceeds per message
    const claimed = await claimEnforcement(roomId, msg.id, action, hit.type, uid);
    if (!claimed) return;

    // Execute enforcement
    if (shouldDelete) await removeMessage(roomId, msg.id);
    if (muteDuration > 0) await muteUser(uid, muteDuration, `TingleBot: ${hit.label} (violation #${priorTotal+1})`);
    if (shouldKick)       await kickUser(roomId, uid, displayName, `AutoMod: ${priorTotal+1} violations`);

    // Persist cross-session violation record
    await logViolation(uid, roomId, msg.id, text, hit, action);
    if (sv.total >= CFG.PERSIST_AT) {
        persistViolationCount(uid, hit.type).catch(()=>{});
    }

    // Build and post notice (with per-type cooldown)
    const noticeCooldownType = shouldKick ? 'kick' : muteDuration > 0 ? 'mute' : 'warn';
    if (!canPostNotice(uid, noticeCooldownType)) return;

    let noticeText, tinglebotType;
    if (shouldKick) {
        noticeText = getRandom(NOTICE_VARIANTS.kicked(displayName));
        tinglebotType = 'kicked';
    } else if (muteDuration > 0) {
        noticeText = getRandom(NOTICE_VARIANTS.muted(displayName, fmtDuration(muteDuration), hit.label));
        tinglebotType = 'muted';
    } else if (shouldDelete) {
        noticeText = getRandom(NOTICE_VARIANTS.delete_warn.map(fn => fn(displayName, hit.label)));
        tinglebotType = 'automod';
    } else {
        noticeText = getRandom(NOTICE_VARIANTS.warn.map(fn => fn(displayName, hit.label)));
        tinglebotType = 'automod';
    }

    await postNotice(roomId, noticeText, tinglebotType);
};

/**
 * resetAutoModState — call when user leaves or changes room.
 */
export const resetAutoModState = () => {
    userMsgTimestamps.clear();
    userRecentTexts.clear();
    userSessionViolations.clear();
    processedMsgIds.clear();
    lastNoticeTime.clear();
    lastActionTime.clear();
};
