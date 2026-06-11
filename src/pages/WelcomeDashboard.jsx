import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BanKickModal from '../components/BanKickModal';
import EditProfileModal from '../components/EditProfileModal';
import '../components/BanKickModal.css';
import './WelcomeDashboard.css';

/* ── SVG Icons ───────────────────────────── */
const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
    <path d="M7 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none">
    <path d="M20 2H2v14l4-3h14V2z" fill="currentColor" opacity="0.9"/>
    <circle cx="7" cy="9" r="1.2" fill="white"/>
    <circle cx="11" cy="9" r="1.2" fill="white"/>
    <circle cx="15" cy="9" r="1.2" fill="white"/>
  </svg>
);

const UserEditIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none">
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M1 20c0-4 3.6-7 8-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M17 14l3 3-5 5h-3v-3l5-5z" fill="currentColor" opacity="0.85"/>
  </svg>
);

const LockKeyIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none">
    <rect x="3" y="9" width="16" height="11" rx="3" fill="currentColor" opacity="0.85"/>
    <path d="M7 9V7a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="11" cy="14.5" r="1.8" fill="white"/>
    <path d="M11 16.5v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const AtSignIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none">
    <circle cx="11" cy="11" r="4" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M15 11v2a4 4 0 0 0 4-4 8 8 0 1 0-2.5 5.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const SignOutIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none">
    <path d="M16 7l4 4-4 4M20 11H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 3H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 22 22" width="18" height="18" fill="none">
    <path d="M3 6h16M8 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M19 6l-1.5 13a2 2 0 0 1-2 1.5H7.5A2 2 0 0 1 5.5 19L4 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 10v6M13 10v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const VerifiedIcon = () => (
  <svg viewBox="0 0 18 18" width="15" height="15" fill="none">
    <path d="M9 1L11.2 3.4L14.5 3L15.5 6.1L18 8L15.5 9.9L14.5 13L11.2 12.6L9 15L6.8 12.6L3.5 13L2.5 9.9L0 8L2.5 6.1L3.5 3L6.8 3.4L9 1z" fill="#10b981"/>
    <path d="M6 8.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DiamondSVG = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
    <defs>
      <linearGradient id="wd-diamond" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd"/>
        <stop offset="50%" stopColor="#a78bfa"/>
        <stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
    <path d="M10 1.5L2 7.5 10 18.5 18 7.5 10 1.5z" fill="url(#wd-diamond)"/>
    <path d="M2 7.5h16" stroke="white" strokeWidth="0.7" opacity="0.5"/>
  </svg>
);

const HeartSVG = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
    <defs>
      <linearGradient id="wd-heart" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899"/>
        <stop offset="100%" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
    <path d="M8 14S2 9.5 2 5.5a4 4 0 0 1 6-3.46A4 4 0 0 1 14 5.5C14 9.5 8 14 8 14z" fill="url(#wd-heart)"/>
  </svg>
);

/* ── Component ─────────────────────────── */
const WelcomeDashboard = () => {
  const [user, setUser]                     = useState(null);
  const [guestUser, setGuestUser]           = useState(null);
  const [currentDate, setCurrentDate]       = useState('');
  const [showEditModal, setShowEditModal]   = useState(false);
  const [showBanModal, setShowBanModal]     = useState(false);
  const [isScrolled, setIsScrolled]         = useState(false);
  const navigate = useNavigate();

  /* scroll detection for floating header */
  useEffect(() => {
    const fn = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* auth + ban check */
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      const fetchUser = async () => {
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
            if (d && typeof d.toDate === 'function') d = d.toDate();
            else if (typeof d === 'string') d = new Date(d);
            setCurrentDate(!isNaN(d) ? d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }));
          } else {
            setCurrentDate(new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }));
          }
        } catch { setCurrentDate(new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })); }
      };
      fetchUser();
    } else {
      const guestData = localStorage.getItem('guestUser');
      if (localStorage.getItem('isGuest') === 'true' && guestData) {
        setGuestUser(JSON.parse(guestData));
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

  /* mask email: ab***@gmail.com */
  const maskedEmail = userEmail
    ? userEmail.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 8)) + c)
    : '';

  /* avatar initials fallback */
  const initials = displayName.slice(0, 2).toUpperCase();

  const settingRows = [
    {
      section: 'Profile',
      rows: [
        { label: 'Edit Profile',      sub: 'Update your avatar and display name', Icon: UserEditIcon, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', action: () => { if (user) setShowEditModal(true); else toast.info('Guest users can update in chat'); } },
        { label: 'Change Password',   sub: 'Update your account password',        Icon: LockKeyIcon,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', action: () => toast.info('Password change coming soon') },
        { label: 'Change Username',   sub: 'Edit your display name',              Icon: AtSignIcon,   color: '#a855f7', bg: 'rgba(168,85,247,0.12)', action: () => { if (user) setShowEditModal(true); else toast.info('Not available for guests'); } },
      ],
    },
    {
      section: 'Session',
      rows: [
        { label: 'Sign Out',        sub: 'End your current session',  Icon: SignOutIcon, color: '#f97316', bg: 'rgba(249,115,22,0.1)',  action: handleLogout, danger: false },
        { label: 'Delete Account',  sub: 'Permanently remove account', Icon: TrashIcon,   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  action: () => toast.error('Contact support to delete account'), danger: true },
      ],
    },
  ];

  return (
    <div className="wd-root">
      {/* Ambient BG */}
      <div className="wd-bg" aria-hidden="true">
        <div className="wd-orb wd-orb-1" />
        <div className="wd-orb wd-orb-2" />
        <div className="wd-orb wd-orb-3" />
      </div>

      {/* ══ FLOATING HEADER ══ */}
      <header className={`wd-header ${isScrolled ? 'wd-header--shadow' : ''}`}>
        <div className="wd-header-inner">
          {/* Brand */}
          <div className="wd-brand">
            <img src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" alt="TingleTap" className="wd-brand-logo" />
            <span className="wd-brand-name">TingleTap</span>
          </div>

          {/* Right controls */}
          <div className="wd-header-right">
            <div className="wd-user-chip" onClick={() => navigate('/rooms')}>
              <div className="wd-chip-av">
                <span className="wd-chip-initials">{initials}</span>
              </div>
              <span className="wd-chip-name">{displayName.split(' ')[0]}</span>
            </div>
            <button className="wd-gear-btn" onClick={() => toast.info('Settings panel coming soon')} title="Settings">
              <GearIcon />
            </button>
          </div>
        </div>
      </header>

      {/* ══ MAIN SCROLL AREA ══ */}
      <main className="wd-main">

        {/* ── Profile Hero Card ── */}
        <div className="wd-profile-card">
          {/* Glowing avatar */}
          <div className="wd-av-ring">
            <div className="wd-av-inner">
              <span className="wd-av-initials">{initials}</span>
            </div>
          </div>

          {/* Name + badges */}
          <h2 className="wd-display-name">{displayName}</h2>

          <div className="wd-badge-row">
            {!isGuest && (
              <span className="wd-badge wd-badge-registered">
                <svg viewBox="0 0 10 10" width="8" height="8" fill="#fff"><circle cx="5" cy="5" r="4"/></svg>
                Registered
              </span>
            )}
            {isGuest && (
              <span className="wd-badge wd-badge-guest">
                <svg viewBox="0 0 10 10" width="8" height="8" fill="#fff"><circle cx="5" cy="5" r="4"/></svg>
                Guest
              </span>
            )}
            {isVerified && (
              <span className="wd-badge wd-badge-verified">
                <VerifiedIcon /> Verified
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="wd-meta-list">
            <div className="wd-meta-row">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#8b5cf6" strokeWidth="1.2"/><path d="M8 5v3.5l2 2" stroke="#8b5cf6" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <span>Member since {currentDate || '—'}</span>
            </div>
            {maskedEmail && (
              <div className="wd-meta-row">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="#8b5cf6" strokeWidth="1.2"/><path d="M1 5l7 5 7-5" stroke="#8b5cf6" strokeWidth="1.2"/></svg>
                <span>{maskedEmail}</span>
                {isVerified && <span className="wd-inline-verified"><VerifiedIcon /></span>}
              </div>
            )}
          </div>

          {/* Open Chat CTA */}
          <button className="wd-open-chat-btn" onClick={() => navigate('/rooms')}>
            <ChatIcon />
            <span>Open Chat</span>
            <span className="wd-btn-shimmer" />
          </button>
        </div>

        {/* ── Settings Sections ── */}
        {settingRows.map(({ section, rows }) => (
          <div key={section} className="wd-section">
            <p className="wd-section-label">{section.toUpperCase()}</p>
            <div className="wd-section-card">
              {rows.map(({ label, sub, Icon, color, bg, action, danger }, i) => (
                <React.Fragment key={label}>
                  <button
                    className={`wd-row ${danger ? 'wd-row-danger' : ''}`}
                    onClick={action}
                  >
                    <span className="wd-row-icon" style={{ background: bg, color }}>
                      <Icon />
                    </span>
                    <span className="wd-row-text">
                      <span className="wd-row-label" style={danger ? { color: '#ef4444' } : {}}>{label}</span>
                      <span className="wd-row-sub">{sub}</span>
                    </span>
                    <span className="wd-row-arrow" style={danger ? { color: '#ef4444' } : { color: '#a5b4fc' }}>
                      <ChevronIcon />
                    </span>
                  </button>
                  {i < rows.length - 1 && <div className="wd-row-divider" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {/* ── Copyright Bottom ── */}
        <div className="wd-copyright">
          <DiamondSVG />
          <div className="wd-copy-text">
            <span className="wd-copy-year">© 2026</span>
            <span className="wd-copy-brand">TingleTap™</span>
          </div>
          <div className="wd-copy-crafted">
            Crafted with <HeartSVG /> by <strong>Adrashtra Inc.</strong>
          </div>
        </div>

      </main>

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
