/**
 * TingleTap — Auto Translation Service v2
 *
 * Primary  : Google Translate unofficial API (gtx client) — auto-detects source,
 *            handles Hinglish, Romanized scripts, all languages.
 * Fallback : MyMemory API (free, no key) with autodetect source.
 *
 * Key improvements over v1:
 *  • Google Translate handles Romanized Hindi (Hinglish), Gujarati, Assamese, etc.
 *  • Source language is ALWAYS auto-detected — no incorrect "same language" skips.
 *  • MyMemory fallback ensures resilience when Google rate-limits.
 *  • In-memory LRU cache + in-flight dedup for performance.
 */

/* ─── Supported Languages ─── */
export const SUPPORTED_LANGUAGES = [
  { code: 'en',    name: 'English' },
  { code: 'hi',    name: 'Hindi' },
  { code: 'ur',    name: 'Urdu' },
  { code: 'bn',    name: 'Bengali' },
  { code: 'bho',   name: 'Bhojpuri' },
  { code: 'mai',   name: 'Maithili' },
  { code: 'pa',    name: 'Punjabi' },
  { code: 'gu',    name: 'Gujarati' },
  { code: 'mr',    name: 'Marathi' },
  { code: 'ta',    name: 'Tamil' },
  { code: 'te',    name: 'Telugu' },
  { code: 'kn',    name: 'Kannada' },
  { code: 'ml',    name: 'Malayalam' },
  { code: 'or',    name: 'Odia' },
  { code: 'as',    name: 'Assamese' },
  { code: 'ne',    name: 'Nepali' },
  { code: 'sa',    name: 'Sanskrit' },
  { code: 'ar',    name: 'Arabic' },
  { code: 'fa',    name: 'Persian' },
  { code: 'tr',    name: 'Turkish' },
  { code: 'ru',    name: 'Russian' },
  { code: 'uk',    name: 'Ukrainian' },
  { code: 'fr',    name: 'French' },
  { code: 'de',    name: 'German' },
  { code: 'es',    name: 'Spanish' },
  { code: 'pt',    name: 'Portuguese' },
  { code: 'it',    name: 'Italian' },
  { code: 'nl',    name: 'Dutch' },
  { code: 'pl',    name: 'Polish' },
  { code: 'ja',    name: 'Japanese' },
  { code: 'ko',    name: 'Korean' },
  { code: 'zh',    name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'th',    name: 'Thai' },
  { code: 'vi',    name: 'Vietnamese' },
  { code: 'id',    name: 'Indonesian' },
  { code: 'ms',    name: 'Malay' },
];

export function getLanguageName(code) {
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code;
}

/* ─── Google Translate language code mapping ───
   Some codes we use internally differ from Google's codes.               */
const GT_CODE_MAP = {
  'bho': 'bho',   // Bhojpuri — Google supports it
  'mai': 'hi',    // Maithili — fall back to Hindi (Google doesn't support mai)
  'or':  'or',    // Odia
  'as':  'as',    // Assamese
  'zh':  'zh-CN', // Simplified Chinese
  'zh-TW': 'zh-TW',
};

function toGoogleCode(code) {
  return GT_CODE_MAP[code] || code;
}

/* ─── MyMemory language code mapping ─── */
const MM_CODE_MAP = {
  'bho': 'bho',
  'mai': 'mai',
  'zh':  'zh-CN',
  'as':  'as',
};

function toMyMemoryCode(code) {
  return MM_CODE_MAP[code] || code;
}

/* ─── In-memory LRU-style cache ─── */
const MAX_CACHE = 600;
const translationCache = new Map();

function cacheSet(key, value) {
  if (translationCache.size >= MAX_CACHE) {
    const keys = translationCache.keys();
    for (let i = 0; i < 100; i++) {
      const k = keys.next().value;
      if (k) translationCache.delete(k);
    }
  }
  translationCache.set(key, value);
}

/* ─── In-flight dedup ─── */
const pending = new Map();

/* ─── Translatable check ─── */
function isTranslatable(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 2) return false;
  if (/^https?:\/\/\S+$/.test(t)) return false;
  if (/^(@\w+\s*)+$/.test(t)) return false;
  return true;
}

/* ─── Primary: Google Translate unofficial (gtx) ───
   • Uses sl=auto  → Google detects ANY source language including Hinglish
   • Returns array: data[0] = [[translated_chunk, original_chunk, ...], ...]
   • data[2] = detected language code                                      */
async function translateWithGoogle(text, targetLang) {
  const q = text.length > 4500 ? text.slice(0, 4497) + '...' : text;
  const tl = toGoogleCode(targetLang);

  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}` +
    `&dt=t&q=${encodeURIComponent(q)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`GT HTTP ${res.status}`);

    const data = await res.json();

    /* Google returns: [ [ [chunk, orig, null, null, int], ... ], null, "detectedLang", ... ] */
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error('GT: unexpected response shape');
    }

    const translated = data[0]
      .map(chunk => (Array.isArray(chunk) ? chunk[0] : '') || '')
      .join('')
      .trim();

    if (!translated) throw new Error('GT: empty translation');

    /* data[2] is the detected source language string */
    const detectedLang = typeof data[2] === 'string' ? data[2] : 'auto';

    return { translated, detectedLang, skipped: false, via: 'google' };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/* ─── Fallback: MyMemory with autodetect source ─── */
async function translateWithMyMemory(text, targetLang) {
  const q = text.length > 500 ? text.slice(0, 497) + '...' : text;
  const tl = toMyMemoryCode(targetLang);

  /* Use "autodetect" as source so MyMemory handles unknown scripts */
  const url =
    `https://api.mymemory.translated.net/get` +
    `?q=${encodeURIComponent(q)}&langpair=autodetect|${encodeURIComponent(tl)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`MM HTTP ${res.status}`);

    const data = await res.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText.trim();
      if (!translated || translated === text.trim()) {
        throw new Error('MM: same or empty translation');
      }
      return { translated, detectedLang: 'auto', skipped: false, via: 'mymemory' };
    }
    throw new Error(`MM: status ${data.responseStatus}`);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/* ─── Core translateText — tries Google first, then MyMemory ─── */
export async function translateText(text, targetLang, _sourceLang = null) {
  if (!isTranslatable(text)) return { translated: text, detectedLang: 'auto', skipped: true };
  if (!targetLang)            return { translated: text, detectedLang: 'auto', skipped: true };

  const cacheKey = `${text}|||${targetLang}`;

  if (translationCache.has(cacheKey)) {
    return { ...translationCache.get(cacheKey), fromCache: true };
  }

  if (pending.has(cacheKey)) {
    return pending.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      /* ── Try Google first ── */
      let result;
      try {
        result = await translateWithGoogle(text, targetLang);
      } catch (googleErr) {
        console.warn('[Translation] Google failed, trying MyMemory:', googleErr.message);
        result = await translateWithMyMemory(text, targetLang);
      }

      /* If translation is identical to source (can happen with same-lang auto-detect),
         still return it — the user asked for translation, show what the API gave. */
      if (!result.translated || result.translated.trim() === '') {
        return { translated: text, detectedLang: result.detectedLang || 'auto', skipped: true };
      }

      cacheSet(cacheKey, result);
      return result;

    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('[Translation] Request timed out');
      } else {
        console.warn('[Translation] All APIs failed:', err.message);
      }
      return { translated: text, detectedLang: 'auto', skipped: true, error: err.message };
    } finally {
      pending.delete(cacheKey);
    }
  })();

  pending.set(cacheKey, requestPromise);
  return requestPromise;
}

/* ─── Language detection (kept for UI hints only — not used for API calls) ─── */
export function detectLanguage(text) {
  if (!text || text.trim().length < 2) return 'en';
  const sample = text.slice(0, 200);
  const counts = {
    arabic:     (sample.match(/[\u0600-\u06FF]/g) || []).length,
    devanagari: (sample.match(/[\u0900-\u097F]/g) || []).length,
    bengali:    (sample.match(/[\u0980-\u09FF]/g) || []).length,
    gurmukhi:   (sample.match(/[\u0A00-\u0A7F]/g) || []).length,
    gujarati:   (sample.match(/[\u0A80-\u0AFF]/g) || []).length,
    oriya:      (sample.match(/[\u0B00-\u0B7F]/g) || []).length,
    tamil:      (sample.match(/[\u0B80-\u0BFF]/g) || []).length,
    telugu:     (sample.match(/[\u0C00-\u0C7F]/g) || []).length,
    kannada:    (sample.match(/[\u0C80-\u0CFF]/g) || []).length,
    malayalam:  (sample.match(/[\u0D00-\u0D7F]/g) || []).length,
    thai:       (sample.match(/[\u0E00-\u0E7F]/g) || []).length,
    cyrillic:   (sample.match(/[\u0400-\u04FF]/g) || []).length,
    hiragana:   (sample.match(/[\u3040-\u309F]/g) || []).length,
    katakana:   (sample.match(/[\u30A0-\u30FF]/g) || []).length,
    hangul:     (sample.match(/[\uAC00-\uD7AF]/g) || []).length,
    cjk:        (sample.match(/[\u4E00-\u9FFF]/g) || []).length,
  };
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  if (total < 3) return 'en';
  const maxKey = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  if (maxKey === 'devanagari') return 'hi';
  if (maxKey === 'arabic') {
    const urduChars = (sample.match(/[\u06BE\u06C1\u06C2\u06CC]/g) || []).length;
    return urduChars > 0 ? 'ur' : 'ar';
  }
  if (maxKey === 'bengali')   return 'bn';
  if (maxKey === 'gurmukhi')  return 'pa';
  if (maxKey === 'gujarati')  return 'gu';
  if (maxKey === 'oriya')     return 'or';
  if (maxKey === 'tamil')     return 'ta';
  if (maxKey === 'telugu')    return 'te';
  if (maxKey === 'kannada')   return 'kn';
  if (maxKey === 'malayalam') return 'ml';
  if (maxKey === 'thai')      return 'th';
  if (maxKey === 'cyrillic')  return 'ru';
  if (maxKey === 'hangul')    return 'ko';
  if (maxKey === 'hiragana' || maxKey === 'katakana') return 'ja';
  if (maxKey === 'cjk')       return 'zh';
  return 'en';
}

/* ─── Get user translation settings from localStorage ─── */
export function getTranslationSettings() {
  return {
    enabled:                localStorage.getItem('autoTranslation') === 'true',
    language:               localStorage.getItem('translationLanguage') || 'en',
    showOriginal:           localStorage.getItem('showOriginalMessage') !== 'false',
    translateAnnouncements: localStorage.getItem('translateBroadcastAnnouncements') !== 'false'
                            && localStorage.getItem('autoTranslation') === 'true',
    translatePMs:           localStorage.getItem('translatePrivateMessages') !== 'false'
                            && localStorage.getItem('autoTranslation') === 'true',
  };
}
