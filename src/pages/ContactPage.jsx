import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import { pt } from '../utils/premiumToast';
import PremiumCopyright from '../components/PremiumCopyright';
import './LandingPage.css';
import './ContactPage.css';
import SEO from '../seo/SEO';
import { ContactPageSchema, BreadcrumbSchema } from '../seo/StructuredData';
import { PAGES, SITE } from '../seo/seoConfig';

/* ── Icons ─────────────────────────────────────────────────────────────── */
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
const PersonIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none">
    <circle cx="9" cy="5.5" r="3" stroke="#8b5cf6" strokeWidth="1.8"/>
    <path d="M2.5 16c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const MailFieldIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none">
    <rect x="2" y="4" width="14" height="10" rx="2" stroke="#6366f1" strokeWidth="1.8"/>
    <path d="M2.5 6l6.5 4.5L15.5 6" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const ListIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none">
    <path d="M3 5h12M3 9h12M3 13h8" stroke="#a78bfa" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>
);
const MessageIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none">
    <rect x="2" y="2" width="14" height="11" rx="3" stroke="#8b5cf6" strokeWidth="1.8"/>
    <path d="M5 14l-1.5 3M13 14l1.5 3" stroke="#8b5cf6" strokeWidth="1.6" strokeLinecap="round" opacity=".5"/>
    <path d="M5.5 7h7M5.5 10h4.5" stroke="#8b5cf6" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 18 18" width="17" height="17" fill="none">
    <path d="M2.5 9l13-6L10 16.5l-2-6-5.5-1.5z" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="rgba(255,255,255,0.15)"/>
    <path d="M8 10.5l7.5-7.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/>
  </svg>
);
const SupportTeamIcon = () => (
  <svg viewBox="0 0 22 22" width="20" height="20" fill="none">
    <circle cx="8" cy="7" r="3.2" stroke="white" strokeWidth="1.8"/>
    <path d="M2 19c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="16" cy="9" r="2.3" stroke="white" strokeWidth="1.6" opacity=".7"/>
    <path d="M16 13.5c1.94 0 3.5 1.57 3.5 3.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/>
  </svg>
);
const AdminIcon = () => (
  <svg viewBox="0 0 22 22" width="20" height="20" fill="none">
    <path d="M11 2L3 6.5v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11v-5L11 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M8 11l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ChevronDown = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none">
    <path d="M4.5 7l4.5 4.5 4.5-4.5" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ArrowRight = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
    <path d="M3 8h10M9.5 5l3.5 3-3.5 3" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
/* Support channel icons */
const EmailIcon24 = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="3" stroke="white" strokeWidth="1.9"/>
    <path d="M2 8l10 7 10-7" stroke="white" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>
);
const ChatBubbleIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="white" strokeWidth="1.9" strokeLinejoin="round" fill="rgba(255,255,255,0.12)"/>
    <path d="M8 10h8M8 13.5h5" stroke="white" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);
const ClockIcon24 = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <circle cx="12" cy="12" r="9.5" stroke="white" strokeWidth="1.9"/>
    <path d="M12 6.5v6l4 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const GlobeIcon24 = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <circle cx="12" cy="12" r="9.5" stroke="white" strokeWidth="1.9"/>
    <path d="M2.5 12h19M12 2.5C9.5 5 8 8.5 8 12s1.5 7 4 9.5M12 2.5C14.5 5 16 8.5 16 12s-1.5 7-4 9.5" stroke="white" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);
const FAQNavIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
    <circle cx="10" cy="10" r="8.5" stroke="#6366f1" strokeWidth="1.8"/>
    <path d="M7.5 7.5a2.5 2.5 0 114.5 1.5c-.5.5-2 1-2 2.5" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="10" cy="14.5" r="1" fill="#6366f1"/>
  </svg>
);
const PrivacyNavIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
    <path d="M10 2L3 5.5v4.5C3 14.5 6.5 18 10 19.5 13.5 18 17 14.5 17 10V5.5L10 2z" stroke="#10b981" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M7 10.5l2 2 4-4" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TermsNavIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
    <rect x="3" y="2" width="14" height="16" rx="2.5" stroke="#f59e0b" strokeWidth="1.8"/>
    <path d="M6.5 7h7M6.5 10.5h7M6.5 14h4.5" stroke="#f59e0b" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);
const AboutNavIcon = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
    <circle cx="10" cy="10" r="8.5" stroke="#f43f5e" strokeWidth="1.8"/>
    <path d="M10 9.5v5" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="10" cy="6.5" r="1" fill="#f43f5e"/>
  </svg>
);

/* ── Data ──────────────────────────────────────────────────────────────── */
const SUBJECTS = [
  { value: 'technical',    label: 'Technical Support',     color: '#6366f1' },
  { value: 'account',      label: 'Account Issues',         color: '#8b5cf6' },
  { value: 'report',       label: 'Report User / Content',  color: '#ef4444' },
  { value: 'verification', label: 'Badge Verification',     color: '#f59e0b' },
  { value: 'billing',      label: 'Premium Features',       color: '#10b981' },
  { value: 'suggestion',   label: 'Feature Request',        color: '#06b6d4' },
  { value: 'bug',          label: 'Bug Report',             color: '#f97316' },
  { value: 'general',      label: 'General Inquiry',        color: '#a78bfa' },
];

const CHANNELS = [
  {
    icon: <EmailIcon24/>,
    gradient: 'linear-gradient(135deg,#f97316,#ef4444)',
    title: 'Email Support',
    desc: 'support@tingletap.com',
    badge: '2–4 hr reply',
    badgeGradient: 'linear-gradient(135deg,#f97316,#ef4444)',
  },
  {
    icon: <ChatBubbleIcon/>,
    gradient: 'linear-gradient(135deg,#10b981,#059669)',
    title: 'In-App Chat',
    desc: 'Direct message in app',
    badge: 'Instant',
    badgeGradient: 'linear-gradient(135deg,#10b981,#059669)',
  },
  {
    icon: <ClockIcon24/>,
    gradient: 'linear-gradient(135deg,#3b82f6,#6366f1)',
    title: 'Response Time',
    desc: 'Mon–Sun, 9AM–11PM IST',
    badge: '< 4 hours',
    badgeGradient: 'linear-gradient(135deg,#3b82f6,#6366f1)',
  },
  {
    icon: <GlobeIcon24/>,
    gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
    title: 'Languages',
    desc: 'English & Hindi supported',
    badge: '24/7',
    badgeGradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
  },
];

const QUICK_LINKS = [
  { label: 'Frequently Asked Questions', icon: <FAQNavIcon/>, iconBg: 'rgba(99,102,241,0.12)', path: '/faq' },
  { label: 'Privacy Policy',             icon: <PrivacyNavIcon/>, iconBg: 'rgba(16,185,129,0.12)', path: '/privacy' },
  { label: 'Terms of Service',           icon: <TermsNavIcon/>, iconBg: 'rgba(245,158,11,0.12)', path: '/terms' },
  { label: 'About TingleTap',            icon: <AboutNavIcon/>, iconBg: 'rgba(244,63,94,0.12)', path: '/about' },
];

/* ── Component ─────────────────────────────────────────────────────────── */
const ContactPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', route: 'support', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSending(true);
    const subjectObj = SUBJECTS.find(s => s.value === form.subject);
    const subjectLabel = subjectObj?.label || form.subject || 'General Inquiry';
    try {
      const res = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, subject: subjectLabel, message: form.message, route: form.route }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        pt.success('Message sent! We will respond within 2–4 hours.');
        setForm({ name: '', email: '', route: 'support', subject: '', message: '' });
      } else {
        pt.error(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      pt.error('Failed to send. Please check your connection and try again.');
    }
    setSending(false);
  };

  return (
    <div className="lp-root lp-lpage">
      <SEO
        title={PAGES.contact.title}
        description={PAGES.contact.description}
        keywords={PAGES.contact.keywords}
        canonical={PAGES.contact.canonical}
        robots={PAGES.contact.robots}
        ogType={PAGES.contact.ogType}
      />
      <ContactPageSchema />
      <BreadcrumbSchema crumbs={[
        { name: 'Home', url: SITE.url },
        { name: 'Contact', url: PAGES.contact.canonical },
      ]} />

      <div className="lp-bg" aria-hidden="true">
        <div className="lp-orb lp-orb-1"/><div className="lp-orb lp-orb-2"/><div className="lp-orb lp-orb-3"/>
      </div>

      {/* ── Header ── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
            <img src="/tingletap-logo.jpg" alt="TingleTap" className="lp-logo"/>
            <div className="lp-brand-text">
              <span className="lp-brand-name">TingleTap</span>
              <span className="lp-brand-sub">Contact Us</span>
            </div>
          </div>
          <nav className="lp-nav">
            <button className="lp-nav-ghost" onClick={() => navigate('/')}><BackIcon /><span>Back Home</span></button>
            <button className="lp-nav-solid" onClick={() => navigate('/login')}><LoginIcon /><span>Login</span></button>
          </nav>
        </div>
      </header>

      <main className="lp-main">
        {/* ── Hero ── */}
        <div className="lp-hero">
          <div className="lp-hero-icon"><ContactHeroIcon /></div>
          <h1 className="lp-hero-title">Get In Touch</h1>
          <p className="lp-hero-sub">
            Our expert support team is here for you — every day, every hour.
            We respond to every message, guaranteed.
          </p>
          <div className="ct-stats-strip">
            <div className="ct-stat-chip">
              <span className="ct-stat-dot" style={{background:'linear-gradient(135deg,#10b981,#059669)'}}/>
              24/7 Available
            </div>
            <div className="ct-stat-chip">
              <span className="ct-stat-dot" style={{background:'linear-gradient(135deg,#3b82f6,#6366f1)'}}/>
              2–4 Hr Response
            </div>
            <div className="ct-stat-chip">
              <span className="ct-stat-dot" style={{background:'linear-gradient(135deg,#8b5cf6,#ec4899)'}}/>
              Hindi &amp; English
            </div>
            <div className="ct-stat-chip">
              <span className="ct-stat-dot" style={{background:'linear-gradient(135deg,#f97316,#ef4444)'}}/>
              100% Replied
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="ct-grid">

          {/* LEFT: Form */}
          <div className="ct-card">
            <div className="ct-form-header">
              <div className="ct-form-header-icon">
                <ContactHeroIcon />
              </div>
              <div className="ct-form-header-text">
                <h2>Send Us a Message</h2>
                <p>Fill in the form below — we'll reply to your email shortly</p>
              </div>
            </div>

            <div className="ct-form-body">
              <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:16}}>

                {/* Name */}
                <div className="ct-field-group">
                  <label className="ct-label">Your Name</label>
                  <div className="ct-field-wrap">
                    <span className="ct-field-icon-wrap"><PersonIcon/></span>
                    <input
                      className="ct-input"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="ct-field-group">
                  <label className="ct-label">Email Address</label>
                  <div className="ct-field-wrap">
                    <span className="ct-field-icon-wrap"><MailFieldIcon/></span>
                    <input
                      className="ct-input"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Route selector */}
                <div className="ct-field-group">
                  <label className="ct-label">Send To</label>
                  <div className="ct-route-tabs">
                    <button
                      type="button"
                      className={`ct-route-tab${form.route === 'support' ? ' active' : ''}`}
                      onClick={() => setForm(p => ({ ...p, route: 'support' }))}
                    >
                      <div className="ct-route-tab-icon" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                        <SupportTeamIcon/>
                      </div>
                      <span>Support Team</span>
                      <small>support@tingletap.com</small>
                    </button>
                    <button
                      type="button"
                      className={`ct-route-tab${form.route === 'administration' ? ' active' : ''}`}
                      onClick={() => setForm(p => ({ ...p, route: 'administration' }))}
                    >
                      <div className="ct-route-tab-icon" style={{background:'linear-gradient(135deg,#7c3aed,#a855f7)'}}>
                        <AdminIcon/>
                      </div>
                      <span>Administration</span>
                      <small>admin@tingletap.com</small>
                    </button>
                  </div>
                </div>

                {/* Issue type */}
                <div className="ct-field-group">
                  <label className="ct-label">Issue Type</label>
                  <div className="ct-field-wrap ct-select-wrap">
                    <span className="ct-field-icon-wrap"><ListIcon/></span>
                    <select
                      className="ct-input"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select issue type…</option>
                      {SUBJECTS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <span className="ct-select-chevron"><ChevronDown/></span>
                  </div>
                </div>

                {/* Message */}
                <div className="ct-field-group">
                  <label className="ct-label">Your Message</label>
                  <div className="ct-field-wrap" style={{alignItems:'flex-start'}}>
                    <span className="ct-field-icon-textarea"><MessageIcon/></span>
                    <textarea
                      className="ct-input"
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Describe your issue in detail. The more context you provide, the faster we can help you."
                      required
                      rows={5}
                      maxLength={2000}
                    />
                  </div>
                  <div className="ct-char-count">{form.message.length}/2000</div>
                </div>

                {/* Submit */}
                <button type="submit" className="ct-submit-btn" disabled={sending}>
                  <SendIcon/>
                  <span>{sending ? 'Sending your message…' : 'Send Message'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: Info */}
          <div className="ct-info-col">
            {/* Channel cards */}
            <div className="ct-channel-grid">
              {CHANNELS.map((ch, i) => (
                <div className="ct-channel-card" key={i}>
                  <div className="ct-channel-icon-circle" style={{background: ch.gradient}}>
                    {ch.icon}
                  </div>
                  <div>
                    <div className="ct-channel-title">{ch.title}</div>
                    <div className="ct-channel-desc">{ch.desc}</div>
                  </div>
                  <div className="ct-channel-badge" style={{background: ch.badgeGradient}}>
                    {ch.badge}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div className="ct-links-card">
              <div className="ct-links-title">Quick Links</div>
              <div className="ct-links-list">
                {QUICK_LINKS.map((lk, i) => (
                  <button key={i} className="ct-link-btn" onClick={() => navigate(lk.path)}>
                    <div className="ct-link-icon-wrap" style={{background: lk.iconBg}}>
                      {lk.icon}
                    </div>
                    <span>{lk.label}</span>
                    <span className="ct-link-arrow"><ArrowRight/></span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tip card */}
            <div className="ct-tip-card">
              <div className="ct-tip-icon" aria-hidden="true">💡</div>
              <div>
                <div className="ct-tip-title">Pro Tip — Check FAQ First</div>
                <div className="ct-tip-text">
                  Most questions about chat rooms, coins, badges, voice calls, and account
                  settings are already answered in our{' '}
                  <span
                    onClick={() => navigate('/faq')}
                    style={{color:'#7c3aed',fontWeight:900,cursor:'pointer',textDecoration:'underline'}}
                  >
                    FAQ page
                  </span>
                  {' '}— you'll get an instant answer without waiting.
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
