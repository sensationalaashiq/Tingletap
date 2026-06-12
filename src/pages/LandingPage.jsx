import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import PremiumCopyright from '../components/PremiumCopyright';

/* ══════════════════════════════════════════
   PREMIUM SVG ICON LIBRARY — NO EMOJIS
══════════════════════════════════════════ */

const SparkleIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <path d="M12 2l1.6 4.8L18.6 8l-5 1.6L12 15l-1.6-5L5.4 8l5-1.6L12 2z" fill="currentColor"/>
    <path d="M19.5 14l.7 2L22 17l-1.8.7L19.5 20l-.7-2.3L17 17l1.8-.7L19.5 14z" fill="currentColor" opacity="0.55"/>
    <path d="M5 16.5l.5 1.5 1.5.5-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 16.5z" fill="currentColor" opacity="0.4"/>
  </svg>
);

const BoltIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <path d="M13 2L3.5 13.5H11L10 22l10.5-12H13.5L13 2z" fill="currentColor"/>
  </svg>
);

const TrophyIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <path d="M6 2h12v7a6 6 0 0 1-12 0V2z" fill="currentColor"/>
    <path d="M3 4H1v3a5 5 0 0 0 5 5M21 4h2v3a5 5 0 0 1-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M12 15v4M9 22h6M10 19h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const HeartIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <defs>
      <linearGradient id="g-heart" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899"/>
        <stop offset="50%" stopColor="#a855f7"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
    </defs>
    <path d="M12 21C12 21 3 14.5 3 8.5a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 12.5-9 12.5z" fill="url(#g-heart)"/>
    <path d="M12 21C12 21 3 14.5 3 8.5a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 12.5-9 12.5z" fill="url(#g-heart)" opacity="0.3" transform="scale(0.7) translate(5.1,6)"/>
  </svg>
);

const ChatBubbleIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size} fill="none">
    <defs>
      <linearGradient id="g-chat" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1"/>
        <stop offset="100%" stopColor="#a855f7"/>
      </linearGradient>
    </defs>
    <rect x="2" y="4" width="24" height="16" rx="5" fill="url(#g-chat)"/>
    <path d="M8 22l4-2h10" stroke="url(#g-chat)" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="9" cy="12" r="2" fill="white" opacity="0.95"/>
    <circle cx="14" cy="12" r="2" fill="white" opacity="0.95"/>
    <circle cx="19" cy="12" r="2" fill="white" opacity="0.95"/>
  </svg>
);

const MicIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size} fill="none">
    <defs>
      <linearGradient id="g-mic" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899"/>
        <stop offset="100%" stopColor="#f97316"/>
      </linearGradient>
    </defs>
    <circle cx="14" cy="14" r="12" fill="url(#g-mic)"/>
    <rect x="11" y="6" width="6" height="10" rx="3" fill="white" opacity="0.95"/>
    <path d="M8 14a6 6 0 0 0 12 0M14 20v3M11 23h6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const LockIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size} fill="none">
    <defs>
      <linearGradient id="g-lock" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6"/>
        <stop offset="100%" stopColor="#6366f1"/>
      </linearGradient>
    </defs>
    <rect x="2" y="11" width="24" height="14" rx="5" fill="url(#g-lock)"/>
    <path d="M8 11V9a6 6 0 0 1 12 0v2" stroke="url(#g-lock)" strokeWidth="2.2" fill="none"/>
    <circle cx="14" cy="17" r="2.5" fill="white"/>
    <path d="M14 19.5v2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const FilterIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size} fill="none">
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
    <circle cx="10" cy="14" r="7.5" fill="url(#g-fil1)" opacity="0.88"/>
    <circle cx="18" cy="14" r="7.5" fill="url(#g-fil2)" opacity="0.88"/>
    <path d="M10 10v8M18 10v8M7 14h6M15 14h6" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const StarIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size} fill="none">
    <defs>
      <linearGradient id="g-star" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b"/>
        <stop offset="100%" stopColor="#ef4444"/>
      </linearGradient>
    </defs>
    <path d="M14 3.5l2.7 5.4 6 .9-4.4 4.3 1 6-5.3-2.8-5.3 2.8 1-6L5.3 9.8l6-.9L14 3.5z" fill="url(#g-star)"/>
    <circle cx="14" cy="12.5" r="2.8" fill="white" opacity="0.85"/>
  </svg>
);

const ShieldIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 28 28" width={size} height={size} fill="none">
    <defs>
      <linearGradient id="g-shield" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981"/>
        <stop offset="100%" stopColor="#059669"/>
      </linearGradient>
    </defs>
    <path d="M14 3L4 7.5V13c0 6.2 4.5 11.5 10 13 5.5-1.5 10-6.8 10-13V7.5L14 3z" fill="url(#g-shield)"/>
    <path d="M9 14l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);


const DiamondIcon = ({ size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <defs>
      <linearGradient id="g-diamond" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd"/>
        <stop offset="50%" stopColor="#f0abfc"/>
        <stop offset="100%" stopColor="#818cf8"/>
      </linearGradient>
    </defs>
    <path d="M12 2l-8 6.5 8 13.5 8-13.5L12 2z" fill="url(#g-diamond)"/>
    <path d="M4 8.5h16M9 2.5l-5 6M15 2.5l5 6M12 2.5l2.5 6M12 2.5L9.5 8.5" stroke="white" strokeWidth="0.7" opacity="0.5"/>
  </svg>
);

const ArrowRightIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} fill="none">
    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
    <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CrossIcon = ({ size = 13 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none">
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);


/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled]       = useState(false);
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

  const features = [
    { Icon: ChatBubbleIcon, title: 'Real-Time Chat Rooms',    desc: '9+ themed rooms — Indian, International, Gaming, Music Lounge and exclusive Staff Rooms with live messaging.', tags: ['Live', 'Auto-Scroll', 'Styled Text'], color: '#6366f1' },
    { Icon: MicIcon,        title: 'Voice & Media Sharing',   desc: 'Send voice messages, record audio in-chat and embed YouTube videos in real-time for the whole room.', tags: ['Voice', 'Audio Record', 'YouTube'], color: '#ec4899' },
    { Icon: LockIcon,       title: 'Private Messaging',       desc: '1-on-1 private conversations with file sharing, voice messages and draggable floating chat windows.', tags: ['Private', 'Files', 'History'], color: '#8b5cf6' },
    { Icon: FilterIcon,     title: 'Advanced User Tools',     desc: 'Gender-based filtering, friend requests, user blocking, whisper messages and full user profiles.', tags: ['Filters', 'Friends', 'Block'], color: '#3b82f6' },
    { Icon: StarIcon,       title: 'Premium Customization',   desc: 'Badge holders unlock gradient text effects, glowing animations, username FX and exclusive profile styling.', tags: ['Gradient', 'Animations', 'Badges'], color: '#f59e0b' },
    { Icon: ShieldIcon,     title: 'Security & Moderation',   desc: 'VPN detection, device fingerprinting, auto-moderation, kick/ban/mute systems and reporting tools.', tags: ['VPN Shield', 'Auto-Mod', 'Reports'], color: '#10b981' },
  ];

  const tiers = [
    {
      name: 'Free User',
      price: '₹0',
      sub: 'Always Free',
      color: '#3b82f6',
      border: 'rgba(59,130,246,0.3)',
      glow: 'rgba(59,130,246,0.08)',
      items: [
        ['All public chat rooms access', true],
        ['Basic text messaging', true],
        ['Voice message sending', true],
        ['Private messaging (1-on-1)', true],
        ['Friend requests system', true],
        ['Gender filter browsing', true],
        ['YouTube video sharing', false],
        ['Image & media uploads', false],
        ['Advanced text styling', false],
        ['Premium badges', false],
      ],
    },
    {
      name: 'Badge Holder',
      price: 'Premium',
      sub: 'Most Popular',
      color: '#7c3aed',
      border: 'rgba(124,58,237,0.4)',
      glow: 'rgba(124,58,237,0.12)',
      featured: true,
      items: [
        ['Everything in Free User', true],
        ['YouTube video sharing', true],
        ['Image & media uploads', true],
        ['Advanced text styling', true],
        ['Gradient & glow effects', true],
        ['Username customization', true],
        ['Text animations', true],
        ['Premium badges display', true],
        ['Priority support access', true],
        ['Exclusive features first', true],
      ],
    },
    {
      name: 'Staff Access',
      price: 'Invite Only',
      sub: 'Elite Tier',
      color: '#b45309',
      border: 'rgba(180,83,9,0.3)',
      glow: 'rgba(251,191,36,0.08)',
      items: [
        ['Everything in Badge Holder', true],
        ['Staff room access', true],
        ['Kick / Ban / Mute powers', true],
        ['Full moderation panel', true],
        ['Advanced reporting tools', true],
        ['Real-time user monitoring', true],
        ['Admin panel access', true],
        ['Special role badges', true],
        ['All features — forever', true],
        ['Priority in all features', true],
      ],
    },
  ];

  return (
    <div className="lp-root">
      {/* Ambient Orbs */}
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
      </div>

      {/* ══ HEADER ══ */}
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
              Get Started <ArrowRightIcon size={16} />
            </button>
          </nav>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          {/* Left */}
          <div className="lp-hero-left">
            <div className="lp-badge lp-anim-fade">
              <SparkleIcon size={14} /> India's Premier Chat Platform
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
                <ArrowRightIcon size={17} />
                <span className="lp-shimmer" />
              </button>
              <button className="lp-cta-outline" onClick={() => { incrementUserCount(); navigate('/signup'); }}>
                Create Free Account
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="lp-section lp-features-section">
        <div className="lp-container">
          <div className="lp-sec-head">
            <div className="lp-badge"><BoltIcon size={14} /> Features</div>
            <h2 className="lp-sec-h2">Everything You Need to <span className="lp-grad">Chat Like a Pro</span></h2>
            <p className="lp-sec-sub">India's most feature-rich platform — built for real, meaningful connections</p>
          </div>
          <div className="lp-features-grid">
            {features.map(({ Icon, title, desc, tags, color }, i) => (
              <div key={i} className="lp-feat-card" style={{ '--c': color }}>
                <div className="lp-feat-icon" style={{ background: `${color}18` }}>
                  <Icon size={28} />
                </div>
                <h3 className="lp-feat-title">{title}</h3>
                <p className="lp-feat-desc">{desc}</p>
                <div className="lp-feat-tags">
                  {tags.map((t, j) => (
                    <span key={j} className="lp-tag" style={{ color, background: `${color}12`, borderColor: `${color}35` }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TIERS ══ */}
      <section className="lp-section lp-tiers-section">
        <div className="lp-container">
          <div className="lp-sec-head">
            <div className="lp-badge"><TrophyIcon size={14} /> Plans</div>
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
                    <StarIcon size={13} /> Most Popular
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
                      <span className="lp-tier-ic" style={{ color: ok ? t.color : '#94a3b8', background: ok ? `${t.color}14` : 'rgba(148,163,184,0.1)' }}>
                        {ok ? <CheckIcon size={13} /> : <CrossIcon size={12} />}
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
                <button
                  className="lp-tier-btn"
                  style={t.featured
                    ? { background: `linear-gradient(135deg, ${t.color}, #6366f1)`, color: '#fff', border: 'none' }
                    : { background: 'transparent', color: t.color, borderColor: t.border }
                  }
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
          <div className="lp-cta-inner">
            <div className="lp-cta-icon-wrap">
              <ChatBubbleIcon size={42} />
            </div>
            <h2 className="lp-cta-h2">
              Ready to Join India's Best<br />
              <span className="lp-grad">Chat Community?</span>
            </h2>
            <p className="lp-cta-p">
              Thousands of users are chatting right now.<br />
              Your conversation starts here — join free today.
            </p>
            <div className="lp-cta-btns">
              <button className="lp-cta-main" onClick={() => { incrementUserCount(); navigate('/rooms'); }}>
                <span>Start Chatting Now</span>
                <ArrowRightIcon size={17} />
                <span className="lp-shimmer" />
              </button>
              <button className="lp-cta-outline" onClick={() => navigate('/login')}>
                Sign In to Account
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

            {/* Link Columns */}
            <div className="lp-footer-links">
              <div className="lp-footer-col">
                <h4 className="lp-footer-col-title">Chat Features</h4>
                <ul>
                  <li><button onClick={() => navigate('/rooms')}>Public Chat Rooms</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Private Messaging</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Voice Messages</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Gender Filters</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Friend System</button></li>
                  <li><button onClick={() => navigate('/rooms')}>User Profiles</button></li>
                </ul>
              </div>
              <div className="lp-footer-col">
                <h4 className="lp-footer-col-title">Premium Features</h4>
                <ul>
                  <li><button onClick={() => navigate('/signup')}>YouTube Sharing</button></li>
                  <li><button onClick={() => navigate('/signup')}>Image Uploads</button></li>
                  <li><button onClick={() => navigate('/signup')}>Text Styling</button></li>
                  <li><button onClick={() => navigate('/signup')}>Gradient Effects</button></li>
                  <li><button onClick={() => navigate('/signup')}>Animations</button></li>
                  <li><button onClick={() => navigate('/signup')}>Premium Badges</button></li>
                </ul>
              </div>
              <div className="lp-footer-col">
                <h4 className="lp-footer-col-title">Chat Rooms</h4>
                <ul>
                  <li><button onClick={() => navigate('/rooms')}>Indian Chat</button></li>
                  <li><button onClick={() => navigate('/rooms')}>International</button></li>
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

          {/* Divider */}
          <div className="lp-footer-divider" />

          {/* Footer CTA */}
          <div className="lp-footer-cta-center">
            <button className="lp-footer-cta-btn" onClick={() => { incrementUserCount(); navigate('/rooms'); }}>
              <span>Join TingleTap Now</span>
              <ArrowRightIcon size={15} />
            </button>
            <button className="lp-footer-login-btn" onClick={() => navigate('/login')}>Sign In</button>
          </div>
        </div>
      </footer>
      <PremiumCopyright />
    </div>
  );
};

export default LandingPage;
