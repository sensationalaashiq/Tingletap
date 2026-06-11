import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

/* ── Premium SVG Icon Library ─────────────────────── */
const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" fill="currentColor"/>
    <path d="M19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6L19 14z" fill="currentColor" opacity="0.6"/>
    <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" fill="currentColor" opacity="0.4"/>
  </svg>
);

const BoltIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <path d="M13 2L4.09 12.96A.5.5 0 0 0 4.5 14H11l-1 8 8.91-10.96A.5.5 0 0 0 18.5 10H12l1-8z" fill="currentColor"/>
  </svg>
);

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <path d="M6 2h12v6a6 6 0 0 1-6 6 6 6 0 0 1-6-6V2z" fill="currentColor"/>
    <path d="M4 4H2v2a4 4 0 0 0 4 4M20 4h2v2a4 4 0 0 1-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 14v4M8 22h8M9 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ChatBubbleIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <rect x="2" y="4" width="24" height="16" rx="5" fill="url(#g-chat)"/>
    <path d="M8 22l4-2h10" stroke="url(#g-chat)" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="9" cy="12" r="2" fill="white" opacity="0.9"/>
    <circle cx="14" cy="12" r="2" fill="white" opacity="0.9"/>
    <circle cx="19" cy="12" r="2" fill="white" opacity="0.9"/>
    <defs>
      <linearGradient id="g-chat" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="100%" stopColor="#a855f7"/>
      </linearGradient>
    </defs>
  </svg>
);

const MicIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <circle cx="14" cy="14" r="12" fill="url(#g-mic)"/>
    <rect x="11" y="6" width="6" height="10" rx="3" fill="white" opacity="0.95"/>
    <path d="M8 14a6 6 0 0 0 12 0M14 20v3M11 23h6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <defs>
      <linearGradient id="g-mic" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899"/>
        <stop offset="100%" stopColor="#f97316"/>
      </linearGradient>
    </defs>
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <rect x="2" y="4" width="24" height="18" rx="5" fill="url(#g-lock)"/>
    <rect x="10" y="2" width="8" height="8" rx="4" stroke="url(#g-lock)" strokeWidth="2" fill="none"/>
    <circle cx="14" cy="15" r="2.5" fill="white"/>
    <path d="M14 17.5v2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <defs>
      <linearGradient id="g-lock" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
    </defs>
  </svg>
);

const FilterIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <circle cx="10" cy="14" r="8" fill="url(#g-fil1)" opacity="0.85"/>
    <circle cx="18" cy="14" r="8" fill="url(#g-fil2)" opacity="0.85"/>
    <path d="M10 10v8M18 10v8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7 14h6M15 14h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <defs>
      <linearGradient id="g-fil1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
      <linearGradient id="g-fil2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899"/>
        <stop offset="100%" stopColor="#a855f7"/>
      </linearGradient>
    </defs>
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <path d="M14 3l2.8 5.6 6.2.9-4.5 4.4 1.1 6.1L14 17l-5.6 3 1.1-6.1L5 9.5l6.2-.9L14 3z" fill="url(#g-star)"/>
    <circle cx="14" cy="13" r="3" fill="white" opacity="0.9"/>
    <defs>
      <linearGradient id="g-star" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#ef4444"/>
      </linearGradient>
    </defs>
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
    <path d="M14 3L4 7v6c0 6 4.5 11 10 12 5.5-1 10-6 10-12V7L14 3z" fill="url(#g-shield)"/>
    <path d="M9 14l3 3 6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="g-shield" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981"/>
        <stop offset="100%" stopColor="#059669"/>
      </linearGradient>
    </defs>
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
    <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CrossIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const CrownIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
    <path d="M2 12h12M2 12L4 6l4 3 4-5 4 5-2 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
    <circle cx="2.5" cy="7" r="1" fill="currentColor"/>
    <circle cx="13.5" cy="7" r="1" fill="currentColor"/>
  </svg>
);

const MaleIcon = () => (
  <svg viewBox="0 0 12 12" width="11" height="11" fill="none">
    <circle cx="5" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 4l2-2M8.5 2H10v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const FemaleIcon = () => (
  <svg viewBox="0 0 12 12" width="11" height="11" fill="none">
    <circle cx="6" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M6 8.5V11M4.5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const DiamondIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
    <path d="M10 2L2 8l8 10 8-10L10 2z" fill="url(#g-diamond)" stroke="url(#g-diamond)" strokeWidth="0.5"/>
    <path d="M2 8h16M7 2l-5 6M13 2l5 6M10 2l2 6M10 2l-2 6" stroke="white" strokeWidth="0.8" opacity="0.5"/>
    <defs>
      <linearGradient id="g-diamond" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8"/>
        <stop offset="50%" stopColor="#a855f7"/>
        <stop offset="100%" stopColor="#ec4899"/>
      </linearGradient>
    </defs>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
    <path d="M2 18L18 10 2 2v5l11 3-11 3v5z" fill="white"/>
  </svg>
);

const AttachIcon = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
    <path d="M13.5 5v8a3.5 3.5 0 0 1-7 0V4a2 2 0 0 1 4 0v9a.5.5 0 0 1-1 0V5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 20 14" width="18" height="14" fill="none">
    <rect width="20" height="14" rx="3" fill="#dc2626"/>
    <path d="M8 4.5l5.5 2.5L8 9.5v-5z" fill="white"/>
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 20 18" width="18" height="16" fill="none">
    <rect x="1" y="1" width="18" height="16" rx="3" stroke="#7c3aed" strokeWidth="1.5"/>
    <circle cx="6.5" cy="6.5" r="1.5" fill="#7c3aed"/>
    <path d="M1 12l5-5 4 4 3-3 5 4" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Component ───────────────────────────────────── */
const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeMsg, setActiveMsg] = useState(0);
  const [realTimeStats, setRealTimeStats] = useState({ activeUsers: 555, totalRooms: 9, onlineNow: 138 });

  const incrementUserCount = () => {
    const n = (parseInt(localStorage.getItem('currentActiveUsers')) || 555) + 1;
    localStorage.setItem('currentActiveUsers', n.toString());
    setRealTimeStats(p => ({ ...p, activeUsers: n, onlineNow: Math.floor(n * 0.25) }));
  };

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'currentActiveUsers') {
        const n = parseInt(e.newValue) || 555;
        setRealTimeStats(p => ({ ...p, activeUsers: n, onlineNow: Math.floor(n * 0.25) }));
      }
    };
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
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

  useEffect(() => {
    const iv = setInterval(() => setActiveMsg(p => (p + 1) % 5), 2800);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const liveMessages = [
    { name: 'Riya Sharma',  color: '#7c3aed', gender: 'female', seed: 'riya&sex=female',  text: 'Hello everyone, great vibes here!' },
    { name: 'Arjun Singh',  color: '#2563eb', gender: 'male',   seed: 'arjun&sex=male',   text: 'Any music recommendations tonight?' },
    { name: 'Priya Gupta',  color: '#db2777', gender: 'female', seed: 'priya&sex=female',  text: 'This platform is absolutely stunning!' },
    { name: 'Rohan Mehta',  color: '#059669', gender: 'male',   seed: 'rohan&sex=male',   text: 'Gaming session at 9 PM, who\'s in?' },
    { name: 'Neha Patel',   color: '#d97706', gender: 'female', seed: 'neha&sex=female',  text: 'Good morning, beautiful people!' },
  ];

  const features = [
    { Icon: ChatBubbleIcon, title: 'Real-Time Chat Rooms', desc: '9+ themed rooms — Indian Chat, International, Gaming, Music Lounge and exclusive Staff Rooms with live messaging', tags: ['Live', 'Auto-Scroll', 'Styled Text'], color: '#6366f1' },
    { Icon: MicIcon,        title: 'Voice & Media Sharing', desc: 'Send voice messages, share images via IMGBB, record audio in-chat and share YouTube videos with real-time embedding', tags: ['Voice', 'Images', 'YouTube'], color: '#ec4899' },
    { Icon: LockIcon,       title: 'Private Messaging',    desc: '1-on-1 private conversations with file sharing, voice messages and draggable chat windows for seamless multitasking', tags: ['Private', 'Files', 'History'], color: '#8b5cf6' },
    { Icon: FilterIcon,     title: 'Advanced User Tools',  desc: 'Gender-based filtering, friend requests, user blocking, whisper messages and comprehensive user profiles', tags: ['Filters', 'Friends', 'Block'], color: '#3b82f6' },
    { Icon: StarIcon,       title: 'Premium Customization',desc: 'Badge holders unlock gradient text effects, text animations, username FX and exclusive profile styling options', tags: ['Gradient', 'Animations', 'Badges'], color: '#f59e0b' },
    { Icon: ShieldIcon,     title: 'Security & Moderation', desc: 'VPN detection, device fingerprinting, auto-moderation, kick/ban/mute systems and comprehensive reporting tools', tags: ['VPN Shield', 'Auto-Mod', 'Reports'], color: '#10b981' },
  ];

  const tiers = [
    {
      name: 'Free User',
      price: '₹0',
      sub: 'Always Free',
      color: '#3b82f6',
      border: 'rgba(59,130,246,0.25)',
      glow: 'rgba(59,130,246,0.08)',
      items: [
        ['Access to all public chat rooms', true],
        ['Basic text messaging', true],
        ['Voice message sending', true],
        ['Image & YouTube sharing', true],
        ['Private messaging', true],
        ['Friend requests system', true],
        ['Advanced text styling', false],
        ['Username customization', false],
        ['Premium badges', false],
      ],
    },
    {
      name: 'Badge Holder',
      price: 'Premium',
      sub: 'Most Popular',
      color: '#7c3aed',
      border: 'rgba(124,58,237,0.4)',
      glow: 'rgba(124,58,237,0.1)',
      featured: true,
      items: [
        ['Everything in Free User', true],
        ['Advanced username styling', true],
        ['Gradient text effects', true],
        ['Text animations & glow', true],
        ['Custom status styling', true],
        ['Premium badges display', true],
        ['Enhanced profile page', true],
        ['Priority support access', true],
        ['Exclusive features first', true],
      ],
    },
    {
      name: 'Staff Access',
      price: 'Invite Only',
      sub: 'Elite Tier',
      color: '#b45309',
      border: 'rgba(180,83,9,0.25)',
      glow: 'rgba(251,191,36,0.08)',
      items: [
        ['Everything in Badge Holder', true],
        ['Staff room access', true],
        ['Kick / Ban / Mute powers', true],
        ['Full moderation tools', true],
        ['Advanced reporting panel', true],
        ['Real-time user monitoring', true],
        ['Admin panel access', true],
        ['Special role badges', true],
        ['Priority in all features', true],
      ],
    },
  ];

  return (
    <div className="lp-root">
      {/* Background */}
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
      </div>

      {/* ═══ HEADER ═══ */}
      <header className={`lp-header ${scrolled ? 'lp-header--scrolled' : ''}`}>
        <div className="lp-header-inner">
          <div className="lp-brand">
            <img src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" alt="TingleTap" className="lp-logo" />
            <div className="lp-brand-text">
              <span className="lp-brand-name">TingleTap</span>
              <span className="lp-brand-tag">Premium Chat Experience</span>
            </div>
          </div>
          <nav className="lp-nav">
            <button className="lp-btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
            <button className="lp-btn-primary" onClick={() => { incrementUserCount(); navigate('/signup'); }}>
              Get Started <ArrowRightIcon />
            </button>
          </nav>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          {/* Left Text */}
          <div className="lp-hero-left">
            <div className="lp-badge lp-anim-fade">
              <SparkleIcon /> India's Premier Chat Platform
            </div>

            <h1 className="lp-hero-h1 lp-anim-up">
              Connect with India's
              <span className="lp-grad"> Most Vibrant</span>
              <br />Chat Community
            </h1>

            <p className="lp-hero-p lp-anim-up lp-d1">
              Real-time conversations with voice messages, YouTube sharing, private chats,
              gender filters and premium customization — all in one beautifully crafted platform.
            </p>

            {/* Stats */}
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
                <ArrowRightIcon />
                <span className="lp-shimmer" />
              </button>
              <button className="lp-cta-outline" onClick={() => { incrementUserCount(); navigate('/signup'); }}>
                Create Free Account
              </button>
            </div>
          </div>

          {/* Right — Live Chat Preview */}
          <div className="lp-hero-right lp-anim-fade lp-d2">
            <div className="lp-preview">
              {/* Window chrome */}
              <div className="lp-preview-bar">
                <div className="lp-dots">
                  <span className="lp-dot lp-dot-r" />
                  <span className="lp-dot lp-dot-y" />
                  <span className="lp-dot lp-dot-g" />
                </div>
                <div className="lp-preview-title">
                  <span className="lp-flag-icon">
                    <svg viewBox="0 0 20 14" width="18" height="13">
                      <rect width="20" height="14" rx="2" fill="#FF9933"/>
                      <rect y="4.66" width="20" height="4.68" fill="white"/>
                      <rect y="9.32" width="20" height="4.68" fill="#138808"/>
                      <circle cx="10" cy="7" r="2" fill="none" stroke="#000080" strokeWidth="1"/>
                    </svg>
                  </span>
                  Indian Chat
                </div>
                <div className="lp-live-badge">
                  <span className="lp-live-dot" /> LIVE
                </div>
              </div>

              {/* Messages */}
              <div className="lp-msgs">
                {liveMessages.map((m, i) => (
                  <div key={i} className={`lp-msg ${i === activeMsg ? 'lp-msg-active' : ''}`}>
                    <div className="lp-msg-av-wrap">
                      <img
                        src={`https://api.dicebear.com/8.x/adventurer/svg?seed=${m.seed}`}
                        alt={m.name}
                        className="lp-msg-av"
                      />
                      <span className="lp-msg-gender-icon" style={{ color: m.gender === 'female' ? '#db2777' : '#2563eb' }}>
                        {m.gender === 'female' ? <FemaleIcon /> : <MaleIcon />}
                      </span>
                    </div>
                    <div className="lp-msg-body">
                      <div className="lp-msg-meta">
                        <span className="lp-msg-name" style={{ color: m.color }}>{m.name}</span>
                        <span className="lp-msg-crown" style={{ color: '#f59e0b' }}><CrownIcon /></span>
                      </div>
                      <p className="lp-msg-text">{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="lp-preview-input">
                <span className="lp-attach-icon"><AttachIcon /></span>
                <span className="lp-input-ph">Type a message here...</span>
                <div className="lp-preview-icons">
                  <span className="lp-icon-btn"><YouTubeIcon /></span>
                  <span className="lp-icon-btn"><ImageIcon /></span>
                </div>
                <div className="lp-send-btn"><SendIcon /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="lp-section lp-features-section">
        <div className="lp-container">
          <div className="lp-sec-head">
            <div className="lp-badge"><BoltIcon /> Features</div>
            <h2 className="lp-sec-h2">Everything You Need to <span className="lp-grad">Chat Like a Pro</span></h2>
            <p className="lp-sec-sub">India's most feature-rich chat platform — built for real, meaningful connections</p>
          </div>
          <div className="lp-features-grid">
            {features.map(({ Icon, title, desc, tags, color }, i) => (
              <div key={i} className="lp-feat-card" style={{ '--c': color }}>
                <div className="lp-feat-icon" style={{ background: `${color}18` }}>
                  <Icon />
                </div>
                <h3 className="lp-feat-title">{title}</h3>
                <p className="lp-feat-desc">{desc}</p>
                <div className="lp-feat-tags">
                  {tags.map((t, j) => (
                    <span key={j} className="lp-tag" style={{ color, background: `${color}12`, borderColor: `${color}30` }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TIERS ═══ */}
      <section className="lp-section lp-tiers-section">
        <div className="lp-container">
          <div className="lp-sec-head">
            <div className="lp-badge"><TrophyIcon /> Plans</div>
            <h2 className="lp-sec-h2">Choose Your <span className="lp-grad">Experience Level</span></h2>
            <p className="lp-sec-sub">From free users to premium badge holders — find your perfect tier</p>
          </div>
          <div className="lp-tiers-grid">
            {tiers.map((t, i) => (
              <div
                key={i}
                className={`lp-tier ${t.featured ? 'lp-tier-featured' : ''}`}
                style={{ '--tc': t.color, '--tb': t.border, '--tg': t.glow }}
              >
                {t.featured && (
                  <div className="lp-tier-badge">
                    <StarIcon /> Most Popular
                  </div>
                )}
                <div className="lp-tier-head">
                  <h3 className="lp-tier-name" style={{ color: t.color }}>{t.name}</h3>
                  <div className="lp-tier-price">{t.price}</div>
                  <div className="lp-tier-sub">{t.sub}</div>
                </div>
                <div className="lp-tier-line" style={{ background: t.color }} />
                <ul className="lp-tier-list">
                  {t.items.map(([label, ok], j) => (
                    <li key={j} className={`lp-tier-item ${ok ? 'ok' : 'no'}`}>
                      <span className="lp-tier-ic" style={{ color: ok ? t.color : '#94a3b8', background: ok ? `${t.color}14` : 'rgba(0,0,0,0.04)' }}>
                        {ok ? <CheckIcon /> : <CrossIcon />}
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
                <button
                  className="lp-tier-btn"
                  style={t.featured
                    ? { background: `linear-gradient(135deg, ${t.color}, #6366f1)`, color: '#fff', borderColor: 'transparent' }
                    : { background: 'transparent', color: t.color, borderColor: t.border }
                  }
                  onClick={() => { incrementUserCount(); navigate(t.featured ? '/signup' : '/rooms'); }}
                >
                  {t.featured ? 'Get Badge Access' : t.name === 'Free User' ? 'Start For Free' : 'Learn More'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA BANNER ═══ */}
      <section className="lp-cta-section">
        <div className="lp-container">
          <div className="lp-cta-inner">
            <div className="lp-cta-icon-wrap">
              <ChatBubbleIcon />
            </div>
            <h2 className="lp-cta-h2">Ready to Join India's Best <span className="lp-grad">Chat Community?</span></h2>
            <p className="lp-cta-p">Thousands of users are chatting right now. Your conversation starts here — join free today.</p>
            <div className="lp-cta-btns">
              <button className="lp-cta-main" onClick={() => { incrementUserCount(); navigate('/rooms'); }}>
                <span>Join TingleTap Now</span>
                <ArrowRightIcon />
                <span className="lp-shimmer" />
              </button>
              <button className="lp-cta-outline" onClick={() => navigate('/login')}>Sign In to Account</button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        <div className="lp-footer-bg" aria-hidden="true">
          <div className="lp-footer-orb lp-footer-orb-1" />
          <div className="lp-footer-orb lp-footer-orb-2" />
          <div className="lp-footer-orb lp-footer-orb-3" />
        </div>

        <div className="lp-footer-inner">
          <div className="lp-footer-main">
            {/* Brand Column */}
            <div className="lp-footer-brand-col">
              <div className="lp-footer-brand">
                <img src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" alt="TingleTap" className="lp-footer-logo" />
                <div>
                  <h3 className="lp-footer-brand-name">TingleTap</h3>
                  <p className="lp-footer-brand-tag">India's Premium Chat Experience</p>
                </div>
              </div>
              <p className="lp-footer-desc">
                Connect with thousands of users across India in our beautifully designed chat platform.
                Experience real-time conversations with advanced features and premium customization options.
              </p>
              <div className="lp-footer-stats">
                <div className="lp-footer-stat">
                  <span className="lp-fs-num">{realTimeStats.activeUsers.toLocaleString()}+</span>
                  <span className="lp-fs-lbl">Active Users</span>
                </div>
                <div className="lp-footer-stat">
                  <span className="lp-fs-num">{realTimeStats.totalRooms}+</span>
                  <span className="lp-fs-lbl">Chat Rooms</span>
                </div>
                <div className="lp-footer-stat">
                  <span className="lp-fs-num">24/7</span>
                  <span className="lp-fs-lbl">Support</span>
                </div>
              </div>
            </div>

            {/* Link Columns */}
            <div className="lp-footer-links">
              <div className="lp-footer-col">
                <h4 className="lp-footer-col-title">Chat Features</h4>
                <ul>
                  <li><button onClick={() => navigate('/rooms')}>Public Chat Rooms</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Private Messaging</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Voice Messages</button></li>
                  <li><button onClick={() => navigate('/rooms')}>YouTube Sharing</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Image Upload</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Gender Filters</button></li>
                </ul>
              </div>
              <div className="lp-footer-col">
                <h4 className="lp-footer-col-title">Premium Features</h4>
                <ul>
                  <li><button onClick={() => navigate('/signup')}>Advanced Text Styling</button></li>
                  <li><button onClick={() => navigate('/signup')}>Username Customization</button></li>
                  <li><button onClick={() => navigate('/signup')}>Gradient Effects</button></li>
                  <li><button onClick={() => navigate('/signup')}>Text Animations</button></li>
                  <li><button onClick={() => navigate('/signup')}>Premium Badges</button></li>
                  <li><button onClick={() => navigate('/signup')}>Status Styling</button></li>
                </ul>
              </div>
              <div className="lp-footer-col">
                <h4 className="lp-footer-col-title">Chat Rooms</h4>
                <ul>
                  <li><button onClick={() => navigate('/rooms')}>Indian Chat</button></li>
                  <li><button onClick={() => navigate('/rooms')}>International Chat</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Gaming Zone</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Music Lounge</button></li>
                  <li><button onClick={() => navigate('/rooms')}>General Discussion</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Staff Room</button></li>
                </ul>
              </div>
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

          {/* Footer Bottom / Copyright */}
          <div className="lp-footer-bottom">
            <div className="lp-footer-bottom-inner">
              <div className="lp-copyright">
                <div className="lp-copyright-diamond">
                  <DiamondIcon />
                </div>
                <div className="lp-copyright-text">
                  <p className="lp-copy-main">
                    <span className="lp-copy-year">© 2024</span>
                    <span className="lp-copy-brand">TingleTap™</span>
                  </p>
                  <p className="lp-copy-sub">All rights reserved &bull; Developed by Adrashtra Inc.</p>
                </div>
              </div>
              <div className="lp-footer-actions">
                <button
                  className="lp-footer-cta-btn"
                  onClick={() => { incrementUserCount(); navigate('/signup'); }}
                >
                  Join Now — It's Free!
                </button>
                <button className="lp-footer-login-btn" onClick={() => navigate('/login')}>
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
