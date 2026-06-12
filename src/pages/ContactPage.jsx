import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PremiumCopyright from '../components/PremiumCopyright';
import './LandingPage.css';

const BackIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M13 9H5M9 5.5l-4 3.5 4 3.5" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LoginIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M11 5.5l4 3.5-4 3.5M15 9H7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.5 3H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity=".7"/>
  </svg>
);
const ContactHeroIcon = () => (
  <svg viewBox="0 0 30 30" width="30" height="30" fill="none" style={{display:'block'}}>
    <rect x="2" y="6" width="26" height="18" rx="3.5" stroke="white" strokeWidth="2.2"/>
    <path d="M2 10.5l13 8.5 13-8.5" stroke="white" strokeWidth="2" strokeLinecap="round" opacity=".8"/>
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 18 18" width="17" height="17" fill="none" style={{display:'block',flexShrink:0}}>
    <rect x="2" y="4" width="14" height="10" rx="2" stroke="#8b5cf6" strokeWidth="1.9"/>
    <path d="M2.5 6l6.5 4.5L15.5 6" stroke="#8b5cf6" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>
);
const ChatIcon = () => (
  <svg viewBox="0 0 18 18" width="17" height="17" fill="none" style={{display:'block',flexShrink:0}}>
    <rect x="2" y="2" width="14" height="11" rx="3" stroke="#8b5cf6" strokeWidth="1.9"/>
    <path d="M5.5 8h7M5.5 11h4" stroke="#8b5cf6" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M4 13l-1.5 3" stroke="#8b5cf6" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 18 18" width="17" height="17" fill="none" style={{display:'block',flexShrink:0}}>
    <circle cx="9" cy="9" r="7.5" stroke="#8b5cf6" strokeWidth="1.9"/>
    <path d="M9 5v4.5l3 2.5" stroke="#8b5cf6" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>
);
const LinkIcon = () => (
  <svg viewBox="0 0 18 18" width="17" height="17" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M7 10a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66L8.5 2.84" stroke="#8b5cf6" strokeWidth="1.9" strokeLinecap="round"/>
    <path d="M11 8a4 4 0 0 0-5.66 0L2.51 10.83a4 4 0 0 0 5.66 5.66L9.5 15.16" stroke="#8b5cf6" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M2.5 9l13-6L10 16.5l-2-6-5.5-1.5z" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 10.5l7.5-7.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity=".6"/>
  </svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M4 9h10M10.5 5.5L14 9l-3.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
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
            <img src="/tingletap-logo.jpg" alt="TingleTap" className="lp-logo"/>
            <div className="lp-brand-text">
              <span className="lp-brand-name">TingleTap</span>
              <span className="lp-brand-sub">Contact</span>
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
