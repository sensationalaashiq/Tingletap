import React, { useState } from 'react';
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
const ContactHeroIcon = () => (
  <svg viewBox="0 0 28 28" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block'}}>
    <defs><linearGradient id="ct-hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
    <rect x="2" y="5" width="24" height="18" rx="4" fill="url(#ct-hg)" opacity=".2" stroke="url(#ct-hg)" strokeWidth="1.8"/>
    <path d="M2 9l12 8 12-8" stroke="url(#ct-hg)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 18 18" width="17" height="17" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <rect x="2" y="4" width="14" height="10" rx="2" stroke="#a78bfa" strokeWidth="1.8"/>
    <path d="M2 6l7 5 7-5" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const ChatIcon = () => (
  <svg viewBox="0 0 18 18" width="17" height="17" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <rect x="2" y="2" width="14" height="11" rx="3" stroke="#a78bfa" strokeWidth="1.8"/>
    <path d="M2 10l3 4" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 18 18" width="17" height="17" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <circle cx="9" cy="9" r="7.5" stroke="#a78bfa" strokeWidth="1.8"/>
    <path d="M9 5v4.5l2.5 2.5" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const LinkIcon = () => (
  <svg viewBox="0 0 18 18" width="17" height="17" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <path d="M9 4l-2-2a3.5 3.5 0 0 0-5 5l2.5 2.5M9 14l2 2a3.5 3.5 0 0 0 5-5L13.5 8.5" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M6 12l6-6" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <path d="M2 9l14-6.5L9.5 16 8 10.5 2 9z" fill="currentColor" opacity=".9"/>
  </svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
    <path d="M3.5 9h11M10 5l4 4-4 4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ContactPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = e => {
    e.preventDefault();
    alert('Thank you for contacting TingleTap! Our support team will respond within 2-4 hours.');
    setForm({ name: '', email: '', subject: '', message: '' });
  };

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
              <span className="lp-brand-sub">Contact & Support</span>
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
          <div className="lp-hero-icon"><ContactHeroIcon /></div>
          <h1 className="lp-hero-title">Contact Support</h1>
          <p className="lp-hero-sub">Get help from our expert support team. We respond within 2-4 hours and are available 24/7 for urgent issues.</p>
        </div>

        <div className="lp-contact-grid">
          <div className="lp-form-card">
            <div className="lp-section-title" style={{marginBottom:'20px',fontSize:'17px'}}>Send a Message</div>
            <form className="lp-form" onSubmit={handleSubmit}>
              <div className="lp-form-group">
                <label className="lp-label">Your Name</label>
                <input className="lp-input" name="name" value={form.name} onChange={handleChange} placeholder="Enter your name" required/>
              </div>
              <div className="lp-form-group">
                <label className="lp-label">Email Address</label>
                <input className="lp-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="your@email.com" required/>
              </div>
              <div className="lp-form-group">
                <label className="lp-label">Issue Type</label>
                <select className="lp-input" name="subject" value={form.subject} onChange={handleChange} required>
                  <option value="">Select issue type…</option>
                  <option value="technical">Technical Support</option>
                  <option value="account">Account Issues</option>
                  <option value="report">Report User / Content</option>
                  <option value="verification">Badge Verification</option>
                  <option value="billing">Premium Features</option>
                  <option value="suggestion">Feature Request</option>
                  <option value="bug">Bug Report</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>
              <div className="lp-form-group">
                <label className="lp-label">Message</label>
                <textarea className="lp-input" name="message" value={form.message} onChange={handleChange} placeholder="Describe your issue in detail…" required rows={4} style={{resize:'vertical',minHeight:'90px'}}/>
              </div>
              <button type="submit" className="lp-submit-btn">
                <SendIcon /><span>Send Message</span>
              </button>
            </form>
          </div>

          <div className="lp-support-card">
            <div className="lp-section-title" style={{marginBottom:'18px',fontSize:'17px'}}>Support Channels</div>
            <div className="lp-support-items">
              <div className="lp-support-item">
                <div className="lp-support-header"><MailIcon /><span className="lp-support-name">Email Support</span></div>
                <div className="lp-support-text">support@tingletap.com<br/>Response: 2–4 hours</div>
              </div>
              <div className="lp-support-item">
                <div className="lp-support-header"><ChatIcon /><span className="lp-support-name">Live Chat</span></div>
                <div className="lp-support-text">Available in-app<br/>Response: Instant</div>
              </div>
              <div className="lp-support-item">
                <div className="lp-support-header"><ClockIcon /><span className="lp-support-name">Support Hours</span></div>
                <div className="lp-support-text">24/7 Emergency Support<br/>Mon–Sun: 9AM–11PM IST</div>
              </div>
              <div className="lp-support-item">
                <div className="lp-support-header"><LinkIcon /><span className="lp-support-name">Quick Links</span></div>
                <div className="lp-support-links">
                  <button className="lp-support-link" onClick={() => navigate('/faq')}><ArrowIcon /><span>Check FAQ</span></button>
                  <button className="lp-support-link" onClick={() => navigate('/privacy')}><ArrowIcon /><span>Privacy Policy</span></button>
                  <button className="lp-support-link" onClick={() => navigate('/terms')}><ArrowIcon /><span>Terms of Service</span></button>
                </div>
              </div>
            </div>
          </div>
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

export default ContactPage;
