import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeMsg, setActiveMsg] = useState(0);
  const [realTimeStats, setRealTimeStats] = useState({
    activeUsers: 555,
    totalRooms: 9,
    onlineNow: 138
  });

  const incrementUserCount = () => {
    const current = localStorage.getItem('currentActiveUsers');
    const newCount = current ? parseInt(current) + 1 : 556;
    localStorage.setItem('currentActiveUsers', newCount.toString());
    setRealTimeStats(prev => ({ ...prev, activeUsers: newCount, onlineNow: Math.floor(newCount * 0.25) }));
  };

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'currentActiveUsers') {
        const n = parseInt(e.newValue) || 555;
        setRealTimeStats(prev => ({ ...prev, activeUsers: n, onlineNow: Math.floor(n * 0.25) }));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const check = () => {
      const stored = localStorage.getItem('currentActiveUsers');
      const n = stored ? parseInt(stored) : 555;
      setRealTimeStats(prev => ({ ...prev, activeUsers: n, totalRooms: 9, onlineNow: Math.floor(n * 0.25) }));
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
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const liveMessages = [
    { name: 'Riya Sharma', color: '#c084fc', gender: '♀', seed: 'riya&sex=female', text: 'Hey everyone! 🌟', bg: 'rgba(192,132,252,0.08)' },
    { name: 'Arjun Singh',  color: '#60a5fa', gender: '♂', seed: 'arjun&sex=male',  text: 'Music suggestions please? 🎵', bg: 'rgba(96,165,250,0.06)' },
    { name: 'Priya Gupta', color: '#f472b6', gender: '♀', seed: 'priya&sex=female', text: 'Love the new design 😍', bg: 'rgba(244,114,182,0.08)' },
    { name: 'Rohan Mehta', color: '#34d399', gender: '♂', seed: 'rohan&sex=male',  text: 'Gaming session tonight? 🎮', bg: 'rgba(52,211,153,0.06)' },
    { name: 'Neha Patel',  color: '#fb923c', gender: '♀', seed: 'neha&sex=female', text: 'Good morning friends! ☀️', bg: 'rgba(251,146,60,0.08)' },
  ];

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <defs><linearGradient id="f1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#c084fc"/></linearGradient></defs>
          <rect x="2" y="4" width="20" height="14" rx="4" fill="url(#f1)"/>
          <circle cx="8" cy="11" r="1.5" fill="white" opacity="0.9"/>
          <circle cx="12" cy="11" r="1.5" fill="white" opacity="0.9"/>
          <circle cx="16" cy="11" r="1.5" fill="white" opacity="0.9"/>
        </svg>
      ),
      title: 'Real-Time Chat Rooms',
      desc: '9+ themed rooms — Indian Chat, International, Gaming, Music Lounge & exclusive Staff Rooms',
      tags: ['Live', 'Auto-Scroll', 'Styled Text'],
      color: '#818cf8',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <defs><linearGradient id="f2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f472b6"/><stop offset="100%" stopColor="#fb923c"/></linearGradient></defs>
          <circle cx="12" cy="12" r="10" fill="url(#f2)"/>
          <path d="M12 2A3 3 0 0 1 15 5v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" fill="white" opacity="0.9"/>
          <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
        </svg>
      ),
      title: 'Voice & Media Sharing',
      desc: 'Voice messages, image upload, audio recording & YouTube video sharing with live embedding',
      tags: ['Voice', 'Images', 'YouTube'],
      color: '#f472b6',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <defs><linearGradient id="f3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#818cf8"/></linearGradient></defs>
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="url(#f3)"/>
          <circle cx="9" cy="9" r="1.5" fill="white"/>
          <circle cx="15" cy="9" r="1.5" fill="white"/>
          <rect x="9" y="13" width="6" height="1.2" rx="0.6" fill="white" opacity="0.7"/>
        </svg>
      ),
      title: 'Private Messaging',
      desc: '1-on-1 conversations with file sharing, voice messages & draggable chat windows',
      tags: ['Private', 'Files', 'History'],
      color: '#a78bfa',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <defs><linearGradient id="f4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#f472b6"/></linearGradient></defs>
          <circle cx="8" cy="8" r="5.5" fill="url(#f4)" opacity="0.85"/>
          <circle cx="16" cy="16" r="5.5" fill="url(#f4)" opacity="0.85"/>
          <text x="8" y="10" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white">♂</text>
          <text x="16" y="18" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white">♀</text>
        </svg>
      ),
      title: 'Advanced User Tools',
      desc: 'Gender filters, friend requests, user blocking, whisper messages & rich user profiles',
      tags: ['Filters', 'Friends', 'Block'],
      color: '#60a5fa',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <defs><linearGradient id="f5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs>
          <path d="M12 1l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 1z" fill="url(#f5)"/>
          <circle cx="12" cy="11" r="2.5" fill="white" opacity="0.9"/>
        </svg>
      ),
      title: 'Premium Customization',
      desc: 'Badge holders unlock gradient text, animations, username effects & exclusive styling',
      tags: ['Gradient', 'Animations', 'Badge'],
      color: '#fbbf24',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <defs><linearGradient id="f6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="url(#f6)"/>
          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Security & Moderation',
      desc: 'VPN detection, device fingerprinting, auto-moderation, kick/ban/mute & reporting',
      tags: ['VPN Shield', 'Auto-Mod', 'Reports'],
      color: '#34d399',
    },
  ];

  const tiers = [
    {
      name: 'Free User',
      price: '₹0',
      sub: 'Always Free',
      color: '#60a5fa',
      glow: 'rgba(96,165,250,0.2)',
      items: [
        ['All public chat rooms', true],
        ['Basic text messaging', true],
        ['Voice messages', true],
        ['Image & YouTube sharing', true],
        ['Private messaging', true],
        ['Friend requests', true],
        ['Advanced text styling', false],
        ['Username customization', false],
        ['Premium badges', false],
      ],
    },
    {
      name: 'Badge Holder',
      price: 'Premium',
      sub: 'Most Popular',
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.25)',
      featured: true,
      items: [
        ['Everything in Free', true],
        ['Advanced username styling', true],
        ['Gradient text effects', true],
        ['Text animations', true],
        ['Custom status styling', true],
        ['Premium badges display', true],
        ['Enhanced profile', true],
        ['Priority support', true],
        ['Exclusive features', true],
      ],
    },
    {
      name: 'Staff Access',
      price: 'Invite Only',
      sub: 'Elite',
      color: '#fbbf24',
      glow: 'rgba(251,191,36,0.2)',
      items: [
        ['Everything in Badge Holder', true],
        ['Staff room access', true],
        ['Kick / Ban / Mute powers', true],
        ['User moderation tools', true],
        ['Advanced reporting', true],
        ['Real-time monitoring', true],
        ['Admin panel access', true],
        ['Special role badges', true],
        ['Priority in all features', true],
      ],
    },
  ];

  return (
    <div className="lp-root">
      {/* Ambient Background */}
      <div className="lp-bg">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />
        <div className="lp-grid" />
      </div>

      {/* ── HEADER ── */}
      <header className={`lp-header ${scrolled ? 'lp-header--scrolled' : ''}`}>
        <div className="lp-header-inner">
          <div className="lp-brand">
            <img src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" alt="TingleTap" className="lp-logo" />
            <div>
              <span className="lp-brand-name">TingleTap</span>
              <span className="lp-brand-sub">Premium Chat</span>
            </div>
          </div>
          <div className="lp-header-actions">
            <button className="lp-btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
            <button className="lp-btn-primary" onClick={() => { incrementUserCount(); navigate('/signup'); }}>Get Started</button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          {/* Left */}
          <div className="lp-hero-text">
            <div className="lp-pill lp-animate-fade">✨ India's Premier Chat Platform</div>

            <h1 className="lp-hero-title lp-animate-up">
              Connect with India's
              <br />
              <span className="lp-gradient-text">Most Vibrant</span>
              <br />
              Chat Community
            </h1>

            <p className="lp-hero-desc lp-animate-up lp-delay-1">
              Real-time conversations with voice messages, YouTube sharing, private chats,
              gender filters, and premium customization — all in one beautifully crafted platform.
            </p>

            {/* Stats row */}
            <div className="lp-stats lp-animate-up lp-delay-2">
              <div className="lp-stat-item">
                <span className="lp-stat-num">{realTimeStats.activeUsers.toLocaleString()}+</span>
                <span className="lp-stat-label">Users</span>
              </div>
              <div className="lp-stat-divider" />
              <div className="lp-stat-item">
                <span className="lp-stat-num">{realTimeStats.onlineNow}</span>
                <span className="lp-stat-label">Online Now</span>
              </div>
              <div className="lp-stat-divider" />
              <div className="lp-stat-item">
                <span className="lp-stat-num">{realTimeStats.totalRooms}+</span>
                <span className="lp-stat-label">Rooms</span>
              </div>
            </div>

            <div className="lp-hero-btns lp-animate-up lp-delay-3">
              <button className="lp-cta-main" onClick={() => { incrementUserCount(); navigate('/rooms'); }}>
                <span>Start Chatting</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <div className="lp-shimmer" />
              </button>
              <button className="lp-cta-ghost" onClick={() => { incrementUserCount(); navigate('/signup'); }}>Create Free Account</button>
            </div>
          </div>

          {/* Right – Chat Preview */}
          <div className="lp-hero-preview lp-animate-fade lp-delay-2">
            <div className="lp-preview-card">
              {/* Preview Header */}
              <div className="lp-preview-header">
                <div className="lp-preview-header-left">
                  <div className="lp-preview-dot lp-dot-red" />
                  <div className="lp-preview-dot lp-dot-yellow" />
                  <div className="lp-preview-dot lp-dot-green" />
                  <span className="lp-preview-room">🇮🇳 Indian Chat</span>
                  <span className="lp-preview-count">({realTimeStats.onlineNow})</span>
                </div>
                <div className="lp-preview-header-right">
                  <div className="lp-preview-live"><span className="lp-live-dot" />LIVE</div>
                </div>
              </div>

              {/* Messages */}
              <div className="lp-preview-msgs">
                {liveMessages.map((m, i) => (
                  <div key={i} className={`lp-msg ${i === activeMsg ? 'lp-msg--active' : ''}`} style={{ background: m.bg }}>
                    <div className="lp-msg-avatar-wrap">
                      <img src={`https://api.dicebear.com/8.x/adventurer/svg?seed=${m.seed}`} alt={m.name} className="lp-msg-avatar" />
                      <span className="lp-msg-gender" style={{ color: m.color }}>{m.gender}</span>
                    </div>
                    <div className="lp-msg-body">
                      <span className="lp-msg-name" style={{ color: m.color }}>{m.name} 👑</span>
                      <span className="lp-msg-text">{m.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview Input */}
              <div className="lp-preview-input">
                <div className="lp-preview-input-inner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" fill="#a78bfa"/></svg>
                  <span className="lp-preview-placeholder">Type a message...</span>
                  <div className="lp-preview-send">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 21L23 12 2 3v7l15 2-15 2v7z" fill="white"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section lp-features">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <div className="lp-pill">⚡ Features</div>
            <h2 className="lp-section-title">Everything You Need to<br /><span className="lp-gradient-text">Chat Like a Pro</span></h2>
            <p className="lp-section-sub">India's most feature-rich chat platform — built for real connections</p>
          </div>

          <div className="lp-features-grid">
            {features.map((f, i) => (
              <div key={i} className="lp-feature-card" style={{ '--card-color': f.color }}>
                <div className="lp-feature-icon-wrap" style={{ background: `${f.color}18` }}>
                  {f.icon}
                </div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
                <div className="lp-feature-tags">
                  {f.tags.map((t, j) => (
                    <span key={j} className="lp-tag" style={{ color: f.color, background: `${f.color}14`, borderColor: `${f.color}30` }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIERS ── */}
      <section className="lp-section lp-tiers">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <div className="lp-pill">🏆 Plans</div>
            <h2 className="lp-section-title">Choose Your<br /><span className="lp-gradient-text">Experience Level</span></h2>
            <p className="lp-section-sub">From free users to premium badge holders — find your perfect tier</p>
          </div>

          <div className="lp-tiers-grid">
            {tiers.map((t, i) => (
              <div key={i} className={`lp-tier-card ${t.featured ? 'lp-tier-card--featured' : ''}`} style={{ '--tier-color': t.color, '--tier-glow': t.glow }}>
                {t.featured && <div className="lp-tier-badge">Most Popular ⭐</div>}
                <div className="lp-tier-head">
                  <h3 className="lp-tier-name" style={{ color: t.color }}>{t.name}</h3>
                  <div className="lp-tier-price">{t.price}</div>
                  <div className="lp-tier-sub">{t.sub}</div>
                </div>
                <div className="lp-tier-divider" style={{ background: t.color }} />
                <ul className="lp-tier-list">
                  {t.items.map(([label, ok], j) => (
                    <li key={j} className={`lp-tier-item ${ok ? 'lp-tier-item--ok' : 'lp-tier-item--no'}`}>
                      <span className="lp-tier-check">{ok ? '✓' : '✗'}</span>
                      {label}
                    </li>
                  ))}
                </ul>
                <button
                  className="lp-tier-btn"
                  style={{ background: t.featured ? `linear-gradient(135deg, ${t.color}, #818cf8)` : 'transparent', borderColor: t.color, color: t.featured ? '#fff' : t.color }}
                  onClick={() => { incrementUserCount(); navigate(t.featured ? '/signup' : '/rooms'); }}
                >
                  {t.featured ? 'Get Badge Access' : t.name === 'Free User' ? 'Start Free' : 'Learn More'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="lp-cta-banner">
        <div className="lp-cta-banner-inner">
          <h2 className="lp-cta-title">Ready to Join India's Best<br /><span className="lp-gradient-text">Chat Community?</span></h2>
          <p className="lp-cta-sub">Thousands of users are chatting right now. Your conversation starts here.</p>
          <div className="lp-cta-actions">
            <button className="lp-cta-main" onClick={() => { incrementUserCount(); navigate('/rooms'); }}>
              <span>Join TingleTap Now</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div className="lp-shimmer" />
            </button>
            <button className="lp-cta-ghost" onClick={() => navigate('/login')}>Sign In</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            {/* Brand */}
            <div className="lp-footer-brand">
              <div className="lp-brand">
                <img src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" alt="TingleTap" className="lp-logo" />
                <div>
                  <span className="lp-brand-name">TingleTap</span>
                  <span className="lp-brand-sub">Premium Chat</span>
                </div>
              </div>
              <p className="lp-footer-desc">India's most advanced real-time chat platform. Connect, share, and experience conversations like never before.</p>
              <div className="lp-footer-stats">
                <div className="lp-footer-stat"><span>{realTimeStats.activeUsers.toLocaleString()}+</span><small>Users</small></div>
                <div className="lp-footer-stat"><span>{realTimeStats.totalRooms}+</span><small>Rooms</small></div>
                <div className="lp-footer-stat"><span>24/7</span><small>Support</small></div>
              </div>
            </div>

            {/* Links */}
            <div className="lp-footer-links">
              <div className="lp-footer-col">
                <h4>Features</h4>
                <button onClick={() => navigate('/rooms')}>Public Rooms</button>
                <button onClick={() => navigate('/rooms')}>Private Messages</button>
                <button onClick={() => navigate('/rooms')}>Voice Messages</button>
                <button onClick={() => navigate('/rooms')}>YouTube Sharing</button>
                <button onClick={() => navigate('/rooms')}>Gender Filters</button>
              </div>
              <div className="lp-footer-col">
                <h4>Premium</h4>
                <button onClick={() => navigate('/signup')}>Text Styling</button>
                <button onClick={() => navigate('/signup')}>Gradient Effects</button>
                <button onClick={() => navigate('/signup')}>Animations</button>
                <button onClick={() => navigate('/signup')}>Premium Badges</button>
                <button onClick={() => navigate('/signup')}>Username FX</button>
              </div>
              <div className="lp-footer-col">
                <h4>Rooms</h4>
                <button onClick={() => navigate('/rooms')}>Indian Chat</button>
                <button onClick={() => navigate('/rooms')}>International</button>
                <button onClick={() => navigate('/rooms')}>Gaming Zone</button>
                <button onClick={() => navigate('/rooms')}>Music Lounge</button>
                <button onClick={() => navigate('/rooms')}>Staff Room</button>
              </div>
              <div className="lp-footer-col">
                <h4>Legal</h4>
                <button onClick={() => navigate('/about')}>About Us</button>
                <button onClick={() => navigate('/contact')}>Contact</button>
                <button onClick={() => navigate('/faq')}>FAQ</button>
                <button onClick={() => navigate('/privacy')}>Privacy Policy</button>
                <button onClick={() => navigate('/terms')}>Terms</button>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="lp-footer-bottom">
            <p className="lp-copyright">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#dg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#c084fc"/></linearGradient></defs></svg>
              <span>© 2024 <strong>TingleTap™</strong> — All rights reserved • Developed by <strong>Adrashtra Inc.</strong></span>
            </p>
            <div className="lp-footer-ctas">
              <button className="lp-btn-primary lp-btn-sm" onClick={() => { incrementUserCount(); navigate('/signup'); }}>Join Free</button>
              <button className="lp-btn-ghost lp-btn-sm" onClick={() => navigate('/login')}>Sign In</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
