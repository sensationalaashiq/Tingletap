/**
 * TingleTap — useTranslation hook
 * Per-message translation with settings reactivity.
 *
 * FIX M-15: Previously each message component that used this hook added its own
 * `window.addEventListener('tbSettingChanged', ...)`. In a chat room with 100+
 * visible messages that meant 100+ simultaneous window listeners — every settings
 * change dispatched 100+ synchronous handler calls.
 *
 * Fix: module-level singleton. One window listener is attached the first time any
 * hook instance mounts; all instances subscribe to an in-memory Set. O(1) window
 * listeners regardless of how many messages are on screen.
 */
import { useState, useEffect, useRef } from 'react';
import { translateText, getTranslationSettings } from '../utils/translationService';

// ── Module-level singleton ────────────────────────────────────────────────────
let _cachedSettings = null;
const _settingsListeners = new Set(); // Set<(settings) => void>
let _windowListenerAttached = false;

function _getOrInitSettings() {
  if (_cachedSettings === null) _cachedSettings = getTranslationSettings();
  return _cachedSettings;
}

function _ensureWindowListener() {
  if (_windowListenerAttached) return;
  _windowListenerAttached = true;
  window.addEventListener('tbSettingChanged', () => {
    _cachedSettings = getTranslationSettings();
    _settingsListeners.forEach(fn => fn(_cachedSettings));
  });
}
// ─────────────────────────────────────────────────────────────────────────────

export function useTranslation(text, { forceEnabled, forcePMs } = {}) {
  const [settings, setSettings] = useState(() => _getOrInitSettings());
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(false);

  // Subscribe to the shared singleton — one window listener for ALL hook instances
  useEffect(() => {
    _ensureWindowListener();
    _settingsListeners.add(setSettings);
    return () => _settingsListeners.delete(setSettings);
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
