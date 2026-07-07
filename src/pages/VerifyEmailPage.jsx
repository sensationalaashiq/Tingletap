import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../firebase/config';
import PremiumCopyright from '../components/PremiumCopyright';
import './LandingPage.css';

/**
 * VerifyEmailPage
 * Handles Firebase email verification action codes delivered via
 * TingleTap-branded emails from Brevo (Netlify Function: sendVerification).
 *
 * URL: /verify-email?oobCode=<code>
 * After success → redirects to /login (or /welcome if already signed in).
 */
const VerifyEmailPage = () => {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const oobCode = searchParams.get('oobCode');
    if (!oobCode) {
      setState('error');
      setErrorMsg('Invalid verification link. The link may be missing required parameters.');
      return;
    }

    applyActionCode(auth, oobCode)
      .then(() => {
        setState('success');
        // Reload current user so emailVerified reflects the change
        auth.currentUser?.reload().catch(() => {});
        setTimeout(() => {
          if (auth.currentUser) navigate('/welcome');
          else navigate('/login');
        }, 3500);
      })
      .catch((err) => {
        setState('error');
        switch (err.code) {
          case 'auth/expired-action-code':
            setErrorMsg('This verification link has expired. Please request a new one.');
            break;
          case 'auth/invalid-action-code':
            setErrorMsg('This verification link is invalid or has already been used.');
            break;
          case 'auth/user-disabled':
            setErrorMsg('This account has been disabled. Please contact support.');
            break;
          default:
            setErrorMsg('Email verification failed. The link may be expired or already used.');
        }
      });
  }, [searchParams, navigate]);

  return (
    <div className="landing-page" style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg,#f8f0ff 0%,#ede4fb 35%,#f3e8ff 65%,#e8d8fa 100%)',
      fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    }}>
      {/* Compact header */}
      <header className="luxury-header" style={{ padding: '0.5rem 1rem' }}>
        <div className="header-content" style={{ height: '50px' }}>
          <div className="header-brand">
            <div className="brand-logo">
              <img src="/tingletap-logo.jpg" alt="TingleTap" className="logo-image"
                   style={{ width: '35px', height: '35px' }} />
            </div>
            <div className="brand-text">
              <span className="brand-name" style={{ fontSize: '1.2rem' }}>TingleTap</span>
              <span className="brand-tagline" style={{ fontSize: '0.65rem' }}>Email Verification</span>
            </div>
          </div>
          <nav className="header-nav">
            <button className="nav-btn login-btn"
                    onClick={() => navigate('/login')}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              ← Back to Login
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <section style={{
        padding: '90px 1rem 40px',
        maxWidth: '460px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 140px)',
      }}>
        <div style={{
          background: 'rgba(255,255,255,.75)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(192,132,252,.22)',
          borderRadius: '20px',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 12px 48px rgba(124,58,237,.1)',
        }}>

          {/* Verifying state */}
          {state === 'verifying' && (
            <>
              <div style={{
                width: 72, height: 72, margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#ede9fe,#faf5ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(124,58,237,.12)',
              }}>
                <div style={{
                  width: 32, height: 32,
                  border: '3px solid rgba(124,58,237,.15)',
                  borderTopColor: '#7c3aed',
                  borderRadius: '50%',
                  animation: 'vepSpin .7s linear infinite',
                }} />
              </div>
              <style>{`@keyframes vepSpin { to { transform: rotate(360deg); } }`}</style>
              <h1 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800, color: '#1e1b4b' }}>
                Verifying Email…
              </h1>
              <p style={{ margin: 0, color: '#7e6ca8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Please wait while we verify your email address.
              </p>
            </>
          )}

          {/* Success state */}
          {state === 'success' && (
            <>
              <div style={{
                width: 72, height: 72, margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#4ade80,#22c55e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(34,197,94,.25)',
                animation: 'vepPop .5s cubic-bezier(.34,1.56,.64,1) both',
              }}>
                <style>{`@keyframes vepPop { from{transform:scale(0) rotate(-10deg);opacity:0} to{transform:scale(1) rotate(0);opacity:1} }`}</style>
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none">
                  <path d="M5 12l5 5 9-10" stroke="white" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 style={{ margin: '0 0 10px', fontSize: '1.55rem', fontWeight: 800, color: '#14532d' }}>
                Email Verified!
              </h1>
              <p style={{ margin: '0 0 20px', color: '#166534', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Your email address has been verified successfully. Redirecting you now…
              </p>
              <div style={{
                background: 'rgba(34,197,94,.08)',
                border: '1px solid rgba(34,197,94,.2)',
                borderRadius: '10px',
                padding: '10px 16px',
                color: '#166534',
                fontSize: '13px',
                fontWeight: 500,
              }}>
                ✓ Account verified — Welcome to TingleTap!
              </div>
            </>
          )}

          {/* Error state */}
          {state === 'error' && (
            <>
              <div style={{
                width: 72, height: 72, margin: '0 auto 20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#fca5a5,#ef4444)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(239,68,68,.2)',
              }}>
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 style={{ margin: '0 0 10px', fontSize: '1.45rem', fontWeight: 800, color: '#7f1d1d' }}>
                Verification Failed
              </h1>
              <p style={{ margin: '0 0 24px', color: '#991b1b', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {errorMsg}
              </p>
              <button
                onClick={() => navigate('/login')}
                style={{
                  width: '100%', padding: '13px 20px',
                  background: 'linear-gradient(135deg,#9333ea,#a855f7)',
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(147,51,234,.28)',
                }}
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </section>

      <PremiumCopyright />
    </div>
  );
};

export default VerifyEmailPage;
