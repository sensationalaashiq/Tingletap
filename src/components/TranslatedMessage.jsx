/**
 * TingleTap — TranslatedMessage
 * Premium glassmorphism translation display.
 * No emojis — colorful animated SVG icons only.
 */
import React from 'react';
import './TranslatedMessage.css';
import { getLanguageName } from '../utils/translationService';

/* ── Animated Globe / Translate SVG Icon ── */
const TranslateIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="tt-translate-icon-svg">
    <defs>
      <linearGradient id="ttGlobe" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="50%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#ec4899"/>
      </linearGradient>
      <linearGradient id="ttArrow" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34d399"/>
        <stop offset="100%" stopColor="#60a5fa"/>
      </linearGradient>
    </defs>
    {/* Globe */}
    <circle cx="12" cy="12" r="9" stroke="url(#ttGlobe)" strokeWidth="1.6"/>
    <path d="M12 3c-2 2-3.5 5-3.5 9s1.5 7 3.5 9M12 3c2 2 3.5 5 3.5 9s-1.5 7-3.5 9" stroke="url(#ttGlobe)" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M3 12h18M3.5 8h17M3.5 16h17" stroke="url(#ttGlobe)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
  </svg>
);

/* ── Loading spinner SVG ── */
const SpinnerIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="tt-spinner-svg">
    <circle cx="12" cy="12" r="9" stroke="rgba(129,140,248,0.25)" strokeWidth="2"/>
    <path d="M12 3a9 9 0 0 1 9 9" stroke="url(#ttGlobe2)" strokeWidth="2.2" strokeLinecap="round">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
    </path>
    <defs>
      <linearGradient id="ttGlobe2" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#ec4899"/>
      </linearGradient>
    </defs>
  </svg>
);

/* ── Arrow separator ── */
const ArrowIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="ttArr" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#34d399"/>
      </linearGradient>
    </defs>
    <path d="M5 12h14M13 6l6 6-6 6" stroke="url(#ttArr)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/**
 * TranslatedMessage
 * Props:
 *  - originalText: string (already-rendered or raw string)
 *  - translatedText: string
 *  - detectedLang: string (ISO code)
 *  - targetLang: string (ISO code)
 *  - showOriginal: boolean
 *  - isTranslating: boolean
 *  - renderContent: function — renders the original text with its styles
 */
const TranslatedMessage = ({
  translatedText,
  detectedLang,
  targetLang,
  showOriginal,
  isTranslating,
  renderContent,
  compact = false,
}) => {
  // Render original content
  const originalContent = renderContent ? renderContent() : null;

  if (isTranslating) {
    return (
      <div className="tt-msg-wrap">
        {originalContent}
        <div className="tt-loading-strip">
          <SpinnerIcon />
          <span className="tt-loading-text">Translating…</span>
        </div>
      </div>
    );
  }

  if (!translatedText) {
    return originalContent;
  }

  const fromName = getLanguageName(detectedLang);
  const toName = getLanguageName(targetLang);

  if (!showOriginal) {
    /* Mode 2 — translated only */
    return (
      <div className="tt-msg-wrap">
        <div className={`tt-translated-block tt-mode-only${compact ? ' tt-compact' : ''}`}>
          <div className="tt-translation-badge">
            <TranslateIcon />
            <span className="tt-badge-from">{fromName}</span>
            <ArrowIcon />
            <span className="tt-badge-to">{toName}</span>
          </div>
          <div className="tt-translated-text">{translatedText}</div>
        </div>
      </div>
    );
  }

  /* Mode 1 — original + translated */
  return (
    <div className="tt-msg-wrap">
      {originalContent}
      <div className={`tt-translated-block tt-mode-both${compact ? ' tt-compact' : ''}`}>
        <div className="tt-divider-row">
          <div className="tt-divider-line" />
          <div className="tt-translation-badge">
            <TranslateIcon />
            <span className="tt-badge-from">{fromName}</span>
            <ArrowIcon />
            <span className="tt-badge-to">{toName}</span>
          </div>
          <div className="tt-divider-line" />
        </div>
        <div className="tt-translated-text">{translatedText}</div>
      </div>
    </div>
  );
};

export default TranslatedMessage;
