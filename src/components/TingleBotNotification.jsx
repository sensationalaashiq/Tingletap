import React from 'react';
import './TingleBotNotification.css';

/* ─────────────────────────────────────────────
   SVG ICON LIBRARY  (no emojis, pure SVG)
───────────────────────────────────────────── */
const IconJoined = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="6" r="3" stroke="#a78bfa" strokeWidth="1.5"/>
    <path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M14 2l2 2-2 2" stroke="#6ee7b7" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 4H12" stroke="#6ee7b7" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const IconLeft = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="6" r="3" stroke="#a78bfa" strokeWidth="1.5"/>
    <path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 2l2 2-2 2" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 4H12" stroke="#f87171" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const IconMuted = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M5 7v4a4 4 0 0 0 8 0V7a4 4 0 0 0-8 0z" stroke="#f59e0b" strokeWidth="1.4"/>
    <line x1="9" y1="15" x2="9" y2="17" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
    <line x1="2" y1="2" x2="16" y2="16" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IconUnmuted = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M5 7v4a4 4 0 0 0 8 0V7a4 4 0 0 0-8 0z" stroke="#6ee7b7" strokeWidth="1.4"/>
    <line x1="9" y1="15" x2="9" y2="17" stroke="#6ee7b7" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M6 17h6" stroke="#6ee7b7" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const IconKicked = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="7" cy="6" r="3" stroke="#a78bfa" strokeWidth="1.4"/>
    <path d="M2 15c0-2.761 2.239-5 5-5h2" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M12 10l4 4m0-4l-4 4" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconBanned = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="6.5" stroke="#f87171" strokeWidth="1.5"/>
    <line x1="4" y1="4" x2="14" y2="14" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconUnbanned = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="6.5" stroke="#6ee7b7" strokeWidth="1.5"/>
    <path d="M5.5 9l2.5 2.5 5-5" stroke="#6ee7b7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPromoted = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 2l1.8 4h4l-3.3 2.4 1.3 4L9 10 5.2 12.4l1.3-4L3.2 6h4z" stroke="#fbbf24" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(251,191,36,0.12)"/>
    <path d="M9 14v3" stroke="#818cf8" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M7 15.5h4" stroke="#818cf8" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const IconDemoted = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 2l1.8 4h4l-3.3 2.4 1.3 4L9 10 5.2 12.4l1.3-4L3.2 6h4z" stroke="#94a3b8" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M9 14v3" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M6.5 16.5h5" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconLocked = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="3.5" y="8" width="11" height="8" rx="2" stroke="#f59e0b" strokeWidth="1.4"/>
    <path d="M6 8V6a3 3 0 0 1 6 0v2" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="9" cy="12" r="1.2" fill="#f59e0b"/>
  </svg>
);

const IconUnlocked = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="3.5" y="8" width="11" height="8" rx="2" stroke="#6ee7b7" strokeWidth="1.4"/>
    <path d="M6 8V6a3 3 0 0 1 6 0" stroke="#6ee7b7" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="9" cy="12" r="1.2" fill="#6ee7b7"/>
  </svg>
);

const IconSlowMode = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="10" r="6" stroke="#60a5fa" strokeWidth="1.4"/>
    <path d="M9 6v4l2.5 2" stroke="#60a5fa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 2.5h5" stroke="#60a5fa" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconAnnouncement = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M3 7h9l3-3v10l-3-3H3V7z" stroke="#fbbf24" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(251,191,36,0.10)"/>
    <path d="M6 14v2" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="15" cy="9" r="1" fill="#fbbf24"/>
  </svg>
);

const IconRule = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2.5" y="2" width="13" height="14" rx="2" stroke="#818cf8" strokeWidth="1.4"/>
    <path d="M5.5 6h7M5.5 9h7M5.5 12h4" stroke="#818cf8" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconDefault = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="6.5" stroke="#a78bfa" strokeWidth="1.4"/>
    <path d="M9 5v5" stroke="#a78bfa" strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="9" cy="13" r="0.9" fill="#a78bfa"/>
  </svg>
);

const IconUnkicked = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="7" cy="6" r="3" stroke="#a78bfa" strokeWidth="1.4"/>
    <path d="M2 15c0-2.761 2.239-5 5-5h2" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M12 14l2 2 3-3" stroke="#6ee7b7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconAutoMod = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M9 2L3 4.5v4.8C3 12.9 5.6 15.8 9 17c3.4-1.2 6-4.1 6-7.7V4.5L9 2z"
      stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round"
      fill="rgba(245,158,11,0.10)"/>
    <path d="M6.5 9l1.8 1.8 3.2-3.2" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

/* ─────────────────────────────────────────────
   MAP event type → icon + strip variant class
───────────────────────────────────────────── */
const EVENT_MAP = {
  joined:       { Icon: IconJoined,      cls: '' },
  left:         { Icon: IconLeft,        cls: '' },
  muted:        { Icon: IconMuted,       cls: '' },
  unmuted:      { Icon: IconUnmuted,     cls: '' },
  kicked:       { Icon: IconKicked,      cls: '' },
  unkicked:     { Icon: IconUnkicked,    cls: '' },
  banned:       { Icon: IconBanned,      cls: '' },
  unbanned:     { Icon: IconUnbanned,    cls: '' },
  promoted:     { Icon: IconPromoted,    cls: '' },
  demoted:      { Icon: IconDemoted,     cls: '' },
  locked:       { Icon: IconLocked,      cls: '' },
  unlocked:     { Icon: IconUnlocked,    cls: '' },
  slow_mode:    { Icon: IconSlowMode,    cls: '' },
  announcement: { Icon: IconAnnouncement, cls: 'tinglebot-announcement' },
  rule:         { Icon: IconRule,        cls: 'tinglebot-rule' },
  automod:      { Icon: IconAutoMod,     cls: 'tinglebot-automod' },
};

/* ─────────────────────────────────────────────
   Helper: detect event type from message
───────────────────────────────────────────── */
function detectEventType(message) {
  const t = (message.tinglebotType || message.botEventType || '').toLowerCase();
  if (t && EVENT_MAP[t]) return t;
  const txt = (message.text || '').toLowerCase();
  if (txt.includes('joined')) return 'joined';
  if (txt.includes('left')) return 'left';
  if (txt.includes('muted')) return txt.includes('unmuted') ? 'unmuted' : 'muted';
  if (txt.includes('unmuted')) return 'unmuted';
  if (txt.includes('unkicked') || txt.includes('un-kicked')) return 'unkicked';
  if (txt.includes('kicked')) return 'kicked';
  if (txt.includes('unbanned')) return 'unbanned';
  if (txt.includes('banned')) return 'banned';
  if (txt.includes('promoted')) return 'promoted';
  if (txt.includes('demoted')) return 'demoted';
  if (txt.includes('locked')) return txt.includes('unlocked') ? 'unlocked' : 'locked';
  if (txt.includes('unlocked')) return 'unlocked';
  if (txt.includes('slow mode')) return 'slow_mode';
  if (txt.includes('announcement') || txt.includes('📢')) return 'announcement';
  if (txt.includes('rule') || txt.includes('please') || txt.includes('reminder')) return 'rule';
  return 'default';
}

/* ─────────────────────────────────────────────
   Helper: build display text with bold actor
───────────────────────────────────────────── */
function buildDisplayText(message) {
  const raw = message.text || '';
  // Strip any "TingleBot •" prefix already in the text
  const cleaned = raw.replace(/^TingleBot\s*[•·]\s*/i, '').trim();
  return cleaned;
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const TingleBotNotification = ({ message, onDelete, isOwner }) => {
  const eventType = detectEventType(message);
  const { Icon, cls } = EVENT_MAP[eventType] || { Icon: IconDefault, cls: '' };
  const text = buildDisplayText(message);

  // Bold first word sequence that looks like a name (capitalised word)
  const renderText = () => {
    const nameMatch = text.match(/^([A-Z][a-zA-Z0-9_]+(?:\s[A-Z][a-zA-Z]+)?)\s(.+)/);
    if (nameMatch) {
      return (
        <>
          <strong>{nameMatch[1]}</strong>{' '}{nameMatch[2]}
        </>
      );
    }
    return text;
  };

  return (
    <div className={`tinglebot-strip-wrapper${isOwner && onDelete ? ' tinglebot-strip-wrapper--interactive' : ''}`} aria-live="polite" aria-atomic="true">
      <div className={`tinglebot-strip ${cls}`}>
        <span className="tinglebot-icon">
          <Icon />
        </span>
        <span className="tinglebot-brand">TingleBot</span>
        <span className="tinglebot-sep" />
        <span className="tinglebot-text">{renderText()}</span>
        {isOwner && onDelete && message.id && (
          <button
            className="tinglebot-delete-btn"
            title="Delete TingleBot Message"
            onClick={(e) => { e.stopPropagation(); onDelete(message.id); }}
          >
            <DeleteIcon />
          </button>
        )}
      </div>
    </div>
  );
};

export default TingleBotNotification;
