import React from 'react';
import { toast } from 'react-toastify';

/* ─── Unified compact close button ─── */
const CloseBtn = ({ closeToast }) => (
  <button
    type="button"
    className="tt-toast-close"
    onClick={(e) => {
      e.stopPropagation();
      closeToast?.(e);
    }}
    style={{
      background: 'rgba(255,255,255,0.2)',
      border: '1px solid rgba(255,255,255,0.42)',
      borderRadius: '50%',
      width: 20,
      height: 20,
      minWidth: 20,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      flexShrink: 0,
      marginLeft: 8,
      color: '#ffffff',
      transition: 'background 0.15s ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.34)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
    aria-label="Dismiss notification"
  >
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  </button>
);

/* ─── Consistent SVG icon badge helper ─── */
const mkIcon = (svgContent) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 24,
      height: 24,
      minWidth: 24,
      background: 'rgba(255,255,255,0.2)',
      borderRadius: '50%',
      flexShrink: 0,
      border: '1px solid rgba(255,255,255,0.38)',
      color: '#ffffff',
    }}
  >
    {svgContent}
  </span>
);

/* ─── Crisp SVG Icons (Zero Emojis) ─── */
const Icon = {
  youtube: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="4" stroke="#ffffff" strokeWidth="2" />
      <path d="M10 9.5l5.5 2.5-5.5 2.5V9.5z" fill="#ffffff" />
    </svg>
  ),
  audio: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M9 18V5l11-2v13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="2.5" stroke="#ffffff" strokeWidth="2" />
      <circle cx="17.5" cy="16" r="2.5" stroke="#ffffff" strokeWidth="2" />
    </svg>
  ),
  mic: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="#ffffff" strokeWidth="2" />
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  gif: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="2" y="6" width="20" height="12" rx="3" stroke="#ffffff" strokeWidth="2" />
      <path d="M8 12H6v-2h2M11 10v4M13 10h3M13 12h2" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  image: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="#ffffff" strokeWidth="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="#ffffff" />
      <path d="M21 15l-5-5L5 21" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  success: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M5 13l4.2 4.2L19 7" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M16 8L8 16M8 8l8 8" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
  warn: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M12 3L2.5 20h19L12 3z" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 10v4.5M12 17.5v.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  info: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="#ffffff" strokeWidth="2" />
      <path d="M12 16v-4.5M12 8v.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  friend: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="3.5" stroke="#ffffff" strokeWidth="2" />
      <path d="M17 11l2 2 3.5-3.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  block: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="#ffffff" strokeWidth="2" />
      <line x1="5.2" y1="5.2" x2="18.8" y2="18.8" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  report: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
      <line x1="4" y1="22" x2="4" y2="15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  logout: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <polyline points="16,17 21,12 16,7" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  profile: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <circle cx="12" cy="8" r="4" stroke="#ffffff" strokeWidth="2" />
      <path d="M20 21a8 8 0 1 0-16 0" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  username: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <circle cx="12" cy="8" r="4" stroke="#ffffff" strokeWidth="2" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  password: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="3" stroke="#ffffff" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1.4" fill="#ffffff" />
    </svg>
  ),
  delete: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  gift: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="2" y="11" width="20" height="11" rx="2" stroke="#ffffff" strokeWidth="2" />
      <rect x="2" y="7" width="20" height="5" rx="1" stroke="#ffffff" strokeWidth="2" />
      <path d="M12 7v15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  coin: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#ffffff" strokeWidth="2" />
      <path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5c0 1.7-1.5 2-3 2.5-1.5.5-3 .8-3 2.5 0 1.4 1.3 2.5 3 2.5s3-1.1 3-2.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  otp: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="#ffffff" strokeWidth="2" />
      <path d="M8 12h8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  unlock: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="3" stroke="#ffffff" strokeWidth="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  withdraw: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="#ffffff" strokeWidth="2" />
      <path d="M2 10h20M7 15h4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  schedule: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="#ffffff" strokeWidth="2" />
      <path d="M12 7v5l3.5 2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  cancel: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="#ffffff" strokeWidth="2" />
      <path d="M8 12.5l3 3 5-5.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  login: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  emailVerified: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="#ffffff" strokeWidth="2" />
      <path d="M2 8l10 5.5L22 8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  rocket: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M12 2.5S17.5 6 17.5 13H6.5C6.5 6 12 2.5 12 2.5z" stroke="#ffffff" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M8.5 13v4l3.5 2 3.5-2v-4" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  whisperOff: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M20 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3l3 3 3-3h7a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" stroke="#ffffff" strokeWidth="1.9" strokeLinejoin="round" />
      <line x1="6" y1="16" x2="18" y2="6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  mute: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="#ffffff" strokeWidth="1.9" />
      <path d="M5 10a7 7 0 0 0 14 0" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="4" y1="20" x2="20" y2="4" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  kick: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z" stroke="#ffffff" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  ),
  ban: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="#ffffff" strokeWidth="2" />
      <line x1="5.2" y1="5.2" x2="18.8" y2="18.8" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  ),
  camera: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="#ffffff" strokeWidth="1.9" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" stroke="#ffffff" strokeWidth="1.9" />
    </svg>
  ),
  volume: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" stroke="#ffffff" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  ),
  station: mkIcon(
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="#ffffff" strokeWidth="2" />
      <line x1="12" y1="8" x2="12" y2="12.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.1" fill="#ffffff" />
    </svg>
  ),
};

/* ─── Unified high-contrast rich gradient pills ─── */
const makeStyle = (gradient, shadow) => ({
  borderRadius: '12px',
  color: '#ffffff',
  fontFamily: 'Plus Jakarta Sans, Lato, -apple-system, sans-serif',
  fontSize: '12.5px',
  fontWeight: 600,
  letterSpacing: '0.01em',
  padding: '9px 12px',
  minHeight: '42px',
  border: '1px solid rgba(255,255,255,0.28)',
  background: gradient,
  boxShadow: `0 10px 26px ${shadow}, 0 3px 10px rgba(0,0,0,0.2)`,
  lineHeight: '1.32',
});

const Styles = {
  youtube:       makeStyle('linear-gradient(135deg,#dc2626 0%,#be123c 100%)', 'rgba(220,38,38,0.36)'),
  audio:         makeStyle('linear-gradient(135deg,#6d28d9 0%,#7e22ce 100%)', 'rgba(109,40,217,0.36)'),
  mic:           makeStyle('linear-gradient(135deg,#6d28d9 0%,#4f46e5 100%)', 'rgba(109,40,217,0.36)'),
  gif:           makeStyle('linear-gradient(135deg,#0284c7 0%,#0e7490 100%)', 'rgba(2,132,199,0.36)'),
  image:         makeStyle('linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%)', 'rgba(29,78,216,0.36)'),
  success:       makeStyle('linear-gradient(135deg,#059669 0%,#047857 100%)', 'rgba(5,150,105,0.36)'),
  error:         makeStyle('linear-gradient(135deg,#dc2626 0%,#b91c1c 100%)', 'rgba(220,38,38,0.38)'),
  warn:          makeStyle('linear-gradient(135deg,#d97706 0%,#b45309 100%)', 'rgba(217,119,6,0.38)'),
  info:          makeStyle('linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)', 'rgba(37,99,235,0.36)'),
  friend:        makeStyle('linear-gradient(135deg,#db2777 0%,#be185d 100%)', 'rgba(219,39,119,0.36)'),
  block:         makeStyle('linear-gradient(135deg,#4338ca 0%,#3730a3 100%)', 'rgba(67,56,202,0.36)'),
  report:        makeStyle('linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)', 'rgba(124,58,237,0.36)'),
  logout:        makeStyle('linear-gradient(135deg,#ea580c 0%,#c2410c 100%)', 'rgba(234,88,12,0.36)'),
  profile:       makeStyle('linear-gradient(135deg,#4f46e5 0%,#4338ca 100%)', 'rgba(79,70,229,0.36)'),
  username:      makeStyle('linear-gradient(135deg,#6d28d9 0%,#4f46e5 100%)', 'rgba(109,40,217,0.36)'),
  password:      makeStyle('linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%)', 'rgba(29,78,216,0.36)'),
  delete:        makeStyle('linear-gradient(135deg,#be123c 0%,#dc2626 100%)', 'rgba(190,18,60,0.38)'),
  gift:          makeStyle('linear-gradient(135deg,#b45309 0%,#d97706 100%)', 'rgba(180,83,9,0.36)'),
  coin:          makeStyle('linear-gradient(135deg,#b45309 0%,#92400e 100%)', 'rgba(180,83,9,0.36)'),
  otp:           makeStyle('linear-gradient(135deg,#0284c7 0%,#0369a1 100%)', 'rgba(2,132,199,0.36)'),
  unlock:        makeStyle('linear-gradient(135deg,#059669 0%,#047857 100%)', 'rgba(5,150,105,0.36)'),
  withdraw:      makeStyle('linear-gradient(135deg,#1d4ed8 0%,#3730a3 100%)', 'rgba(29,78,216,0.36)'),
  schedule:      makeStyle('linear-gradient(135deg,#4f46e5 0%,#6366f1 100%)', 'rgba(79,70,229,0.36)'),
  cancel:        makeStyle('linear-gradient(135deg,#059669 0%,#047857 100%)', 'rgba(5,150,105,0.36)'),
  login:         makeStyle('linear-gradient(135deg,#6d28d9 0%,#4f46e5 55%,#2563eb 100%)', 'rgba(79,70,229,0.38)'),
  emailVerified: makeStyle('linear-gradient(135deg,#059669 0%,#0d9488 100%)', 'rgba(5,150,105,0.38)'),
  rocket:        makeStyle('linear-gradient(135deg,#6d28d9 0%,#7c3aed 100%)', 'rgba(109,40,217,0.36)'),
  whisperOff:    makeStyle('linear-gradient(135deg,#5b21b6 0%,#7e22ce 55%,#a21caf 100%)', 'rgba(126,34,206,0.42)'),
  mute:          makeStyle('linear-gradient(135deg,#d97706 0%,#b45309 100%)', 'rgba(217,119,6,0.36)'),
  kick:          makeStyle('linear-gradient(135deg,#ea580c 0%,#c2410c 100%)', 'rgba(234,88,12,0.36)'),
  ban:           makeStyle('linear-gradient(135deg,#dc2626 0%,#991b1b 100%)', 'rgba(220,38,38,0.38)'),
  camera:        makeStyle('linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%)', 'rgba(29,78,216,0.36)'),
  volume:        makeStyle('linear-gradient(135deg,#059669 0%,#047857 100%)', 'rgba(5,150,105,0.36)'),
  station:       makeStyle('linear-gradient(135deg,#6d28d9 0%,#9333ea 100%)', 'rgba(109,40,217,0.36)'),
};

const OPT = {
  className: 'tt-premium-toast',
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  closeButton: CloseBtn,
  autoClose: 3800,
};

/* ─── Public API ─── */
export const pt = {
  youtube:       (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.youtube,       style: Styles.youtube,       ...opts }),
  audio:         (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.audio,         style: Styles.audio,         ...opts }),
  mic:           (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.mic,           style: Styles.mic,           ...opts }),
  gif:           (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.gif,           style: Styles.gif,           ...opts }),
  image:         (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.image,         style: Styles.image,         ...opts }),
  success:       (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.success,       style: Styles.success,       ...opts }),
  error:         (msg, opts={}) => toast.error  (msg, { ...OPT, icon: () => Icon.error,         style: Styles.error,         ...opts }),
  warn:          (msg, opts={}) => toast.warn   (msg, { ...OPT, icon: () => Icon.warn,          style: Styles.warn,          ...opts }),
  warning:       (msg, opts={}) => toast.warn   (msg, { ...OPT, icon: () => Icon.warn,          style: Styles.warn,          ...opts }),
  info:          (msg, opts={}) => toast.info   (msg, { ...OPT, icon: () => Icon.info,          style: Styles.info,          ...opts }),
  friend:        (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.friend,        style: Styles.friend,        ...opts }),
  block:         (msg, opts={}) => toast.info   (msg, { ...OPT, icon: () => Icon.block,         style: Styles.block,         ...opts }),
  report:        (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.report,        style: Styles.report,        ...opts }),
  logout:        (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.logout,        style: Styles.logout,        ...opts }),
  profile:       (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.profile,       style: Styles.profile,       ...opts }),
  username:      (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.username,      style: Styles.username,      ...opts }),
  password:      (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.password,      style: Styles.password,      ...opts }),
  delete:        (msg, opts={}) => toast.error  (msg, { ...OPT, icon: () => Icon.delete,        style: Styles.delete,        ...opts }),
  gift:          (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.gift,          style: Styles.gift,          ...opts }),
  coin:          (msg, opts={}) => toast.warn   (msg, { ...OPT, icon: () => Icon.coin,          style: Styles.coin,          ...opts }),
  otp:           (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.otp,           style: Styles.otp,           ...opts }),
  unlock:        (msg, opts={}) => toast.info   (msg, { ...OPT, icon: () => Icon.unlock,        style: Styles.unlock,        ...opts }),
  withdraw:      (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.withdraw,      style: Styles.withdraw,      ...opts }),
  schedule:      (msg, opts={}) => toast.info   (msg, { ...OPT, icon: () => Icon.schedule,      style: Styles.schedule,      ...opts }),
  cancel:        (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.cancel,        style: Styles.cancel,        ...opts }),
  login:         (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.login,         style: Styles.login,         autoClose: 5000, ...opts }),
  emailVerified: (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.emailVerified, style: Styles.emailVerified, autoClose: 5000, ...opts }),
  rocket:        (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.rocket,        style: Styles.rocket,        ...opts }),
  whisperOff:    (msg, opts={}) => toast.warn   (msg, { ...OPT, icon: () => Icon.whisperOff,   style: Styles.whisperOff,    autoClose: 4500, ...opts }),
  mute:          (msg, opts={}) => toast.warn   (msg, { ...OPT, icon: () => Icon.mute,          style: Styles.mute,          ...opts }),
  kick:          (msg, opts={}) => toast.error  (msg, { ...OPT, icon: () => Icon.kick,          style: Styles.kick,          ...opts }),
  ban:           (msg, opts={}) => toast.error  (msg, { ...OPT, icon: () => Icon.ban,           style: Styles.ban,           ...opts }),
  camera:        (msg, opts={}) => toast.info   (msg, { ...OPT, icon: () => Icon.camera,        style: Styles.camera,        ...opts }),
  volume:        (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.volume,        style: Styles.volume,        ...opts }),
  station:       (msg, opts={}) => toast.error  (msg, { ...OPT, icon: () => Icon.station,       style: Styles.station,       ...opts }),
};
