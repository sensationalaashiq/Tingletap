import React from 'react';
import renderTextWithLinks from '../utils/linkifyText';
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

const IconBadgeAwarded = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="11.5" r="4.5" stroke="#fbbf24" strokeWidth="1.5" fill="rgba(251,191,36,0.12)"/>
    <path d="M9 9.2l.85 1.75 1.9.28-1.38 1.34.33 1.9L9 13.55l-1.7.92.33-1.9-1.38-1.34 1.9-.28z" fill="#fbbf24"/>
    <path d="M6.5 7V4.5h1.8V6h1.4V4.5H11.5V7" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 7h5" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round"/>
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

const IconBroadcastLive = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="3" fill="#a78bfa" opacity="0.9"/>
    <circle cx="9" cy="9" r="3" stroke="#a78bfa" strokeWidth="1.2"/>
    <path d="M5.5 5.5a5 5 0 000 7" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M12.5 5.5a5 5 0 010 7" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M3 3a9 9 0 000 12" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
    <path d="M15 3a9 9 0 010 12" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
    <circle cx="15.5" cy="3.5" r="1.5" fill="#ef4444">
      <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite"/>
    </circle>
  </svg>
);

const IconBroadcastEnded = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="3" stroke="#94a3b8" strokeWidth="1.4"/>
    <path d="M5.5 5.5a5 5 0 000 7" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
    <path d="M12.5 5.5a5 5 0 010 7" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
    <line x1="5" y1="5" x2="13" y2="13" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
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
  <svg id="tb_del" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="13" height="13">
    <defs>
      <linearGradient id="tb_del_grad" gradientUnits="userSpaceOnUse" x1="256" x2="256" y1="512" y2="0">
        <stop offset="0" stopColor="#fd3a84"/>
        <stop offset="1" stopColor="#ffa68d"/>
      </linearGradient>
    </defs>
    <path d="m316 90c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm-60-30c-8.284 0-15 6.716-15 15s6.716 15 15 15 15-6.716 15-15-6.716-15-15-15zm-60 0c-8.284 0-15 6.716-15 15s6.716 15 15 15 15-6.716 15-15-6.716-15-15-15zm95.558 391.928c8.225.81 15.585-5.191 16.401-13.455l15-152c.813-8.244-5.21-15.587-13.455-16.401-8.238-.808-15.587 5.21-16.401 13.455l-15 152c-.813 8.244 5.211 15.587 13.455 16.401zm114.442-241.928c-7.425 0-78.712 0-150 0-71.264 0-142.529 0-150 0-8.284 0-15 6.716-15 15s6.716 15 15 15h16.542s25.279 232.502 25.289 232.582c2.809 22.472 22.005 39.418 44.652 39.418h127.033c22.646 0 41.843-16.946 44.653-39.418.01-.08 25.288-232.582 25.288-232.582h16.543c8.284 0 15-6.716 15-15s-6.716-15-15-15zm-71.612 258.959c-.98 7.442-7.356 13.041-14.872 13.041h-127.033c-7.516 0-13.892-5.6-14.871-13.041l-24.893-228.959h206.562zm-130.347-30.486c.815 8.255 8.166 14.266 16.401 13.455 8.244-.814 14.268-8.157 13.455-16.401l-15-152c-.814-8.245-8.166-14.268-16.401-13.455-8.244.814-14.268 8.157-13.455 16.401zm65.376-236.765 21.708-43.417c2.557-5.114 7.698-8.292 13.416-8.292h41.459c24.813 0 45-20.187 45-45v-59.999c0-24.813-20.187-45-45-45h-180c-24.813 0-45 20.187-45 45v60c0 24.813 20.187 45 45 45h41.459c5.718 0 10.859 3.177 13.417 8.292l21.708 43.417c2.541 5.081 7.734 8.291 13.416 8.291s10.875-3.21 13.417-8.292zm-13.417-40.249-8.292-16.584c-7.672-15.343-23.094-24.875-40.249-24.875h-41.459c-8.271 0-15-6.729-15-15v-60c0-8.271 6.729-15 15-15h180c8.271 0 15 6.729 15 15v60c0 8.271-6.729 15-15 15h-41.459c-17.155 0-32.578 9.532-40.249 24.875z" fill="url(#tb_del_grad)"/>
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
  badge_awarded: { Icon: IconBadgeAwarded, cls: '' },
  promoted:     { Icon: IconPromoted,    cls: '' },
  demoted:      { Icon: IconDemoted,     cls: '' },
  locked:       { Icon: IconLocked,      cls: '' },
  unlocked:     { Icon: IconUnlocked,    cls: '' },
  slow_mode:    { Icon: IconSlowMode,    cls: '' },
  announcement: { Icon: IconAnnouncement, cls: 'tinglebot-announcement' },
  rule:         { Icon: IconRule,        cls: 'tinglebot-rule' },
  automod:         { Icon: IconAutoMod,         cls: 'tinglebot-automod' },
  broadcast_live:  { Icon: IconBroadcastLive,  cls: 'tinglebot-broadcast' },
  broadcast_ended: { Icon: IconBroadcastEnded, cls: 'tinglebot-broadcast-ended' },
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
  if (txt.includes('awarded') || txt.includes('badge')) return 'badge_awarded';
  if (txt.includes('promoted')) return 'promoted';
  if (txt.includes('demoted')) return 'demoted';
  if (txt.includes('locked')) return txt.includes('unlocked') ? 'unlocked' : 'locked';
  if (txt.includes('unlocked')) return 'unlocked';
  if (txt.includes('slow mode')) return 'slow_mode';
  if (txt.includes('announcement')) return 'announcement';
  if (txt.includes('rule') || txt.includes('please') || txt.includes('reminder')) return 'rule';
  if (txt.includes('broadcast') && (txt.includes('live') || txt.includes('started'))) return 'broadcast_live';
  if (txt.includes('broadcast') && (txt.includes('ended') || txt.includes('off'))) return 'broadcast_ended';
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

  // Bold first word sequence that looks like a name (capitalised word); linkify URLs in the rest
  const renderText = () => {
    const nameMatch = text.match(/^([A-Z][a-zA-Z0-9_]+(?:\s[A-Z][a-zA-Z]+)?)\s(.+)/);
    if (nameMatch) {
      return (
        <>
          <strong>{nameMatch[1]}</strong>{' '}{renderTextWithLinks(nameMatch[2])}
        </>
      );
    }
    return renderTextWithLinks(text);
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
