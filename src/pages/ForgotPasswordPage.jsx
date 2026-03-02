
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import './LandingPage.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (error) {
      setError('Error sending password reset email. Please check your email address.');
    }

    setIsLoading(false);
  };

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
              <span className="brand-tagline" style={{ fontSize: '0.65rem' }}>Reset Password</span>
            </div>
          </div>

          <nav className="header-nav">
            <button 
              className="nav-btn login-btn"
              onClick={() => navigate('/login')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <span>← Back to Login</span>
            </button>
            <button 
              className="nav-btn signup-btn"
              onClick={() => navigate('/signup')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <span>Sign Up</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Compact Content Section */}
      <section style={{ 
        padding: '80px 1rem 20px', 
        maxWidth: '500px', 
        margin: '0 auto',
        minHeight: 'calc(100vh - 140px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center'
        }}>
          <h1 style={{ 
            fontFamily: 'Playfair Display, serif',
            fontSize: '2rem',
            fontWeight: '800',
            color: '#ffffff',
            marginBottom: '1rem'
          }}>
            Reset Your Password
          </h1>
          <p style={{ 
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '1rem',
                backdropFilter: 'blur(10px)'
              }}
            />

            {error && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}

            {message && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.9rem'
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '1rem',
                background: isLoading ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Sending...' : 'Send Reset Email'}
            </button>
          </form>

          <div style={{ marginTop: '2rem' }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Remember your password?
            </p>
            <button 
              onClick={() => navigate('/login')}
              style={{
                padding: '0.75rem 2rem',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                marginRight: '1rem'
              }}
            >
              Back to Login
            </button>
            <button 
              onClick={() => navigate('/signup')}
              style={{
                padding: '0.75rem 2rem',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.8)',
                border: 'none',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Create Account
            </button>
          </div>
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

export default ForgotPasswordPage;
