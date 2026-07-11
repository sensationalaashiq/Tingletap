
import React, { useState } from 'react';
import SEO from '../seo/SEO';
import { PAGES } from '../seo/seoConfig';
import { useNavigate, Link } from 'react-router-dom';
import { pt } from '../utils/premiumToast';

const LockSVG = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="fpLockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <rect x="5" y="11" width="14" height="10" rx="2.5" fill="url(#fpLockGrad)"/>
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#9333ea" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    <circle cx="12" cy="16" r="1.8" fill="white" opacity="0.9"/>
    <path d="M12 16v2" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
  </svg>
);

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSendResetLink = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { setError('Please enter a valid email address'); return; }

    setSending(true);
    try {
      const resp = await fetch('/.netlify/functions/sendPasswordReset', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), userName: null }),
      });
      if (resp.status === 429) {
        setError('Too many requests. Please wait a few minutes and try again.');
        setSending(false);
        return;
      }
      if (resp.status === 404) {
        // Email not registered
        setError('No account found with this email. Please use your registered login email for password reset.');
        setSending(false);
        return;
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setError(data.error || 'Something went wrong. Please try again.');
        setSending(false);
        return;
      }
      // Success — email sent
      setStep(2);
      pt.success('Password reset link sent! Check your inbox.');
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(145deg, #f8f0ff 0%, #ede4fb 25%, #f3e8ff 50%, #e8d8fa 75%, #f0e6ff 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden',
      position: 'fixed',
      top: 0, left: 0,
      boxSizing: 'border-box'
    }}>
      <SEO
        title={PAGES.forgotPassword.title}
        description={PAGES.forgotPassword.description}
        canonical={PAGES.forgotPassword.canonical}
        robots={PAGES.forgotPassword.robots}
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; }

        @keyframes fpOrb1 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.55; }
          33% { transform: translate(30px,40px) scale(1.08); opacity: 0.75; }
          66% { transform: translate(-20px,20px) scale(0.93); opacity: 0.5; }
        }
        @keyframes fpOrb2 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.45; }
          50% { transform: translate(-35px,-40px) scale(1.12); opacity: 0.65; }
        }
        @keyframes fpOrb3 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.5; }
          50% { transform: translate(22px,-28px) scale(1.15); opacity: 0.7; }
        }
        @keyframes fpShimmerBorder {
          0%,100% { background-position: 400% 0; }
          50% { background-position: -400% 0; }
        }
        @keyframes fpFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fpCardIn {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fpSpin { to { transform: rotate(360deg); } }
        @keyframes fpLogoFloat {
          0%, 100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 12px 28px rgba(139,92,246,0.35)); }
          50% { transform: translateY(-10px) scale(1.03); filter: drop-shadow(0 22px 36px rgba(139,92,246,0.5)); }
        }
        @keyframes fpSuccessBounce {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          80% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        .fp-card {
          background: rgba(255,255,255,0.78);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border-radius: 28px;
          padding: 32px 28px 26px;
          width: 100%;
          max-width: 400px;
          max-height: 98vh;
          overflow-y: auto;
          overflow-x: hidden;
          box-shadow:
            0 32px 80px rgba(139,92,246,0.18),
            0 8px 32px rgba(155,89,208,0.12),
            inset 0 1px 0 rgba(255,255,255,0.9),
            0 0 0 1.5px rgba(192,132,252,0.3);
          border: 1.5px solid rgba(192,132,252,0.25);
          position: relative;
          animation: fpCardIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards;
          scrollbar-width: none;
        }
        .fp-card::-webkit-scrollbar { display: none; }
        .fp-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3.5px;
          background: linear-gradient(90deg, #c084fc, #a855f7, #9333ea, #7c3aed, #c084fc);
          background-size: 400% 100%;
          animation: fpShimmerBorder 4s ease-in-out infinite;
          border-radius: 28px 28px 0 0;
        }

        .fp-logo-wrap { text-align: center; margin-bottom: 22px; }
        .fp-logo-img {
          width: 90px; height: 90px;
          border-radius: 24px;
          object-fit: contain;
          animation: fpLogoFloat 3.5s ease-in-out infinite;
          margin-bottom: 10px;
          border: none; background: none;
        }
        .fp-logo-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 4px;
          letter-spacing: 0.02em;
        }
        .fp-logo-sub { color: #7e6ca8; font-size: 0.82rem; margin: 0; font-weight: 500; }

        .fp-steps {
          display: flex; align-items: center; justify-content: center;
          gap: 0; margin-bottom: 20px;
        }
        .fp-step-circle {
          width: 34px; height: 34px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.82rem;
          transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        .fp-step-active {
          background: linear-gradient(135deg, #9333ea, #c084fc);
          color: white;
          box-shadow: 0 6px 20px rgba(147,51,234,0.38);
        }
        .fp-step-done {
          background: linear-gradient(135deg, #22c55e, #4ade80);
          color: white;
          box-shadow: 0 4px 14px rgba(34,197,94,0.3);
        }
        .fp-step-inactive {
          background: rgba(192,132,252,0.12);
          color: #b09dcc;
          border: 2px solid rgba(192,132,252,0.25);
        }
        .fp-step-line {
          height: 2.5px; width: 60px;
          border-radius: 2px;
          transition: all 0.4s ease;
        }
        .fp-line-active { background: linear-gradient(90deg, #9333ea, #c084fc); }
        .fp-line-inactive { background: rgba(192,132,252,0.2); }

        .fp-step-title {
          font-size: 1.1rem; font-weight: 700;
          color: #3d2565; text-align: center;
          margin-bottom: 6px; letter-spacing: 0.1px;
        }
        .fp-step-desc {
          text-align: center; color: #7e6ca8;
          font-size: 0.82rem; margin-bottom: 18px; line-height: 1.5;
        }

        .fp-group { margin-bottom: 14px; }
        .fp-label {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 7px;
          font-weight: 600; color: #4c366b; font-size: 0.84rem;
        }
        .fp-input {
          width: 100%;
          padding: 13px 16px;
          border: 2px solid rgba(192,132,252,0.25);
          border-radius: 14px;
          font-size: 0.93rem;
          font-family: inherit;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          background: rgba(255,255,255,0.85);
          color: #2d1b4e;
          box-sizing: border-box;
          height: 48px;
          outline: none;
        }
        .fp-input:focus {
          border-color: #a855f7;
          background: rgba(255,255,255,0.98);
          box-shadow: 0 0 0 4px rgba(168,85,247,0.12), 0 4px 16px rgba(168,85,247,0.1);
          transform: translateY(-1px);
        }
        .fp-input::placeholder { color: #b09dcc; }

        .fp-error {
          background: rgba(239,68,68,0.08);
          border: 1.5px solid rgba(239,68,68,0.25);
          color: #dc2626;
          padding: 11px 14px;
          border-radius: 12px;
          font-size: 0.83rem;
          margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
          font-weight: 500;
          animation: fpFadeUp 0.3s ease forwards;
        }

        .fp-btn-primary {
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #9333ea 0%, #a855f7 50%, #c084fc 100%);
          border: none; border-radius: 14px;
          color: white; font-size: 0.95rem; font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          position: relative; overflow: hidden;
          min-height: 50px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 8px 24px rgba(147,51,234,0.3), inset 0 1px 0 rgba(255,255,255,0.25);
          letter-spacing: 0.3px;
          -webkit-tap-highlight-color: transparent;
          margin-bottom: 10px;
        }
        .fp-btn-primary::before {
          content: '';
          position: absolute; top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transition: left 0.5s ease;
        }
        .fp-btn-primary:hover::before { left: 100%; }
        .fp-btn-primary:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 14px 36px rgba(147,51,234,0.38);
        }
        .fp-btn-primary:active { transform: translateY(0) scale(0.99); }
        .fp-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .fp-btn-secondary {
          width: 100%;
          padding: 13px 20px;
          background: rgba(255,255,255,0.6);
          border: 2px solid rgba(192,132,252,0.35);
          border-radius: 14px;
          color: #7c3aed; font-size: 0.9rem; font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          min-height: 48px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          -webkit-tap-highlight-color: transparent;
          backdrop-filter: blur(10px);
          letter-spacing: 0.2px;
        }
        .fp-btn-secondary:hover {
          background: rgba(168,85,247,0.1);
          border-color: #a855f7;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168,85,247,0.18);
          color: #6d28d9;
        }

        .fp-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: fpSpin 0.7s linear infinite;
        }

        .fp-footer {
          text-align: center; margin-top: 18px;
          color: #7e6ca8; font-size: 0.84rem;
        }
        .fp-footer a { color: #9333ea; text-decoration: none; font-weight: 700; }
        .fp-footer a:hover { color: #a855f7; text-decoration: underline; }

        .fp-success-icon {
          width: 80px; height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px;
          box-shadow: 0 12px 36px rgba(34,197,94,0.3);
          animation: fpSuccessBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }

        @media (max-width: 480px) {
          .fp-card { padding: 24px 18px 18px; border-radius: 22px; max-width: 98vw; }
          .fp-logo-title { font-size: 1.8rem; }
          .fp-logo-img { width: 72px; height: 72px; }
          .fp-input { height: 46px; font-size: 16px; }
          .fp-btn-primary, .fp-btn-secondary { min-height: 46px; font-size: 0.88rem; }
        }
      `}</style>

      {/* Floating orbs */}
      <div style={{position:'absolute',width:'420px',height:'420px',borderRadius:'50%',background:'radial-gradient(circle,rgba(192,132,252,.25) 0%,transparent 70%)',top:'-160px',left:'-160px',animation:'fpOrb1 12s ease-in-out infinite',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',width:'300px',height:'300px',borderRadius:'50%',background:'radial-gradient(circle,rgba(216,180,254,.22) 0%,transparent 70%)',bottom:'-100px',right:'-100px',animation:'fpOrb2 15s ease-in-out infinite',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',width:'220px',height:'220px',borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,.2) 0%,transparent 70%)',top:'40%',right:'-80px',animation:'fpOrb3 18s ease-in-out infinite',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',width:'170px',height:'170px',borderRadius:'50%',background:'radial-gradient(circle,rgba(233,213,255,.28) 0%,transparent 70%)',bottom:'12%',left:'-55px',animation:'fpOrb1 10s ease-in-out infinite reverse',pointerEvents:'none',zIndex:0}}/>

      <div className="fp-card" style={{position:'relative',zIndex:1}}>
        {/* Logo */}
        <div className="fp-logo-wrap">
          <img
            src="/tingletap-logo.jpg"
            alt="TingleTap Logo"
            className="fp-logo-img"
          />
          <h1 className="fp-logo-title">TingleTap</h1>
          <p className="fp-logo-sub">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle',marginRight:'5px'}}>
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#c084fc" stroke="#a855f7" strokeWidth="1"/>
            </svg>
            Reset your account password
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle',marginLeft:'5px'}}>
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#c084fc" stroke="#a855f7" strokeWidth="1"/>
            </svg>
          </p>
        </div>

        {/* Step indicator — 2 steps only */}
        <div className="fp-steps">
          <div className={`fp-step-circle ${step === 1 ? 'fp-step-active' : 'fp-step-done'}`}>
            {step > 1
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : '1'}
          </div>
          <div className={`fp-step-line ${step >= 2 ? 'fp-line-active' : 'fp-line-inactive'}`}/>
          <div className={`fp-step-circle ${step === 2 ? 'fp-step-done' : 'fp-step-inactive'}`}>
            {step === 2
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5 9-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : '2'}
          </div>
        </div>

        {/* ─── STEP 1: Enter Email ─── */}
        {step === 1 && (
          <div style={{animation:'fpFadeUp 0.4s ease forwards'}}>
            <h3 className="fp-step-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle',marginRight:'6px'}}>
                <rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="#9333ea" strokeWidth="2"/>
                <path d="M2 8l10 7 10-7" stroke="#9333ea" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Enter Your Email
            </h3>
            <p className="fp-step-desc">
              We'll send a secure password reset link directly to your email
            </p>

            <form onSubmit={handleSendResetLink}>
              <div className="fp-group">
                <label className="fp-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="#a855f7" strokeWidth="2"/>
                    <path d="M2 8l10 7 10-7" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="fp-input"
                  autoComplete="email"
                  required
                />
              </div>

              {error && (
                <div className="fp-error">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
                    <circle cx="12" cy="12" r="10" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="2"/>
                    <path d="M12 7v5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="#ef4444"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="fp-btn-primary" disabled={sending}>
                {sending ? (
                  <><div className="fp-spinner"/><span>Sending Reset Link...</span></>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="white" strokeWidth="2"/>
                      <path d="M2 8l10 7 10-7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            <div className="fp-footer">
              Remembered your password?{' '}
              <Link to="/login">Sign in here</Link>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Success ─── */}
        {step === 2 && (
          <div style={{animation:'fpFadeUp 0.4s ease forwards',textAlign:'center'}}>
            <div className="fp-success-icon">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h3 style={{
              fontFamily:"'Playfair Display', serif",
              fontSize:'1.5rem', fontWeight:800,
              background:'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundClip:'text', margin:'0 0 10px'
            }}>
              Check Your Inbox!
            </h3>

            <div style={{
              background:'rgba(168,85,247,0.06)',
              border:'1.5px solid rgba(168,85,247,0.18)',
              borderRadius:'16px', padding:'16px 14px',
              marginBottom:'18px'
            }}>
              {/* Inline email SVG — renders in Gmail */}
              <table cellPadding="0" cellSpacing="0" style={{margin:'0 auto 10px'}}>
                <tbody>
                  <tr>
                    <td>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                        <defs>
                          <linearGradient id="fpMailSucc" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#c084fc"/>
                            <stop offset="100%" stopColor="#7c3aed"/>
                          </linearGradient>
                        </defs>
                        <rect x="2" y="4" width="20" height="16" rx="3" fill="url(#fpMailSucc)"/>
                        <path d="M2 8l10 7 10-7" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                        <circle cx="18" cy="6" r="4" fill="#22c55e"/>
                        <path d="M16.2 6l1.4 1.4 2.2-2.2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p style={{margin:'0 0 6px',color:'#4c366b',fontSize:'0.9rem',fontWeight:600}}>
                Password reset link sent to:
              </p>
              <p style={{margin:'0 0 8px',color:'#7c3aed',fontWeight:700,fontSize:'0.95rem',wordBreak:'break-all'}}>
                {email}
              </p>
              <p style={{margin:0,color:'#7e6ca8',fontSize:'0.8rem',lineHeight:1.5}}>
                Check your inbox and spam folder. Click the link in the email to set your new password.
              </p>
            </div>

            <div style={{
              background:'rgba(34,197,94,0.06)',
              border:'1.5px solid rgba(34,197,94,0.2)',
              borderRadius:'12px', padding:'12px 14px',
              marginBottom:'18px',
              display:'flex', alignItems:'flex-start', gap:'8px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,marginTop:'1px'}}>
                <circle cx="12" cy="12" r="10" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="2"/>
                <path d="M12 7v5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="#22c55e"/>
              </svg>
              <p style={{margin:0,color:'#166534',fontSize:'0.8rem',lineHeight:1.5,fontWeight:500}}>
                The link will expire in 1 hour. After clicking it, you can set a new password for your account.
              </p>
            </div>

            <button className="fp-btn-primary" onClick={() => navigate('/login')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <polyline points="10 17 15 12 10 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="15" y1="12" x2="3" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Back to Login
            </button>

            <button
              className="fp-btn-secondary"
              onClick={() => { setStep(1); setEmail(''); setError(''); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 3v5h5" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Try Another Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
