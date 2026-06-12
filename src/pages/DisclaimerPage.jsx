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
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="18" height="14" rx="3" stroke="#fbbf24" strokeWidth="1.8"/>
      <path d="M7 11h8M7 15h4" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  user: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="7" r="4" stroke="#fbbf24" strokeWidth="1.8"/>
      <path d="M3 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  accuracy: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="9" stroke="#fbbf24" strokeWidth="1.8"/>
      <path d="M11 7v4.5l3 3" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  link: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 13a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66L10.5 5.83" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M13 9a4 4 0 0 0-5.66 0L4.51 11.83a4 4 0 0 0 5.66 5.66L11.5 16.17" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  warranty: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 1.5L2 5.5v5C2 15.4 5.9 20.1 11 21.5c5.1-1.4 9-6.1 9-11V5.5L11 1.5z" stroke="#fbbf24" strokeWidth="1.8"/>
      <path d="M11 8v4" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="11" cy="15" r="1.2" fill="#fbbf24"/>
    </svg>
  ),
  age: () => (
    <svg viewBox="0 0 22 22" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="9" stroke="#fbbf24" strokeWidth="1.8"/>
      <path d="M8 11h6M11 8v6" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round"/>
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
