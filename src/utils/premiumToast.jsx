import React from 'react';
import { toast } from 'react-toastify';

/* ─── Custom visible close button ─── */
const CloseBtn = ({ closeToast }) => (
  <button
    onClick={closeToast}
    style={{
      background: 'rgba(255,255,255,0.18)',
      border: '1.5px solid rgba(255,255,255,0.35)',
      borderRadius: '50%',
      width: 22, height: 22,
      minWidth: 22,
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 0, flexShrink: 0, marginLeft: 8,
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.32)'}
    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
    aria-label="Close"
  >
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/>
    </svg>
  </button>
);

/* ─── Icon builder helper ─── */
const mkIcon = (svgContent) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, minWidth: 28,
    background: 'rgba(255,255,255,0.22)',
    borderRadius: '50%', flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    border: '1px solid rgba(255,255,255,0.30)',
  }}>
    {svgContent}
  </span>
);

/* ─── Premium SVG Icons ─── */
const Icon = {
  youtube: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="4" fill="white" opacity="0.25"/>
      <path d="M10 9.5l6 2.5-6 2.5V9.5z" fill="white"/>
    </svg>
  ),
  audio: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="white"/>
    </svg>
  ),
  mic: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <rect x="9" y="2" width="6" height="11" rx="3" fill="white"/>
      <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  gif: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <rect x="2" y="6" width="20" height="12" rx="3" stroke="white" strokeWidth="2"/>
      <path d="M8 12H6v-2h2M11 10v4M13 10h3M13 12h2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  image: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="white" strokeWidth="2"/>
      <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
      <path d="M21 15l-5-5L5 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  success: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
      <path d="M7 13l3.5 3.5L17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
      <path d="M15 9L9 15M9 9l6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  warn: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M12 2L2 20h20L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" fill="rgba(255,255,255,0.15)"/>
      <path d="M12 9v5M12 17v.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  info: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
      <path d="M12 16v-4M12 8v.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  friend: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="7" r="4" stroke="white" strokeWidth="2"/>
      <path d="M18 9l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  block: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  report: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="4" y1="22" x2="4" y2="15" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  logout: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <polyline points="16,17 21,12 16,7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  profile: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/>
      <path d="M20 21a8 8 0 1 0-16 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 8l2 2-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  username: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M17 3l4 4-7 7h-4v-4L17 3z" fill="rgba(255,255,255,0.5)" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  password: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="3" stroke="white" strokeWidth="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1.5" fill="white"/>
    </svg>
  ),
  delete: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  gift: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <rect x="2" y="11" width="20" height="11" rx="2" stroke="white" strokeWidth="2"/>
      <rect x="2" y="7" width="20" height="5" rx="1" stroke="white" strokeWidth="2"/>
      <path d="M12 7V22M12 7C12 7 9 3 6.5 4.5S8 9 12 7zM12 7C12 7 15 3 17.5 4.5S16 9 12 7z" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  coin: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2"/>
      <path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5c0 1.7-1.5 2-3 2.5-1.5.5-3 .8-3 2.5 0 1.4 1.3 2.5 3 2.5s3-1.1 3-2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  otp: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="2"/>
      <path d="M7 12h2m4 0h2m-8 0v.5M9 12v.5m4-.5v.5m2-.5v.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 5V3M16 5V3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  unlock: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="3" stroke="white" strokeWidth="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1.5" fill="white"/>
    </svg>
  ),
  withdraw: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="white" strokeWidth="2"/>
      <path d="M2 10h20M7 15h3m4 0h2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  schedule: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
      <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cancel: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="rgba(255,255,255,0.1)"/>
      <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  /* ─── New premium types ─── */
  login: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <defs>
        <linearGradient id="ptLoginG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
      {/* Rocket body */}
      <path d="M12 2.5C12 2.5 17.5 5.5 17.5 12H6.5C6.5 5.5 12 2.5 12 2.5z" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.7" strokeLinejoin="round"/>
      {/* Fins */}
      <path d="M6.5 12C5 12 3.5 13.5 3.5 14.5L6.5 13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M17.5 12C19 12 20.5 13.5 20.5 14.5L17.5 13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Base */}
      <path d="M8.5 12v4l3.5 2 3.5-2v-4" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Window */}
      <circle cx="12" cy="8.5" r="2" fill="url(#ptLoginG)" opacity="0.9"/>
      {/* Exhaust */}
      <path d="M10 16.5c0 2 .8 3.5 2 3.5s2-1.5 2-3.5" stroke="rgba(255,200,100,0.8)" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  emailVerified: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <defs>
        <linearGradient id="ptEvG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399"/>
          <stop offset="100%" stopColor="#10b981"/>
        </linearGradient>
      </defs>
      {/* Envelope */}
      <rect x="2" y="4" width="20" height="16" rx="3" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.8"/>
      <path d="M2 8l10 6 10-6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Verified badge */}
      <circle cx="19" cy="19" r="5.5" fill="url(#ptEvG)" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
      <path d="M16.5 19l2 2 3.2-3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  rocket: mkIcon(
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M12 2C12 2 18 6 18 13H6C6 6 12 2 12 2z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M8 13v4l4 2 4-2v-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="9" r="2" fill="white" opacity="0.85"/>
      <path d="M6 13C4 13 3 15 3 16l3-1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18 13c2 0 3 2 3 3l-3-1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

/* ─── Base style factory ─── */
const makeStyle = (gradient, shadow) => ({
  borderRadius: '14px',
  color: '#fff',
  fontFamily: 'Inter, -apple-system, sans-serif',
  fontSize: '13.5px',
  fontWeight: 600,
  letterSpacing: '0.01em',
  padding: '12px 14px',
  minHeight: 'unset',
  border: '1px solid rgba(255,255,255,0.22)',
  background: gradient,
  boxShadow: `0 12px 36px ${shadow}, 0 4px 12px rgba(0,0,0,0.18)`,
  lineHeight: '1.45',
});

const Styles = {
  youtube:       makeStyle('linear-gradient(135deg,#e52d27 0%,#b31217 100%)',         'rgba(229,45,39,0.45)'),
  audio:         makeStyle('linear-gradient(135deg,#6d28d9 0%,#8b5cf6 100%)',         'rgba(109,40,217,0.45)'),
  mic:           makeStyle('linear-gradient(135deg,#5b21b6 0%,#7c3aed 100%)',         'rgba(91,33,182,0.45)'),
  gif:           makeStyle('linear-gradient(135deg,#0284c7 0%,#06b6d4 100%)',         'rgba(6,182,212,0.45)'),
  image:         makeStyle('linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%)',         'rgba(59,130,246,0.45)'),
  success:       makeStyle('linear-gradient(135deg,#059669 0%,#10b981 100%)',         'rgba(16,185,129,0.45)'),
  error:         makeStyle('linear-gradient(135deg,#dc2626 0%,#ef4444 100%)',         'rgba(220,38,38,0.45)'),
  warn:          makeStyle('linear-gradient(135deg,#d97706 0%,#f59e0b 100%)',         'rgba(217,119,6,0.45)'),
  info:          makeStyle('linear-gradient(135deg,#2563eb 0%,#3b82f6 100%)',         'rgba(37,99,235,0.45)'),
  friend:        makeStyle('linear-gradient(135deg,#be185d 0%,#ec4899 100%)',         'rgba(236,72,153,0.45)'),
  block:         makeStyle('linear-gradient(135deg,#1f2937 0%,#374151 100%)',         'rgba(31,41,55,0.55)'),
  report:        makeStyle('linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)',         'rgba(124,58,237,0.45)'),
  logout:        makeStyle('linear-gradient(135deg,#ea580c 0%,#f97316 100%)',         'rgba(234,88,12,0.45)'),
  profile:       makeStyle('linear-gradient(135deg,#4f46e5 0%,#6366f1 100%)',         'rgba(99,102,241,0.45)'),
  username:      makeStyle('linear-gradient(135deg,#7c3aed 0%,#6366f1 100%)',         'rgba(124,58,237,0.45)'),
  password:      makeStyle('linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)',         'rgba(15,23,42,0.55)'),
  delete:        makeStyle('linear-gradient(135deg,#be123c 0%,#ef4444 100%)',         'rgba(190,18,60,0.45)'),
  gift:          makeStyle('linear-gradient(135deg,#b45309 0%,#f59e0b 100%)',         'rgba(180,83,9,0.45)'),
  coin:          makeStyle('linear-gradient(135deg,#92400e 0%,#d97706 100%)',         'rgba(146,64,14,0.45)'),
  otp:           makeStyle('linear-gradient(135deg,#0369a1 0%,#0ea5e9 100%)',         'rgba(3,105,161,0.45)'),
  unlock:        makeStyle('linear-gradient(135deg,#065f46 0%,#10b981 100%)',         'rgba(6,95,70,0.45)'),
  withdraw:      makeStyle('linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)',         'rgba(30,64,175,0.45)'),
  schedule:      makeStyle('linear-gradient(135deg,#4338ca 0%,#818cf8 100%)',         'rgba(67,56,202,0.45)'),
  cancel:        makeStyle('linear-gradient(135deg,#047857 0%,#34d399 100%)',         'rgba(4,120,87,0.45)'),
  login:         makeStyle('linear-gradient(135deg,#7c3aed 0%,#6366f1 50%,#3b82f6 100%)', 'rgba(99,102,241,0.5)'),
  emailVerified: makeStyle('linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%)', 'rgba(16,185,129,0.5)'),
  rocket:        makeStyle('linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)',         'rgba(124,58,237,0.45)'),
};

const OPT = {
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  closeButton: CloseBtn,
  style: { padding: 0 },
  autoClose: 4000,
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
};
