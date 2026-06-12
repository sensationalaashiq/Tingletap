import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import PremiumCopyright from '../components/PremiumCopyright';

/* ═══════════════════════════════════════════════════════
   PREMIUM LUXURY SVG ICON LIBRARY
═══════════════════════════════════════════════════════ */

const CrystalSparkle = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1L13.8 7.2L20 9L13.8 10.8L12 17L10.2 10.8L4 9L10.2 7.2L12 1Z" fill="currentColor"/>
    <path d="M20 16L20.9 19.1L24 20L20.9 20.9L20 24L19.1 20.9L16 20L19.1 19.1L20 16Z" fill="currentColor" opacity="0.6"/>
    <path d="M4 1L4.7 3.3L7 4L4.7 4.7L4 7L3.3 4.7L1 4L3.3 3.3L4 1Z" fill="currentColor" opacity="0.45"/>
  </svg>
);

const LuxuryBolt = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2L4 13H11L10 22L20.5 11H13.5L14 2Z" fill="currentColor"/>
    <path d="M14 2L4 13H11L10 22L20.5 11H13.5L14 2Z" fill="white" opacity="0.2"/>
  </svg>
);

const GoldTrophy = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 3H17V11C17 14.3 14.8 17 12 17C9.2 17 7 14.3 7 11V3Z" fill="currentColor"/>
    <path d="M4 5H7V9C5.3 9 4 7.7 4 6V5Z" fill="currentColor" opacity="0.7"/>
    <path d="M17 5H20V6C20 7.7 18.7 9 17 9V5Z" fill="currentColor" opacity="0.7"/>
    <path d="M10 17V20M8 23H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M9 20H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ArrowRight = ({ size = 18 }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 10H17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M11 4L17 10L11 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckMark = ({ size = 14 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 8.5L6 12L13.5 4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CrossMark = ({ size = 12 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* Feature card icons — jewel / glass style */
const IconChatRooms = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="28" height="18" rx="6" fill="url(#ic1a)"/>
    <rect x="2" y="4" width="28" height="18" rx="6" fill="url(#ic1b)" opacity="0.3"/>
    <circle cx="10" cy="13" r="2.4" fill="white"/>
    <circle cx="16" cy="13" r="2.4" fill="white"/>
    <circle cx="22" cy="13" r="2.4" fill="white"/>
    <path d="M7 22L10 19H24" stroke="url(#ic1a)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="ic1a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient>
      <linearGradient id="ic1b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
  </svg>
);

const IconVoice = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="13" fill="url(#ic2a)"/>
    <circle cx="16" cy="16" r="13" fill="url(#ic2b)" opacity="0.25"/>
    <rect x="12" y="7" width="8" height="12" rx="4" fill="white"/>
    <path d="M9 17C9 20.9 12.1 24 16 24S23 20.9 23 17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 24V28M13 28H19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="ic2a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f43f5e"/><stop offset="100%" stopColor="#fb923c"/></linearGradient>
      <linearGradient id="ic2b" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
  </svg>
);

const IconPrivate = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="14" width="26" height="15" rx="5" fill="url(#ic3a)"/>
    <rect x="3" y="14" width="26" height="15" rx="5" fill="url(#ic3b)" opacity="0.25"/>
    <path d="M9 14V11C9 7.7 11.7 5 15 5H17C20.3 5 23 7.7 23 11V14" stroke="url(#ic3a)" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="16" cy="21" r="2.8" fill="white"/>
    <path d="M16 23.8V26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="ic3a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#6366f1"/></linearGradient>
      <linearGradient id="ic3b" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
  </svg>
);

const IconTools = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="16" r="8" fill="url(#ic4a)" opacity="0.9"/>
    <circle cx="22" cy="16" r="8" fill="url(#ic4b)" opacity="0.9"/>
    <circle cx="16" cy="16" r="5" fill="url(#ic4c)"/>
    <path d="M10 12V20M22 12V20M8 16H12M20 16H24" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <defs>
      <linearGradient id="ic4a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#6366f1"/></linearGradient>
      <linearGradient id="ic4b" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899"/><stop offset="100%" stopColor="#a855f7"/></linearGradient>
      <linearGradient id="ic4c" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#c084fc"/></linearGradient>
    </defs>
  </svg>
);

const IconPremium = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3L19.5 11H28L21.5 16L23.8 24L16 19.5L8.2 24L10.5 16L4 11H12.5L16 3Z" fill="url(#ic5a)"/>
    <path d="M16 3L19.5 11H28L21.5 16L23.8 24L16 19.5L8.2 24L10.5 16L4 11H12.5L16 3Z" fill="url(#ic5b)" opacity="0.35"/>
    <circle cx="16" cy="14.5" r="3.5" fill="white" opacity="0.9"/>
    <defs>
      <linearGradient id="ic5a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="50%" stopColor="#ef4444"/><stop offset="100%" stopColor="#dc2626"/></linearGradient>
      <linearGradient id="ic5b" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
  </svg>
);

const IconShield = ({ size = 30 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3L5 8V15C5 21.6 9.8 27.7 16 29C22.2 27.7 27 21.6 27 15V8L16 3Z" fill="url(#ic6a)"/>
    <path d="M16 3L5 8V15C5 21.6 9.8 27.7 16 29C22.2 27.7 27 21.6 27 15V8L16 3Z" fill="url(#ic6b)" opacity="0.25"/>
    <path d="M10.5 16.5L14 20L22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="ic6a" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#059669"/></linearGradient>
      <linearGradient id="ic6b" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="white"/><stop offset="100%" stopColor="transparent"/></linearGradient>
    </defs>
  </svg>
);

const IconCTAHeart = ({ size = 44 }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="icheart" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899"/><stop offset="50%" stopColor="#a855f7"/><stop offset="100%" stopColor="#6366f1"/></linearGradient>
    </defs>
    <path d="M24 42C24 42 5 30 5 17C5 11.5 9.5 7 15 7C18.3 7 21.2 8.6 23 11.1C24.8 8.6 27.7 7 31 7C36.5 7 41 11.5 41 17C41 30 24 42 24 42Z" fill="url(#icheart)"/>
    <path d="M24 42C24 42 5 30 5 17C5 11.5 9.5 7 15 7C18.3 7 21.2 8.6 23 11.1C24.8 8.6 27.7 7 31 7C36.5 7 41 11.5 41 17C41 30 24 42 24 42Z" fill="white" opacity="0.15"/>
    <path d="M17 21L21.5 26L31.5 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DiamondGem = ({ size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="igem" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c4b5fd"/><stop offset="50%" stopColor="#f0abfc"/><stop offset="100%" stopColor="#818cf8"/></linearGradient>
    </defs>
    <path d="M12 2L4 8L12 22L20 8L12 2Z" fill="url(#igem)"/>
    <path d="M4 8H20" stroke="white" strokeWidth="0.8" opacity="0.6"/>
    <path d="M8 2.5L4 8L12 22L8 2.5Z" fill="white" opacity="0.15"/>
    <path d="M16 2.5L20 8L12 22L16 2.5Z" fill="white" opacity="0.08"/>
  </svg>
);

const StarBadge = ({ size = 13 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1.5L9.4 5.7H13.8L10.3 8.1L11.6 12.3L8 9.9L4.4 12.3L5.7 8.1L2.2 5.7H6.6L8 1.5Z" fill="currentColor"/>
  </svg>
);


/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [realTimeStats, setRealTimeStats] = useState({ activeUsers: 555, totalRooms: 9, onlineNow: 138 });

  const incrementUserCount = () => {
    const n = (parseInt(localStorage.getItem('currentActiveUsers')) || 555) + 1;
    localStorage.setItem('currentActiveUsers', n.toString());
    setRealTimeStats(p => ({ ...p, activeUsers: n, onlineNow: Math.floor(n * 0.25) }));
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const check = () => {
      const n = parseInt(localStorage.getItem('currentActiveUsers')) || 555;
      setRealTimeStats(p => ({ ...p, activeUsers: n, totalRooms: 9, onlineNow: Math.floor(n * 0.25) }));
    };
    const iv = setInterval(check, 30000);
    check();
    return () => clearInterval(iv);
  }, []);

  const features = [
    { Icon: IconChatRooms, title: 'Real-Time Chat Rooms',  desc: '9+ themed rooms — Indian, International, Gaming, Music Lounge and exclusive Staff Rooms with live messaging.', tags: ['Live', 'Auto-Scroll', 'Styled Text'], bg: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))', color: '#6366f1' },
    { Icon: IconVoice,     title: 'Voice & Media Sharing', desc: 'Send voice messages, record audio in-chat and embed YouTube videos in real-time for the whole room.', tags: ['Voice', 'Audio Record', 'YouTube'], bg: 'linear-gradient(135deg,rgba(244,63,94,0.12),rgba(251,146,60,0.08))', color: '#f43f5e' },
    { Icon: IconPrivate,   title: 'Private Messaging',     desc: '1-on-1 private conversations with file sharing, voice messages and draggable floating chat windows.', tags: ['Private', 'Files', 'History'], bg: 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(99,102,241,0.08))', color: '#7c3aed' },
    { Icon: IconTools,     title: 'Advanced User Tools',   desc: 'Gender-based filtering, friend requests, user blocking, whisper messages and full user profiles.', tags: ['Filters', 'Friends', 'Block'], bg: 'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(99,102,241,0.08))', color: '#3b82f6' },
    { Icon: IconPremium,   title: 'Premium Customization', desc: 'Badge holders unlock gradient text effects, glowing animations, username FX and exclusive profile styling.', tags: ['Gradient', 'Animations', 'Badges'], bg: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(239,68,68,0.08))', color: '#f59e0b' },
    { Icon: IconShield,    title: 'Security & Moderation', desc: 'VPN detection, device fingerprinting, auto-moderation, kick/ban/mute systems and reporting tools.', tags: ['VPN Shield', 'Auto-Mod', 'Reports'], bg: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.08))', color: '#10b981' },
  ];

  const tiers = [
    {
      name: 'Free User', price: '₹0', sub: 'Always Free',
      color: '#3b82f6', border: 'rgba(59,130,246,0.25)', glow: 'rgba(59,130,246,0.08)',
      btnStyle: { background: 'transparent', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.35)' },
      items: [
        ['All public chat rooms access', true], ['Basic text messaging', true],
        ['Voice message sending', true], ['Private messaging (1-on-1)', true],
        ['Friend requests system', true], ['Gender filter browsing', true],
        ['YouTube video sharing', false], ['Image & media uploads', false],
        ['Advanced text styling', false], ['Premium badges', false],
      ],
    },
    {
      name: 'Badge Holder', price: 'Premium', sub: 'Most Popular',
      color: '#7c3aed', border: 'rgba(124,58,237,0.4)', glow: 'rgba(124,58,237,0.12)',
      featured: true,
      btnStyle: { background: 'linear-gradient(135deg,#5b5bd6,#7c3aed,#a855f7)', color: '#fff', borderColor: 'transparent' },
      items: [
        ['Everything in Free User', true], ['YouTube video sharing', true],
        ['Image & media uploads', true], ['Advanced text styling', true],
        ['Gradient & glow effects', true], ['Username customization', true],
        ['Text animations', true], ['Premium badges display', true],
        ['Priority support access', true], ['Exclusive features first', true],
      ],
    },
    {
      name: 'Staff Access', price: 'Invite Only', sub: 'Elite Tier',
      color: '#b45309', border: 'rgba(180,83,9,0.28)', glow: 'rgba(251,191,36,0.07)',
      btnStyle: { background: 'transparent', color: '#b45309', borderColor: 'rgba(180,83,9,0.32)' },
      items: [
        ['Everything in Badge Holder', true], ['Staff room access', true],
        ['Kick / Ban / Mute powers', true], ['Full moderation panel', true],
        ['Advanced reporting tools', true], ['Real-time user monitoring', true],
        ['Admin panel access', true], ['Special role badges', true],
        ['All features — forever', true], ['Priority in all features', true],
      ],
    },
  ];

  return (
    <div className="lp-root">
      {/* Ambient Background */}
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
      </div>

      {/* ══ HEADER ══ */}
      <header className={`lp-header${scrolled ? ' lp-header--scrolled' : ''}`}>
        <div className="lp-header-inner">
          <div className="lp-brand">
            <img src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" alt="TingleTap" className="lp-logo" />
            <div className="lp-brand-text">
              <span className="lp-brand-name">TingleTap</span>
              <span className="lp-brand-tag">Premium Chat Experience</span>
            </div>
          </div>
          <nav className="lp-nav">
            <button className="lp-btn-ghost" onClick={() => navigate('/login')}>
              Sign In
            </button>
            <button className="lp-btn-primary" onClick={() => { incrementUserCount(); navigate('/signup'); }}>
              <span>Get Started</span>
              <ArrowRight size={16} />
            </button>
          </nav>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-badge lp-anim-fade">
            <CrystalSparkle size={14} />
            <span>India's Premier Chat Platform</span>
          </div>

          <h1 className="lp-hero-h1 lp-anim-up">
            Connect with India's<br />
            <span className="lp-grad">Most Vibrant</span><br />
            Chat Community
          </h1>

          <p className="lp-hero-p lp-anim-up lp-d1">
            Real-time conversations with voice messages, private chats,
            gender filters and premium customization — beautifully crafted for real connections.
          </p>

          <div className="lp-stats lp-anim-up lp-d2">
            <div className="lp-stat">
              <span className="lp-stat-n">{realTimeStats.activeUsers.toLocaleString()}+</span>
              <span className="lp-stat-l">Active Users</span>
            </div>
            <div className="lp-stat-sep" />
            <div className="lp-stat">
              <span className="lp-stat-n">{realTimeStats.onlineNow}</span>
              <span className="lp-stat-l">Online Now</span>
            </div>
            <div className="lp-stat-sep" />
            <div className="lp-stat">
              <span className="lp-stat-n">{realTimeStats.totalRooms}+</span>
              <span className="lp-stat-l">Chat Rooms</span>
            </div>
          </div>

          <div className="lp-hero-btns lp-anim-up lp-d3">
            <button className="lp-cta-main" onClick={() => { incrementUserCount(); navigate('/rooms'); }}>
              <span>Start Chatting Now</span>
              <ArrowRight size={18} />
              <span className="lp-shimmer" aria-hidden="true" />
            </button>
            <button className="lp-cta-outline" onClick={() => { incrementUserCount(); navigate('/signup'); }}>
              <span>Create Free Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="lp-section lp-features-section">
        <div className="lp-container">
          <div className="lp-sec-head lp-anim-up">
            <div className="lp-badge">
              <LuxuryBolt size={14} />
              <span>Features</span>
            </div>
            <h2 className="lp-sec-h2">Everything You Need to <span className="lp-grad">Chat Like a Pro</span></h2>
            <p className="lp-sec-sub">India's most feature-rich platform — built for real, meaningful connections</p>
          </div>
          <div className="lp-features-grid">
            {features.map(({ Icon, title, desc, tags, bg, color }, i) => (
              <div key={i} className="lp-feat-card lp-anim-up" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="lp-feat-icon-wrap" style={{ background: bg }}>
                  <Icon size={30} />
                </div>
                <h3 className="lp-feat-title">{title}</h3>
                <p className="lp-feat-desc">{desc}</p>
                <div className="lp-feat-tags">
                  {tags.map((t, j) => (
                    <span key={j} className="lp-tag" style={{ color, background: `${color}14`, borderColor: `${color}38` }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PLANS ══ */}
      <section className="lp-section lp-tiers-section">
        <div className="lp-container">
          <div className="lp-sec-head lp-anim-up">
            <div className="lp-badge">
              <GoldTrophy size={14} />
              <span>Plans</span>
            </div>
            <h2 className="lp-sec-h2">Choose Your <span className="lp-grad">Experience Level</span></h2>
            <p className="lp-sec-sub">From free users to premium badge holders — find your perfect tier</p>
          </div>
          <div className="lp-tiers-grid">
            {tiers.map((t, i) => (
              <div
                key={i}
                className={`lp-tier${t.featured ? ' lp-tier-featured' : ''} lp-anim-up`}
                style={{ '--tb': t.border, '--tg': t.glow, animationDelay: `${i * 0.1}s` }}
              >
                {t.featured && (
                  <div className="lp-tier-badge">
                    <StarBadge size={13} />
                    <span>Most Popular</span>
                  </div>
                )}
                <div className="lp-tier-head">
                  <h3 className="lp-tier-name" style={{ color: t.color }}>{t.name}</h3>
                  <div className="lp-tier-price">{t.price}</div>
                  <div className="lp-tier-sub">{t.sub}</div>
                </div>
                <div className="lp-tier-line" style={{ background: `linear-gradient(90deg, ${t.color}, transparent)` }} />
                <ul className="lp-tier-list">
                  {t.items.map(([label, ok], j) => (
                    <li key={j} className={`lp-tier-item${ok ? '' : ' lp-no'}`}>
                      <span className="lp-tier-ic" style={{ color: ok ? t.color : '#94a3b8', background: ok ? `${t.color}14` : 'rgba(148,163,184,0.1)' }}>
                        {ok ? <CheckMark size={13} /> : <CrossMark size={11} />}
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className="lp-tier-btn"
                  style={t.btnStyle}
                  onClick={() => { incrementUserCount(); navigate(t.name === 'Free User' ? '/rooms' : t.name === 'Badge Holder' ? '/signup' : '/'); }}
                >
                  {t.name === 'Free User' ? 'Start For Free' : t.name === 'Badge Holder' ? 'Get Badge Access' : 'Learn More'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section className="lp-cta-section">
        <div className="lp-container">
          <div className="lp-cta-inner lp-anim-up">
            <div className="lp-cta-icon-wrap">
              <IconCTAHeart size={48} />
            </div>
            <h2 className="lp-cta-h2">
              Ready to Join India's Best<br />
              <span className="lp-grad">Chat Community?</span>
            </h2>
            <p className="lp-cta-p">
              Thousands of users are chatting right now — join free today.
            </p>
            <div className="lp-hero-btns" style={{ maxWidth: 460, margin: '0 auto' }}>
              <button className="lp-cta-main" onClick={() => { incrementUserCount(); navigate('/rooms'); }}>
                <span>Start Chatting Now</span>
                <ArrowRight size={18} />
                <span className="lp-shimmer" aria-hidden="true" />
              </button>
              <button className="lp-cta-outline" onClick={() => navigate('/login')}>
                <span>Sign In to Account</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="lp-footer">
        <div className="lp-footer-bg" aria-hidden="true">
          <div className="lp-footer-orb lp-footer-orb-1" />
          <div className="lp-footer-orb lp-footer-orb-2" />
          <div className="lp-footer-orb lp-footer-orb-3" />
        </div>

        <div className="lp-footer-inner">
          <div className="lp-footer-main">

            {/* Brand */}
            <div className="lp-footer-brand-col">
              <div className="lp-footer-brand">
                <img src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" alt="TingleTap" className="lp-footer-logo" />
                <div>
                  <h3 className="lp-footer-brand-name">TingleTap</h3>
                  <p className="lp-footer-brand-tag">India's Premium Chat Experience</p>
                </div>
              </div>
              <p className="lp-footer-desc">
                Connect with thousands of users across India in our beautifully designed platform.
                Real-time conversations with premium customization and powerful features.
              </p>
              <div className="lp-footer-stats">
                <div className="lp-footer-stat">
                  <span className="lp-fs-num">{realTimeStats.activeUsers.toLocaleString()}+</span>
                  <span className="lp-fs-lbl">Active Users</span>
                </div>
                <div className="lp-fs-sep" />
                <div className="lp-footer-stat">
                  <span className="lp-fs-num">{realTimeStats.totalRooms}+</span>
                  <span className="lp-fs-lbl">Chat Rooms</span>
                </div>
                <div className="lp-fs-sep" />
                <div className="lp-footer-stat">
                  <span className="lp-fs-num">24/7</span>
                  <span className="lp-fs-lbl">Support</span>
                </div>
              </div>
            </div>

            {/* Support & Legal only */}
            <div className="lp-footer-links">
              <div className="lp-footer-col">
                <h4 className="lp-footer-col-title">Support & Legal</h4>
                <ul>
                  <li><button onClick={() => navigate('/about')}>About TingleTap</button></li>
                  <li><button onClick={() => navigate('/contact')}>Contact Support</button></li>
                  <li><button onClick={() => navigate('/faq')}>FAQ & Help</button></li>
                  <li><button onClick={() => navigate('/privacy')}>Privacy Policy</button></li>
                  <li><button onClick={() => navigate('/terms')}>Terms of Service</button></li>
                  <li><button onClick={() => navigate('/disclaimer')}>Disclaimer</button></li>
                </ul>
              </div>
            </div>

          </div>

          <div className="lp-footer-divider" />

        </div>
      </footer>
      <PremiumCopyright />
    </div>
  );
};

export default LandingPage;
