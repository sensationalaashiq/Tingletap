
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PremiumCopyright from '../components/PremiumCopyright';
import './LandingPage.css';

const AboutPage = () => {
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
              <span className="brand-tagline" style={{ fontSize: '0.65rem' }}>About Us</span>
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
        padding: '80px 1rem 40px', 
        maxWidth: '1200px', 
        margin: '0 auto',
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontFamily: 'Playfair Display, serif',
            fontSize: '2.5rem',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '1rem'
          }}>
            About TingleTap
          </h1>
          <p style={{ 
            fontSize: '1.1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '800px',
            margin: '0 auto',
            lineHeight: '1.6'
          }}>
            India's premier chat platform connecting people across the nation
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.3rem' }}>Our Mission</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
              To create a safe, vibrant, and inclusive chat environment where people from all over India can connect, share experiences, and build meaningful relationships.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.3rem' }}>Our Vision</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
              To become India's most trusted and feature-rich chat platform, fostering genuine connections and providing advanced communication tools for modern users.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#ffffff', marginBottom: '1rem', fontSize: '1.3rem' }}>Our Values</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
              Safety, Privacy, Innovation, and Community. We prioritize user security while delivering cutting-edge features that enhance your chat experience.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button 
            className="primary-cta"
            onClick={() => navigate('/rooms')}
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
            Join Our Community
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
            Contact Us
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
      </footer>
      <PremiumCopyright />
    </div>
  );
};

export default AboutPage;
