import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, rtdb, auth } from '../firebase/config';
import { translateText as _ttBP, getTranslationSettings as _tsBP, getLanguageName as _glnBP } from '../utils/translationService';
import {
  ref, set, get, update, remove, onValue, onChildAdded, push, off, onDisconnect, increment, serverTimestamp
} from 'firebase/database';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import RJFollowButton from './RJFollowSystem';
import GiftPanel from './coins/GiftPanel';
import './BroadcastPanel.css';

/* ── STUN + TURN config — multiple servers for maximum connectivity ── */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  /* Free public TURN servers (Metered open relay) — work behind strict NAT/firewalls */
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:80?transport=tcp',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

/* ── Password hashing (SHA-256 via Web Crypto) ── */
const hashPassword = async (pw) => {
  const encoded = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

/* ══════════════════════════════════════════════════════
   PREMIUM TOAST SYSTEM
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

/* ── Colorful Minimize Icon ── */
const MinimizeSVGIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="minG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fbbf24"/>
        <stop offset="50%" stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#f472b6"/>
      </linearGradient>
    </defs>
    <rect x="4" y="11" width="16" height="2.5" rx="1.25" fill="url(#minG)"/>
    <path d="M8 16l4 4 4-4" stroke="url(#minG)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

/* ── Colorful Close Icon ── */
const CloseSVGIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="clsG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f87171"/>
        <stop offset="100%" stopColor="#dc2626"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#clsG)" opacity=".15"/>
    <circle cx="12" cy="12" r="10" stroke="url(#clsG)" strokeWidth="1.5" fill="none"/>
    <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* ── Floating Podcast / RJ Icon ── */
const FloatingPodcastIcon = () => (
  <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="fpG1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95"/>
        <stop offset="100%" stopColor="#ede9fe" stopOpacity="0.85"/>
      </linearGradient>
      <linearGradient id="fpG2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fbbf24"/>
        <stop offset="100%" stopColor="#f472b6"/>
      </linearGradient>
    </defs>
    {/* Mic body */}
    <rect x="18" y="6" width="12" height="20" rx="6" fill="url(#fpG1)"/>
    {/* Mic stand */}
    <path d="M24 32v8" stroke="url(#fpG1)" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M18 40h12" stroke="url(#fpG1)" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Sound waves */}
    <path d="M11 18a13 13 0 000 12" stroke="url(#fpG2)" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M37 18a13 13 0 010 12" stroke="url(#fpG2)" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M15 21a8 8 0 000 6" stroke="url(#fpG1)" strokeWidth="2" strokeLinecap="round" opacity=".7"/>
    <path d="M33 21a8 8 0 010 6" stroke="url(#fpG1)" strokeWidth="2" strokeLinecap="round" opacity=".7"/>
  </svg>
);

/* ── Floating Minimized Bubble (draggable) ── */
const FloatingMinimizedBubble = ({ onExpand, onClose, isLive, pubIsLive }) => {
  const posRef = useRef({ x: window.innerWidth - 96, y: window.innerHeight - 128 });
  const [pos, setPos] = useState(() => ({ x: window.innerWidth - 96, y: window.innerHeight - 128 }));
  const isDraggingRef = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, elX: 0, elY: 0 });

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true;
      const newX = Math.max(8, Math.min(window.innerWidth - 76, dragStart.current.elX + dx));
      const newY = Math.max(8, Math.min(window.innerHeight - 76, dragStart.current.elY + dy));
      posRef.current = { x: newX, y: newY };
      setPos({ x: newX, y: newY });
    };
    const onMouseUp = () => { isDraggingRef.current = false; };
    const onTouchMove = (e) => {
      if (!isDraggingRef.current) return;
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.mx;
      const dy = t.clientY - dragStart.current.my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true;
      const newX = Math.max(8, Math.min(window.innerWidth - 76, dragStart.current.elX + dx));
      const newY = Math.max(8, Math.min(window.innerHeight - 76, dragStart.current.elY + dy));
      posRef.current = { x: newX, y: newY };
      setPos({ x: newX, y: newY });
    };
    const onTouchEnd = () => { isDraggingRef.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  const onMouseDown = (e) => {
    isDraggingRef.current = true;
    hasDragged.current = false;
    dragStart.current = { mx: e.clientX, my: e.clientY, elX: posRef.current.x, elY: posRef.current.y };
    e.preventDefault();
  };
  const onTouchStart = (e) => {
    const t = e.touches[0];
    isDraggingRef.current = true;
    hasDragged.current = false;
    dragStart.current = { mx: t.clientX, my: t.clientY, elX: posRef.current.x, elY: posRef.current.y };
  };
  const handleClick = () => { if (!hasDragged.current) onExpand(); };

  return (
    <div
      className="bp-floating-bubble"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={handleClick}
    >
      <div className="bp-floating-inner">
        <FloatingPodcastIcon />
        {(isLive || pubIsLive) && <div className="bp-floating-live-dot" />}
        {/* X close — inside the circle, top-right corner */}
        <div
          className="bp-floating-close"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          title="Close"
          role="button"
          tabIndex={0}
        >
          <svg width="8" height="8" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div className="bp-floating-label">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 3, flexShrink: 0 }}>
          <rect x="9" y="2" width="6" height="11" rx="3" fill="#fbbf24"/>
          <path d="M19 10a7 7 0 01-14 0" stroke="#f472b6" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          <line x1="12" y1="17" x2="12" y2="20" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="9" y1="20" x2="15" y2="20" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span>{isLive ? 'RJ Live' : pubIsLive ? 'On Air' : 'Studio'}</span>
        {(isLive || pubIsLive) && (
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: isLive ? '#ef4444' : '#22c55e', marginLeft: 4, verticalAlign: 'middle', animation: 'bp-pulse 1s infinite', flexShrink: 0 }} />
        )}
      </div>
    </div>
  );
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
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="url(#lgLock1)" strokeWidth="1.8" strokeLinecap="round" fill="none" filter="url(#lgGlow)"/>
    <rect x="5" y="10" width="14" height="11" rx="2.5" fill="url(#lgLock1)" opacity="0.95"/>
    <circle cx="12" cy="15.5" r="1.6" fill="url(#lgLock2)"/>
    <rect x="11.25" y="15.5" width="1.5" height="2.5" rx="0.6" fill="url(#lgLock2)"/>
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
  if (!url) return null;
  const str = url.trim();
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,                                  // watch?v=ID  (standard, music., m., nocookie.)
    /youtu\.be\/([A-Za-z0-9_-]{11})/,                             // youtu.be/ID (short link)
    /\/(?:embed|v|shorts|live|e)\/([A-Za-z0-9_-]{11})/,           // /embed/ /v/ /shorts/ /live/ /e/
    /[?&]vi=([A-Za-z0-9_-]{11})/,                                 // vi= param variant
    /youtube\.com\/attribution_link.*v%3D([A-Za-z0-9_-]{11})/,    // attribution_link format
    /^([A-Za-z0-9_-]{11})$/,                                       // bare 11-char ID pasted directly
  ];
  for (const p of patterns) {
    const m = str.match(p);
    if (m) return m[1];
  }
  /* Last resort: search for any 11-char alphanumeric sequence after known markers */
  const fallback = str.match(/(?:v=|vi=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if (fallback) return fallback[1];
  return null;
};

/* ── Premium Animated Music SVG ── */
const MusicVisual = ({ isPlaying }) => (
  <div className={`bp-music-visual${isPlaying ? '' : ' paused'}`}>
    {[...Array(9)].map((_, i) => <div key={i} className="bp-bar" />)}
  </div>
);

/* ── Broadcast SVG icon — white variant for header, gradient for rest ── */
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

/* ── Mic icon ── */
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

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="plG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
    <path d="M8 5v14l11-7z" fill="url(#plG)"/>
  </svg>
);

const PauseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="paG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="url(#paG)"/>
  </svg>
);

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

const SkipNextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="snG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
    <path d="M6 18l8.5-6L6 6v12zm8.5-6v6H17V6h-2.5v6z" fill="url(#snG)"/>
  </svg>
);

const SkipPrevIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="spG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
    <path d="M18 6v12l-8.5-6L18 6zM9.5 12V6H7v12h2.5V12z" fill="url(#spG)"/>
  </svg>
);

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="lkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="url(#lkG)"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="usG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#0891b2"/></linearGradient></defs>
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="url(#usG)"/>
  </svg>
);

const MusicNoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="mnG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="url(#mnG)"/>
  </svg>
);

const YoutubeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="ytG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#dc2626"/></linearGradient></defs>
    <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.6-.8-2-.9C16.2 5 12 5 12 5s-4.2 0-7 .1c-.4.1-1.2.1-2 .9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.9C6.8 19 12 19 12 19s4.2 0 7-.2c.4-.1 1.2-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM10 15V9l5.5 3L10 15z" fill="url(#ytG)"/>
  </svg>
);

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

const InviteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="ivG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#0891b2"/></linearGradient></defs>
    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="url(#ivG)"/>
  </svg>
);

const RequestsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="rqG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#6d28d9"/></linearGradient></defs>
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="url(#rqG)"/>
  </svg>
);

const AntennaIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id="anG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient></defs>
    <path d="M12 5a2 2 0 100 4 2 2 0 000-4zm0-3C6.48 2 2 6.48 2 12c0 3.54 1.85 6.65 4.63 8.43l1.07-1.85A8 8 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8a7.97 7.97 0 01-3.7 6.58l1.07 1.85C19.15 18.65 21 15.54 21 12c0-5.52-4.48-10-9-10zm0 9l-3 9h2l.5-1.5h1l.5 1.5h2l-3-9zm0 3.5l.5 1.5h-1l.5-1.5z" fill="url(#anG)"/>
  </svg>
);

/* ════════════════════════════════════════════
   MAIN BROADCAST PANEL
════════════════════════════════════════════ */
const BroadcastPanel = ({ isOpen, onClose, loggedInUserProfile, allUsersProfiles = [], roomId, onLiveStatus }) => {
  const [activeTab, setActiveTab] = useState(0);

  /* ── RJ Broadcast state ── */
  const [rjBroadcast, setRjBroadcast] = useState(null);
  const [rjIsLive, setRjIsLive] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [ytPlayerState, setYtPlayerState] = useState('stopped');
  const [ytCurrentSongName, setYtCurrentSongName] = useState('');
  const [micMuted, setMicMuted] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [speakerMap, setSpeakerMap] = useState({});
  const [broadcastDuration, setBroadcastDuration] = useState(0);
  const durationRef = useRef(null);

  /* ── Join Requests state ── */
  const [joinRequests, setJoinRequests] = useState([]);
  const [myRequestStatus, setMyRequestStatus] = useState(null);
  const [iAmSpeaker, setIAmSpeaker] = useState(false);

  /* ── Speaker mode state (for the user who is accepted as a speaker) ── */
  const [speakerMicMuted, setSpeakerMicMuted] = useState(false);
  const [speakerConnecting, setSpeakerConnecting] = useState(false);

  /* ── Public Broadcasts state ── */
  const [publicBroadcasts, setPublicBroadcasts] = useState([]);
  const [myActiveBroadcast, setMyActiveBroadcast] = useState(null);
  const [pubTitle, setPubTitle] = useState('');
  const [pubPassword, setPubPassword] = useState('');
  const [pubIsProtected, setPubIsProtected] = useState(false);
  const [listeningTo, setListeningTo] = useState(null);
  const [passwordPrompt, setPasswordPrompt] = useState(null);
  const [pwInput, setPwInput] = useState('');

  /* ── RJ listener state ── */
  const [rjIsListening, setRjIsListening] = useState(false);
  const [rjConnecting, setRjConnecting] = useState(false);
  const [rjAudioBlocked, setRjAudioBlocked] = useState(false);
  const [pubAudioBlocked, setPubAudioBlocked] = useState(false);

  /* ── Go Live state ── */
  const [goingLive, setGoingLive] = useState(false);

  /* ── Public joining state ── */
  const [pubJoining, setPubJoining] = useState(false);

  /* ── Mic level meter (0-100) for RJ broadcaster ── */
  const [micLevel, setMicLevel] = useState(0);
  const micLevelCtxRef = useRef(null);
  const micLevelTimerRef = useRef(null);

  /* ── Connection quality state for listeners ── */
  const [rjConnState, setRjConnState] = useState('idle');   /* idle | connecting | connected | failed */
  const [pubConnState, setPubConnState] = useState('idle'); /* idle | connecting | connected | failed */

  /* ── Minimize / floating bubble state ── */
  const [isMinimized, setIsMinimized] = useState(false);

  /* ── Song Request Queue state ── */
  const [songQueue, setSongQueue] = useState([]);
  const [songForm, setSongForm] = useState({ songName: '', artist: '', message: '' });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [myQueueEntry, setMyQueueEntry] = useState(null);

  /* ── Announcements state ── */
  const [announcements, setAnnouncements] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  /* ── Public broadcaster mic level (0-100) ── */
  const [pubMicLevel, setPubMicLevel] = useState(0);
  const [pubMicMuted, setPubMicMuted] = useState(false);

  /* ── WebRTC refs — RJ broadcaster side ── */
  const rjHostPCs = useRef({});
  const localStream = useRef(null);
  const rjListenersUnsub = useRef(null);
  const rjHostRtdbUnsubs = useRef([]);

  /* ── Audio mixing — RJ side (mixes RJ mic + speaker mics → one stream sent to listeners) ── */
  const rjAudioCtx = useRef(null);
  const rjMixDest = useRef(null);

  /* ── WebRTC refs — RJ → Speaker connections (RJ receives each speaker's mic) ── */
  const rjSpeakerPCs = useRef({});
  /* Per-speaker unsub map: { [speakerUid]: [unsubFn, ...] }
     Keeps RTDB listeners isolated so removing one speaker doesn't leak others. */
  const rjSpeakerUnsubs = useRef({});

  /* ── WebRTC refs — Speaker side (speaker sends their mic to RJ) ── */
  const speakerPC = useRef(null);
  const speakerStream = useRef(null);
  const speakerRtdbUnsubs = useRef([]);

  /* ── WebRTC refs — RJ listener side (separate from broadcaster) ── */
  const rjListenerPC = useRef(null);
  const rjAudioEl = useRef(null);
  const rjListenerRtdbUnsubs = useRef([]);

  /* ── WebRTC refs — Public broadcaster ── */
  const pubHostStream = useRef(null);
  const pubHostPCs = useRef({});
  const pubListenersUnsub = useRef(null);
  const pubHostRtdbUnsubs = useRef([]);

  /* ── WebRTC refs — Public listener ── */
  const pubListenerPC = useRef(null);
  const pubAudioEl = useRef(null);
  const pubListenerRtdbUnsubs = useRef([]);

  /* ── Public broadcaster mic level refs ── */
  const pubMicLevelCtxRef = useRef(null);
  const pubMicLevelTimerRef = useRef(null);

  /* ── YouTube player refs ── */
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const ytInitialized = useRef(false);
  /* Tracks the RJ's intended playback state so we can auto-resume after browser throttling */
  const ytIntendedStateRef = useRef('stopped');
  /* Mirrors rjIsLive state — readable in timers/intervals without stale closures */
  const rjIsLiveRef = useRef(false);

  /* ── onDisconnect refs (keep handle to cancel if needed) ── */
  const rjOnDisconnectRef = useRef(null);
  const pubOnDisconnectRef = useRef(null);

  /* ── Auto-resume guard: only attempt once per mount ── */
  const autoResumeAttempted = useRef(false);

  /* ── Permission flags ── */
  const isRJ = loggedInUserProfile?.badge?.toLowerCase() === 'rj';
  const canManageRJ = isRJ;
  const isGuest = loggedInUserProfile?.isGuest === true || loggedInUserProfile?.role === 'guest';
  const myUid = loggedInUserProfile?.uid || auth.currentUser?.uid;
  const myName = loggedInUserProfile?.username || loggedInUserProfile?.displayName || 'User';
  const myPhoto = loggedInUserProfile?.photoURL || '';

  /* ══════════════════════════════════════
     YOUTUBE PLAYER HELPERS
     (declared before Firebase effects so they can be safely listed in dep arrays)
  ══════════════════════════════════════ */

  const ensureYtApiLoaded = useCallback(() => {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) { resolve(); return; }
      const existing = document.getElementById('yt-iframe-api-script');
      if (!existing) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const checkReady = setInterval(() => {
        if (window.YT && window.YT.Player) { clearInterval(checkReady); resolve(); }
      }, 100);
    });
  }, []);

  const initYtPlayer = useCallback(async (videoId, startSeconds = 0) => {
    if (!videoId) return;
    await ensureYtApiLoaded();
    if (ytPlayerRef.current && ytPlayerRef.current.loadVideoById) {
      ytPlayerRef.current.loadVideoById({ videoId, startSeconds });
      return;
    }
    if (!ytContainerRef.current) return;
    ytInitialized.current = true;
    ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
      height: '1',
      width: '1',
      videoId,
      playerVars: { autoplay: 1, controls: 0, start: Math.floor(startSeconds) },
      events: {
        onReady: (e) => {
          e.target.setVolume(80);
          if (startSeconds > 0) e.target.seekTo(startSeconds, true);
        },
        onStateChange: (e) => {
          /* YT.PlayerState.PAUSED = 2 — if browser throttled us while we intended to play, auto-resume */
          const YT_PAUSED = 2;
          if (e.data === YT_PAUSED && ytIntendedStateRef.current === 'playing') {
            setTimeout(() => {
              try { e.target.playVideo(); } catch {}
            }, 300);
          }
        }
      }
    });
  }, [ensureYtApiLoaded]);

  const syncYouTubePlayer = useCallback((ytData) => {
    if (!ytData) return;
    const { state, videoId, seekTo, updatedAt } = ytData;

    /* Calculate time drift since RJ wrote the update */
    const driftSecs = updatedAt ? Math.max(0, (Date.now() - updatedAt) / 1000) : 0;
    const adjustedSeek = state === 'playing' ? (seekTo || 0) + driftSecs : (seekTo || 0);

    if (!ytPlayerRef.current || !ytPlayerRef.current.loadVideoById) {
      /* Player not ready yet — init it with the video */
      if (videoId) initYtPlayer(videoId, adjustedSeek);
      return;
    }

    const player = ytPlayerRef.current;

    if (videoId) {
      const curUrl = player.getVideoUrl?.() || '';
      if (!curUrl.includes(videoId)) {
        player.loadVideoById({ videoId, startSeconds: Math.floor(adjustedSeek) });
        return;
      }
    }

    if (state === 'playing') {
      player.seekTo?.(adjustedSeek, true);
      player.playVideo?.();
    } else if (state === 'paused') {
      player.seekTo?.(seekTo || 0, true);
      player.pauseVideo?.();
    } else if (state === 'stopped') {
      player.stopVideo?.();
    }
  }, [initYtPlayer]);

  /* ══════════════════════════════════════
     FIREBASE LISTENERS
  ══════════════════════════════════════ */

  /* ── RJ Broadcast RTDB listener — always-on (no isOpen guard) ──
     Must be always connected so rjIsLive / rjIsLiveRef stay accurate even
     when the broadcast panel is closed or minimized.                        */
  useEffect(() => {
    const bcRef = ref(rtdb, 'broadcasts/rj');
    const unsub = onValue(bcRef, (snap) => {
      const data = snap.val();
      setRjBroadcast(data);
      const live = !!(data && data.isLive);
      setRjIsLive(live);
      rjIsLiveRef.current = live;
      if (data) {
        setListenerCount(data.listenerCount || 0);
        setSpeakerMap(data.speakers || {});
        const ytState = data.youtube?.state || 'stopped';
        setYtPlayerState(ytState);
        setYtCurrentSongName(data.youtube?.songName || '');
        if (myUid && data.speakers && data.speakers[myUid]) {
          setIAmSpeaker(true);
        } else {
          setIAmSpeaker(false);
        }
        /* Auto-sync YouTube for listeners: if the RJ becomes live and already has a video, init player */
        if (live && data.youtube?.videoId && !canManageRJ) {
          syncYouTubePlayer(data.youtube);
        }
      } else {
        /* RJ went offline — clean up listener side silently */
        if (rjIsListening) {
          _rjCleanupListenerSide(false);
          setRjIsListening(false);
        }
        setListenerCount(0);
        setSpeakerMap({});
        setIAmSpeaker(false);
        setYtPlayerState('stopped');
        setYtCurrentSongName('');
      }
    });
    return () => unsub();
  }, [myUid, canManageRJ]);

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

  /* ── YouTube player sync for listeners (always-on — keeps music playing even when panel is closed) ── */
  useEffect(() => {
    if (canManageRJ) return; // only listeners need this; broadcaster controls directly
    const ytRef = ref(rtdb, 'broadcasts/rj/youtube');
    const unsub = onValue(ytRef, (snap) => {
      const yt = snap.val();
      if (!yt) return;
      /* Track listener's intended state so visibilitychange can resume correctly */
      ytIntendedStateRef.current = yt.state || 'stopped';
      syncYouTubePlayer(yt);
    });
    return () => unsub();
  }, [canManageRJ, syncYouTubePlayer]);

  /* ── visibilitychange for YouTube + voice: handled by the unified effect below ── */

  /* ── Broadcaster: periodic seek position push every 10 s so listeners stay in sync ── */
  useEffect(() => {
    if (!canManageRJ || !rjIsLive) return;
    const interval = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player || ytIntendedStateRef.current !== 'playing') return;
      try {
        const cur = player.getCurrentTime?.();
        if (cur == null) return;
        update(ref(rtdb, 'broadcasts/rj/youtube'), {
          state: 'playing',
          seekTo: cur,
          updatedAt: Date.now(),
        }).catch(() => {});
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [canManageRJ, rjIsLive]);

  /* ── YouTube playback watchdog — always-on, uses ref so no stale-closure ──
     Runs every 3 s. Covers: minimize, tab-switch, mobile background, iframe suspension.
     Applies to both RJ (broadcaster) and listeners.                                    */
  useEffect(() => {
    const interval = setInterval(() => {
      if (!rjIsLiveRef.current) return;
      if (ytIntendedStateRef.current !== 'playing') return;
      const player = ytPlayerRef.current;
      if (!player) return;
      try {
        const YT_PLAYING = 1;
        const state = player.getPlayerState?.();
        if (state !== YT_PLAYING) {
          player.playVideo?.();
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ── MediaSession API — tells OS / browser this is active audio media ──
     Prevents mobile browsers from killing background audio.
     Updated whenever RJ voice or YouTube is playing.                      */
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const isLive = rjIsLiveRef.current || rjIsLive;
    if (isLive) {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: ytCurrentSongName || 'TingleTap Live Radio',
          artist: 'TingleTap Broadcast',
          album: 'Live Show',
        });
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.setActionHandler('play', () => {
          ytPlayerRef.current?.playVideo?.();
          rjAudioEl.current?.play?.().catch(() => {});
        });
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
      } catch {}
    } else {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch {}
    }
  }, [rjIsLive, ytCurrentSongName]);

  /* ── Visibility change: aggressive resume for BOTH YouTube and voice audio ──
     Fires when: tab becomes visible again, user switches back from another app. */
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      if (!rjIsLiveRef.current) return;

      /* Resume YouTube */
      const player = ytPlayerRef.current;
      if (player && ytIntendedStateRef.current === 'playing') {
        try {
          player.playVideo?.();
        } catch {}
      }

      /* Resume RJ voice audio element */
      const audio = rjAudioEl.current;
      if (audio && !canManageRJ && rjIsListening) {
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      }

      /* Broadcaster: push fresh seek so listeners resync too */
      if (canManageRJ && player && ytIntendedStateRef.current === 'playing') {
        try {
          const cur = player.getCurrentTime?.() || 0;
          player.seekTo?.(cur, true);
          update(ref(rtdb, 'broadcasts/rj/youtube'), {
            state: 'playing',
            seekTo: cur,
            updatedAt: Date.now(),
          }).catch(() => {});
        } catch {}
      }

      /* Listener: re-fetch RTDB state to resync YouTube */
      if (!canManageRJ) {
        try {
          const snap = await get(ref(rtdb, 'broadcasts/rj/youtube'));
          const yt = snap.val();
          if (yt) {
            ytIntendedStateRef.current = yt.state || 'stopped';
            syncYouTubePlayer(yt);
          }
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [canManageRJ, syncYouTubePlayer]);

  /* ── Public broadcasts Firestore listener (always-on for badge count) ── */
  useEffect(() => {
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
  }, [myUid]);

  /* ── Notify parent of live count for header badge ── */
  useEffect(() => {
    if (!onLiveStatus) return;
    const othersCount = publicBroadcasts.filter(b => b.hostUid !== myUid).length;
    const total = (rjIsLive ? 1 : 0) + othersCount;
    onLiveStatus(total);
  }, [rjIsLive, publicBroadcasts, myUid, onLiveStatus]);

  /* ── RJ side: watch speakerMap and open a receive-connection for each new speaker ── */
  useEffect(() => {
    if (!canManageRJ || !rjIsLive) return;
    const speakerUids = Object.keys(speakerMap);

    /* Connect to newly added speakers */
    speakerUids.forEach(uid => {
      if (uid !== myUid && !rjSpeakerPCs.current[uid]) {
        rjConnectToSpeaker(uid).catch(() => {});
      }
    });

    /* Disconnect speakers who left — clean up their RTDB listeners precisely */
    Object.keys(rjSpeakerPCs.current).forEach(uid => {
      if (!speakerMap[uid]) {
        _rjDisconnectSpeaker(uid, true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakerMap, canManageRJ, rjIsLive]);

  /* ── Speaker side: when iAmSpeaker becomes true, grab mic and connect to RJ ── */
  useEffect(() => {
    if (!myUid || canManageRJ) return;

    if (!iAmSpeaker) {
      /* Cleanup when removed from stage */
      if (speakerPC.current) { try { speakerPC.current.close(); } catch {} speakerPC.current = null; }
      if (speakerStream.current) { speakerStream.current.getTracks().forEach(t => t.stop()); speakerStream.current = null; }
      speakerRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
      speakerRtdbUnsubs.current = [];
      setSpeakerConnecting(false);
      setSpeakerMicMuted(false);
      return;
    }

    /* iAmSpeaker = true — start mic and signal to RJ */
    let cancelled = false;
    const startSpeakerMode = async () => {
      setSpeakerConnecting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
          video: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        speakerStream.current = stream;
        setSpeakerMicMuted(false);

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        speakerPC.current = pc;

        /* Add mic tracks so RJ can receive our audio */
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        /* Send our ICE candidates to RJ */
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            push(ref(rtdb, `broadcasts/rj/speakerConnections/${myUid}/speakerCandidates`), e.candidate.toJSON()).catch(() => {});
          }
        };

        pc.onconnectionstatechange = () => {
          const s = pc.connectionState;
          if (s === 'connected') setSpeakerConnecting(false);
        };

        /* Watch for RJ's offer (RJ initiates because they receive) */
        let remoteDescReady = false;
        const pendingCands = [];
        const drainPending = async () => {
          for (const c of pendingCands) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
          }
          pendingCands.length = 0;
        };

        const offerRef = ref(rtdb, `broadcasts/rj/speakerConnections/${myUid}/offer`);
        const unsubOffer = onValue(offerRef, async snap => {
          const offer = snap.val();
          if (!offer || pc.signalingState === 'closed' || pc.remoteDescription) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            remoteDescReady = true;
            await drainPending();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await set(ref(rtdb, `broadcasts/rj/speakerConnections/${myUid}/answer`), { type: answer.type, sdp: answer.sdp });
            setSpeakerConnecting(false);
            bpToast.mic('You are now live on stage! Everyone can hear you.');
          } catch (err) {
            console.warn('Speaker answer error:', err);
          }
        });
        speakerRtdbUnsubs.current.push(unsubOffer);

        /* Watch for RJ's ICE candidates */
        const unsubHC = onChildAdded(ref(rtdb, `broadcasts/rj/speakerConnections/${myUid}/rjCandidates`), snap => {
          const c = snap.val();
          if (!c) return;
          if (remoteDescReady) {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          } else {
            pendingCands.push(c);
          }
        });
        speakerRtdbUnsubs.current.push(unsubHC);

      } catch (err) {
        if (!cancelled) {
          setSpeakerConnecting(false);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            bpToast.error('Microphone blocked. Allow mic access to speak on stage.');
          } else if (err.name === 'NotFoundError') {
            bpToast.error('No microphone found. Please connect a mic.');
          } else {
            bpToast.error('Could not access mic for speaking: ' + (err.message || 'Unknown error'));
          }
        }
      }
    };

    startSpeakerMode();

    return () => {
      cancelled = true;
      if (speakerPC.current) { try { speakerPC.current.close(); } catch {} speakerPC.current = null; }
      if (speakerStream.current) { speakerStream.current.getTracks().forEach(t => t.stop()); speakerStream.current = null; }
      speakerRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
      speakerRtdbUnsubs.current = [];
      /* Remove our signal data from RTDB */
      remove(ref(rtdb, `broadcasts/rj/speakerConnections/${myUid}`)).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iAmSpeaker, myUid, canManageRJ]);

  /* ── Song Queue RTDB listener ── */
  useEffect(() => {
    if (!isOpen) return;
    const qRef = ref(rtdb, 'broadcasts/rj/songQueue');
    const unsub = onValue(qRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([uid, v]) => ({ uid, ...v }))
        .sort((a, b) => (a.requestedAt || 0) - (b.requestedAt || 0));
      setSongQueue(list);
      if (myUid) {
        setMyQueueEntry(data[myUid] || null);
      }
    });
    return () => unsub();
  }, [isOpen, myUid]);

  /* ── Announcements RTDB listener ── */
  useEffect(() => {
    if (!isOpen) return;
    const aRef = ref(rtdb, 'broadcasts/rj/announcements');
    const unsub = onValue(aRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0));
      setAnnouncements(list);
    });
    return () => unsub();
  }, [isOpen]);

  /* ── Watch public broadcast session I'm listening to — detect host disconnect ── */
  useEffect(() => {
    if (!listeningTo?.id) return;
    const sessionRef = ref(rtdb, `broadcasts/public/${listeningTo.id}/session`);
    const unsub = onValue(sessionRef, (snap) => {
      if (!snap.exists()) {
        /* Host disconnected — clean up listener side */
        _pubCleanupListenerSide();
        setListeningTo(null);
        bpToast.info('The broadcaster has ended the session.');
      }
    });
    return () => unsub();
  }, [listeningTo?.id]);

  /* ══════════════════════════════════════
     RJ BROADCAST — BROADCASTER SIDE
  ══════════════════════════════════════ */

  /** Create & send a WebRTC offer to one listener (broadcaster side). */
  const rjCreateOfferForListener = async (listenerUid) => {
    const existing = rjHostPCs.current[listenerUid];
    if (existing) {
      if (existing.connectionState !== 'failed' && existing.signalingState !== 'closed') return;
      try { existing.close(); } catch {}
      delete rjHostPCs.current[listenerUid];
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    rjHostPCs.current[listenerUid] = pc;

    /* Add mixed stream tracks (RJ mic + any accepted speakers) to this connection.
       Fall back to raw localStream if AudioContext mixer wasn't initialised.      */
    const mixedStream = rjMixDest.current?.stream || localStream.current;
    if (mixedStream) {
      mixedStream.getTracks().forEach(t => pc.addTrack(t, mixedStream));
    }

    /* Send ICE candidates to listener */
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        push(ref(rtdb, `broadcasts/rj/connections/${listenerUid}/hostCandidates`), e.candidate.toJSON()).catch(() => {});
      }
    };

    /* Handle connection state changes */
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        /* Auto-retry after brief delay */
        setTimeout(() => {
          if (rjHostPCs.current[listenerUid] === pc) {
            try { pc.close(); } catch {}
            delete rjHostPCs.current[listenerUid];
            rjCreateOfferForListener(listenerUid).catch(() => {});
          }
        }, 2000);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await set(ref(rtdb, `broadcasts/rj/connections/${listenerUid}/offer`), { type: offer.type, sdp: offer.sdp }).catch(() => {});

    const unsubAns = onValue(ref(rtdb, `broadcasts/rj/connections/${listenerUid}/answer`), snap => {
      const ans = snap.val();
      if (ans && pc.signalingState !== 'closed' && !pc.remoteDescription) {
        pc.setRemoteDescription(new RTCSessionDescription(ans)).catch(() => {});
      }
    });
    rjHostRtdbUnsubs.current.push(unsubAns);

    /* Use onChildAdded so each listener ICE candidate is processed exactly once */
    const unsubLC = onChildAdded(ref(rtdb, `broadcasts/rj/connections/${listenerUid}/listenerCandidates`), snap => {
      const c = snap.val();
      if (c) pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    });
    rjHostRtdbUnsubs.current.push(unsubLC);
  };

  /** Watch listeners node — create/remove connections as listeners join/leave. */
  const rjStartListenerWatcher = () => {
    let prevUIDs = new Set();
    const lisRef = ref(rtdb, 'broadcasts/rj/listeners');
    const unsub = onValue(lisRef, snap => {
      const listeners = snap.val() || {};
      const currentUIDs = new Set(Object.keys(listeners));

      currentUIDs.forEach(uid => {
        if (uid !== myUid && !prevUIDs.has(uid)) {
          rjCreateOfferForListener(uid).catch(() => {});
        }
      });

      prevUIDs.forEach(uid => {
        if (!currentUIDs.has(uid) && rjHostPCs.current[uid]) {
          try { rjHostPCs.current[uid].close(); } catch {}
          delete rjHostPCs.current[uid];
          remove(ref(rtdb, `broadcasts/rj/connections/${uid}`)).catch(() => {});
        }
      });

      prevUIDs = currentUIDs;

      /* Update listener count in RTDB */
      const count = currentUIDs.size;
      update(ref(rtdb, 'broadcasts/rj'), { listenerCount: count }).catch(() => {});
    });
    rjListenersUnsub.current = unsub;
  };

  /** Cleanup all broadcaster-side RJ WebRTC resources. */
  const rjStopAllBroadcasterConnections = () => {
    rjHostRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
    rjHostRtdbUnsubs.current = [];

    if (rjListenersUnsub.current) { try { rjListenersUnsub.current(); } catch {} rjListenersUnsub.current = null; }

    Object.values(rjHostPCs.current).forEach(pc => { try { pc.close(); } catch {} });
    rjHostPCs.current = {};

    /* Cleanup speaker-receive connections */
    Object.values(rjSpeakerUnsubs.current).forEach(unsubs => {
      unsubs.forEach(u => { try { u(); } catch {} });
    });
    rjSpeakerUnsubs.current = {};
    Object.values(rjSpeakerPCs.current).forEach(pc => { try { pc.close(); } catch {} });
    rjSpeakerPCs.current = {};

    /* Close audio mixer */
    if (rjAudioCtx.current) { try { rjAudioCtx.current.close(); } catch {} rjAudioCtx.current = null; }
    rjMixDest.current = null;

    remove(ref(rtdb, 'broadcasts/rj/connections')).catch(() => {});
    remove(ref(rtdb, 'broadcasts/rj/listeners')).catch(() => {});
    remove(ref(rtdb, 'broadcasts/rj/speakerConnections')).catch(() => {});
  };

  /** Tear down a single speaker's RJ-side connection and RTDB listeners. */
  const _rjDisconnectSpeaker = (speakerUid, removeRtdb = false) => {
    /* Unsubscribe this speaker's RTDB listeners only */
    (rjSpeakerUnsubs.current[speakerUid] || []).forEach(u => { try { u(); } catch {} });
    delete rjSpeakerUnsubs.current[speakerUid];

    const pc = rjSpeakerPCs.current[speakerUid];
    if (pc) { try { pc.close(); } catch {} }
    delete rjSpeakerPCs.current[speakerUid];

    if (removeRtdb) {
      remove(ref(rtdb, `broadcasts/rj/speakerConnections/${speakerUid}`)).catch(() => {});
    }
  };

  /** RJ creates a WebRTC connection to receive a speaker's microphone audio.
   *  The speaker's track is routed into the AudioContext mixer so all
   *  existing listeners automatically hear the speaker without renegotiation. */
  const rjConnectToSpeaker = async (speakerUid) => {
    if (!canManageRJ || !myUid || speakerUid === myUid) return;
    if (rjSpeakerPCs.current[speakerUid]) return; // already connecting/connected

    if (!rjSpeakerUnsubs.current[speakerUid]) {
      rjSpeakerUnsubs.current[speakerUid] = [];
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    rjSpeakerPCs.current[speakerUid] = pc;

    /* When speaker's audio track arrives, plug it into the mix */
    pc.ontrack = (e) => {
      try {
        if (!rjAudioCtx.current || !rjMixDest.current) return;
        const speakerSrc = rjAudioCtx.current.createMediaStreamSource(new MediaStream([e.track]));
        speakerSrc.connect(rjMixDest.current);
        bpToast.mic('Speaker joined the stage and is now live!');
      } catch (err) {
        console.warn('Speaker audio mixer connect failed:', err);
      }
    };

    /* Send RJ's ICE candidates to speaker */
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        push(ref(rtdb, `broadcasts/rj/speakerConnections/${speakerUid}/rjCandidates`), e.candidate.toJSON()).catch(() => {});
      }
    };

    /* Auto-reconnect when the connection drops — only if speaker is still in speakerMap */
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if ((s === 'failed' || s === 'disconnected') && rjSpeakerPCs.current[speakerUid] === pc) {
        setTimeout(() => {
          /* Only reconnect if the speaker is still accepted in the broadcast */
          if (rjSpeakerPCs.current[speakerUid] === pc && speakerMap[speakerUid]) {
            _rjDisconnectSpeaker(speakerUid, true);
            rjConnectToSpeaker(speakerUid).catch(() => {});
          }
        }, 2500);
      }
    };

    /* RJ creates offer specifying it wants to RECEIVE audio from the speaker */
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    /* Clear stale signaling data before writing new offer so speaker always sees fresh offer */
    await remove(ref(rtdb, `broadcasts/rj/speakerConnections/${speakerUid}`)).catch(() => {});
    await set(ref(rtdb, `broadcasts/rj/speakerConnections/${speakerUid}/offer`), { type: offer.type, sdp: offer.sdp }).catch(() => {});

    /* Watch for speaker's answer — stored per-speaker for isolated teardown */
    const unsubAns = onValue(ref(rtdb, `broadcasts/rj/speakerConnections/${speakerUid}/answer`), snap => {
      const ans = snap.val();
      if (ans && pc.signalingState !== 'closed' && !pc.remoteDescription) {
        pc.setRemoteDescription(new RTCSessionDescription(ans)).catch(() => {});
      }
    });
    rjSpeakerUnsubs.current[speakerUid].push(unsubAns);

    /* Watch for speaker's ICE candidates */
    const unsubSC = onChildAdded(ref(rtdb, `broadcasts/rj/speakerConnections/${speakerUid}/speakerCandidates`), snap => {
      const c = snap.val();
      if (c) pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    });
    rjSpeakerUnsubs.current[speakerUid].push(unsubSC);
  };

  /* ══════════════════════════════════════
     RJ BROADCAST — LISTENER SIDE
  ══════════════════════════════════════ */

  /** Clean up only the listener-side resources without touching RTDB (for when RJ disconnects). */
  const _rjCleanupListenerSide = (removePresence = true) => {
    rjListenerRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
    rjListenerRtdbUnsubs.current = [];

    if (rjListenerPC.current) { try { rjListenerPC.current.close(); } catch {} rjListenerPC.current = null; }

    if (rjAudioEl.current) {
      try { rjAudioEl.current.pause(); rjAudioEl.current.srcObject = null; } catch {}
      rjAudioEl.current = null;
    }

    if (removePresence && myUid) {
      remove(ref(rtdb, `broadcasts/rj/listeners/${myUid}`)).catch(() => {});
      remove(ref(rtdb, `broadcasts/rj/connections/${myUid}`)).catch(() => {});
    }
  };

  /** Listener joins the RJ broadcast audio stream. */
  const rjJoinAudio = async () => {
    if (!myUid || rjConnecting || rjIsListening) return;
    setRjConnecting(true);
    setRjAudioBlocked(false);
    /* Remember that user joined so we can auto-resume after logout/login */
    try { localStorage.setItem('tingle_rj_was_listening', 'true'); } catch {}

    try {
      /* Register presence — broadcaster will see this and create an offer */
      const lRef = ref(rtdb, `broadcasts/rj/listeners/${myUid}`);
      await set(lRef, { uid: myUid, name: myName, joinedAt: Date.now() });
      onDisconnect(lRef).remove();

      /* Create peer connection BEFORE watching for the offer so we're ready */
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      rjListenerPC.current = pc;

      /* Buffer ICE candidates that arrive before remote description is set */
      let remoteDescReady = false;
      const pendingCandidates = [];
      const drainPending = async () => {
        for (const c of pendingCandidates) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        pendingCandidates.length = 0;
      };

      /* When audio track arrives, play it — handle autoplay policy */
      pc.ontrack = (e) => {
        if (!rjAudioEl.current) {
          const audio = new Audio();
          audio.autoplay = true;
          audio.playsInline = true;
          rjAudioEl.current = audio;
        }
        rjAudioEl.current.srcObject = e.streams[0];
        rjAudioEl.current.play().then(() => {
          setRjAudioBlocked(false);
          setRjConnState('connected');
        }).catch(() => {
          setRjAudioBlocked(true);
          setRjConnState('connected');
        });
        setRjIsListening(true);
        setRjConnecting(false);
      };

      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === 'connected') setRjConnState('connected');
        else if (s === 'connecting' || s === 'new') setRjConnState('connecting');
        else if (s === 'failed') {
          setRjConnState('failed');
          _rjCleanupListenerSide(false);
          rjListenerPC.current = null;
          setTimeout(() => { setRjIsListening(false); setRjConnecting(false); }, 500);
        } else if (s === 'disconnected') setRjConnState('connecting');
      };

      /* Send our ICE candidates to broadcaster */
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          push(ref(rtdb, `broadcasts/rj/connections/${myUid}/listenerCandidates`), e.candidate.toJSON()).catch(() => {});
        }
      };

      /* Watch for broadcaster's offer (fires immediately if already present) */
      const offerRef = ref(rtdb, `broadcasts/rj/connections/${myUid}/offer`);
      const unsubOffer = onValue(offerRef, async snap => {
        const offer = snap.val();
        if (!offer || pc.signalingState === 'closed' || pc.remoteDescription) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          remoteDescReady = true;
          await drainPending();                              /* apply buffered candidates */
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await set(ref(rtdb, `broadcasts/rj/connections/${myUid}/answer`), { type: answer.type, sdp: answer.sdp }).catch(() => {});
        } catch (err) { console.warn('RJ offer handling error:', err); }
      });
      rjListenerRtdbUnsubs.current.push(unsubOffer);

      /* onChildAdded: each host ICE candidate fires exactly once, buffered if needed */
      const unsubHC = onChildAdded(ref(rtdb, `broadcasts/rj/connections/${myUid}/hostCandidates`), snap => {
        const c = snap.val();
        if (!c) return;
        if (remoteDescReady) {
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        } else {
          pendingCandidates.push(c);
        }
      });
      rjListenerRtdbUnsubs.current.push(unsubHC);

      /* Sync YouTube player if RJ already playing something */
      const ytSnap = await get(ref(rtdb, 'broadcasts/rj/youtube'));
      const ytData = ytSnap.val();
      if (ytData?.videoId) syncYouTubePlayer(ytData);

      /* Connection timeout: if no track in 12 s, show error */
      setTimeout(() => {
        if (!rjIsListening && rjConnecting) {
          bpToast.warning('Connection is taking long. Check your network and try again.');
          setRjConnecting(false);
        }
      }, 12000);

    } catch (err) {
      console.error('RJ join audio error:', err);
      bpToast.error('Could not connect to broadcast. Please try again.');
      _rjCleanupListenerSide(true);
      setRjConnecting(false);
    }
  };

  /** Listener leaves the RJ broadcast. */
  const rjLeaveAudio = () => {
    _rjCleanupListenerSide(true);
    setRjIsListening(false);
    setRjAudioBlocked(false);
    setRjConnState('idle');
    /* User chose to leave manually — don't auto-resume next time */
    try { localStorage.removeItem('tingle_rj_was_listening'); } catch {}
  };

  /* ── Auto-resume: when user logs back in and RJ is still live, rejoin from exact live position ──
     Reads localStorage flag set during rjJoinAudio. Only fires once per mount.                      */
  useEffect(() => {
    if (!rjIsLive || !myUid || canManageRJ || rjIsListening || rjConnecting) return;
    if (autoResumeAttempted.current) return;
    try {
      if (localStorage.getItem('tingle_rj_was_listening') !== 'true') return;
    } catch { return; }
    autoResumeAttempted.current = true;
    /* Brief delay so RTDB connection stabilizes and YouTube drift is calculated correctly */
    const t = setTimeout(() => {
      rjJoinAudio();
    }, 1800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rjIsLive, myUid, canManageRJ, rjIsListening, rjConnecting]);

  /* ══════════════════════════════════════
     RJ CONTROLS
  ══════════════════════════════════════ */

  const handleGoLive = async () => {
    if (!myUid) { bpToast.error('You must be logged in to go live.'); return; }
    if (!isRJ) { bpToast.error('Only RJ badge holders can go live.'); return; }
    setGoingLive(true);

    try {
      await startLocalMic();
    } catch (err) {
      console.error('Mic error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        bpToast.error('Microphone blocked. Allow mic access in your browser settings (🔒 icon in address bar), then try again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        bpToast.error('No microphone detected. Please connect a mic and try again.');
      } else if (err.name === 'NotReadableError') {
        bpToast.error('Microphone is in use by another app. Close it and try again.');
      } else {
        bpToast.error('Could not access microphone: ' + (err.message || 'Unknown error'));
      }
      setGoingLive(false);
      return;
    }

    try {
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
        youtube: { state: 'stopped', videoId: null, seekTo: 0, songName: '', updatedAt: Date.now() }
      };

      await set(ref(rtdb, 'broadcasts/rj'), bcData);

      /* onDisconnect: if RJ's connection drops, automatically remove the session */
      const rjRef = ref(rtdb, 'broadcasts/rj');
      const odHandle = onDisconnect(rjRef);
      odHandle.remove();
      rjOnDisconnectRef.current = odHandle;

      setMicMuted(false);
      rjStartListenerWatcher();
      bpToast.mic('You are now LIVE! Listeners can hear you.');

      if (roomId) {
        _postSystemMessage(roomId, `${myName} is now LIVE on Broadcast! Tune in to the Broadcast tab.`, 'broadcast_live', 10 * 60 * 1000);
      }
    } catch (err) {
      console.error('Go Live error:', err);
      const reason = err?.code === 'PERMISSION_DENIED' || err?.code === 'permission-denied'
        ? 'Database permission denied. Check your Firebase rules.'
        : (err?.message || 'Unknown error');
      bpToast.error('Failed to go live: ' + reason);
      stopLocalMic();
    } finally {
      setGoingLive(false);
    }
  };

  const handleEndBroadcast = async () => {
    const endingName = myName;
    try {
      /* Cancel the onDisconnect handler so it doesn't double-remove */
      if (rjOnDisconnectRef.current) {
        try { rjOnDisconnectRef.current.cancel(); } catch {}
        rjOnDisconnectRef.current = null;
      }

      rjStopAllBroadcasterConnections();
      /* Clear song queue and announcements when broadcast ends */
      await Promise.allSettled([
        remove(ref(rtdb, 'broadcasts/rj/songQueue')),
        remove(ref(rtdb, 'broadcasts/rj/announcements')),
      ]);
      await remove(ref(rtdb, 'broadcasts/rj'));

      setYtUrl('');
      setYtCurrentSongName('');
      setYtPlayerState('stopped');
      ytIntendedStateRef.current = 'stopped';
      rjIsLiveRef.current = false;
      if (ytPlayerRef.current?.stopVideo) ytPlayerRef.current.stopVideo();
      stopLocalMic();
      /* Clear listening flag for all users — broadcast is over */
      try { localStorage.removeItem('tingle_rj_was_listening'); } catch {}
      bpToast.success('Broadcast ended.');

      if (roomId) {
        _postSystemMessage(roomId, `${endingName}'s Broadcast has ended.`, 'broadcast_ended', 5 * 60 * 1000);
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
      const nowMuted = !micMuted;
      localStream.current.getAudioTracks().forEach(t => { t.enabled = !nowMuted; });
      setMicMuted(nowMuted);
    }
  };

  const startLocalMic = async () => {
    if (localStream.current) return localStream.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      video: false
    });
    localStream.current = stream;
    startMicLevelMeter(stream);

    /* Create Web Audio mixer — all audio sources (RJ mic + speakers) are routed
       through this AudioContext and delivered to listeners as one mixed stream.    */
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ctx.createMediaStreamDestination();
      const rjSrc = ctx.createMediaStreamSource(stream);
      rjSrc.connect(dest);
      rjAudioCtx.current = ctx;
      rjMixDest.current = dest;
    } catch (e) {
      console.warn('RJ audio mixer init failed — falling back to direct stream:', e);
    }

    return stream;
  };

  const stopLocalMic = () => {
    stopMicLevelMeter();
    setMicLevel(0);
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
  };

  /* ── Mic level meter using Web Audio API ── */
  const startMicLevelMeter = (stream) => {
    stopMicLevelMeter();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      micLevelCtxRef.current = ctx;
      micLevelTimerRef.current = setInterval(() => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, Math.round(avg * 3)));
      }, 80);
    } catch {}
  };

  const stopMicLevelMeter = () => {
    if (micLevelTimerRef.current) { clearInterval(micLevelTimerRef.current); micLevelTimerRef.current = null; }
    if (micLevelCtxRef.current) { try { micLevelCtxRef.current.close(); } catch {} micLevelCtxRef.current = null; }
    setMicLevel(0);
  };

  /* ── Public broadcast mic level meter ── */
  const startPubMicLevelMeter = (stream) => {
    stopPubMicLevelMeter();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      pubMicLevelCtxRef.current = ctx;
      pubMicLevelTimerRef.current = setInterval(() => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setPubMicLevel(Math.min(100, Math.round(avg * 3)));
      }, 80);
    } catch {}
  };

  const stopPubMicLevelMeter = () => {
    if (pubMicLevelTimerRef.current) { clearInterval(pubMicLevelTimerRef.current); pubMicLevelTimerRef.current = null; }
    if (pubMicLevelCtxRef.current) { try { pubMicLevelCtxRef.current.close(); } catch {} pubMicLevelCtxRef.current = null; }
    setPubMicLevel(0);
  };

  const handleYtLoad = () => {
    const vid = extractYtId(ytUrl);
    if (!vid) { bpToast.warning('Invalid YouTube URL. Paste a full YouTube link.'); return; }
    const songName = ytUrl;
    const nowMs = Date.now();
    ytIntendedStateRef.current = 'paused';
    initYtPlayer(vid, 0);
    update(ref(rtdb, 'broadcasts/rj/youtube'), {
      videoId: vid,
      state: 'paused',
      seekTo: 0,
      songName,
      updatedAt: nowMs,
    });
    setYtCurrentSongName(songName);
  };

  const handleYtControl = (action) => {
    const player = ytPlayerRef.current;
    let newState = ytPlayerState;
    let seekTo = 0;
    const nowMs = Date.now();

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
      player?.playVideo?.();
      newState = 'playing';
    } else if (action === 'skipprev') {
      seekTo = Math.max(0, (player?.getCurrentTime?.() || 0) - 15);
      player?.seekTo?.(seekTo, true);
      newState = ytPlayerState;
    }

    /* Track intended state so auto-resume logic knows what to do */
    ytIntendedStateRef.current = newState;
    setYtPlayerState(newState);
    update(ref(rtdb, 'broadcasts/rj/youtube'), { state: newState, seekTo, updatedAt: nowMs });
  };

  /* ── Speaker mic toggle (for users who are on stage) ── */
  const handleSpeakerMicToggle = () => {
    if (!speakerStream.current) return;
    const nowMuted = !speakerMicMuted;
    speakerStream.current.getAudioTracks().forEach(t => { t.enabled = !nowMuted; });
    setSpeakerMicMuted(nowMuted);
  };

  /* ── Speaker management ── */
  const handleInviteSpeaker = async (uid) => {
    if (!uid) return;
    /* Use data from the join request itself (always available) —
       fall back to allUsersProfiles only as a secondary source */
    const fromRequest = joinRequests.find(r => r.uid === uid);
    const fromProfiles = allUsersProfiles.find(u => u.uid === uid);
    const name = fromRequest?.name || fromProfiles?.username || fromProfiles?.displayName || 'User';
    const photoURL = fromRequest?.photoURL || fromProfiles?.photoURL || '';
    await update(ref(rtdb, `broadcasts/rj/speakers/${uid}`), {
      uid,
      name,
      photoURL,
      joinedAt: Date.now(),
      muted: false
    });
    await remove(ref(rtdb, `broadcasts/rj/joinRequests/${uid}`));
  };

  const handleRemoveSpeaker = async (uid) => {
    await remove(ref(rtdb, `broadcasts/rj/speakers/${uid}`));
  };

  /* ── Join Requests ── */
  const handleRequestToJoin = async () => {
    if (!myUid || !rjIsLive) return;
    await set(ref(rtdb, `broadcasts/rj/joinRequests/${myUid}`), {
      uid: myUid, name: myName, photoURL: myPhoto, status: 'pending', requestedAt: Date.now()
    });
    setMyRequestStatus('pending');
  };

  const handleCancelRequest = async () => {
    if (!myUid) return;
    await remove(ref(rtdb, `broadcasts/rj/joinRequests/${myUid}`));
    setMyRequestStatus(null);
  };

  const handleAcceptRequest = async (uid) => {
    try {
      await handleInviteSpeaker(uid);
    } catch (err) {
      const reason = err?.code === 'PERMISSION_DENIED' || err?.code === 'permission-denied'
        ? 'Database permission denied — please update your Firebase Realtime Database rules.'
        : (err?.message || 'Unknown error');
      bpToast.error('Failed to accept: ' + reason);
    }
  };

  const handleRejectRequest = async (uid) => {
    await update(ref(rtdb, `broadcasts/rj/joinRequests/${uid}`), { status: 'rejected' });
    setTimeout(() => remove(ref(rtdb, `broadcasts/rj/joinRequests/${uid}`)), 3000);
  };

  /* ══════════════════════════════════════
     SONG REQUEST QUEUE HANDLERS
  ══════════════════════════════════════ */

  /* URL detection — reject ANY external link or domain reference */
  const _containsURL = (text) => {
    if (!text) return false;
    const t = text.trim();
    /* 1. Explicit protocols */
    if (/https?:\/\//i.test(t)) return true;
    if (/ftp:\/\//i.test(t)) return true;
    /* 2. Obvious www prefix */
    if (/\bwww\./i.test(t)) return true;
    /* 3. Known music / video platforms (bare hostname form) */
    if (/\b(youtu\.be|youtube\.com|spotify\.com|soundcloud\.com|jiosaavn\.com|gaana\.com|wynk\.(in|music)|apple\.com|music\.apple\.com|tidal\.com|deezer\.com|amazon\.com|music\.amazon|jiomusic|hungama|saavn|resso)\b/i.test(t)) return true;
    /* 4. URL shorteners and bare domains commonly used to link */
    if (/\b(bit\.ly|t\.co|goo\.gl|tinyurl\.com|ow\.ly|buff\.ly|is\.gd|rb\.gy|short\.link|cutt\.ly|tiny\.cc)\b/i.test(t)) return true;
    /* 5. Any plain domain: word(s) dot known-TLD (catches google.com, example.co, etc.) */
    if (/\b[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(com|net|org|in|io|co|me|ly|fm|tv|music|app|link|info|biz|edu|gov|uk|us|de|fr|jp|au|ca|ru|cn|br)\b/i.test(t)) return true;
    return false;
  };

  const handleSubmitSongRequest = async () => {
    if (!myUid || !rjIsLive) return;
    const { songName, artist, message } = songForm;
    if (!songName.trim()) { bpToast.warning('Song name is required.'); return; }
    if (_containsURL(songName) || _containsURL(artist) || _containsURL(message)) {
      bpToast.error('Links and URLs are not allowed in song requests. Please enter only a song name.');
      return;
    }
    if (songName.trim().length > 100) { bpToast.warning('Song name is too long (max 100 characters).'); return; }
    if (myQueueEntry && myQueueEntry.status === 'pending') {
      bpToast.warning('You already have a pending song request. Wait for the RJ to review it.'); return;
    }
    setSubmittingRequest(true);
    try {
      await set(ref(rtdb, `broadcasts/rj/songQueue/${myUid}`), {
        uid: myUid,
        username: myName,
        avatar: myPhoto,
        songName: songName.trim().slice(0, 100),
        artist: artist.trim().slice(0, 80),
        message: message.trim().slice(0, 160),
        status: 'pending',
        requestedAt: Date.now(),
      });
      setSongForm({ songName: '', artist: '', message: '' });
      bpToast.success('Song request sent! The RJ will review it.');
    } catch (err) {
      bpToast.error('Failed to send request. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleSongQueueAction = async (uid, action) => {
    if (!canManageRJ) return;
    try {
      if (action === 'approve') {
        await update(ref(rtdb, `broadcasts/rj/songQueue/${uid}`), { status: 'approved' });
      } else if (action === 'reject') {
        await update(ref(rtdb, `broadcasts/rj/songQueue/${uid}`), { status: 'rejected' });
        setTimeout(() => remove(ref(rtdb, `broadcasts/rj/songQueue/${uid}`)).catch(() => {}), 4000);
      } else if (action === 'remove') {
        await remove(ref(rtdb, `broadcasts/rj/songQueue/${uid}`));
      } else if (action === 'skip') {
        await update(ref(rtdb, `broadcasts/rj/songQueue/${uid}`), { status: 'skipped' });
        setTimeout(() => remove(ref(rtdb, `broadcasts/rj/songQueue/${uid}`)).catch(() => {}), 2000);
      }
    } catch (err) {
      bpToast.error('Action failed. Please try again.');
    }
  };

  const handleCancelSongRequest = async () => {
    if (!myUid) return;
    await remove(ref(rtdb, `broadcasts/rj/songQueue/${myUid}`)).catch(() => {});
    setMyQueueEntry(null);
  };

  /* ══════════════════════════════════════
     ANNOUNCEMENT HANDLERS
  ══════════════════════════════════════ */

  const handleSendAnnouncement = async () => {
    if (!canManageRJ || !rjIsLive || !announcementText.trim()) return;
    setSendingAnnouncement(true);
    try {
      const newRef = push(ref(rtdb, 'broadcasts/rj/announcements'));
      await set(newRef, {
        rjUid: myUid,
        rjName: myName,
        rjAvatar: myPhoto,
        rjBadge: 'RJ',
        message: announcementText.trim().slice(0, 500),
        sentAt: Date.now(),
        sessionId: rjBroadcast?.startedAt || Date.now(),
      });
      setAnnouncementText('');
      bpToast.success('Announcement sent to all listeners.');
    } catch (err) {
      bpToast.error('Failed to send announcement.');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!canManageRJ) return;
    await remove(ref(rtdb, `broadcasts/rj/announcements/${id}`)).catch(() => {});
  };

  /* ══════════════════════════════════════
     PUBLIC BROADCASTS — BROADCASTER SIDE
  ══════════════════════════════════════ */

  const pubCreateOfferForListener = async (broadcastId, listenerUid) => {
    const existing = pubHostPCs.current[listenerUid];
    if (existing) {
      if (existing.connectionState !== 'failed' && existing.signalingState !== 'closed') return;
      try { existing.close(); } catch {}
      delete pubHostPCs.current[listenerUid];
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pubHostPCs.current[listenerUid] = pc;

    if (pubHostStream.current) {
      pubHostStream.current.getTracks().forEach(t => pc.addTrack(t, pubHostStream.current));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        push(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${listenerUid}/hostCandidates`), e.candidate.toJSON()).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setTimeout(() => {
          if (pubHostPCs.current[listenerUid] === pc) {
            try { pc.close(); } catch {}
            delete pubHostPCs.current[listenerUid];
            pubCreateOfferForListener(broadcastId, listenerUid).catch(() => {});
          }
        }, 2000);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await set(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${listenerUid}/offer`), { type: offer.type, sdp: offer.sdp }).catch(() => {});

    const unsubAns = onValue(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${listenerUid}/answer`), snap => {
      const ans = snap.val();
      if (ans && pc.signalingState !== 'closed' && !pc.remoteDescription) {
        pc.setRemoteDescription(new RTCSessionDescription(ans)).catch(() => {});
      }
    });
    pubHostRtdbUnsubs.current.push(unsubAns);

    /* Use onChildAdded so each listener ICE candidate is processed exactly once */
    const unsubLC = onChildAdded(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${listenerUid}/listenerCandidates`), snap => {
      const c = snap.val();
      if (c) pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    });
    pubHostRtdbUnsubs.current.push(unsubLC);
  };

  const pubStartListenerWatcher = (broadcastId) => {
    let prevUIDs = new Set();
    const lisRef = ref(rtdb, `broadcasts/public/${broadcastId}/listeners`);
    const unsub = onValue(lisRef, snap => {
      const listeners = snap.val() || {};
      const currentUIDs = new Set(Object.keys(listeners));

      currentUIDs.forEach(uid => {
        if (uid !== myUid && !prevUIDs.has(uid)) {
          pubCreateOfferForListener(broadcastId, uid).catch(() => {});
        }
      });

      prevUIDs.forEach(uid => {
        if (!currentUIDs.has(uid) && pubHostPCs.current[uid]) {
          try { pubHostPCs.current[uid].close(); } catch {}
          delete pubHostPCs.current[uid];
          remove(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${uid}`)).catch(() => {});
        }
      });

      prevUIDs = currentUIDs;

      /* Update listener count in Firestore */
      updateDoc(doc(db, 'publicBroadcasts', broadcastId), { listenerCount: currentUIDs.size }).catch(() => {});
    });
    pubListenersUnsub.current = unsub;
  };

  const pubStopHostAudio = (broadcastId) => {
    /* Cancel onDisconnect so it doesn't double-fire */
    if (pubOnDisconnectRef.current) {
      try { pubOnDisconnectRef.current.cancel(); } catch {}
      pubOnDisconnectRef.current = null;
    }

    pubHostRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
    pubHostRtdbUnsubs.current = [];

    if (pubListenersUnsub.current) { try { pubListenersUnsub.current(); } catch {} pubListenersUnsub.current = null; }

    Object.values(pubHostPCs.current).forEach(pc => { try { pc.close(); } catch {} });
    pubHostPCs.current = {};

    if (pubHostStream.current) {
      pubHostStream.current.getTracks().forEach(t => t.stop());
      pubHostStream.current = null;
    }

    if (broadcastId) {
      remove(ref(rtdb, `broadcasts/public/${broadcastId}`)).catch(() => {});
    }
  };

  /* ══════════════════════════════════════
     PUBLIC BROADCASTS — LISTENER SIDE
  ══════════════════════════════════════ */

  const _pubCleanupListenerSide = () => {
    pubListenerRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
    pubListenerRtdbUnsubs.current = [];

    if (pubListenerPC.current) { try { pubListenerPC.current.close(); } catch {} pubListenerPC.current = null; }

    if (pubAudioEl.current) {
      try { pubAudioEl.current.pause(); pubAudioEl.current.srcObject = null; } catch {}
      pubAudioEl.current = null;
    }
  };

  const pubJoinAudio = async (bc) => {
    if (!myUid) return;
    const { id: broadcastId } = bc;
    setPubAudioBlocked(false);

    /* Register presence so broadcaster creates offer for us */
    const lRef = ref(rtdb, `broadcasts/public/${broadcastId}/listeners/${myUid}`);
    await set(lRef, { uid: myUid, name: myName, joinedAt: Date.now() }).catch(() => {});
    onDisconnect(lRef).remove();

    /* Create peer connection BEFORE watching for the offer */
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pubListenerPC.current = pc;

    /* Buffer ICE candidates that arrive before remote description is set */
    let remoteDescReady = false;
    const pendingCandidates = [];
    const drainPending = async () => {
      for (const c of pendingCandidates) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      pendingCandidates.length = 0;
    };

    pc.ontrack = e => {
      if (!pubAudioEl.current) {
        pubAudioEl.current = new Audio();
        pubAudioEl.current.autoplay = true;
        pubAudioEl.current.playsInline = true;
      }
      pubAudioEl.current.srcObject = e.streams[0];
      pubAudioEl.current.play().then(() => {
        setPubAudioBlocked(false);
        setPubConnState('connected');
      }).catch(() => {
        setPubAudioBlocked(true);
        setPubConnState('connected');
      });
    };

    pc.onicecandidate = evt => {
      if (evt.candidate) {
        push(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${myUid}/listenerCandidates`), evt.candidate.toJSON()).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') setPubConnState('connected');
      else if (s === 'connecting' || s === 'new') setPubConnState('connecting');
      else if (s === 'disconnected') setPubConnState('connecting');
      else if (s === 'failed') {
        setPubConnState('failed');
        _pubCleanupListenerSide();
        pubListenerPC.current = null;
        setListeningTo(null);
        bpToast.error('Connection lost. Try joining again.');
      }
    };

    /* Watch for broadcaster's offer (fires immediately if already present) */
    const offerRef = ref(rtdb, `broadcasts/public/${broadcastId}/connections/${myUid}/offer`);
    const unsubOffer = onValue(offerRef, async snap => {
      const offer = snap.val();
      if (!offer || pc.signalingState === 'closed' || pc.remoteDescription) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        remoteDescReady = true;
        await drainPending();                              /* apply buffered candidates */
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await set(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${myUid}/answer`), { type: answer.type, sdp: answer.sdp }).catch(() => {});
      } catch (err) { console.warn('Pub offer handling error:', err); }
    });
    pubListenerRtdbUnsubs.current.push(unsubOffer);

    /* onChildAdded: each host ICE candidate fires exactly once, buffered if needed */
    const unsubHC = onChildAdded(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${myUid}/hostCandidates`), snap => {
      const c = snap.val();
      if (!c) return;
      if (remoteDescReady) {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      } else {
        pendingCandidates.push(c);
      }
    });
    pubListenerRtdbUnsubs.current.push(unsubHC);
  };

  const pubLeaveAudio = (broadcastId) => {
    _pubCleanupListenerSide();
    setPubConnState('idle');
    setPubAudioBlocked(false);
    if (broadcastId && myUid) {
      remove(ref(rtdb, `broadcasts/public/${broadcastId}/listeners/${myUid}`)).catch(() => {});
      remove(ref(rtdb, `broadcasts/public/${broadcastId}/connections/${myUid}`)).catch(() => {});
    }
  };

  /* ── Public Broadcast Handlers ── */
  const handleCreatePublicBroadcast = async () => {
    if (!myUid || !pubTitle.trim()) return;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
        video: false
      });
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        bpToast.error('Microphone blocked. Click the 🔒 icon in your browser address bar to allow mic access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        bpToast.error('No microphone found. Connect a mic and try again.');
      } else if (err.name === 'NotReadableError') {
        bpToast.error('Microphone is already in use by another application. Close it and try again.');
      } else {
        bpToast.error('Could not access microphone: ' + (err.message || 'Unknown error'));
      }
      return;
    }
    pubHostStream.current = stream;
    startPubMicLevelMeter(stream);
    setPubMicMuted(false);

    try {
      const passwordHash = pubIsProtected && pubPassword.trim()
        ? await hashPassword(pubPassword.trim()) : '';

      const data = {
        hostUid: myUid,
        hostName: myName,
        hostAvatar: myPhoto,
        title: pubTitle.trim(),
        isLive: true,
        isPasswordProtected: pubIsProtected,
        passwordHash,
        listenerCount: 0,
        createdAt: new Date().toISOString(),
        startedAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'publicBroadcasts'), data);
      const broadcastId = docRef.id;
      setMyActiveBroadcast({ id: broadcastId, ...data });
      setPubTitle('');
      setPubPassword('');
      setPubIsProtected(false);

      /* Create RTDB session node with onDisconnect cleanup */
      const sessionRef = ref(rtdb, `broadcasts/public/${broadcastId}/session`);
      await set(sessionRef, { hostUid: myUid, startedAt: Date.now() });
      const odHandle = onDisconnect(sessionRef);
      odHandle.remove();
      pubOnDisconnectRef.current = odHandle;

      pubStartListenerWatcher(broadcastId);
      bpToast.live('Your public broadcast is LIVE! Others can now tune in.');
    } catch (err) {
      console.error('Create broadcast error:', err);
      stream.getTracks().forEach(t => t.stop());
      pubHostStream.current = null;
      stopPubMicLevelMeter();
      const reason = err?.code === 'permission-denied' ? 'Permission denied — make sure you are logged in as a registered user.' : (err?.message || 'Unknown error');
      bpToast.error('Failed to start broadcast: ' + reason);
    }
  };

  const handleStopPublicBroadcast = async () => {
    if (!myActiveBroadcast?.id) return;
    try {
      stopPubMicLevelMeter();
      setPubMicMuted(false);
      pubStopHostAudio(myActiveBroadcast.id);
      await updateDoc(doc(db, 'publicBroadcasts', myActiveBroadcast.id), { isLive: false });
      setMyActiveBroadcast(null);
      bpToast.success('Broadcast ended. Thanks for going live!');
    } catch (err) {
      console.error('Stop broadcast error:', err);
      stopPubMicLevelMeter();
      bpToast.error('Failed to stop broadcast.');
    }
  };

  const handlePubMicToggle = () => {
    if (!pubHostStream.current) return;
    const nowMuted = !pubMicMuted;
    pubHostStream.current.getAudioTracks().forEach(t => { t.enabled = !nowMuted; });
    setPubMicMuted(nowMuted);
  };

  const handleJoinPublicBroadcast = async (bc) => {
    if (pubJoining) return;

    /* If already listening to this one, toggle off */
    if (listeningTo?.id === bc.id) {
      pubLeaveAudio(bc.id);
      setListeningTo(null);
      return;
    }

    /* Leave current if switching */
    if (listeningTo) {
      pubLeaveAudio(listeningTo.id);
      setListeningTo(null);
    }

    if (bc.isPasswordProtected) {
      setPasswordPrompt({ broadcastId: bc.id, title: bc.title });
      return;
    }

    setPubJoining(true);
    try {
      setListeningTo(bc);
      await pubJoinAudio(bc);
    } finally {
      setPubJoining(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordPrompt) return;
    const bc = publicBroadcasts.find(b => b.id === passwordPrompt.broadcastId);
    if (!bc) return;
    try {
      const entered = await hashPassword(pwInput);
      if (entered === bc.passwordHash) {
        setPasswordPrompt(null);
        setPwInput('');
        setPubJoining(true);
        try {
          setListeningTo(bc);
          await pubJoinAudio(bc);
        } finally {
          setPubJoining(false);
        }
      } else {
        bpToast.error('Wrong password. Try again.');
        setPwInput('');
      }
    } catch {
      bpToast.error('Could not verify password. Try again.');
      setPwInput('');
    }
  };

  /* ── Stale public broadcast cleanup on panel open ──
       If a previous session ended via page reload, the Firestore doc may still say isLive:true
       but the RTDB session will be gone. We clean those up so the broadcaster can start fresh. ── */
  useEffect(() => {
    if (!isOpen || !myUid) return;
    const cleanStale = async () => {
      try {
        const q = query(
          collection(db, 'publicBroadcasts'),
          where('hostUid', '==', myUid),
          where('isLive', '==', true)
        );
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          const rtdbSnap = await get(ref(rtdb, `broadcasts/public/${d.id}/session`));
          if (!rtdbSnap.exists()) {
            /* RTDB session gone → stale — mark as ended */
            await updateDoc(doc(db, 'publicBroadcasts', d.id), { isLive: false }).catch(() => {});
            /* Also clean up any leftover RTDB data */
            await remove(ref(rtdb, `broadcasts/public/${d.id}`)).catch(() => {});
          }
        }
      } catch {}
    };
    cleanStale();
  }, [isOpen, myUid]);

  /* ── Cleanup when panel closes ── */
  useEffect(() => {
    if (!isOpen) {
      // Public broadcast (music streams) stop when panel closes.
      if (listeningTo) { pubLeaveAudio(listeningTo.id); setListeningTo(null); }
      // RJ voice intentionally NOT stopped here — audio should keep playing
      // even when the user minimises/closes the panel.
      // Voice only stops when: RJ ends broadcast, user clicks Leave, page unloads.
    }
  }, [isOpen]);

  /* ── visibilitychange for RJ voice audio: handled by the unified effect above ── */

  /* ── Global cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (listeningTo) pubLeaveAudio(listeningTo.id);
      if (rjIsListening) rjLeaveAudio();
      stopMicLevelMeter();
      stopPubMicLevelMeter();
    };
  }, []);

  /* ── Utility: post system message to a room ── */
  const _postSystemMessage = async (rId, text, tinglebotType, deleteMsAfter) => {
    try {
      const { serverTimestamp: fsST, addDoc: fsAdd, collection: fsColl } = await import('firebase/firestore');
      const { db: fsDb } = await import('../firebase/config');
      const r = await fsAdd(fsColl(fsDb, 'rooms', rId, 'messages'), {
        text,
        uid: 'tinglebot_system_official_2024',
        displayName: 'TingleBot',
        isBot: true, systemBot: true, tinglebotType,
        createdAt: fsST(),
        noReply: true, noReaction: true, noReport: true, noUnread: true,
      });
      if (r?.id && deleteMsAfter) {
        setTimeout(() => deleteDoc(doc(db, 'rooms', rId, 'messages', r.id)).catch(() => {}), deleteMsAfter);
      }
    } catch {}
  };

  /* ── Panel closed: keep YouTube player alive in a hidden off-screen container ── */
  if (!isOpen) {
    return (
      <div
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <div ref={ytContainerRef} id="bp-yt-player" />
      </div>
    );
  }

  /* ── Minimized floating bubble ──
     IMPORTANT: ytContainerRef MUST stay in the DOM or the YouTube iframe is
     destroyed and music stops. Keep it in a tiny off-screen div alongside the bubble. */
  if (isMinimized) {
    return (
      <>
        <div
          style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <div ref={ytContainerRef} id="bp-yt-player" />
        </div>
        <FloatingMinimizedBubble
          isLive={rjIsLive && canManageRJ}
          pubIsLive={!!myActiveBroadcast}
          onExpand={() => setIsMinimized(false)}
          onClose={() => { setIsMinimized(false); onClose(); }}
        />
      </>
    );
  }

  /* ══════════════════════════════════════
     RENDER HELPERS
  ══════════════════════════════════════ */
  const renderTabBadge = (tab) => {
    if (tab === 1) {
      const count = joinRequests.filter(r => r.status === 'pending').length;
      if (count > 0 && canManageRJ) return <span className="bp-tab-badge">{count}</span>;
    }
    if (tab === 2) {
      const count = canManageRJ
        ? songQueue.filter(r => r.status === 'pending').length
        : 0;
      if (count > 0) return <span className="bp-tab-badge">{count}</span>;
    }
    if (tab === 3) {
      const count = announcements.length;
      if (count > 0) return <span className="bp-tab-badge bp-tab-badge--ann">{count}</span>;
    }
    return null;
  };

  /* ── TAB 0: RJ Controls (broadcaster) ── */
  const renderRJControls = () => (
    <div>
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

      {rjIsLive && (
        <>
          {/* Mic level meter */}
          <div style={{ margin: '0 0 10px', padding: '8px 12px', background: 'rgba(109,40,217,0.10)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <MicIcon muted={micMuted} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--bp-text-muted, #a78bfa)' }}>
                {micMuted ? 'MIC MUTED' : 'MIC LIVE'}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: micLevel > 60 ? '#34d399' : micLevel > 20 ? '#fbbf24' : '#a78bfa' }}>
                {micMuted ? '—' : micLevel > 60 ? 'Strong' : micLevel > 20 ? 'Good' : 'Low'}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: micMuted ? '0%' : `${micLevel}%`,
                background: micLevel > 60 ? '#34d399' : micLevel > 20 ? '#fbbf24' : '#a78bfa',
                borderRadius: 4,
                transition: 'width 80ms linear',
              }} />
            </div>
          </div>

          <div className="bp-control-grid">
            <button className={`bp-ctrl-btn${micMuted ? ' danger' : ''}`} onClick={handleMicToggle}>
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

          <div className="bp-yt-section">
            <div className="bp-yt-label"><YoutubeIcon /> Music Sync</div>
            <div className="bp-yt-url-row">
              <input
                className="bp-input"
                placeholder="YouTube URL..."
                value={ytUrl}
                onChange={e => setYtUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleYtLoad()}
              />
              <button className="bp-yt-load-btn" onClick={handleYtLoad}>Load</button>
            </div>
            {ytCurrentSongName && (
              <div className="bp-song-controls">
                <button className="bp-song-btn" onClick={() => handleYtControl('skipprev')}><SkipPrevIcon /></button>
                {ytPlayerState === 'playing'
                  ? <button className="bp-song-btn play-main" onClick={() => handleYtControl('pause')}><PauseIcon /></button>
                  : <button className="bp-song-btn play-main" onClick={() => handleYtControl('play')}><PlayIcon /></button>
                }
                <button className="bp-song-btn" onClick={() => handleYtControl('skipnext')}><SkipNextIcon /></button>
                <button className="bp-song-btn danger" onClick={() => handleYtControl('stop')}><StopIcon /></button>
              </div>
            )}
          </div>

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

  /* ── BPAnnTranslated: per-announcement translation helper ── */
  const BPAnnTranslated = React.memo(function BPAnnTranslated({ text, annId }) {
    const [result, setResult] = React.useState(null);
    const [s, setS] = React.useState(() => _tsBP());
    React.useEffect(() => {
      const h = () => setS(_tsBP());
      window.addEventListener('tbSettingChanged', h);
      return () => window.removeEventListener('tbSettingChanged', h);
    }, []);
    React.useEffect(() => {
      if (!s.enabled || !s.translateAnnouncements || !text) { setResult(null); return; }
      let cancelled = false;
      _ttBP(text, s.language).then(res => {
        if (cancelled) return;
        setResult(!res.skipped ? res : null);
      });
      return () => { cancelled = true; };
    }, [text, annId, s.enabled, s.translateAnnouncements, s.language]);
    return (
      <div>
        {(s.showOriginal || !result) && <div className="bp-ann-strip-msg">{text}</div>}
        {result && (
          <div style={{display:'flex',alignItems:'flex-start',gap:'5px',marginTop:'3px',padding:'3px 6px',borderRadius:'6px',background:'linear-gradient(135deg,rgba(129,140,248,0.08),rgba(236,72,153,0.05))',border:'1px solid rgba(129,140,248,0.18)'}}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,marginTop:'2px'}}><defs><linearGradient id="bpGlb" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#ec4899"/></linearGradient></defs><circle cx="12" cy="12" r="9" stroke="url(#bpGlb)" strokeWidth="1.6"/><path d="M12 3c-2 2-3.5 5-3.5 9s1.5 7 3.5 9M12 3c2 2 3.5 5 3.5 9s-1.5 7-3.5 9" stroke="url(#bpGlb)" strokeWidth="1.3" strokeLinecap="round"/><path d="M3 12h18" stroke="url(#bpGlb)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/></svg>
            <span className="bp-ann-strip-msg" style={{fontStyle:'italic',color:'var(--text-muted,#6b7280)'}}>{result.translated}</span>
          </div>
        )}
      </div>
    );
  });

  /* ── Announcement notification strip for listeners ── */
  const renderAnnouncementStrips = () => {
    if (!announcements.length) return null;
    return (
      <div className="bp-ann-strips-wrap">
        {announcements.slice(-3).map(ann => (
          <div key={ann.id} className="bp-ann-strip">
            <div className="bp-ann-strip-anim">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="annStrip" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b"/>
                    <stop offset="100%" stopColor="#f472b6"/>
                  </linearGradient>
                </defs>
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="url(#annStrip)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <img
              className="bp-ann-strip-avatar"
              src={ann.rjAvatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${ann.rjUid}`}
              alt={ann.rjName}
              onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${ann.rjUid}`; }}
            />
            <div className="bp-ann-strip-body">
              <div className="bp-ann-strip-meta">
                <span className="bp-ann-strip-name">{ann.rjName}</span>
                <span className="bp-ann-strip-badge">RJ</span>
                <span className="bp-ann-strip-live">
                  <span className="bp-ann-live-dot" />
                  LIVE
                </span>
                <span className="bp-ann-strip-time">
                  {ann.sentAt ? new Date(ann.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <BPAnnTranslated text={ann.message} annId={ann.id} />
            </div>
          </div>
        ))}
        {announcements.length > 0 && (
          <button className="bp-ann-see-all-btn" onClick={() => setActiveTab(3)}>
            See all announcements
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
    );
  };

  /* ── TAB 0: Listener view ── */
  const renderListenerView = () => {
    if (!rjIsLive || !rjBroadcast) {
      return (
        <div className="bp-no-broadcast">
          <div className="bp-no-broadcast-icon"><BroadcastIcon size={56} /></div>
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

        {!isGuest && !canManageRJ && (
          <div style={{ marginTop: 16 }}>
            {/* Connection quality pill */}
            {(rjIsListening || rjConnecting) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  background: rjConnState === 'connected' ? 'rgba(52,211,153,0.15)' : rjConnState === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                  color: rjConnState === 'connected' ? '#34d399' : rjConnState === 'failed' ? '#f87171' : '#fbbf24',
                  border: `1px solid ${rjConnState === 'connected' ? 'rgba(52,211,153,0.3)' : rjConnState === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)'}`,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: rjConnState === 'connecting' ? 'bp-pulse 1s infinite' : 'none' }} />
                  {rjConnState === 'connected' ? 'Connected' : rjConnState === 'failed' ? 'Failed' : 'Connecting…'}
                </span>
              </div>
            )}
            {rjIsListening ? (
              <>
                {rjAudioBlocked && (
                  <button
                    className="bp-listen-btn bp-listen-btn--join"
                    style={{ marginBottom: 8, background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
                    onClick={() => {
                      if (rjAudioEl.current) {
                        rjAudioEl.current.play().then(() => setRjAudioBlocked(false)).catch(() => {});
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    Tap to Start Audio
                  </button>
                )}
                <button
                  className="bp-listen-btn bp-listen-btn--stop"
                  onClick={rjLeaveAudio}
                >
                  <StopIcon color="currentColor" />
                  Stop Listening
                </button>
              </>
            ) : (
              <button
                className="bp-listen-btn bp-listen-btn--join"
                onClick={() => { setRjConnState('connecting'); rjJoinAudio(); }}
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

        {/* ── Follow RJ Button ── */}
        {!isGuest && rjBroadcast?.rjUid && (
          <div style={{ marginTop: 14 }}>
            <RJFollowButton
              rjUid={rjBroadcast.rjUid}
              rjName={rjBroadcast.rjName}
              rjAvatar={rjBroadcast.rjAvatar}
              compact={true}
              showCounts={true}
            />
          </div>
        )}

        {/* ── Announcement Strips (latest 3) ── */}
        {announcements.length > 0 && (
          <div style={{ marginTop: 14 }}>{renderAnnouncementStrips()}</div>
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
            {speakers.length > 5 && <span className="bp-speaker-count">+{speakers.length - 5} more</span>}
          </div>
        )}
      </div>
    );
  };

  /* ── TAB 0 router ── */
  const renderRJTab = () => canManageRJ ? renderRJControls() : renderListenerView();

  /* ── TAB 1: Join Stage ── */
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
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <MicIcon muted={speakerMicMuted} />
              {speakerConnecting ? 'Connecting to Stage…' : 'You are on Stage 🎙️'}
            </h3>
            <p style={{ marginBottom: 0 }}>
              {speakerConnecting
                ? 'Setting up your microphone — please wait…'
                : speakerMicMuted
                  ? 'Your mic is muted. Tap below to unmute.'
                  : 'Your voice is live! Everyone on the broadcast can hear you.'}
            </p>
          </div>

          {/* Mic level indicator */}
          {!speakerConnecting && speakerStream.current && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              margin: '12px auto', justifyContent: 'center',
              padding: '8px 16px', borderRadius: 12,
              background: speakerMicMuted ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
              border: `1px solid ${speakerMicMuted ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: speakerMicMuted ? '#f87171' : '#34d399' }}>
                {speakerMicMuted ? '🔇 MIC OFF' : '🎙️ MIC LIVE'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {/* Mute / Unmute toggle */}
            {!speakerConnecting && (
              <button
                className={`bp-request-btn ${speakerMicMuted ? 'join' : 'cancel'}`}
                style={{ flex: 1 }}
                onClick={handleSpeakerMicToggle}
              >
                {speakerMicMuted ? '🎙️ Unmute Mic' : '🔇 Mute Mic'}
              </button>
            )}
            {/* Leave stage */}
            <button
              className="bp-request-btn cancel"
              style={{ flex: 1 }}
              onClick={() => handleRemoveSpeaker(myUid)}
            >
              Leave Stage
            </button>
          </div>
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

  /* ── TAB 2: Song Request Queue ── */
  const renderSongQueueTab = () => {
    if (!rjIsLive) {
      return (
        <div className="bp-empty">
          <div style={{ marginBottom: 10, opacity: 0.25 }}><MusicNoteIcon /></div>
          No active broadcast. Song requests open when the RJ is live.
        </div>
      );
    }

    /* RJ Queue Management View */
    if (canManageRJ) {
      const pending  = songQueue.filter(r => r.status === 'pending');
      const approved = songQueue.filter(r => r.status === 'approved');
      const rejected = songQueue.filter(r => r.status === 'rejected' || r.status === 'skipped');

      const renderQueueItem = (req, actions) => {
        const pos = songQueue.indexOf(req) + 1;
        return (
          <div key={req.uid} className="bp-sq-item">
            <img
              className="bp-sq-avatar"
              src={req.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${req.uid}`}
              alt={req.username}
              onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${req.uid}`; }}
            />
            <div className="bp-sq-info">
              <div className="bp-sq-song">{req.songName}</div>
              {req.artist && <div className="bp-sq-artist">{req.artist}</div>}
              {req.message && <div className="bp-sq-msg">"{req.message}"</div>}
              <div className="bp-sq-meta">
                <span className="bp-sq-user">{req.username}</span>
                <span className="bp-sq-dot">·</span>
                <span className="bp-sq-pos">#{pos}</span>
                <span className="bp-sq-dot">·</span>
                <span className="bp-sq-time">
                  {req.requestedAt ? new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
            <div className="bp-sq-actions">
              {actions}
            </div>
          </div>
        );
      };

      return (
        <div>
          <div className="bp-sq-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <defs><linearGradient id="sqLab" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient></defs>
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="url(#sqLab)"/>
            </svg>
            Pending Requests ({pending.length})
          </div>
          {pending.length === 0 ? (
            <div className="bp-queue-empty">No pending song requests</div>
          ) : (
            <div className="bp-sq-list">
              {pending.map(req => renderQueueItem(req, (
                <>
                  <button className="bp-sq-btn approve" onClick={() => handleSongQueueAction(req.uid, 'approve')} title="Approve">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Approve
                  </button>
                  <button className="bp-sq-btn skip" onClick={() => handleSongQueueAction(req.uid, 'skip')} title="Skip">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 18l8.5-6L6 6v12zm8.5-6v6H17V6h-2.5v6z" fill="#fbbf24"/></svg>
                    Skip
                  </button>
                  <button className="bp-sq-btn reject" onClick={() => handleSongQueueAction(req.uid, 'reject')} title="Reject">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round"/></svg>
                    Reject
                  </button>
                </>
              )))}
            </div>
          )}

          {approved.length > 0 && (
            <>
              <div className="bp-sq-label" style={{ marginTop: 14 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="rgba(52,211,153,0.18)"/><path d="M8 12l3 3 5-5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Approved ({approved.length})
              </div>
              <div className="bp-sq-list">
                {approved.map(req => renderQueueItem(req, (
                  <button className="bp-sq-btn reject" onClick={() => handleSongQueueAction(req.uid, 'remove')} title="Remove">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round"/></svg>
                    Remove
                  </button>
                )))}
              </div>
            </>
          )}
        </div>
      );
    }

    /* Listener Song Request Form */
    if (isGuest) {
      return (
        <div className="bp-guest-lock">
          <div className="bp-guest-lock-icon"><LockIcon /></div>
          <h3>Register to Request</h3>
          <p>Create an account to send song requests to the RJ.</p>
        </div>
      );
    }

    return (
      <div>
        <div className="bp-sq-form-card">
          <div className="bp-sq-form-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <defs><linearGradient id="sqForm" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient></defs>
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="url(#sqForm)"/>
            </svg>
            <span>Request a Song</span>
          </div>

          {myQueueEntry && myQueueEntry.status === 'pending' ? (
            <div className="bp-sq-pending-card">
              <div className="bp-sq-pending-title">Request Sent</div>
              <div className="bp-sq-pending-song">{myQueueEntry.songName}</div>
              {myQueueEntry.artist && <div className="bp-sq-pending-artist">{myQueueEntry.artist}</div>}
              <div className="bp-sq-pending-status">
                <span className="bp-sq-status-pill pending">Pending</span>
                Waiting for RJ to review...
              </div>
              <button className="bp-sq-cancel-btn" onClick={handleCancelSongRequest}>
                Cancel Request
              </button>
            </div>
          ) : myQueueEntry && myQueueEntry.status === 'approved' ? (
            <div className="bp-sq-pending-card approved">
              <div className="bp-sq-pending-title">Your Request is Approved!</div>
              <div className="bp-sq-pending-song">{myQueueEntry.songName}</div>
              <div className="bp-sq-pending-status">
                <span className="bp-sq-status-pill approved">Approved</span>
                The RJ is playing your song!
              </div>
              <button className="bp-sq-cancel-btn" style={{ marginTop: 10 }} onClick={handleCancelSongRequest}>
                Done
              </button>
            </div>
          ) : myQueueEntry && myQueueEntry.status === 'rejected' ? (
            <div className="bp-sq-pending-card rejected">
              <div className="bp-sq-pending-title">Request Declined</div>
              <div className="bp-sq-pending-song">{myQueueEntry.songName}</div>
              <div className="bp-sq-pending-status">
                <span className="bp-sq-status-pill rejected">Declined</span>
              </div>
              <button className="bp-sq-cancel-btn" onClick={handleCancelSongRequest} style={{ marginTop: 10 }}>
                Request Another Song
              </button>
            </div>
          ) : (
            <div className="bp-sq-form">
              <div className="bp-sq-field">
                <label className="bp-sq-label-txt">Song Name <span className="bp-sq-required">*</span></label>
                <input
                  className="bp-input"
                  placeholder="e.g. Tum Hi Ho"
                  value={songForm.songName}
                  onChange={e => setSongForm(f => ({ ...f, songName: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div className="bp-sq-field">
                <label className="bp-sq-label-txt">Artist Name <span className="bp-sq-optional">(optional)</span></label>
                <input
                  className="bp-input"
                  placeholder="e.g. Arijit Singh"
                  value={songForm.artist}
                  onChange={e => setSongForm(f => ({ ...f, artist: e.target.value }))}
                  maxLength={80}
                />
              </div>
              <div className="bp-sq-field">
                <label className="bp-sq-label-txt">Message <span className="bp-sq-optional">(optional)</span></label>
                <input
                  className="bp-input"
                  placeholder="A short message for the RJ..."
                  value={songForm.message}
                  onChange={e => setSongForm(f => ({ ...f, message: e.target.value }))}
                  maxLength={160}
                />
              </div>
              <div className="bp-sq-note">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M12 8v1M12 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Only song names are accepted. No links or URLs allowed.
              </div>
              <button
                className="bp-sq-submit-btn"
                onClick={handleSubmitSongRequest}
                disabled={submittingRequest || !songForm.songName.trim() || !rjIsLive}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="sqSend" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#a78bfa"/></linearGradient></defs>
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="url(#sqSend)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {submittingRequest ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          )}
        </div>

        {/* Show approved queue to listeners */}
        {songQueue.filter(r => r.status === 'approved').length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="bp-sq-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="rgba(52,211,153,0.18)"/><path d="M8 12l3 3 5-5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Approved Requests
            </div>
            <div className="bp-sq-list">
              {songQueue.filter(r => r.status === 'approved').map(req => (
                <div key={req.uid} className="bp-sq-item listener">
                  <img
                    className="bp-sq-avatar"
                    src={req.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${req.uid}`}
                    alt={req.username}
                    onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${req.uid}`; }}
                  />
                  <div className="bp-sq-info">
                    <div className="bp-sq-song">{req.songName}</div>
                    {req.artist && <div className="bp-sq-artist">{req.artist}</div>}
                    <div className="bp-sq-meta">
                      <span className="bp-sq-user">{req.username}</span>
                      <span className="bp-sq-dot">·</span>
                      <span className="bp-sq-status-pill approved small">Approved</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ── TAB 3: Announcements ── */
  const renderAnnouncementsTab = () => {
    return (
      <div>
        {/* RJ Send Announcement */}
        {canManageRJ && rjIsLive && (
          <div className="bp-ann-compose-card">
            <div className="bp-ann-compose-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <defs><linearGradient id="annComp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#f472b6"/></linearGradient></defs>
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="url(#annComp)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span>Send Announcement</span>
              <span className="bp-ann-live-pill">
                <span className="bp-ann-live-dot" />
                LIVE
              </span>
            </div>
            <textarea
              className="bp-input bp-ann-textarea"
              placeholder="Type your announcement to all listeners..."
              value={announcementText}
              onChange={e => setAnnouncementText(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <div className="bp-ann-compose-footer">
              <span className="bp-ann-char-count">{announcementText.length}/500</span>
              <button
                className="bp-ann-send-btn"
                onClick={handleSendAnnouncement}
                disabled={sendingAnnouncement || !announcementText.trim()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {sendingAnnouncement ? 'Sending...' : 'Broadcast'}
              </button>
            </div>
          </div>
        )}

        {!rjIsLive && (
          <div className="bp-empty">
            <div style={{ marginBottom: 10, opacity: 0.25 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
            </div>
            Announcements appear here when the RJ is live.
          </div>
        )}

        {/* Announcements list */}
        {announcements.length === 0 && rjIsLive ? (
          <div className="bp-queue-empty" style={{ marginTop: canManageRJ ? 14 : 0 }}>
            No announcements yet. {canManageRJ ? 'Send one above.' : 'The RJ hasn\'t sent any yet.'}
          </div>
        ) : (
          <div className="bp-ann-list">
            {[...announcements].reverse().map(ann => (
              <div key={ann.id} className="bp-ann-card">
                <div className="bp-ann-card-header">
                  <div className="bp-ann-broadcast-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <defs><linearGradient id={`annCard${ann.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#f472b6"/></linearGradient></defs>
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke={`url(#annCard${ann.id})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </div>
                  <img
                    className="bp-ann-card-avatar"
                    src={ann.rjAvatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${ann.rjUid}`}
                    alt={ann.rjName}
                    onError={e => { e.target.src = `https://api.dicebear.com/7.x/thumbs/svg?seed=${ann.rjUid}`; }}
                  />
                  <div className="bp-ann-card-meta">
                    <span className="bp-ann-card-name">{ann.rjName}</span>
                    <span className="bp-ann-card-badge">RJ</span>
                    <span className="bp-ann-card-live">
                      <span className="bp-ann-live-dot" />
                      LIVE
                    </span>
                  </div>
                  <div className="bp-ann-card-right">
                    <span className="bp-ann-card-time">
                      {ann.sentAt ? new Date(ann.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {canManageRJ && (
                      <button
                        className="bp-ann-delete-btn"
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        title="Delete announcement"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <BPAnnTranslated text={ann.message} annId={ann.id + '_card'} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ── TAB 4: Public Broadcasts ── */
  const renderPublicTab = () => {
    const others = publicBroadcasts.filter(b => b.hostUid !== myUid);

    return (
      <div>
        {myActiveBroadcast && (
          <>
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
            {/* Pub broadcaster mic level meter */}
            <div style={{ margin: '0 0 10px', padding: '8px 12px', background: 'rgba(34,197,94,0.08)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <MicIcon muted={pubMicMuted} />
                <span style={{ fontSize: 11, fontWeight: 600, color: pubMicMuted ? '#f87171' : '#34d399' }}>
                  {pubMicMuted ? 'MIC MUTED' : 'MIC LIVE'}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: pubMicLevel > 60 ? '#34d399' : pubMicLevel > 20 ? '#fbbf24' : '#a78bfa' }}>
                  {pubMicMuted ? '—' : pubMicLevel > 60 ? 'Strong' : pubMicLevel > 20 ? 'Good' : 'Low'}
                </span>
                <button
                  onClick={handlePubMicToggle}
                  style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
                    background: pubMicMuted ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                    color: pubMicMuted ? '#f87171' : '#34d399',
                  }}
                >
                  {pubMicMuted ? 'Unmute' : 'Mute'}
                </button>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: pubMicMuted ? '0%' : `${pubMicLevel}%`,
                  background: pubMicLevel > 60 ? '#34d399' : pubMicLevel > 20 ? '#fbbf24' : '#a78bfa',
                  borderRadius: 4,
                  transition: 'width 80ms linear',
                }} />
              </div>
            </div>
          </>
        )}

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
                >
                  <BroadcastIcon size={15} color="white" />
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
                    {/* Connection quality badge for listener */}
                    {listeningTo?.id === bc.id && pubConnState !== 'idle' && (
                      <div style={{ marginBottom: 4, textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '1px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                          background: pubConnState === 'connected' ? 'rgba(52,211,153,0.15)' : pubConnState === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                          color: pubConnState === 'connected' ? '#34d399' : pubConnState === 'failed' ? '#f87171' : '#fbbf24',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', animation: pubConnState === 'connecting' ? 'bp-pulse 1s infinite' : 'none' }} />
                          {pubConnState === 'connected' ? '● Live' : pubConnState === 'failed' ? '✕ Failed' : '○ Connecting'}
                        </span>
                      </div>
                    )}
                    {listeningTo?.id === bc.id && pubAudioBlocked && (
                      <button
                        className="bp-bc-join-btn"
                        style={{ marginBottom: 4, background: 'linear-gradient(135deg,#f59e0b,#d97706)', fontSize: 10 }}
                        onClick={() => {
                          if (pubAudioEl.current) {
                            pubAudioEl.current.play().then(() => setPubAudioBlocked(false)).catch(() => {});
                          }
                        }}
                      >
                        Tap to Hear
                      </button>
                    )}
                    <button
                      className={`bp-bc-join-btn${listeningTo?.id === bc.id ? ' listening' : ''}`}
                      onClick={() => handleJoinPublicBroadcast(bc)}
                      disabled={pubJoining && listeningTo?.id !== bc.id}
                    >
                      {listeningTo?.id === bc.id ? (
                        <><StopIcon color="currentColor" /> Leave</>
                      ) : pubJoining ? 'Joining...' : (
                        <><BroadcastIcon size={12} color="white" /> Join</>
                      )}
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

        {passwordPrompt && (
          <div className="bp-password-modal">
            <div className="bp-password-box">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LockGoldIcon size={20} /> {passwordPrompt.title}</h3>
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

        {/* Hidden YouTube player container */}
        <div className="bp-yt-hidden-player">
          <div ref={ytContainerRef} id="bp-yt-player" />
        </div>

        {/* Header */}
        <div className="bp-header">
          <div className="bp-header-left">
            <div className="bp-header-icon">
              <BroadcastIcon size={22} color="white" />
            </div>
            <div>
              <div className="bp-header-title">Broadcast Studio</div>
              <div className="bp-header-subtitle">
                {rjIsLive ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'bp-pulse 1s infinite', flexShrink: 0 }} />
                    RJ Live
                  </span>
                ) : myActiveBroadcast ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'bp-pulse 1s infinite', flexShrink: 0 }} />
                    On Air
                  </span>
                ) : 'Premium Broadcast'}
              </div>
            </div>
          </div>
          <div className="bp-header-actions">
            <button
              className="bp-minimize-btn"
              onClick={() => setIsMinimized(true)}
              aria-label="Minimize"
              title="Minimize (audio keeps playing)"
            >
              <MinimizeSVGIcon />
            </button>
            <button className="bp-close-btn" onClick={onClose} aria-label="Close" title="Close">
              <CloseSVGIcon />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bp-tabs bp-tabs--six">
          <button
            className={`bp-tab${activeTab === 0 ? ' active' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            <BroadcastIcon size={13} />
            {canManageRJ ? 'Studio' : 'Live'}
            {rjIsLive && <span className="bp-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginLeft: 2 }} />}
          </button>
          <button
            className={`bp-tab${activeTab === 1 ? ' active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            <UsersIcon />
            Stage
            {renderTabBadge(1)}
          </button>
          <button
            className={`bp-tab${activeTab === 2 ? ' active' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            <MusicNoteIcon />
            Songs
            {renderTabBadge(2)}
          </button>
          <button
            className={`bp-tab${activeTab === 3 ? ' active' : ''}`}
            onClick={() => setActiveTab(3)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <defs><linearGradient id="tabAnn" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#f472b6"/></linearGradient></defs>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="url(#tabAnn)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
              <path d="M13.73 21a2 2 0 01-3.46 0" stroke="url(#tabAnn)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
            </svg>
            Updates
            {renderTabBadge(3)}
          </button>
          <button
            className={`bp-tab${activeTab === 4 ? ' active' : ''}`}
            onClick={() => setActiveTab(4)}
          >
            <RadioWaveIcon />
            Public
            {myActiveBroadcast && <span className="bp-live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', marginLeft: 2 }} />}
          </button>
          <button
            className={`bp-tab${activeTab === 5 ? ' active' : ''}`}
            onClick={() => setActiveTab(5)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="tabGift" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f472b6"/>
                  <stop offset="100%" stopColor="#db2777"/>
                </linearGradient>
              </defs>
              <path d="M20 12v-2h-2.18C17.93 9.08 18 8.55 18 8c0-2.21-1.79-4-4-4-1.58 0-2.93.93-3.57 2.27C9.93 4.93 8.58 4 7 4 4.79 4 3 5.79 3 8c0 .55.07 1.08.18 1.58V12H1l3 8h16l3-8h-3z" fill="url(#tabGift)"/>
            </svg>
            Gifts
          </button>
        </div>

        {/* Content */}
        <div className="bp-content">
          {activeTab === 0 && renderRJTab()}
          {activeTab === 1 && renderJoinTab()}
          {activeTab === 2 && renderSongQueueTab()}
          {activeTab === 3 && renderAnnouncementsTab()}
          {activeTab === 4 && renderPublicTab()}
          {activeTab === 5 && (
            <GiftPanel
              rjUid={rjIsLive ? rjBroadcast?.rjUid : null}
              rjName={rjIsLive ? rjBroadcast?.rjName : null}
              rjAvatar={rjIsLive ? rjBroadcast?.rjAvatar : null}
              loggedInUserProfile={loggedInUserProfile}
              roomId={roomId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BroadcastPanel;
