import React, { useState, useEffect, useCallback } from 'react';
import './CookieConsentModal.css';

const STORAGE_KEY   = 'tt_cookie_consent';
const PREFS_KEY     = 'tt_cookie_prefs';
const SHOW_DELAY_MS = 1400;

/* ─────────────────────────────────────────────────────────────
   ALL SVG ICONS — premium colorful, zero emojis
───────────────────────────────────────────────────────────── */
const CookieHeaderIcon = () => (
  <svg viewBox="0 0 64 64" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="cc-hbg" cx="42%" cy="36%" r="68%">
        <stop offset="0%" stopColor="#fde68a"/>
        <stop offset="55%" stopColor="#fbbf24"/>
        <stop offset="100%" stopColor="#d97706"/>
      </radialGradient>
      <radialGradient id="cc-hglow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fef3c7" stopOpacity=".9"/>
        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/>
      </radialGradient>
    </defs>
    {/* Glow halo */}
    <circle cx="32" cy="32" r="30" fill="url(#cc-hglow)" opacity=".5"/>
    {/* Cookie body */}
    <circle cx="32" cy="32" r="24" fill="url(#cc-hbg)"/>
    {/* Chips / bits */}
    <circle cx="22" cy="26" r="3.8" fill="#92400e" opacity=".75"/>
    <circle cx="38" cy="22" r="3.2" fill="#78350f" opacity=".75"/>
    <circle cx="43" cy="36" r="3.8" fill="#92400e" opacity=".75"/>
    <circle cx="26" cy="41" r="3.2" fill="#78350f" opacity=".75"/>
    <circle cx="33" cy="33" r="2.6" fill="#92400e" opacity=".6"/>
    {/* Crack line */}
    <path d="M28 18 Q30 24 27 28 Q24 32 26 38" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" opacity=".45"/>
    {/* Sparkle top-right */}
    <path d="M51 10 l2.2 5.5 5.5 2.2-5.5 2.2-2.2 5.5-2.2-5.5-5.5-2.2 5.5-2.2z" fill="#fcd34d"/>
    {/* Sparkle bottom-left */}
    <path d="M11 46 l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" fill="#fde68a"/>
    {/* Mini dot sparkles */}
    <circle cx="54" cy="34" r="2" fill="#fcd34d" opacity=".7"/>
    <circle cx="10" cy="22" r="1.5" fill="#fde68a" opacity=".7"/>
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="cc-sh" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6ee7b7"/>
        <stop offset="100%" stopColor="#059669"/>
      </linearGradient>
    </defs>
    <path d="M20 3L5 9.5v8.5C5 26.8 11 34 20 36.5c9-2.5 15-9.7 15-18.5V9.5L20 3z"
      fill="url(#cc-sh)" filter="drop-shadow(0 4px 12px rgba(5,150,105,0.4))"/>
    <path d="M20 3L5 9.5v8.5C5 26.8 11 34 20 36.5c9-2.5 15-9.7 15-18.5V9.5L20 3z"
      fill="white" opacity=".12"/>
    <path d="M12.5 19.5l5.5 5.5 10-12.5"
      stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="cc-an" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd"/>
        <stop offset="100%" stopColor="#1d4ed8"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#cc-an)"
      filter="drop-shadow(0 4px 12px rgba(29,78,216,0.38))"/>
    <rect x="2" y="2" width="36" height="36" rx="10" fill="white" opacity=".1"/>
    {/* Bars */}
    <rect x="8"  y="24" width="6" height="11" rx="2" fill="white" opacity=".9"/>
    <rect x="17" y="17" width="6" height="18" rx="2" fill="white" opacity=".9"/>
    <rect x="26" y="10" width="6" height="25" rx="2" fill="white" opacity=".9"/>
    {/* Trend line */}
    <path d="M11 22 L20 15 L29 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".5" strokeDasharray="2 2"/>
  </svg>
);

const PerformanceIcon = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="cc-pf" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fed7aa"/>
        <stop offset="45%" stopColor="#f97316"/>
        <stop offset="100%" stopColor="#c2410c"/>
      </linearGradient>
    </defs>
    <circle cx="20" cy="20" r="19" fill="url(#cc-pf)"
      filter="drop-shadow(0 4px 12px rgba(249,115,22,0.42))"/>
    <circle cx="20" cy="20" r="19" fill="white" opacity=".1"/>
    {/* Lightning bolt */}
    <path d="M23 5 L11 21.5 H20 L17 35 L29.5 18.5 H20.5 Z"
      fill="white" opacity=".95"/>
    <path d="M23 5 L11 21.5 H20 L17 35 L29.5 18.5 H20.5 Z"
      fill="white" opacity=".18"/>
  </svg>
);

const PreferencesIcon = () => (
  <svg viewBox="0 0 40 40" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="cc-pr" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd"/>
        <stop offset="100%" stopColor="#6d28d9"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#cc-pr)"
      filter="drop-shadow(0 4px 12px rgba(109,40,217,0.4))"/>
    <rect x="2" y="2" width="36" height="36" rx="10" fill="white" opacity=".1"/>
    {/* Gear / settings */}
    <circle cx="20" cy="20" r="5.5" stroke="white" strokeWidth="2.4" fill="none"/>
    <circle cx="20" cy="20" r="2.2" fill="white" opacity=".85"/>
    {/* Gear teeth */}
    <path d="M20 8 v3.5 M20 28.5 v3.5 M8 20 h3.5 M28.5 20 h3.5" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
    <path d="M11.7 11.7 l2.5 2.5 M25.8 25.8 l2.5 2.5 M11.7 28.3 l2.5-2.5 M25.8 14.2 l2.5-2.5"
      stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
  </svg>
);

/* Lock icon for "Always Active" badge */
const LockBadgeIcon = () => (
  <svg viewBox="0 0 14 14" width="11" height="11" fill="none" aria-hidden="true">
    <rect x="2.5" y="6" width="9" height="6.5" rx="2" fill="#059669"/>
    <path d="M4.5 6V4.8a2.5 2.5 0 0 1 5 0V6" stroke="#059669" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

/* Check for locked toggle */
const LockCheckIcon = () => (
  <svg viewBox="0 0 14 14" width="12" height="12" fill="none" aria-hidden="true">
    <path d="M3 7l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* Accept button check */
const AcceptCheckIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" aria-hidden="true">
    <path d="M3.5 9.5l4 4 7-8.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* Save icon */
const SaveIcon = () => (
  <svg viewBox="0 0 18 18" width="15" height="15" fill="none" aria-hidden="true">
    <path d="M14 3H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5l-1-2z"
      stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M12 3v4H7V3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="6" y="10" width="6" height="5" rx="1" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
);

/* Essential only shield */
const EssentialIcon = () => (
  <svg viewBox="0 0 18 18" width="15" height="15" fill="none" aria-hidden="true">
    <path d="M9 1.5L2 4.5v5C2 13.3 5 16.7 9 17.5c4-.8 7-4.2 7-8V4.5L9 1.5z"
      stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);

/* Close X */
const CloseXIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" aria-hidden="true">
    <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   CATEGORY CONFIG
───────────────────────────────────────────────────────────── */
const CATEGORIES = [
  {
    id:          'essential',
    Icon:        ShieldIcon,
    accentColor: '#059669',
    bgColor:     'rgba(52,211,153,0.09)',
    borderColor: 'rgba(52,211,153,0.28)',
    dotColor:    '#34d399',
    label:       'Essential Cookies',
    badge:       'Always Active',
    locked:      true,
    description: 'Required for the platform to function. They enable core security, session authentication, anonymous guest access, and your login state. These cannot be disabled.',
  },
  {
    id:          'analytics',
    Icon:        AnalyticsIcon,
    accentColor: '#1d4ed8',
    bgColor:     'rgba(96,165,250,0.08)',
    borderColor: 'rgba(96,165,250,0.24)',
    dotColor:    '#60a5fa',
    label:       'Analytics Cookies',
    badge:       'Optional',
    locked:      false,
    description: 'Help us understand how visitors interact with TingleTap using anonymised, aggregated data only. No individual user tracking — ever. Used solely to improve features.',
  },
  {
    id:          'performance',
    Icon:        PerformanceIcon,
    accentColor: '#c2410c',
    bgColor:     'rgba(251,146,60,0.08)',
    borderColor: 'rgba(251,146,60,0.24)',
    dotColor:    '#f97316',
    label:       'Performance Cookies',
    badge:       'Optional',
    locked:      false,
    description: 'Optimise load speed by caching non-sensitive display data locally. Helps the platform load significantly faster on your repeat visits and during live sessions.',
  },
  {
    id:          'preferences',
    Icon:        PreferencesIcon,
    accentColor: '#6d28d9',
    bgColor:     'rgba(167,139,250,0.08)',
    borderColor: 'rgba(167,139,250,0.24)',
    dotColor:    '#a78bfa',
    label:       'Preference Cookies',
    badge:       'Optional',
    locked:      false,
    description: 'Remember your personalisation choices — selected theme, font, language, and display settings — so your experience stays perfectly consistent across sessions.',
  },
];

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const CookieConsentModal = () => {
  const [visible,  setVisible]  = useState(false);
  const [exiting,  setExiting]  = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [prefs,    setPrefs]    = useState({
    analytics:   true,
    performance: true,
    preferences: true,
  });

  /* ── Mount: auto-show if no prior consent ── */
  useEffect(() => {
    let timer;
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    }

    /* ── Allow any part of the app to re-open the modal ── */
    const openHandler = () => {
      setExiting(false);
      setAccepted(false);
      setVisible(true);
    };
    window.addEventListener('tt:manage-cookies', openHandler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('tt:manage-cookies', openHandler);
    };
  }, []);

  const dismiss = useCallback((consentType) => {
    const finalPrefs = {
      essential:   true,
      analytics:   consentType === 'all'       ? true : consentType === 'essential' ? false : prefs.analytics,
      performance: consentType === 'all'       ? true : consentType === 'essential' ? false : prefs.performance,
      preferences: consentType === 'all'       ? true : consentType === 'essential' ? false : prefs.preferences,
    };

    localStorage.setItem(STORAGE_KEY, consentType === 'essential' ? 'essential' : 'accepted');
    localStorage.setItem(PREFS_KEY,   JSON.stringify(finalPrefs));

    if (consentType === 'all' || consentType === 'custom') setAccepted(true);

    setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setVisible(false);
        setExiting(false);
        setAccepted(false);
      }, 420);
    }, consentType === 'all' || consentType === 'custom' ? 720 : 0);
  }, [prefs]);

  if (!visible) return null;

  return (
    <div
      className={`cc-overlay ${exiting ? 'cc-overlay--out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Cookie Preferences"
    >
      {/* Backdrop click = essential only */}
      <div className="cc-backdrop" onClick={() => dismiss('essential')} />

      <div className={`cc-modal ${exiting ? 'cc-modal--out' : ''} ${accepted ? 'cc-modal--accepted' : ''}`}>

        {/* ── Rainbow top accent bar ── */}
        <div className="cc-top-bar" aria-hidden="true"/>

        {/* ── Close button (essential only) ── */}
        <button
          className="cc-close-btn"
          onClick={() => dismiss('essential')}
          aria-label="Close — accept essential cookies only"
        >
          <CloseXIcon />
        </button>

        {/* ── Header ── */}
        <div className="cc-header">
          <div className="cc-header-icon" aria-hidden="true">
            <CookieHeaderIcon />
            <div className="cc-header-icon-ring" />
          </div>
          <div className="cc-header-copy">
            <h2 className="cc-title">Cookie Preferences</h2>
            <p className="cc-subtitle">
              TingleTap uses cookies to keep you securely signed in, remember
              your settings, and improve platform performance. Choose exactly
              what you are comfortable with — you can change this at any time.
            </p>
          </div>
        </div>

        {/* ── Categories ── */}
        <div className="cc-categories" role="group" aria-label="Cookie categories">
          {CATEGORIES.map((cat) => {
            const isOn = cat.locked ? true : prefs[cat.id];
            return (
              <div
                key={cat.id}
                className={`cc-cat ${isOn ? 'cc-cat--on' : ''}`}
                style={{
                  '--cc-accent':  cat.accentColor,
                  '--cc-bg':      cat.bgColor,
                  '--cc-border':  cat.borderColor,
                  '--cc-dot':     cat.dotColor,
                }}
              >
                {/* Left: icon */}
                <div className="cc-cat-icon" aria-hidden="true">
                  <cat.Icon />
                </div>

                {/* Middle: text */}
                <div className="cc-cat-body">
                  <div className="cc-cat-top-row">
                    <span className="cc-cat-name">{cat.label}</span>
                    <span className={`cc-cat-badge ${cat.locked ? 'cc-cat-badge--locked' : 'cc-cat-badge--opt'}`}>
                      {cat.locked && <LockBadgeIcon />}
                      {cat.badge}
                    </span>
                  </div>
                  <p className="cc-cat-desc">{cat.description}</p>
                </div>

                {/* Right: toggle */}
                <div className="cc-toggle-area" aria-hidden={cat.locked}>
                  {cat.locked ? (
                    <div className="cc-toggle cc-toggle--locked" aria-label="Always active">
                      <div className="cc-toggle-track">
                        <div className="cc-toggle-thumb cc-toggle-thumb--check">
                          <LockCheckIcon />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label
                      className="cc-toggle"
                      aria-label={`${isOn ? 'Disable' : 'Enable'} ${cat.label}`}
                    >
                      <input
                        type="checkbox"
                        checked={prefs[cat.id]}
                        onChange={e => setPrefs(p => ({ ...p, [cat.id]: e.target.checked }))}
                      />
                      <span className="cc-toggle-track">
                        <span className="cc-toggle-thumb" />
                      </span>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Action Buttons ── */}
        <div className="cc-actions">

          <button
            className="cc-btn cc-btn--ghost"
            onClick={() => dismiss('essential')}
            aria-label="Accept essential cookies only"
          >
            <EssentialIcon />
            <span>Essential Only</span>
          </button>

          <button
            className="cc-btn cc-btn--secondary"
            onClick={() => dismiss('custom')}
            aria-label="Save my cookie preferences"
          >
            <SaveIcon />
            <span>Save Preferences</span>
          </button>

          <button
            className={`cc-btn cc-btn--primary ${accepted ? 'cc-btn--accepted' : ''}`}
            onClick={() => dismiss('all')}
            aria-label="Accept all cookies"
          >
            <AcceptCheckIcon />
            <span>{accepted ? 'Preferences Saved!' : 'Accept All Cookies'}</span>
          </button>

        </div>

        {/* ── Footer links ── */}
        <div className="cc-footer">
          <a href="/privacy" className="cc-foot-link">Privacy Policy</a>
          <span className="cc-foot-sep" aria-hidden="true">·</span>
          <a href="/terms" className="cc-foot-link">Terms of Service</a>
          <span className="cc-foot-sep" aria-hidden="true">·</span>
          <span className="cc-foot-note">By using TingleTap, you agree to our use of essential cookies as described above.</span>
        </div>

      </div>
    </div>
  );
};

export default CookieConsentModal;
