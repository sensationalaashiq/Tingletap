import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const ContactPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for contacting TingleTap! Our support team will respond within 2-4 hours.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

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
              <span className="brand-tagline" style={{ fontSize: '0.6rem' }}>Contact & Support</span>
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
            Contact TingleTap Support
          </h1>
          <p style={{
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0'
          }}>
            Get instant help from our expert support team
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '0.8rem', height: 'calc(100% - 120px)' }}>
          {/* Contact Form */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            padding: '0.8rem',
            height: '100%',
            overflow: 'hidden'
          }}>
            <h3 style={{ color: '#ffffff', marginBottom: '0.8rem', fontSize: '0.9rem' }}>Send Message</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.5rem', height: 'calc(100% - 1.5rem)' }}>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleInputChange}
                required
                style={{
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '0.8rem'
                }}
              />
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                style={{
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '0.8rem'
                }}
              />
              <select
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
                style={{
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '0.8rem'
                }}
              >
                <option value="">Select Issue Type</option>
                <option value="technical">Technical Support</option>
                <option value="account">Account Issues</option>
                <option value="report">Report User/Content</option>
                <option value="verification">Badge Verification</option>
                <option value="billing">Premium Features</option>
                <option value="suggestion">Feature Request</option>
                <option value="bug">Bug Report</option>
                <option value="general">General Inquiry</option>
              </select>
              <textarea
                name="message"
                placeholder="Describe your issue in detail..."
                value={formData.message}
                onChange={handleInputChange}
                required
                style={{
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  resize: 'none',
                  flex: 1,
                  minHeight: '60px'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '0.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Support Information */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            padding: '0.8rem',
            height: '100%',
            overflow: 'auto'
          }}>
            <h3 style={{ color: '#ffffff', marginBottom: '0.8rem', fontSize: '0.9rem' }}>Support Channels</h3>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <div>
                <h4 style={{ color: '#ffffff', marginBottom: '0.2rem', fontSize: '0.8rem' }}>📧 Email Support</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.7rem', margin: 0 }}>
                  support@tingletap.com<br/>
                  Response: 2-4 hours
                </p>
              </div>

              <div>
                <h4 style={{ color: '#ffffff', marginBottom: '0.2rem', fontSize: '0.8rem' }}>⚡ Live Chat</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.7rem', margin: 0 }}>
                  Available in app<br/>
                  Response: Instant
                </p>
              </div>

              <div>
                <h4 style={{ color: '#ffffff', marginBottom: '0.2rem', fontSize: '0.8rem' }}>🕒 Support Hours</h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.7rem', margin: 0 }}>
                  24/7 Emergency Support<br/>
                  Mon-Sun: 9AM-11PM IST
                </p>
              </div>

              <div>
                <h4 style={{ color: '#ffffff', marginBottom: '0.2rem', fontSize: '0.8rem' }}>🚀 TingleTap Features</h4>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.3' }}>
                  • Voice Messages & Audio<br/>
                  • YouTube Video Sharing<br/>
                  • Private Encrypted Chat<br/>
                  • Gender Verification<br/>
                  • Font & Theme Custom<br/>
                  • Live Radio Streaming<br/>
                  • Stickers & GIFs<br/>
                  • Profile Badges<br/>
                  • Real-time Typing<br/>
                  • Advanced Moderation
                </div>
              </div>

              <div>
                <h4 style={{ color: '#ffffff', marginBottom: '0.2rem', fontSize: '0.8rem' }}>🔗 Quick Actions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <button
                    onClick={() => navigate('/faq')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4FC3F7',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.7rem',
                      padding: 0
                    }}
                  >
                    → Check FAQ
                  </button>
                  <button
                    onClick={() => navigate('/privacy')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4FC3F7',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.7rem',
                      padding: 0
                    }}
                  >
                    → Privacy Policy
                  </button>
                  <button
                    onClick={() => navigate('/terms')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4FC3F7',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.7rem',
                      padding: 0
                    }}
                  >
                    → Terms of Service
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '0.8rem' }}>
          <button
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onClick={() => navigate('/signup')}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="joinRocketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#f0f8ff" />
                  <stop offset="100%" stopColor="#e6f3ff" />
                </linearGradient>
                <filter id="joinRocketGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(255,255,255,0.6)"/>
                </filter>
              </defs>
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="url(#joinRocketGradient)" filter="url(#joinRocketGlow)" />
              <path d="M8 16L9 22L11 20L13 22L14 16" fill="url(#joinRocketGradient)" opacity="0.8" />
              <circle cx="12" cy="9" r="2" fill="rgba(255,255,255,0.9)" />
            </svg>
            Join TingleTap
          </button>
          <button
            className="secondary-cta"
            onClick={() => navigate('/faq')}
            style={{
              padding: '0.4rem 1.2rem',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            View FAQ
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
          <button onClick={() => navigate('/faq')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '0.75rem' }}>FAQ</button>
        </div>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem', margin: 0 }}>
          © 2024 TingleTap™. All rights reserved. Made in India 🇮🇳
        </p>
      </footer>
    </div>
  );
};

export default ContactPage;