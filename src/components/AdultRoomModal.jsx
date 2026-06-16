import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './AdultRoomModal.css';

const AdultRoomModal = ({ isOpen, onConfirm, onCancel, roomName }) => {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [understandingConfirmed, setUnderstandingConfirmed] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (ageConfirmed && understandingConfirmed) {
      if (rememberMe) {
        localStorage.setItem('ageVerified', JSON.stringify({
          verified: true,
          expiry: Date.now() + 30 * 24 * 60 * 60 * 1000
        }));
      }
      onConfirm();
    }
  };

  const canProceed = ageConfirmed && understandingConfirmed;

  const modal = (
    <div className="arm-overlay">
      <div className="arm-card">

        {/* ── Glow orbs ── */}
        <div className="arm-orb arm-orb1" />
        <div className="arm-orb arm-orb2" />

        {/* ── Header ── */}
        <div className="arm-header">
          {/* Big shield icon */}
          <div className="arm-icon-ring">
            <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
              <defs>
                <linearGradient id="sg1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f472b6" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <path d="M32 4L8 14v18c0 14.5 10.3 28 24 31.5C45.7 60 56 46.5 56 32V14L32 4z"
                fill="url(#sg1)" opacity="0.25" />
              <path d="M32 4L8 14v18c0 14.5 10.3 28 24 31.5C45.7 60 56 46.5 56 32V14L32 4z"
                stroke="url(#sg1)" strokeWidth="2.5" fill="none" />
              {/* 18+ text inside shield */}
              <text x="32" y="38" textAnchor="middle" fontFamily="Inter,sans-serif"
                fontWeight="900" fontSize="16" fill="url(#sg1)">18+</text>
            </svg>
          </div>

          <div className="arm-badge-row">
            <span className="arm-badge arm-badge-red">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                <path d="M8 1.5L1.5 4.5v5c0 3.5 2.8 6.8 6.5 7.5 3.7-.7 6.5-4 6.5-7.5v-5L8 1.5z"
                  fill="#fff" opacity=".25" />
                <path d="M8 1.5L1.5 4.5v5c0 3.5 2.8 6.8 6.5 7.5 3.7-.7 6.5-4 6.5-7.5v-5L8 1.5z"
                  stroke="#fff" strokeWidth="1.2" fill="none" />
                <path d="M5.5 8.5l2 2L11 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Adult Room
            </span>
            <span className="arm-badge arm-badge-amber">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                <path d="M8 1l1.8 5H15l-4.4 3.2 1.7 5.3L8 11.3l-4.3 2.9 1.7-5.3L1 5.9h5.2L8 1z" />
              </svg>
              Restricted
            </span>
          </div>

          <h2 className="arm-title">Adult Content Warning</h2>
          <p className="arm-subtitle">
            You are about to enter&nbsp;
            <span className="arm-room-name">
              <svg viewBox="0 0 14 14" width="12" height="12" fill="none" style={{ verticalAlign: 'middle' }}>
                <path d="M7 1L1 4v5c0 2.8 2.5 5.4 6 6 3.5-.6 6-3.2 6-6V4L7 1z"
                  fill="#a855f7" opacity="0.3" />
                <path d="M7 1L1 4v5c0 2.8 2.5 5.4 6 6 3.5-.6 6-3.2 6-6V4L7 1z"
                  stroke="#a855f7" strokeWidth="1.3" fill="none" />
              </svg>
              &nbsp;{roomName}
            </span>
          </p>
        </div>

        {/* ── Notice strip ── */}
        <div className="arm-notice">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="10" cy="10" r="9" stroke="url(#ng1)" strokeWidth="1.8" />
            <defs>
              <linearGradient id="ng1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <path d="M10 6.5v4M10 12.5v1" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p>This room contains mature content for adults 18+ only. All community guidelines remain in effect.</p>
        </div>

        {/* ── Checkboxes ── */}
        <div className="arm-checks">
          <label className={`arm-check-row ${ageConfirmed ? 'arm-checked' : ''}`}>
            <input type="checkbox" checked={ageConfirmed} onChange={e => setAgeConfirmed(e.target.checked)} />
            <span className="arm-checkmark">
              {ageConfirmed && (
                <svg viewBox="0 0 12 12" width="11" height="11" fill="none">
                  <path d="M2 6.5l2.8 2.8 5-5.3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="arm-check-text">
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="6" r="3.5" stroke="#a855f7" strokeWidth="1.5" />
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              I confirm I am <strong>18 years of age or older</strong>
            </span>
          </label>

          <label className={`arm-check-row ${understandingConfirmed ? 'arm-checked' : ''}`}>
            <input type="checkbox" checked={understandingConfirmed} onChange={e => setUnderstandingConfirmed(e.target.checked)} />
            <span className="arm-checkmark">
              {understandingConfirmed && (
                <svg viewBox="0 0 12 12" width="11" height="11" fill="none">
                  <path d="M2 6.5l2.8 2.8 5-5.3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className="arm-check-text">
              <svg viewBox="0 0 16 16" width="15" height="15" fill="none" style={{ flexShrink: 0 }}>
                <path d="M8 1L1.5 4v5.5c0 3.2 2.8 6.2 6.5 7 3.7-.8 6.5-3.8 6.5-7V4L8 1z"
                  stroke="#f472b6" strokeWidth="1.5" fill="none" />
                <path d="M5.5 8.5l2 2L11 6" stroke="#f472b6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              I accept the <strong>content warnings</strong> and community rules
            </span>
          </label>
        </div>

        {/* ── Remember me ── */}
        <label className={`arm-remember ${rememberMe ? 'arm-checked' : ''}`}>
          <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
          <span className="arm-remember-mark">
            {rememberMe && (
              <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                <path d="M2 6.5l2.8 2.8 5-5.3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" style={{ flexShrink: 0 }}>
            <rect x="2.5" y="7" width="11" height="8" rx="1.5" stroke="#7c3aed" strokeWidth="1.4" />
            <path d="M5 7V5a3 3 0 016 0v2" stroke="#7c3aed" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="arm-remember-label">Remember me for <strong>30 days</strong></span>
        </label>

        {/* ── Buttons ── */}
        <div className="arm-actions">
          <button className="arm-btn-cancel" onClick={onCancel}>
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Leave
          </button>

          <button
            className={`arm-btn-enter ${!canProceed ? 'arm-btn-disabled' : ''}`}
            onClick={handleConfirm}
            disabled={!canProceed}
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
              <path d="M10 2L3 5.5v6.5c0 4 3 7.8 7 8.8 4-1 7-4.8 7-8.8V5.5L10 2z"
                fill="currentColor" opacity="0.2" />
              <path d="M7 10.5l2.5 2.5L14 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Enter Room
          </button>
        </div>

        {/* ── Footer ── */}
        <div className="arm-footer">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
            <rect x="2.5" y="7.5" width="11" height="7" rx="1.5" stroke="#9ca3af" strokeWidth="1.3" />
            <path d="M5 7.5V5.5a3 3 0 016 0v2" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="8" cy="11" r="1" fill="#9ca3af" />
          </svg>
          Verification stored locally · never shared with other users
        </div>

      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default AdultRoomModal;
