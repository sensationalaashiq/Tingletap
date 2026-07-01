/**
 * TingleTap — Auto Translation Service
 * Uses MyMemory API (free, no key required).
 * Handles language detection, caching, deduplication, and graceful fallback.
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

/* ─── In-memory LRU-style cache ─── */
const MAX_CACHE = 600;
const translationCache = new Map();

function cacheSet(key, value) {
  if (translationCache.size >= MAX_CACHE) {
    // Evict oldest 100 entries
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

/* ─── Language Detection via Unicode ranges ─── */
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
    sinhala:    (sample.match(/[\u0D80-\u0DFF]/g) || []).length,
    thai:       (sample.match(/[\u0E00-\u0E7F]/g) || []).length,
    cyrillic:   (sample.match(/[\u0400-\u04FF]/g) || []).length,
    hiragana:   (sample.match(/[\u3040-\u309F]/g) || []).length,
    katakana:   (sample.match(/[\u30A0-\u30FF]/g) || []).length,
    hangul:     (sample.match(/[\uAC00-\uD7AF]/g) || []).length,
    cjk:        (sample.match(/[\u4E00-\u9FFF]/g) || []).length,
  };

  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  if (total < 3) return 'en'; // Mostly ASCII → English

  const maxKey = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

  // Devanagari: could be Hindi, Marathi, Nepali, Sanskrit — default to Hindi
  if (maxKey === 'devanagari') return 'hi';
  if (maxKey === 'arabic') {
    // Urdu uses Arabic script too; check for Urdu-specific letters
    const urduChars = (sample.match(/[\u06BE\u06C1\u06C2\u06CC\u06BE]/g) || []).length;
    return urduChars > 0 ? 'ur' : 'ar';
  }
  if (maxKey === 'bengali') return 'bn';
  if (maxKey === 'gurmukhi') return 'pa';
  if (maxKey === 'gujarati') return 'gu';
  if (maxKey === 'oriya') return 'or';
  if (maxKey === 'tamil') return 'ta';
  if (maxKey === 'telugu') return 'te';
  if (maxKey === 'kannada') return 'kn';
  if (maxKey === 'malayalam') return 'ml';
  if (maxKey === 'thai') return 'th';
  if (maxKey === 'cyrillic') return 'ru';
  if (maxKey === 'hangul') return 'ko';
  if (maxKey === 'hiragana' || maxKey === 'katakana') return 'ja';
  if (maxKey === 'cjk') return 'zh';

  return 'en';
}

/* ─── Translatable check ─── */
function isTranslatable(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 2) return false;
  // Skip pure URLs
  if (/^https?:\/\/\S+$/.test(t)) return false;
  // Skip messages that are only mentions/tags
  if (/^(@\w+\s*)+$/.test(t)) return false;
  return true;
}

/* ─── Core translate function ─── */
export async function translateText(text, targetLang, sourceLang = null) {
  if (!isTranslatable(text)) return { translated: text, detectedLang: 'en', skipped: true };
  if (!targetLang) return { translated: text, detectedLang: 'en', skipped: true };

  // Detect source language
  const detectedLang = sourceLang || detectLanguage(text);

  // Skip if already in target language
  if (detectedLang === targetLang ||
      (targetLang === 'zh' && detectedLang === 'zh-TW') ||
      (targetLang === 'zh-TW' && detectedLang === 'zh')) {
    return { translated: text, detectedLang, skipped: true };
  }

  const cacheKey = `${text}|||${targetLang}`;

  // Cache hit
  if (translationCache.has(cacheKey)) {
    return { ...translationCache.get(cacheKey), fromCache: true };
  }

  // Dedup in-flight
  if (pending.has(cacheKey)) {
    return pending.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      // Truncate to avoid API limits (MyMemory free: 500 chars/request)
      const q = text.length > 500 ? text.slice(0, 497) + '...' : text;
      const langPair = `${detectedLang}|${targetLang}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(langPair)}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        // Sanity: if translation == original (sometimes API returns same text), skip
        if (translated.trim() === text.trim()) {
          return { translated: text, detectedLang, skipped: true };
        }
        const result = { translated, detectedLang, skipped: false };
        cacheSet(cacheKey, result);
        return result;
      }
      // API returned no usable translation
      return { translated: text, detectedLang, skipped: true, error: 'No translation available' };
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('[Translation] Request timed out');
      } else {
        console.warn('[Translation] Error:', err.message);
      }
      return { translated: text, detectedLang, skipped: true, error: err.message };
    } finally {
      pending.delete(cacheKey);
    }
  })();

  pending.set(cacheKey, requestPromise);
  return requestPromise;
}

/* ─── Get user translation settings from localStorage ─── */
export function getTranslationSettings() {
  return {
    enabled:               localStorage.getItem('autoTranslation') !== 'false' && localStorage.getItem('autoTranslation') === 'true',
    language:              localStorage.getItem('translationLanguage') || 'en',
    showOriginal:          localStorage.getItem('showOriginalMessage') !== 'false',
    translateAnnouncements: localStorage.getItem('translateBroadcastAnnouncements') !== 'false' && localStorage.getItem('autoTranslation') === 'true',
    translatePMs:          localStorage.getItem('translatePrivateMessages') !== 'false' && localStorage.getItem('autoTranslation') === 'true',
  };
}
