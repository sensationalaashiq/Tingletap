import React, { useState, useEffect, useRef, useCallback } from 'react';
import LiveAvatarImg from './LiveAvatar';
import { getDefaultAvatarUrl, isRealAvatarUpload, isOwnerRole, isRjRole } from '../utils/roleUtils';
import { db, rtdb, auth } from '../firebase/config';
import { translateText as _ttBP, getTranslationSettings as _tsBP, getLanguageName as _glnBP } from '../utils/translationService';
import {
  ref, set, get, update, remove, onValue, onChildAdded, push, off, onDisconnect, increment, serverTimestamp
} from 'firebase/database';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { pt } from '../utils/premiumToast';
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

/* ── Unified Premium Toast Alias (zero duplicate toast styling) ── */
const bpToast = {
  success: (msg) => pt.success(msg),
  error:   (msg) => pt.error(msg),
  mic:     (msg) => pt.mic(msg),
  warning: (msg) => pt.warn(msg),
  info:    (msg) => pt.info(msg),
  live:    (msg) => pt.success(msg),
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
const FloatingMinimizedBubble = ({ onExpand, onClose, isLive, pubIsLive, pubCount = 0 }) => {
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
        <span>{isLive ? 'RJ Live' : pubIsLive ? `Group (${pubCount}/20)` : 'Studio'}</span>
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
    /\/(?:embed|v|shorts|live|e|watch)\/([A-Za-z0-9_-]{11})/,     // /embed/ /v/ /shorts/ /live/ /e/ /watch/ID
    /[?&]vi=([A-Za-z0-9_-]{11})/,                                 // vi= param variant
    /youtube\.com\/attribution_link.*v%3D([A-Za-z0-9_-]{11})/,    // attribution_link format
    /^([A-Za-z0-9_-]{11})$/,                                       // bare 11-char ID pasted directly
  ];
  for (const p of patterns) {
    const m = str.match(p);
    if (m) return m[1];
  }
  const fallback = str.match(/(?:v=|vi=|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/|\/watch\/)([A-Za-z0-9_-]{11})/);
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

const ReplayIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
  </svg>
);

const YouTubeRedBadge = () => (
  <span className="bp-mp-yt-badge" aria-hidden="true">
    <svg viewBox="0 0 10 10" width="8" height="8">
      <path d="M2 1.5l7 3.5-7 3.5z" fill="#ffffff"/>
    </svg>
  </span>
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
  const [ytPlayerState, setYtPlayerState] = useState('stopped'); /* stopped | loading | ready | playing | paused */
  const [ytRemoteState, setYtRemoteState] = useState('stopped');
  const [ytCurrentSongName, setYtCurrentSongName] = useState('');
  const [ytEmbedVideoId, setYtEmbedVideoId] = useState(null);
  const [ytDuration, setYtDuration] = useState(0);
  const [ytCurrentTime, setYtCurrentTime] = useState(0);
  const [ytVizBars, setYtVizBars] = useState(() => new Array(14).fill(18));
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
  /* Kept in sync with speakerMicMuted so the WebRTC reconnect closure (which
     runs outside React's render cycle) always reads the CURRENT mute state
     instead of a stale value captured when the effect first ran. */
  const speakerMicMutedRef = useRef(false);
  const [speakerConnecting, setSpeakerConnecting] = useState(false);
  useEffect(() => { speakerMicMutedRef.current = speakerMicMuted; }, [speakerMicMuted]);

  /* ── Public Group Voice Calls state (supports up to 20 participants per call, unlimited concurrent calls) ── */
  const MAX_PUB_PARTICIPANTS = 20;
  const [publicBroadcasts, setPublicBroadcasts] = useState([]);
  const [myActiveBroadcast, setMyActiveBroadcast] = useState(null);
  const [activePubCall, setActivePubCall] = useState(null);
  const [pubParticipants, setPubParticipants] = useState([]);
  const [pubSpeakingMap, setPubSpeakingMap] = useState({});
  const [pubPeerStates, setPubPeerStates] = useState({});
  const [pubCallDuration, setPubCallDuration] = useState(0);
  const [pubTitle, setPubTitle] = useState('');
  const [pubPassword, setPubPassword] = useState('');
  const [pubIsProtected, setPubIsProtected] = useState(false);
  const [listeningTo, setListeningTo] = useState(null);
  const [passwordPrompt, setPasswordPrompt] = useState(null);
  const [pwInput, setPwInput] = useState('');

  /* ── RJ listener & speaker stage audio state ── */
  const [rjIsListening, setRjIsListening] = useState(false);
  const [rjConnecting, setRjConnecting] = useState(false);
  const [rjAudioBlocked, setRjAudioBlocked] = useState(false);
  const [speakerAudioBlocked, setSpeakerAudioBlocked] = useState(false);
  const [pubAudioBlocked, setPubAudioBlocked] = useState(false);
  const [ytAudioBlocked, setYtAudioBlocked] = useState(false);

  /* ── Go Live / End state ── */
  const [goingLive, setGoingLive] = useState(false);
  const [endingBroadcast, setEndingBroadcast] = useState(false);

  /* ── Independent Volume Controls (0-100%) ── */
  const [rjVoiceVolume, setRjVoiceVolume] = useState(() => {
    try {
      const v = Number(localStorage.getItem('tl_bp_voice_vol'));
      return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 100;
    } catch { return 100; }
  });
  const [musicVolume, setMusicVolume] = useState(() => {
    try {
      const v = Number(localStorage.getItem('tl_bp_music_vol'));
      return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 75;
    } catch { return 75; }
  });
  const [pubCallVolume, setPubCallVolume] = useState(() => {
    try {
      const v = Number(localStorage.getItem('tl_bp_group_vol'));
      return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 100;
    } catch { return 100; }
  });
  const rjVoiceVolumeRef = useRef(rjVoiceVolume);
  const musicVolumeRef = useRef(musicVolume);
  const pubCallVolumeRef = useRef(pubCallVolume);
  const prevVoiceVolRef = useRef(100);
  const prevMusicVolRef = useRef(75);
  const prevPubVolRef = useRef(100);

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

  /* ── Join flash notifications ── */
  const [rjJoinFlashes, setRjJoinFlashes] = useState([]);
  const [pubJoinFlashes, setPubJoinFlashes] = useState([]);
  const rjJoinWatchStartRef = useRef(0);
  const pubJoinWatchStartRef = useRef(0);
  const rjJoinFlashTimersRef = useRef({});
  const pubJoinFlashTimersRef = useRef({});

  /* ── WebRTC refs — RJ broadcaster side ── */
  const rjHostPCs = useRef({});
  const localStream = useRef(null);
  const rjListenersUnsub = useRef(null);
  const rjHostRtdbUnsubs = useRef([]);

  /* ── Audio mixing — RJ side (mixes RJ mic + speaker mics → one stream sent to listeners) ── */
  const rjAudioCtx = useRef(null);
  const rjMixDest = useRef(null);
  const rjLocalSourceNode = useRef(null);
  const rjMicGainNode = useRef(null);
  const rjKeepaliveOscRef = useRef(null);
  const rjKeepaliveGainRef = useRef(null);

  /* ── WebRTC refs — RJ ↔ Speaker bidirectional connections (RJ receives mic & sends mix-minus) ── */
  const rjSpeakerPCs = useRef({});
  const rjSpeakerUnsubs = useRef({});
  const rjSpeakerSourceNodes = useRef({});
  const rjSpeakerGainNodes = useRef({});
  const rjSpeakerReturnDests = useRef({});
  const rjSpeakerMonitorEls = useRef({});

  /* ── WebRTC refs — Speaker side (speaker sends mic to RJ & receives RJ + co-speakers mix-minus) ── */
  const speakerPC = useRef(null);
  const speakerStream = useRef(null);
  const speakerAudioEl = useRef(null);
  const speakerRtdbUnsubs = useRef([]);

  /* ── WebRTC refs — RJ listener side (separate from broadcaster) ── */
  const rjListenerPC = useRef(null);
  const rjAudioEl = useRef(null);
  const rjListenerRtdbUnsubs = useRef([]);

  /* ── WebRTC refs — Public Group Voice Mesh (up to 20 peers per call) ── */
  const pubHostStream = useRef(null);
  const pubHostPCs = useRef({});          /* { [peerUid]: RTCPeerConnection } */
  const pubPeerAudioEls = useRef({});     /* { [peerUid]: HTMLAudioElement } */
  const pubPeerUnsubs = useRef({});       /* { [peerUid]: [unsubFn, ...] } */
  const pubPeerSpeakingCleanups = useRef({}); /* { [peerUid]: () => void } */
  const pubCallRtdbUnsubs = useRef([]);
  const pubPartOdRef = useRef(null);
  const pubListenersUnsub = useRef(null);
  const pubHostRtdbUnsubs = useRef([]);
  const pubListenerPC = useRef(null);
  const pubAudioEl = useRef(null);
  const pubListenerRtdbUnsubs = useRef([]);

  /* ── Public broadcaster mic level refs ── */
  const pubMicLevelCtxRef = useRef(null);
  const pubMicLevelTimerRef = useRef(null);

  /* ── YouTube music-only iframe refs (direct postMessage API — matches main chat player) ── */
  const ytIframeRef = useRef(null);
  const ytIframeLoadedRef = useRef(false);
  const ytVerifyTimerRef = useRef(null);
  const ytHandshakeTimersRef = useRef([]);
  const currentYtVideoIdRef = useRef(null);
  const ytIntendedStateRef = useRef('stopped');
  const ytRealPlayingRef = useRef(false);
  const ytIsMutedRef = useRef(false);
  const ytAudioBlockedRef = useRef(false);
  const ytCurrentTimeRef = useRef(0);
  const ytDurationRef = useRef(0);
  const ytPendingSeekRef = useRef(null);
  const ytRemoteDataRef = useRef(null);
  const ytListenerUserPausedRef = useRef(false);
  const rjIsLiveRef = useRef(false);
  const speakerMapRef = useRef({});
  const rjIsListeningRef = useRef(false);
  const rjConnectingRef = useRef(false);
  const listeningToRef = useRef(null);
  const activePubCallRef = useRef(null);
  const pubParticipantsMapRef = useRef({});

  useEffect(() => { speakerMapRef.current = speakerMap; }, [speakerMap]);
  useEffect(() => { rjIsListeningRef.current = rjIsListening; }, [rjIsListening]);
  useEffect(() => { rjConnectingRef.current = rjConnecting; }, [rjConnecting]);
  useEffect(() => { listeningToRef.current = listeningTo; }, [listeningTo]);
  useEffect(() => { activePubCallRef.current = activePubCall; }, [activePubCall]);
  useEffect(() => { ytAudioBlockedRef.current = ytAudioBlocked; }, [ytAudioBlocked]);

  /* Sync RJ voice volume & Music volume in real time */
  useEffect(() => {
    rjVoiceVolumeRef.current = rjVoiceVolume;
    if (rjVoiceVolume > 0) prevVoiceVolRef.current = rjVoiceVolume;
    try { localStorage.setItem('tl_bp_voice_vol', String(rjVoiceVolume)); } catch {}
    const gainVal = Math.max(0, Math.min(1, rjVoiceVolume / 100));
    if (rjMicGainNode.current && rjAudioCtx.current) {
      try { rjMicGainNode.current.gain.setValueAtTime(gainVal, rjAudioCtx.current.currentTime); } catch {
        rjMicGainNode.current.gain.value = gainVal;
      }
    }
    if (rjAudioEl.current) {
      try {
        rjAudioEl.current.muted = gainVal === 0;
        rjAudioEl.current.volume = gainVal;
      } catch {}
    }
    if (speakerAudioEl.current) {
      try {
        speakerAudioEl.current.muted = gainVal === 0;
        speakerAudioEl.current.volume = gainVal;
      } catch {}
    }
  }, [rjVoiceVolume]);

  useEffect(() => {
    musicVolumeRef.current = musicVolume;
    if (musicVolume > 0) prevMusicVolRef.current = musicVolume;
    try { localStorage.setItem('tl_bp_music_vol', String(musicVolume)); } catch {}
    const win = ytIframeRef.current?.contentWindow;
    if (win) {
      try {
        if (musicVolume === 0) {
          win.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: '' }), '*');
          ytIsMutedRef.current = true;
        } else {
          win.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: '' }), '*');
          win.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [musicVolume] }), '*');
          ytIsMutedRef.current = false;
          if (ytIntendedStateRef.current === 'playing' && !ytRealPlayingRef.current && !ytListenerUserPausedRef.current) {
            win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
          }
          setTimeout(() => {
            if (ytRealPlayingRef.current && !ytIsMutedRef.current) {
              setYtAudioBlocked(false);
            }
          }, 220);
        }
      } catch {}
    }
  }, [musicVolume]);

  useEffect(() => {
    pubCallVolumeRef.current = pubCallVolume;
    if (pubCallVolume > 0) prevPubVolRef.current = pubCallVolume;
    try { localStorage.setItem('tl_bp_group_vol', String(pubCallVolume)); } catch {}
    const vol = Math.max(0, Math.min(1, pubCallVolume / 100));
    Object.values(pubPeerAudioEls.current).forEach(el => {
      try { if (el) el.volume = vol; } catch {}
    });
    if (pubAudioEl.current) {
      try { pubAudioEl.current.volume = vol; } catch {}
    }
  }, [pubCallVolume]);

  /* Duration timer for active public group call */
  useEffect(() => {
    if (!activePubCall?.startedAt) { setPubCallDuration(0); return; }
    const tick = () => setPubCallDuration(Math.max(0, Math.floor((Date.now() - activePubCall.startedAt) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [activePubCall?.id, activePubCall?.startedAt]);

  /* ── onDisconnect refs (keep handle to cancel if needed) ── */
  const rjOnDisconnectRef = useRef(null);
  const pubOnDisconnectRef = useRef(null);

  /* ── Auto-resume guard: only attempt once per mount ── */
  const autoResumeAttempted = useRef(false);

  /* ── Permission flags ── */
  const myUid = auth.currentUser?.uid || loggedInUserProfile?.uid;
  const isRJ = isOwnerRole(loggedInUserProfile) || isRjRole(loggedInUserProfile);
  const canManageRJ = isRJ && (!rjIsLive || !rjBroadcast?.rjUid || rjBroadcast.rjUid === myUid);
  const isGuest = loggedInUserProfile?.isGuest === true || loggedInUserProfile?.role === 'guest';
  const myName = loggedInUserProfile?.username || loggedInUserProfile?.displayName || 'User';
  const myPhoto = loggedInUserProfile?.photoURL || '';

  /* ══════════════════════════════════════
     YOUTUBE MUSIC-ONLY PLAYER HELPERS
     (Uses direct iframe + postMessage command API — identical to main chat CustomAudioPlayer)
  ══════════════════════════════════════ */

  const sendYtCommand = useCallback((func, args = '') => {
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return false;
    try {
      win.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
      return true;
    } catch {
      return false;
    }
  }, []);

  const sendYtListeningHandshake = useCallback(() => {
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: 'listening', id: 'bp-yt-music', channel: 'widget' }), '*');
    } catch {}
  }, []);

  const applyYtVolume = useCallback(() => {
    if (musicVolumeRef.current === 0) {
      sendYtCommand('mute', '');
      ytIsMutedRef.current = true;
    } else {
      sendYtCommand('unMute', '');
      sendYtCommand('setVolume', [musicVolumeRef.current]);
      ytIsMutedRef.current = false;
    }
  }, [sendYtCommand]);

  const verifyYtAudible = useCallback((delayMs = 1400) => {
    if (ytVerifyTimerRef.current) {
      clearTimeout(ytVerifyTimerRef.current);
      ytVerifyTimerRef.current = null;
    }
    ytVerifyTimerRef.current = setTimeout(() => {
      if (ytIntendedStateRef.current !== 'playing' || ytListenerUserPausedRef.current) return;
      if (!ytRealPlayingRef.current || (musicVolumeRef.current > 0 && ytIsMutedRef.current)) {
        setYtAudioBlocked(true);
        setYtPlayerState(prev => (prev === 'playing' ? 'ready' : prev));
      } else {
        setYtAudioBlocked(false);
        setYtPlayerState('playing');
      }
    }, delayMs);
  }, []);

  const handleYtIframeLoad = useCallback(() => {
    ytIframeLoadedRef.current = true;
    ytHandshakeTimersRef.current.forEach(t => clearTimeout(t));
    ytHandshakeTimersRef.current = [];

    sendYtListeningHandshake();
    ytHandshakeTimersRef.current.push(
      setTimeout(() => sendYtListeningHandshake(), 250),
      setTimeout(() => sendYtListeningHandshake(), 750)
    );

    applyYtVolume();

    if (ytPendingSeekRef.current != null && ytPendingSeekRef.current > 0.5) {
      sendYtCommand('seekTo', [ytPendingSeekRef.current, true]);
    }

    if (ytIntendedStateRef.current === 'playing' && !ytListenerUserPausedRef.current) {
      sendYtCommand('playVideo', '');
      verifyYtAudible(1400);
    } else {
      setYtPlayerState(prev => (prev === 'loading' ? 'ready' : prev));
    }
  }, [sendYtListeningHandshake, applyYtVolume, sendYtCommand, verifyYtAudible]);

  /* Listen for YouTube embed postMessage events (onReady, infoDelivery, onError) */
  useEffect(() => {
    const onYtMessage = (event) => {
      if (!ytIframeRef.current || event.source !== ytIframeRef.current.contentWindow) return;
      let payload = event.data;
      if (typeof payload === 'string') {
        if (!payload.startsWith('{')) return;
        try { payload = JSON.parse(payload); } catch { return; }
      }
      if (!payload || typeof payload !== 'object') return;

      if (payload.event === 'onReady') {
        ytIframeLoadedRef.current = true;
        applyYtVolume();
        if (ytPendingSeekRef.current != null && ytPendingSeekRef.current > 0.5) {
          sendYtCommand('seekTo', [ytPendingSeekRef.current, true]);
          ytPendingSeekRef.current = null;
        }
        if (ytIntendedStateRef.current === 'playing' && !ytListenerUserPausedRef.current) {
          sendYtCommand('playVideo', '');
          verifyYtAudible(1200);
        } else {
          setYtPlayerState(prev => (prev === 'loading' ? 'ready' : prev));
        }
        return;
      }

      if (payload.event === 'onError') {
        ytRealPlayingRef.current = false;
        setYtAudioBlocked(false);
        setYtPlayerState('paused');
        bpToast.warning('This YouTube track blocks embedded playback. Try another YouTube / YT Music link.');
        return;
      }

      if (payload.event === 'infoDelivery' && payload.info) {
        const info = payload.info;
        if (typeof info.duration === 'number' && isFinite(info.duration) && info.duration > 0) {
          ytDurationRef.current = info.duration;
          setYtDuration(info.duration);
        }
        if (typeof info.currentTime === 'number' && isFinite(info.currentTime) && info.currentTime >= 0) {
          ytCurrentTimeRef.current = info.currentTime;
          setYtCurrentTime(info.currentTime);
        }
        if (typeof info.muted === 'boolean') {
          ytIsMutedRef.current = info.muted;
        }
        if (typeof info.playerState === 'number') {
          const st = info.playerState;
          if (st === 1) {
            ytRealPlayingRef.current = true;
            if (musicVolumeRef.current > 0 && info.muted === true) {
              sendYtCommand('unMute', '');
              sendYtCommand('setVolume', [musicVolumeRef.current]);
              setTimeout(() => {
                if (ytIsMutedRef.current && musicVolumeRef.current > 0) {
                  setYtAudioBlocked(true);
                  setYtPlayerState('ready');
                } else {
                  setYtAudioBlocked(false);
                  setYtPlayerState('playing');
                }
              }, 260);
            } else {
              setYtAudioBlocked(false);
              setYtPlayerState('playing');
            }
          } else if (st === 2) {
            ytRealPlayingRef.current = false;
            if (ytIntendedStateRef.current === 'playing' && !ytListenerUserPausedRef.current) {
              setYtPlayerState('ready');
            } else {
              setYtPlayerState('paused');
              setYtAudioBlocked(false);
            }
          } else if (st === 3) {
            setYtAudioBlocked(false);
          } else if (st === 0) {
            ytRealPlayingRef.current = false;
            ytIntendedStateRef.current = 'stopped';
            ytCurrentTimeRef.current = 0;
            setYtCurrentTime(0);
            setYtPlayerState('stopped');
            setYtAudioBlocked(false);
          } else if (st === 5 || st === -1) {
            ytRealPlayingRef.current = false;
            setYtPlayerState(prev => (prev === 'playing' ? 'ready' : prev));
          }
        }
      }
    };
    window.addEventListener('message', onYtMessage);
    return () => window.removeEventListener('message', onYtMessage);
  }, [applyYtVolume, sendYtCommand, verifyYtAudible]);

  /* Animate visualizer bars + keep progress counter smooth while actively playing */
  useEffect(() => {
    if (ytPlayerState !== 'playing') {
      setYtVizBars(new Array(14).fill(18));
      return;
    }
    const vizTimer = setInterval(() => {
      setYtVizBars(prev => prev.map(() => Math.round(20 + Math.random() * 78)));
    }, 140);
    const secTimer = setInterval(() => {
      setYtCurrentTime(prev => {
        const dur = ytDurationRef.current;
        const next = dur ? Math.min(prev + 1, dur) : prev + 1;
        ytCurrentTimeRef.current = next;
        return next;
      });
    }, 1000);
    return () => {
      clearInterval(vizTimer);
      clearInterval(secTimer);
    };
  }, [ytPlayerState]);

  const initYtPlayer = useCallback((videoId, startSeconds = 0) => {
    if (!videoId) return;
    const seekSec = Math.max(0, Math.floor(startSeconds || 0));
    if (currentYtVideoIdRef.current === videoId && ytIframeLoadedRef.current && ytIframeRef.current?.contentWindow) {
      ytPendingSeekRef.current = null;
      sendYtListeningHandshake();
      applyYtVolume();
      sendYtCommand('seekTo', [seekSec, true]);
      ytCurrentTimeRef.current = seekSec;
      setYtCurrentTime(seekSec);
      if (ytIntendedStateRef.current === 'playing' && !ytListenerUserPausedRef.current) {
        sendYtCommand('playVideo', '');
        verifyYtAudible(1100);
      }
      return;
    }
    currentYtVideoIdRef.current = videoId;
    ytIframeLoadedRef.current = false;
    ytRealPlayingRef.current = false;
    ytIsMutedRef.current = false;
    ytPendingSeekRef.current = seekSec;
    ytCurrentTimeRef.current = seekSec;
    setYtCurrentTime(seekSec);
    setYtDuration(0);
    ytDurationRef.current = 0;
    setYtAudioBlocked(false);
    setYtPlayerState('loading');
    setYtEmbedVideoId(videoId);
  }, [sendYtListeningHandshake, applyYtVolume, sendYtCommand, verifyYtAudible]);

  const syncYouTubePlayer = useCallback((ytData) => {
    if (!ytData) return;
    ytRemoteDataRef.current = ytData;
    const { state, videoId, seekTo, updatedAt } = ytData;
    const nextState = state || 'stopped';
    const prevRemote = ytIntendedStateRef.current;
    ytIntendedStateRef.current = nextState;
    setYtRemoteState(nextState);

    if (prevRemote !== nextState && nextState === 'playing') {
      ytListenerUserPausedRef.current = false;
    }

    if (!videoId) {
      currentYtVideoIdRef.current = null;
      ytRealPlayingRef.current = false;
      setYtEmbedVideoId(null);
      setYtPlayerState('stopped');
      setYtAudioBlocked(false);
      return;
    }

    const driftSecs = updatedAt ? Math.max(0, (Date.now() - updatedAt) / 1000) : 0;
    const adjustedSeek = nextState === 'playing' ? (seekTo || 0) + driftSecs : (seekTo || 0);

    if (currentYtVideoIdRef.current !== videoId || !ytIframeRef.current?.contentWindow) {
      initYtPlayer(videoId, adjustedSeek);
      return;
    }

    if (!ytIframeLoadedRef.current) {
      ytPendingSeekRef.current = adjustedSeek;
      return;
    }

    if (nextState === 'playing') {
      if (ytListenerUserPausedRef.current) return;
      const curTime = ytCurrentTimeRef.current || 0;
      if (Math.abs(curTime - adjustedSeek) > 3.5) {
        sendYtCommand('seekTo', [adjustedSeek, true]);
        ytCurrentTimeRef.current = adjustedSeek;
        setYtCurrentTime(adjustedSeek);
      }
      applyYtVolume();
      if (!ytRealPlayingRef.current) {
        sendYtListeningHandshake();
        sendYtCommand('playVideo', '');
        verifyYtAudible(1200);
      } else if (musicVolumeRef.current > 0 && ytIsMutedRef.current) {
        setYtAudioBlocked(true);
      } else {
        setYtAudioBlocked(false);
      }
    } else if (nextState === 'paused') {
      sendYtCommand('seekTo', [seekTo || 0, true]);
      sendYtCommand('pauseVideo', '');
      ytRealPlayingRef.current = false;
      ytCurrentTimeRef.current = seekTo || 0;
      setYtCurrentTime(seekTo || 0);
      setYtPlayerState('paused');
      setYtAudioBlocked(false);
    } else if (nextState === 'stopped') {
      sendYtCommand('stopVideo', '');
      ytRealPlayingRef.current = false;
      ytCurrentTimeRef.current = 0;
      setYtCurrentTime(0);
      setYtPlayerState('stopped');
      setYtAudioBlocked(false);
    }
  }, [initYtPlayer, sendYtCommand, sendYtListeningHandshake, applyYtVolume, verifyYtAudible]);

  /* ══════════════════════════════════════
     FIREBASE LISTENERS
  ══════════════════════════════════════ */

  const initYtPlayerRef = useRef(initYtPlayer);
  const syncYouTubePlayerRef = useRef(syncYouTubePlayer);
  const canManageRJRef = useRef(canManageRJ);
  const iAmSpeakerRef = useRef(iAmSpeaker);
  initYtPlayerRef.current = initYtPlayer;
  syncYouTubePlayerRef.current = syncYouTubePlayer;
  canManageRJRef.current = canManageRJ;
  iAmSpeakerRef.current = iAmSpeaker;

  /* ── RJ Broadcast RTDB listener — always-on (no isOpen guard, stable [myUid] deps) ── */
  useEffect(() => {
    const bcRef = ref(rtdb, 'broadcasts/rj');
    const unsub = onValue(bcRef, (snap) => {
      const data = snap.val();
      const isTooOldRJ = data?.startedAt && (Date.now() - data.startedAt > 8 * 3600 * 1000);
      if (isTooOldRJ) {
        remove(ref(rtdb, 'broadcasts/rj')).catch(() => {});
        setRjBroadcast(null);
        setRjIsLive(false);
        rjIsLiveRef.current = false;
        setListenerCount(0);
        setSpeakerMap({});
        setIAmSpeaker(false);
        setYtRemoteState('stopped');
        setYtPlayerState('stopped');
        setYtCurrentSongName('');
        setYtEmbedVideoId(null);
        currentYtVideoIdRef.current = null;
        return;
      }

      setRjBroadcast(data);
      const live = !!(data && data.isLive);
      setRjIsLive(live);
      rjIsLiveRef.current = live;
      if (data) {
        setListenerCount(data.listenerCount || 0);
        setSpeakerMap(data.speakers || {});
        const ytRemote = data.youtube?.state || 'stopped';
        setYtRemoteState(ytRemote);
        setYtCurrentSongName(data.youtube?.songName || '');
        ytRemoteDataRef.current = data.youtube || null;

        const isHostActing = Boolean(isRJ && (!live || !data.rjUid || data.rjUid === myUid));
        if (data.youtube?.videoId) {
          if (!isHostActing && (rjIsListeningRef.current || iAmSpeakerRef.current)) {
            syncYouTubePlayerRef.current?.(data.youtube);
          } else if (currentYtVideoIdRef.current !== data.youtube.videoId) {
            ytIntendedStateRef.current = ytRemote;
            initYtPlayerRef.current?.(data.youtube.videoId, data.youtube.seekTo || 0);
          }
        } else if (currentYtVideoIdRef.current) {
          currentYtVideoIdRef.current = null;
          ytRealPlayingRef.current = false;
          setYtEmbedVideoId(null);
          setYtPlayerState('stopped');
        }
        if (myUid && data.speakers && data.speakers[myUid]) {
          setIAmSpeaker(true);
        } else {
          setIAmSpeaker(false);
        }
      } else {
        if (rjIsListeningRef.current) {
          _rjCleanupListenerSide(false);
          setRjIsListening(false);
        }
        setListenerCount(0);
        setSpeakerMap({});
        setIAmSpeaker(false);
        setYtRemoteState('stopped');
        setYtPlayerState('stopped');
        setYtCurrentSongName('');
        setYtAudioBlocked(false);
        setYtEmbedVideoId(null);
        currentYtVideoIdRef.current = null;
        ytRealPlayingRef.current = false;
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUid]);

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

  /* ── RJ broadcast: detect new listeners joining → show flash notification (host only) ── */
  useEffect(() => {
    if (!isOpen || !rjIsLive || !canManageRJ) return;
    rjJoinWatchStartRef.current = Date.now();
    const lisRef = ref(rtdb, 'broadcasts/rj/listeners');
    const unsub = onChildAdded(lisRef, (snap) => {
      const data = snap.val();
      if (!data || !data.name) return;
      if (data.joinedAt && data.joinedAt < rjJoinWatchStartRef.current - 3000) return;
      const uid = snap.key;
      if (uid === myUid) return;
      const flashId = `rj_${uid}_${Date.now()}`;
      setRjJoinFlashes(prev => [...prev.slice(-2), { id: flashId, name: data.name, uid }]);
      const timer = setTimeout(() => {
        setRjJoinFlashes(prev => prev.filter(f => f.id !== flashId));
        delete rjJoinFlashTimersRef.current[flashId];
      }, 10000);
      rjJoinFlashTimersRef.current[flashId] = timer;
    });
    return () => {
      unsub();
      Object.values(rjJoinFlashTimersRef.current).forEach(t => clearTimeout(t));
      rjJoinFlashTimersRef.current = {};
      setRjJoinFlashes([]);
    };
  }, [isOpen, rjIsLive, myUid]);

  /* ── Public broadcast: detect new listeners joining → show flash notification ── */
  useEffect(() => {
    if (!isOpen || !myActiveBroadcast) return;
    const broadcastId = myActiveBroadcast.id;
    pubJoinWatchStartRef.current = Date.now();
    const lisRef = ref(rtdb, `broadcasts/public/${broadcastId}/listeners`);
    const unsub = onChildAdded(lisRef, (snap) => {
      const data = snap.val();
      if (!data || !data.name) return;
      if (data.joinedAt && data.joinedAt < pubJoinWatchStartRef.current - 3000) return;
      const uid = snap.key;
      if (uid === myUid) return;
      const flashId = `pub_${uid}_${Date.now()}`;
      setPubJoinFlashes(prev => [...prev.slice(-2), { id: flashId, name: data.name, uid }]);
      const timer = setTimeout(() => {
        setPubJoinFlashes(prev => prev.filter(f => f.id !== flashId));
        delete pubJoinFlashTimersRef.current[flashId];
      }, 10000);
      pubJoinFlashTimersRef.current[flashId] = timer;
    });
    return () => {
      unsub();
      Object.values(pubJoinFlashTimersRef.current).forEach(t => clearTimeout(t));
      pubJoinFlashTimersRef.current = {};
      setPubJoinFlashes([]);
    };
  }, [isOpen, myActiveBroadcast?.id, myUid]);

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
    if (canManageRJ) return;
    const ytRef = ref(rtdb, 'broadcasts/rj/youtube');
    const unsub = onValue(ytRef, (snap) => {
      const yt = snap.val();
      if (!yt) return;
      syncYouTubePlayer(yt);
    });
    return () => unsub();
  }, [canManageRJ, syncYouTubePlayer]);

  /* ── Broadcaster: periodic seek position push every 5 s ONLY when genuinely playing ── */
  useEffect(() => {
    if (!canManageRJ || !rjIsLive) return;
    const interval = setInterval(() => {
      if (ytIntendedStateRef.current !== 'playing' || !ytRealPlayingRef.current) return;
      const cur = ytCurrentTimeRef.current || 0;
      update(ref(rtdb, 'broadcasts/rj/youtube'), {
        state: 'playing',
        seekTo: cur,
        updatedAt: Date.now(),
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [canManageRJ, rjIsLive]);

  /* ── YouTube playback keepalive — nudges gently when suspended in background, respects blocked/manual pause ── */
  useEffect(() => {
    const interval = setInterval(() => {
      if (!rjIsLiveRef.current) return;
      if (ytIntendedStateRef.current !== 'playing') return;
      if (ytAudioBlockedRef.current || ytListenerUserPausedRef.current) return;
      if (!ytIframeLoadedRef.current || !ytIframeRef.current?.contentWindow) return;
      if (!ytRealPlayingRef.current) {
        sendYtCommand('playVideo', '');
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [sendYtCommand]);

  /* ── AudioContext keepalive + user-gesture resume for RJ voice + stage audio ── */
  useEffect(() => {
    if (!rjIsLive) return;
    const ensureActive = () => {
      if (rjAudioCtx.current && rjAudioCtx.current.state === 'suspended') {
        rjAudioCtx.current.resume().catch(() => {});
      }
      if (rjAudioEl.current && rjIsListeningRef.current && rjAudioEl.current.paused) {
        rjAudioEl.current.play().catch(() => {});
      }
    };
    const iv = setInterval(ensureActive, 3000);
    window.addEventListener('pointerdown', ensureActive, { passive: true });
    window.addEventListener('keydown', ensureActive, { passive: true });
    return () => {
      clearInterval(iv);
      window.removeEventListener('pointerdown', ensureActive);
      window.removeEventListener('keydown', ensureActive);
    };
  }, [rjIsLive]);

  /* ── MediaSession API — tells OS / browser this is active audio media ── */
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const isLive = rjIsLiveRef.current || rjIsLive;
    if (isLive) {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: ytCurrentSongName || 'TingleTap Live Radio',
          artist: rjBroadcast?.rjName ? `RJ ${rjBroadcast.rjName} · TingleTap Broadcast` : 'TingleTap Broadcast',
          album: 'Live Show',
        });
        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.setActionHandler('play', () => {
          sendYtCommand('playVideo', '');
          rjAudioEl.current?.play?.().catch(() => {});
          if (rjAudioCtx.current?.state === 'suspended') {
            rjAudioCtx.current.resume().catch(() => {});
          }
        });
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
      } catch {}
    } else {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch {}
    }
  }, [rjIsLive, ytCurrentSongName, rjBroadcast?.rjName, sendYtCommand]);

  /* ── Visibility / Focus / PageShow: uninterrupted background audio & quick resume ── */
  useEffect(() => {
    const handleResume = async () => {
      if (!rjIsLiveRef.current) return;

      if (rjAudioCtx.current && rjAudioCtx.current.state === 'suspended') {
        rjAudioCtx.current.resume().catch(() => {});
      }

      if (ytIframeLoadedRef.current && ytIntendedStateRef.current === 'playing' && !ytAudioBlockedRef.current && !ytListenerUserPausedRef.current) {
        if (!ytRealPlayingRef.current) {
          sendYtCommand('playVideo', '');
        }
      }

      const audio = rjAudioEl.current;
      if (audio && !canManageRJ && rjIsListeningRef.current) {
        try {
          audio.volume = Math.max(0, Math.min(1, rjVoiceVolumeRef.current / 100));
          if (audio.paused) {
            audio.play().catch(() => {});
          }
        } catch {}
      }

      if (document.visibilityState && document.visibilityState !== 'visible') return;

      if (canManageRJ && ytIframeLoadedRef.current && ytIntendedStateRef.current === 'playing' && ytRealPlayingRef.current) {
        const cur = ytCurrentTimeRef.current || 0;
        update(ref(rtdb, 'broadcasts/rj/youtube'), {
          state: 'playing',
          seekTo: cur,
          updatedAt: Date.now(),
        }).catch(() => {});
      }

      if (!canManageRJ) {
        try {
          const snap = await get(ref(rtdb, 'broadcasts/rj/youtube'));
          const yt = snap.val();
          if (yt) {
            syncYouTubePlayer(yt);
          }
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);
    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
    };
  }, [canManageRJ, syncYouTubePlayer, sendYtCommand]);

  /* ── Public broadcasts Firestore listener (always-on for badge count & Public tab visibility) ── */
  useEffect(() => {
    const q = query(collection(db, 'publicBroadcasts'), where('isLive', '==', true));
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const now = Date.now();
      const verifiedList = [];

      for (const bc of list) {
        const isPastMaxAge = bc.startedAt && (now - bc.startedAt > 6 * 3600 * 1000);
        const isHostOrStaff = Boolean(myUid && (bc.hostUid === myUid || isRJ));

        // Auto-purge broadcasts older than 6 hours (only host or staff mutates shared doc)
        if (isPastMaxAge) {
          if (isHostOrStaff) {
            updateDoc(doc(db, 'publicBroadcasts', bc.id), { isLive: false }).catch(() => {});
            remove(ref(rtdb, `broadcasts/public/${bc.id}`)).catch(() => {});
          }
          continue;
        }

        // Cross-verify with RTDB session node ONLY after 30s grace window so new calls
        // are immediately visible to everyone before RTDB settles, and non-hosts never kill live calls.
        const isPastGrace = bc.startedAt && (now - bc.startedAt > 30000);
        if (isPastGrace) {
          try {
            const rtdbSnap = await get(ref(rtdb, `broadcasts/public/${bc.id}/session`));
            if (!rtdbSnap.exists()) {
              if (isHostOrStaff) {
                updateDoc(doc(db, 'publicBroadcasts', bc.id), { isLive: false }).catch(() => {});
                remove(ref(rtdb, `broadcasts/public/${bc.id}`)).catch(() => {});
              }
              continue;
            }
          } catch {
            if (bc.startedAt && (now - bc.startedAt > 3600 * 1000)) continue;
          }
        }

        verifiedList.push(bc);
      }

      setPublicBroadcasts(verifiedList);
      if (myUid) {
        const mine = verifiedList.find(b => b.hostUid === myUid);
        setMyActiveBroadcast(mine || null);
      }
    }, (error) => {
      if (error?.code !== 'permission-denied') {
        console.warn('publicBroadcasts onSnapshot error:', error);
      }
    });
    return () => unsub();
  }, [myUid, isRJ]);

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

  /* ── RJ side: auto-recover broadcaster pipeline if RJ refreshed while still live ── */
  const rjHostRecoveryRef = useRef(false);
  useEffect(() => {
    if (!canManageRJ || !rjIsLive || !myUid || rjBroadcast?.rjUid !== myUid) {
      rjHostRecoveryRef.current = false;
      return;
    }
    if (rjListenersUnsub.current && localStream.current) return;
    if (rjHostRecoveryRef.current) return;
    rjHostRecoveryRef.current = true;
    (async () => {
      try {
        if (!localStream.current) {
          await startLocalMic().catch(() => {});
        }
        ensureRjAudioMixer();
        if (!rjListenersUnsub.current) {
          rjStartListenerWatcher();
        }
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageRJ, rjIsLive, myUid, rjBroadcast?.rjUid]);

  /* ── Speaker side: when iAmSpeaker becomes true, grab mic and open two-way audio with RJ ── */
  useEffect(() => {
    if (!myUid || canManageRJ) return;

    if (!iAmSpeaker) {
      /* Cleanup when removed from stage */
      if (speakerPC.current) { try { speakerPC.current.close(); } catch {} speakerPC.current = null; }
      if (speakerStream.current) { speakerStream.current.getTracks().forEach(t => t.stop()); speakerStream.current = null; }
      if (speakerAudioEl.current) {
        try { speakerAudioEl.current.pause(); speakerAudioEl.current.srcObject = null; } catch {}
      }
      speakerRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
      speakerRtdbUnsubs.current = [];
      setSpeakerConnecting(false);
      setSpeakerMicMuted(false);
      setSpeakerAudioBlocked(false);
      if (rjAudioEl.current && rjIsListeningRef.current) {
        try {
          const vol = Math.max(0, Math.min(1, rjVoiceVolumeRef.current / 100));
          rjAudioEl.current.muted = vol === 0;
          rjAudioEl.current.volume = vol;
          rjAudioEl.current.play().catch(() => {});
        } catch {}
      }
      return;
    }

    /* Pause listener broadcast stream while on stage so Speaker never hears their own voice echoed */
    if (rjAudioEl.current) {
      try {
        rjAudioEl.current.pause();
        rjAudioEl.current.muted = true;
      } catch {}
    }

    /* Ensure stage presence cleans up cleanly if speaker's tab drops unexpectedly */
    try {
      onDisconnect(ref(rtdb, `broadcasts/rj/speakers/${myUid}`)).remove();
    } catch {}

    /* Pre-create stage audio element for incoming RJ + co-speaker mix-minus */
    if (!speakerAudioEl.current) {
      const stageAudio = new Audio();
      stageAudio.autoplay = true;
      stageAudio.playsInline = true;
      speakerAudioEl.current = stageAudio;
    }

    /* iAmSpeaker = true — start mic and signal two-way audio to RJ */
    let cancelled = false;
    const startSpeakerMode = async () => {
      setSpeakerConnecting(true);
      setSpeakerAudioBlocked(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100 },
          video: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        speakerStream.current = stream;
        setSpeakerMicMuted(false);

        const connectToRJ = () => {
          if (cancelled) return;
          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          speakerPC.current = pc;

          /* Re-apply current mute state onto the fresh track set so a reconnect
             preserves the user's mic mute selection. */
          stream.getAudioTracks().forEach(t => { t.enabled = !speakerMicMutedRef.current; });
          /* Send speaker mic tracks to RJ */
          stream.getTracks().forEach(t => pc.addTrack(t, stream));

          /* Receive RJ + co-speakers mix-minus audio so two-way conversation works */
          pc.ontrack = (ev) => {
            try {
              if (!speakerAudioEl.current) {
                const el = new Audio();
                el.autoplay = true;
                el.playsInline = true;
                speakerAudioEl.current = el;
              }
              const vol = Math.max(0, Math.min(1, rjVoiceVolumeRef.current / 100));
              speakerAudioEl.current.muted = vol === 0;
              speakerAudioEl.current.volume = vol;
              speakerAudioEl.current.srcObject = ev.streams?.[0] || new MediaStream([ev.track]);
              speakerAudioEl.current.play()
                .then(() => setSpeakerAudioBlocked(false))
                .catch(() => setSpeakerAudioBlocked(true));
            } catch (err) {
              console.warn('Speaker stage receive playback error:', err);
            }
          };

          /* Send our ICE candidates to RJ */
          pc.onicecandidate = (e) => {
            if (e.candidate) {
              push(ref(rtdb, `broadcasts/rj/speakerConnections/${myUid}/speakerCandidates`), e.candidate.toJSON()).catch(() => {});
            }
          };

          pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            if (s === 'connected') setSpeakerConnecting(false);
            if ((s === 'failed' || s === 'disconnected') && speakerPC.current === pc && !cancelled) {
              setTimeout(() => {
                if (speakerPC.current === pc && !cancelled) {
                  try { pc.close(); } catch {}
                  speakerRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
                  speakerRtdbUnsubs.current = [];
                  setSpeakerConnecting(true);
                  remove(ref(rtdb, `broadcasts/rj/speakerConnections/${myUid}/answer`)).catch(() => {});
                  connectToRJ();
                }
              }, 2500);
            }
          };

          /* Watch for RJ's offer (track offerId nonce to ignore stale pre-reconnect offers) */
          let remoteDescReady = false;
          let handledOfferId = null;
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
            if (!offer || pc !== speakerPC.current || pc.signalingState === 'closed' || pc.remoteDescription) return;
            const oid = offer.offerId || offer.sdp;
            if (handledOfferId === oid) return;
            handledOfferId = oid;
            try {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: offer.type, sdp: offer.sdp }));
              remoteDescReady = true;
              await drainPending();
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await set(ref(rtdb, `broadcasts/rj/speakerConnections/${myUid}/answer`), {
                type: answer.type,
                sdp: answer.sdp,
                offerId: offer.offerId || null,
              });
              setSpeakerConnecting(false);
              bpToast.mic('You are now live on stage! Two-way audio is active.');
            } catch (err) {
              handledOfferId = null;
              console.warn('Speaker answer error:', err);
            }
          });
          speakerRtdbUnsubs.current.push(unsubOffer);

          /* Watch for RJ's ICE candidates */
          const unsubHC = onChildAdded(ref(rtdb, `broadcasts/rj/speakerConnections/${myUid}/rjCandidates`), snap => {
            const c = snap.val();
            if (!c || pc !== speakerPC.current) return;
            if (remoteDescReady) {
              pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            } else {
              pendingCands.push(c);
            }
          });
          speakerRtdbUnsubs.current.push(unsubHC);
        };

        connectToRJ();

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
      if (speakerAudioEl.current) {
        try { speakerAudioEl.current.pause(); speakerAudioEl.current.srcObject = null; } catch {}
      }
      speakerRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
      speakerRtdbUnsubs.current = [];
      setSpeakerAudioBlocked(false);
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
      if (existing.connectionState !== 'failed' && existing.connectionState !== 'disconnected' && existing.signalingState !== 'closed') return;
      try { existing.close(); } catch {}
      delete rjHostPCs.current[listenerUid];
    }

    ensureRjAudioMixer();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    rjHostPCs.current[listenerUid] = pc;

    /* Add mixed stream tracks (RJ mic + any accepted speakers) to this connection.
       Fall back to raw localStream if AudioContext mixer wasn't initialised. */
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
        setTimeout(() => {
          if (rjHostPCs.current[listenerUid] === pc) {
            try { pc.close(); } catch {}
            delete rjHostPCs.current[listenerUid];
            rjCreateOfferForListener(listenerUid).catch(() => {});
          }
        }, 2000);
      }
    };

    let remoteDescReady = false;
    const pendingCandidates = [];
    const drainPending = async () => {
      for (const c of pendingCandidates) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      pendingCandidates.length = 0;
    };

    const offerId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await update(ref(rtdb, `broadcasts/rj/connections/${listenerUid}`), {
      offer: { type: offer.type, sdp: offer.sdp, offerId },
      answer: null,
      hostCandidates: null,
      listenerCandidates: null,
    }).catch(() => {});

    const unsubAns = onValue(ref(rtdb, `broadcasts/rj/connections/${listenerUid}/answer`), async snap => {
      const ans = snap.val();
      if (!ans || pc !== rjHostPCs.current[listenerUid] || pc.signalingState === 'closed' || pc.remoteDescription) return;
      if (ans.offerId && ans.offerId !== offerId) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: ans.type, sdp: ans.sdp }));
        remoteDescReady = true;
        await drainPending();
      } catch {}
    });
    rjHostRtdbUnsubs.current.push(unsubAns);

    /* Buffer early listener ICE candidates until remoteDescription is set */
    const unsubLC = onChildAdded(ref(rtdb, `broadcasts/rj/connections/${listenerUid}/listenerCandidates`), snap => {
      const c = snap.val();
      if (!c || pc !== rjHostPCs.current[listenerUid]) return;
      if (remoteDescReady) {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      } else {
        pendingCandidates.push(c);
      }
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

    /* Cleanup speaker bidirectional connections */
    Object.values(rjSpeakerUnsubs.current).forEach(unsubs => {
      unsubs.forEach(u => { try { u(); } catch {} });
    });
    rjSpeakerUnsubs.current = {};
    Object.values(rjSpeakerPCs.current).forEach(pc => { try { pc.close(); } catch {} });
    rjSpeakerPCs.current = {};
    Object.values(rjSpeakerSourceNodes.current).forEach(node => { try { node.disconnect(); } catch {} });
    rjSpeakerSourceNodes.current = {};
    Object.values(rjSpeakerGainNodes.current).forEach(node => { try { node.disconnect(); } catch {} });
    rjSpeakerGainNodes.current = {};
    Object.values(rjSpeakerReturnDests.current).forEach(dest => {
      try { dest.disconnect(); dest.stream?.getTracks().forEach(t => t.stop()); } catch {}
    });
    rjSpeakerReturnDests.current = {};
    Object.values(rjSpeakerMonitorEls.current).forEach(el => {
      try { el.pause(); el.srcObject = null; } catch {}
    });
    rjSpeakerMonitorEls.current = {};

    /* Close audio mixer */
    if (rjAudioCtx.current) { try { rjAudioCtx.current.close(); } catch {} rjAudioCtx.current = null; }
    rjMixDest.current = null;

    remove(ref(rtdb, 'broadcasts/rj/connections')).catch(() => {});
    remove(ref(rtdb, 'broadcasts/rj/listeners')).catch(() => {});
    remove(ref(rtdb, 'broadcasts/rj/speakerConnections')).catch(() => {});
  };

  /** Ensure RJ WebAudio mixer & keepalive nodes exist and AudioContext is active. */
  const ensureRjAudioMixer = () => {
    try {
      if (!rjAudioCtx.current) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const dest = ctx.createMediaStreamDestination();
        rjAudioCtx.current = ctx;
        rjMixDest.current = dest;

        if (!rjKeepaliveOscRef.current) {
          const osc = ctx.createOscillator();
          const silentGain = ctx.createGain();
          osc.frequency.value = 1;
          silentGain.gain.value = 0.0001;
          osc.connect(silentGain);
          silentGain.connect(dest);
          osc.start();
          rjKeepaliveOscRef.current = osc;
          rjKeepaliveGainRef.current = silentGain;
        }
      }
      if (rjAudioCtx.current.state === 'suspended') {
        rjAudioCtx.current.resume().catch(() => {});
      }
      if (localStream.current && !rjLocalSourceNode.current && rjAudioCtx.current && rjMixDest.current) {
        const rjSrc = rjAudioCtx.current.createMediaStreamSource(localStream.current);
        const micGain = rjAudioCtx.current.createGain();
        micGain.gain.value = Math.max(0, Math.min(1, rjVoiceVolumeRef.current / 100));
        rjSrc.connect(micGain);
        micGain.connect(rjMixDest.current);
        rjLocalSourceNode.current = rjSrc;
        rjMicGainNode.current = micGain;
      }
      return true;
    } catch (err) {
      console.warn('ensureRjAudioMixer failed:', err);
      return false;
    }
  };

  /** Tear down a single speaker's RJ-side connection, mix-minus bus, and RTDB listeners. */
  const _rjDisconnectSpeaker = (speakerUid, removeRtdb = false) => {
    (rjSpeakerUnsubs.current[speakerUid] || []).forEach(u => { try { u(); } catch {} });
    delete rjSpeakerUnsubs.current[speakerUid];

    const pc = rjSpeakerPCs.current[speakerUid];
    if (pc) { try { pc.close(); } catch {} }
    delete rjSpeakerPCs.current[speakerUid];

    if (rjSpeakerSourceNodes.current[speakerUid]) {
      try { rjSpeakerSourceNodes.current[speakerUid].disconnect(); } catch {}
      delete rjSpeakerSourceNodes.current[speakerUid];
    }
    if (rjSpeakerGainNodes.current[speakerUid]) {
      try { rjSpeakerGainNodes.current[speakerUid].disconnect(); } catch {}
      delete rjSpeakerGainNodes.current[speakerUid];
    }
    if (rjSpeakerReturnDests.current[speakerUid]) {
      try {
        rjSpeakerReturnDests.current[speakerUid].disconnect();
        rjSpeakerReturnDests.current[speakerUid].stream?.getTracks().forEach(t => t.stop());
      } catch {}
      delete rjSpeakerReturnDests.current[speakerUid];
    }
    if (rjSpeakerMonitorEls.current[speakerUid]) {
      try { rjSpeakerMonitorEls.current[speakerUid].pause(); rjSpeakerMonitorEls.current[speakerUid].srcObject = null; } catch {}
      delete rjSpeakerMonitorEls.current[speakerUid];
    }

    if (removeRtdb) {
      remove(ref(rtdb, `broadcasts/rj/speakerConnections/${speakerUid}`)).catch(() => {});
    }
  };

  /** RJ opens a bidirectional WebRTC connection with an invited Speaker:
   *  - Incoming speaker mic routes into:
   *    1) Audience mix (rjMixDest) so ALL listeners hear the speaker
   *    2) RJ headphones/speakers (ctx.destination) so RJ hears the speaker
   *    3) Every other speaker's mix-minus return bus
   *    Plus a muted Chromium RTP-pump <audio> element so WebAudio receives live frames.
   *  - Outgoing mix-minus bus sends RJ voice + co-speakers back to this speaker echo-free. */
  const rjConnectToSpeaker = async (speakerUid) => {
    if (!canManageRJ || !myUid || speakerUid === myUid) return;
    const existing = rjSpeakerPCs.current[speakerUid];
    if (existing) {
      if (existing.connectionState !== 'failed' && existing.connectionState !== 'disconnected' && existing.signalingState !== 'closed') return;
      try { existing.close(); } catch {}
      delete rjSpeakerPCs.current[speakerUid];
    }

    if (rjSpeakerUnsubs.current[speakerUid]?.length) {
      rjSpeakerUnsubs.current[speakerUid].forEach(u => { try { u(); } catch {} });
    }
    rjSpeakerUnsubs.current[speakerUid] = [];

    ensureRjAudioMixer();

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    rjSpeakerPCs.current[speakerUid] = pc;

    /* Build dedicated mix-minus return feed for this speaker (RJ mic + co-speakers, excluding self) */
    if (rjAudioCtx.current) {
      try {
        if (rjSpeakerReturnDests.current[speakerUid]) {
          try {
            rjSpeakerReturnDests.current[speakerUid].disconnect();
            rjSpeakerReturnDests.current[speakerUid].stream?.getTracks().forEach(t => t.stop());
          } catch {}
        }
        const returnDest = rjAudioCtx.current.createMediaStreamDestination();
        rjSpeakerReturnDests.current[speakerUid] = returnDest;

        if (rjMicGainNode.current) {
          rjMicGainNode.current.connect(returnDest);
        } else if (localStream.current) {
          localStream.current.getTracks().forEach(t => pc.addTrack(t, localStream.current));
        }
        if (rjKeepaliveGainRef.current) {
          rjKeepaliveGainRef.current.connect(returnDest);
        }
        Object.entries(rjSpeakerGainNodes.current).forEach(([otherUid, gNode]) => {
          if (otherUid !== speakerUid && gNode) {
            try { gNode.connect(returnDest); } catch {}
          }
        });
        returnDest.stream.getTracks().forEach(t => pc.addTrack(t, returnDest.stream));
      } catch (err) {
        console.warn('Return mix-minus setup failed, falling back to localStream:', err);
        if (localStream.current) {
          localStream.current.getTracks().forEach(t => pc.addTrack(t, localStream.current));
        }
      }
    } else if (localStream.current) {
      localStream.current.getTracks().forEach(t => pc.addTrack(t, localStream.current));
    }

    /* When speaker's audio track arrives, route to Audience, RJ, and other co-speakers */
    pc.ontrack = (e) => {
      try {
        ensureRjAudioMixer();
        const remoteStream = e.streams?.[0] || new MediaStream([e.track]);

        /* CRITICAL Chromium WebRTC fix: attach remote stream to a muted <audio> pump
           so Chromium actively decodes RTP frames for AudioContext.createMediaStreamSource */
        if (rjSpeakerMonitorEls.current[speakerUid]) {
          try { rjSpeakerMonitorEls.current[speakerUid].pause(); rjSpeakerMonitorEls.current[speakerUid].srcObject = null; } catch {}
        }
        const pumpEl = new Audio();
        pumpEl.srcObject = remoteStream;
        pumpEl.muted = true;
        pumpEl.autoplay = true;
        pumpEl.playsInline = true;
        pumpEl.play().catch(() => {});
        rjSpeakerMonitorEls.current[speakerUid] = pumpEl;

        if (!rjAudioCtx.current || !rjMixDest.current) return;
        if (rjAudioCtx.current.state === 'suspended') {
          rjAudioCtx.current.resume().catch(() => {});
        }
        if (rjSpeakerSourceNodes.current[speakerUid]) {
          try { rjSpeakerSourceNodes.current[speakerUid].disconnect(); } catch {}
        }
        if (rjSpeakerGainNodes.current[speakerUid]) {
          try { rjSpeakerGainNodes.current[speakerUid].disconnect(); } catch {}
        }

        const speakerSrc = rjAudioCtx.current.createMediaStreamSource(remoteStream);
        const speakerGain = rjAudioCtx.current.createGain();
        speakerGain.gain.value = 1.0;
        speakerSrc.connect(speakerGain);

        /* 1. Route to Audience mix */
        speakerGain.connect(rjMixDest.current);
        /* 2. Route to RJ's local output so RJ hears speaker */
        speakerGain.connect(rjAudioCtx.current.destination);
        /* 3. Route to every OTHER active speaker's mix-minus return bus */
        Object.entries(rjSpeakerReturnDests.current).forEach(([otherUid, otherDest]) => {
          if (otherUid !== speakerUid && otherDest) {
            try { speakerGain.connect(otherDest); } catch {}
          }
        });

        rjSpeakerSourceNodes.current[speakerUid] = speakerSrc;
        rjSpeakerGainNodes.current[speakerUid] = speakerGain;
        bpToast.mic('Speaker joined the stage — two-way audio connected!');
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

    /* Auto-reconnect when connection drops while speaker stays in speakerMapRef */
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if ((s === 'failed' || s === 'disconnected') && rjSpeakerPCs.current[speakerUid] === pc) {
        setTimeout(() => {
          if (rjSpeakerPCs.current[speakerUid] === pc && speakerMapRef.current[speakerUid]) {
            _rjDisconnectSpeaker(speakerUid, true);
            rjConnectToSpeaker(speakerUid).catch(() => {});
          }
        }, 2500);
      }
    };

    let remoteDescReady = false;
    const pendingCands = [];
    const drainPending = async () => {
      for (const c of pendingCands) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      pendingCands.length = 0;
    };

    /* RJ creates offer for two-way audio (sends RJ/co-speakers + receives speaker mic) */
    const offerId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    await update(ref(rtdb, `broadcasts/rj/speakerConnections/${speakerUid}`), {
      offer: { type: offer.type, sdp: offer.sdp, offerId },
      answer: null,
      rjCandidates: null,
      speakerCandidates: null,
    }).catch(() => {});

    /* Watch for speaker's answer */
    const unsubAns = onValue(ref(rtdb, `broadcasts/rj/speakerConnections/${speakerUid}/answer`), async snap => {
      const ans = snap.val();
      if (!ans || pc !== rjSpeakerPCs.current[speakerUid] || pc.signalingState === 'closed' || pc.remoteDescription) return;
      if (ans.offerId && ans.offerId !== offerId) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: ans.type, sdp: ans.sdp }));
        remoteDescReady = true;
        await drainPending();
      } catch {}
    });
    rjSpeakerUnsubs.current[speakerUid].push(unsubAns);

    /* Buffer early speaker ICE candidates until remoteDescription is ready */
    const unsubSC = onChildAdded(ref(rtdb, `broadcasts/rj/speakerConnections/${speakerUid}/speakerCandidates`), snap => {
      const c = snap.val();
      if (!c || pc !== rjSpeakerPCs.current[speakerUid]) return;
      if (remoteDescReady) {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      } else {
        pendingCands.push(c);
      }
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
    }

    if (removePresence && myUid) {
      remove(ref(rtdb, `broadcasts/rj/listeners/${myUid}`)).catch(() => {});
      remove(ref(rtdb, `broadcasts/rj/connections/${myUid}`)).catch(() => {});
    }
  };

  /* Pre-warm listener Audio element synchronously inside a user tap so mobile browsers never block RJ voice */
  const prewarmListenerAudio = () => {
    try {
      if (!rjAudioEl.current) {
        const audio = new Audio();
        audio.autoplay = true;
        audio.playsInline = true;
        rjAudioEl.current = audio;
      }
      rjAudioEl.current.muted = rjVoiceVolumeRef.current === 0;
      rjAudioEl.current.volume = Math.max(0, Math.min(1, rjVoiceVolumeRef.current / 100));
    } catch {}
  };

  /** Listener joins the RJ broadcast audio stream. */
  const rjJoinAudio = async () => {
    if (!myUid || rjConnecting || rjIsListening) return;
    setRjConnecting(true);
    setRjAudioBlocked(false);
    prewarmListenerAudio();
    /* Remember that user joined so we can auto-resume after logout/login */
    try { localStorage.setItem('tingle_rj_was_listening', 'true'); } catch {}

    try {
      /* Clear stale RTDB connection slot before re-subscribing so old offer isn't re-consumed */
      await remove(ref(rtdb, `broadcasts/rj/connections/${myUid}`)).catch(() => {});

      /* Register presence — broadcaster will see this and create an offer */
      const lRef = ref(rtdb, `broadcasts/rj/listeners/${myUid}`);
      await set(lRef, { uid: myUid, name: myName, joinedAt: Date.now() });
      onDisconnect(lRef).remove();

      /* Create peer connection BEFORE watching for the offer so we're ready */
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      rjListenerPC.current = pc;

      /* Buffer ICE candidates that arrive before remote description is set */
      let remoteDescReady = false;
      let handledOfferId = null;
      const pendingCandidates = [];
      const drainPending = async () => {
        for (const c of pendingCandidates) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        pendingCandidates.length = 0;
      };

      /* When audio track arrives, play it — handle autoplay policy */
      pc.ontrack = (e) => {
        prewarmListenerAudio();
        rjAudioEl.current.srcObject = e.streams?.[0] || new MediaStream([e.track]);
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

      /* Watch for broadcaster's offer */
      const offerRef = ref(rtdb, `broadcasts/rj/connections/${myUid}/offer`);
      const unsubOffer = onValue(offerRef, async snap => {
        const offer = snap.val();
        if (!offer || pc.signalingState === 'closed' || pc.remoteDescription) return;
        const oid = offer.offerId || offer.sdp;
        if (handledOfferId === oid) return;
        handledOfferId = oid;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: offer.type, sdp: offer.sdp }));
          remoteDescReady = true;
          await drainPending();                              /* apply buffered candidates */
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await set(ref(rtdb, `broadcasts/rj/connections/${myUid}/answer`), {
            type: answer.type,
            sdp: answer.sdp,
            offerId: offer.offerId || null,
          }).catch(() => {});
        } catch (err) {
          handledOfferId = null;
          console.warn('RJ offer handling error:', err);
        }
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

      /* Connection timeout: check live refs rather than stale closure state */
      setTimeout(() => {
        if (!rjIsListeningRef.current && rjConnectingRef.current) {
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
        bpToast.error('Microphone blocked. Allow mic access in your browser settings (lock icon in address bar), then try again.');
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
        _postSystemMessage(roomId, `${myName} is now LIVE on Broadcast! Tune in to the Broadcast tab.`, 'broadcast_live', 1 * 60 * 1000);
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
    if (endingBroadcast) return;
    setEndingBroadcast(true);
    const endingName = myName;

    /* 1. Cancel onDisconnect synchronously & tear down all local audio/WebRTC/UI instantly */
    if (rjOnDisconnectRef.current) {
      try { rjOnDisconnectRef.current.cancel(); } catch {}
      rjOnDisconnectRef.current = null;
    }

    rjIsLiveRef.current = false;
    setRjIsLive(false);
    setRjBroadcast(null);
    setListenerCount(0);
    setSpeakerMap({});
    setYtUrl('');
    setYtCurrentSongName('');
    setYtRemoteState('stopped');
    setYtPlayerState('stopped');
    setYtAudioBlocked(false);
    setYtEmbedVideoId(null);
    setYtCurrentTime(0);
    setYtDuration(0);
    ytIntendedStateRef.current = 'stopped';
    ytRealPlayingRef.current = false;
    ytIframeLoadedRef.current = false;
    currentYtVideoIdRef.current = null;
    ytCurrentTimeRef.current = 0;
    ytDurationRef.current = 0;
    if (ytVerifyTimerRef.current) {
      clearTimeout(ytVerifyTimerRef.current);
      ytVerifyTimerRef.current = null;
    }
    ytHandshakeTimersRef.current.forEach(t => clearTimeout(t));
    ytHandshakeTimersRef.current = [];
    try { sendYtCommand('stopVideo', ''); } catch {}
    try { rjStopAllBroadcasterConnections(); } catch {}
    try { stopLocalMic(); } catch {}
    try { localStorage.removeItem('tingle_rj_was_listening'); } catch {}

    bpToast.success('Broadcast ended.');

    /* 2. Persist shutdown to RTDB with timeout & fallback so UI never hangs */
    try {
      const cleanupOps = Promise.allSettled([
        remove(ref(rtdb, 'broadcasts/rj/songQueue')),
        remove(ref(rtdb, 'broadcasts/rj/announcements')),
        remove(ref(rtdb, 'broadcasts/rj')).catch(async () => {
          await update(ref(rtdb, 'broadcasts/rj'), {
            isLive: false,
            endedAt: Date.now(),
            youtube: null,
          });
        }),
      ]);
      await Promise.race([
        cleanupOps,
        new Promise((resolve) => setTimeout(resolve, 3500)),
      ]);

      if (roomId) {
        _postSystemMessage(roomId, `${endingName}'s Broadcast has ended.`, 'broadcast_ended', 1 * 60 * 1000);
      }
    } catch (err) {
      console.error('End broadcast cleanup warning:', err);
    } finally {
      setEndingBroadcast(false);
    }
  };

  const handleMicToggle = async () => {
    if (rjAudioCtx.current && rjAudioCtx.current.state === 'suspended') {
      rjAudioCtx.current.resume().catch(() => {});
    }
    if (!localStream.current) {
      try {
        await startLocalMic();
        setMicMuted(false);
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          bpToast.error('Microphone blocked. Allow mic access in your browser settings, then try again.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          bpToast.error('No microphone detected. Please connect a mic and try again.');
        } else if (err.name === 'NotReadableError') {
          bpToast.error('Microphone is in use by another app. Close it and try again.');
        } else {
          bpToast.error('Could not access microphone: ' + (err.message || 'Unknown error'));
        }
      }
    } else {
      const nowMuted = !micMuted;
      localStream.current.getAudioTracks().forEach(t => { t.enabled = !nowMuted; });
      setMicMuted(nowMuted);
    }
  };

  const startLocalMic = async () => {
    if (localStream.current) return localStream.current;
    // C9: Catch mic-permission errors here as a universal safety net — every call
    // site can still add its own catch for context-specific messaging, but at
    // minimum the user always sees something actionable instead of a silent hang.
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
        video: false
      });
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        bpToast.error('Microphone access blocked. Please allow mic permission in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        bpToast.error('No microphone found. Please connect a microphone and try again.');
      }
      throw err; // re-throw so callers can add their own context-specific handling
    }
    localStream.current = stream;
    startMicLevelMeter(stream); // eslint-disable-line no-use-before-define

    try {
      ensureRjAudioMixer();
      Object.values(rjSpeakerReturnDests.current).forEach(dest => {
        if (rjMicGainNode.current && dest) {
          try { rjMicGainNode.current.connect(dest); } catch {}
        }
      });
      /* If any listener/speaker PCs exist (e.g. after mic restart), swap in mixed/mic track */
      const mixedTrack = rjMixDest.current?.stream?.getAudioTracks()?.[0] || stream.getAudioTracks()[0];
      if (mixedTrack) {
        Object.values(rjHostPCs.current).forEach(pc => {
          pc?.getSenders?.().forEach(s => {
            if (s.track?.kind === 'audio') s.replaceTrack(mixedTrack).catch(() => {});
          });
        });
      }
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
    if (rjLocalSourceNode.current) {
      try { rjLocalSourceNode.current.disconnect(); } catch {}
      rjLocalSourceNode.current = null;
    }
    if (rjMicGainNode.current) {
      try { rjMicGainNode.current.disconnect(); } catch {}
      rjMicGainNode.current = null;
    }
    if (rjKeepaliveOscRef.current) {
      try { rjKeepaliveOscRef.current.stop(); rjKeepaliveOscRef.current.disconnect(); } catch {}
      rjKeepaliveOscRef.current = null;
    }
    if (rjKeepaliveGainRef.current) {
      try { rjKeepaliveGainRef.current.disconnect(); } catch {}
      rjKeepaliveGainRef.current = null;
    }
    if (rjAudioCtx.current) {
      try { rjAudioCtx.current.close(); } catch {}
      rjAudioCtx.current = null;
      rjMixDest.current = null;
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

  const handleYtLoad = async () => {
    const vid = extractYtId(ytUrl);
    if (!vid) { bpToast.warning('Invalid YouTube URL. Paste a YouTube or YouTube Music link.'); return; }
    if (rjAudioCtx.current && rjAudioCtx.current.state === 'suspended') {
      rjAudioCtx.current.resume().catch(() => {});
    }
    let songName = `YouTube Music (${vid})`;
    const nowMs = Date.now();
    ytIntendedStateRef.current = 'playing';
    ytListenerUserPausedRef.current = false;
    setYtRemoteState('playing');
    setYtAudioBlocked(false);
    setYtCurrentSongName(songName);
    initYtPlayer(vid, 0);
    update(ref(rtdb, 'broadcasts/rj/youtube'), {
      videoId: vid,
      state: 'playing',
      seekTo: 0,
      songName,
      updatedAt: nowMs,
    }).catch(() => {});
    try {
      const resp = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${vid}`)}&format=json`);
      if (resp.ok) {
        const meta = await resp.json();
        if (meta?.title) {
          songName = meta.title;
          setYtCurrentSongName(songName);
          update(ref(rtdb, 'broadcasts/rj/youtube'), { songName }).catch(() => {});
        }
      }
    } catch {}
  };

  const handleYtControl = (action) => {
    if (rjAudioCtx.current && rjAudioCtx.current.state === 'suspended') {
      rjAudioCtx.current.resume().catch(() => {});
    }
    let newState = ytIntendedStateRef.current || 'stopped';
    let seekTo = ytCurrentTimeRef.current || 0;
    const nowMs = Date.now();

    if (action === 'play') {
      newState = 'playing';
      ytIntendedStateRef.current = 'playing';
      ytListenerUserPausedRef.current = false;
      setYtRemoteState('playing');
      setYtAudioBlocked(false);
      if (ytIframeLoadedRef.current && ytIframeRef.current?.contentWindow) {
        sendYtListeningHandshake();
        applyYtVolume();
        sendYtCommand('playVideo', '');
        verifyYtAudible(1100);
      } else {
        const vid = ytEmbedVideoId || rjBroadcast?.youtube?.videoId || extractYtId(ytUrl);
        if (vid) initYtPlayer(vid, seekTo);
      }
    } else if (action === 'pause') {
      sendYtCommand('pauseVideo', '');
      ytRealPlayingRef.current = false;
      newState = 'paused';
      setYtRemoteState('paused');
      setYtPlayerState('paused');
      setYtAudioBlocked(false);
    } else if (action === 'stop') {
      sendYtCommand('stopVideo', '');
      ytRealPlayingRef.current = false;
      newState = 'stopped';
      seekTo = 0;
      ytCurrentTimeRef.current = 0;
      setYtCurrentTime(0);
      setYtRemoteState('stopped');
      setYtPlayerState('stopped');
      setYtAudioBlocked(false);
    } else if (action === 'replay') {
      seekTo = 0;
      ytCurrentTimeRef.current = 0;
      setYtCurrentTime(0);
      newState = 'playing';
      ytIntendedStateRef.current = 'playing';
      setYtRemoteState('playing');
      setYtAudioBlocked(false);
      sendYtListeningHandshake();
      applyYtVolume();
      sendYtCommand('seekTo', [0, true]);
      sendYtCommand('playVideo', '');
      verifyYtAudible(1100);
    } else if (action === 'skipnext') {
      const dur = ytDurationRef.current;
      seekTo = dur ? Math.min(dur, (ytCurrentTimeRef.current || 0) + 30) : (ytCurrentTimeRef.current || 0) + 30;
      ytCurrentTimeRef.current = seekTo;
      setYtCurrentTime(seekTo);
      newState = 'playing';
      ytIntendedStateRef.current = 'playing';
      setYtRemoteState('playing');
      sendYtListeningHandshake();
      applyYtVolume();
      sendYtCommand('seekTo', [seekTo, true]);
      sendYtCommand('playVideo', '');
      verifyYtAudible(1100);
    } else if (action === 'skipprev') {
      seekTo = Math.max(0, (ytCurrentTimeRef.current || 0) - 15);
      ytCurrentTimeRef.current = seekTo;
      setYtCurrentTime(seekTo);
      sendYtCommand('seekTo', [seekTo, true]);
      newState = ytIntendedStateRef.current === 'playing' ? 'playing' : 'paused';
    }

    ytIntendedStateRef.current = newState;
    update(ref(rtdb, 'broadcasts/rj/youtube'), { state: newState, seekTo, updatedAt: nowMs }).catch(() => {});
  };

  const handleYtSeek = (e) => {
    if (!canManageRJ || !ytEmbedVideoId || !ytDuration) return;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const nextTime = Math.floor(pct * ytDuration);
    ytCurrentTimeRef.current = nextTime;
    setYtCurrentTime(nextTime);
    sendYtListeningHandshake();
    sendYtCommand('seekTo', [nextTime, true]);
    if (ytIntendedStateRef.current === 'playing') {
      applyYtVolume();
      sendYtCommand('playVideo', '');
      verifyYtAudible(1000);
    }
    update(ref(rtdb, 'broadcasts/rj/youtube'), {
      state: ytIntendedStateRef.current === 'playing' ? 'playing' : 'paused',
      seekTo: nextTime,
      updatedAt: Date.now(),
    }).catch(() => {});
  };

  const handleListenerYtToggle = () => {
    if (!ytEmbedVideoId) {
      if (rjBroadcast?.youtube?.videoId) syncYouTubePlayer(rjBroadcast.youtube);
      return;
    }
    if (ytPlayerState === 'playing') {
      ytListenerUserPausedRef.current = true;
      sendYtCommand('pauseVideo', '');
      ytRealPlayingRef.current = false;
      setYtPlayerState('paused');
      setYtAudioBlocked(false);
    } else {
      ytListenerUserPausedRef.current = false;
      ytIntendedStateRef.current = rjBroadcast?.youtube?.state || 'playing';
      sendYtListeningHandshake();
      applyYtVolume();
      if (rjBroadcast?.youtube?.seekTo != null && rjBroadcast?.youtube?.state === 'playing') {
        const drift = rjBroadcast.youtube.updatedAt ? Math.max(0, (Date.now() - rjBroadcast.youtube.updatedAt) / 1000) : 0;
        const livePos = rjBroadcast.youtube.seekTo + drift;
        sendYtCommand('seekTo', [livePos, true]);
        ytCurrentTimeRef.current = livePos;
        setYtCurrentTime(livePos);
      }
      sendYtCommand('playVideo', '');
      setYtAudioBlocked(false);
      verifyYtAudible(1100);
    }
  };

  /* ── Speaker mic toggle (for users who are on stage) ── */
  const handleSpeakerMicToggle = () => {
    if (!speakerStream.current) return;
    const nowMuted = !speakerMicMuted;
    speakerStream.current.getAudioTracks().forEach(t => { t.enabled = !nowMuted; });
    setSpeakerMicMuted(nowMuted);
    if (speakerAudioEl.current && speakerAudioBlocked) {
      speakerAudioEl.current.play().then(() => setSpeakerAudioBlocked(false)).catch(() => {});
    }
    if (myUid) {
      update(ref(rtdb, `broadcasts/rj/speakers/${myUid}`), { muted: nowMuted }).catch(() => {});
    }
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

  /* ══════════════════════════════════════════════════════════════════
     PUBLIC GROUP VOICE CALLS — MULTI-ROOM FULL-DUPLEX MESH (UP TO 20)
  ══════════════════════════════════════════════════════════════════ */

  const _attachPeerSpeakingDetector = (peerUid, stream) => {
    if (pubPeerSpeakingCleanups.current[peerUid]) {
      try { pubPeerSpeakingCleanups.current[peerUid](); } catch {}
      delete pubPeerSpeakingCleanups.current[peerUid];
    }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const iv = setInterval(() => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        const isSpk = avg > 10;
        setPubSpeakingMap(prev => (prev[peerUid] === isSpk ? prev : { ...prev, [peerUid]: isSpk }));
      }, 160);
      pubPeerSpeakingCleanups.current[peerUid] = () => {
        clearInterval(iv);
        try { src.disconnect(); ctx.close(); } catch {}
      };
    } catch {}
  };

  const _pubDisconnectPeer = (peerUid) => {
    (pubPeerUnsubs.current[peerUid] || []).forEach(u => { try { u(); } catch {} });
    delete pubPeerUnsubs.current[peerUid];

    const pc = pubHostPCs.current[peerUid];
    if (pc) { try { pc.close(); } catch {} }
    delete pubHostPCs.current[peerUid];

    const audioEl = pubPeerAudioEls.current[peerUid];
    if (audioEl) {
      try { audioEl.pause(); audioEl.srcObject = null; } catch {}
      delete pubPeerAudioEls.current[peerUid];
    }

    if (pubPeerSpeakingCleanups.current[peerUid]) {
      try { pubPeerSpeakingCleanups.current[peerUid](); } catch {}
      delete pubPeerSpeakingCleanups.current[peerUid];
    }

    setPubPeerStates(prev => {
      if (!(peerUid in prev)) return prev;
      const next = { ...prev };
      delete next[peerUid];
      return next;
    });
    setPubSpeakingMap(prev => {
      if (!(peerUid in prev)) return prev;
      const next = { ...prev };
      delete next[peerUid];
      return next;
    });
  };

  const _pubConnectGroupPeer = async (callId, peerUid) => {
    if (!myUid || !peerUid || peerUid === myUid) return;
    if (!activePubCallRef.current || activePubCallRef.current.id !== callId) return;

    const existing = pubHostPCs.current[peerUid];
    if (existing) {
      if (existing.connectionState !== 'failed' && existing.signalingState !== 'closed') return;
      _pubDisconnectPeer(peerUid);
    }

    const iAmOfferer = myUid < peerUid;
    const pairId = iAmOfferer ? `${myUid}__${peerUid}` : `${peerUid}__${myUid}`;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pubHostPCs.current[peerUid] = pc;
    pubPeerUnsubs.current[peerUid] = [];
    setPubPeerStates(prev => ({ ...prev, [peerUid]: 'connecting' }));

    if (pubHostStream.current) {
      pubHostStream.current.getTracks().forEach(t => pc.addTrack(t, pubHostStream.current));
    }

    pc.ontrack = (e) => {
      const remoteStream = e.streams?.[0] || new MediaStream([e.track]);
      let audio = pubPeerAudioEls.current[peerUid];
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.playsInline = true;
        pubPeerAudioEls.current[peerUid] = audio;
      }
      audio.volume = Math.max(0, Math.min(1, pubCallVolumeRef.current / 100));
      audio.srcObject = remoteStream;
      audio.play().then(() => {
        setPubAudioBlocked(false);
        setPubPeerStates(prev => ({ ...prev, [peerUid]: 'connected' }));
      }).catch(() => {
        setPubAudioBlocked(true);
      });
      _attachPeerSpeakingDetector(peerUid, remoteStream);
    };

    const myIcePath = iAmOfferer ? 'offerIce' : 'answerIce';
    const remoteIcePath = iAmOfferer ? 'answerIce' : 'offerIce';

    pc.onicecandidate = (evt) => {
      if (evt.candidate) {
        push(ref(rtdb, `broadcasts/public/${callId}/mesh/${pairId}/${myIcePath}`), evt.candidate.toJSON()).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') {
        setPubPeerStates(prev => ({ ...prev, [peerUid]: 'connected' }));
      } else if (s === 'connecting' || s === 'new' || s === 'disconnected') {
        setPubPeerStates(prev => ({ ...prev, [peerUid]: 'connecting' }));
      } else if (s === 'failed') {
        setPubPeerStates(prev => ({ ...prev, [peerUid]: 'failed' }));
        setTimeout(() => {
          if (
            pubHostPCs.current[peerUid] === pc &&
            activePubCallRef.current?.id === callId &&
            pubParticipantsMapRef.current[peerUid]
          ) {
            _pubDisconnectPeer(peerUid);
            _pubConnectGroupPeer(callId, peerUid).catch(() => {});
          }
        }, 2500);
      }
    };

    let remoteDescReady = false;
    const pendingCandidates = [];
    const drainPending = async () => {
      for (const c of pendingCandidates) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      pendingCandidates.length = 0;
    };

    const unsubRemoteIce = onChildAdded(ref(rtdb, `broadcasts/public/${callId}/mesh/${pairId}/${remoteIcePath}`), snap => {
      const c = snap.val();
      if (!c || pc !== pubHostPCs.current[peerUid]) return;
      if (remoteDescReady) {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      } else {
        pendingCandidates.push(c);
      }
    });
    pubPeerUnsubs.current[peerUid].push(unsubRemoteIce);

    if (iAmOfferer) {
      try {
        const offerId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const offer = await pc.createOffer();
        if (pc !== pubHostPCs.current[peerUid] || pc.signalingState === 'closed') return;
        await pc.setLocalDescription(offer);
        await update(ref(rtdb, `broadcasts/public/${callId}/mesh/${pairId}`), {
          offer: { type: offer.type, sdp: offer.sdp, offerId },
          answer: null,
          offerIce: null,
          answerIce: null,
        }).catch(() => {});

        const unsubAns = onValue(ref(rtdb, `broadcasts/public/${callId}/mesh/${pairId}/answer`), async snap => {
          const ans = snap.val();
          if (ans && (!ans.offerId || ans.offerId === offerId) && pc === pubHostPCs.current[peerUid] && pc.signalingState !== 'closed' && !pc.remoteDescription) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: ans.type, sdp: ans.sdp }));
              remoteDescReady = true;
              await drainPending();
            } catch {}
          }
        });
        pubPeerUnsubs.current[peerUid].push(unsubAns);
      } catch {}
    } else {
      let handledOfferId = null;
      const unsubOffer = onValue(ref(rtdb, `broadcasts/public/${callId}/mesh/${pairId}/offer`), async snap => {
        const offer = snap.val();
        if (!offer || pc !== pubHostPCs.current[peerUid] || pc.signalingState === 'closed' || pc.remoteDescription) return;
        if (offer.offerId && handledOfferId === offer.offerId) return;
        handledOfferId = offer.offerId || 'legacy';
        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: offer.type, sdp: offer.sdp }));
          remoteDescReady = true;
          await drainPending();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await set(ref(rtdb, `broadcasts/public/${callId}/mesh/${pairId}/answer`), {
            type: answer.type,
            sdp: answer.sdp,
            ...(offer.offerId ? { offerId: offer.offerId } : {}),
          }).catch(() => {});
        } catch {}
      });
      pubPeerUnsubs.current[peerUid].push(unsubOffer);
    }
  };

  const _cleanupPublicGroupCallLocal = () => {
    if (pubPartOdRef.current) {
      try { pubPartOdRef.current.cancel(); } catch {}
      pubPartOdRef.current = null;
    }
    if (pubOnDisconnectRef.current) {
      try { pubOnDisconnectRef.current.cancel(); } catch {}
      pubOnDisconnectRef.current = null;
    }
    pubCallRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
    pubCallRtdbUnsubs.current = [];
    pubHostRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
    pubHostRtdbUnsubs.current = [];
    pubListenerRtdbUnsubs.current.forEach(u => { try { u(); } catch {} });
    pubListenerRtdbUnsubs.current = [];
    if (pubListenersUnsub.current) { try { pubListenersUnsub.current(); } catch {} pubListenersUnsub.current = null; }
    if (pubListenerPC.current) { try { pubListenerPC.current.close(); } catch {} pubListenerPC.current = null; }
    if (pubAudioEl.current) {
      try { pubAudioEl.current.pause(); pubAudioEl.current.srcObject = null; } catch {}
      pubAudioEl.current = null;
    }

    Object.keys(pubHostPCs.current).forEach(uid => _pubDisconnectPeer(uid));
    pubHostPCs.current = {};
    pubPeerAudioEls.current = {};
    pubPeerUnsubs.current = {};
    pubPeerSpeakingCleanups.current = {};
    pubParticipantsMapRef.current = {};

    stopPubMicLevelMeter();
    if (pubHostStream.current) {
      pubHostStream.current.getTracks().forEach(t => t.stop());
      pubHostStream.current = null;
    }
    setPubParticipants([]);
    setPubSpeakingMap({});
    setPubPeerStates({});
    setPubMicMuted(false);
    setPubAudioBlocked(false);
    setPubConnState('idle');
  };

  const _pubStartGroupWatcher = (callId, isHostUser) => {
    let seenBefore = false;
    const partRef = ref(rtdb, `broadcasts/public/${callId}/participants`);
    const unsubParts = onValue(partRef, snap => {
      const raw = snap.val() || {};
      pubParticipantsMapRef.current = raw;
      const list = Object.values(raw).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
      setPubParticipants(list);

      /* Detect if host removed us from the call */
      if (seenBefore && myUid && !raw[myUid] && activePubCallRef.current?.id === callId) {
        _cleanupPublicGroupCallLocal();
        setActivePubCall(null);
        setListeningTo(null);
        bpToast.info('You left or were removed from the group voice call.');
        return;
      }
      if (raw[myUid]) seenBefore = true;

      /* Connect any new peer in the room (mesh up to 20) */
      list.forEach(p => {
        if (p.uid && p.uid !== myUid && !pubHostPCs.current[p.uid]) {
          _pubConnectGroupPeer(callId, p.uid).catch(() => {});
        }
      });

      /* Disconnect peers who left */
      Object.keys(pubHostPCs.current).forEach(uid => {
        if (!raw[uid]) {
          _pubDisconnectPeer(uid);
        }
      });

      /* Sync participant count to Firestore */
      updateDoc(doc(db, 'publicBroadcasts', callId), {
        listenerCount: list.length,
        participantCount: list.length,
      }).catch(() => {});
    });
    pubCallRtdbUnsubs.current.push(unsubParts);

    if (!isHostUser) {
      const sessRef = ref(rtdb, `broadcasts/public/${callId}/session`);
      const unsubSess = onValue(sessRef, snap => {
        if (!snap.exists() && activePubCallRef.current?.id === callId) {
          _cleanupPublicGroupCallLocal();
          setActivePubCall(null);
          setListeningTo(null);
          bpToast.info('The host has ended this group voice call.');
        }
      });
      pubCallRtdbUnsubs.current.push(unsubSess);
    }
  };

  const leavePublicGroupCall = async (broadcastIdArg) => {
    const callId = broadcastIdArg || activePubCallRef.current?.id;
    const oldMap = { ...pubParticipantsMapRef.current };
    _cleanupPublicGroupCallLocal();
    setActivePubCall(null);
    setListeningTo(null);
    if (callId && myUid) {
      remove(ref(rtdb, `broadcasts/public/${callId}/participants/${myUid}`)).catch(() => {});
      Object.keys(oldMap).forEach(peerUid => {
        if (peerUid !== myUid) {
          const pairId = myUid < peerUid ? `${myUid}__${peerUid}` : `${peerUid}__${myUid}`;
          remove(ref(rtdb, `broadcasts/public/${callId}/mesh/${pairId}`)).catch(() => {});
        }
      });
    }
  };

  const joinPublicGroupCall = async (bc) => {
    if (!myUid || !bc?.id) return;
    const callId = bc.id;

    /* Capacity guard: max 20 participants */
    try {
      const partSnap = await get(ref(rtdb, `broadcasts/public/${callId}/participants`));
      const currentParts = partSnap.val() || {};
      if (Object.keys(currentParts).length >= MAX_PUB_PARTICIPANTS && !currentParts[myUid]) {
        bpToast.warning(`This group call is full (${MAX_PUB_PARTICIPANTS}/${MAX_PUB_PARTICIPANTS}). Try another call or start a new one.`);
        return;
      }
    } catch {}

    /* Cleanly leave any other call first */
    if (activePubCallRef.current && activePubCallRef.current.id !== callId) {
      await leavePublicGroupCall(activePubCallRef.current.id);
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100 },
        video: false
      });
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        bpToast.error('Microphone blocked. Allow mic permission in your browser settings to talk in the group call.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        bpToast.error('No microphone detected. Please connect a mic to join the voice call.');
      } else {
        bpToast.error('Could not access microphone: ' + (err.message || 'Unknown error'));
      }
      return;
    }

    pubHostStream.current = stream;
    startPubMicLevelMeter(stream);
    setPubMicMuted(false);
    setActivePubCall(bc);
    activePubCallRef.current = bc;
    setListeningTo(bc);

    const myPartRef = ref(rtdb, `broadcasts/public/${callId}/participants/${myUid}`);
    await set(myPartRef, {
      uid: myUid,
      name: myName,
      avatar: myPhoto,
      gender: loggedInUserProfile?.gender || 'male',
      isHost: bc.hostUid === myUid,
      muted: false,
      joinedAt: Date.now(),
    }).catch(() => {});
    const od = onDisconnect(myPartRef);
    od.remove();
    pubPartOdRef.current = od;

    _pubStartGroupWatcher(callId, bc.hostUid === myUid);
    bpToast.live(`Joined "${bc.title}" group voice call!`);
  };

  /* ── Public Broadcast / Group Call Handlers ── */
  const handleCreatePublicBroadcast = async () => {
    if (!myUid || !pubTitle.trim()) return;

    if (activePubCallRef.current) {
      await leavePublicGroupCall(activePubCallRef.current.id);
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100 },
        video: false
      });
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        bpToast.error('Microphone blocked. Click the lock icon in your browser address bar to allow mic access.');
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
        isGroupCall: true,
        maxParticipants: MAX_PUB_PARTICIPANTS,
        isPasswordProtected: pubIsProtected,
        passwordHash,
        listenerCount: 1,
        participantCount: 1,
        createdAt: new Date().toISOString(),
        startedAt: Date.now()
      };

      /* Pre-allocate Firestore doc ID and establish RTDB session + host participant FIRST
         so remote clients' Firestore snapshot never races ahead of RTDB session existence */
      const bcRef = doc(collection(db, 'publicBroadcasts'));
      const broadcastId = bcRef.id;
      const createdBc = { id: broadcastId, ...data };

      const sessionRef = ref(rtdb, `broadcasts/public/${broadcastId}/session`);
      await set(sessionRef, {
        hostUid: myUid,
        hostName: myName,
        title: createdBc.title,
        startedAt: data.startedAt,
        maxParticipants: MAX_PUB_PARTICIPANTS,
      });
      const odHandle = onDisconnect(sessionRef);
      odHandle.remove();
      pubOnDisconnectRef.current = odHandle;

      const myPartRef = ref(rtdb, `broadcasts/public/${broadcastId}/participants/${myUid}`);
      await set(myPartRef, {
        uid: myUid,
        name: myName,
        avatar: myPhoto,
        gender: loggedInUserProfile?.gender || 'male',
        isHost: true,
        muted: false,
        joinedAt: Date.now(),
      });
      const partOd = onDisconnect(myPartRef);
      partOd.remove();
      pubPartOdRef.current = partOd;

      await setDoc(bcRef, data);
      setMyActiveBroadcast(createdBc);
      setActivePubCall(createdBc);
      activePubCallRef.current = createdBc;
      setPubTitle('');
      setPubPassword('');
      setPubIsProtected(false);

      _pubStartGroupWatcher(broadcastId, true);
      bpToast.live('Group voice call is LIVE! Up to 20 people can join and talk.');
    } catch (err) {
      console.error('Create group call error:', err);
      stream.getTracks().forEach(t => t.stop());
      pubHostStream.current = null;
      stopPubMicLevelMeter();
      const reason = err?.code === 'permission-denied' ? 'Permission denied — make sure you are logged in as a registered user.' : (err?.message || 'Unknown error');
      bpToast.error('Failed to start group call: ' + reason);
    }
  };

  const handleStopPublicBroadcast = async () => {
    const callId = myActiveBroadcast?.id || activePubCallRef.current?.id;
    if (!callId) return;
    _cleanupPublicGroupCallLocal();
    setMyActiveBroadcast(null);
    setActivePubCall(null);
    setListeningTo(null);
    bpToast.success('Group voice call ended.');
    try {
      await Promise.race([
        Promise.allSettled([
          remove(ref(rtdb, `broadcasts/public/${callId}`)),
          updateDoc(doc(db, 'publicBroadcasts', callId), { isLive: false, participantCount: 0, listenerCount: 0 }),
        ]),
        new Promise(resolve => setTimeout(resolve, 3500)),
      ]);
    } catch (err) {
      console.error('Stop group call cleanup warning:', err);
    }
  };

  const handleKickPubParticipant = async (targetUid) => {
    const callId = activePubCallRef.current?.id;
    if (!callId || activePubCallRef.current?.hostUid !== myUid || targetUid === myUid) return;
    try {
      await remove(ref(rtdb, `broadcasts/public/${callId}/participants/${targetUid}`));
      bpToast.info('Participant removed from the call.');
    } catch {}
  };

  const handlePubMicToggle = () => {
    if (!pubHostStream.current) return;
    const nowMuted = !pubMicMuted;
    pubHostStream.current.getAudioTracks().forEach(t => { t.enabled = !nowMuted; });
    setPubMicMuted(nowMuted);
    const callId = activePubCallRef.current?.id;
    if (callId && myUid) {
      update(ref(rtdb, `broadcasts/public/${callId}/participants/${myUid}`), { muted: nowMuted }).catch(() => {});
    }
  };

  const handleJoinPublicBroadcast = async (bc) => {
    if (pubJoining) return;

    if (activePubCallRef.current?.id === bc.id) {
      await leavePublicGroupCall(bc.id);
      return;
    }

    if (bc.isPasswordProtected) {
      setPasswordPrompt({ broadcastId: bc.id, title: bc.title });
      return;
    }

    setPubJoining(true);
    try {
      await joinPublicGroupCall(bc);
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
          await joinPublicGroupCall(bc);
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

  /* ── Stale public broadcast cleanup on panel open (30s grace window, host/staff only) ── */
  useEffect(() => {
    if (!isOpen) return;
    const cleanStale = async () => {
      try {
        const q = query(
          collection(db, 'publicBroadcasts'),
          where('isLive', '==', true)
        );
        const snap = await getDocs(q);
        const now = Date.now();
        for (const d of snap.docs) {
          const bc = d.data() || {};
          if (bc.hostUid !== myUid && !isRJ) continue;
          if (bc.startedAt && (now - bc.startedAt < 30000)) continue;
          const rtdbSnap = await get(ref(rtdb, `broadcasts/public/${d.id}/session`));
          if (!rtdbSnap.exists()) {
            await updateDoc(doc(db, 'publicBroadcasts', d.id), { isLive: false }).catch(() => {});
            await remove(ref(rtdb, `broadcasts/public/${d.id}`)).catch(() => {});
          }
        }
      } catch {}
    };
    cleanStale();
  }, [isOpen, myUid, isRJ]);

  /* ── Cleanup when panel closes (X button, NOT when minimized) ── */
  useEffect(() => {
    if (!isOpen) {
      if (activePubCallRef.current && activePubCallRef.current.hostUid !== myUid) {
        leavePublicGroupCall(activePubCallRef.current.id);
      }
    }
  }, [isOpen, myUid]);

  /* ── Global cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (activePubCallRef.current) {
        if (activePubCallRef.current.hostUid === myUid) {
          remove(ref(rtdb, `broadcasts/public/${activePubCallRef.current.id}`)).catch(() => {});
          updateDoc(doc(db, 'publicBroadcasts', activePubCallRef.current.id), { isLive: false }).catch(() => {});
        } else {
          leavePublicGroupCall(activePubCallRef.current.id);
        }
      }
      _cleanupPublicGroupCallLocal();
      if (rjIsListeningRef.current) rjLeaveAudio();
      stopMicLevelMeter();
      stopPubMicLevelMeter();
    };
  }, []);

  /* ── Utility: post system message to a room (always auto-deleted ≤50s) ── */
  const _postSystemMessage = async (rId, text, tinglebotType, deleteMsAfter) => {
    try {
      const { postTingleBotRoomMessage, TINGLEBOT_TTL_MS } = await import('../utils/tinglebotAutoDelete');
      const ttl = deleteMsAfter ? Math.min(deleteMsAfter, TINGLEBOT_TTL_MS) : TINGLEBOT_TTL_MS;
      await postTingleBotRoomMessage(rId, { text, tinglebotType }, ttl);
    } catch {}
  };

  /* Hidden persistent YouTube Music-Only iframe (zero video screen, zero floating chip, stays alive in background) */
  const ytOriginParam = typeof window !== 'undefined' && window.location?.origin
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';
  const ytEmbedSrc = ytEmbedVideoId
    ? `https://www.youtube.com/embed/${ytEmbedVideoId}?enablejsapi=1&autoplay=0&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&showinfo=0&iv_load_policy=3&cc_load_policy=0&loop=1&playlist=${ytEmbedVideoId}${ytOriginParam}`
    : null;

  const persistentYtElement = ytEmbedSrc ? (
    <iframe
      key={ytEmbedVideoId}
      ref={ytIframeRef}
      src={ytEmbedSrc}
      className="bp-yt-hidden-frame"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      title="Broadcast YouTube Music Player"
      onLoad={handleYtIframeLoad}
      aria-hidden="true"
      tabIndex={-1}
    />
  ) : null;

  const ytProgressPct = ytDuration > 0 ? Math.min(100, Math.max(0, (ytCurrentTime / ytDuration) * 100)) : 0;
  const ytStatusLabel = ytAudioBlocked
    ? 'TAP PLAY'
    : ytPlayerState === 'playing'
      ? 'PLAYING'
      : ytPlayerState === 'loading'
        ? 'LOADING'
        : ytPlayerState === 'paused'
          ? 'PAUSED'
          : ytPlayerState === 'ready'
            ? 'READY'
            : ytRemoteState === 'playing'
              ? 'LIVE'
              : 'STOPPED';

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
            ? (
              <button className="bp-golive-btn end" onClick={handleEndBroadcast} disabled={endingBroadcast}>
                <StopIcon color="white" /> {endingBroadcast ? 'Ending...' : 'End'}
              </button>
            )
            : (
              <button className="bp-golive-btn start" onClick={handleGoLive} disabled={goingLive}>
                <RadioWaveIcon color="white" /> {goingLive ? 'Starting...' : 'Go Live'}
              </button>
            )
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
            <div className="bp-yt-label"><YoutubeIcon /> YouTube Music Player</div>
            <div className="bp-yt-url-row">
              <input
                className="bp-input"
                placeholder="YouTube or YT Music URL..."
                value={ytUrl}
                onChange={e => setYtUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleYtLoad()}
              />
              <button className="bp-yt-load-btn" onClick={handleYtLoad}>Load</button>
            </div>
            {(ytEmbedVideoId || ytCurrentSongName) && (
              <div className="bp-music-player">
                <div className="bp-mp-header">
                  <YouTubeRedBadge />
                  <span className="bp-mp-title" title={ytCurrentSongName || 'YouTube Music'}>
                    {ytCurrentSongName || 'YouTube Music'}
                  </span>
                  {ytAudioBlocked ? (
                    <button
                      type="button"
                      className="bp-mp-tap-pill"
                      onClick={() => handleYtControl('play')}
                    >
                      Tap for Sound
                    </button>
                  ) : (
                    <span className={`bp-mp-status-pill is-${ytPlayerState === 'playing' ? 'playing' : ytPlayerState === 'loading' ? 'loading' : 'idle'}`}>
                      {ytStatusLabel}
                    </span>
                  )}
                </div>

                <div className="bp-mp-viz" aria-hidden="true">
                  {ytVizBars.map((h, i) => (
                    <div
                      key={i}
                      className={`bp-mp-viz-bar${ytPlayerState === 'playing' ? ' active' : ''}`}
                      style={{ height: `${ytPlayerState === 'playing' ? h : 18}%` }}
                    />
                  ))}
                </div>

                <div
                  className="bp-mp-progress is-seekable"
                  onClick={handleYtSeek}
                  title="Tap to seek"
                >
                  <div className="bp-mp-progress-fill" style={{ width: `${ytProgressPct}%` }} />
                </div>

                <div className="bp-mp-controls">
                  <button type="button" className="bp-mp-btn" onClick={() => handleYtControl('replay')} title="Replay">
                    <ReplayIcon />
                  </button>
                  <button type="button" className="bp-mp-btn" onClick={() => handleYtControl('skipprev')} title="-15s">
                    <SkipPrevIcon />
                  </button>
                  {ytPlayerState === 'playing' ? (
                    <button type="button" className="bp-mp-btn bp-mp-btn--main" onClick={() => handleYtControl('pause')} title="Pause">
                      <PauseIcon />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`bp-mp-btn bp-mp-btn--main${ytAudioBlocked ? ' is-blocked' : ''}`}
                      onClick={() => handleYtControl('play')}
                      title={ytAudioBlocked ? 'Tap to Play Sound' : 'Play'}
                    >
                      <PlayIcon />
                    </button>
                  )}
                  <button type="button" className="bp-mp-btn" onClick={() => handleYtControl('skipnext')} title="+30s">
                    <SkipNextIcon />
                  </button>
                  <button type="button" className="bp-mp-btn bp-mp-btn--stop" onClick={() => handleYtControl('stop')} title="Stop">
                    <StopIcon />
                  </button>
                  <div className="bp-mp-time">
                    <span>{fmtTime(ytCurrentTime)}</span>
                    <span className="bp-mp-time-sep">/</span>
                    <span>{fmtTime(ytDuration)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Premium Dual Independent Volume Mixer (RJ Voice + Music) */}
          <div className="bp-vol-mixer">
            <div className="bp-vol-mixer-hdr">Audio Mix</div>
            <div className="bp-vol-row">
              <button
                type="button"
                className={`bp-vol-icon-btn${rjVoiceVolume === 0 || micMuted ? ' is-muted' : ''}`}
                onClick={() => setRjVoiceVolume(v => (v === 0 ? prevVoiceVolRef.current || 100 : 0))}
                title={rjVoiceVolume === 0 ? 'Unmute Voice' : 'Mute Voice'}
                aria-label="Toggle RJ Voice Mute"
              >
                <MicIcon muted={rjVoiceVolume === 0 || micMuted} />
              </button>
              <span className="bp-vol-label">RJ Voice</span>
              <div className="bp-vol-track-wrap" style={{ '--vol-pct': `${rjVoiceVolume}%` }}>
                <div className="bp-vol-track-bg" />
                <div className="bp-vol-track-fill bp-vol-track-fill--voice" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={rjVoiceVolume}
                  onChange={e => setRjVoiceVolume(Number(e.target.value))}
                  className="bp-vol-range bp-vol-range--voice"
                  aria-label="RJ Voice Volume"
                />
              </div>
              <span className="bp-vol-val">{rjVoiceVolume}%</span>
            </div>
            <div className="bp-vol-row">
              <button
                type="button"
                className={`bp-vol-icon-btn bp-vol-icon-btn--music${musicVolume === 0 ? ' is-muted' : ''}`}
                onClick={() => setMusicVolume(v => (v === 0 ? prevMusicVolRef.current || 75 : 0))}
                title={musicVolume === 0 ? 'Unmute Music' : 'Mute Music'}
                aria-label="Toggle Music Mute"
              >
                <MusicNoteIcon />
              </button>
              <span className="bp-vol-label">Music</span>
              <div className="bp-vol-track-wrap" style={{ '--vol-pct': `${musicVolume}%` }}>
                <div className="bp-vol-track-bg" />
                <div className="bp-vol-track-fill bp-vol-track-fill--music" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={musicVolume}
                  onChange={e => setMusicVolume(Number(e.target.value))}
                  className="bp-vol-range bp-vol-range--music"
                  aria-label="Music Volume"
                />
              </div>
              <span className="bp-vol-val bp-vol-val--music">{musicVolume}%</span>
            </div>
          </div>

          {Object.keys(speakerMap).length > 0 && (
            <div className="bp-speakers-section">
              <div className="bp-section-label">Active Speakers</div>
              <div className="bp-speaker-list">
                {Object.entries(speakerMap).map(([uid, sp]) => (
                  <div key={uid} className="bp-speaker-item">
                    <LiveAvatarImg
                      uid={uid}
                      gender={sp.gender}
                      fallbackPhotoURL={sp.photoURL}
                      className="bp-speaker-avatar"
                      alt={sp.name}
                    />
                    <span className="bp-speaker-name">{sp.name}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                      background: sp.muted ? 'rgba(248,113,113,0.14)' : 'rgba(52,211,153,0.14)',
                      color: sp.muted ? '#f87171' : '#10b981',
                      border: `1px solid ${sp.muted ? 'rgba(248,113,113,0.28)' : 'rgba(52,211,153,0.28)'}`,
                    }}>
                      <MicIcon muted={Boolean(sp.muted)} />
                      {sp.muted ? 'Muted' : 'Live'}
                    </span>
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
            <LiveAvatarImg
              className="bp-ann-strip-avatar"
              uid={ann.rjUid}
              fallbackPhotoURL={isRealAvatarUpload(ann.rjAvatar) ? ann.rjAvatar : getDefaultAvatarUrl(ann.rjUid, 'male', false)}
              alt={ann.rjName}
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
          <LiveAvatarImg
            className="bp-rj-avatar"
            uid={rjBroadcast.rjUid}
            fallbackPhotoURL={isRealAvatarUpload(rjBroadcast.rjAvatar) ? rjBroadcast.rjAvatar : getDefaultAvatarUrl(rjBroadcast.rjUid, 'male', false)}
            alt={rjBroadcast.rjName}
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

        {(ytEmbedVideoId || ytCurrentSongName) && (
          <div className="bp-music-player bp-music-player--listener">
            <div className="bp-mp-header">
              <YouTubeRedBadge />
              <span className="bp-mp-title" title={ytCurrentSongName || 'Now Playing'}>
                {ytCurrentSongName || 'YouTube Music'}
              </span>
              {ytAudioBlocked ? (
                <button
                  type="button"
                  className="bp-mp-tap-pill"
                  onClick={handleListenerYtToggle}
                >
                  Tap to Play
                </button>
              ) : (
                <span className={`bp-mp-status-pill is-${ytPlayerState === 'playing' ? 'playing' : ytPlayerState === 'loading' ? 'loading' : 'idle'}`}>
                  {ytStatusLabel}
                </span>
              )}
            </div>

            <div className="bp-mp-viz" aria-hidden="true">
              {ytVizBars.map((h, i) => (
                <div
                  key={i}
                  className={`bp-mp-viz-bar${ytPlayerState === 'playing' ? ' active' : ''}`}
                  style={{ height: `${ytPlayerState === 'playing' ? h : 18}%` }}
                />
              ))}
            </div>

            <div className="bp-mp-progress">
              <div className="bp-mp-progress-fill" style={{ width: `${ytProgressPct}%` }} />
            </div>

            <div className="bp-mp-controls">
              <button
                type="button"
                className={`bp-mp-btn bp-mp-btn--main${ytAudioBlocked ? ' is-blocked' : ''}`}
                onClick={handleListenerYtToggle}
                title={ytPlayerState === 'playing' ? 'Pause Music' : 'Play Music'}
              >
                {ytPlayerState === 'playing' ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button
                type="button"
                className="bp-mp-sync-btn"
                onClick={() => {
                  ytListenerUserPausedRef.current = false;
                  if (rjBroadcast?.youtube) syncYouTubePlayer(rjBroadcast.youtube);
                  sendYtListeningHandshake();
                  applyYtVolume();
                  sendYtCommand('playVideo', '');
                  verifyYtAudible(1000);
                }}
              >
                Sync Live
              </button>
              <div className="bp-mp-time">
                <span>{fmtTime(ytCurrentTime)}</span>
                <span className="bp-mp-time-sep">/</span>
                <span>{fmtTime(ytDuration)}</span>
              </div>
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

        {/* Listener Premium Dual Volume Mixer (RJ Voice + Music) */}
        <div className="bp-vol-mixer bp-vol-mixer--listener">
          <div className="bp-vol-mixer-hdr">Audio Controls</div>
          <div className="bp-vol-row">
            <button
              type="button"
              className={`bp-vol-icon-btn${rjVoiceVolume === 0 ? ' is-muted' : ''}`}
              onClick={() => setRjVoiceVolume(v => (v === 0 ? prevVoiceVolRef.current || 100 : 0))}
              title={rjVoiceVolume === 0 ? 'Unmute Voice' : 'Mute Voice'}
              aria-label="Toggle RJ Voice Mute"
            >
              <MicIcon muted={rjVoiceVolume === 0} />
            </button>
            <span className="bp-vol-label">RJ Voice</span>
            <div className="bp-vol-track-wrap" style={{ '--vol-pct': `${rjVoiceVolume}%` }}>
              <div className="bp-vol-track-bg" />
              <div className="bp-vol-track-fill bp-vol-track-fill--voice" />
              <input
                type="range"
                min={0}
                max={100}
                value={rjVoiceVolume}
                onChange={e => setRjVoiceVolume(Number(e.target.value))}
                className="bp-vol-range bp-vol-range--voice"
                aria-label="RJ Voice Volume"
              />
            </div>
            <span className="bp-vol-val">{rjVoiceVolume}%</span>
          </div>
          <div className="bp-vol-row">
            <button
              type="button"
              className={`bp-vol-icon-btn bp-vol-icon-btn--music${musicVolume === 0 ? ' is-muted' : ''}`}
              onClick={() => setMusicVolume(v => (v === 0 ? prevMusicVolRef.current || 75 : 0))}
              title={musicVolume === 0 ? 'Unmute Music' : 'Mute Music'}
              aria-label="Toggle Music Mute"
            >
              <MusicNoteIcon />
            </button>
            <span className="bp-vol-label">Music</span>
            <div className="bp-vol-track-wrap" style={{ '--vol-pct': `${musicVolume}%` }}>
              <div className="bp-vol-track-bg" />
              <div className="bp-vol-track-fill bp-vol-track-fill--music" />
              <input
                type="range"
                min={0}
                max={100}
                value={musicVolume}
                onChange={e => setMusicVolume(Number(e.target.value))}
                className="bp-vol-range bp-vol-range--music"
                aria-label="Music Volume"
              />
            </div>
            <span className="bp-vol-val bp-vol-val--music">{musicVolume}%</span>
          </div>
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
                  {rjConnState === 'connected' ? 'Connected' : rjConnState === 'failed' ? 'Failed' : 'Connecting...'}
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
                      if (ytIntendedStateRef.current === 'playing' && ytIframeRef.current?.contentWindow) {
                        ytListenerUserPausedRef.current = false;
                        sendYtListeningHandshake();
                        applyYtVolume();
                        sendYtCommand('playVideo', '');
                        setYtAudioBlocked(false);
                        verifyYtAudible(1000);
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
                onClick={() => {
                  setRjConnState('connecting');
                  prewarmListenerAudio();
                  ytListenerUserPausedRef.current = false;
                  if (ytIframeRef.current?.contentWindow && ytIntendedStateRef.current === 'playing') {
                    sendYtListeningHandshake();
                    applyYtVolume();
                    sendYtCommand('playVideo', '');
                    setYtAudioBlocked(false);
                    verifyYtAudible(1000);
                  } else if (rjBroadcast?.youtube?.videoId) {
                    syncYouTubePlayer(rjBroadcast.youtube);
                  }
                  rjJoinAudio();
                }}
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
              <LiveAvatarImg
                key={sp.uid}
                uid={sp.uid}
                gender={sp.gender}
                fallbackPhotoURL={sp.photoURL}
                className="bp-speaker-bubble"
                alt={sp.name}
                title={sp.name}
              />
            ))}
            {speakers.length > 5 && <span className="bp-speaker-count">+{speakers.length - 5} more</span>}
          </div>
        )}
      </div>
    );
  };

  /* ── TAB 0 router ── */
  /* ── Dismiss a join flash by id ── */
  const dismissRjFlash = (id) => {
    setRjJoinFlashes(prev => prev.filter(f => f.id !== id));
    if (rjJoinFlashTimersRef.current[id]) {
      clearTimeout(rjJoinFlashTimersRef.current[id]);
      delete rjJoinFlashTimersRef.current[id];
    }
  };
  const dismissPubFlash = (id) => {
    setPubJoinFlashes(prev => prev.filter(f => f.id !== id));
    if (pubJoinFlashTimersRef.current[id]) {
      clearTimeout(pubJoinFlashTimersRef.current[id]);
      delete pubJoinFlashTimersRef.current[id];
    }
  };

  /* ── Join Flash Banner component (rendered inline) ── */
  /* count prop: pass the correct listener count for the context (rj vs pub) */
  const JoinFlashArea = ({ flashes, onDismiss, count }) => {
    if (!flashes || flashes.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {flashes.map(f => (
          <div
            key={f.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 13px',
              background: 'linear-gradient(90deg, rgba(124,58,237,0.18) 0%, rgba(168,85,247,0.10) 100%)',
              border: '1.5px solid rgba(139,92,246,0.32)',
              borderRadius: 11,
              animation: 'bp-join-flash-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
              boxShadow: '0 2px 12px rgba(109,40,217,0.13)',
            }}
          >
            {/* Join wave SVG icon */}
            <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, color: '#a78bfa' }}>
              <RadioWaveIcon />
            </span>
            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#a78bfa' }}>{f.name}</span>
              <span style={{ fontSize: 12, color: 'var(--bp-text-muted, #c4b5fd)', fontWeight: 500 }}> joined the broadcast</span>
            </div>
            {/* Listener count pill — uses the count prop, not the RJ-scope listenerCount closure */}
            {(count > 0) && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700,
                background: 'rgba(124,58,237,0.18)', color: '#c4b5fd',
                border: '1px solid rgba(139,92,246,0.3)', flexShrink: 0,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {count}
              </span>
            )}
            {/* Dismiss X */}
            <button
              onClick={() => onDismiss(f.id)}
              aria-label="Dismiss"
              style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                border: '1px solid rgba(139,92,246,0.28)',
                background: 'rgba(139,92,246,0.12)',
                color: '#a78bfa', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    );
  };

  /* ── Listener count indicator badge (for public broadcasts) ── */
  const ListenerCountBadge = ({ count }) => (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 20,
      background: 'linear-gradient(90deg, rgba(34,197,94,0.18) 0%, rgba(16,185,129,0.12) 100%)',
      border: '1.5px solid rgba(34,197,94,0.3)',
      fontSize: 12, fontWeight: 700, color: '#34d399',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      {count} listener{count !== 1 ? 's' : ''}
    </div>
  );

  const renderRJTab = () => (
    <div>
      {/* Only show join flashes to the RJ host (they watch the listeners path) */}
      {canManageRJ && (
        <JoinFlashArea flashes={rjJoinFlashes} onDismiss={dismissRjFlash} count={listenerCount} />
      )}
      {canManageRJ ? renderRJControls() : renderListenerView()}
    </div>
  );

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
              {speakerConnecting ? 'Connecting to Stage...' : 'You are on Stage'}
            </h3>
            <p style={{ marginBottom: 0 }}>
              {speakerConnecting
                ? 'Setting up your microphone — please wait...'
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: speakerMicMuted ? '#f87171' : '#34d399' }}>
                <MicIcon muted={speakerMicMuted} />
                {speakerMicMuted ? 'MIC OFF' : 'MIC LIVE'}
              </span>
            </div>
          )}

          {speakerAudioBlocked && !speakerConnecting && (
            <button
              type="button"
              className="bp-listen-btn bp-listen-btn--join"
              style={{ marginBottom: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
              onClick={() => {
                if (speakerAudioEl.current) {
                  const vol = Math.max(0, Math.min(1, rjVoiceVolumeRef.current / 100));
                  speakerAudioEl.current.muted = vol === 0;
                  speakerAudioEl.current.volume = vol;
                  speakerAudioEl.current.play().then(() => setSpeakerAudioBlocked(false)).catch(() => {});
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              Tap to Hear Stage Audio
            </button>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {/* Mute / Unmute toggle */}
            {!speakerConnecting && (
              <button
                className={`bp-request-btn ${speakerMicMuted ? 'join' : 'cancel'}`}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={handleSpeakerMicToggle}
              >
                <MicIcon muted={!speakerMicMuted} />
                {speakerMicMuted ? 'Unmute Mic' : 'Mute Mic'}
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
                  <LiveAvatarImg
                    uid={req.uid}
                    gender={req.gender}
                    fallbackPhotoURL={req.photoURL}
                    className="bp-req-avatar"
                    alt={req.name}
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
            <LiveAvatarImg
              uid={req.uid}
              fallbackPhotoURL={req.avatar}
              className="bp-sq-avatar"
              alt={req.username}
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
                  <LiveAvatarImg
                    uid={req.uid}
                    fallbackPhotoURL={req.avatar}
                    className="bp-sq-avatar"
                    alt={req.username}
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
                  <LiveAvatarImg
                    className="bp-ann-card-avatar"
                    uid={ann.rjUid}
                    fallbackPhotoURL={isRealAvatarUpload(ann.rjAvatar) ? ann.rjAvatar : getDefaultAvatarUrl(ann.rjUid, 'male', false)}
                    alt={ann.rjName}
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

  /* ── TAB 4: Public Group Voice Calls (up to 20 people per call, multiple concurrent calls) ── */
  const renderPublicTab = () => {
    const others = publicBroadcasts.filter(b => b.id !== activePubCall?.id);
    const isHostOfActive = activePubCall?.hostUid === myUid;
    const partCount = pubParticipants.length;

    return (
      <div>
        {/* Active Group Voice Room Stage */}
        {activePubCall && (
          <div className="bp-grp-stage">
            <div className="bp-grp-stage-hdr">
              <div className="bp-grp-live-badge">
                <span className="bp-live-dot" />
                GROUP VOICE
              </div>
              <span className="bp-grp-cap-pill">
                <UsersIcon /> {partCount} / {MAX_PUB_PARTICIPANTS}
              </span>
              <span className="bp-grp-timer">{fmtTime(pubCallDuration)}</span>
              {isHostOfActive ? (
                <button className="bp-stop-broadcast-btn bp-grp-exit-btn" onClick={handleStopPublicBroadcast}>
                  End Call
                </button>
              ) : (
                <button className="bp-stop-broadcast-btn bp-grp-exit-btn" onClick={() => leavePublicGroupCall(activePubCall.id)}>
                  Leave
                </button>
              )}
            </div>

            <div className="bp-grp-title-bar">
              <span className="bp-grp-title">{activePubCall.title}</span>
              <span className="bp-grp-host-sub">Host: {activePubCall.hostName}</span>
            </div>

            {pubAudioBlocked && (
              <button
                type="button"
                className="bp-listen-btn bp-listen-btn--join"
                style={{ marginBottom: 10, padding: '9px 14px', fontSize: 12, background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
                onClick={() => {
                  Object.values(pubPeerAudioEls.current).forEach(el => {
                    try { el?.play?.(); } catch {}
                  });
                  setPubAudioBlocked(false);
                }}
              >
                Tap to Enable Group Call Audio
              </button>
            )}

            {/* Live Self Mic Meter & Quick Mute */}
            <div className="bp-grp-mic-bar">
              <button
                type="button"
                className={`bp-grp-mute-btn${pubMicMuted ? ' is-muted' : ''}`}
                onClick={handlePubMicToggle}
              >
                <MicIcon muted={pubMicMuted} />
                {pubMicMuted ? 'Unmute Mic' : 'Mic Live'}
              </button>
              <div className="bp-grp-level-track">
                <div
                  className="bp-grp-level-fill"
                  style={{
                    width: pubMicMuted ? '0%' : `${pubMicLevel}%`,
                    background: pubMicLevel > 60 ? '#34d399' : pubMicLevel > 20 ? '#fbbf24' : '#a78bfa',
                  }}
                />
              </div>
              <button
                type="button"
                className="bp-grp-min-pill"
                onClick={() => setIsMinimized(true)}
                title="Minimize and keep talking while chatting"
              >
                Minimize
              </button>
            </div>

            {/* Luxury Group Call Output Volume Slider */}
            <div className="bp-vol-mixer bp-vol-mixer--group">
              <div className="bp-vol-row">
                <button
                  type="button"
                  className={`bp-vol-icon-btn bp-vol-icon-btn--group${pubCallVolume === 0 ? ' is-muted' : ''}`}
                  onClick={() => setPubCallVolume(v => (v === 0 ? prevPubVolRef.current || 100 : 0))}
                  title={pubCallVolume === 0 ? 'Unmute Call Audio' : 'Mute Call Audio'}
                  aria-label="Toggle Group Call Audio Mute"
                >
                  <UsersIcon />
                </button>
                <span className="bp-vol-label">Call Audio</span>
                <div className="bp-vol-track-wrap" style={{ '--vol-pct': `${pubCallVolume}%` }}>
                  <div className="bp-vol-track-bg" />
                  <div className="bp-vol-track-fill bp-vol-track-fill--group" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={pubCallVolume}
                    onChange={e => setPubCallVolume(Number(e.target.value))}
                    className="bp-vol-range bp-vol-range--group"
                    aria-label="Group Call Volume"
                  />
                </div>
                <span className="bp-vol-val bp-vol-val--group">{pubCallVolume}%</span>
              </div>
            </div>

            {/* 20-Participant Live Voice Grid */}
            <div className="bp-grp-grid">
              {pubParticipants.map(p => {
                const isSelf = p.uid === myUid;
                const speaking = isSelf ? (!pubMicMuted && pubMicLevel > 14) : (!p.muted && !!pubSpeakingMap[p.uid]);
                const pState = isSelf ? 'connected' : (pubPeerStates[p.uid] || 'connecting');
                return (
                  <div key={p.uid} className={`bp-grp-tile${speaking ? ' is-speaking' : ''}${p.muted ? ' is-muted' : ''}`}>
                    <div className="bp-grp-av-wrap">
                      <LiveAvatarImg
                        uid={p.uid}
                        gender={p.gender || 'male'}
                        fallbackPhotoURL={p.avatar}
                        className="bp-grp-avatar"
                        alt={p.name}
                      />
                      <span className={`bp-grp-mic-badge${p.muted ? ' muted' : ''}`}>
                        <MicIcon muted={!!p.muted} />
                      </span>
                      {!isSelf && (
                        <span className={`bp-grp-conn-dot ${pState}`} title={pState} />
                      )}
                    </div>
                    <div className="bp-grp-name" title={p.name}>
                      {isSelf ? `${p.name} (You)` : p.name}
                    </div>
                    <div className="bp-grp-role-row">
                      {p.isHost && <span className="bp-grp-host-tag">HOST</span>}
                      {isHostOfActive && !isSelf && (
                        <button
                          type="button"
                          className="bp-grp-kick-btn"
                          onClick={() => handleKickPubParticipant(p.uid)}
                          title="Remove from call"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create New Concurrent Group Voice Call */}
        {!isGuest && !myActiveBroadcast && (
          <div className="bp-create-section">
            <div className="bp-create-card">
              <h3><BroadcastIcon size={16} /> Start Group Voice Call</h3>
              <p className="bp-grp-subnote">Create a multi-speaker voice room for up to {MAX_PUB_PARTICIPANTS} participants at once.</p>
              <div className="bp-create-form">
                <input
                  className="bp-input"
                  placeholder="Call room title (required)..."
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
                  <span style={{ marginLeft: 4 }}>Password protect this call</span>
                </label>
                {pubIsProtected && (
                  <input
                    className="bp-input"
                    placeholder="Set a password for participants..."
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
                  Start Group Call (Up to {MAX_PUB_PARTICIPANTS})
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
            <h3>Register to Join Group Calls</h3>
            <p>Create a free account to start or join group voice calls.</p>
          </div>
        )}

        {others.length > 0 ? (
          <>
            <div className="bp-broadcasts-list-label">Active Group Calls ({others.length})</div>
            <div className="bp-broadcast-items">
              {others.map(bc => {
                const count = bc.participantCount || bc.listenerCount || 1;
                const isFull = count >= (bc.maxParticipants || MAX_PUB_PARTICIPANTS);
                return (
                  <div key={bc.id} className="bp-broadcast-item">
                    <div className="bp-bc-avatar-wrap">
                      <LiveAvatarImg
                        className="bp-bc-avatar"
                        uid={bc.hostUid}
                        fallbackPhotoURL={isRealAvatarUpload(bc.hostAvatar) ? bc.hostAvatar : getDefaultAvatarUrl(bc.hostUid, 'male', false)}
                        alt={bc.hostName}
                      />
                      <span className="bp-bc-live-dot" />
                    </div>
                    <div className="bp-bc-info">
                      <div className="bp-bc-title">{bc.title}</div>
                      <div className="bp-bc-host">Host: {bc.hostName}</div>
                      <div className="bp-bc-meta">
                        <span className="bp-bc-chip"><UsersIcon /> {count} / {bc.maxParticipants || MAX_PUB_PARTICIPANTS}</span>
                        {bc.isPasswordProtected && <span className="bp-bc-chip bp-bc-locked"><LockIcon /> Private</span>}
                      </div>
                    </div>
                    <div className="bp-bc-actions">
                      <button
                        className={`bp-bc-join-btn${activePubCall?.id === bc.id ? ' listening' : ''}`}
                        onClick={() => handleJoinPublicBroadcast(bc)}
                        disabled={(pubJoining && activePubCall?.id !== bc.id) || (isFull && activePubCall?.id !== bc.id) || isGuest}
                      >
                        {isFull ? 'Full (20/20)' : pubJoining ? 'Joining...' : (
                          <><BroadcastIcon size={12} color="white" /> Join Call</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : !activePubCall ? (
          <div className="bp-empty">
            <div><BroadcastIcon size={36} /></div>
            No group calls active right now.
            <br />Start a group voice room for up to {MAX_PUB_PARTICIPANTS} people!
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
                <button className="bp-pw-btn confirm" onClick={handlePasswordSubmit}>Join Call</button>
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
    <>
      <audio ref={rjAudioEl} autoPlay playsInline style={{ display: 'none' }} />
      <audio ref={speakerAudioEl} autoPlay playsInline style={{ display: 'none' }} />
      {persistentYtElement}
      {isOpen && isMinimized && (
        <FloatingMinimizedBubble
          isLive={rjIsLive && canManageRJ}
          pubIsLive={!!activePubCall}
          pubCount={pubParticipants.length}
          onExpand={() => setIsMinimized(false)}
          onClose={() => { setIsMinimized(false); onClose(); }}
        />
      )}
      {isOpen && !isMinimized && (
    <div className="bp-overlay" onClick={onClose}>
      <div className="bp-panel" onClick={e => e.stopPropagation()}>

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
      )}
    </>
  );
};

export default BroadcastPanel;
