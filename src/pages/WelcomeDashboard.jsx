import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BanKickModal from '../components/BanKickModal';
import EditProfileModal from '../components/EditProfileModal';
import '../components/BanKickModal.css';
import './WelcomeDashboard.css';

/* ═══════════════════════════════════════
   SVG ICONS — ALL PREMIUM, NO EMOJIS
═══════════════════════════════════════ */
const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 5l5 5-5 5"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 7l5 5 5-5"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M4 4l12 12M16 4L4 16"/>
  </svg>
);

const ChatLaunchIcon = () => (
  <svg viewBox="0 0 22 22" width="20" height="20" fill="none">
    <rect x="1" y="2" width="18" height="14" rx="4" fill="currentColor" opacity="0.92"/>
    <path d="M1 13l4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="7"  cy="9" r="1.5" fill="white"/>
    <circle cx="11" cy="9" r="1.5" fill="white"/>
    <circle cx="15" cy="9" r="1.5" fill="white"/>
    <path d="M17 6l3-3M19 3h-3M19 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="11" cy="7" r="4"/>
    <path d="M2 20c0-4.4 4-8 9-8s9 3.6 9 8"/>
  </svg>
);

const EditPenIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none">
    <path d="M15.5 3.5a2.12 2.12 0 0 1 3 3L7 18H4v-3L15.5 3.5z" fill="currentColor" opacity="0.85"/>
    <path d="M15.5 3.5l3 3" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none">
    <rect x="3" y="10" width="16" height="10" rx="3" fill="currentColor" opacity="0.85"/>
    <path d="M7 10V8a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="11" cy="15" r="1.8" fill="white"/>
    <path d="M11 17v1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const AtIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none">
    <circle cx="11" cy="11" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M15 11v2a4 4 0 0 0 4-4 8 8 0 1 0-2.5 5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const SignOutIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 7l4 4-4 4M19 11H9"/>
    <path d="M12 3H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h7"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 19 6"/>
    <path d="M8 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M19 6l-1.5 13a2 2 0 0 1-2 1.5h-7A2 2 0 0 1 6.5 19L5 6"/>
    <path d="M9 10v5M13 10v5"/>
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 22 22" width="14" height="14" fill="none">
    <path d="M11 2L3 6v5c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6L11 2z" fill="#10b981"/>
    <path d="M7.5 11l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DiamondIcon = () => (
  <svg viewBox="0 0 20 20" width="15" height="15" fill="none">
    <defs>
      <linearGradient id="wd-dm" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd"/>
        <stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
    <path d="M10 1.5L2 7.5 10 18.5 18 7.5 10 1.5z" fill="url(#wd-dm)"/>
    <path d="M2 7.5h16" stroke="white" strokeWidth="0.6" opacity="0.45"/>
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
    <defs>
      <linearGradient id="wd-ht" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899"/>
        <stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
    <path d="M8 14S2 9.5 2 5.5a4 4 0 0 1 6-3.46A4 4 0 0 1 14 5.5C14 9.5 8 14 8 14z" fill="url(#wd-ht)"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10h12M11 5l5 5-5 5"/>
  </svg>
);

const SparkleIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
    <path d="M8 1l1.2 3.8L13 6l-3.8 1.2L8 11l-1.2-3.8L3 6l3.8-1.2L8 1z"/>
    <path d="M13 10l.6 1.8L15.4 12l-1.8.6L13 14.4l-.6-1.8L10.6 12l1.8-.6L13 10z" opacity="0.5"/>
  </svg>
);

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
const WelcomeDashboard = () => {
  const navigate   = useNavigate();
  const panelRef   = useRef(null);
  const dropRef    = useRef(null);

  const [user, setUser]             = useState(null);
  const [guestUser, setGuestUser]   = useState(null);
  const [currentDate, setCurrentDate] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBanModal, setShowBanModal]   = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  /* panel / dropdown states */
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showUserDrop, setShowUserDrop]     = useState(false);

  /* scroll for floating header */
  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* close dropdown on outside click */
  useEffect(() => {
    const fn = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowUserDrop(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  /* auth + ban */
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      (async () => {
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.isBanned === true) {
              setShowBanModal(true);
              const iv = setInterval(() => setShowBanModal(true), 1000);
              window.banModalInterval = iv;
            }
            let d = data.createdAt || currentUser.metadata.creationTime;
            if (d?.toDate) d = d.toDate();
            else if (typeof d === 'string') d = new Date(d);
            setCurrentDate(!isNaN(d) ? d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }));
          } else {
            setCurrentDate(new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }));
          }
        } catch {
          setCurrentDate(new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }));
        }
      })();
    } else {
      const gd = localStorage.getItem('guestUser');
      if (localStorage.getItem('isGuest') === 'true' && gd) {
        setGuestUser(JSON.parse(gd));
        setCurrentDate(new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }));
      }
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

  const displayName = user?.displayName || guestUser?.displayName || 'User';
  const userEmail   = user?.email || '';
  const isGuest     = !user;
  const isVerified  = user?.emailVerified;
  const initials    = displayName.slice(0, 2).toUpperCase();
  const maskedEmail = userEmail
    ? userEmail.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '·'.repeat(Math.min(b.length, 6)) + c)
    : '';

  /* Settings panel rows */
  const settingsRows = [
    { section: 'Profile',
      items: [
        { label: 'Edit Profile',    sub: 'Update avatar and name',       Icon: EditPenIcon, color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  action: () => { if (user) { setShowSettingsPanel(false); setShowEditModal(true); } else toast.info('Not available for guests'); } },
        { label: 'Change Password', sub: 'Update account password',      Icon: LockIcon,    color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', action: () => toast.info('Password change coming soon') },
        { label: 'Change Username', sub: 'Edit your display name',       Icon: AtIcon,      color: '#a855f7', bg: 'rgba(168,85,247,0.12)', action: () => { if (user) { setShowSettingsPanel(false); setShowEditModal(true); } else toast.info('Not available for guests'); } },
      ],
    },
    { section: 'Session',
      items: [
        { label: 'Sign Out',       sub: 'End your current session',      Icon: SignOutIcon, color: '#f97316', bg: 'rgba(249,115,22,0.1)',  action: handleLogout },
        { label: 'Delete Account', sub: 'Permanently remove your account', Icon: TrashIcon, color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   action: () => { setShowSettingsPanel(false); toast.error('Contact support to delete account'); }, danger: true },
      ],
    },
  ];

  return (
    <div className="wd-root">

      {/* ── Ambient orbs ── */}
      <div className="wd-bg" aria-hidden="true">
        <div className="wd-orb wd-orb-1" />
        <div className="wd-orb wd-orb-2" />
        <div className="wd-orb wd-orb-3" />
      </div>

      {/* ══════════════════════════════════
          FLOATING HEADER
      ══════════════════════════════════ */}
      <header className={`wd-header ${isScrolled ? 'wd-header--shadow' : ''}`}>
        <div className="wd-header-inner">

          {/* Left — brand */}
          <div className="wd-brand">
            <img src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" alt="TingleTap" className="wd-brand-logo" />
            <div className="wd-brand-text">
              <span className="wd-brand-name">TingleTap</span>
              <span className="wd-brand-ver">v1.0 · Premium</span>
            </div>
          </div>

          {/* Right — user chip dropdown + gear */}
          <div className="wd-header-right">

            {/* User chip with dropdown */}
            <div className="wd-user-chip-wrap" ref={dropRef}>
              <button
                className="wd-user-chip"
                onClick={() => { setShowUserDrop(p => !p); }}
                aria-label="User menu"
              >
                <div className="wd-chip-av">
                  <span className="wd-chip-init">{initials}</span>
                </div>
                <span className="wd-chip-name">{displayName.split(' ')[0]}</span>
                <span className={`wd-chip-arrow ${showUserDrop ? 'rotated' : ''}`}>
                  <ChevronDownIcon />
                </span>
              </button>

              {/* Dropdown menu */}
              {showUserDrop && (
                <div className="wd-drop">
                  <div className="wd-drop-head">
                    <span className="wd-drop-signed">SIGNED IN AS</span>
                    <span className="wd-drop-username">{displayName}</span>
                    {maskedEmail && <span className="wd-drop-email">{maskedEmail}</span>}
                  </div>
                  <div className="wd-drop-divider" />
                  <button className="wd-drop-item" onClick={() => { setShowUserDrop(false); navigate('/rooms'); }}>
                    <span className="wd-drop-ic" style={{ color: '#6366f1' }}><ChatLaunchIcon /></span>
                    Open Chat
                  </button>
                  <button className="wd-drop-item" onClick={() => { setShowUserDrop(false); setShowSettingsPanel(true); }}>
                    <span className="wd-drop-ic" style={{ color: '#8b5cf6' }}><GearIcon /></span>
                    Account Settings
                  </button>
                  <div className="wd-drop-divider" />
                  <button className="wd-drop-item wd-drop-danger" onClick={() => { setShowUserDrop(false); handleLogout(); }}>
                    <span className="wd-drop-ic" style={{ color: '#ef4444' }}><SignOutIcon /></span>
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Gear button */}
            <button
              className="wd-gear-btn"
              onClick={() => setShowSettingsPanel(true)}
              title="Account Settings"
            >
              <GearIcon />
            </button>

          </div>
        </div>
      </header>

      {/* ══════════════════════════════════
          HERO MAIN PAGE
      ══════════════════════════════════ */}
      <main className="wd-main">

        {/* Version pill */}
        <div className="wd-version-pill">
          <ShieldIcon />
          <span>Stable Release · TingleTap</span>
        </div>

        {/* Hero Headline */}
        <div className="wd-hero-text">
          <h1 className="wd-hero-h1">
            Welcome back,
            <span className="wd-hero-name">{displayName.split(' ')[0]}.</span>
          </h1>
          <h2 className="wd-hero-h2">
            Connect with India,<br />
            <span className="wd-grad">one chat at a time.</span>
          </h2>
          <p className="wd-hero-sub">
            A premium, real-time community built for meaningful connections.
            {currentDate && ` You've been with us since ${currentDate}.`}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="wd-cta-stack">
          <button className="wd-launch-btn" onClick={() => navigate('/rooms')}>
            <ChatLaunchIcon />
            <span>Launch Chat</span>
            <ArrowRightIcon />
            <span className="wd-shimmer" />
          </button>

          <button className="wd-settings-btn" onClick={() => setShowSettingsPanel(true)}>
            <GearIcon />
            <span>Account Settings</span>
          </button>
        </div>

        {/* Community tagline */}
        <div className="wd-community-pill">
          <SparkleIcon />
          <span>Premium Community · 555+ Active Users</span>
        </div>

        {/* Copyright */}
        <div className="wd-copyright">
          <DiamondIcon />
          <div className="wd-copy-text">
            <span className="wd-copy-year">© 2026</span>
            <span className="wd-copy-brand">TingleTap™</span>
          </div>
          <div className="wd-copy-crafted">
            Crafted with <HeartIcon /> by <strong>Adrashtra Inc.</strong>
          </div>
        </div>

      </main>

      {/* ══════════════════════════════════
          SETTINGS PANEL (slide from bottom)
      ══════════════════════════════════ */}
      {/* Overlay */}
      <div
        className={`wd-overlay ${showSettingsPanel ? 'wd-overlay--visible' : ''}`}
        onClick={() => setShowSettingsPanel(false)}
      />

      {/* Panel */}
      <div className={`wd-panel ${showSettingsPanel ? 'wd-panel--open' : ''}`} ref={panelRef}>

        {/* Panel drag handle */}
        <div className="wd-panel-handle" />

        {/* Panel header */}
        <div className="wd-panel-head">
          <div className="wd-panel-user">
            <div className="wd-panel-av">
              <span className="wd-panel-av-init">{initials}</span>
            </div>
            <div className="wd-panel-user-info">
              <span className="wd-panel-username">{displayName}</span>
              {maskedEmail && <span className="wd-panel-email">{maskedEmail}</span>}
              {isVerified && (
                <span className="wd-panel-verified">
                  <ShieldIcon /> Verified
                </span>
              )}
            </div>
          </div>
          <button className="wd-panel-close" onClick={() => setShowSettingsPanel(false)}>
            <CloseIcon />
          </button>
        </div>

        <div className="wd-panel-divider" />

        {/* Settings rows */}
        <div className="wd-panel-body">
          {settingsRows.map(({ section, items }) => (
            <div key={section} className="wd-panel-section">
              <p className="wd-panel-section-label">{section.toUpperCase()}</p>
              <div className="wd-panel-card">
                {items.map(({ label, sub, Icon, color, bg, action, danger }, i) => (
                  <React.Fragment key={label}>
                    <button
                      className={`wd-panel-row ${danger ? 'wd-panel-row--danger' : ''}`}
                      onClick={action}
                    >
                      <span className="wd-panel-row-icon" style={{ background: bg, color }}>
                        <Icon />
                      </span>
                      <span className="wd-panel-row-text">
                        <span className="wd-panel-row-label" style={danger ? { color: '#ef4444' } : {}}>{label}</span>
                        <span className="wd-panel-row-sub">{sub}</span>
                      </span>
                      <span className="wd-panel-row-arrow" style={danger ? { color: '#ef4444', opacity: 0.7 } : {}}>
                        <ChevronRightIcon />
                      </span>
                    </button>
                    {i < items.length - 1 && <div className="wd-panel-row-sep" />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Panel bottom safe area */}
        <div className="wd-panel-safe" />
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); toast.success('Profile updated!'); }}
        />
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <BanKickModal
          isVisible={true}
          onClose={() => { setShowBanModal(true); setTimeout(() => setShowBanModal(true), 1); return false; }}
        />
      )}
    </div>
  );
};

export default WelcomeDashboard;
