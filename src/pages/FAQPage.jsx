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
const FAQHeroIcon = () => (
  <svg viewBox="0 0 30 30" width="30" height="30" fill="none" style={{display:'block'}}>
    <circle cx="15" cy="15" r="12" stroke="white" strokeWidth="2.2"/>
    <path d="M11.5 11.5a3.5 3.5 0 0 1 7 .5c0 2.5-3.5 3.2-3.5 6" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx="15" cy="22" r="1.6" fill="white"/>
  </svg>
);
const ChevronDown = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M4 6l4 4 4-4" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M4 9h10M10.5 5.5L14 9l-3.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SupportIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <circle cx="9" cy="9" r="7.5" stroke="#4f46e5" strokeWidth="1.9"/>
    <path d="M6.5 8.5a2.5 2.5 0 0 1 5 .5c0 1.6-2.5 2.4-2.5 3.5" stroke="#4f46e5" strokeWidth="1.9" strokeLinecap="round"/>
    <circle cx="9" cy="14.5" r="1.1" fill="#4f46e5"/>
  </svg>
);

const faqData = [
  { question: "What is TingleTap?", answer: "TingleTap is India's premium chat platform featuring voice messages, YouTube sharing, real-time messaging, private conversations, gender badges, profile customization, and radio streaming — all designed for meaningful connections." },
  { question: "Is TingleTap free to use?", answer: "Yes! TingleTap is completely free with unlimited access to all chat rooms, voice messaging, YouTube sharing, private messages, profile customization, and radio features. Premium badges available for verified users." },
  { question: "What unique features does TingleTap offer?", answer: "Voice Messages with custom audio players\nYouTube video sharing in chat\nReal-time typing indicators\nGender verification badges\nFont & theme customization\nPrivate encrypted messaging\nLive radio streaming\nSticker & GIF support\nStatus updates\nProfile verification" },
  { question: "How do voice messages work?", answer: "Click the microphone icon, hold to record (up to 60 seconds), release to send. Features include playback speed control, waveform visualization, and auto-play options. Works in all public and private chats." },
  { question: "Can I share YouTube videos?", answer: "Yes! Use the YouTube button to search and share videos directly in chat. Videos embed with thumbnail preview, title, and play controls. All users in the room can enjoy them together in real-time." },
  { question: "How secure are private messages?", answer: "All private messages use end-to-end encryption backed by Firebase security rules. Only you and your chat partner can access the conversation. Messages include read receipts and real-time typing indicators." },
  { question: "What are gender badges?", answer: "Verified gender badges help create a safer, more transparent community. Verification is optional and helps other users identify genuine profiles. Badges are displayed on your profile and in chat messages." },
  { question: "How does profile customization work?", answer: "Customize your username colors, message fonts, themes (light/dark), profile pictures, status messages, and display preferences. Changes are applied instantly across all chat rooms." },
  { question: "What moderation features exist?", answer: "Advanced moderation includes user reporting, admin controls, automatic spam detection, ban/kick functions, content filtering, device fingerprinting, and 24/7 monitoring to ensure community safety." },
  { question: "How do I report inappropriate behavior?", answer: "Hover over any message to see the report icon and click it directly. Select the appropriate reason (Spam, Harassment, Inappropriate Content, etc.) and submit. Our moderation team reviews reports promptly and takes immediate action against violations." },
  { question: "What browsers are supported?", answer: "TingleTap works best on Chrome, Firefox, Safari, and Edge (latest versions). Mobile browsers are fully supported. PWA installation is available for an app-like experience on your device." },
  { question: "How do I get verified badges?", answer: "Contact our support team through the Contact page. Verified users get special badges, priority support, advanced features access, and increased trust from the community." },
];

const FAQPage = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState(null);

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
              <span className="lp-brand-sub">FAQ & Help</span>
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
          <div className="lp-hero-icon"><FAQHeroIcon /></div>
          <h1 className="lp-hero-title">Frequently Asked Questions</h1>
          <p className="lp-hero-sub">Everything you need to know about TingleTap's features, security, and community. Click any question to expand the answer.</p>
        </div>

        <div className="lp-card">
          <div className="lp-faq-list">
            {faqData.map((item, i) => (
              <div key={i} className={`lp-faq-item${active === i ? ' lp-faq-open' : ''}`}>
                <button
                  className="lp-faq-btn"
                  onClick={() => setActive(active === i ? null : i)}
                >
                  <span className="lp-faq-q">{item.question}</span>
                  <span className={`lp-faq-chevron${active === i ? ' lp-faq-open' : ''}`}>
                    <ChevronDown />
                  </span>
                </button>
                {active === i && (
                  <div className="lp-faq-answer">{item.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lp-cta-row">
          <button className="lp-btn-primary" onClick={() => navigate('/signup')}>
            <ArrowRightIcon /><span>Join TingleTap Free</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => navigate('/contact')}>
            <SupportIcon /><span>Contact Support</span>
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

export default FAQPage;
