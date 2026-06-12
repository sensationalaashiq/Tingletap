import React from 'react';
import { useNavigate } from 'react-router-dom';
import PremiumCopyright from '../components/PremiumCopyright';
import './LegalPage.css';

const BackIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <path d="M14 9H4M8 5l-4 4 4 4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LoginIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <path d="M7 3H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M12 5.5l4 3.5-4 3.5M16 9H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const PrivacyHeroIcon = () => (
  <svg viewBox="0 0 28 28" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <defs><linearGradient id="pv-hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
    <path d="M14 1.5L3 6.5v6C3 19 7.7 24.7 14 26.5c6.3-1.8 11-7.5 11-14v-6L14 1.5z" fill="url(#pv-hg)"/>
    <path d="M9 14l3.5 3.5L20 10" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const icons = {
  collect: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="8" r="4" stroke="#a78bfa" strokeWidth="1.8"/>
      <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  usage: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="16" height="16" rx="3" stroke="#a78bfa" strokeWidth="1.8"/>
      <path d="M7 11h8M7 15h5" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M7 7h8" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  security: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 1.5L2 5.5v5C2 15.4 5.9 20.1 11 21.5c5.1-1.4 9-6.1 9-11V5.5L11 1.5z" stroke="#a78bfa" strokeWidth="1.8"/>
      <path d="M7.5 11l2.5 2.5L15 8" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  rights: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 2L3 6v4c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6L11 2z" stroke="#a78bfa" strokeWidth="1.8"/>
      <path d="M8 11h6M11 8v6" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  contact: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="18" height="14" rx="3" stroke="#a78bfa" strokeWidth="1.8"/>
      <path d="M2 7l9 6 9-6" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  cookie: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="9" stroke="#a78bfa" strokeWidth="1.8"/>
      <circle cx="8" cy="10" r="1.2" fill="#a78bfa"/>
      <circle cx="13" cy="8" r="1.2" fill="#a78bfa"/>
      <circle cx="12" cy="14" r="1.2" fill="#a78bfa"/>
    </svg>
  ),
};

const sections = [
  { icon: 'collect', title: 'Information We Collect', text: 'We collect minimal information necessary for service functionality: email address, display name, profile picture, chat messages, and basic usage analytics to improve your experience.' },
  { icon: 'usage', title: 'How We Use Your Data', text: 'Your data is used solely to provide and improve our chat services. We never sell personal information to third parties or use it for advertising purposes.' },
  { icon: 'security', title: 'Data Security', text: 'All data is encrypted in transit and at rest. Private messages use end-to-end encryption. We implement industry-standard security measures to protect your information at all times.' },
  { icon: 'rights', title: 'Your Rights', text: 'You can access, modify, or delete your personal data at any time through your account settings. Contact our support team for assistance with any data-related requests.' },
  { icon: 'cookie', title: 'Cookies & Local Storage', text: 'We use browser storage to remember your preferences, session state, and theme settings. No third-party tracking cookies are used. You may clear these at any time via your browser settings.' },
  { icon: 'contact', title: 'Contact for Privacy', text: 'For privacy-related questions or concerns, please reach out through our contact page. We are committed to addressing any privacy issues promptly and transparently.' },
];

const ArrowRightIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <path d="M3.5 9h11M10 5l4 4-4 4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M2 6l7 5 7-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const PrivacyPage = () => {
  const navigate = useNavigate();
  return (
    <div className="lp-root">
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-orb lp-orb-1"/><div className="lp-orb lp-orb-2"/><div className="lp-orb lp-orb-3"/>
      </div>

      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
            <img src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" alt="TingleTap" className="lp-logo"/>
            <div className="lp-brand-text">
              <span className="lp-brand-name">TingleTap</span>
              <span className="lp-brand-sub">Privacy Policy</span>
            </div>
          </div>
          <nav className="lp-nav">
            <button className="lp-nav-ghost" onClick={() => navigate('/')}><BackIcon /><span>Back Home</span></button>
            <button className="lp-nav-solid" onClick={() => navigate('/login')}><LoginIcon /><span>Login</span></button>
          </nav>
        </div>
      </header>

      <main className="lp-main">
        <div className="lp-hero">
          <div className="lp-hero-icon"><PrivacyHeroIcon /></div>
          <h1 className="lp-hero-title">Privacy Policy</h1>
          <p className="lp-hero-sub">Your privacy and data security are our top priorities. Here's exactly what we collect, how we use it, and how we protect it.</p>
        </div>

        <div className="lp-card">
          <div className="lp-section">
            {sections.map((s, i) => {
              const IconComp = icons[s.icon];
              return (
                <div className="lp-section-item" key={i}>
                  <div className="lp-section-icon"><IconComp /></div>
                  <div className="lp-section-content">
                    <div className="lp-section-title">{s.title}</div>
                    <div className="lp-section-text">{s.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lp-cta-row">
          <button className="lp-btn-primary" onClick={() => navigate('/signup')}>
            <ArrowRightIcon /><span>Join TingleTap</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => navigate('/contact')}>
            <MailIcon /><span>Contact Support</span>
          </button>
        </div>
      </main>

      <footer className="lp-footer">
        <nav className="lp-footer-nav">
          <button className="lp-footer-link" onClick={() => navigate('/about')}><span>About</span></button>
          <button className="lp-footer-link" onClick={() => navigate('/privacy')}><span>Privacy</span></button>
          <button className="lp-footer-link" onClick={() => navigate('/terms')}><span>Terms</span></button>
          <button className="lp-footer-link" onClick={() => navigate('/contact')}><span>Contact</span></button>
          <button className="lp-footer-link" onClick={() => navigate('/faq')}><span>FAQ</span></button>
          <button className="lp-footer-link" onClick={() => navigate('/disclaimer')}><span>Disclaimer</span></button>
        </nav>
      </footer>
      <PremiumCopyright />
    </div>
  );
};

export default PrivacyPage;
