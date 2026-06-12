import React, { useState, useEffect, useRef } from 'react';
import PremiumCopyright from '../components/PremiumCopyright';
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  signOut, updateProfile, updatePassword,
  deleteUser, EmailAuthProvider, reauthenticateWithCredential
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BanKickModal from '../components/BanKickModal';
import '../components/BanKickModal.css';
import './WelcomeDashboard.css';

/* ═══════════════════════════════════════════════════════
   PREMIUM SVG ICON LIBRARY
═══════════════════════════════════════════════════════ */
const Ico = ({ children, w = 20, h = 20 }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
    {children}
  </svg>
);

const GearIcon = ({ size = 20, color = 'currentColor' }) => (
  <Ico w={size} h={size}>
    <path d="M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill={color} opacity="0.9"/>
    <path d="M16.5 10a6.5 6.5 0 0 0-.06-.87l1.8-1.4-1.74-3.02-2.1.85A6.47 6.47 0 0 0 12.9 4.4L12.5 2.2h-3l-.4 2.2a6.47 6.47 0 0 0-1.5 1.16l-2.1-.85L3.76 7.73l1.8 1.4A6.5 6.5 0 0 0 5.5 10c0 .3.02.59.06.87l-1.8 1.4 1.74 3.02 2.1-.85c.46.44.96.81 1.5 1.16l.4 2.2h3l.4-2.2a6.47 6.47 0 0 0 1.5-1.16l2.1.85 1.74-3.02-1.8-1.4c.04-.28.06-.57.06-.87z"
      stroke={color} strokeWidth="1.3" fill="none"/>
  </Ico>
);

const ChatIcon = ({ color = '#fff' }) => (
  <Ico w={22} h={22}>
    <rect x="2" y="3" width="16" height="12" rx="4" fill={color} opacity="0.95"/>
    <path d="M2 12.5l3.5 4.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="7" cy="9" r="1.5" fill={color === '#fff' ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.7)'}/>
    <circle cx="11" cy="9" r="1.5" fill={color === '#fff' ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.7)'}/>
    <circle cx="15" cy="9" r="1.5" fill={color === '#fff' ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.7)'}/>
  </Ico>
);

const ArrowIcon = ({ color = '#fff' }) => (
  <Ico w={18} h={18}>
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

const EditIcon = ({ color = '#6366f1' }) => (
  <Ico w={18} h={18}>
    <path d="M13 3.5l1.5 1.5L5.5 14H4v-1.5L13 3.5z" fill={color} opacity="0.9"/>
    <path d="M11.5 2l2.5 2.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M3 16h12" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </Ico>
);

const LockIcon = ({ color = '#8b5cf6' }) => (
  <Ico w={18} h={18}>
    <rect x="3" y="8.5" width="12" height="8" rx="2.5" fill={color} opacity="0.9"/>
    <path d="M6 8.5V7a3 3 0 0 1 6 0v1.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="9" cy="13" r="1.5" fill="white"/>
    <path d="M9 14.5v1" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
  </Ico>
);

const AtIcon = ({ color = '#a855f7' }) => (
  <Ico w={18} h={18}>
    <circle cx="9" cy="9" r="3.2" stroke={color} strokeWidth="1.8"/>
    <path d="M12.2 9v1.8a3 3 0 0 0 3-3A6.2 6.2 0 1 0 10.4 14.7" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </Ico>
);

const SignOutIcon = ({ color = '#f97316' }) => (
  <Ico w={18} h={18}>
    <path d="M12 5.5l4 3.5-4 3.5M16 9H7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 3H4.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </Ico>
);

const TrashIcon = ({ color = '#ef4444' }) => (
  <Ico w={18} h={18}>
    <path d="M2.5 5h13M6 5V3.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V5M14 5l-1 10H5L4 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 8v4M11 8v4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
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

const CameraIcon = ({ color = '#6366f1' }) => (
  <Ico w={18} h={18}>
    <path d="M2 5.5h14v10H2V5.5z" fill={color} opacity="0.85" rx="2"/>
    <circle cx="9" cy="10" r="2.5" fill="white"/>
    <path d="M6 5.5l1.5-2h3L12 5.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </Ico>
);

const KeyIcon = ({ color = '#8b5cf6' }) => (
  <Ico w={18} h={18}>
    <circle cx="6.5" cy="9" r="3.5" stroke={color} strokeWidth="1.8"/>
    <path d="M9.5 9h5.5M12 7v4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </Ico>
);

const EyeIcon = ({ color = '#6d6b99' }) => (
  <Ico w={18} h={18}>
    <path d="M1 9S4 3.5 9 3.5 17 9 17 9s-3 5.5-8 5.5S1 9 1 9z" stroke={color} strokeWidth="1.6"/>
    <circle cx="9" cy="9" r="2.5" fill={color} opacity="0.8"/>
  </Ico>
);

const EyeOffIcon = ({ color = '#6d6b99' }) => (
  <Ico w={18} h={18}>
    <path d="M2 2l14 14M6.5 5.5C7.3 4.2 8.1 3.5 9 3.5c5 0 8 5.5 8 5.5s-.8 1.5-2.3 3M10.5 13.3A8.7 8.7 0 0 1 9 14.5C4 14.5 1 9 1 9s.8-1.5 2.3-3" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="9" cy="9" r="2.5" fill={color} opacity="0.4"/>
  </Ico>
);

const WarnIcon = () => (
  <Ico w={20} h={20}>
    <path d="M10 2L1.5 17h17L10 2z" fill="#ef4444" opacity="0.15" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M10 8v4.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="10" cy="15" r="1.2" fill="#ef4444"/>
  </Ico>
);

const SaveIcon = ({ color = '#fff' }) => (
  <Ico w={18} h={18}>
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
const WelcomeDashboard = () => {
  const navigate = useNavigate();
  const dropRef  = useRef(null);

  const [user, setUser]               = useState(null);
  const [guestUser, setGuestUser]     = useState(null);
  const [currentDate, setCurrentDate] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [isScrolled, setIsScrolled]   = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showUserDrop, setShowUserDrop]   = useState(false);
  const [activeSubPanel, setActiveSubPanel] = useState(null);

  /* scroll effect */
  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* close dropdown outside click */
  useEffect(() => {
    const fn = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowUserDrop(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* auth + ban check */
  useEffect(() => {
    const cu = auth.currentUser;
    if (cu) {
      setUser(cu);
      (async () => {
        try {
          const snap = await getDoc(doc(db, 'users', cu.uid));
          if (snap.exists()) {
            const d = snap.data();
            if (d.isBanned) { setShowBanModal(true); setInterval(() => setShowBanModal(true), 1000); }
            let dt = d.createdAt || cu.metadata.creationTime;
            if (dt?.toDate) dt = dt.toDate();
            else if (typeof dt === 'string') dt = new Date(dt);
            setCurrentDate(!isNaN(new Date(dt)) ? new Date(dt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '');
          }
        } catch { setCurrentDate(''); }
      })();
    } else {
      const gd = localStorage.getItem('guestUser');
      if (localStorage.getItem('isGuest') === 'true' && gd) setGuestUser(JSON.parse(gd));
    }
  }, []);

  const handleLogout = async () => {
    try {
      if (user) await signOut(auth);
      else { localStorage.removeItem('guestUser'); localStorage.removeItem('isGuest'); }
      toast.success('Logged out successfully!');
      navigate('/');
    } catch { toast.error('Failed to logout'); }
  };

  const openPanel = () => { setActiveSubPanel(null); setShowSettingsPanel(true); };

  const displayName = user?.displayName || guestUser?.displayName || 'User';
  const userEmail   = user?.email || '';
  const isVerified  = user?.emailVerified;
  const initials    = displayName.slice(0, 2).toUpperCase();
  const maskedEmail = userEmail
    ? userEmail.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '·'.repeat(Math.min(b.length, 5)) + c)
    : '';

  /* ── settings rows ── */
  const settingsRows = [
    { section: 'Profile', items: [
      { label: 'Edit Profile',    sub: 'Update avatar & info',       IconEl: <EditIcon   />, color: '#6366f1', bg: 'rgba(99,102,241,0.13)',  sub_id: 'edit-profile'   },
      { label: 'Change Username', sub: 'Edit your display name',     IconEl: <AtIcon     />, color: '#a855f7', bg: 'rgba(168,85,247,0.13)', sub_id: 'change-username' },
      { label: 'Change Password', sub: 'Update your password',       IconEl: <LockIcon   />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.13)', sub_id: 'change-password' },
    ]},
    { section: 'Session', items: [
      { label: 'Sign Out',       sub: 'End current session',          IconEl: <SignOutIcon />, color: '#f97316', bg: 'rgba(249,115,22,0.1)',  action: handleLogout,     danger: false },
      { label: 'Delete Account', sub: 'Permanently remove account',   IconEl: <TrashIcon  />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   sub_id: 'delete-account', danger: true  },
    ]},
  ];

  const handleRowClick = (item) => {
    if (item.sub_id) {
      if (!user && item.sub_id !== 'delete-account') { toast.info('Not available for guest users'); return; }
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
                <span className="wd-chip-av"><span className="wd-chip-init">{initials}</span></span>
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
                    <span className="wd-drop-ic"><GearIcon size={18} color="#8b5cf6" /></span> Account Settings
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
              <GearIcon size={20} color="#6366f1" />
            </button>
          </div>
        </div>
      </header>

      {/* ══ HERO MAIN ══ */}
      <main className="wd-main">
        <div className="wd-version-pill"><ShieldOkIcon /> <span>Stable Release · TingleTap</span></div>

        <div className="wd-hero-text">
          <h1 className="wd-hero-h1">Welcome back,<span className="wd-hero-name"> {displayName.split(' ')[0]}.</span></h1>
          <h2 className="wd-hero-h2">Connect with India,<br /><span className="wd-grad">one chat at a time.</span></h2>
          <p className="wd-hero-sub">
            A premium, real-time community built for meaningful connections.
            {currentDate && ` With us since ${currentDate}.`}
          </p>
        </div>

        <div className="wd-cta-stack">
          {/* Launch Chat — purple gradient button */}
          <button className="wd-launch-btn" onClick={() => navigate('/rooms')}>
            <ChatIcon color="#fff" />
            <span>Launch Chat</span>
            <ArrowIcon color="#fff" />
            <span className="wd-shimmer" />
          </button>

          {/* Account Settings — ghost button */}
          <button className="wd-settings-btn" onClick={openPanel}>
            <GearIcon size={18} color="#5b21b6" />
            <span>Account Settings</span>
          </button>
        </div>

        <div className="wd-comm-pill"><SparkleIcon /> <span>Premium Community · 555+ Active Users</span></div>

        <PremiumCopyright />
      </main>

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
                <div className="wd-panel-av"><span className="wd-panel-av-i">{initials}</span></div>
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
                          <span className="wd-row-ic" style={{ background: bg, color }}>{IconEl}</span>
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
      <button className="wd-sub-back" onClick={onBack}><ChevronLeft color="#6366f1" /></button>
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
    if (f.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(f);
    setPhoto(f);
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) { toast.error('Display name required'); return; }
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
      await setDoc(doc(db, 'users', user.uid), { ...form, photoURL, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success('Profile updated!');
      onDone();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const initials = form.displayName.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="wd-form-panel">
      <div className="wd-form-title"><EditIcon color="#6366f1" /> Edit Profile</div>

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
        {saving ? <span className="wd-spin" /> : <SaveIcon color="#fff" />}
        <span>{saving ? 'Saving…' : 'Save Changes'}</span>
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   CHANGE USERNAME PANEL
═══════════════════════════════════════════════════════ */
const ChangeUsernamePanel = ({ user, onDone }) => {
  const [username, setUsername] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const val = username.trim();
    if (!val) { toast.error('Username cannot be empty'); return; }
    if (val.length < 2) { toast.error('Minimum 2 characters'); return; }
    if (val.length > 30) { toast.error('Maximum 30 characters'); return; }
    setSaving(true);
    try {
      await updateProfile(user, { displayName: val });
      await setDoc(doc(db, 'users', user.uid), { displayName: val, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success('Username updated!');
      onDone();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="wd-form-panel">
      <div className="wd-form-title"><AtIcon color="#a855f7" /> Change Username</div>
      <p className="wd-form-desc">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#a855f7" style={{flexShrink:0,marginTop:'1px'}}>
          <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
        </svg>
        Choose a unique display name that others will see in chat.
      </p>
      <div className="wd-fields">
        <div className="wd-field-group">
          <label className="wd-label">
            <svg width="15" height="15" viewBox="0 0 24 24"><defs><linearGradient id="unG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c084fc"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs><path d="M12,15C12.81,15 13.5,14.7 14.11,14.11C14.7,13.5 15,12.81 15,12C15,11.19 14.7,10.5 14.11,9.89C13.5,9.3 12.81,9 12,9C11.19,9 10.5,9.3 9.89,9.89C9.3,10.5 9,11.19 9,12C9,12.81 9.3,13.5 9.89,14.11C10.5,14.7 11.19,15 12,15M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,14.21 19.12,16.21 17.65,17.65C16.21,19.12 14.21,20 12,20Z" fill="url(#unG)"/></svg>
            New Username
            <svg width="12" height="12" viewBox="0 0 24 24"><defs><linearGradient id="unStG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fde68a"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs><path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" fill="url(#unStG)"/></svg>
          </label>
          <input className="wd-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your new username" maxLength={30} />
          <span className="wd-char-count">{username.length}/30</span>
        </div>
      </div>
      <button className="wd-save-btn" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }} onClick={handleSave} disabled={saving}>
        {saving ? <span className="wd-spin" /> : <SaveIcon color="#fff" />}
        <span>{saving ? 'Saving…' : 'Update Username'}</span>
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
    if (!form.current) { toast.error('Enter current password'); return; }
    if (form.newPw.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (form.newPw !== form.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, form.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, form.newPw);
      toast.success('Password updated successfully!');
      onDone();
    } catch (e) {
      if (e.code === 'auth/wrong-password') toast.error('Current password is incorrect');
      else toast.error(e.message);
    }
    finally { setSaving(false); }
  };

  const pw = (field, label) => (
    <div className="wd-field-group">
      <label className="wd-label">{label}</label>
      <div className="wd-pw-wrap">
        <input className="wd-input" type={show[field] ? 'text' : 'password'} value={form[field]}
          onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} placeholder="••••••••" />
        <button className="wd-eye" onClick={() => setShow(p => ({ ...p, [field]: !p[field] }))}>
          {show[field] ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="wd-form-panel">
      <div className="wd-form-title"><KeyIcon color="#8b5cf6" /> Change Password</div>
      <p className="wd-form-desc">Re-authenticate with your current password to set a new one.</p>
      <div className="wd-fields">
        {pw('current', 'Current Password')}
        {pw('newPw', 'New Password')}
        {pw('confirm', 'Confirm New Password')}
        {form.newPw && form.confirm && form.newPw !== form.confirm && (
          <p className="wd-err-msg">Passwords don't match</p>
        )}
      </div>
      <button className="wd-save-btn" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }} onClick={handleSave} disabled={saving}>
        {saving ? <span className="wd-spin" /> : <LockIcon color="#fff" />}
        <span>{saving ? 'Updating…' : 'Update Password'}</span>
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   DELETE ACCOUNT PANEL
═══════════════════════════════════════════════════════ */
const DeleteAccountPanel = ({ user, onDone }) => {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const handleDelete = async () => {
    if (!confirmed) { toast.error('Please confirm you understand'); return; }
    if (!password) { toast.error('Enter your password to confirm'); return; }
    setDeleting(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, cred);
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      toast.success('Account deleted');
      onDone();
    } catch (e) {
      if (e.code === 'auth/wrong-password') toast.error('Incorrect password');
      else toast.error(e.message);
    }
    finally { setDeleting(false); }
  };

  return (
    <div className="wd-form-panel">
      <div className="wd-form-title" style={{ color: '#ef4444' }}><TrashIcon color="#ef4444" /> Delete Account</div>

      <div className="wd-danger-box">
        <WarnIcon />
        <div>
          <p className="wd-danger-title">This action is permanent</p>
          <p className="wd-danger-sub">All your data, messages, friends, and profile will be erased forever. This cannot be undone.</p>
        </div>
      </div>

      <div className="wd-fields">
        <div className="wd-field-group">
          <label className="wd-label">Confirm Password</label>
          <div className="wd-pw-wrap">
            <input className="wd-input wd-input--danger" type={showPw ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
            <button className="wd-eye" onClick={() => setShowPw(p => !p)}>
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <label className="wd-confirm-chk">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          <span>I understand this action is <strong>permanent and irreversible</strong></span>
        </label>
      </div>

      <button
        className="wd-save-btn wd-save-btn--danger"
        onClick={handleDelete}
        disabled={deleting || !confirmed}
      >
        {deleting ? <span className="wd-spin" /> : <TrashIcon color="#fff" />}
        <span>{deleting ? 'Deleting…' : 'Delete My Account'}</span>
      </button>
    </div>
  );
};

export default WelcomeDashboard;
