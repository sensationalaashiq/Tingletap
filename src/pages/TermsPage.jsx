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
const TermsHeroIcon = () => (
  <svg viewBox="0 0 28 28" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <defs><linearGradient id="tm-hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c4b5fd"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <path d="M5 2.5h14l5 5V25.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" fill="url(#tm-hg)"/>
    <path d="M19 2.5v5h5" stroke="rgba(255,255,255,.5)" strokeWidth="1.5"/>
    <path d="M8 13h12M8 17h12M8 21h7" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity=".85"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <path d="M3.5 9h11M10 5l4 4-4 4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const QuestionIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M6.5 7a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="9" cy="14" r="1" fill="currentColor"/>
  </svg>
);

const icons = {
  accept: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="tm-ic1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
      <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill="url(#tm-ic1)" opacity=".9"/>
      <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill="white" opacity=".1"/>
      <path d="M8.5 13l3 3L18 9" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  conduct: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="tm-ic2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#818cf8"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
      <circle cx="13" cy="9" r="5.5" fill="url(#tm-ic2)" opacity=".9"/>
      <circle cx="13" cy="9" r="2.8" fill="white" opacity=".55"/>
      <path d="M3.5 25c0-5.2 4.3-9.5 9.5-9.5s9.5 4.3 9.5 9.5" stroke="url(#tm-ic2)" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  content: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="tm-ic3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
      <path d="M5 2h12l5 5v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="url(#tm-ic3)" opacity=".88"/>
      <path d="M17 2v5h5" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
      <path d="M8 13h10M8 17h10M8 21h6" stroke="white" strokeWidth="1.9" strokeLinecap="round" opacity=".88"/>
    </svg>
  ),
  service: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="tm-ic4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
      <circle cx="13" cy="13" r="11" fill="url(#tm-ic4)" opacity=".88"/>
      <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
      <path d="M13 7v6.5l4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  liability: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="tm-ic5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#ef4444"/></linearGradient></defs>
      <path d="M13 2L3 6.5v5C3 18 7 23.2 13 24.5c6-1.3 10-6.5 10-13v-5L13 2z" fill="url(#tm-ic5)" opacity=".9"/>
      <path d="M13 9v5" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
      <circle cx="13" cy="17.5" r="1.6" fill="white"/>
    </svg>
  ),
  changes: () => (
    <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="tm-ic6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fb923c"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient></defs>
      <circle cx="13" cy="13" r="11" fill="url(#tm-ic6)" opacity=".15"/>
      <path d="M5 13A8 8 0 0 1 20 8M21 13a8 8 0 0 1-15 5" stroke="url(#tm-ic6)" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M20 4v4h4M6 22v-4H2" stroke="url(#tm-ic6)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const sections = [
  { icon: 'accept', title: 'Acceptance of Terms', text: 'By accessing and using TingleTap, you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please discontinue use of our service immediately.' },
  { icon: 'conduct', title: 'User Conduct', text: 'Users must behave respectfully at all times. Harassment, bullying, spam, hate speech, or sharing inappropriate content is strictly prohibited and will result in account suspension or permanent termination.' },
  { icon: 'content', title: 'Content Guidelines', text: 'All content shared on TingleTap must be appropriate for a diverse community. Illegal, offensive, or harmful content is strictly prohibited. Users retain ownership of their content but grant TingleTap a license to display it.' },
  { icon: 'service', title: 'Service Availability', text: 'We strive for 99.9% uptime but cannot guarantee uninterrupted service. Maintenance windows, updates, and unforeseen events may cause temporary unavailability. We will notify users of planned downtime.' },
  { icon: 'liability', title: 'Limitation of Liability', text: 'TingleTap is provided "as is" without any warranties, express or implied. We are not liable for any direct, indirect, incidental, or consequential damages arising from your use of our service.' },
  { icon: 'changes', title: 'Changes to Terms', text: 'We may update these terms periodically to reflect changes in our services or legal requirements. Continued use of TingleTap after changes constitutes acceptance of the updated terms. Material changes will be announced in-app.' },
];

const TermsPage = () => {
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
              <span className="lp-brand-sub">Terms of Service</span>
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
          <div className="lp-hero-icon"><TermsHeroIcon /></div>
          <h1 className="lp-hero-title">Terms of Service</h1>
          <p className="lp-hero-sub">Please read these terms carefully before using TingleTap. Your use of our platform signifies your agreement to these terms.</p>
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
            <ArrowRightIcon /><span>I Accept — Join Now</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => navigate('/contact')}>
            <QuestionIcon /><span>Questions?</span>
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

export default TermsPage;
