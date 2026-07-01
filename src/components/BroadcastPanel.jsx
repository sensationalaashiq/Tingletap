import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, rtdb, auth } from '../firebase/config';
import {
  ref, set, get, update, remove, onValue, push, off, onDisconnect
} from 'firebase/database';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import './BroadcastPanel.css';

/* ── STUN config ── */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/* ── Password hashing (SHA-256 via Web Crypto) ── */
const hashPassword = async (pw) => {
  const encoded = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

/* ══════════════════════════════════════════════════════
   PREMIUM TOAST SYSTEM — colorful SVG icons, theme-aware
   no emojis, adapts to dark/light/any theme
══════════════════════════════════════════════════════ */
const _isDark = () =>
  document.documentElement.classList.contains('dark-mode') ||
  document.documentElement.classList.contains('dark-theme-variant');

const _toastStyle = (dark) => ({
  background: dark ? 'rgba(14,8,36,0.97)' : 'rgba(255,255,255,0.98)',
  color: dark ? 'var(--text-primary, #ede9fe)' : '#1e1b4b',
  border: `1.5px solid ${dark ? 'rgba(139,92,246,0.30)' : 'rgba(139,92,246,0.16)'}`,
  borderRadius: 16,
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  boxShadow: dark
    ? '0 20px 56px rgba(0,0,0,0.60), 0 4px 16px rgba(109,40,217,0.20)'
    : '0 16px 48px rgba(109,40,217,0.14), 0 4px 12px rgba(0,0,0,0.07)',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'Inter, system-ui, sans-serif',
  padding: '10px 16px',
  minHeight: 'unset',
});

/* Premium toast icon components */
const _TISuccess = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="tiOk" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#tiOk)" opacity=".16"/>
    <circle cx="12" cy="12" r="10" stroke="url(#tiOk)" strokeWidth="1.8" fill="none"/>
    <path d="M7.5 12l3 3 6-6" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const _TIError = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="tiErr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#dc2626"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#tiErr)" opacity=".14"/>
    <circle cx="12" cy="12" r="10" stroke="url(#tiErr)" strokeWidth="1.8" fill="none"/>
    <path d="M9 9l6 6M15 9l-6 6" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);
const _TIMic = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="tiMic" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#tiMic)" opacity=".18"/>
    <path d="M12 4a3 3 0 00-3 3v5a3 3 0 006 0V7a3 3 0 00-3-3z" stroke="url(#tiMic)" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    <path d="M18 11a6 6 0 01-12 0" stroke="url(#tiMic)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <line x1="12" y1="17" x2="12" y2="20" stroke="url(#tiMic)" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="9" y1="20" x2="15" y2="20" stroke="url(#tiMic)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const _TIWarning = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="tiWrn" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <path d="M12 3L2.5 20h19L12 3z" fill="url(#tiWrn)" opacity=".15"/>
    <path d="M12 3L2.5 20h19L12 3z" stroke="url(#tiWrn)" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
    <path d="M12 10v5" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx="12" cy="17.5" r="1" fill="#f59e0b"/>
  </svg>
);
const _TIInfo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="tiInf" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#38bdf8"/><stop offset="100%" stopColor="#0284c7"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#tiInf)" opacity=".15"/>
    <circle cx="12" cy="12" r="10" stroke="url(#tiInf)" strokeWidth="1.8" fill="none"/>
    <path d="M12 8v1M12 11v6" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);
const _TIBroadcast = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="tiBc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#c084fc"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <circle cx="12" cy="12" r="10" fill="url(#tiBc)" opacity=".15"/>
    <circle cx="12" cy="12" r="3" fill="url(#tiBc)"/>
    <path d="M8.5 8.5a5 5 0 000 7" stroke="url(#tiBc)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
    <path d="M15.5 8.5a5 5 0 010 7" stroke="url(#tiBc)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
  </svg>
);

const bpToast = {
  success: (msg) => toast.success(msg, { icon: <_TISuccess />, style: _toastStyle(_isDark()) }),
  error:   (msg) => toast.error(msg,   { icon: <_TIError />,   style: _toastStyle(_isDark()) }),
  mic:     (msg) => toast.success(msg, { icon: <_TIMic />,     style: _toastStyle(_isDark()) }),
  warning: (msg) => toast.warning(msg, { icon: <_TIWarning />, style: _toastStyle(_isDark()) }),
  info:    (msg) => toast.info(msg,    { icon: <_TIInfo />,    style: _toastStyle(_isDark()) }),
  live:    (msg) => toast.success(msg, { icon: <_TIBroadcast />, style: _toastStyle(_isDark()) }),
};

/* ── Premium Lock Icon ── */
const LockGoldIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="lgLock1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde68a"/>
        <stop offset="55%" stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#b45309"/>
      </linearGradient>
      <linearGradient id="lgLock2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fef3c7"/>
        <stop offset="100%" stopColor="#fbbf24"/>
      </linearGradient>
      <filter id="lgGlow">
        <feGaussianBlur stdDeviation="0.8" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    {/* shackle */}
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="url(#lgLock1)" strokeWidth="1.8" strokeLinecap="round" fill="none" filter="url(#lgGlow)"/>
    {/* body */}
    <rect x="5" y="10" width="14" height="11" rx="2.5" fill="url(#lgLock1)" opacity="0.95"/>
    {/* keyhole */}
    <circle cx="12" cy="15.5" r="1.6" fill="url(#lgLock2)"/>
    <rect x="11.25" y="15.5" width="1.5" height="2.5" rx="0.6" fill="url(#lgLock2)"/>
    {/* shine */}
    <rect x="6.5" y="11.5" width="4" height="1" rx="0.5" fill="rgba(255,255,255,0.35)"/>
  </svg>
);

/* ── Helpers ── */
const fmtTime = (secs) => {
  if (!secs || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const extractYtId = (url) => {
  const m = (url || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

/* ── Premium Animated Music SVG ── */
const MusicVisual = ({ isPlaying }) => (
  <div className={`bp-music-visual${isPlaying ? '' : ' paused'}`}>
    {[...Array(9)].map((_, i) => <div key={i} className="bp-bar" />)}
  </div>
);

/* ── Broadcast SVG icon — vivid purple-violet gradient ── */
const BroadcastIcon = ({ size = 20, color }) => {
  const c = color || 'url(#bcG)';
  const c2 = color ? color : '#c4b5fd';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {!color && (
        <defs>
          <linearGradient id="bcG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa"/>
            <stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
        </defs>
      )}
      <circle cx="12" cy="12" r="3.2" fill={c}/>
      <path d="M8.2 8.2a5.5 5.5 0 000 7.6" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M15.8 8.2a5.5 5.5 0 010 7.6" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M5 5a10 10 0 000 14" stroke={c2} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity={color ? '1' : '.65'}/>
      <path d="M19 5a10 10 0 010 14" stroke={c2} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity={color ? '1' : '.65'}/>
    </svg>
  );
};

/* ── Mic icon — purple on / red+strike off ── */
const MicIcon = ({ muted }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    {muted ? (
      <>
        <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v3m-3 0h6M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4z" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="3" y1="3" x2="21" y2="21" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round"/>
      </>
    ) : (
      <>
        <defs>
          <linearGradient id="micG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa"/>
            <stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
        </defs>
        <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v3m-3 0h6M12 1a4 4 0 00-4 4v7a4 4 0 008 0V5a4 4 0 00-4-4z" stroke="url(#micG)" strokeWidth="1.8" strokeLinecap="round"/>
      </>
    )}
  </svg>
);

/* ── Play — emerald green ── */
const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="plG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
    <path d="M8 5v14l11-7z" fill="url(#plG)"/>
  </svg>
);

/* ── Pause — amber gold ── */
const PauseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="paG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="url(#paG)"/>
  </svg>
);

/* ── Stop — coral red ── */
const StopIcon = ({ color }) => {
  const c = color || 'url(#stG)';
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      {!color && (
        <defs><linearGradient id="stG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#dc2626"/></linearGradient></defs>
      )}
      <rect x="6" y="6" width="12" height="12" rx="2" fill={c}/>
    </svg>
  );
};

/* ── SkipNext — indigo ── */
const SkipNextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="snG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
    <path d="M6 18l8.5-6L6 6v12zm8.5-6v6H17V6h-2.5v6z" fill="url(#snG)"/>
  </svg>
);

/* ── SkipPrev — indigo ── */
const SkipPrevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="spG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
    <path d="M18 6v12l-8.5-6L18 6zM9.5 12V6H7v12h2.5V12z" fill="url(#spG)"/>
  </svg>
);

/* ── Lock — amber ── */
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="lkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="url(#lkG)"/>
  </svg>
);

/* ── Users — teal cyan ── */
const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="usG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#0891b2"/></linearGradient></defs>
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="url(#usG)"/>
  </svg>
);

/* ── Music note — rose pink ── */
const MusicNoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="mnG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="url(#mnG)"/>
  </svg>
);

/* ── YouTube — red ── */
const YoutubeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="ytG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#dc2626"/></linearGradient></defs>
    <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.6-.8-2-.9C16.2 5 12 5 12 5s-4.2 0-7 .1c-.4.1-1.2.1-2 .9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.9C6.8 19 12 19 12 19s4.2 0 7-.2c.4-.1 1.2-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM10 15V9l5.5 3L10 15z" fill="url(#ytG)"/>
  </svg>
);

/* ── RadioWave — purple violet ── */
const RadioWaveIcon = ({ color }) => {
  const c = color || 'url(#rwG)';
  const c2 = color ? color : '#c4b5fd';
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      {!color && (
        <defs><linearGradient id="rwG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
      )}
      <circle cx="12" cy="12" r="3" fill={c}/>
      <path d="M8.5 8.5a5 5 0 000 7" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M15.5 8.5a5 5 0 010 7" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M5.5 5.5a9 9 0 000 13" stroke={c2} strokeWidth="1.3" strokeLinecap="round" opacity={color ? '1' : '.6'}/>
      <path d="M18.5 5.5a9 9 0 010 13" stroke={c2} strokeWidth="1.3" strokeLinecap="round" opacity={color ? '1' : '.6'}/>
    </svg>
  );
};

/* ── Invite speaker icon — teal ── */
const InviteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="ivG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#0891b2"/></linearGradient></defs>
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="url(#ivG)"/>
  </svg>
);

/* ── Requests icon — violet ── */
const RequestsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="rqG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#6d28d9"/></linearGradient></defs>
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="url(#rqG)"/>
  </svg>
);

/* ── Mic stage icon — green ── */
const StageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="sgG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#16a34a"/></linearGradient></defs>
    <path d="M12 14c2.21 0 4-1.79 4-4V5a4 4 0 00-8 0v5c0 2.21 1.79 4 4 4zm6.5-4c0 3.58-2.93 6.5-6.5 6.5S5.5 13.58 5.5 10H4c0 4.08 3.05 7.44 7 7.93V21h2v-3.07c3.95-.49 7-3.85 7-7.93h-1.5z" fill="url(#sgG)"/>
  </svg>
);

/* ── Antenna / public broadcast icon — rose ── */
const AntennaIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="anG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient></defs>
    <path d="M12 5a2 2 0 100 4 2 2 0 000-4zm0-3C6.48 2 2 6.48 2 12c0 3.54 1.85 6.65 4.63 8.43l1.07-1.85A8 8 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8a7.97 7.97 0 01-3.7 6.58l1.07 1.85C19.15 18.65 21 15.54 21 12c0-5.52-4.48-10-9-10zm0 9l-3 9h2l.5-1.5h1l.5 1.5h2l-3-9zm0 3.5l.5 1.5h-1l.5-1.5z" fill="url(#anG)"/>
  </svg>
);

/* ════════════════════════════════════════════
   MAIN BROADCAST PANEL
════════════════════════════════════════════ */
const BroadcastPanel = ({ isOpen, onClose, loggedInUserProfile, allUsersProfiles = [], roomId }) => {
  const [activeTab, setActiveTab] = useState(0);

  /* ── RJ Broadcast state ── */
  const [rjBroadcast, setRjBroadcast] = useState(null);          // live RTDB data
  const [rjIsLive, setRjIsLive] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [ytPlayerState, setYtPlayerState] = useState('stopped'); // playing/paused/stopped
  const [ytCurrentSongName, setYtCurrentSongName] = useState('');
  const [micMuted, setMicMuted] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [speakerMap, setSpeakerMap] = useState({});              // uid → {name, photoURL}
  const [broadcastDuration, setBroadcastDuration] = useState(0); // secs since live
  const durationRef = useRef(null);

  /* ── Join Requests state ── */
  const [joinRequests, setJoinRequests] = useState([]);           // array of {uid, name, photoURL, ts}
  const [myRequestStatus, setMyRequestStatus] = useState(null);   // null / 'pending' / 'accepted' / 'rejected'
  const [iAmSpeaker, setIAmSpeaker] = useState(false);

  /* ── Public Broadcasts state ── */
  const [publicBroadcasts, setPublicBroadcasts] = useState([]);
  const [myActiveBroadcast, setMyActiveBroadcast] = useState(null);
  const [pubTitle, setPubTitle] = useState('');
  const [pubPassword, setPubPassword] = useState('');
  const [pubIsProtected, setPubIsProtected] = useState(false);
  const [listeningTo, setListeningTo] = useState(null);
  const [passwordPrompt, setPasswordPrompt] = useState(null); // { broadcastId, title }
  const [pwInput, setPwInput] = useState('');

  /* ── WebRTC refs ── */
  const peerConnections = useRef({});     // RJ broadcast peer connections
  const localStream = useRef(null);       // RJ mic stream
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);

  /* ── Public broadcast WebRTC refs ── */
  const pubHostStream = useRef(null);     // broadcaster's mic stream
  const pubHostPCs = useRef({});          // uid → RTCPeerConnection (broadcaster side)
  const pubListenerPC = useRef(null);     // RTCPeerConnection (listener side)
  const pubAudioEl = useRef(null);        // Audio element for listener playback
  const pubRtdbUnsubs = useRef([]);       // cleanup functions for RTDB listeners
  const pubListenersUnsub = useRef(null); // unsub for listeners path watcher

  /* ── RJ broadcast WebRTC refs ── */
  const rjHostPCs = useRef({});           // uid → RTCPeerConnection (RJ broadcaster side)
  const rjListenersUnsub = useRef(null);  // unsub for RJ listeners watcher
  const rjRtdbUnsubs = useRef([]);        // cleanup fns for per-listener RTDB subs
  const rjListenerPC = useRef(null);      // RTCPeerConnection (listener side, RJ)
  const rjAudioEl = useRef(null);         // Audio element for listener playback

  /* ── RJ listener state ── */
  const [rjIsListening, setRjIsListening] = useState(false);
  const [rjConnecting, setRjConnecting] = useState(false);

  /* ── Permission flags ── */
  const isRJ = loggedInUserProfile?.badge === 'rj';
  const isOwnerAdmin = ['owner', 'admin'].includes(loggedInUserProfile?.role);
  // Only RJ badge holders can manage RJ broadcast (role stays 'user')
  const canManageRJ = isRJ;
  const isGuest = loggedInUserProfile?.isGuest === true || loggedInUserProfile?.role === 'guest';
  const myUid = loggedInUserProfile?.uid || auth.currentUser?.uid;
  const myName = loggedInUserProfile?.username || loggedInUserProfile?.displayName || 'User';
  const myPhoto = loggedInUserProfile?.photoURL || '';

  /* ══════════════════════════════════════
     FIREBASE LISTENERS
  ══════════════════════════════════════ */

  /* ── RJ Broadcast RTDB listener ── */
  useEffect(() => {
    if (!isOpen) return;
    const bcRef = ref(rtdb, 'broadcasts/rj');
    const unsub = onValue(bcRef, (snap) => {
      const data = snap.val();
      setRjBroadcast(data);
      const live = !!(data && data.isLive);
      setRjIsLive(live);
      if (data) {
        setListenerCount(data.listenerCount || 0);
        setSpeakerMap(data.speakers || {});
        setYtPlayerState(data.youtube?.state || 'stopped');
        setYtCurrentSongName(data.youtube?.songName || '');
        // Check if I am a speaker
        if (myUid && data.speakers && data.speakers[myUid]) {
          setIAmSpeaker(true);
        } else {
          setIAmSpeaker(false);
        }
      } else {
        setListenerCount(0);
        setSpeakerMap({});
        setIAmSpeaker(false);
      }
    });
    return () => unsub();
  }, [isOpen, myUid]);

  /* ── Join requests RTDB listener ── */
  useEffect(() => {
    if (!isOpen) return;
    const reqRef = ref(rtdb, 'broadcasts/rj/joinRequests');
    const unsub = onValue(reqRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([uid, v]) => ({ uid, ...v }));
      setJoinRequests(list);
      if (myUid) {
        const mine = data[myUid];
        setMyRequestStatus(mine ? mine.status : null);
      }
    });
    return () => unsub();
  }, [isOpen, myUid]);

  /* ── Register/unregister listener presence ── */
  useEffect(() => {
    if (!isOpen || !myUid || !rjIsLive) return;
    const lRef = ref(rtdb, `broadcasts/rj/listeners/${myUid}`);
    set(lRef, { uid: myUid, name: myName, joinedAt: Date.now() });
    onDisconnectCleanup(lRef);
    return () => remove(lRef);
  }, [isOpen, myUid, rjIsLive]);

  const onDisconnectCleanup = (lRef) => {
    onDisconnect(lRef).remove();
  };

  /* ── Duration timer ── */
  useEffect(() => {
    if (rjIsLive && rjBroadcast?.startedAt) {
      const tick = () => {
        const elapsed = Math.floor((Date.now() - rjBroadcast.startedAt) / 1000);
        setBroadcastDuration(elapsed);
      };
      tick();
      durationRef.current = setInterval(tick, 1000);
    } else {
      setBroadcastDuration(0);
      if (durationRef.current) clearInterval(durationRef.current);
    }
    return () => { if (durationRef.current) clearInterval(durationRef.current); };
  }, [rjIsLive, rjBroadcast?.startedAt]);

  /* ── YouTube player sync ── */
  useEffect(() => {
    if (!rjIsLive || !isOpen) return;
    const ytRef = ref(rtdb, 'broadcasts/rj/youtube');
    const unsub = onValue(ytRef, (snap) => {
      const yt = snap.val();
      if (!yt) return;
      syncYouTubePlayer(yt);
    });
    return () => unsub();
  }, [rjIsLive, isOpen]);

  /* ── Public broadcasts Firestore listener ── */
  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'publicBroadcasts'), where('isLive', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPublicBroadcasts(list);
      if (myUid) {
        const mine = list.find(b => b.hostUid === myUid);
        setMyActiveBroadcast(mine || null);
      }
    });
    return () => unsub();
  }, [isOpen, myUid]);

  /* ══════════════════════════════════════
     YOUTUBE PLAYER
  ══════════════════════════════════════ */
  const initYtPlayer = useCallback((videoId) => {
    if (!videoId) return;
    if (ytPlayerRef.current) {
      ytPlayerRef.current.loadVideoById(videoId);
      return;
    }
    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => createPlayer(videoId);
      return;
    }
    createPlayer(videoId);
  }, []);

  const createPlayer = (videoId) => {
    if (!ytContainerRef.current) return;
    ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
      height: '1',
      width: '1',
      videoId,
      playerVars: { autoplay: 0, controls: 0 },
      events: {
        onReady: (e) => {
          e.target.setVolume(80);
        },
        onStateChange: () => {}
      }
    });
  };

  const syncYouTubePlayer = (ytData) => {
    const player = ytPlayerRef.current;
    if (!player || !player.loadVideoById) return;
    const { state, videoId, seekTo } = ytData;
    if (videoId) {
      const cur = player.getVideoUrl?.() || '';
      if (!cur.includes(videoId)) {
        player.loadVideoById({ videoId, startSeconds: seekTo || 0 });
      }
    }
    if (state === 'playing') {
      player.playVideo?.();
      if (seekTo != null) player.seekTo?.(seekTo, true);
    } else if (state === 'paused') {
      player.pauseVideo?.();
    } else if (state === 'stopped') {
      player.stopVideo?.();
    }
  };

  /* ══════════════════════════════════════
     RJ BROADCAST — WebRTC (broadcaster side)
  ══════════════════════════════════════ */

  /** Create & send a WebRTC offer to one listener (RJ broadcaster side). */
  const rjCreateOfferForListener = async (listenerUid) => {
    const existing = rjHostPCs.current[listenerUid];
    if (existing) {
      if (existing.connectionState !== 'failed' && existing.signalingState !== 'closed') return;
      try { existing.close(); } catch {}
      delete rjHostPCs.current[listenerUid];
    }
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    rjHostPCs.current[listenerUid] = pc;

    if (localStream.current) {
      localStream.current.getTracks().forEach(t => pc.addTrack(t, localStream.current));
    }
    pc.onicecandidate = (e) => {
      if (e.candidate)
        push(ref(rtdb, `broadcasts/rj/connections/${listenerUid}/hostCandidates`), e.candidate.toJSON()).catch(() => {});
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await set(ref(rtdb, `broadcasts/rj/connections/${listenerUid}/offer`), { type: offer.type, sdp: offer.sdp }).catch(() => {});

    const unsubAns = onValue(ref(rtdb, `broadcasts/rj/connections/${listenerUid}/answer`), snap => {
      const ans = snap.val();
      if (ans && pc.signalingState !== 'closed' && !pc.remoteDescription)
        pc.setRemoteDescription(new RTCSessionDescription(ans)).catch(() => {});
    });
    rjRtdbUnsubs.current.push(unsubAns);

    const unsubLC = onValue(ref(rtdb, `broadcasts/rj/connections/${listenerUid}/listenerCandidates`), snap => {
      const cands = snap.val() || {};
      Object.values(cands).forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
    });
    rjRtdbUnsubs.current.push(unsubLC);
  };

  /** Watch RJ listeners node — create offers for new listeners, cleanup for departed (broadcaster side). */
  const rjStartListenerWatcher = () => {
    let prevUIDs = new Set();
    const lisRef = ref(rtdb, 'broadcasts/rj/listeners');
    const unsub = onValue(lisRef, snap => {
      const listeners = snap.val() || {};
      const currentUIDs = new Set(Object.keys(listeners));
      currentUIDs.forEach(uid => {
        if (uid !== myUid && !prevUIDs.has(uid)) rjCreateOfferForListener(uid);
      });
      prevUIDs.forEach(uid => {
        if (!currentUIDs.has(uid) && rjHostPCs.current[uid]) {
          try { rjHostPCs.current[uid].close(); } catch {}
          delete rjHostPCs.current[uid];
          remove(ref(rtdb, `broadcasts/rj/connections/${uid}`)).catch(() => {});
        }
      });
      prevUIDs = currentUIDs;
    });
    rjListenersUnsub.current = unsub;
  };

  /** Cleanup all RJ broadcast WebRTC resources (broadcaster side). */
  const rjStopAllConnections = () => {
    rjRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
    rjRtdbUnsubs.current = [];
    if (rjListenersUnsub.current) { try { rjListenersUnsub.current(); } catch {} rjListenersUnsub.current = null; }
    Object.values(rjHostPCs.current).forEach(pc => { try { pc.close(); } catch {} });
    rjHostPCs.current = {};
    remove(ref(rtdb, 'broadcasts/rj/connections')).catch(() => {});
  };

  /* ══════════════════════════════════════
     RJ BROADCAST — WebRTC (listener side)
  ══════════════════════════════════════ */

  /** Listener joins the RJ broadcast audio stream. */
  const rjJoinAudio = async () => {
    if (!myUid) return;
    setRjConnecting(true);
    try {
      // Register presence so broadcaster knows to make an offer for us
      const lRef = ref(rtdb, `broadcasts/rj/listeners/${myUid}`);
      await set(lRef, { uid: myUid, name: myName, joinedAt: Date.now() });
      onDisconnect(lRef).remove();

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      rjListenerPC.current = pc;

      // When audio track arrives, play it
      pc.ontrack = (e) => {
        if (!rjAudioEl.current) {
          const audio = new Audio();
          audio.autoplay = true;
          audio.playsInline = true;
          rjAudioEl.current = audio;
        }
        rjAudioEl.current.srcObject = e.streams[0];
        rjAudioEl.current.play().catch(() => {});
      };

      // Send our ICE candidates to broadcaster
      pc.onicecandidate = (e) => {
        if (e.candidate)
          push(ref(rtdb, `broadcasts/rj/connections/${myUid}/listenerCandidates`), e.candidate.toJSON()).catch(() => {});
      };

      // Wait for broadcaster's offer, then answer
      const unsubOffer = onValue(ref(rtdb, `broadcasts/rj/connections/${myUid}/offer`), async snap => {
        const offer = snap.val();
        if (!offer || pc.signalingState === 'closed' || pc.remoteDescription) return;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await set(ref(rtdb, `broadcasts/rj/connections/${myUid}/answer`), { type: answer.type, sdp: answer.sdp }).catch(() => {});
      });
      rjRtdbUnsubs.current.push(unsubOffer);

      // Listen for broadcaster's ICE candidates
      const unsubHC = onValue(ref(rtdb, `broadcasts/rj/connections/${myUid}/hostCandidates`), snap => {
        const cands = snap.val() || {};
        Object.values(cands).forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
      });
      rjRtdbUnsubs.current.push(unsubHC);

      // Also sync YouTube player if already playing
      if (rjBroadcast?.youtube?.videoId) {
        initYtPlayer(rjBroadcast.youtube.videoId);
      }
      setRjIsListening(true);
    } catch (err) {
      console.error('RJ join audio error:', err);
      bpToast.error('Could not connect to broadcast. Please try again.');
    } finally {
      setRjConnecting(false);
    }
  };

  /** Listener leaves the RJ broadcast audio stream. */
  const rjLeaveAudio = () => {
    rjRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
    rjRtdbUnsubs.current = [];
    if (rjListenerPC.current) { try { rjListenerPC.current.close(); } catch {} rjListenerPC.current = null; }
    if (rjAudioEl.current) {
      rjAudioEl.current.pause();
      rjAudioEl.current.srcObject = null;
      rjAudioEl.current = null;
    }
    if (myUid) {
      remove(ref(rtdb, `broadcasts/rj/listeners/${myUid}`)).catch(() => {});
      remove(ref(rtdb, `broadcasts/rj/connections/${myUid}`)).catch(() => {});
    }
    setRjIsListening(false);
  };

  /* ══════════════════════════════════════
     RJ CONTROLS
  ══════════════════════════════════════ */
  const [goingLive, setGoingLive] = useState(false);

  const handleGoLive = async () => {
    if (!myUid) { bpToast.error('You must be logged in to go live.'); return; }
    if (!isRJ) { bpToast.error('Only RJ badge holders can go live.'); return; }
    setGoingLive(true);
    try {
      // Start mic first
      await startLocalMic();

      const bcData = {
        isLive: true,
        rjUid: myUid,
        rjName: myName,
        rjAvatar: myPhoto,
        rjBadge: 'RJ',
        title: broadcastTitle || 'Live Broadcast',
        listenerCount: 0,
        startedAt: Date.now(),
        speakers: {},
        joinRequests: {},
        youtube: { state: 'stopped', videoId: null, seekTo: 0, songName: '' }
      };
      await set(ref(rtdb, 'broadcasts/rj'), bcData);
      setMicMuted(false);
      rjStartListenerWatcher(); // start WebRTC listener for audience
      bpToast.mic('You are now LIVE! Listeners can hear you.');

      if (roomId) {
        const { serverTimestamp: fsST, addDoc: fsAdd, collection: fsColl } = await import('firebase/firestore');
        const { db: fsDb } = await import('../firebase/config');
        fsAdd(fsColl(fsDb, 'rooms', roomId, 'messages'), {
          text: `${myName} is now LIVE on Broadcast! Tune in to the Broadcast tab.`,
          uid: 'tinglebot_system_official_2024',
          displayName: 'TingleBot',
          isBot: true,
          systemBot: true,
          tinglebotType: 'broadcast_live',
          createdAt: fsST(),
          noReply: true,
          noReaction: true,
          noReport: true,
          noUnread: true,
        }).then(r => {
          if (r?.id) setTimeout(() => deleteDoc(doc(db, 'rooms', roomId, 'messages', r.id)).catch(() => {}), 10 * 60 * 1000);
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Go Live error:', err);
      bpToast.error('Failed to go live. Check mic permissions & try again.');
      stopLocalMic();
    } finally {
      setGoingLive(false);
    }
  };

  const handleEndBroadcast = async () => {
    const endingName = myName;
    try {
      rjStopAllConnections(); // WebRTC cleanup before removing RTDB node
      await remove(ref(rtdb, 'broadcasts/rj'));
      setYtUrl('');
      setYtCurrentSongName('');
      setYtPlayerState('stopped');
      stopLocalMic();
      bpToast.success('Broadcast ended.');

      if (roomId) {
        const { serverTimestamp: fsST, addDoc: fsAdd, collection: fsColl } = await import('firebase/firestore');
        const { db: fsDb } = await import('../firebase/config');
        fsAdd(fsColl(fsDb, 'rooms', roomId, 'messages'), {
          text: `${endingName}'s Broadcast has ended.`,
          uid: 'tinglebot_system_official_2024',
          displayName: 'TingleBot',
          isBot: true,
          systemBot: true,
          tinglebotType: 'broadcast_ended',
          createdAt: fsST(),
          noReply: true,
          noReaction: true,
          noReport: true,
          noUnread: true,
        }).then(r => {
          if (r?.id) setTimeout(() => deleteDoc(doc(db, 'rooms', roomId, 'messages', r.id)).catch(() => {}), 5 * 60 * 1000);
        }).catch(() => {});
      }
    } catch (err) {
      console.error('End broadcast error:', err);
      bpToast.error('Failed to end broadcast. Please try again.');
    }
  };

  const handleMicToggle = async () => {
    if (!localStream.current) {
      await startLocalMic();
      setMicMuted(false);
    } else {
      const enabled = !micMuted;
      localStream.current.getAudioTracks().forEach(t => { t.enabled = !enabled; });
      setMicMuted(enabled);
    }
  };

  const startLocalMic = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current = stream;
    return stream;
  };

  const stopLocalMic = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
  };

  const handleYtLoad = () => {
    const vid = extractYtId(ytUrl);
    if (!vid) return;
    const songName = ytUrl;
    initYtPlayer(vid);
    update(ref(rtdb, 'broadcasts/rj/youtube'), {
      videoId: vid,
      state: 'paused',
      seekTo: 0,
      songName: songName,
      updatedAt: Date.now()
    });
    setYtCurrentSongName(songName);
  };

  const handleYtControl = (action) => {
    const player = ytPlayerRef.current;
    let newState = ytPlayerState;
    let seekTo = 0;
    if (action === 'play') {
      player?.playVideo?.();
      newState = 'playing';
      seekTo = player?.getCurrentTime?.() || 0;
    } else if (action === 'pause') {
      player?.pauseVideo?.();
      newState = 'paused';
      seekTo = player?.getCurrentTime?.() || 0;
    } else if (action === 'stop') {
      player?.stopVideo?.();
      newState = 'stopped';
      seekTo = 0;
    } else if (action === 'skipnext') {
      seekTo = (player?.getCurrentTime?.() || 0) + 30;
      player?.seekTo?.(seekTo, true);
      newState = 'playing';
      player?.playVideo?.();
    } else if (action === 'skipprev') {
      seekTo = Math.max(0, (player?.getCurrentTime?.() || 0) - 15);
      player?.seekTo?.(seekTo, true);
    }
    setYtPlayerState(newState);
    update(ref(rtdb, 'broadcasts/rj/youtube'), {
      state: newState,
      seekTo,
      updatedAt: Date.now()
    });
  };

  /* ── Invite speaker ── */
  const handleInviteSpeaker = async (uid) => {
    if (!uid) return;
    const target = allUsersProfiles.find(u => u.uid === uid);
    if (!target) return;
    await update(ref(rtdb, `broadcasts/rj/speakers/${uid}`), {
      uid,
      name: target.username || target.displayName || 'User',
      photoURL: target.photoURL || '',
      joinedAt: Date.now(),
      muted: false
    });
    // Remove from join requests
    await remove(ref(rtdb, `broadcasts/rj/joinRequests/${uid}`));
  };

  const handleRemoveSpeaker = async (uid) => {
    await remove(ref(rtdb, `broadcasts/rj/speakers/${uid}`));
  };

  /* ══════════════════════════════════════
     JOIN REQUESTS
  ══════════════════════════════════════ */
  const handleRequestToJoin = async () => {
    if (!myUid || !rjIsLive) return;
    await set(ref(rtdb, `broadcasts/rj/joinRequests/${myUid}`), {
      uid: myUid,
      name: myName,
      photoURL: myPhoto,
      status: 'pending',
      requestedAt: Date.now()
    });
    setMyRequestStatus('pending');
  };

  const handleCancelRequest = async () => {
    if (!myUid) return;
    await remove(ref(rtdb, `broadcasts/rj/joinRequests/${myUid}`));
    setMyRequestStatus(null);
  };

  const handleAcceptRequest = async (uid) => {
    await handleInviteSpeaker(uid);
  };

  const handleRejectRequest = async (uid) => {
    await update(ref(rtdb, `broadcasts/rj/joinRequests/${uid}`), { status: 'rejected' });
    setTimeout(() => remove(ref(rtdb, `broadcasts/rj/joinRequests/${uid}`)), 3000);
  };

  /* ══════════════════════════════════════
     PUBLIC BROADCASTS — WebRTC Audio
  ══════════════════════════════════════ */

  /* ── Broadcaster: create a peer connection for one listener ── */
  const pubCreateOfferForListener = async (broadcastId, listenerUid) => {
    // Close and remove stale/closed PC before renegotiating
    const existing = pubHostPCs.current[listenerUid];
    if (existing) {
      if (existing.connectionState !== 'failed' && existing.signalingState !== 'closed') return;
      try { existing.close(); } catch {}
      delete pubHostPCs.current[listenerUid];
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pubHostPCs.current[listenerUid] = pc;

    // Add mic tracks
    if (pubHostStream.current) {
      pubHostStream.current.getTracks().forEach(t => pc.addTrack(t, pubHostStream.current));
    }

    // Send ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        push(
          ref(rtdb, `broadcasts/public/${broadcastId}/connections/${listenerUid}/hostCandidates`),
          e.candidate.toJSON()
        ).catch(() => {});
      }
    };

    // Create & store offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await set(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${listenerUid}/offer`), {
      type: offer.type, sdp: offer.sdp
    }).catch(() => {});

    // Bug fix #3: onValue returns the unsubscribe fn — call it directly
    const unsubAns = onValue(
      ref(rtdb, `broadcasts/public/${broadcastId}/connections/${listenerUid}/answer`),
      snap => {
        const ans = snap.val();
        if (ans && pc.signalingState !== 'closed' && !pc.remoteDescription) {
          pc.setRemoteDescription(new RTCSessionDescription(ans)).catch(() => {});
        }
      }
    );
    pubRtdbUnsubs.current.push(unsubAns);

    const unsubLC = onValue(
      ref(rtdb, `broadcasts/public/${broadcastId}/connections/${listenerUid}/listenerCandidates`),
      snap => {
        const cands = snap.val() || {};
        Object.values(cands).forEach(c => {
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        });
      }
    );
    pubRtdbUnsubs.current.push(unsubLC);
  };

  /* ── Broadcaster: watch listeners with join/leave tracking ── */
  const pubStartListenerWatcher = (broadcastId) => {
    let prevUIDs = new Set();
    const lisRef = ref(rtdb, `broadcasts/public/${broadcastId}/listeners`);
    // Bug fix #3: store return value directly
    const unsub = onValue(lisRef, snap => {
      const listeners = snap.val() || {};
      const currentUIDs = new Set(Object.keys(listeners));

      // New listeners → create offer
      currentUIDs.forEach(uid => {
        if (uid !== myUid && !prevUIDs.has(uid)) {
          pubCreateOfferForListener(broadcastId, uid);
        }
      });

      // Bug fix #1: departed listeners → close + delete PC so they can cleanly rejoin
      prevUIDs.forEach(uid => {
        if (!currentUIDs.has(uid) && pubHostPCs.current[uid]) {
          try { pubHostPCs.current[uid].close(); } catch {}
          delete pubHostPCs.current[uid];
          remove(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${uid}`)).catch(() => {});
        }
      });

      prevUIDs = currentUIDs;
    });
    pubListenersUnsub.current = unsub; // Bug fix #3: store unsub fn directly
  };

  /* ── Broadcaster: stop everything ── */
  const pubStopHostAudio = (broadcastId) => {
    // Bug fix #3: call unsubs directly (they ARE the unsubscribe functions)
    pubRtdbUnsubs.current.forEach(unsub => { try { unsub(); } catch {} });
    pubRtdbUnsubs.current = [];
    if (pubListenersUnsub.current) {
      try { pubListenersUnsub.current(); } catch {}
      pubListenersUnsub.current = null;
    }

    Object.values(pubHostPCs.current).forEach(pc => { try { pc.close(); } catch {} });
    pubHostPCs.current = {};

    if (pubHostStream.current) {
      pubHostStream.current.getTracks().forEach(t => t.stop());
      pubHostStream.current = null;
    }

    if (broadcastId) {
      remove(ref(rtdb, `broadcasts/public/${broadcastId}/listeners`)).catch(() => {});
      remove(ref(rtdb, `broadcasts/public/${broadcastId}/connections`)).catch(() => {});
    }
  };

  /* ── Listener: join and receive audio ── */
  const pubJoinAudio = async (bc) => {
    if (!myUid) return;
    const { id: broadcastId } = bc;

    await set(ref(rtdb, `broadcasts/public/${broadcastId}/listeners/${myUid}`), {
      uid: myUid, name: myName, joinedAt: Date.now()
    }).catch(() => {});

    updateDoc(doc(db, 'publicBroadcasts', broadcastId), {
      listenerCount: (bc.listenerCount || 0) + 1
    }).catch(() => {});

    const offerRef = ref(rtdb, `broadcasts/public/${broadcastId}/connections/${myUid}/offer`);
    // Bug fix #3: store onValue return as direct unsub
    const unsubOffer = onValue(offerRef, async snap => {
      const offer = snap.val();
      if (!offer || pubListenerPC.current) return;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pubListenerPC.current = pc;

      pc.ontrack = e => {
        if (!pubAudioEl.current) {
          pubAudioEl.current = new Audio();
          pubAudioEl.current.autoplay = true;
        }
        pubAudioEl.current.srcObject = e.streams[0];
        pubAudioEl.current.play().catch(() => {});
      };

      pc.onicecandidate = evt => {
        if (evt.candidate) {
          push(
            ref(rtdb, `broadcasts/public/${broadcastId}/connections/${myUid}/listenerCandidates`),
            evt.candidate.toJSON()
          ).catch(() => {});
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await set(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${myUid}/answer`), {
        type: answer.type, sdp: answer.sdp
      }).catch(() => {});

      // Bug fix #3: store return from onValue directly
      const unsubHC = onValue(
        ref(rtdb, `broadcasts/public/${broadcastId}/connections/${myUid}/hostCandidates`),
        s => {
          const cands = s.val() || {};
          Object.values(cands).forEach(c => {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          });
        }
      );
      pubRtdbUnsubs.current.push(unsubHC);
    });
    pubRtdbUnsubs.current.push(unsubOffer);
  };

  /* ── Listener: leave ── */
  const pubLeaveAudio = (broadcastId) => {
    // Bug fix #3: call unsubs directly
    pubRtdbUnsubs.current.forEach(unsub => { try { unsub(); } catch {} });
    pubRtdbUnsubs.current = [];

    if (pubListenerPC.current) {
      try { pubListenerPC.current.close(); } catch {}
      pubListenerPC.current = null;
    }
    if (pubAudioEl.current) {
      pubAudioEl.current.pause();
      pubAudioEl.current.srcObject = null;
      pubAudioEl.current = null;
    }
    if (broadcastId && myUid) {
      remove(ref(rtdb, `broadcasts/public/${broadcastId}/listeners/${myUid}`)).catch(() => {});
    }
  };

  /* ── Handlers ── */
  const handleCreatePublicBroadcast = async () => {
    if (!myUid || !pubTitle.trim()) return;

    // Bug fix #2: get mic BEFORE creating Firestore doc so we abort on failure
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      bpToast.error('Microphone permission required to go live. Allow mic access and try again.');
      return;
    }
    pubHostStream.current = stream;

    try {
      // Password security: store SHA-256 hash, never plaintext
      const passwordHash = pubIsProtected && pubPassword.trim()
        ? await hashPassword(pubPassword.trim())
        : '';

      const data = {
        hostUid: myUid,
        hostName: myName,
        hostAvatar: myPhoto,
        title: pubTitle.trim(),
        isLive: true,
        isPasswordProtected: pubIsProtected,
        passwordHash,               // ← hashed, not plaintext
        listenerCount: 0,
        createdAt: new Date().toISOString(),
        startedAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'publicBroadcasts'), data);
      setMyActiveBroadcast({ id: docRef.id, ...data });
      setPubTitle('');
      setPubPassword('');
      setPubIsProtected(false);
      pubStartListenerWatcher(docRef.id); // mic already in pubHostStream
      bpToast.live('Your public broadcast is LIVE! Others can now tune in.');
    } catch (err) {
      console.error('Create broadcast error:', err);
      // Mic was started — stop it since doc creation failed
      stream.getTracks().forEach(t => t.stop());
      pubHostStream.current = null;
      bpToast.error('Failed to start broadcast. Please try again.');
    }
  };

  const handleStopPublicBroadcast = async () => {
    if (!myActiveBroadcast?.id) return;
    try {
      pubStopHostAudio(myActiveBroadcast.id);
      await updateDoc(doc(db, 'publicBroadcasts', myActiveBroadcast.id), { isLive: false });
      setMyActiveBroadcast(null);
      bpToast.success('Broadcast ended. Thanks for going live!');
    } catch (err) {
      console.error('Stop broadcast error:', err);
      bpToast.error('Failed to stop broadcast.');
    }
  };

  const handleJoinPublicBroadcast = async (bc) => {
    if (listeningTo) {
      pubLeaveAudio(listeningTo.id);
      if (listeningTo.id === bc.id) { setListeningTo(null); return; }
    }
    if (bc.isPasswordProtected) {
      setPasswordPrompt({ broadcastId: bc.id, title: bc.title });
      return;
    }
    setListeningTo(bc);
    await pubJoinAudio(bc);
  };

  const handlePasswordSubmit = async () => {
    if (!passwordPrompt) return;
    const bc = publicBroadcasts.find(b => b.id === passwordPrompt.broadcastId);
    if (!bc) return;
    // Password security: compare SHA-256 hashes
    try {
      const entered = await hashPassword(pwInput);
      if (entered === bc.passwordHash) {
        setListeningTo(bc);
        setPasswordPrompt(null);
        setPwInput('');
        await pubJoinAudio(bc);
      } else {
        bpToast.error('Wrong password. Try again.');
        setPwInput('');
      }
    } catch {
      bpToast.error('Could not verify password. Try again.');
      setPwInput('');
    }
  };

  /* ══════════════════════════════════════
     RENDER HELPERS
  ══════════════════════════════════════ */
  const renderTabBadge = (tab) => {
    if (tab === 1 && joinRequests.filter(r => r.status === 'pending').length > 0) {
      const count = joinRequests.filter(r => r.status === 'pending').length;
      if (canManageRJ) return <span className="bp-tab-badge">{count}</span>;
    }
    return null;
  };

  /* ── Cleanup WebRTC listeners when panel closes ── */
  useEffect(() => {
    if (!isOpen) {
      if (listeningTo) pubLeaveAudio(listeningTo.id);
      if (rjIsListening) rjLeaveAudio();
      // Don't stop host audio on close so the broadcast continues in the background
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /* ══════════════════════════════════════
     TAB 0 — RJ BROADCAST
  ══════════════════════════════════════ */
  const renderRJTab = () => {
    if (canManageRJ) return renderRJControls();
    return renderListenerView();
  };

  const renderRJControls = () => (
    <div>
      {/* Go Live / End */}
      <div className="bp-golive-card">
        <div className="bp-golive-row">
          <div className="bp-golive-info">
            <h3>{rjIsLive ? 'You are LIVE' : 'Start Broadcast'}</h3>
            <p>{rjIsLive ? `${listenerCount} listener${listenerCount !== 1 ? 's' : ''} tuned in` : 'Go live to start broadcasting'}</p>
            {rjIsLive && (
              <div className="bp-live-indicator">
                <span className="bp-live-dot" />
                <span className="bp-live-text">LIVE</span>
                <span className="bp-live-timer">· {fmtTime(broadcastDuration)}</span>
              </div>
            )}
          </div>
          {rjIsLive
            ? <button className="bp-golive-btn end" onClick={handleEndBroadcast}><StopIcon color="white" /> End</button>
            : <button className="bp-golive-btn start" onClick={handleGoLive} disabled={goingLive}>
                <RadioWaveIcon color="white" /> {goingLive ? 'Starting...' : 'Go Live'}
              </button>
          }
        </div>
      </div>

      {/* Broadcast title */}
      {!rjIsLive && (
        <div className="bp-title-row">
          <input
            className="bp-input"
            placeholder="Broadcast title..."
            value={broadcastTitle}
            onChange={e => setBroadcastTitle(e.target.value)}
          />
        </div>
      )}

      {/* Controls */}
      {rjIsLive && (
        <>
          <div className="bp-control-grid">
            <button
              className={`bp-ctrl-btn${micMuted ? ' danger' : ''}`}
              onClick={handleMicToggle}
            >
              <MicIcon muted={micMuted} />
              {micMuted ? 'Mic Off' : 'Mic On'}
            </button>
            <button className="bp-ctrl-btn" onClick={() => setActiveTab(1)}>
              <InviteIcon />
              Invite Speaker
            </button>
            <button className="bp-ctrl-btn" onClick={() => setActiveTab(1)}>
              <RequestsIcon />
              Requests ({joinRequests.filter(r => r.status === 'pending').length})
            </button>
          </div>

          {/* Analytics */}
          <div className="bp-analytics-row">
            <div className="bp-stat-card">
              <div className="bp-stat-value">{listenerCount}</div>
              <div className="bp-stat-label">Listeners</div>
            </div>
            <div className="bp-stat-card">
              <div className="bp-stat-value">{Object.keys(speakerMap).length}</div>
              <div className="bp-stat-label">Speakers</div>
            </div>
            <div className="bp-stat-card">
              <div className="bp-stat-value">{fmtTime(broadcastDuration)}</div>
              <div className="bp-stat-label">Duration</div>
            </div>
          </div>

          {/* YouTube section */}
          <div className="bp-yt-section">
            <div className="bp-yt-label"><YoutubeIcon /> Music Sync</div>
            <div className="bp-yt-url-row">
              <input
                className="bp-input"
                placeholder="YouTube URL..."
                value={ytUrl}
                onChange={e => setYtUrl(e.target.value)}
              />
              <button className="bp-yt-load-btn" onClick={handleYtLoad}>Load</button>
            </div>
            {ytCurrentSongName && (
              <div className="bp-song-controls">
                <button className="bp-song-btn" onClick={() => handleYtControl('skipprev')}>
                  <SkipPrevIcon />
                </button>
                {ytPlayerState === 'playing'
                  ? <button className="bp-song-btn play-main" onClick={() => handleYtControl('pause')}><PauseIcon /></button>
                  : <button className="bp-song-btn play-main" onClick={() => handleYtControl('play')}><PlayIcon /></button>
                }
                <button className="bp-song-btn" onClick={() => handleYtControl('skipnext')}><SkipNextIcon /></button>
                <button className="bp-song-btn danger" onClick={() => handleYtControl('stop')}><StopIcon /></button>
              </div>
            )}
          </div>

          {/* Active speakers */}
          {Object.keys(speakerMap).length > 0 && (
            <div className="bp-speakers-section">
              <div className="bp-section-label">Active Speakers</div>
              <div className="bp-speaker-list">
                {Object.entries(speakerMap).map(([uid, sp]) => (
                  <div key={uid} className="bp-speaker-item">
                    <img
                      className="bp-speaker-avatar"
                      src={sp.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`}
                      alt={sp.name}
                      onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${uid}`; }}
                    />
                    <span className="bp-speaker-name">{sp.name}</span>
                    <button className="bp-remove-speaker-btn" onClick={() => handleRemoveSpeaker(uid)}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderListenerView = () => {
    if (!rjIsLive || !rjBroadcast) {
      return (
        <div className="bp-no-broadcast">
          <div className="bp-no-broadcast-icon">
            <BroadcastIcon size={56} />
          </div>
          <h3>No Active Broadcast</h3>
          <p>The RJ is not live right now. Check back later!</p>
        </div>
      );
    }

    const speakers = Object.values(speakerMap);

    return (
      <div className="bp-player-card">
        <MusicVisual isPlaying={ytPlayerState === 'playing'} />

        <div className="bp-rj-avatar-wrap">
          <img
            className="bp-rj-avatar"
            src={rjBroadcast.rjAvatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${rjBroadcast.rjUid}`}
            alt={rjBroadcast.rjName}
            onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${rjBroadcast.rjUid}`; }}
          />
          <div className="bp-rj-live-ring" />
          <div className="bp-rj-badge-wrap">RJ</div>
        </div>

        <h3 className="bp-rj-name">{rjBroadcast.rjName}</h3>
        <div className="bp-rj-title">{rjBroadcast.title || 'Live Broadcast'}</div>

        <div className="bp-live-badge">
          <span className="bp-live-dot" />
          <span>LIVE</span>
          <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 4 }}>· {fmtTime(broadcastDuration)}</span>
        </div>

        {ytCurrentSongName && (
          <div className="bp-song-info">
            <div className="bp-song-icon"><MusicNoteIcon /></div>
            <div className="bp-song-details">
              <div className="bp-song-label">Now Playing</div>
              <div className="bp-song-name">{ytCurrentSongName}</div>
            </div>
          </div>
        )}

        <div className="bp-listener-row">
          <div className="bp-listener-chip">
            <UsersIcon />
            <strong>{listenerCount}</strong> Listeners
          </div>
          {broadcastDuration > 0 && (
            <div className="bp-listener-chip">
              <RadioWaveIcon />
              {fmtTime(broadcastDuration)}
            </div>
          )}
        </div>

        {/* Listen Live / Stop Listening button (all non-guest, non-RJ users) */}
        {!isGuest && !canManageRJ && (
          <div style={{ marginTop: 16 }}>
            {rjIsListening ? (
              <button
                className="bp-request-btn cancel"
                style={{ width: '100%' }}
                onClick={() => { rjLeaveAudio(); }}
              >
                <StopIcon color="#ef4444" /> Stop Listening
              </button>
            ) : (
              <button
                className="bp-request-btn join"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={rjJoinAudio}
                disabled={rjConnecting}
              >
                <BroadcastIcon size={16} color="white" />
                {rjConnecting ? 'Connecting...' : 'Listen Live'}
              </button>
            )}
          </div>
        )}
        {isGuest && (
          <p style={{ fontSize: 11.5, color: 'var(--bp-text-muted)', marginTop: 14, marginBottom: 0 }}>
            Register for a free account to listen live.
          </p>
        )}

        {speakers.length > 0 && (
          <div className="bp-connected-speakers" style={{ marginTop: 12 }}>
            {speakers.slice(0, 5).map(sp => (
              <img
                key={sp.uid}
                className="bp-speaker-bubble"
                src={sp.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${sp.uid}`}
                alt={sp.name}
                title={sp.name}
                onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${sp.uid}`; }}
              />
            ))}
            {speakers.length > 5 && (
              <span className="bp-speaker-count">+{speakers.length - 5} more</span>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════
     TAB 1 — JOIN REQUESTS
  ══════════════════════════════════════ */
  const renderJoinTab = () => {
    if (!rjIsLive) {
      return (
        <div className="bp-empty">
          <div style={{ marginBottom: 10, opacity: 0.25 }}><BroadcastIcon size={40} /></div>
          No active broadcast to join.
        </div>
      );
    }

    if (iAmSpeaker) {
      return (
        <div>
          <div className="bp-speaker-status">
            <h3 style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
              <MicIcon muted={false} />
              You are a Speaker
            </h3>
            <p>Your voice is live on the broadcast</p>
          </div>
          <button
            className="bp-request-btn cancel"
            style={{ width: '100%' }}
            onClick={() => handleRemoveSpeaker(myUid)}
          >
            Leave Stage
          </button>
        </div>
      );
    }

    if (canManageRJ) {
      const pending = joinRequests.filter(r => r.status === 'pending');
      return (
        <div>
          <div className="bp-section-label" style={{ marginBottom: 12 }}>
            Pending Requests ({pending.length})
          </div>
          {pending.length === 0 ? (
            <div className="bp-queue-empty">No pending join requests</div>
          ) : (
            <div className="bp-requests-list">
              {pending.map(req => (
                <div key={req.uid} className="bp-req-item">
                  <img
                    className="bp-req-avatar"
                    src={req.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${req.uid}`}
                    alt={req.name}
                    onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${req.uid}`; }}
                  />
                  <div className="bp-req-info">
                    <div className="bp-req-name">{req.name}</div>
                    <div className="bp-req-time">{req.requestedAt ? new Date(req.requestedAt).toLocaleTimeString() : ''}</div>
                  </div>
                  <div className="bp-req-actions">
                    <button className="bp-req-accept" onClick={() => handleAcceptRequest(req.uid)}>Accept</button>
                    <button className="bp-req-reject" onClick={() => handleRejectRequest(req.uid)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (isGuest) {
      return (
        <div className="bp-guest-lock">
          <div className="bp-guest-lock-icon"><LockIcon /></div>
          <h3>Register to Join</h3>
          <p>Create an account to request to speak on live broadcasts.</p>
        </div>
      );
    }

    return (
      <div>
        <div className="bp-joinreq-hero">
          <h3>Join the Broadcast Stage</h3>
          <p>Request to speak live on the broadcast. The RJ will review your request.</p>
          {myRequestStatus === 'pending' ? (
            <>
              <button className="bp-request-btn pending" disabled>Request Pending...</button>
              <div style={{ marginTop: 8 }}>
                <button className="bp-request-btn cancel" onClick={handleCancelRequest}>Cancel Request</button>
              </div>
            </>
          ) : myRequestStatus === 'rejected' ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>Request was declined.</div>
              <button className="bp-request-btn join" onClick={handleRequestToJoin}>Request Again</button>
            </div>
          ) : (
            <button className="bp-request-btn join" onClick={handleRequestToJoin}>Request to Join</button>
          )}
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════
     TAB 2 — PUBLIC BROADCASTS
  ══════════════════════════════════════ */
  const renderPublicTab = () => {
    const others = publicBroadcasts.filter(b => b.hostUid !== myUid);

    return (
      <div>
        {/* My active broadcast banner */}
        {myActiveBroadcast && (
          <div className="bp-my-broadcast-banner">
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RadioWaveIcon />
            </div>
            <div className="bp-my-broadcast-info">
              <h4>You are live — {myActiveBroadcast.title}</h4>
              <p>Others can join and listen to you</p>
            </div>
            <button className="bp-stop-broadcast-btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 11 }} onClick={handleStopPublicBroadcast}>Stop</button>
          </div>
        )}

        {/* Create broadcast */}
        {!isGuest && !myActiveBroadcast && (
          <div className="bp-create-section">
            <div className="bp-create-card">
              <h3><BroadcastIcon size={16} /> Start Your Broadcast</h3>
              <div className="bp-create-form">
                <input
                  className="bp-input"
                  placeholder="Broadcast title (required)..."
                  value={pubTitle}
                  onChange={e => setPubTitle(e.target.value)}
                />
                {/* Password toggle */}
                <label className="bp-checkbox-label" style={{ userSelect: 'none', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={pubIsProtected}
                    onChange={e => setPubIsProtected(e.target.checked)}
                  />
                  <LockGoldIcon size={15} />
                  <span style={{ marginLeft: 4 }}>Password protect this broadcast</span>
                </label>
                {pubIsProtected && (
                  <input
                    className="bp-input"
                    placeholder="Set a password for listeners..."
                    value={pubPassword}
                    onChange={e => setPubPassword(e.target.value)}
                    type="text"
                    autoComplete="off"
                  />
                )}
                <button
                  className="bp-create-btn"
                  onClick={handleCreatePublicBroadcast}
                  disabled={!pubTitle.trim() || (pubIsProtected && !pubPassword.trim())}
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                    <path d="M8.5 8.5a5 5 0 000 7" stroke="white" strokeWidth="1.7" strokeLinecap="round"/>
                    <path d="M15.5 8.5a5 5 0 010 7" stroke="white" strokeWidth="1.7" strokeLinecap="round"/>
                    <path d="M5 5a9 9 0 000 14" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round"/>
                    <path d="M19 5a9 9 0 010 14" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Go Live Now
                </button>
                {!pubTitle.trim() && (
                  <p style={{ fontSize: 11, color: 'var(--bp-text-muted)', margin: 0, textAlign: 'center' }}>
                    Enter a title to enable the button
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isGuest && (
          <div className="bp-guest-lock" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <h3>Register to Broadcast</h3>
            <p>Create a free account to start your own live broadcasts.</p>
          </div>
        )}

        {/* List of public broadcasts */}
        {others.length > 0 ? (
          <>
            <div className="bp-broadcasts-list-label">Live Broadcasts ({others.length})</div>
            <div className="bp-broadcast-items">
              {others.map(bc => (
                <div key={bc.id} className="bp-broadcast-item">
                  <div className="bp-bc-avatar-wrap">
                    <img
                      className="bp-bc-avatar"
                      src={bc.hostAvatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${bc.hostUid}`}
                      alt={bc.hostName}
                      onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${bc.hostUid}`; }}
                    />
                    <span className="bp-bc-live-dot" />
                  </div>
                  <div className="bp-bc-info">
                    <div className="bp-bc-title">{bc.title}</div>
                    <div className="bp-bc-host">{bc.hostName}</div>
                    <div className="bp-bc-meta">
                      <span className="bp-bc-chip"><UsersIcon /> {bc.listenerCount || 0}</span>
                      {bc.isPasswordProtected && <span className="bp-bc-chip bp-bc-locked"><LockIcon /> Private</span>}
                    </div>
                  </div>
                  <div className="bp-bc-actions">
                    <button
                      className={`bp-bc-join-btn${listeningTo?.id === bc.id ? ' listening' : ''}`}
                      onClick={() => handleJoinPublicBroadcast(bc)}
                    >
                      {listeningTo?.id === bc.id ? 'Listening' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : !myActiveBroadcast ? (
          <div className="bp-empty">
            <div><BroadcastIcon size={36} /></div>
            No public broadcasts live right now.
            <br />Be the first to go live!
          </div>
        ) : null}

        {/* Password prompt modal */}
        {passwordPrompt && (
          <div className="bp-password-modal">
            <div className="bp-password-box">
              <h3 style={{ display:'flex', alignItems:'center', gap:8 }}><LockGoldIcon size={20} /> {passwordPrompt.title}</h3>
              <input
                className="bp-input"
                type="password"
                placeholder="Enter password..."
                value={pwInput}
                onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                autoFocus
              />
              <div className="bp-password-actions">
                <button className="bp-pw-btn cancel-pw" onClick={() => { setPasswordPrompt(null); setPwInput(''); }}>Cancel</button>
                <button className="bp-pw-btn confirm" onClick={handlePasswordSubmit}>Join</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ══════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════ */
  return (
    <div className="bp-overlay" onClick={onClose}>
      <div className="bp-panel" onClick={e => e.stopPropagation()}>

        {/* Hidden YouTube container */}
        <div className="bp-yt-hidden-player">
          <div ref={ytContainerRef} id="bp-yt-player" />
        </div>

        {/* Header */}
        <div className="bp-header">
          <div className="bp-header-left">
            <div className="bp-header-icon"><BroadcastIcon size={20} /></div>
            <div>
              <div className="bp-header-title">Broadcast Studio</div>
              <div className="bp-header-subtitle">{rjIsLive ? '🔴 RJ Live' : 'Premium Broadcast'}</div>
            </div>
          </div>
          <button className="bp-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="bp-tabs">
          <button
            className={`bp-tab${activeTab === 0 ? ' active' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            <BroadcastIcon size={13} />
            {canManageRJ ? 'RJ Controls' : 'RJ Live'}
            {rjIsLive && <span className="bp-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginLeft: 2 }} />}
          </button>
          <button
            className={`bp-tab${activeTab === 1 ? ' active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            <UsersIcon />
            Join Stage
            {renderTabBadge(1)}
          </button>
          <button
            className={`bp-tab${activeTab === 2 ? ' active' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            <RadioWaveIcon />
            Public
            {myActiveBroadcast && <span className="bp-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', marginLeft: 2 }} />}
          </button>
        </div>

        {/* Content */}
        <div className="bp-content">
          {activeTab === 0 && renderRJTab()}
          {activeTab === 1 && renderJoinTab()}
          {activeTab === 2 && renderPublicTab()}
        </div>
      </div>
    </div>
  );
};

export default BroadcastPanel;
