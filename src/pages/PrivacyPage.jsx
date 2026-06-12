import React from 'react';
import { useNavigate } from 'react-router-dom';
import PremiumCopyright from '../components/PremiumCopyright';
import './LandingPage.css';

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
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="pv-ic1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
      <circle cx="13" cy="9" r="5.5" fill="url(#pv-ic1)" opacity=".9"/>
      <circle cx="13" cy="9" r="2.8" fill="white" opacity=".55"/>
      <path d="M3.5 23c0-5.2 4.3-9.5 9.5-9.5s9.5 4.3 9.5 9.5" stroke="url(#pv-ic1)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  usage: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="pv-ic2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
      <rect x="3" y="3" width="20" height="20" rx="4" fill="url(#pv-ic2)" opacity=".85"/>
      <rect x="3" y="3" width="20" height="20" rx="4" fill="white" opacity=".1"/>
      <path d="M8 13h10M8 17h7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 9h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  security: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="pv-ic3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
      <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill="url(#pv-ic3)" opacity=".9"/>
      <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill="white" opacity=".12"/>
      <path d="M8.5 13l3 3L18 9" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  rights: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="pv-ic4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
      <path d="M13 2L3 6.5v5C3 18 7 23.2 13 24.5c6-1.3 10-6.5 10-13v-5L13 2z" fill="url(#pv-ic4)" opacity=".88"/>
      <path d="M9 13h8M13 9v8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  contact: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="pv-ic5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8"/><stop offset="100%" stopColor="#0ea5e9"/></linearGradient></defs>
      <rect x="2" y="5" width="22" height="16" rx="4" fill="url(#pv-ic5)" opacity=".9"/>
      <rect x="2" y="5" width="22" height="16" rx="4" fill="white" opacity=".1"/>
      <path d="M2 9l11 7.5L24 9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  cookie: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="pv-ic6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c084fc"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
      <circle cx="13" cy="13" r="11" fill="url(#pv-ic6)" opacity=".88"/>
      <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
      <circle cx="9.5" cy="11.5" r="1.6" fill="white" opacity=".9"/>
      <circle cx="15" cy="9.5" r="1.6" fill="white" opacity=".9"/>
      <circle cx="14" cy="16" r="1.6" fill="white" opacity=".9"/>
      <path d="M10 16.5l2-1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity=".5"/>
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
    <div className="lp-root lp-lpage">
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
