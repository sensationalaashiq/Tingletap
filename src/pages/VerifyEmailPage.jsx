import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../firebase/config';
import PremiumCopyright from '../components/PremiumCopyright';

/**
 * VerifyEmailPage — Premium redesign
 * Handles Firebase email verification action codes.
 * URL: /verify-email?oobCode=<code>
 */
const VerifyEmailPage = () => {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState]     = useState('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(4);

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
        auth.currentUser?.reload().catch(() => {});
        // Set cross-page toast flag so LoginPage can show "email verified" toast
        try { sessionStorage.setItem('tt_page_toast', JSON.stringify({ type: 'email_verified' })); } catch {}
      })
      .catch((err) => {
        setState('error');
        switch (err.code) {
          case 'auth/expired-action-code':
            setErrorMsg('This verification link has expired. Please request a new one from the app.'); break;
          case 'auth/invalid-action-code':
            setErrorMsg('This verification link is invalid or has already been used.'); break;
          case 'auth/user-disabled':
            setErrorMsg('This account has been disabled. Please contact support.'); break;
          default:
            setErrorMsg('Email verification failed. The link may be expired or already used.');
        }
      });
  }, [searchParams]);

  // Countdown for success redirect
  useEffect(() => {
    if (state !== 'success') return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          if (auth.currentUser) navigate('/welcome');
          else navigate('/login');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [state, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg,#f8f0ff 0%,#ede4fb 35%,#f3e8ff 65%,#e8d8fa 100%)',
      fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @keyframes vep-spin { to { transform: rotate(360deg); } }
        @keyframes vep-pop { from{transform:scale(0) rotate(-15deg);opacity:0} 70%{transform:scale(1.1) rotate(2deg);opacity:1} to{transform:scale(1) rotate(0);opacity:1} }
        @keyframes vep-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes vep-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes vep-pulse-ring { 0%{box-shadow:0 0 0 0 rgba(124,58,237,.35)} 70%{box-shadow:0 0 0 14px rgba(124,58,237,0)} 100%{box-shadow:0 0 0 0 rgba(124,58,237,0)} }
        @keyframes vep-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes vep-check-draw { from{stroke-dashoffset:40} to{stroke-dashoffset:0} }
        @keyframes vep-bar { 0%{width:0%} 100%{width:100%} }
        .vep-back-btn:hover { background: rgba(124,58,237,.12) !important; transform: translateX(-2px); }
        .vep-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(124,58,237,.45) !important; }
        .vep-cta:active { transform: translateY(0); }
      `}</style>

      {/* Header */}
      <header style={{
        padding: '0 1.5rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(167,139,250,.15)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/tingletap-logo.jpg" alt="TingleTap"
            style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover',
              boxShadow: '0 4px 14px rgba(124,58,237,.22)' }} />
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2d1b4e', lineHeight: 1.1 }}>TingleTap</div>
            <div style={{ fontSize: '0.6rem', color: '#9b7fd4', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Email Verification</div>
          </div>
        </div>
        <button
          className="vep-back-btn"
          onClick={() => navigate('/login')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '10px',
            background: 'rgba(124,58,237,.07)',
            border: '1.5px solid rgba(124,58,237,.18)',
            color: '#7c3aed', fontWeight: 700, fontSize: '0.82rem',
            cursor: 'pointer', transition: 'all .18s ease',
          }}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Login
        </button>
      </header>

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 1rem',
      }}>
        <div style={{
          width: '100%', maxWidth: '460px',
          background: 'rgba(255,255,255,.82)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(192,132,252,.22)',
          borderRadius: '24px',
          padding: '44px 36px 40px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(124,58,237,.12), 0 4px 16px rgba(124,58,237,.06)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative shimmer top bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            background: 'linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9)',
            backgroundSize: '200% 100%',
            animation: 'vep-shimmer 3s linear infinite',
          }} />

          {/* ── VERIFYING ── */}
          {state === 'verifying' && (
            <>
              <div style={{
                width: 80, height: 80, margin: '0 auto 24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#ede9fe,#faf5ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 28px rgba(124,58,237,.15)',
                animation: 'vep-pulse-ring 1.8s ease infinite',
              }}>
                <div style={{
                  width: 36, height: 36,
                  border: '3.5px solid rgba(124,58,237,.15)',
                  borderTopColor: '#7c3aed',
                  borderRadius: '50%',
                  animation: 'vep-spin .75s linear infinite',
                }} />
              </div>
              <h1 style={{ margin: '0 0 10px', fontSize: '1.6rem', fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.3px' }}>
                Verifying Your Email…
              </h1>
              <p style={{ margin: 0, color: '#7e6ca8', fontSize: '0.92rem', lineHeight: 1.65 }}>
                Hang tight while we securely confirm your email address.
              </p>
              <div style={{
                marginTop: 24,
                background: 'rgba(109,40,217,.04)',
                border: '1px solid rgba(139,92,246,.12)',
                borderRadius: '12px',
                padding: '12px 18px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth="1.8"/>
                  <path d="M12 7v5l3 3" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: '12px', color: '#6d28d9', fontWeight: 600 }}>Processing secure verification request…</span>
              </div>
            </>
          )}

          {/* ── SUCCESS ── */}
          {state === 'success' && (
            <>
              <div style={{
                width: 88, height: 88, margin: '0 auto 24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 12px 36px rgba(34,197,94,.3)',
                animation: 'vep-pop .55s cubic-bezier(.34,1.56,.64,1) both',
              }}>
                <svg viewBox="0 0 44 44" width="44" height="44" fill="none">
                  <path d="M10 22l9 9 15-16"
                    stroke="white" strokeWidth="3.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="40" strokeDashoffset="40"
                    style={{ animation: 'vep-check-draw .45s .3s ease forwards' }}/>
                </svg>
              </div>
              <h1 style={{ margin: '0 0 10px', fontSize: '1.65rem', fontWeight: 800, color: '#14532d', letterSpacing: '-0.3px' }}>
                Email Verified! 🎉
              </h1>
              <p style={{ margin: '0 0 24px', color: '#166534', fontSize: '0.92rem', lineHeight: 1.65 }}>
                Your email address has been confirmed. Your TingleTap account is now fully active.
              </p>

              {/* Feature highlights */}
              {[
                { icon: '💬', label: 'Join chat rooms & talk to thousands' },
                { icon: '🏆', label: 'Earn achievements and unlock badges' },
                { icon: '🎙️', label: 'Tune in to live RJ broadcasts' },
              ].map(({ icon, label }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', marginBottom: 8,
                  background: 'rgba(34,197,94,.06)',
                  border: '1px solid rgba(34,197,94,.15)',
                  borderRadius: '10px', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>{label}</span>
                </div>
              ))}

              {/* Countdown bar */}
              <div style={{ marginTop: 22 }}>
                <div style={{
                  height: 4, background: 'rgba(34,197,94,.12)',
                  borderRadius: 4, overflow: 'hidden', marginBottom: 8,
                }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg,#22c55e,#86efac)',
                    animation: `vep-bar 4s linear forwards`,
                    borderRadius: 4,
                  }} />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>
                  Redirecting you in {countdown}s…
                </p>
              </div>

              <button
                onClick={() => { if (auth.currentUser) navigate('/welcome'); else navigate('/login'); }}
                className="vep-cta"
                style={{
                  marginTop: 18, width: '100%', padding: '14px 20px',
                  background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                  color: 'white', border: 'none', borderRadius: '14px',
                  fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(34,197,94,.28)',
                  transition: 'all .2s ease', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Enter TingleTap Now
              </button>
            </>
          )}

          {/* ── ERROR ── */}
          {state === 'error' && (
            <>
              <div style={{
                width: 88, height: 88, margin: '0 auto 24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 32px rgba(239,68,68,.28)',
                animation: 'vep-shake .5s ease both',
              }}>
                <svg viewBox="0 0 44 44" width="44" height="44" fill="none">
                  <path d="M14 14l16 16M30 14L14 30" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 style={{ margin: '0 0 10px', fontSize: '1.5rem', fontWeight: 800, color: '#7f1d1d', letterSpacing: '-0.3px' }}>
                Verification Failed
              </h1>
              <p style={{ margin: '0 0 22px', color: '#991b1b', fontSize: '0.9rem', lineHeight: 1.65 }}>
                {errorMsg}
              </p>

              <div style={{
                background: 'rgba(239,68,68,.05)',
                border: '1px solid rgba(239,68,68,.15)',
                borderRadius: '12px',
                padding: '14px 18px',
                textAlign: 'left',
                marginBottom: 22,
              }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#b91c1c', fontSize: '13px' }}>What you can do:</p>
                {[
                  'Go back to the app and request a new verification email',
                  'Check your spam/junk folder for the original link',
                  'Make sure you clicked the most recent email link',
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: i < 2 ? 6 : 0 }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                      <path d="M9 12l2 2 4-4" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="1.8"/>
                    </svg>
                    <span style={{ fontSize: '12px', color: '#7f1d1d', lineHeight: 1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/login')}
                className="vep-cta"
                style={{
                  width: '100%', padding: '14px 20px',
                  background: 'linear-gradient(135deg,#9333ea,#7c3aed)',
                  color: 'white', border: 'none', borderRadius: '14px',
                  fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 8px 28px rgba(147,51,234,.28)',
                  transition: 'all .2s ease', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                  <path d="M19 12H5M12 5l-7 7 7 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>

      <PremiumCopyright />
    </div>
  );
};

export default VerifyEmailPage;
