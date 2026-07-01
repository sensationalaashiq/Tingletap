/**
 * TingleTap — useTranslation hook
 * Per-message translation with settings reactivity.
 */
import { useState, useEffect, useRef } from 'react';
import { translateText, getTranslationSettings } from '../utils/translationService';

export function useTranslation(text, { forceEnabled, forcePMs } = {}) {
  const [settings, setSettings] = useState(() => getTranslationSettings());
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(false);

  // Re-read settings when user changes them
  useEffect(() => {
    const handler = () => setSettings(getTranslationSettings());
    window.addEventListener('tbSettingChanged', handler);
    return () => window.removeEventListener('tbSettingChanged', handler);
  }, []);

  const isEnabled = forceEnabled !== undefined ? forceEnabled : settings.enabled;
  const targetLang = settings.language;

  useEffect(() => {
    if (!isEnabled || !text || !text.trim()) {
      setResult(null);
      return;
    }

    abortRef.current = false;
    setLoading(true);

    translateText(text, targetLang).then(res => {
      if (abortRef.current) return;
      if (res.skipped) {
        setResult(null);
      } else {
        setResult(res);
      }
      setLoading(false);
    });

    return () => {
      abortRef.current = true;
      setLoading(false);
    };
  }, [text, targetLang, isEnabled]);

  return {
    translatedText:  result?.translated || null,
    detectedLang:    result?.detectedLang || null,
    isTranslating:   loading,
    isTranslated:    !!result && !result.skipped,
    showOriginal:    settings.showOriginal,
    translatePMs:    forcePMs !== undefined ? forcePMs : settings.translatePMs,
    translateAnnouncements: settings.translateAnnouncements,
    targetLang,
    enabled: isEnabled,
  };
}
