
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const FAQPage = () => {
  const navigate = useNavigate();
  const [activeQuestion, setActiveQuestion] = useState(null);

  const faqData = [
    {
      question: "What is TingleTap?",
      answer: "TingleTap is India's premium chat platform featuring voice messages, YouTube sharing, real-time messaging, private conversations, gender badges, profile customization, and radio streaming - all designed for meaningful connections."
    },
    {
      question: "Is TingleTap free to use?",
      answer: "Yes! TingleTap is completely free with unlimited access to all chat rooms, voice messaging, YouTube sharing, private messages, profile customization, and radio features. Premium badges available for verified users."
    },
    {
      question: "What unique features does TingleTap offer?",
      answer: "• Voice Messages with custom audio players • YouTube video sharing in chat • Real-time typing indicators • Gender verification badges • Font & theme customization • Private encrypted messaging • Live radio streaming • Sticker & GIF support • Status updates • Profile verification"
    },
    {
      question: "How do voice messages work?",
      answer: "Click the microphone icon, hold to record (up to 60 seconds), release to send. Features include playback speed control, waveform visualization, and auto-play options. Works in all public and private chats."
    },
    {
      question: "Can I share YouTube videos?",
      answer: "Yes! Use the YouTube button to search and share videos directly. Videos embed with thumbnail preview, title, and play controls. All users can watch together in real-time."
    },
    {
      question: "How secure are private messages?",
      answer: "All private messages use end-to-end encryption with Firebase security rules. Only you and your chat partner can access the conversation. Messages include read receipts and typing indicators."
    },
    {
      question: "What are gender badges?",
      answer: "Verified gender badges (♂️ Male, ♀️ Female, ⚧️ Other) help create a safer community. Verification is optional and helps other users identify genuine profiles."
    },
    {
      question: "How does profile customization work?",
      answer: "Customize your username colors, message fonts, themes (light/dark), profile pictures, status messages, and display preferences. Changes are visible across all chat rooms instantly."
    },
    {
      question: "What moderation features exist?",
      answer: "Advanced moderation includes user reporting, admin controls, automatic spam detection, ban/kick functions, content filtering, and 24/7 monitoring to ensure community safety."
    },
    {
      question: "How do I report inappropriate behavior?",
      answer: "To report a message or user: Hover over any message to see the report icon and click it directly. Select the appropriate reason (Spam, Harassment, Inappropriate Content, etc.) and submit. Our AI-powered moderation team reviews reports within minutes and takes immediate action against violations."
    },
    {
      question: "What browsers are supported?",
      answer: "TingleTap works best on Chrome, Firefox, Safari, and Edge (latest versions). Mobile browsers fully supported. PWA installation available for app-like experience."
    },
    {
      question: "How do I get verified badges?",
      answer: "Contact our support team with valid ID verification. Verified users get special badges, priority support, advanced features access, and increased trust from the community."
    }
  ];

  return (
    <div className="landing-page" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 50%, #E6E6FA 100%)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Ultra Compact Header */}
      <header className="luxury-header" style={{ padding: '0.3rem 1rem' }}>
        <div className="header-content" style={{ height: '45px' }}>
          <div className="header-brand">
            <div className="brand-logo">
              <img 
                src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" 
                alt="TingleTap" 
                className="logo-image"
                style={{ width: '32px', height: '32px' }}
              />
            </div>
            <div className="brand-text">
              <span className="brand-name" style={{ fontSize: '1.1rem' }}>TingleTap</span>
              <span className="brand-tagline" style={{ fontSize: '0.6rem' }}>FAQ & Help</span>
            </div>
          </div>

          <nav className="header-nav">
            <button 
              className="nav-btn login-btn"
              onClick={() => navigate('/')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              ← Home
            </button>
            <button 
              className="nav-btn signup-btn"
              onClick={() => navigate('/login')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Login
            </button>
          </nav>
        </div>
      </header>

      {/* Ultra Compact Content */}
      <section style={{ 
        padding: '55px 0.5rem 5px', 
        maxWidth: '1000px', 
        margin: '0 auto',
        height: 'calc(100vh - 85px)',
        overflow: 'hidden'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '0.8rem' }}>
          <h1 style={{ 
            fontFamily: 'Playfair Display, serif',
            fontSize: '1.6rem',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '0.3rem'
          }}>
            Frequently Asked Questions
          </h1>
          <p style={{ 
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0'
          }}>
            Everything you need to know about TingleTap's features
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '10px',
          padding: '0.8rem',
          height: 'calc(100% - 120px)',
          overflow: 'auto'
        }}>
          <div style={{ display: 'grid', gap: '0.4rem' }}>
            {faqData.map((item, index) => (
              <div key={index} style={{
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => setActiveQuestion(activeQuestion === index ? null : index)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ flex: 1, paddingRight: '0.5rem' }}>{item.question}</span>
                  <span style={{ fontSize: '0.9rem' }}>
                    {activeQuestion === index ? '−' : '+'}
                  </span>
                </button>
                {activeQuestion === index && (
                  <div style={{
                    padding: '0.6rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    color: 'rgba(255, 255, 255, 0.85)',
                    lineHeight: '1.4',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-line'
                  }}>
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '0.8rem' }}>
          <button
            onClick={() => navigate('/signup')}
            style={{
              padding: '0.6rem 1.5rem',
              background: 'linear-gradient(135deg, #4CAF50, #45a049)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              marginRight: '0.8rem',
              boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
              transform: 'translateY(0)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="rocketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#f0f8ff" />
                  <stop offset="100%" stopColor="#e6f3ff" />
                </linearGradient>
                <filter id="rocketGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(255,255,255,0.6)"/>
                </filter>
              </defs>
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="url(#rocketGradient)" filter="url(#rocketGlow)" />
              <path d="M8 16L9 22L11 20L13 22L14 16" fill="url(#rocketGradient)" opacity="0.8" />
              <circle cx="12" cy="9" r="2" fill="rgba(255,255,255,0.9)" />
            </svg>
            Join TingleTap
          </button>
          <button 
            className="primary-cta"
            onClick={() => navigate('/contact')}
            style={{
              padding: '0.4rem 1rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Contact Support
          </button>
        </div>
      </section>

      {/* Ultra Compact Footer */}
      <footer style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '0.5rem',
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.8rem',
          marginBottom: '0.3rem',
          flexWrap: 'wrap'
        }}>
          <button onClick={() => navigate('/about')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '0.75rem' }}>About</button>
          <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '0.75rem' }}>Privacy</button>
          <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '0.75rem' }}>Terms</button>
          <button onClick={() => navigate('/contact')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '0.75rem' }}>Contact</button>
        </div>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem', margin: 0 }}>
          © 2024 TingleTap™. All rights reserved. Made in India 🇮🇳
        </p>
      </footer>
    </div>
  );
};

export default FAQPage;
