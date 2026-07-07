import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase/config';

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const IcShield = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="rp-sg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed"/>
        <stop offset="100%" stopColor="#c084fc"/>
      </linearGradient>
    </defs>
    <path d="M12 2L4 6v6c0 5.25 3.5 9.75 8 11 4.5-1.25 8-5.75 8-11V6L12 2z" fill="url(#rp-sg)" opacity=".15"/>
    <path d="M12 2L4 6v6c0 5.25 3.5 9.75 8 11 4.5-1.25 8-5.75 8-11V6L12 2z" stroke="url(#rp-sg)" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
    <path d="M9 12l2 2 4-4" stroke="url(#rp-sg)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IcLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="#9333ea" strokeWidth="1.6" fill="none"/>
    <path d="M8 11V7a4 4 0 018 0v4" stroke="#9333ea" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
    <circle cx="12" cy="16" r="1.2" fill="#9333ea"/>
  </svg>
);

const IcEyeOn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <ellipse cx="12" cy="12" rx="10" ry="6" stroke="#9333ea" strokeWidth="1.6" fill="none"/>
    <circle cx="12" cy="12" r="3" stroke="#9333ea" strokeWidth="1.6" fill="none"/>
  </svg>
);

const IcEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M17.94 17.94A10 10 0 0112 20c-5 0-9.27-3.11-11-8a11 11 0 013.05-4.9M9.9 4.24A9.12 9.12 0 0112 4c5 0 9.27 3.11 11 8a10.94 10.94 0 01-1.31 2.57M3 3l18 18" stroke="#9333ea" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IcCheckCircle = () => (
  <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="rp-ok" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22c55e"/>
        <stop offset="100%" stopColor="#16a34a"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#rp-ok)" opacity=".15"/>
    <circle cx="12" cy="12" r="10" stroke="url(#rp-ok)" strokeWidth="1.8" fill="none"/>
    <path d="M7.5 12l3 3 6-6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IcArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IcKey = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="7.5" cy="15.5" r="5.5" stroke="#7c3aed" strokeWidth="1.6" fill="none"/>
    <path d="M11.5 11.5L20 3" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/>
    <path d="M18 5l2 2M16 7l2 2" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const IcSpinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'rp-spin 0.9s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
    <path d="M12 2a10 10 0 0110 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const IcWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#dc2626" strokeWidth="1.6" fill="rgba(239,68,68,0.12)"/>
    <line x1="12" y1="9" x2="12" y2="13" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="12" cy="17" r="0.8" fill="#dc2626"/>
  </svg>
);

// ── Password Strength ─────────────────────────────────────────────────────────
function getStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '#e5e7eb' };
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Weak',   color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair',   color: '#f97316' };
  if (score <= 3) return { score, label: 'Good',   color: '#eab308' };
  if (score <= 4) return { score, label: 'Strong', color: '#22c55e' };
  return { score: 5,   label: 'Very Strong', color: '#10b981' };
}

// ── Page ──────────────────────────────────────────────────────────────────────
const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState(false);
  const [isLoading, setIsLoading]         = useState(false);
  const [oobCode, setOobCode]             = useState('');
  const [countdown, setCountdown]         = useState(4);

  const strength = getStrength(password);

  useEffect(() => {
    const code = searchParams.get('oobCode');
    if (code) setOobCode(code);
    else setError('This reset link is invalid or has expired. Please request a new one.');
  }, [searchParams]);

  useEffect(() => {
    if (!success) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [success]);

  useEffect(() => {
    if (countdown <= 0 && success) navigate('/login');
  }, [countdown, success, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setIsLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch {
      setError('This reset link has expired or already been used. Please request a new one.');
    }
    setIsLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes rp-orb1 {
          0%,100% { transform: translate(0,0) scale(1); opacity:.55; }
          33% { transform: translate(28px,38px) scale(1.08); opacity:.72; }
          66% { transform: translate(-18px,18px) scale(.93); opacity:.48; }
        }
        @keyframes rp-orb2 {
          0%,100% { transform: translate(0,0) scale(1); opacity:.45; }
          50% { transform: translate(-32px,-38px) scale(1.12); opacity:.62; }
        }
        @keyframes rp-orb3 {
          0%,100% { transform: translate(0,0) scale(1); opacity:.5; }
          50% { transform: translate(20px,-26px) scale(1.14); opacity:.68; }
        }
        @keyframes rp-shimmer {
          0%,100% { background-position: 400% 0; }
          50%      { background-position: -400% 0; }
        }
        @keyframes rp-cardin {
          from { opacity:0; transform: translateY(28px) scale(.96); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes rp-fadein {
          from { opacity:0; transform: translateY(8px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes rp-spin { to { transform: rotate(360deg); } }
        @keyframes rp-shield {
          0%,100% { box-shadow: 0 0 0 0 rgba(109,40,217,.15), 0 8px 28px rgba(109,40,217,.12); }
          50%      { box-shadow: 0 0 0 8px rgba(109,40,217,.06), 0 14px 40px rgba(109,40,217,.22); }
        }
        @keyframes rp-success-pop {
          0%   { transform: scale(0) rotate(-12deg); opacity:0; }
          60%  { transform: scale(1.18) rotate(4deg); opacity:1; }
          80%  { transform: scale(0.94) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes rp-logoFloat {
          0%,100% { transform: translateY(0) scale(1);   filter: drop-shadow(0 10px 24px rgba(139,92,246,.32)); }
          50%      { transform: translateY(-8px) scale(1.03); filter: drop-shadow(0 20px 32px rgba(139,92,246,.5)); }
        }

        .rp-root {
          min-height: 100vh;
          width: 100vw;
          position: fixed;
          inset: 0;
          background: linear-gradient(148deg, #f8f0ff 0%, #ede4fb 25%, #f3e8ff 50%, #e8d8fa 75%, #f0e6ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow: hidden;
        }

        /* Floating orbs */
        .rp-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(52px);
        }
        .rp-orb1 { width:340px; height:340px; background:radial-gradient(circle,rgba(192,132,252,.28),rgba(168,85,247,.12)); top:-80px; right:-60px; animation: rp-orb1 8s ease-in-out infinite; }
        .rp-orb2 { width:280px; height:280px; background:radial-gradient(circle,rgba(139,92,246,.22),rgba(109,40,217,.08)); bottom:-60px; left:-60px; animation: rp-orb2 10s ease-in-out infinite; }
        .rp-orb3 { width:200px; height:200px; background:radial-gradient(circle,rgba(232,121,249,.2),rgba(192,132,252,.08)); bottom:20%; right:10%; animation: rp-orb3 12s ease-in-out infinite; }

        /* Card */
        .rp-card {
          position: relative;
          z-index: 2;
          background: rgba(255,255,255,.82);
          backdrop-filter: blur(36px);
          -webkit-backdrop-filter: blur(36px);
          border-radius: 28px;
          padding: 36px 32px 30px;
          width: 100%;
          max-width: 420px;
          max-height: 98vh;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
          box-shadow:
            0 32px 80px rgba(139,92,246,.18),
            0 8px 32px rgba(155,89,208,.12),
            inset 0 1px 0 rgba(255,255,255,.92),
            0 0 0 1.5px rgba(192,132,252,.28);
          border: 1.5px solid rgba(192,132,252,.22);
          animation: rp-cardin .6s cubic-bezier(.34,1.56,.64,1) forwards;
        }
        .rp-card::-webkit-scrollbar { display: none; }
        .rp-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3.5px;
          background: linear-gradient(90deg,#c084fc,#a855f7,#9333ea,#7c3aed,#c084fc);
          background-size: 400% 100%;
          animation: rp-shimmer 4s ease-in-out infinite;
          border-radius: 28px 28px 0 0;
        }

        /* Logo */
        .rp-logo-wrap { text-align: center; margin-bottom: 20px; }
        .rp-logo-img {
          width: 80px; height: 80px;
          border-radius: 22px;
          object-fit: contain;
          animation: rp-logoFloat 3.5s ease-in-out infinite;
          filter: drop-shadow(0 10px 24px rgba(139,92,246,.32));
        }
        .rp-brand-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.7rem;
          font-weight: 800;
          background: linear-gradient(135deg,#5b21b6,#9333ea,#c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: block;
          margin-top: 8px;
          letter-spacing: .3px;
        }
        .rp-brand-sub {
          font-size: .72rem;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #a78bca;
          font-weight: 700;
          display: block;
          margin-top: 2px;
        }

        /* Shield icon */
        .rp-shield-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg,#ede9fe,#f5f3ff);
          margin: 0 auto 18px;
          animation: rp-shield 2.6s ease-in-out infinite;
        }

        /* Heading */
        .rp-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.55rem;
          font-weight: 800;
          color: #2d1b4e;
          text-align: center;
          line-height: 1.25;
          margin-bottom: 6px;
        }
        .rp-sub {
          font-size: .88rem;
          color: #7e6ca8;
          text-align: center;
          line-height: 1.55;
          margin-bottom: 22px;
        }

        /* Divider */
        .rp-divider {
          height: 1px;
          background: linear-gradient(90deg,transparent,rgba(139,92,246,.2),transparent);
          margin-bottom: 22px;
        }

        /* Field */
        .rp-field { margin-bottom: 16px; }
        .rp-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: .8rem;
          font-weight: 700;
          color: #5b21b6;
          text-transform: uppercase;
          letter-spacing: .8px;
          margin-bottom: 7px;
        }
        .rp-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .rp-input {
          width: 100%;
          padding: 13px 44px 13px 14px;
          border-radius: 13px;
          border: 1.5px solid rgba(139,92,246,.22);
          background: rgba(245,240,255,.6);
          color: #2d1b4e;
          font-size: .97rem;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          outline: none;
          transition: border .2s, box-shadow .2s, background .2s;
        }
        .rp-input::placeholder { color: #b8a8d6; font-weight: 400; }
        .rp-input:focus {
          border-color: #9333ea;
          background: rgba(245,240,255,.9);
          box-shadow: 0 0 0 3px rgba(147,51,234,.12);
        }
        .rp-eye-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          opacity: .75;
          transition: opacity .2s;
        }
        .rp-eye-btn:hover { opacity: 1; }

        /* Strength bar */
        .rp-strength { margin-top: 8px; }
        .rp-strength-bars {
          display: flex;
          gap: 4px;
          margin-bottom: 4px;
        }
        .rp-strength-bar {
          flex: 1;
          height: 4px;
          border-radius: 4px;
          background: #e9d8ff;
          transition: background .3s;
        }
        .rp-strength-label {
          font-size: .75rem;
          font-weight: 600;
          color: #9333ea;
        }

        /* Error / Success alert */
        .rp-alert {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 11px 14px;
          border-radius: 11px;
          font-size: .87rem;
          font-weight: 500;
          line-height: 1.5;
          margin-bottom: 16px;
          animation: rp-fadein .3s ease;
        }
        .rp-alert-error {
          background: rgba(239,68,68,.08);
          border: 1.5px solid rgba(239,68,68,.25);
          color: #9b1c1c;
        }

        /* Submit button */
        .rp-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg,#7c3aed 0%,#9333ea 50%,#c084fc 100%);
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          letter-spacing: .25px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          transition: opacity .2s, transform .15s, box-shadow .2s;
          box-shadow: 0 6px 24px rgba(109,40,217,.32);
          margin-bottom: 14px;
        }
        .rp-btn:hover:not(:disabled) {
          opacity: .93;
          transform: translateY(-1px);
          box-shadow: 0 10px 32px rgba(109,40,217,.4);
        }
        .rp-btn:active:not(:disabled) { transform: translateY(0); }
        .rp-btn:disabled {
          background: linear-gradient(135deg,#c4b5fd,#ddd6fe);
          cursor: not-allowed;
          box-shadow: none;
          opacity: .75;
        }

        /* Back-to-login link */
        .rp-back-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 11px;
          border-radius: 12px;
          border: 1.5px solid rgba(147,51,234,.22);
          background: rgba(245,240,255,.5);
          color: #7c3aed;
          font-size: .9rem;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: background .2s, border-color .2s;
        }
        .rp-back-link:hover {
          background: rgba(237,229,254,.7);
          border-color: rgba(147,51,234,.4);
        }

        /* Success state */
        .rp-success {
          text-align: center;
          animation: rp-fadein .5s ease;
          padding: 8px 0;
        }
        .rp-success-icon {
          animation: rp-success-pop .6s cubic-bezier(.34,1.56,.64,1) forwards;
          display: inline-block;
          margin-bottom: 18px;
        }
        .rp-success-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 800;
          color: #14532d;
          margin-bottom: 10px;
          line-height: 1.25;
        }
        .rp-success-text {
          font-size: .91rem;
          color: #166534;
          line-height: 1.6;
          margin-bottom: 22px;
        }
        .rp-success-card {
          background: rgba(34,197,94,.07);
          border: 1.5px solid rgba(34,197,94,.25);
          border-radius: 13px;
          padding: 13px 16px;
          margin-bottom: 24px;
        }
        .rp-countdown {
          font-size: .83rem;
          color: #15803d;
          font-weight: 700;
        }
        .rp-success-btn {
          width: 100%;
          padding: 13px;
          border-radius: 13px;
          border: none;
          background: linear-gradient(135deg,#16a34a,#22c55e);
          color: #fff;
          font-size: .97rem;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(22,163,74,.28);
          transition: opacity .2s, transform .15s;
        }
        .rp-success-btn:hover { opacity:.9; transform: translateY(-1px); }

        /* Footer note */
        .rp-footer-note {
          text-align: center;
          font-size: .76rem;
          color: #b09dcc;
          margin-top: 18px;
          line-height: 1.55;
        }

        @media (max-width: 480px) {
          .rp-card { padding: 28px 18px 24px; border-radius: 22px; }
          .rp-title { font-size: 1.35rem; }
        }
      `}</style>

      <div className="rp-root">
        {/* Ambient orbs */}
        <div className="rp-orb rp-orb1" />
        <div className="rp-orb rp-orb2" />
        <div className="rp-orb rp-orb3" />

        <div className="rp-card">
          {/* Logo */}
          <div className="rp-logo-wrap">
            <img
              className="rp-logo-img"
              src="/tingletap-logo.jpg"
              alt="TingleTap"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <span className="rp-brand-name">TingleTap</span>
            <span className="rp-brand-sub">Password Reset</span>
          </div>

          {success ? (
            /* ── Success State ─────────────────────────────────────────────── */
            <div className="rp-success">
              <div className="rp-success-icon"><IcCheckCircle /></div>
              <div className="rp-success-title">Password Updated!</div>
              <p className="rp-success-text">
                Your new password has been set successfully.
                You can now sign in with your new credentials.
              </p>
              <div className="rp-success-card">
                <div className="rp-countdown">
                  Redirecting to Login in {countdown}s…
                </div>
              </div>
              <button className="rp-success-btn" onClick={() => navigate('/login')}>
                Go to Login Now
              </button>
            </div>
          ) : (
            /* ── Reset Form ────────────────────────────────────────────────── */
            <>
              <div className="rp-shield-wrap"><IcShield /></div>
              <div className="rp-title">Set New Password</div>
              <p className="rp-sub">
                Create a strong new password for your TingleTap account.
              </p>
              <div className="rp-divider" />

              {/* Error alert */}
              {error && (
                <div className="rp-alert rp-alert-error">
                  <IcWarning />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* New Password */}
                <div className="rp-field">
                  <label className="rp-label">
                    <IcKey />
                    New Password
                  </label>
                  <div className="rp-input-wrap">
                    <input
                      className="rp-input"
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Enter new password…"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={!oobCode}
                    />
                    <button
                      type="button"
                      className="rp-eye-btn"
                      onClick={() => setShowPwd(p => !p)}
                      tabIndex={-1}
                    >
                      {showPwd ? <IcEyeOff /> : <IcEyeOn />}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {password.length > 0 && (
                    <div className="rp-strength">
                      <div className="rp-strength-bars">
                        {[1,2,3,4,5].map(i => (
                          <div
                            key={i}
                            className="rp-strength-bar"
                            style={{ background: i <= strength.score ? strength.color : '#e9d8ff' }}
                          />
                        ))}
                      </div>
                      <span className="rp-strength-label" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="rp-field">
                  <label className="rp-label">
                    <IcLock />
                    Confirm Password
                  </label>
                  <div className="rp-input-wrap">
                    <input
                      className="rp-input"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter your password…"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={!oobCode}
                      style={{
                        borderColor: confirmPassword && password !== confirmPassword
                          ? 'rgba(239,68,68,.5)' : undefined,
                      }}
                    />
                    <button
                      type="button"
                      className="rp-eye-btn"
                      onClick={() => setShowConfirm(p => !p)}
                      tabIndex={-1}
                    >
                      {showConfirm ? <IcEyeOff /> : <IcEyeOn />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <div style={{ fontSize: '.78rem', color: '#dc2626', marginTop: 5, fontWeight: 600 }}>
                      Passwords do not match
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="rp-btn"
                  disabled={isLoading || !oobCode || !password || !confirmPassword}
                >
                  {isLoading
                    ? <><IcSpinner /> Resetting Password…</>
                    : <><IcShield style={{ width:18, height:18 }} /> Reset Password</>
                  }
                </button>
              </form>

              {/* Back to login */}
              <button className="rp-back-link" onClick={() => navigate('/login')}>
                <IcArrowLeft />
                Back to Login
              </button>

              <div className="rp-footer-note">
                This link expires in <strong>1 hour</strong>. If it has expired,
                visit <strong>Forgot Password</strong> to get a new one.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ResetPasswordPage;
