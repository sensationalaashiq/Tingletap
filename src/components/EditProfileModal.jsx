import React from 'react';
import EditProfile from './EditProfile';
import './EditProfile.css';

const EditProfileModal = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        @keyframes epm3FadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes epm3SlideUp {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes epm3BorderSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes epm3Shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        /* ── Overlay ── */
        .epm3-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
          animation: epm3FadeIn 0.2s ease both;
          background: rgba(109, 40, 217, 0.18);
          backdrop-filter: blur(18px) saturate(1.5);
          -webkit-backdrop-filter: blur(18px) saturate(1.5);
        }

        /* ── Card ── */
        .epm3-card {
          position: relative;
          z-index: 2000001;
          width: min(460px, 96vw);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          overflow: hidden;
          animation: epm3SlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          font-family: 'Inter', sans-serif;
          background: linear-gradient(160deg, #faf8ff 0%, #f3effe 45%, #ede9fe 100%);
          box-shadow:
            0 0 0 1px rgba(167, 139, 250, 0.35),
            0 28px 70px rgba(109, 40, 217, 0.22),
            0 8px 24px rgba(167, 139, 250, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        /* spinning gradient border ring */
        .epm3-ring {
          position: absolute;
          inset: -2px;
          border-radius: 26px;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }
        .epm3-ring::before {
          content: '';
          position: absolute;
          inset: -100%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg 200deg,
            #a78bfa 200deg 240deg,
            #c084fc 240deg 270deg,
            #e879f9 270deg 310deg,
            #a78bfa 310deg 360deg
          );
          animation: epm3BorderSpin 3.5s linear infinite;
        }
        .epm3-ring::after {
          content: '';
          position: absolute;
          inset: 2px;
          border-radius: 24px;
          background: linear-gradient(160deg, #faf8ff 0%, #ede9fe 100%);
        }

        /* ── Header ── */
        .epm3-header {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          padding: 20px 20px 15px;
          display: flex;
          align-items: center;
          gap: 13px;
          background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 55%, #c4b5fd 100%);
          border-bottom: 1px solid rgba(167, 139, 250, 0.3);
        }
        .epm3-header::after {
          content: '';
          position: absolute;
          bottom: 0; left: 50%;
          transform: translateX(-50%);
          width: 48px; height: 2.5px;
          background: linear-gradient(90deg, #a78bfa, #7c3aed, #a78bfa);
          border-radius: 2px;
          animation: epm3Shimmer 2s linear infinite;
          background-size: 200% auto;
        }

        /* icon box */
        .epm3-icon {
          width: 48px; height: 48px;
          border-radius: 15px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #7c3aed, #9333ea, #a855f7);
          border: 1.5px solid rgba(255, 255, 255, 0.35);
          box-shadow:
            0 6px 20px rgba(124, 58, 237, 0.45),
            0 0 0 3px rgba(196, 181, 253, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .epm3-titles { flex: 1; min-width: 0; }
        .epm3-titles h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.12rem;
          font-weight: 700;
          color: #3b0764;
          margin: 0 0 2px;
          letter-spacing: 0.01em;
        }
        .epm3-titles p {
          font-size: 0.68rem;
          font-weight: 500;
          color: #7c3aed;
          margin: 0;
          opacity: 0.75;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* close button */
        .epm3-close {
          width: 32px; height: 32px;
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          border: 1.5px solid rgba(167, 139, 250, 0.35) !important;
          background: rgba(255, 255, 255, 0.55) !important;
          color: #7c3aed !important;
          transition: all 0.18s ease;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.12);
        }
        .epm3-close:hover {
          background: rgba(255, 255, 255, 0.85) !important;
          border-color: rgba(124, 58, 237, 0.5) !important;
          transform: scale(1.08) rotate(90deg);
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.22);
        }

        /* ── Accent bar ── */
        .epm3-accent {
          height: 2.5px;
          flex-shrink: 0;
          background: linear-gradient(
            90deg,
            #818cf8 0%, #a78bfa 25%, #c084fc 50%, #e879f9 75%, #c084fc 100%
          );
          background-size: 200% auto;
          animation: epm3Shimmer 2.5s linear infinite;
        }

        /* ── Body ── */
        .epm3-body {
          overflow-y: auto;
          flex: 1;
          -webkit-overflow-scrolling: touch;
        }
        .epm3-body::-webkit-scrollbar { width: 4px; }
        .epm3-body::-webkit-scrollbar-track { background: rgba(196, 181, 253, 0.1); }
        .epm3-body::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #a78bfa, #7c3aed);
          border-radius: 4px;
        }
      `}</style>

      <div className="epm3-overlay" onClick={onClose}>
        <div className="epm3-ring" />
        <div className="epm3-card" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="epm3-header">
            <div className="epm3-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="epm3G" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f0abfc"/>
                    <stop offset="50%" stopColor="#a78bfa"/>
                    <stop offset="100%" stopColor="#67e8f9"/>
                  </linearGradient>
                </defs>
                <path fill="white" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                <circle cx="18.5" cy="5.5" r="4" fill="url(#epm3G)"/>
                <path fill="white" d="M18 5.5h1V4h-1v1.5zm0 1.5h1V5.5h-1V7z" opacity=".9"/>
              </svg>
            </div>

            <div className="epm3-titles">
              <h2>Edit Profile</h2>
              <p>Customise your avatar &amp; details</p>
            </div>

            <button className="epm3-close" onClick={onClose} aria-label="Close">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Shimmer accent */}
          <div className="epm3-accent"/>

          {/* Form */}
          <div className="epm3-body">
            <EditProfile onClose={onClose} onSuccess={onSuccess}/>
          </div>

        </div>
      </div>
    </>
  );
};

export default EditProfileModal;
