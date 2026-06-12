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
const StarIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <defs><linearGradient id="ab-sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c4b5fd"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <path d="M14 2l3 8.5L26 11l-6.5 6 2 9L14 22l-7.5 4 2-9L2 11l9-0.5L14 2z" fill="url(#ab-sg)"/>
  </svg>
);
const RocketIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <defs><linearGradient id="ab-rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
    <path d="M14 3C14 3 20 5 22 13c0 0 2 1.5 2 4l-4-1c0 0-1 3-3 5l-3-3-3 3c-2-2-3-5-3-5l-4 1c0-2.5 2-4 2-4C8 5 14 3 14 3z" fill="url(#ab-rg)"/>
    <circle cx="14" cy="11" r="2.5" fill="white" opacity=".9"/>
    <path d="M10 22l-3 3M18 22l3 3" stroke="url(#ab-rg)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <defs><linearGradient id="ab-shg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
    <path d="M14 2.5L4 7v5.5C4 18.3 8.3 23.5 14 25c5.7-1.5 10-6.7 10-12.5V7L14 2.5z" fill="url(#ab-shg)"/>
    <path d="M9.5 13l3 3L19 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const HeartIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <defs><linearGradient id="ab-hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f9a8d4"/><stop offset="100%" stopColor="#ec4899"/></linearGradient></defs>
    <path d="M14 23S4 16.5 4 9.5a6 6 0 0 1 10-4.5A6 6 0 0 1 24 9.5C24 16.5 14 23 14 23z" fill="url(#ab-hg)"/>
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <defs><linearGradient id="ab-gg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
    <circle cx="14" cy="14" r="11" stroke="url(#ab-gg)" strokeWidth="2.2"/>
    <path d="M3 14h22M14 3c3.3 0 6 5 6 11s-2.7 11-6 11-6-5-6-11 2.7-11 6-11z" stroke="url(#ab-gg)" strokeWidth="1.8"/>
  </svg>
);
const ChatBubbleIcon = () => (
  <svg viewBox="0 0 28 28" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <defs><linearGradient id="ab-cg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <rect x="2" y="3" width="22" height="17" rx="5" fill="url(#ab-cg)"/>
    <path d="M2 16l4.5 6" stroke="url(#ab-cg)" strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx="9" cy="11.5" r="1.8" fill="white" opacity=".9"/>
    <circle cx="14" cy="11.5" r="1.8" fill="white" opacity=".9"/>
    <circle cx="19" cy="11.5" r="1.8" fill="white" opacity=".9"/>
  </svg>
);
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

const AboutPage = () => {
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
              <span className="lp-brand-sub">About Us</span>
            </div>
          </div>
          <nav className="lp-nav">
            <button className="lp-nav-ghost" onClick={() => navigate('/')}>
              <BackIcon /><span>Back Home</span>
            </button>
            <button className="lp-nav-solid" onClick={() => navigate('/login')}>
              <LoginIcon /><span>Login</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="lp-main">
        <div className="lp-hero">
          <div className="lp-hero-icon"><GlobeIcon /></div>
          <h1 className="lp-hero-title">About TingleTap</h1>
          <p className="lp-hero-sub">India's premier real-time chat platform — connecting people across the nation through premium conversations, voice, and shared experiences.</p>
        </div>

        <div className="lp-cards-grid">
          <div className="lp-grid-card">
            <div className="lp-grid-card-icon"><StarIcon /></div>
            <div className="lp-grid-card-title">Our Mission</div>
            <div className="lp-grid-card-text">To create a safe, vibrant, and inclusive chat environment where people from all over India can connect, share experiences, and build meaningful relationships.</div>
          </div>
          <div className="lp-grid-card">
            <div className="lp-grid-card-icon"><RocketIcon /></div>
            <div className="lp-grid-card-title">Our Vision</div>
            <div className="lp-grid-card-text">To become India's most trusted and feature-rich chat platform, fostering genuine connections and providing advanced communication tools for modern users.</div>
          </div>
          <div className="lp-grid-card">
            <div className="lp-grid-card-icon"><ShieldIcon /></div>
            <div className="lp-grid-card-title">Our Values</div>
            <div className="lp-grid-card-text">Safety, Privacy, Innovation, and Community. We prioritize user security while delivering cutting-edge features that enhance your chat experience.</div>
          </div>
        </div>

        <div className="lp-card">
          <div className="lp-section">
            <div className="lp-section-item">
              <div className="lp-section-icon"><ChatBubbleIcon /></div>
              <div className="lp-section-content">
                <div className="lp-section-title">What Makes Us Different</div>
                <div className="lp-section-text">TingleTap combines real-time messaging, voice messages, YouTube sharing, private encrypted conversations, and live radio — all in one premium platform designed specifically for the Indian community.</div>
              </div>
            </div>
            <div className="lp-section-item">
              <div className="lp-section-icon"><HeartIcon /></div>
              <div className="lp-section-content">
                <div className="lp-section-title">Built with Love for India</div>
                <div className="lp-section-text">Every feature is thoughtfully crafted keeping Indian culture, languages, and social dynamics in mind. From regional chat rooms to Hindi voice support — TingleTap feels like home.</div>
              </div>
            </div>
            <div className="lp-section-item">
              <div className="lp-section-icon"><ShieldIcon /></div>
              <div className="lp-section-content">
                <div className="lp-section-title">Safety First</div>
                <div className="lp-section-text">Advanced moderation tools, real-time spam detection, VPN protection, device fingerprinting, and a dedicated support team ensure TingleTap remains a safe space for everyone.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-cta-row">
          <button className="lp-btn-primary" onClick={() => navigate('/rooms')}>
            <ArrowRightIcon /><span>Join Our Community</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => navigate('/contact')}>
            <MailIcon /><span>Contact Us</span>
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

export default AboutPage;
