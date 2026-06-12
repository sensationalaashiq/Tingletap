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
const DisclaimerHeroIcon = () => (
  <svg viewBox="0 0 28 28" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <defs><linearGradient id="dc-hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f97316"/></linearGradient></defs>
    <path d="M14 2L2 25h24L14 2z" fill="url(#dc-hg)" opacity=".2" stroke="url(#dc-hg)" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M14 11v6" stroke="url(#dc-hg)" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="14" cy="20.5" r="1.8" fill="url(#dc-hg)"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <path d="M3.5 9h11M10 5l4 4-4 4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <rect x="3" y="8" width="12" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M6 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const icons = {
  service: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="dc-ic1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs>
      <rect x="2" y="5" width="22" height="16" rx="4" fill="url(#dc-ic1)" opacity=".88"/>
      <rect x="2" y="5" width="22" height="16" rx="4" fill="white" opacity=".1"/>
      <path d="M7 13h12M7 17h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  user: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="dc-ic2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fb923c"/><stop offset="100%" stopColor="#f97316"/></linearGradient></defs>
      <circle cx="13" cy="9" r="5.5" fill="url(#dc-ic2)" opacity=".9"/>
      <circle cx="13" cy="9" r="2.8" fill="white" opacity=".55"/>
      <path d="M3.5 25c0-5.2 4.3-9.5 9.5-9.5s9.5 4.3 9.5 9.5" stroke="url(#dc-ic2)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  accuracy: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="dc-ic3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#10b981"/></linearGradient></defs>
      <circle cx="13" cy="13" r="11" fill="url(#dc-ic3)" opacity=".88"/>
      <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
      <path d="M13 7v6.5l4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  link: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="dc-ic4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
      <circle cx="13" cy="13" r="11" fill="url(#dc-ic4)" opacity=".15"/>
      <path d="M11 15a5 5 0 0 0 7.07 0l3.54-3.54a5 5 0 0 0-7.07-7.07L13.06 5.87" stroke="url(#dc-ic4)" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M15 11a5 5 0 0 0-7.07 0L4.39 14.54a5 5 0 0 0 7.07 7.07L12.94 20.13" stroke="url(#dc-ic4)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  warranty: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="dc-ic5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
      <path d="M13 2L3 6.5v5C3 18 7 23.2 13 24.5c6-1.3 10-6.5 10-13v-5L13 2z" fill="url(#dc-ic5)" opacity=".88"/>
      <path d="M13 9v5.5" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
      <circle cx="13" cy="18" r="1.6" fill="white"/>
    </svg>
  ),
  age: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="dc-ic6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c084fc"/><stop offset="100%" stopColor="#9333ea"/></linearGradient></defs>
      <circle cx="13" cy="13" r="11" fill="url(#dc-ic6)" opacity=".88"/>
      <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
      <path d="M9 13h8M13 9v8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
};

const sections = [
  { icon: 'service', title: 'Service Nature', text: 'TingleTap is a communication platform that facilitates user interactions. We provide the technology and infrastructure but do not control, endorse, or verify user-generated content or interactions between users.' },
  { icon: 'user', title: 'User Responsibility', text: 'Users are solely responsible for their interactions, shared content, and any consequences arising from their use of the platform. Exercise caution and common sense when sharing personal information online.' },
  { icon: 'accuracy', title: 'Content Accuracy', text: 'We do not verify the accuracy, completeness, or reliability of user-generated content. Information shared by users should not be considered professional advice, medical guidance, or factual statements.' },
  { icon: 'link', title: 'Third-Party Links', text: 'Links to external websites or services may be shared on our platform. We are not responsible for the content, privacy practices, or terms of service of any third-party websites or services.' },
  { icon: 'warranty', title: 'No Warranties', text: 'TingleTap is provided "as is" without any warranties, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement of intellectual property rights.' },
  { icon: 'age', title: 'Age Restrictions', text: 'TingleTap requires users to be at least 13 years of age. Adult content rooms require users to be 18 years or older. Misrepresentation of age will result in immediate account termination.' },
];

const DisclaimerPage = () => {
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
              <span className="lp-brand-sub">Disclaimer</span>
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
          <div className="lp-hero-icon"><DisclaimerHeroIcon /></div>
          <h1 className="lp-hero-title">Disclaimer</h1>
          <p className="lp-hero-sub">Important information about the nature of TingleTap's services, user responsibilities, and the boundaries of our liability.</p>
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
          <button className="lp-btn-primary" onClick={() => navigate('/terms')}>
            <ArrowRightIcon /><span>Read Full Terms</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => navigate('/privacy')}>
            <LockIcon /><span>Privacy Policy</span>
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

export default DisclaimerPage;
