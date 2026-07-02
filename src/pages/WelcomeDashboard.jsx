import React, { useState, useEffect, useRef } from 'react';
import PremiumCopyright from '../components/PremiumCopyright';
import { Badges } from '../data/Badges';
import { getRoleDisplayLabel, getStoredGuestGender, getDefaultAvatarUrl } from '../utils/roleUtils';
import { auth, db, rtdb } from '../firebase/config';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, remove } from 'firebase/database';
import {
  signOut, updateProfile, updatePassword,
  deleteUser, EmailAuthProvider, reauthenticateWithCredential,
  onAuthStateChanged
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { pt } from '../utils/premiumToast';
import BanKickModal from '../components/BanKickModal';
import '../components/BanKickModal.css';
import './WelcomeDashboard.css';

/* ═══════════════════════════════════════════════════════
   PREMIUM ANIMATED SVG ICON LIBRARY
═══════════════════════════════════════════════════════ */
const Ico = ({ children, w = 20, h = 20, className = '', style = {} }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
    className={className}
    style={{ display: 'block', flexShrink: 0, ...style }}>
    {children}
  </svg>
);

/* ── Gear — spins on hover via CSS ── */
const GearIcon = ({ size = 20, animated = false }) => (
  <Ico w={size} h={size} className={animated ? 'wd-ico-spin-hover' : ''}>
    <defs>
      <linearGradient id="gearG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <circle cx="10" cy="10" r="3.2" fill="url(#gearG)" opacity="0.9"/>
    <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.7 3.7l1.4 1.4M14.9 14.9l1.4 1.4M3.7 16.3l1.4-1.4M14.9 5.1l1.4-1.4"
      stroke="url(#gearG)" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 5.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" stroke="url(#gearG)" strokeWidth="1.6" fill="none"/>
  </Ico>
);

/* ── Chat — animated typing dots ── */
const ChatIcon = ({ color = '#fff', animated = false }) => (
  <Ico w={22} h={22}>
    <defs>
      <linearGradient id="chatG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color === '#fff' ? '#818cf8' : color}/>
        <stop offset="100%" stopColor={color === '#fff' ? '#a855f7' : color}/>
      </linearGradient>
    </defs>
    <rect x="2" y="3" width="16" height="12" rx="4" fill={color === '#fff' ? color : 'url(#chatG)'} opacity="0.95"/>
    <path d="M2 12.5l3.5 4.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="7" cy="9" r="1.5" fill={color === '#fff' ? 'rgba(99,102,241,0.85)' : 'rgba(255,255,255,0.75)'} className={animated ? 'wd-dot-1' : ''}/>
    <circle cx="11" cy="9" r="1.5" fill={color === '#fff' ? 'rgba(99,102,241,0.85)' : 'rgba(255,255,255,0.75)'} className={animated ? 'wd-dot-2' : ''}/>
    <circle cx="15" cy="9" r="1.5" fill={color === '#fff' ? 'rgba(99,102,241,0.85)' : 'rgba(255,255,255,0.75)'} className={animated ? 'wd-dot-3' : ''}/>
  </Ico>
);

/* ── Arrow — slides right on button hover ── */
const ArrowIcon = ({ color = '#fff' }) => (
  <Ico w={18} h={18} className="wd-ico-arrow">
    <path d="M3.5 9h11M10 4l5 5-5 5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const ChevronDown = ({ color = 'currentColor' }) => (
  <Ico w={14} h={14}>
    <path d="M3 5l4 4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const ChevronRight = ({ color = '#a5b4fc' }) => (
  <Ico w={16} h={16}>
    <path d="M5 4l5 4-5 4" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const ChevronLeft = ({ color = '#6366f1' }) => (
  <Ico w={18} h={18}>
    <path d="M12 4l-5 5 5 5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const CloseIcon = ({ color = '#6366f1' }) => (
  <Ico w={18} h={18}>
    <path d="M4 4l10 10M14 4L4 14" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
  </Ico>
);

/* ── Edit — animated pencil ── */
const EditIcon = ({ color = '#6366f1', animated = false }) => (
  <Ico w={18} h={18} className={animated ? 'wd-ico-float' : ''}>
    <defs>
      <linearGradient id="editG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
    </defs>
    <path d="M13 3.5l1.5 1.5L5.5 14H4v-1.5L13 3.5z" fill={animated ? "url(#editG)" : color} opacity="0.9"/>
    <path d="M11.5 2l2.5 2.5" stroke={animated ? "url(#editG)" : color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M3 16h12" stroke={animated ? "url(#editG)" : color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </Ico>
);

/* ── Lock — glowing keyhole ── */
const LockIcon = ({ color = '#8b5cf6', animated = false }) => (
  <Ico w={18} h={18} className={animated ? 'wd-ico-lock' : ''}>
    <defs>
      <linearGradient id="lockG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
      <radialGradient id="lockRG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff" stopOpacity="1"/>
        <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.8"/>
      </radialGradient>
    </defs>
    <rect x="3" y="8.5" width="12" height="8" rx="2.5" fill="url(#lockG)" opacity="0.92"/>
    <path d="M6 8.5V7a3 3 0 0 1 6 0v1.5" stroke="url(#lockG)" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="9" cy="13" r="1.8" fill="url(#lockRG)"/>
    <path d="M9 14.8v.8" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
  </Ico>
);

/* ── At — rotating ring ── */
const AtIcon = ({ color = '#a855f7', animated = false }) => (
  <Ico w={18} h={18} className={animated ? 'wd-ico-rotate' : ''}>
    <defs>
      <linearGradient id="atG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc"/>
        <stop offset="100%" stopColor="#9333ea"/>
      </linearGradient>
    </defs>
    <circle cx="9" cy="9" r="3.2" stroke="url(#atG)" strokeWidth="1.8"/>
    <path d="M12.2 9v1.8a3 3 0 0 0 3-3A6.2 6.2 0 1 0 10.4 14.7" stroke="url(#atG)" strokeWidth="1.8" strokeLinecap="round"/>
  </Ico>
);

/* ── Sign Out ── */
const SignOutIcon = ({ color = '#f97316', animated = false }) => (
  <Ico w={18} h={18} className={animated ? 'wd-ico-slide' : ''}>
    <defs>
      <linearGradient id="soG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fb923c"/>
        <stop offset="100%" stopColor="#ea580c"/>
      </linearGradient>
    </defs>
    <path d="M12 5.5l4 3.5-4 3.5M16 9H7" stroke="url(#soG)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 3H4.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h5" stroke="url(#soG)" strokeWidth="1.8" strokeLinecap="round"/>
  </Ico>
);

/* ── Trash ── */
const TrashIcon = ({ color = '#ef4444', animated = false }) => (
  <Ico w={18} h={18} className={animated ? 'wd-ico-shake' : ''}>
    <defs>
      <linearGradient id="trashG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f87171"/>
        <stop offset="100%" stopColor="#dc2626"/>
      </linearGradient>
    </defs>
    <path d="M2.5 5h13M6 5V3.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V5M14 5l-1 10H5L4 5" stroke="url(#trashG)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 8v4M11 8v4" stroke="url(#trashG)" strokeWidth="1.5" strokeLinecap="round"/>
  </Ico>
);

const ShieldOkIcon = () => (
  <Ico w={14} h={14}>
    <path d="M7 1.5L2 3.8v3.3C2 9.9 4.2 12.6 7 13.5c2.8-.9 5-3.6 5-6.4V3.8L7 1.5z" fill="#10b981"/>
    <path d="M4.5 7.2l1.8 1.8 3.2-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const SparkleIcon = () => (
  <Ico w={14} h={14}>
    <path d="M7 1l1 3.2L11.2 5 8 6.2 7 9.4 6 6.2 2.8 5 6 3.8 7 1z" fill="#8b5cf6"/>
    <path d="M12 9l.5 1.5L14 11l-1.5.5L12 13l-.5-1.5L10 11l1.5-.5L12 9z" fill="#c4b5fd" opacity="0.7"/>
  </Ico>
);

const DiamondIcon = () => (
  <Ico w={16} h={16}>
    <defs>
      <linearGradient id="wd-dg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <path d="M8 1.5L1 6.5 8 14.5 15 6.5 8 1.5z" fill="url(#wd-dg)"/>
    <path d="M1 6.5h14" stroke="white" strokeWidth="0.7" opacity="0.4"/>
  </Ico>
);

const HeartIcon = () => (
  <Ico w={13} h={13}>
    <defs>
      <linearGradient id="wd-hg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899"/>
        <stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
    <path d="M6.5 11.5S1.5 8 1.5 4.5a3.3 3.3 0 0 1 5-2.85A3.3 3.3 0 0 1 11.5 4.5C11.5 8 6.5 11.5 6.5 11.5z" fill="url(#wd-hg)"/>
  </Ico>
);

/* ── Camera ── */
const CameraIcon = ({ color = '#6366f1' }) => (
  <Ico w={18} h={18}>
    <defs>
      <linearGradient id="camIcoG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
    </defs>
    <rect x="2" y="5.5" width="14" height="10" rx="2" fill="url(#camIcoG)" opacity="0.85"/>
    <circle cx="9" cy="10" r="2.5" fill="white"/>
    <path d="M6 5.5l1.5-2h3L12 5.5" stroke="url(#camIcoG)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

/* ── Key — animated premium ── */
const KeyIcon = ({ color = '#8b5cf6', animated = false }) => (
  <Ico w={18} h={18} className={animated ? 'wd-ico-key' : ''}>
    <defs>
      <linearGradient id="keyG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
      <radialGradient id="keyRG" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#f5f3ff"/>
        <stop offset="100%" stopColor="#a78bfa"/>
      </radialGradient>
    </defs>
    <circle cx="6.5" cy="9" r="3.5" fill="url(#keyRG)" stroke="url(#keyG)" strokeWidth="1.5"/>
    <path d="M9.5 9h5.5" stroke="url(#keyG)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M12.5 7.5v3M15 7.5v3" stroke="url(#keyG)" strokeWidth="1.5" strokeLinecap="round"/>
  </Ico>
);

/* ── EYE — premium animated gradient ── */
const EyeIcon = ({ animated = false }) => (
  <Ico w={20} h={20} className={animated ? 'wd-ico-eye' : ''}>
    <defs>
      <linearGradient id="eyeG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#a855f7"/>
      </linearGradient>
      <radialGradient id="pupilG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#c4b5fd"/>
        <stop offset="60%" stopColor="#7c3aed"/>
        <stop offset="100%" stopColor="#4c1d95"/>
      </radialGradient>
    </defs>
    <path d="M1.5 10S4.5 3.5 10 3.5 18.5 10 18.5 10s-3 6.5-8.5 6.5S1.5 10 1.5 10z"
      fill="none" stroke="url(#eyeG)" strokeWidth="1.6" strokeLinejoin="round"/>
    <circle cx="10" cy="10" r="3" fill="url(#pupilG)"/>
    <circle cx="8.8" cy="8.8" r="1" fill="white" opacity="0.6"/>
    <circle cx="10" cy="10" r="1.2" fill="#1e1b4b" opacity="0.7"/>
  </Ico>
);

/* ── EYE OFF — premium animated gradient ── */
const EyeOffIcon = ({ animated = false }) => (
  <Ico w={20} h={20} className={animated ? 'wd-ico-eye' : ''}>
    <defs>
      <linearGradient id="eyeOffG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="100%" stopColor="#a855f7"/>
      </linearGradient>
    </defs>
    <path d="M2 2l16 16" stroke="url(#eyeOffG)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M6.8 5.8C7.8 4.5 8.9 3.5 10 3.5c5.5 0 8.5 6.5 8.5 6.5s-.9 1.7-2.5 3.3"
      stroke="url(#eyeOffG)" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M11.5 14.2A8.5 8.5 0 0 1 10 16.5C4.5 16.5 1.5 10 1.5 10S2.5 8 4.5 6.5"
      stroke="url(#eyeOffG)" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M7.5 7.5A3 3 0 0 0 10 13" stroke="url(#eyeOffG)" strokeWidth="1.4" strokeLinecap="round"/>
  </Ico>
);

const WarnIcon = () => (
  <Ico w={20} h={20}>
    <path d="M10 2L1.5 17h17L10 2z" fill="#ef4444" opacity="0.15" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M10 8v4.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="10" cy="15" r="1.2" fill="#ef4444"/>
  </Ico>
);

const UndoIcon = ({ size = 20 }) => (
  <Ico w={size} h={size}>
    <defs>
      <linearGradient id="undoG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399"/>
        <stop offset="100%" stopColor="#059669"/>
      </linearGradient>
    </defs>
    <path d="M3.5 9.5A6.5 6.5 0 1 0 5 5.5" stroke="url(#undoG)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M3 5.5v4h4" stroke="url(#undoG)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Ico>
);

const HourglassIcon = ({ size = 22 }) => (
  <Ico w={size} h={size}>
    <defs>
      <linearGradient id="hgG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24"/>
        <stop offset="100%" stopColor="#f59e0b"/>
      </linearGradient>
    </defs>
    <path d="M4 2h14M4 20h14" stroke="url(#hgG)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M5 2l3.5 6.5L11 11M5 20l3.5-6.5L11 11M19 2l-3.5 6.5L13 11M19 20l-3.5-6.5L13 11" stroke="url(#hgG)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.5 8.5h5" stroke="url(#hgG)" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
    <path d="M10 14.5h2" stroke="url(#hgG)" strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
  </Ico>
);

const CheckCircleIcon = ({ size = 20 }) => (
  <Ico w={size} h={size}>
    <defs>
      <linearGradient id="ccG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399"/>
        <stop offset="100%" stopColor="#059669"/>
      </linearGradient>
    </defs>
    <circle cx="10" cy="10" r="8" fill="url(#ccG)" opacity="0.15" stroke="url(#ccG)" strokeWidth="1.5"/>
    <path d="M6.5 10l2.3 2.5 4.7-5" stroke="url(#ccG)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

/* ── Save / Check ── */
const SaveIcon = ({ color = '#fff', animated = false }) => (
  <Ico w={18} h={18} className={animated ? 'wd-ico-check' : ''}>
    <circle cx="9" cy="9" r="7.8" fill={color} opacity="0.15" stroke={color} strokeWidth="1.4"/>
    <path d="M5.5 9.3l2.3 2.5 4.7-5.1" stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Ico>
);

const UserIcon = ({ color = '#6366f1' }) => (
  <Ico w={18} h={18}>
    <circle cx="9" cy="6.5" r="3.5" fill={color} opacity="0.85"/>
    <path d="M1.5 17.5c0-4 3.4-7 7.5-7s7.5 3 7.5 7" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </Ico>
);

/* ── Clock / Restriction ── */
const ClockIcon = ({ color = '#f59e0b' }) => (
  <Ico w={18} h={18}>
    <defs>
      <linearGradient id="clockG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24"/>
        <stop offset="100%" stopColor="#f59e0b"/>
      </linearGradient>
    </defs>
    <circle cx="9" cy="9" r="7.5" stroke="url(#clockG)" strokeWidth="1.6" fill="rgba(251,191,36,0.08)"/>
    <path d="M9 5v4l2.5 2.5" stroke="url(#clockG)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
const uploadToImgBB = async (blob) => {
  const fd = new FormData();
  fd.append('image', blob);
  fd.append('key', 'bec822839da595fbbc6ffafddca80839');
  const r = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
  const j = await r.json();
  if (!j.success) throw new Error(j.error?.message || 'Upload failed');
  return j.data.url;
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
/* ── helper: read guest data from localStorage synchronously ── */
const readGuestFromStorage = () => {
  try {
    if (localStorage.getItem('isGuest') !== 'true') return null;
    const raw = localStorage.getItem('guestUser');
    const parsed = raw ? JSON.parse(raw) : null;
    // Always augment with the dedicated guestGender key — it is set synchronously
    // before signInAnonymously, so it is the most reliable source of truth.
    const dedicatedGender = localStorage.getItem('guestGender');
    if (parsed && dedicatedGender) parsed.gender = dedicatedGender;
    return parsed;
  } catch { return null; }
};

const WelcomeDashboard = () => {
  const navigate = useNavigate();
  const dropRef  = useRef(null);

  const [user, setUser]               = useState(null);
  // Lazy initializer — reads localStorage synchronously so first render already has correct data
  const [guestUser, setGuestUser]     = useState(() => readGuestFromStorage());
  const [currentDate, setCurrentDate] = useState(() => {
    try {
      if (localStorage.getItem('isGuest') !== 'true') return '';
      const raw = localStorage.getItem('guestUser');
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!raw) return today;
      const g = JSON.parse(raw);
      if (!g.createdAt) return today;
      const dt = new Date(g.createdAt);
      return isNaN(dt) ? today : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return ''; }
  });
  const [showBanModal, setShowBanModal] = useState(false);
  const [isScrolled, setIsScrolled]   = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showUserDrop, setShowUserDrop]   = useState(false);
  const [activeSubPanel, setActiveSubPanel] = useState(null);
  const [userRole, setUserRole]       = useState(() => localStorage.getItem('isGuest') === 'true' ? 'guest' : 'registered');
  const [userBadge, setUserBadge]     = useState(null);

  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowUserDrop(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    // Step 1 — immediately paint guest data from localStorage (zero-delay, covers first render)
    const isGuestLocal = localStorage.getItem('isGuest') === 'true';
    const gdRaw = localStorage.getItem('guestUser');
    if (isGuestLocal && gdRaw) {
      try {
        const parsed = JSON.parse(gdRaw);
        setGuestUser(parsed);
        setUserRole('guest');
        // Set currentDate immediately so it never shows '—' for guests
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        if (parsed.createdAt) {
          const dt = new Date(parsed.createdAt);
          setCurrentDate(!isNaN(dt) ? dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : today);
        } else {
          setCurrentDate(today);
        }
      } catch { /* ignore */ }
    }

    // Step 2 — listen for Firebase auth state so we catch the anonymous user resolving
    // after a page reload (Firebase auth is async, currentUser is null on first tick).
    const unsubAuth = onAuthStateChanged(auth, async (cu) => {
      if (!cu) return; // no Firebase user yet — guest data already set from localStorage above

      setUser(cu);

      // If anonymous (guest) Firebase user — pull display data from localStorage, fallback to Firestore
      if (cu.isAnonymous) {
        // Always mark as guest role immediately
        setUserRole('guest');

        // Try localStorage first
        let parsed = null;
        const gd = localStorage.getItem('guestUser');
        if (gd) {
          try { parsed = JSON.parse(gd); } catch { /* ignore */ }
        }

        // Always apply dedicated guestGender key — it is the most reliable source because
        // it is written synchronously before signInAnonymously in LoginPage.
        const dedicatedGender = localStorage.getItem('guestGender');
        if (dedicatedGender) {
          parsed = parsed ? { ...parsed, gender: dedicatedGender } : { gender: dedicatedGender, uid: cu.uid };
        }

        // Fallback: fetch from Firestore if localStorage is missing or incomplete
        if (!parsed || !parsed.displayName || !parsed.gender) {
          try {
            const snap = await getDoc(doc(db, 'users', cu.uid));
            if (snap.exists()) {
              const d = snap.data();
              const existingLocal = JSON.parse(localStorage.getItem('guestUser') || '{}');
              parsed = { ...existingLocal, ...d, uid: cu.uid };
              // Always prefer dedicated guestGender key over Firestore/localStorage
              if (dedicatedGender) parsed.gender = dedicatedGender;
              else if (!parsed.gender && existingLocal.gender) parsed.gender = existingLocal.gender;
              // Restore localStorage for future renders
              localStorage.setItem('guestUser', JSON.stringify(parsed));
              localStorage.setItem('isGuest', 'true');
            }
          } catch { /* ignore */ }
        }

        // Also use Firebase Auth displayName as ultimate fallback
        if (!parsed?.displayName && cu.displayName) {
          parsed = { ...(parsed || {}), displayName: cu.displayName, uid: cu.uid };
        }

        if (parsed) {
          setGuestUser(parsed);
          // Set member-since date — use createdAt or today for fresh guest sessions
          const rawDate = parsed.createdAt;
          if (rawDate) {
            const dt = new Date(rawDate);
            setCurrentDate(!isNaN(dt) ? dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
          } else {
            setCurrentDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
          }
        }
        return;
      }

      // Regular (non-anonymous) Firebase user — fetch Firestore profile
      try {
        const snap = await getDoc(doc(db, 'users', cu.uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.isBanned) { setShowBanModal(true); setInterval(() => setShowBanModal(true), 1000); }
          let dt = d.createdAt || cu.metadata.creationTime;
          if (dt?.toDate) dt = dt.toDate();
          else if (typeof dt === 'string') dt = new Date(dt);
          setCurrentDate(!isNaN(new Date(dt)) ? new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '');
          setUserRole(d.role || 'registered');
          setUserBadge(d.badge || null);
        }
      } catch { setCurrentDate(''); }
    });

    return () => unsubAuth();
  }, []);

  const handleLogout = async () => {
    try {
      const cu = auth.currentUser;
      if (cu?.isAnonymous) {
        // Guest — wipe all their Firebase data before leaving
        const uid = cu.uid;
        try { remove(ref(rtdb, `status/${uid}`)); } catch {}
        try { await deleteDoc(doc(db, 'users', uid)); } catch {}
        try { await deleteUser(cu); } catch {}
        localStorage.removeItem('guestUser');
        localStorage.removeItem('isGuest');
        localStorage.removeItem('guestGender');
      } else if (cu) {
        await signOut(auth);
      } else {
        localStorage.removeItem('guestUser');
        localStorage.removeItem('isGuest');
        localStorage.removeItem('guestGender');
      }
      pt.logout('Logged out successfully!');
      navigate('/');
    } catch { pt.error('Failed to logout'); }
  };

  const openPanel = () => { setActiveSubPanel(null); setShowSettingsPanel(true); };

  /* ── Role chip config ── */
  const getRoleConfig = () => {
    const normalizedRole = userRole === 'superowner' ? 'owner' : userRole;
    const staffRoles = ['owner', 'admin', 'moderator'];
    const effectiveRole = staffRoles.includes(normalizedRole)
      ? normalizedRole
      : (userBadge ? 'badge_holder' : normalizedRole);
    switch (effectiveRole) {
      case 'owner': {
        const ownerBadgeKey = userBadge || 'the_olympian';
        const ownerBadgeData = Badges[ownerBadgeKey];
        const ownerBadgeHtml = ownerBadgeData?.svg?.replace(/\{\.\.\.props\}/g, '') || '';
        return {
          label: ownerBadgeData?.name || 'Owner',
          cls: 'wd-role--owner',
          icon: ownerBadgeHtml
            ? <span style={{width:16,height:16,display:'inline-block',verticalAlign:'middle',flexShrink:0}} dangerouslySetInnerHTML={{__html: ownerBadgeHtml}} />
            : (
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true" style={{display:'block',flexShrink:0}}>
                <defs><linearGradient id="rc-owner" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs>
                <path d="M10 2.5L3 7l2 8h10l2-8L10 2.5z" fill="url(#rc-owner)"/>
                <circle cx="10" cy="7" r="1.8" fill="white" opacity="0.8"/>
              </svg>
            )
        };
      }
      case 'admin': return {
        label: 'High Council',
        cls: 'wd-role--admin',
        icon: (
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{display:'block',flexShrink:0}}>
            <defs><linearGradient id="rc-admin" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#ef4444"/></linearGradient></defs>
            <path d="M10 2L4 5v5c0 4 2.7 7.5 6 9 3.3-1.5 6-5 6-9V5L10 2z" fill="url(#rc-admin)" opacity="0.9"/>
            <path d="M7 10l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      };
      case 'moderator': return {
        label: 'Guardian',
        cls: 'wd-role--mod',
        icon: (
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{display:'block',flexShrink:0}}>
            <defs><linearGradient id="rc-mod" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#10b981"/></linearGradient></defs>
            <path d="M10 2L4 5v5c0 4 2.7 7.5 6 9 3.3-1.5 6-5 6-9V5L10 2z" fill="url(#rc-mod)" opacity="0.9"/>
            <path d="M7 10l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      };
      case 'badge_holder': {
        const badgeData = Badges[userBadge];
        const badgeHtml = badgeData?.svg?.replace(/\{\.\.\.props\}/g, '') || '';
        return {
          label: badgeData?.name || userBadge,
          cls: 'wd-role--badge',
          icon: badgeHtml
            ? <span style={{width:15,height:15,display:'inline-block',verticalAlign:'middle'}} dangerouslySetInnerHTML={{__html: badgeHtml}} />
            : <SparkleIcon />
        };
      }
      default: {
        if (userRole === 'guest') {
          // Read gender from ALL sources — state first (includes Firestore data), then localStorage
          const gender = (
            guestUser?.gender ||
            getStoredGuestGender() ||
            (() => { try { return JSON.parse(localStorage.getItem('guestUser') || '{}').gender || ''; } catch { return ''; } })()
          ).toLowerCase();

          // Check female FIRST to avoid wrong fallback
          if (gender === 'female') return {
            label: 'Stree',
            cls: 'wd-role--guest-female',
            icon: (
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true" style={{display:'block',flexShrink:0}}>
                <defs>
                  <linearGradient id="rc-stree" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f472b6"/>
                    <stop offset="100%" stopColor="#db2777"/>
                  </linearGradient>
                </defs>
                {/* Female symbol: circle + cross below */}
                <circle cx="10" cy="7.5" r="4.5" stroke="url(#rc-stree)" strokeWidth="1.7" fill="rgba(244,114,182,0.1)"/>
                <line x1="10" y1="12" x2="10" y2="18" stroke="url(#rc-stree)" strokeWidth="1.7" strokeLinecap="round"/>
                <line x1="7" y1="15.5" x2="13" y2="15.5" stroke="url(#rc-stree)" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            )
          };
          if (gender === 'transgender' || gender === 'other') return {
            label: 'Navrang',
            cls: 'wd-role--guest-transgender',
            icon: (
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true" style={{display:'block',flexShrink:0}}>
                <defs>
                  <linearGradient id="rc-navrang" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7"/>
                    <stop offset="50%" stopColor="#ec4899"/>
                    <stop offset="100%" stopColor="#3b82f6"/>
                  </linearGradient>
                </defs>
                {/* Transgender symbol: circle + male arrow top-right + female cross below */}
                <circle cx="9" cy="9" r="3.8" stroke="url(#rc-navrang)" strokeWidth="1.7" fill="rgba(168,85,247,0.1)"/>
                <line x1="11.7" y1="6.3" x2="16" y2="2" stroke="url(#rc-navrang)" strokeWidth="1.7" strokeLinecap="round"/>
                <polyline points="13,2 16,2 16,5" stroke="url(#rc-navrang)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <line x1="9" y1="12.8" x2="9" y2="17.5" stroke="url(#rc-navrang)" strokeWidth="1.7" strokeLinecap="round"/>
                <line x1="6.5" y1="15.5" x2="11.5" y2="15.5" stroke="url(#rc-navrang)" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            )
          };
          if (gender === 'male') return {
            label: 'Purush',
            cls: 'wd-role--guest-male',
            icon: (
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true" style={{display:'block',flexShrink:0}}>
                <defs><linearGradient id="rc-purush" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient></defs>
                <circle cx="8.5" cy="10.5" r="4.5" stroke="url(#rc-purush)" strokeWidth="1.7" fill="rgba(59,130,246,0.1)"/>
                <line x1="12" y1="7" x2="17" y2="2" stroke="url(#rc-purush)" strokeWidth="1.7" strokeLinecap="round"/>
                <polyline points="13,2 17,2 17,6" stroke="url(#rc-purush)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            )
          };
          return {
            label: 'Purush',
            cls: 'wd-role--guest-male',
            icon: (
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden="true" style={{display:'block',flexShrink:0}}>
                <defs><linearGradient id="rc-purush-fb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#1d4ed8"/></linearGradient></defs>
                <circle cx="8.5" cy="10.5" r="4.5" stroke="url(#rc-purush-fb)" strokeWidth="1.7" fill="rgba(59,130,246,0.1)"/>
                <line x1="12" y1="7" x2="17" y2="2" stroke="url(#rc-purush-fb)" strokeWidth="1.7" strokeLinecap="round"/>
                <polyline points="13,2 17,2 17,6" stroke="url(#rc-purush-fb)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            )
          };
        }
        return {
          label: 'Member',
          cls: 'wd-role--registered',
          icon: <DiamondIcon />
        };
      }
    }
  };
  const roleConfig = getRoleConfig();

  // Read displayName directly from localStorage for immediate render — no state lag
  const displayName = guestUser?.displayName
    || (() => { try { return JSON.parse(localStorage.getItem('guestUser') || '{}').displayName || ''; } catch { return ''; } })()
    || user?.displayName
    || 'User';
  const userEmail   = user?.email || guestUser?.email || '';
  const isVerified  = user?.emailVerified;
  const initials    = displayName.slice(0, 2).toUpperCase();
  const userPhoto   = guestUser?.photoURL || user?.photoURL || '';
  const maskedEmail = userEmail
    ? userEmail.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '·'.repeat(Math.min(b.length, 5)) + c)
    : '';

  /* ── settings rows ── */
  const isGuestUser = userRole === 'guest';
  const settingsRows = isGuestUser ? [
    { section: 'Session', items: [
      { label: 'Sign Out', sub: 'End current session', IconEl: <SignOutIcon animated />, color: '#f97316', bg: 'rgba(249,115,22,0.1)', action: handleLogout, danger: false },
    ]},
    { section: 'Locked Features', items: [
      { label: 'Edit Profile',     sub: 'Register to unlock',    IconEl: <EditIcon />,      color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', locked: true },
      { label: 'Change Username',  sub: 'Register to unlock',    IconEl: <AtIcon />,        color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', locked: true },
      { label: 'Change Password',  sub: 'Register to unlock',    IconEl: <KeyIcon />,       color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', locked: true },
      { label: 'Delete Account',   sub: 'Register to unlock',    IconEl: <TrashIcon />,     color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', locked: true },
    ]},
  ] : [
    { section: 'Profile', items: [
      { label: 'Edit Profile',     sub: 'Update avatar & info',          IconEl: <EditIcon animated />,     color: '#6366f1', bg: 'rgba(99,102,241,0.13)',  sub_id: 'edit-profile' },
      { label: 'Change Username',  sub: 'Edit your display name',        IconEl: <AtIcon animated />,       color: '#a855f7', bg: 'rgba(168,85,247,0.13)', sub_id: 'change-username' },
      { label: 'Change Password',  sub: 'Update your password',          IconEl: <KeyIcon animated />,      color: '#8b5cf6', bg: 'rgba(139,92,246,0.13)', sub_id: 'change-password' },
    ]},
    { section: 'Session', items: [
      { label: 'Sign Out',         sub: 'End current session',           IconEl: <SignOutIcon animated />,  color: '#f97316', bg: 'rgba(249,115,22,0.1)',  action: handleLogout,     danger: false },
      { label: 'Delete Account',   sub: 'Permanently remove account',    IconEl: <TrashIcon animated />,    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   sub_id: 'delete-account', danger: true  },
    ]},
  ];

  const handleRowClick = (item) => {
    if (item.locked) { pt.unlock('Register an account to unlock this feature!'); return; }
    if (item.sub_id) {
      if (!user && item.sub_id !== 'delete-account') { pt.info('Not available for guest users'); return; }
      setActiveSubPanel(item.sub_id);
    } else if (item.action) {
      item.action();
    }
  };

  return (
    <div className="wd-root">
      {/* Ambient bg orbs */}
      <div className="wd-bg" aria-hidden="true">
        <div className="wd-orb wd-orb-1" /><div className="wd-orb wd-orb-2" /><div className="wd-orb wd-orb-3" />
      </div>

      {/* ══ HEADER ══ */}
      <header className={`wd-header ${isScrolled ? 'wd-header--shadow' : ''}`}>
        <div className="wd-header-inner">
          <div className="wd-brand">
            <img src="/tingletap-logo.jpg" alt="TingleTap" className="wd-brand-logo" />
            <div className="wd-brand-text">
              <span className="wd-brand-name">TingleTap</span>
              <span className="wd-brand-ver">v1.0 · Premium</span>
            </div>
          </div>

          <div className="wd-header-right">
            {/* User chip + dropdown */}
            <div className="wd-chip-wrap" ref={dropRef}>
              <button className="wd-chip" onClick={() => setShowUserDrop(p => !p)}>
                <span className="wd-chip-av">
                  {userPhoto
                    ? <img src={userPhoto} alt={initials} className="wd-chip-av-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                    : null}
                  <span className="wd-chip-init" style={userPhoto ? {display:'none'} : {}}>{initials}</span>
                </span>
                <span className="wd-chip-name">{displayName.split(' ')[0]}</span>
                <span className={`wd-chip-arrow${showUserDrop ? ' open' : ''}`}><ChevronDown color="#7c3aed" /></span>
              </button>

              {showUserDrop && (
                <div className="wd-drop">
                  <div className="wd-drop-head">
                    <span className="wd-drop-tag">SIGNED IN AS</span>
                    <span className="wd-drop-uname">{displayName}</span>
                    {maskedEmail && <span className="wd-drop-email">{maskedEmail}</span>}
                  </div>
                  <div className="wd-drop-sep" />
                  <button className="wd-drop-item" onClick={() => { setShowUserDrop(false); navigate('/rooms'); }}>
                    <span className="wd-drop-ic"><ChatIcon color="#6366f1" /></span> Open Chat
                  </button>
                  <button className="wd-drop-item" onClick={() => { setShowUserDrop(false); openPanel(); }}>
                    <span className="wd-drop-ic"><GearIcon size={18} /></span> Account Settings
                  </button>
                  <div className="wd-drop-sep" />
                  <button className="wd-drop-item wd-drop-danger" onClick={() => { setShowUserDrop(false); handleLogout(); }}>
                    <span className="wd-drop-ic"><SignOutIcon color="#ef4444" /></span> Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Gear button */}
            <button className="wd-gear-btn" onClick={openPanel} title="Account Settings">
              <GearIcon size={20} animated />
            </button>
          </div>
        </div>
      </header>

      {/* ══ HERO MAIN ══ */}
      <main className="wd-main">
        <div className="wd-version-pill"><ShieldOkIcon /> <span>Stable Release · TingleTap</span></div>

        <div className="wd-hero-text">
          <h1 className="wd-hero-h1">
            Welcome back,<span className="wd-hero-name"> {displayName.split(' ')[0]}</span>
            <span className={`wd-role-chip ${roleConfig.cls}`}>
              {roleConfig.icon}
              <span className="wd-role-label">({roleConfig.label})</span>
            </span>
          </h1>
          <h2 className="wd-hero-h2">Connect with India,<br /><span className="wd-grad">one chat at a time.</span></h2>
          <p className="wd-hero-sub">
            A premium, real-time community built for meaningful connections.
          </p>
        </div>

        <div className="wd-cta-stack">
          {/* Launch Chat */}
          <button className="wd-launch-btn" onClick={() => navigate('/rooms')}>
            <span className="wd-launch-ico-wrap"><ChatIcon color="#fff" animated /></span>
            <span>Launch Chat</span>
            <ArrowIcon color="#fff" />
            <span className="wd-shimmer" />
          </button>

          {/* Account Settings */}
          <button className="wd-settings-btn" onClick={openPanel}>
            <GearIcon size={18} animated />
            <span>Account Settings</span>
          </button>

        </div>

        {/* ── COIN WALLET QUICK ACCESS (registered users only) ── */}
        {userRole !== 'guest' && (
          <div className="wd-coins-strip">
            <button className="wd-coin-btn wd-coin-btn--wallet" onClick={() => navigate('/wallet')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="15" rx="3" fill="#d97706" opacity=".9"/>
                <rect x="2" y="8" width="20" height="4" fill="#92400e" opacity=".35"/>
                <rect x="15" y="10" width="5" height="3" rx="1.5" fill="white" opacity=".9"/>
                <circle cx="16.5" cy="11.5" r="1" fill="#d97706"/>
                <path d="M6 3h8a2 2 0 012 2H4a2 2 0 012-2z" fill="#fbbf24"/>
              </svg>
              <span>My Wallet</span>
            </button>
            <button className="wd-coin-btn wd-coin-btn--buy" onClick={() => navigate('/buy-coins')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3z" fill="white"/>
                <circle cx="17" cy="17" r="5" fill="#7c3aed"/>
                <path d="M17 14v6M14 17h6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span>Buy Coins</span>
            </button>
            <button className="wd-coin-btn wd-coin-btn--lb" onClick={() => navigate('/leaderboard')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="4" width="6" height="16" rx="1.5" fill="#f59e0b"/>
                <rect x="3" y="9" width="5" height="11" rx="1.5" fill="#fbbf24" opacity=".75"/>
                <rect x="16" y="11" width="5" height="9" rx="1.5" fill="#fbbf24" opacity=".6"/>
                <path d="M11 7l.6 1.8H14l-1.6 1.2.6 1.8L11 10.8 8.9 12l.7-1.8L8 9l2.4-.1z" fill="white" opacity=".9"/>
              </svg>
              <span>Leaderboard</span>
            </button>
            {(userBadge?.toLowerCase() === 'rj' || userRole === 'rj') && (
              <button className="wd-coin-btn wd-coin-btn--rj" onClick={() => navigate('/rj-earnings')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="2" width="6" height="12" rx="3" fill="#34d399"/>
                  <path d="M5 10a7 7 0 0014 0" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                  <path d="M11 14h2v4h-2z" fill="#34d399"/>
                  <path d="M8 22h8" stroke="#34d399" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>RJ Earnings</span>
              </button>
            )}
          </div>
        )}

        {/* ── MEMBER CARD ── */}
        <div className="wd-member-wrap">

          {/* Joining date banner */}
          <div className="wd-ms-banner">
            <div className="wd-ms-icon">
              <svg width="22" height="22" viewBox="0 0 24 24"><defs><linearGradient id="calMG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f97316"/></linearGradient></defs><path d="M19,3H18V1H16V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V9H19V19M5,7V5H19V7H5M7,11H12V16H7V11Z" fill="url(#calMG)"/></svg>
            </div>
            <div className="wd-ms-text">
              <span className="wd-ms-label">Member Since</span>
              <span className="wd-ms-date">{(() => {
                if (currentDate) return currentDate;
                const src = guestUser || readGuestFromStorage();
                if (src?.createdAt) {
                  const dt = new Date(src.createdAt);
                  if (!isNaN(dt)) return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                }
                if (userRole === 'guest' || src) return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                return '—';
              })()}</span>
            </div>
            <div className={`wd-ms-badge wd-ms-badge--${userBadge ? 'badge' : (userRole || 'registered')}`}>
              <span className="wd-ms-badge-icon">{roleConfig.icon}</span>
              <span>{roleConfig.label}</span>
            </div>
          </div>

          {/* Tagline */}
          <div className="wd-ribbon-quote">
            <svg width="18" height="18" viewBox="0 0 24 24" className="wd-quote-icon"><defs><linearGradient id="qG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a855f7"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs><path d="M4.58,12.08C5.9,10.56 7.56,9.67 9.17,9.67V6C6.2,6 3.09,7.58 1,10.42L4.58,12.08M13.42,12.08C14.73,10.56 16.39,9.67 18,9.67V6C15.03,6 11.92,7.58 9.83,10.42L13.42,12.08M4.58,19.08C5.9,17.56 7.56,16.67 9.17,16.67V13C6.2,13 3.09,14.58 1,17.42L4.58,19.08M13.42,19.08C14.73,17.56 16.39,16.67 18,16.67V13C15.03,13 11.92,14.58 9.83,17.42L13.42,19.08Z" fill="url(#qG)"/></svg>
            <p>A premium, real-time community built for meaningful connections. The site existed before you — but your story with us begins on <strong>{currentDate || 'your first day'}</strong>.</p>
          </div>

          {/* Feature tiles */}
          <div className="wd-feature-grid">

            {/* 1 — Live Chat Rooms */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(99,102,241,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft1G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs>
                  <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z" fill="url(#ft1G)"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>Live Chat Rooms</strong>
                <span>Real-time text, voice & video</span>
              </div>
            </div>

            {/* 2 — Verified & Safe */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(16,185,129,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft2G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M17.13,17C15.92,18.85 14.11,20.24 12,20.92C9.89,20.24 8.08,18.85 6.87,17C6.53,16.5 6.24,15.97 6,15.42C6.95,14.03 9.17,13 12,13C14.83,13 17.05,14.03 18,15.42C17.76,15.97 17.47,16.5 17.13,17Z" fill="url(#ft2G)"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>Verified & Safe</strong>
                <span>Moderated · Encrypted · Secure</span>
              </div>
            </div>

            {/* 3 — Meaningful Bonds */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(236,72,153,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft3G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
                  <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" fill="url(#ft3G)"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>Meaningful Bonds</strong>
                <span>Private chats · Friend system</span>
              </div>
            </div>

            {/* 4 — Active Community */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(14,165,233,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft4G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8"/><stop offset="100%" stopColor="#0284c7"/></linearGradient></defs>
                  <path d="M16,11C17.66,11 18.99,9.66 18.99,8C18.99,6.34 17.66,5 16,5C14.34,5 13,6.34 13,8C13,9.66 14.34,11 16,11M8,11C9.66,11 10.99,9.66 10.99,8C10.99,6.34 9.66,5 8,5C6.34,5 5,6.34 5,8C5,9.66 6.34,11 8,11M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M16,13C15.71,13 15.38,13.02 15.03,13.05C16.19,13.89 17,15.02 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13Z" fill="url(#ft4G)"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>Active Community</strong>
                <span>555+ members · Growing daily</span>
              </div>
            </div>

            {/* 5 — TingleBot AutoMod */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(168,85,247,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft5G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c084fc"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
                  <rect x="3" y="6" width="18" height="13" rx="3" fill="url(#ft5G)" opacity=".9"/>
                  <rect x="3" y="6" width="18" height="13" rx="3" fill="white" opacity=".08"/>
                  <circle cx="8.5" cy="12.5" r="1.5" fill="white"/>
                  <circle cx="15.5" cy="12.5" r="1.5" fill="white"/>
                  <path d="M9.5 15.5c.7.8 1.6 1.3 2.5 1.3s1.8-.5 2.5-1.3" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <path d="M9 6V4M15 6V4" stroke="url(#ft5G)" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="9" cy="3.5" r="1" fill="url(#ft5G)"/>
                  <circle cx="15" cy="3.5" r="1" fill="url(#ft5G)"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>TingleBot AutoMod</strong>
                <span>Smart chat moderation guardian</span>
              </div>
            </div>

            {/* 6 — RJ Radio & Live Shows */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(239,68,68,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft6G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#dc2626"/></linearGradient></defs>
                  <rect x="9" y="2" width="6" height="11" rx="3" fill="url(#ft6G)" opacity=".9"/>
                  <path d="M5 10a7 7 0 0014 0" stroke="url(#ft6G)" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  <line x1="12" y1="17" x2="12" y2="20" stroke="url(#ft6G)" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="20" x2="16" y2="20" stroke="url(#ft6G)" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="19" cy="5" r="3" fill="#ef4444"/>
                  <path d="M17.8 5l.8.9L20.5 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>RJ Radio Shows</strong>
                <span>Verified RJ hosts live voice shows</span>
              </div>
            </div>

            {/* 7 — Live Broadcast (Public / Password-protected) */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(249,115,22,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft7G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fb923c"/><stop offset="100%" stopColor="#ea580c"/></linearGradient></defs>
                  <circle cx="12" cy="12" r="3.5" fill="url(#ft7G)"/>
                  <path d="M8 8a6 6 0 000 8" stroke="url(#ft7G)" strokeWidth="1.9" strokeLinecap="round" fill="none"/>
                  <path d="M16 8a6 6 0 010 8" stroke="url(#ft7G)" strokeWidth="1.9" strokeLinecap="round" fill="none"/>
                  <path d="M5 5a10 10 0 000 14" stroke="url(#ft7G)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".6"/>
                  <path d="M19 5a10 10 0 010 14" stroke="url(#ft7G)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".6"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>Live Broadcast</strong>
                <span>One-to-one or one-to-all · Password protected</span>
              </div>
            </div>

            {/* 7b — Broadcast Stage / Mini Podcast */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(139,92,246,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft7bG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
                  <rect x="8" y="2" width="8" height="12" rx="4" fill="url(#ft7bG)" opacity=".9"/>
                  <path d="M5 10a7 7 0 0014 0" stroke="url(#ft7bG)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                  <line x1="12" y1="17" x2="12" y2="20" stroke="url(#ft7bG)" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="5" cy="15" r="2.5" fill="url(#ft7bG)" opacity=".75"/>
                  <circle cx="19" cy="15" r="2.5" fill="url(#ft7bG)" opacity=".75"/>
                  <path d="M5 12.5v2.5M19 12.5v2.5" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>Broadcast Stage</strong>
                <span>Speak live alongside RJ · Mini podcast</span>
              </div>
            </div>

            {/* 7c — Auto Translation */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(6,182,212,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft7cG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#0891b2"/></linearGradient></defs>
                  <circle cx="12" cy="12" r="10" stroke="url(#ft7cG)" strokeWidth="1.6" fill="none" opacity=".5"/>
                  <path d="M2 12h20M12 2c-2.5 3-4 6.3-4 10s1.5 7 4 10M12 2c2.5 3 4 6.3 4 10s-1.5 7-4 10" stroke="url(#ft7cG)" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                  <path d="M5.5 7h4M7.5 7v5M7.5 12c0 0 1.5-2 3-2" stroke="url(#ft7cG)" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M13 14l1.5-4 1.5 4M13.5 12.5h2.5" stroke="url(#ft7cG)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>Auto Translation</strong>
                <span>Messages translated to your language</span>
              </div>
            </div>

            {/* 8 — Virtual Gifts & Coins */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(245,158,11,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft8G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
                  <path d="M20 12v-2h-2.18C17.93 9.08 18 8.55 18 8c0-2.21-1.79-4-4-4-1.58 0-2.93.93-3.57 2.27C9.93 4.93 8.58 4 7 4 4.79 4 3 5.79 3 8c0 .55.07 1.08.18 1.58V12H1l3 8h16l3-8h-3z" fill="url(#ft8G)" opacity=".9"/>
                  <circle cx="12" cy="10" r="2" fill="white" opacity=".7"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>Virtual Gifts & Coins</strong>
                <span>Send gifts · Support RJs</span>
              </div>
            </div>

            {/* 9 — Radio Channels */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(20,184,166,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft9G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#2dd4bf"/><stop offset="100%" stopColor="#0d9488"/></linearGradient></defs>
                  <rect x="2" y="8" width="20" height="13" rx="3" fill="url(#ft9G)" opacity=".9"/>
                  <rect x="2" y="8" width="20" height="13" rx="3" fill="white" opacity=".08"/>
                  <circle cx="7" cy="14.5" r="2.8" fill="white" opacity=".7"/>
                  <circle cx="7" cy="14.5" r="1.2" fill="url(#ft9G)"/>
                  <path d="M13 11.5h5M13 14.5h5M13 17.5h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".85"/>
                  <path d="M5 8V5a2 2 0 012-2h4a2 2 0 012 2v3" stroke="url(#ft9G)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>Radio Channels</strong>
                <span>Multiple live music stations</span>
              </div>
            </div>

            {/* 10 — Emoji Reactions */}
            <div className="wd-ftile">
              <div className="wd-ftile-icon" style={{background:'rgba(234,179,8,0.12)'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs><linearGradient id="ft10G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#facc15"/><stop offset="100%" stopColor="#ca8a04"/></linearGradient></defs>
                  <circle cx="12" cy="12" r="10" fill="url(#ft10G)" opacity=".9"/>
                  <circle cx="12" cy="12" r="10" fill="white" opacity=".07"/>
                  <circle cx="8.5" cy="9.5" r="1.4" fill="white" opacity=".9"/>
                  <circle cx="15.5" cy="9.5" r="1.4" fill="white" opacity=".9"/>
                  <path d="M7.5 14.5c1 2.5 7.5 2.5 9 0" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  <path d="M19 5.5l2-2M5 5.5L3 3.5" stroke="url(#ft10G)" strokeWidth="1.4" strokeLinecap="round" opacity=".6"/>
                </svg>
              </div>
              <div className="wd-ftile-body">
                <strong>Emoji Reactions</strong>
                <span>React live to any message</span>
              </div>
            </div>

          </div>

          {/* Bottom identity strip */}
          <div className="wd-identity-strip">
            <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="idG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c084fc"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" fill="url(#idG)"/></svg>
            <span>You are part of something real.</span>
            <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="id2G" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" fill="url(#id2G)"/></svg>
          </div>

        </div>

        <div className="wd-copyright-spacer" />
      </main>

      <PremiumCopyright />

      {/* ══ OVERLAY ══ */}
      <div className={`wd-overlay ${showSettingsPanel ? 'wd-overlay--on' : ''}`}
        onClick={() => setShowSettingsPanel(false)} />

      {/* ══ SETTINGS PANEL ══ */}
      <div className={`wd-panel ${showSettingsPanel ? 'wd-panel--open' : ''}`}>
        <div className="wd-handle" />

        {activeSubPanel === null && (
          <>
            {/* Panel head — user info */}
            <div className="wd-panel-head">
              <div className="wd-panel-user">
                <div className="wd-panel-av">
                  {userPhoto
                    ? <img src={userPhoto} alt={initials} className="wd-panel-av-img" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                    : null}
                  <span className="wd-panel-av-i" style={userPhoto ? {display:'none'} : {}}>{initials}</span>
                </div>
                <div className="wd-panel-meta">
                  <span className="wd-panel-uname">{displayName}</span>
                  {maskedEmail && <span className="wd-panel-email">{maskedEmail}</span>}
                  {isVerified && <span className="wd-panel-verified"><ShieldOkIcon /> Verified</span>}
                </div>
              </div>
              <button className="wd-panel-x" onClick={() => setShowSettingsPanel(false)}>
                <CloseIcon color="#6366f1" />
              </button>
            </div>
            <div className="wd-sep" />

            {/* Settings rows */}
            <div className="wd-panel-body">
              {settingsRows.map(({ section, items }) => (
                <div key={section} className="wd-section">
                  <p className="wd-section-lbl">{section.toUpperCase()}</p>
                  <div className="wd-card">
                    {items.map(({ label, sub, IconEl, color, bg, danger, sub_id, action }, i) => (
                      <React.Fragment key={label}>
                        <button
                          className={`wd-row${danger ? ' wd-row--danger' : ''}`}
                          onClick={() => handleRowClick({ label, sub, IconEl, color, bg, danger, sub_id, action })}
                        >
                          <span className="wd-row-ic" style={{ background: bg }}>{IconEl}</span>
                          <span className="wd-row-txt">
                            <span className="wd-row-lbl" style={danger ? { color: '#ef4444' } : {}}>{label}</span>
                            <span className="wd-row-sub">{sub}</span>
                          </span>
                          <span className="wd-row-arrow" style={danger ? { color: '#ef4444' } : {}}>
                            <ChevronRight color={danger ? '#ef4444' : '#a5b4fc'} />
                          </span>
                        </button>
                        {i < items.length - 1 && <div className="wd-row-sep" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="wd-safe" />
          </>
        )}

        {/* ── SUB PANELS ── */}
        {activeSubPanel && (
          <SubPanelWrapper onBack={() => setActiveSubPanel(null)} onClose={() => setShowSettingsPanel(false)}>
            {activeSubPanel === 'edit-profile'    && <EditProfilePanel user={user} onDone={() => setActiveSubPanel(null)} />}
            {activeSubPanel === 'change-username' && <ChangeUsernamePanel user={user} onDone={() => setActiveSubPanel(null)} />}
            {activeSubPanel === 'change-password' && <ChangePasswordPanel user={user} onDone={() => setActiveSubPanel(null)} />}
            {activeSubPanel === 'delete-account'  && <DeleteAccountPanel user={user} onDone={() => { setShowSettingsPanel(false); handleLogout(); }} />}
          </SubPanelWrapper>
        )}
      </div>

      {showBanModal && (
        <BanKickModal isVisible onClose={() => { setShowBanModal(true); }} />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   SUB-PANEL WRAPPER
═══════════════════════════════════════════════════════ */
const SubPanelWrapper = ({ children, onBack, onClose }) => (
  <div className="wd-sub">
    <div className="wd-sub-head">
      <button className="wd-sub-back" onClick={onBack}>
        <ChevronLeft color="#6366f1" />
        <span>Back</span>
      </button>
      <button className="wd-panel-x" onClick={onClose}><CloseIcon color="#6366f1" /></button>
    </div>
    <div className="wd-sub-body">{children}</div>
    <div className="wd-safe" />
  </div>
);

/* ═══════════════════════════════════════════════════════
   EDIT PROFILE PANEL
═══════════════════════════════════════════════════════ */
const EditProfilePanel = ({ user, onDone }) => {
  const [form, setForm] = useState({ displayName: '', gender: '', country: '', bio: '', status: '', age: '', relationship: '' });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const d = snap.exists() ? snap.data() : {};
      setForm({ displayName: d.displayName || user.displayName || '', gender: d.gender || '', country: d.country || '', bio: d.bio || '', status: d.status || '', age: d.age || '', relationship: d.relationship || '' });
      setPhotoPreview(d.photoURL || user.photoURL || '');
    })();
  }, [user]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { pt.error('Max 5MB allowed per image'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(f);
    setPhoto(f);
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) { pt.error('Display name required'); return; }
    setSaving(true);
    try {
      let photoURL = photoPreview;
      if (photo) {
        const fd = new FormData(); fd.append('image', photo); fd.append('key', 'bec822839da595fbbc6ffafddca80839');
        const r = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
        const j = await r.json();
        if (j.success) photoURL = j.data.url;
      }
      await updateProfile(user, { displayName: form.displayName, photoURL });

      const isGuestUser = user?.isAnonymous === true || localStorage.getItem('isGuest') === 'true';

      if (isGuestUser) {
        try {
          const existing = JSON.parse(localStorage.getItem('guestUser') || '{}');
          const updated = { ...existing, ...form, photoURL, role: 'guest', isGuest: true };
          localStorage.setItem('guestUser', JSON.stringify(updated));
          if (form.gender) localStorage.setItem('guestGender', form.gender);
        } catch { }
      } else {
        const allowedFormFields = { displayName: form.displayName, gender: form.gender, country: form.country, bio: form.bio, status: form.status, age: form.age, relationship: form.relationship };
        await setDoc(doc(db, 'users', user.uid), { ...allowedFormFields, photoURL, updatedAt: new Date().toISOString() }, { merge: true });
      }

      pt.profile('Profile updated successfully!');
      onDone();
    } catch (e) { pt.error(e.message); }
    finally { setSaving(false); }
  };

  const initials = form.displayName.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="wd-form-panel">
      <div className="wd-form-title">
        <EditIcon color="#6366f1" animated />
        Edit Profile
      </div>

      {/* Avatar */}
      <div className="wd-avatar-row">
        <div className="wd-avatar-circle" onClick={() => fileRef.current?.click()}>
          {photoPreview
            ? <img src={photoPreview} alt="avatar" className="wd-avatar-img" />
            : <span className="wd-avatar-init">{initials}</span>
          }
          <div className="wd-avatar-overlay"><CameraIcon color="#fff" /></div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
        <div className="wd-avatar-hint">
          <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="camG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8b5cf6"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs><path d="M12 15.5C13.66 15.5 15 14.16 15 12.5C15 10.84 13.66 9.5 12 9.5C10.34 9.5 9 10.84 9 12.5C9 14.16 10.34 15.5 12 15.5ZM9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9Z" fill="url(#camG)"/></svg>
          Tap to change photo
          <svg width="12" height="12" viewBox="0 0 24 24"><defs><linearGradient id="strG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" fill="url(#strG)"/></svg>
        </div>
      </div>

      <div className="wd-fields">
        <div className="wd-field-group">
          <label className="wd-label">
            <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="userG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a855f7"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" fill="url(#userG)"/></svg>
            Display Name *
          </label>
          <input className="wd-input" value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} placeholder="Your name" />
        </div>
        <div className="wd-field-row">
          <div className="wd-field-group">
            <label className="wd-label">
              <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="genG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#ec4899"/></linearGradient></defs><path d="M9,9H7V7H9V9M17,7H15V9H17V7M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2Z" fill="url(#genG)"/></svg>
              Gender
            </label>
            <select className="wd-input" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="wd-field-group">
            <label className="wd-label">
              <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="ageG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f97316"/></linearGradient></defs><path d="M19,3H18V1H16V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V9H19V19M5,7V5H19V7H5M7,11H12V16H7V11Z" fill="url(#ageG)"/></svg>
              Age
            </label>
            <input className="wd-input" type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} placeholder="Age" />
          </div>
        </div>
        <div className="wd-field-group">
          <label className="wd-label">
            <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="cntG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8"/><stop offset="100%" stopColor="#0ea5e9"/></linearGradient></defs><path d="M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" fill="url(#cntG)"/></svg>
            Country
          </label>
          <input className="wd-input" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder="India" />
        </div>
        <div className="wd-field-group">
          <label className="wd-label">
            <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="stG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#10b981"/></linearGradient></defs><path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z" fill="url(#stG)"/></svg>
            Status
          </label>
          <input className="wd-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} placeholder="e.g. Feeling good ✨" maxLength={80} />
        </div>
        <div className="wd-field-group">
          <label className="wd-label">
            <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="bioG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient></defs><path d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.5 6.5,20.5C8.45,20.5 10.55,20.9 12,22C13.35,21.15 15.8,20.5 17.5,20.5C19.15,20.5 20.85,20.81 22.25,21.56C22.35,21.61 22.4,21.59 22.5,21.59C22.75,21.59 23,21.34 23,21.09V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,19.15 12,20V6.5C10.55,5.4 8.45,5 6.5,5Z" fill="url(#bioG)"/></svg>
            Bio
          </label>
          <textarea className="wd-input wd-textarea" rows={3} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell people about yourself..." maxLength={200} />
        </div>
        <div className="wd-field-group">
          <label className="wd-label">
            <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="relG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#e11d48"/></linearGradient></defs><path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" fill="url(#relG)"/></svg>
            Relationship
          </label>
          <select className="wd-input" value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))}>
            <option value="">Select</option>
            <option value="single">Single</option>
            <option value="taken">Taken</option>
            <option value="married">Married</option>
            <option value="complicated">It's complicated</option>
          </select>
        </div>
      </div>

      <button className="wd-save-btn" onClick={handleSave} disabled={saving}>
        {saving ? <span className="wd-spin" /> : <SaveIcon color="#fff" animated />}
        <span>{saving ? 'Saving…' : 'Save Changes'}</span>
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   CHANGE USERNAME PANEL  (90-day restriction)
═══════════════════════════════════════════════════════ */
const ChangeUsernamePanel = ({ user, onDone }) => {
  const [username, setUsername]       = useState(user?.displayName || '');
  const [saving, setSaving]           = useState(false);
  const [loading, setLoading]         = useState(true);
  const [lastChanged, setLastChanged] = useState(null);   // ISO string or null
  const DAYS_90 = 90 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setLastChanged(d.usernameChangedAt || null);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [user]);

  /* ── restriction logic ── */
  const now = Date.now();
  const lastMs = lastChanged ? new Date(lastChanged).getTime() : 0;
  const elapsed = now - lastMs;
  const isRestricted = lastChanged && elapsed < DAYS_90;
  const daysLeft = isRestricted ? Math.ceil((DAYS_90 - elapsed) / (24 * 60 * 60 * 1000)) : 0;
  const nextDate = isRestricted
    ? new Date(lastMs + DAYS_90).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const handleSave = async () => {
    if (isRestricted) { pt.error(`You can change username after ${daysLeft} more day(s)`); return; }
    const val = username.trim();
    if (!val) { pt.error('Username cannot be empty'); return; }
    if (val.length < 2) { pt.error('Minimum 2 characters required'); return; }
    if (val.length > 30) { pt.error('Maximum 30 characters allowed'); return; }
    if (val === user.displayName) { pt.info('Username is already the same'); return; }
    setSaving(true);
    try {
      const changedAt = new Date().toISOString();
      await updateProfile(user, { displayName: val });
      await setDoc(doc(db, 'users', user.uid), {
        displayName: val,
        usernameChangedAt: changedAt,
        updatedAt: changedAt
      }, { merge: true });
      pt.username('Username updated! Next change allowed in 90 days.');
      onDone();
    } catch (e) { pt.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="wd-form-panel">
      <div style={{ display:'flex', justifyContent:'center', padding:'30px 0' }}>
        <span className="wd-spin" style={{ borderColor:'rgba(168,85,247,.3)', borderTopColor:'#a855f7' }} />
      </div>
    </div>
  );

  return (
    <div className="wd-form-panel">
      <div className="wd-form-title">
        <AtIcon color="#a855f7" animated />
        Change Username
      </div>

      {/* 90-day restriction banner */}
      {isRestricted ? (
        <div className="wd-restrict-box">
          <div className="wd-restrict-icon"><ClockIcon /></div>
          <div className="wd-restrict-body">
            <p className="wd-restrict-title">Username locked for {daysLeft} more day{daysLeft !== 1 ? 's' : ''}</p>
            <p className="wd-restrict-sub">You can change your username again on <strong>{nextDate}</strong>.</p>
            <p className="wd-restrict-note">Usernames can only be changed once every 90 days to protect community identity.</p>
          </div>
        </div>
      ) : (
        <p className="wd-form-desc">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#a855f7" style={{flexShrink:0,marginTop:'1px'}}>
            <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          Choose a unique display name. You can only change it once every 90 days.
        </p>
      )}

      <div className="wd-fields">
        <div className="wd-field-group">
          <label className="wd-label">
            <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="unG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c084fc"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs><path d="M12,15C12.81,15 13.5,14.7 14.11,14.11C14.7,13.5 15,12.81 15,12C15,11.19 14.7,10.5 14.11,9.89C13.5,9.3 12.81,9 12,9C11.19,9 10.5,9.3 9.89,9.89C9.3,10.5 9,11.19 9,12C9,12.81 9.3,13.5 9.89,14.11C10.5,14.7 11.19,15 12,15M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,14.21 19.12,16.21 17.65,17.65C16.21,19.12 14.21,20 12,20Z" fill="url(#unG)"/></svg>
            New Username
          </label>
          <input
            className="wd-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Your new username"
            maxLength={30}
            disabled={isRestricted}
            style={isRestricted ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          />
          <span className="wd-char-count">{username.length}/30</span>
        </div>
      </div>

      {lastChanged && !isRestricted && (
        <p className="wd-form-note">
          <ClockIcon color="#a855f7" />
          Last changed: {new Date(lastChanged).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
        </p>
      )}

      <button
        className="wd-save-btn"
        style={{ background: isRestricted ? 'linear-gradient(135deg,#9ca3af,#6b7280)' : 'linear-gradient(135deg,#a855f7,#7c3aed)' }}
        onClick={handleSave}
        disabled={saving || isRestricted}
      >
        {saving ? <span className="wd-spin" /> : <SaveIcon color="#fff" animated />}
        <span>{saving ? 'Saving…' : isRestricted ? `Locked · ${daysLeft} days left` : 'Update Username'}</span>
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   CHANGE PASSWORD PANEL
═══════════════════════════════════════════════════════ */
const ChangePasswordPanel = ({ user, onDone }) => {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
  const [show, setShow] = useState({ current: false, newPw: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.current) { pt.error('Enter current password'); return; }
    if (form.newPw.length < 6) { pt.error('New password must be at least 6 characters'); return; }
    if (form.newPw !== form.confirm) { pt.error('Passwords do not match'); return; }
    if (form.newPw === form.current) { pt.error('New password must be different from current'); return; }
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, form.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, form.newPw);
      await setDoc(doc(db, 'users', user.uid), { passwordChangedAt: new Date().toISOString() }, { merge: true });
      pt.password('Password updated successfully!');
      onDone();
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') pt.error('Current password is incorrect');
      else pt.error(e.message);
    }
    finally { setSaving(false); }
  };

  const pwStrength = (pw) => {
    if (!pw) return null;
    if (pw.length < 6) return { label: 'Too short', color: '#ef4444', w: '20%' };
    if (pw.length < 8) return { label: 'Weak', color: '#f97316', w: '40%' };
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw) && pw.length >= 10) return { label: 'Strong', color: '#10b981', w: '100%' };
    if (pw.length >= 8) return { label: 'Good', color: '#a855f7', w: '70%' };
    return { label: 'Fair', color: '#f59e0b', w: '55%' };
  };
  const strength = pwStrength(form.newPw);

  const pwField = (field, label, placeholder) => (
    <div className="wd-field-group">
      <label className="wd-label">
        <KeyIcon animated />
        {label}
      </label>
      <div className="wd-pw-wrap">
        <input
          className="wd-input"
          type={show[field] ? 'text' : 'password'}
          value={form[field]}
          onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          placeholder={placeholder || '••••••••'}
          autoComplete={field === 'current' ? 'current-password' : 'new-password'}
        />
        <button className="wd-eye" type="button" onClick={() => setShow(p => ({ ...p, [field]: !p[field] }))}>
          {show[field] ? <EyeOffIcon animated /> : <EyeIcon animated />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="wd-form-panel">
      <div className="wd-form-title">
        <KeyIcon animated />
        Change Password
      </div>
      <p className="wd-form-desc">
        <LockIcon color="#8b5cf6" animated />
        Re-authenticate with your current password, then set a new secure one.
      </p>
      <div className="wd-fields">
        {pwField('current', 'Current Password', 'Enter current password')}
        {pwField('newPw', 'New Password', 'Min. 6 characters')}

        {/* Password strength bar */}
        {form.newPw && (
          <div className="wd-strength-wrap">
            <div className="wd-strength-bar">
              <div className="wd-strength-fill" style={{ width: strength?.w, background: strength?.color }} />
            </div>
            <span className="wd-strength-lbl" style={{ color: strength?.color }}>{strength?.label}</span>
          </div>
        )}

        {pwField('confirm', 'Confirm New Password', 'Re-enter new password')}

        {form.newPw && form.confirm && form.newPw !== form.confirm && (
          <p className="wd-err-msg">⚠ Passwords don't match</p>
        )}
        {form.newPw && form.confirm && form.newPw === form.confirm && form.newPw.length >= 6 && (
          <p className="wd-ok-msg">✓ Passwords match</p>
        )}
      </div>
      <button
        className="wd-save-btn"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? <span className="wd-spin" /> : <LockIcon color="#fff" animated />}
        <span>{saving ? 'Updating…' : 'Update Password'}</span>
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   DELETE ACCOUNT PANEL
═══════════════════════════════════════════════════════ */
const DeleteAccountPanel = ({ user, onDone }) => {
  const [step, setStep]           = useState('loading');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy]           = useState(false);
  const [schedAt, setSchedAt]     = useState(null);
  const [timeLeft, setTimeLeft]   = useState({ h: 72, m: 0, s: 0, total: 72 * 3600000 });

  const execDelete = async () => {
    try {
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      pt.delete('Account permanently deleted.');
      onDone();
    } catch (e) {
      pt.error('Auto-deletion failed: ' + e.message);
    }
  };

  useEffect(() => {
    if (!user) { setStep('verify'); return; }
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      const data = snap.exists() ? snap.data() : {};
      if (data.deletionPending && data.scheduledDeleteAt) {
        const at = data.scheduledDeleteAt;
        if (Date.now() >= at) {
          setStep('executing');
          execDelete();
        } else {
          setSchedAt(at);
          setStep('scheduled');
        }
      } else {
        setStep('verify');
      }
    }).catch(() => setStep('verify'));
  }, [user]);

  useEffect(() => {
    if (step !== 'scheduled' || !schedAt) return;
    const tick = () => {
      const diff = schedAt - Date.now();
      if (diff <= 0) { setStep('executing'); execDelete(); return; }
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        total: diff
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [step, schedAt]);

  const handleSchedule = async () => {
    if (!confirmed) { pt.error('Please confirm you understand'); return; }
    if (!password)  { pt.error('Enter your current password'); return; }
    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, cred);
      const deleteAt = Date.now() + 72 * 60 * 60 * 1000;
      await setDoc(doc(db, 'users', user.uid), {
        deletionPending: true,
        scheduledDeleteAt: deleteAt,
        deletionScheduledOn: new Date().toISOString()
      }, { merge: true });
      setSchedAt(deleteAt);
      setStep('scheduled');
      pt.schedule('Deletion scheduled — you have 72 hours to revert');
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') pt.error('Incorrect password');
      else pt.error(e.message);
    } finally { setBusy(false); }
  };

  const handleRevert = async () => {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        deletionPending: false,
        scheduledDeleteAt: null,
        deletionScheduledOn: null
      });
      pt.cancel('Account deletion cancelled! Your account is safe.');
      onDone();
    } catch (e) { pt.error(e.message); }
    finally { setBusy(false); }
  };

  const pad = (n) => String(n).padStart(2, '0');
  const pct = schedAt ? Math.max(0, Math.min(100, (timeLeft.total / (72 * 3600000)) * 100)) : 100;
  const deletionDate = schedAt ? new Date(schedAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';

  if (step === 'loading' || step === 'executing') return (
    <div className="wd-form-panel" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
      <span className="wd-spin" style={{ width: 32, height: 32, borderWidth: 3, borderColor: 'rgba(99,102,241,.2)', borderTopColor: '#6366f1' }} />
      <p style={{ color: '#6d6b99', fontSize: 13.5, marginTop: 10 }}>{step === 'executing' ? 'Deleting account…' : 'Loading…'}</p>
    </div>
  );

  if (step === 'scheduled') return (
    <div className="wd-form-panel">
      <div className="wd-form-title" style={{ color: '#d97706' }}>
        <HourglassIcon size={22} />
        Deletion Scheduled
      </div>

      <div className="wd-sched-card">
        <div className="wd-sched-card__header">
          <div className="wd-sched-card__dot" />
          <span>Auto-deletes on <strong>{deletionDate}</strong></span>
        </div>

        <div className="wd-countdown-wrap">
          <div className="wd-countdown-block">
            <span className="wd-countdown-digits">{pad(timeLeft.h)}</span>
            <span className="wd-countdown-label">Hours</span>
          </div>
          <span className="wd-countdown-sep">:</span>
          <div className="wd-countdown-block">
            <span className="wd-countdown-digits">{pad(timeLeft.m)}</span>
            <span className="wd-countdown-label">Minutes</span>
          </div>
          <span className="wd-countdown-sep">:</span>
          <div className="wd-countdown-block">
            <span className="wd-countdown-digits">{pad(timeLeft.s)}</span>
            <span className="wd-countdown-label">Seconds</span>
          </div>
        </div>

        <div className="wd-sched-bar-wrap">
          <div className="wd-sched-bar">
            <div className="wd-sched-bar__fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="wd-sched-bar__label">{Math.round(pct)}% time remaining</span>
        </div>
      </div>

      <div className="wd-sched-info">
        <WarnIcon />
        <p>If you do not revert before the timer ends, your account, messages, friends and all data will be <strong>permanently erased</strong> and cannot be recovered.</p>
      </div>

      <button className="wd-revert-btn" onClick={handleRevert} disabled={busy}>
        {busy ? <span className="wd-spin" /> : <UndoIcon size={20} />}
        <span>{busy ? 'Reverting…' : 'Cancel & Keep My Account'}</span>
      </button>

      <p className="wd-sched-note">
        <CheckCircleIcon size={14} />
        Clicking above will immediately cancel the deletion and restore your account.
      </p>
    </div>
  );

  return (
    <div className="wd-form-panel">
      <div className="wd-form-title" style={{ color: '#ef4444' }}>
        <TrashIcon color="#ef4444" animated />
        Delete Account
      </div>

      <div className="wd-danger-box">
        <WarnIcon />
        <div>
          <p className="wd-danger-title">You get a 72-hour safety window</p>
          <p className="wd-danger-sub">After confirming, your account will be <strong>scheduled</strong> for deletion — not deleted immediately. You can revert within 72 hours. After that, everything is gone forever.</p>
        </div>
      </div>

      <div className="wd-fields">
        <div className="wd-field-group">
          <label className="wd-label">
            <KeyIcon animated />
            Current Password
          </label>
          <div className="wd-pw-wrap">
            <input
              className="wd-input wd-input--danger"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your current password"
              onKeyDown={e => e.key === 'Enter' && handleSchedule()}
            />
            <button className="wd-eye" type="button" onClick={() => setShowPw(p => !p)}>
              {showPw ? <EyeOffIcon animated /> : <EyeIcon animated />}
            </button>
          </div>
        </div>

        <label className="wd-confirm-chk">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          <span>I understand my account will be <strong>permanently deleted</strong> after 72 hours if I don't revert</span>
        </label>
      </div>

      <button
        className="wd-save-btn wd-save-btn--danger"
        onClick={handleSchedule}
        disabled={busy || !confirmed || !password}
      >
        {busy ? <span className="wd-spin" /> : <HourglassIcon size={18} />}
        <span>{busy ? 'Scheduling…' : 'Schedule Deletion (72h to Revert)'}</span>
      </button>
    </div>
  );
};

export default WelcomeDashboard;
