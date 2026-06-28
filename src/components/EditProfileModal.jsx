import React from 'react';
import EditProfile from './EditProfile';
import './EditProfile.css';

const EditProfileModal = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@300;400;500;600;700&display=swap');

        @keyframes epm2FadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes epm2SlideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes epm2BorderSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes epm2Shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes epm2Pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.06); }
        }
        @keyframes epm2FloatOrb {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-18px) scale(1.08); }
        }

        /* ── Overlay ── */
        .epm2-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
          animation: epm2FadeIn 0.22s ease both;

          /* luxury dark glass backdrop */
          background: radial-gradient(
            ellipse at 30% 20%,
            rgba(88, 28, 135, 0.55) 0%,
            rgba(15, 5, 40, 0.78) 55%,
            rgba(0, 0, 0, 0.88) 100%
          );
          backdrop-filter: blur(22px) saturate(1.4);
          -webkit-backdrop-filter: blur(22px) saturate(1.4);
        }

        /* ── Floating ambient orbs ── */
        .epm2-overlay::before,
        .epm2-overlay::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: epm2FloatOrb 6s ease-in-out infinite;
        }
        .epm2-overlay::before {
          width: 420px; height: 420px;
          top: -80px; left: -80px;
          background: radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%);
        }
        .epm2-overlay::after {
          width: 340px; height: 340px;
          bottom: -60px; right: -60px;
          background: radial-gradient(circle, rgba(217,70,239,0.18) 0%, transparent 70%);
          animation-delay: 3s;
        }

        /* ── Card shell ── */
        .epm2-card {
          position: relative;
          z-index: 2000001;
          width: min(460px, 96vw);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          overflow: hidden;
          animation: epm2SlideUp 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          font-family: 'Inter', sans-serif;

          /* dark glass card */
          background: linear-gradient(
            160deg,
            rgba(30, 15, 60, 0.97) 0%,
            rgba(20, 8, 45, 0.98) 50%,
            rgba(15, 5, 35, 0.99) 100%
          );
          border: 1px solid rgba(167, 139, 250, 0.22);
          box-shadow:
            0 0 0 1px rgba(167, 139, 250, 0.1),
            0 32px 80px rgba(0, 0, 0, 0.7),
            0 8px 32px rgba(124, 58, 237, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            inset 0 -1px 0 rgba(124, 58, 237, 0.15);
        }

        /* ── Spinning gradient border ring ── */
        .epm2-border-ring {
          position: absolute;
          inset: -2px;
          border-radius: 26px;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }
        .epm2-border-ring::before {
          content: '';
          position: absolute;
          inset: -100%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg 210deg,
            #7c3aed 210deg 240deg,
            #a855f7 240deg 270deg,
            #d946ef 270deg 300deg,
            #f59e0b 300deg 330deg,
            #d946ef 330deg 360deg
          );
          animation: epm2BorderSpin 4s linear infinite;
        }
        .epm2-border-ring::after {
          content: '';
          position: absolute;
          inset: 2px;
          border-radius: 24px;
          background: linear-gradient(160deg, rgba(30,15,60,0.97) 0%, rgba(15,5,35,0.99) 100%);
        }

        /* ── Header ── */
        .epm2-header {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          padding: 22px 22px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          background: linear-gradient(
            135deg,
            rgba(124, 58, 237, 0.18) 0%,
            rgba(168, 85, 247, 0.12) 50%,
            rgba(217, 70, 239, 0.08) 100%
          );
          border-bottom: 1px solid rgba(167, 139, 250, 0.14);
        }

        /* gem icon wrapper */
        .epm2-icon {
          width: 50px; height: 50px;
          border-radius: 16px;
          flex-shrink: 0;
          position: relative;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%);
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          box-shadow:
            0 8px 24px rgba(124, 58, 237, 0.55),
            0 0 0 4px rgba(124, 58, 237, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          animation: epm2Pulse 3.5s ease-in-out infinite;
        }

        .epm2-titles { flex: 1; min-width: 0; }
        .epm2-titles h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.18rem;
          font-weight: 700;
          color: #ede9fe;
          margin: 0 0 3px;
          letter-spacing: 0.01em;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .epm2-titles p {
          font-size: 0.7rem;
          font-weight: 500;
          color: rgba(196, 181, 253, 0.7);
          margin: 0;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        /* shimmer badge */
        .epm2-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #fef3c7;
          background: linear-gradient(
            90deg,
            #92400e, #b45309, #d97706, #f59e0b, #d97706, #b45309, #92400e
          );
          background-size: 200% auto;
          animation: epm2Shimmer 2.5s linear infinite;
          border: 1px solid rgba(245, 158, 11, 0.35);
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.25);
        }

        /* close button */
        .epm2-close {
          width: 34px; height: 34px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          border: 1px solid rgba(167, 139, 250, 0.2) !important;
          background: rgba(124, 58, 237, 0.12) !important;
          color: rgba(196, 181, 253, 0.8) !important;
          transition: all 0.18s ease;
          flex-shrink: 0;
          position: absolute;
          top: 18px; right: 18px;
        }
        .epm2-close:hover {
          background: rgba(124, 58, 237, 0.28) !important;
          color: #ede9fe !important;
          border-color: rgba(167, 139, 250, 0.45) !important;
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
        }

        /* ── Accent rule ── */
        .epm2-accent {
          height: 2px;
          flex-shrink: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #7c3aed 20%,
            #a855f7 40%,
            #d946ef 60%,
            #f59e0b 80%,
            transparent 100%
          );
          opacity: 0.75;
        }

        /* ── Scrollable body ── */
        .epm2-body {
          overflow-y: auto;
          flex: 1;
          -webkit-overflow-scrolling: touch;
          position: relative;
          z-index: 1;
        }
        .epm2-body::-webkit-scrollbar { width: 4px; }
        .epm2-body::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        .epm2-body::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #7c3aed, #d946ef);
          border-radius: 4px;
        }

        /* ── Override EditProfile inner styles for dark theme ── */
        .epm2-body .wd-wrap,
        .epm2-body form,
        .epm2-body .ep-wrap {
          background: transparent !important;
          padding: 20px 22px !important;
        }

        .epm2-body .wd-label {
          color: rgba(196, 181, 253, 0.85) !important;
          font-size: 0.72rem !important;
          font-weight: 600 !important;
          letter-spacing: 0.05em !important;
          text-transform: uppercase !important;
        }

        .epm2-body .wd-input,
        .epm2-body .wd-textarea {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(167, 139, 250, 0.22) !important;
          border-radius: 10px !important;
          color: #ede9fe !important;
          font-size: 0.82rem !important;
          padding: 9px 12px !important;
          transition: all 0.18s ease !important;
          backdrop-filter: blur(6px) !important;
        }
        .epm2-body .wd-input:focus,
        .epm2-body .wd-textarea:focus {
          outline: none !important;
          border-color: rgba(167, 139, 250, 0.55) !important;
          background: rgba(124, 58, 237, 0.12) !important;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.18), 0 4px 16px rgba(124, 58, 237, 0.15) !important;
        }
        .epm2-body .wd-input::placeholder,
        .epm2-body .wd-textarea::placeholder {
          color: rgba(167, 139, 250, 0.4) !important;
        }
        .epm2-body select.wd-input {
          background: rgba(255, 255, 255, 0.05) !important;
          color: #ede9fe !important;
        }
        .epm2-body select.wd-input option {
          background: #1e0f3c !important;
          color: #ede9fe !important;
        }

        /* avatar upload area */
        .epm2-body .ep-avatar-section,
        .epm2-body .wd-avatar-section {
          background: rgba(124, 58, 237, 0.08) !important;
          border: 1.5px dashed rgba(167, 139, 250, 0.3) !important;
          border-radius: 16px !important;
        }

        /* save button override */
        .epm2-body .wd-save-btn,
        .epm2-body .ep-save-btn {
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #d946ef 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          color: #fff !important;
          border-radius: 12px !important;
          font-weight: 700 !important;
          font-size: 0.88rem !important;
          padding: 13px 24px !important;
          letter-spacing: 0.04em !important;
          box-shadow: 0 6px 24px rgba(124, 58, 237, 0.5), inset 0 1px 0 rgba(255,255,255,0.18) !important;
          transition: all 0.2s ease !important;
        }
        .epm2-body .wd-save-btn:hover:not(:disabled),
        .epm2-body .ep-save-btn:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 32px rgba(124, 58, 237, 0.65), inset 0 1px 0 rgba(255,255,255,0.2) !important;
        }

        /* section headings */
        .epm2-body .wd-section-heading {
          color: rgba(196, 181, 253, 0.6) !important;
          border-color: rgba(167, 139, 250, 0.15) !important;
        }

        /* dividers */
        .epm2-body hr,
        .epm2-body .wd-divider {
          border-color: rgba(167, 139, 250, 0.12) !important;
        }

        /* image cropper area */
        .epm2-body .ep-crop-overlay,
        .epm2-body .wd-crop-overlay {
          background: rgba(0, 0, 0, 0.9) !important;
          border-radius: 16px !important;
        }

        /* footer info text */
        .epm2-body .wd-hint,
        .epm2-body small {
          color: rgba(167, 139, 250, 0.5) !important;
        }
      `}</style>

      <div className="epm2-overlay" onClick={onClose}>
        <div className="epm2-border-ring" />

        <div className="epm2-card" onClick={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className="epm2-header">

            {/* Gem icon */}
            <div className="epm2-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="epm2G1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f0abfc"/>
                    <stop offset="50%" stopColor="#c084fc"/>
                    <stop offset="100%" stopColor="#fde68a"/>
                  </linearGradient>
                </defs>
                {/* Diamond / gem shape */}
                <path fill="url(#epm2G1)"
                  d="M6 2h12l4 6-10 14L2 8l4-6zM4.5 8l7.5 10.5L19.5 8H4.5zM8 8h8L12 3.5 8 8zm-2.5 0L7 4.5H4L2.5 8H5.5zm11 0h3l-1.5-3.5H14l1.5 3.5z"
                />
                <circle cx="12" cy="8" r="1.8" fill="rgba(255,255,255,0.6)"/>
              </svg>
            </div>

            <div className="epm2-titles">
              <h2>Edit Profile</h2>
              <p>Customize your identity</p>
            </div>

            <div className="epm2-badge">Premium</div>

            <button className="epm2-close" onClick={onClose} aria-label="Close">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* ── Accent bar ── */}
          <div className="epm2-accent"/>

          {/* ── Form body ── */}
          <div className="epm2-body">
            <EditProfile onClose={onClose} onSuccess={onSuccess}/>
          </div>

        </div>
      </div>
    </>
  );
};

export default EditProfileModal;
