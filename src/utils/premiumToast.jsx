import React from 'react';
import { toast } from 'react-toastify';

/* ─── Premium SVG Icons ─── */
const Icon = {
  youtube: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="12" height="12"><path d="M8 5v14l11-7z" fill="#fff"/></svg>
    </span>
  ),
  audio: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" fill="#fff"/>
      </svg>
    </span>
  ),
  mic: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <rect x="9" y="2" width="6" height="11" rx="3" fill="#fff"/>
        <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </span>
  ),
  gif: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <rect x="2" y="6" width="20" height="12" rx="3" stroke="#fff" strokeWidth="2"/>
        <path d="M8 12H6v-2h2M11 10v4M13 10h3M13 12h2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </span>
  ),
  image: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="#fff" strokeWidth="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="#fff"/>
        <path d="M21 15l-5-5L5 21" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  ),
  success: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  ),
  error: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    </span>
  ),
  warn: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <path d="M12 2L2 20h20L12 2z" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M12 9v5M12 17v.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </span>
  ),
  info: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/>
        <path d="M12 16v-4M12 8v.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </span>
  ),
  friend: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="7" r="4" stroke="#fff" strokeWidth="2"/>
        <path d="M18 9l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  ),
  block: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </span>
  ),
  report: (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:'20px', height:'20px', background:'rgba(255,255,255,0.22)', borderRadius:'50%', flexShrink:0 }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="4" y1="22" x2="4" y2="15" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </span>
  ),
};

/* ─── Base styles for each toast type ─── */
const S = {
  base: {
    borderRadius: '16px',
    color: '#fff',
    fontFamily: 'Inter, sans-serif',
    fontSize: '13px',
    fontWeight: 600,
    padding: '11px 14px',
    minHeight: 'unset',
    border: '1px solid rgba(255,255,255,0.18)',
  },
};

const makeStyle = (gradient, shadow) => ({
  ...S.base,
  background: gradient,
  boxShadow: `0 10px 36px ${shadow}, 0 3px 10px rgba(0,0,0,0.15)`,
});

const Styles = {
  youtube:  makeStyle('linear-gradient(135deg,#e52d27 0%,#b31217 100%)', 'rgba(229,45,39,0.45)'),
  audio:    makeStyle('linear-gradient(135deg,#6d28d9 0%,#8b5cf6 100%)', 'rgba(109,40,217,0.45)'),
  mic:      makeStyle('linear-gradient(135deg,#5b21b6 0%,#7c3aed 100%)', 'rgba(91,33,182,0.45)'),
  gif:      makeStyle('linear-gradient(135deg,#0284c7 0%,#06b6d4 100%)', 'rgba(6,182,212,0.45)'),
  image:    makeStyle('linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%)', 'rgba(59,130,246,0.45)'),
  success:  makeStyle('linear-gradient(135deg,#059669 0%,#10b981 100%)', 'rgba(16,185,129,0.45)'),
  error:    makeStyle('linear-gradient(135deg,#dc2626 0%,#ef4444 100%)', 'rgba(220,38,38,0.45)'),
  warn:     makeStyle('linear-gradient(135deg,#d97706 0%,#f59e0b 100%)', 'rgba(217,119,6,0.45)'),
  info:     makeStyle('linear-gradient(135deg,#2563eb 0%,#3b82f6 100%)', 'rgba(37,99,235,0.45)'),
  friend:   makeStyle('linear-gradient(135deg,#be185d 0%,#ec4899 100%)', 'rgba(236,72,153,0.45)'),
  block:    makeStyle('linear-gradient(135deg,#1f2937 0%,#374151 100%)', 'rgba(31,41,55,0.55)'),
  report:   makeStyle('linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)', 'rgba(124,58,237,0.45)'),
};

const OPT = { hideProgressBar: true, closeOnClick: true, pauseOnHover: true };

/* ─── Public API ─── */
export const pt = {
  youtube:  (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.youtube,  style: Styles.youtube, ...opts }),
  audio:    (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.audio,    style: Styles.audio,   ...opts }),
  mic:      (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.mic,      style: Styles.mic,     ...opts }),
  gif:      (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.gif,      style: Styles.gif,     ...opts }),
  image:    (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.image,    style: Styles.image,   ...opts }),
  success:  (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.success,  style: Styles.success, ...opts }),
  error:    (msg, opts={}) => toast.error  (msg, { ...OPT, icon: () => Icon.error,    style: Styles.error,   ...opts }),
  warn:     (msg, opts={}) => toast.warn   (msg, { ...OPT, icon: () => Icon.warn,     style: Styles.warn,    ...opts }),
  info:     (msg, opts={}) => toast.info   (msg, { ...OPT, icon: () => Icon.info,     style: Styles.info,    ...opts }),
  friend:   (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.friend,   style: Styles.friend,  ...opts }),
  block:    (msg, opts={}) => toast.info   (msg, { ...OPT, icon: () => Icon.block,    style: Styles.block,   ...opts }),
  report:   (msg, opts={}) => toast.success(msg, { ...OPT, icon: () => Icon.report,   style: Styles.report,  ...opts }),
};
