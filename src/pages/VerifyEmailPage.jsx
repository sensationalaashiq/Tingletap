import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../firebase/config';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { pt } from '../utils/premiumToast';
import PremiumCopyright from '../components/PremiumCopyright';

/**
 * VerifyEmailPage — Ultra Premium redesign
 * Handles Firebase email verification action codes.
 * URL: /verify-email?oobCode=<code>
 */
const VerifyEmailPage = () => {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState]       = useState('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(5);
  const toastShownRef = React.useRef(false);

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
        // Cross-page toast so LoginPage shows it after redirect
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

  // Show success toast once when state becomes 'success'
  useEffect(() => {
    if (state === 'success' && !toastShownRef.current) {
      toastShownRef.current = true;
      setTimeout(() => pt.emailVerified('Email verified successfully! 🎉 Redirecting you now…'), 400);
    }
  }, [state]);

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
      background: 'linear-gradient(145deg,#f3eeff 0%,#ede4fb 30%,#e8f0fe 65%,#f0e8ff 100%)',
      fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Premium ToastContainer — page-level, themed */}
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        style={{ zIndex: 99999, top: '80px' }}
      />

      <style>{`
        @keyframes vep-spin    { to { transform: rotate(360deg); } }
        @keyframes vep-pop     { from{transform:scale(0) rotate(-18deg);opacity:0} 65%{transform:scale(1.12) rotate(3deg);opacity:1} to{transform:scale(1) rotate(0);opacity:1} }
        @keyframes vep-shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-9px)} 40%{transform:translateX(9px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes vep-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes vep-shimmer { 0%{background-position:-300% center} 100%{background-position:300% center} }
        @keyframes vep-check-draw { from{stroke-dashoffset:46} to{stroke-dashoffset:0} }
        @keyframes vep-bar     { 0%{width:0%} 100%{width:100%} }
        @keyframes vep-pulse-ring { 0%{box-shadow:0 0 0 0 rgba(124,58,237,.35),0 8px 28px rgba(124,58,237,.15)} 70%{box-shadow:0 0 0 16px rgba(124,58,237,0),0 8px 28px rgba(124,58,237,.15)} 100%{box-shadow:0 0 0 0 rgba(124,58,237,0),0 8px 28px rgba(124,58,237,.15)} }
        @keyframes vep-star-spin { 0%,100%{transform:rotate(0deg) scale(.85);opacity:.4} 50%{transform:rotate(60deg) scale(1.1);opacity:1} }
        @keyframes vep-orb     { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.08)} 66%{transform:translate(-20px,15px) scale(.95)} }
        .vep-back-btn { transition: all .18s ease !important; }
        .vep-back-btn:hover { background: rgba(124,58,237,.14) !important; transform: translateX(-3px) !important; box-shadow: 0 4px 16px rgba(124,58,237,.18) !important; }
        .vep-back-btn:active { transform: translateX(-1px) !important; }
        .vep-cta { transition: all .2s ease !important; }
        .vep-cta:hover { transform: translateY(-2px) !important; filter: brightness(1.06); }
        .vep-cta:active { transform: translateY(0) !important; }
        .vep-feature-row { transition: all .15s ease; }
        .vep-feature-row:hover { background: rgba(124,58,237,.08) !important; transform: translateX(4px); }
      `}</style>

      {/* ── Decorative background orbs ── */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-60px', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(167,139,250,.18) 0%,transparent 70%)', animation: 'vep-orb 14s ease-in-out infinite' }}/>
        <div style={{ position: 'absolute', bottom: '-60px', left: '-80px', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,.12) 0%,transparent 70%)', animation: 'vep-orb 18s ease-in-out infinite 4s' }}/>
        <div style={{ position: 'absolute', top: '45%', left: '60%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,121,249,.10) 0%,transparent 70%)', animation: 'vep-orb 22s ease-in-out infinite 8s' }}/>
      </div>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 200,
        padding: '0 1.5rem',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(167,139,250,.18)',
        boxShadow: '0 1px 16px rgba(124,58,237,.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <div style={{ position: 'relative' }}>
            <img src="/tingletap-logo.jpg" alt="TingleTap"
              style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover',
                boxShadow: '0 4px 16px rgba(124,58,237,.28)', display: 'block' }} />
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 14, height: 14, borderRadius: '50%',
              background: 'linear-gradient(135deg,#7c3aed,#9333ea)',
              border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" width="8" height="8" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2d1b4e', lineHeight: 1.15, letterSpacing: '-0.2px' }}>TingleTap</div>
            <div style={{ fontSize: '0.6rem', color: '#9b7fd4', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Email Verification</div>
          </div>
        </div>

        {/* Back button — large and prominent */}
        <button
          className="vep-back-btn"
          onClick={() => navigate('/login')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '12px',
            background: 'rgba(124,58,237,.08)',
            border: '1.5px solid rgba(124,58,237,.22)',
            color: '#7c3aed', fontWeight: 700, fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          {/* Prominent back arrow SVG */}
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" style={{ flexShrink: 0 }}>
            <path d="M19 12H5" stroke="#7c3aed" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 5l-7 7 7 7" stroke="#7c3aed" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Login
        </button>
      </header>

      {/* ── Main content ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 1rem', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: '100%', maxWidth: '480px',
          background: 'rgba(255,255,255,.88)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(192,132,252,.2)',
          borderRadius: '28px',
          padding: '48px 40px 44px',
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(124,58,237,.13), 0 4px 20px rgba(124,58,237,.07)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Animated top shimmer bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 5,
            background: 'linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9)',
            backgroundSize: '300% 100%',
            animation: 'vep-shimmer 3.5s linear infinite',
            borderRadius: '28px 28px 0 0',
          }} />

          {/* Decorative stars */}
          <svg style={{ position: 'absolute', top: 18, right: 22, animation: 'vep-star-spin 3s ease-in-out infinite' }} viewBox="0 0 24 24" width="18" height="18">
            <path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc" opacity="0.7"/>
          </svg>
          <svg style={{ position: 'absolute', top: 22, left: 24, animation: 'vep-star-spin 4s ease-in-out infinite .8s' }} viewBox="0 0 24 24" width="13" height="13">
            <path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#a855f7" opacity="0.5"/>
          </svg>

          {/* ── VERIFYING ── */}
          {state === 'verifying' && (
            <>
              <div style={{
                width: 88, height: 88, margin: '0 auto 28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#ede9fe,#faf5ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'vep-pulse-ring 1.8s ease infinite',
              }}>
                <div style={{
                  width: 38, height: 38,
                  border: '3.5px solid rgba(124,58,237,.12)',
                  borderTopColor: '#7c3aed',
                  borderRadius: '50%',
                  animation: 'vep-spin .75s linear infinite',
                }} />
              </div>
              <h1 style={{ margin: '0 0 12px', fontSize: '1.65rem', fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.4px' }}>
                Verifying Your Email…
              </h1>
              <p style={{ margin: '0 0 24px', color: '#7e6ca8', fontSize: '0.93rem', lineHeight: 1.7 }}>
                Hang tight while we securely confirm your email address with TingleTap servers.
              </p>
              <div style={{
                background: 'rgba(109,40,217,.05)',
                border: '1px solid rgba(139,92,246,.14)',
                borderRadius: '14px',
                padding: '14px 20px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#ede9fe,#e0d9f5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth="1.8"/>
                    <path d="M12 7v5l3 3" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12.5px', color: '#6d28d9', fontWeight: 700 }}>Processing secure verification</div>
                  <div style={{ fontSize: '11.5px', color: '#9b7fd4', marginTop: 2 }}>This only takes a moment…</div>
                </div>
              </div>
            </>
          )}

          {/* ── SUCCESS ── */}
          {state === 'success' && (
            <>
              {/* Icon */}
              <div style={{
                width: 96, height: 96, margin: '0 auto 28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 14px 40px rgba(34,197,94,.32)',
                animation: 'vep-pop .55s cubic-bezier(.34,1.56,.64,1) both',
              }}>
                <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
                  <path d="M11 24l10 10 16-18"
                    stroke="white" strokeWidth="3.8"
                    strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="46" strokeDashoffset="46"
                    style={{ animation: 'vep-check-draw .48s .3s ease forwards' }}/>
                </svg>
              </div>

              <h1 style={{ margin: '0 0 10px', fontSize: '1.75rem', fontWeight: 800, color: '#14532d', letterSpacing: '-0.4px' }}>
                Email Verified! 🎉
              </h1>
              <p style={{ margin: '0 0 26px', color: '#15803d', fontSize: '0.93rem', lineHeight: 1.7 }}>
                Your email address has been confirmed. Your TingleTap account is now <strong>fully active</strong> and ready to use.
              </p>

              {/* Feature highlights */}
              {[
                { color: '#7c3aed', bg: 'rgba(124,58,237,.07)', border: 'rgba(124,58,237,.14)', icon: (
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/></svg>
                ), label: 'Join chat rooms & meet thousands of people' },
                { color: '#059669', bg: 'rgba(5,150,105,.07)', border: 'rgba(5,150,105,.14)', icon: (
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M12 15l-4 5 4-2 4 2-4-5zM12 3C9.24 3 7 5.24 7 8s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ), label: 'Earn achievements & unlock premium badges' },
                { color: '#7c3aed', bg: 'rgba(124,58,237,.07)', border: 'rgba(124,58,237,.14)', icon: (
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M12 2a3 3 0 0 0-3 3v4H6l-2 2v2h16v-2l-2-2h-3V5a3 3 0 0 0-3-3zM9 19c0 1.66 1.34 3 3 3s3-1.34 3-3" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/></svg>
                ), label: 'Tune in to live RJ broadcasts & stages' },
              ].map(({ color, bg, border, icon, label }) => (
                <div key={label} className="vep-feature-row" style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', marginBottom: 8,
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: '12px', textAlign: 'left',
                  cursor: 'default',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: `rgba(${color === '#7c3aed' ? '124,58,237' : '5,150,105'},.12)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{icon}</div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: color === '#7c3aed' ? '#4c1d95' : '#065f46' }}>{label}</span>
                </div>
              ))}

              {/* Countdown progress bar */}
              <div style={{ marginTop: 24, marginBottom: 18 }}>
                <div style={{
                  height: 5, background: 'rgba(34,197,94,.12)',
                  borderRadius: 5, overflow: 'hidden', marginBottom: 8,
                }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg,#22c55e,#86efac)',
                    animation: `vep-bar 5s linear forwards`,
                    borderRadius: 5,
                  }} />
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#16a34a', fontWeight: 600 }}>
                  Redirecting in {countdown}s…
                </p>
              </div>

              <button
                onClick={() => { if (auth.currentUser) navigate('/welcome'); else navigate('/login'); }}
                className="vep-cta"
                style={{
                  width: '100%', padding: '15px 20px',
                  background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                  color: 'white', border: 'none', borderRadius: '15px',
                  fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 8px 28px rgba(34,197,94,.32)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                  <polyline points="10,17 15,12 10,7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="15" y1="12" x2="3" y2="12" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                Enter TingleTap Now
              </button>
            </>
          )}

          {/* ── ERROR ── */}
          {state === 'error' && (
            <>
              <div style={{
                width: 96, height: 96, margin: '0 auto 28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 12px 36px rgba(239,68,68,.30)',
                animation: 'vep-shake .55s ease both',
              }}>
                <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
                  <path d="M15 15l18 18M33 15L15 33" stroke="white" strokeWidth="3.8" strokeLinecap="round"/>
                </svg>
              </div>

              <h1 style={{ margin: '0 0 10px', fontSize: '1.6rem', fontWeight: 800, color: '#7f1d1d', letterSpacing: '-0.3px' }}>
                Verification Failed
              </h1>
              <p style={{ margin: '0 0 24px', color: '#991b1b', fontSize: '0.91rem', lineHeight: 1.7 }}>
                {errorMsg}
              </p>

              <div style={{
                background: 'rgba(239,68,68,.05)',
                border: '1px solid rgba(239,68,68,.16)',
                borderRadius: '14px',
                padding: '16px 20px',
                textAlign: 'left',
                marginBottom: 24,
              }}>
                <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#b91c1c', fontSize: '13px' }}>What you can do:</p>
                {[
                  'Go back to the app and request a new verification email',
                  'Check your spam/junk folder for the original link',
                  'Make sure you clicked the most recent email link',
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 2 ? 8 : 0 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: 'rgba(239,68,68,.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                        <path d="M9 12l2 2 4-4" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: '12.5px', color: '#7f1d1d', lineHeight: 1.55 }}>{tip}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/login')}
                className="vep-cta"
                style={{
                  width: '100%', padding: '15px 20px',
                  background: 'linear-gradient(135deg,#7c3aed,#9333ea)',
                  color: 'white', border: 'none', borderRadius: '15px',
                  fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 8px 28px rgba(124,58,237,.30)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                }}
              >
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                  <path d="M19 12H5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 5l-7 7 7 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <PremiumCopyright />
      </div>
    </div>
  );
};

export default VerifyEmailPage;
