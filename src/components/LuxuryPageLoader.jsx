import React from 'react';

const LuxuryPageLoader = ({ message = 'Loading Experience…', subtitle = 'Connecting to TingleTap Luxury Chat' }) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, rgba(139, 92, 246, 0.25) 0%, rgba(236, 72, 153, 0.15) 35%, rgba(15, 10, 35, 0.98) 100%), #0c0721',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden'
    }}>
      {/* Background Animated Gradient Mesh */}
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(236, 72, 153, 0.2) 50%, transparent 70%)',
        filter: 'blur(70px)',
        animation: 'luxOrbFloat 8s ease-in-out infinite alternate',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '380px',
        height: '380px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.28) 0%, rgba(14, 165, 233, 0.15) 50%, transparent 70%)',
        filter: 'blur(60px)',
        animation: 'luxOrbFloat2 10s ease-in-out infinite alternate',
        pointerEvents: 'none'
      }} />

      {/* Main Glass Card */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 44px',
        borderRadius: '28px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 0 40px rgba(168, 85, 247, 0.25)',
        maxWidth: '380px',
        width: '90%',
        textAlign: 'center'
      }}>
        {/* Animated Brand Ring */}
        <div style={{
          position: 'relative',
          width: '76px',
          height: '76px',
          marginBottom: '22px'
        }}>
          {/* Outer glowing aura */}
          <div style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a855f7, #ec4899, #3b82f6)',
            filter: 'blur(10px)',
            opacity: 0.7,
            animation: 'luxPulse 2.5s ease-in-out infinite'
          }} />
          {/* Spinning Ring */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#f43f5e',
            borderRightColor: '#a855f7',
            borderBottomColor: '#38bdf8',
            borderLeftColor: '#fbbf24',
            animation: 'luxSpin 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite'
          }} />
          {/* Center Logo */}
          <div style={{
            position: 'absolute',
            inset: '6px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #1e1035, #2d124d)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <img
              src="/tingletap-logo.jpg"
              alt="TingleTap"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Brand Name */}
        <h2 style={{
          margin: '0 0 6px 0',
          fontSize: '22px',
          fontWeight: '800',
          fontFamily: "'Cormorant Garamond', serif",
          letterSpacing: '0.04em',
          background: 'linear-gradient(135deg, #ffffff 20%, #e0e7ff 50%, #f472b6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          TingleTap
        </h2>

        {/* Message */}
        <p style={{
          margin: '0 0 6px 0',
          fontSize: '14.5px',
          fontWeight: '600',
          color: '#f8fafc',
          letterSpacing: '0.01em'
        }}>
          {message}
        </p>

        {/* Subtitle */}
        <p style={{
          margin: 0,
          fontSize: '12px',
          color: 'rgba(216, 180, 254, 0.75)',
          letterSpacing: '0.02em'
        }}>
          {subtitle}
        </p>

        {/* Animated Colorful Dots */}
        <div style={{
          display: 'flex',
          gap: '6px',
          marginTop: '16px',
          alignItems: 'center'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#ec4899',
            boxShadow: '0 0 8px #ec4899',
            animation: 'luxDot 1.4s ease-in-out infinite 0s'
          }} />
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#a855f7',
            boxShadow: '0 0 8px #a855f7',
            animation: 'luxDot 1.4s ease-in-out infinite 0.2s'
          }} />
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#38bdf8',
            boxShadow: '0 0 8px #38bdf8',
            animation: 'luxDot 1.4s ease-in-out infinite 0.4s'
          }} />
        </div>
      </div>

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes luxSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes luxPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes luxOrbFloat {
          0% { transform: translate(-30px, -20px) scale(0.95); }
          100% { transform: translate(30px, 30px) scale(1.1); }
        }
        @keyframes luxOrbFloat2 {
          0% { transform: translate(25px, 20px) scale(1.05); }
          100% { transform: translate(-25px, -30px) scale(0.9); }
        }
        @keyframes luxDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LuxuryPageLoader;
