
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 50%, #E6E6FA 100%)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Compact Header */}
      <header className="luxury-header" style={{ padding: '0.5rem 1rem' }}>
        <div className="header-content" style={{ height: '50px' }}>
          <div className="header-brand">
            <div className="brand-logo">
              <img 
                src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" 
                alt="TingleTap" 
                className="logo-image"
                style={{ width: '35px', height: '35px' }}
              />
            </div>
            <div className="brand-text">
              <span className="brand-name" style={{ fontSize: '1.2rem' }}>TingleTap</span>
              <span className="brand-tagline" style={{ fontSize: '0.65rem' }}>Privacy Policy</span>
            </div>
          </div>

          <nav className="header-nav">
            <button 
              className="nav-btn login-btn"
              onClick={() => navigate('/')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <span>← Back Home</span>
            </button>
            <button 
              className="nav-btn signup-btn"
              onClick={() => navigate('/login')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <span>Login</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Compact Content Section */}
      <section style={{ 
        padding: '80px 1rem 20px', 
        maxWidth: '1000px', 
        margin: '0 auto',
        minHeight: 'calc(100vh - 140px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontFamily: 'Playfair Display, serif',
            fontSize: '2.5rem',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '1rem'
          }}>
            Privacy Policy
          </h1>
          <p style={{ 
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Your privacy and data security are our top priorities
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Information We Collect</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                We collect minimal information necessary for service functionality: email address, display name, profile picture, chat messages, and basic usage analytics.
              </p>
            </div>

            <div>
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem', fontSize: '1.2rem' }}>How We Use Your Data</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                Your data is used solely to provide and improve our chat services. We never sell personal information to third parties or use it for advertising purposes.
              </p>
            </div>

            <div>
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Data Security</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                All data is encrypted in transit and at rest. Private messages use end-to-end encryption. We implement industry-standard security measures to protect your information.
              </p>
            </div>

            <div>
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Your Rights</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                You can access, modify, or delete your personal data at any time. Contact our support team for assistance with data-related requests.
              </p>
            </div>

            <div>
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Contact Us</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                For privacy-related questions or concerns, please contact us through our support channels. We're committed to addressing any privacy issues promptly.
              </p>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button 
            className="primary-cta"
            onClick={() => navigate('/signup')}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              marginRight: '1rem'
            }}
          >
            Join TingleTap
          </button>
          <button 
            className="secondary-cta"
            onClick={() => navigate('/contact')}
            style={{
              padding: '0.75rem 2rem',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Contact Support
          </button>
        </div>
      </section>

      {/* Compact Footer */}
      <footer style={{
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '1rem',
        textAlign: 'center',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <button onClick={() => navigate('/about')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '0.85rem' }}>About</button>
          <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '0.85rem' }}>Privacy</button>
          <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '0.85rem' }}>Terms</button>
          <button onClick={() => navigate('/contact')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '0.85rem' }}>Contact</button>
          <button onClick={() => navigate('/faq')} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '0.85rem' }}>FAQ</button>
        </div>
        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', margin: 0 }}>
          © 2024 TingleTap™. All rights reserved. Made in India 🇮🇳
        </p>
      </footer>
    </div>
  );
};

export default PrivacyPage;
