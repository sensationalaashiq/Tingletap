
import React, { useState } from 'react';
import './AdultRoomModal.css';

const AdultRoomModal = ({ isOpen, onConfirm, onCancel, roomName }) => {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [understandingConfirmed, setUnderstandingConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (ageConfirmed && understandingConfirmed) onConfirm();
  };

  const canProceed = ageConfirmed && understandingConfirmed;

  return (
    <div className="arm-overlay">
      <div className="arm-card">

        {/* Header */}
        <div className="arm-header">
          <div className="arm-icon-wrap">
            <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
              <defs>
                <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa"/>
                  <stop offset="100%" stopColor="#7c3aed"/>
                </linearGradient>
              </defs>
              <path d="M20 3L5 9v10c0 9.4 6.4 18.2 15 20.4C29.6 37.2 35 28.4 35 19V9L20 3z" fill="url(#shieldGrad)" opacity="0.15"/>
              <path d="M20 3L5 9v10c0 9.4 6.4 18.2 15 20.4C29.6 37.2 35 28.4 35 19V9L20 3z" stroke="url(#shieldGrad)" strokeWidth="2" fill="none"/>
              <path d="M14 20l4 4 8-8" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="arm-badge">18+</div>
          <h2 className="arm-title">Adult Content</h2>
          <p className="arm-subtitle">
            Entering <span className="arm-room-name">{roomName}</span>
          </p>
        </div>

        {/* Notice */}
        <div className="arm-notice">
          <div className="arm-notice-icon">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#a78bfa" strokeWidth="1.5"/>
              <path d="M10 6v5M10 13.5v.5" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <p>This room contains mature content for users 18+ only. All community guidelines still apply.</p>
        </div>

        {/* Checkboxes */}
        <div className="arm-checks">
          <label className={`arm-check-row ${ageConfirmed ? 'checked' : ''}`}>
            <input type="checkbox" checked={ageConfirmed} onChange={e => setAgeConfirmed(e.target.checked)}/>
            <span className="arm-checkmark">
              {ageConfirmed && (
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span className="arm-check-text">I am <strong>18 years of age or older</strong></span>
          </label>

          <label className={`arm-check-row ${understandingConfirmed ? 'checked' : ''}`}>
            <input type="checkbox" checked={understandingConfirmed} onChange={e => setUnderstandingConfirmed(e.target.checked)}/>
            <span className="arm-checkmark">
              {understandingConfirmed && (
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span className="arm-check-text">I accept the <strong>content warnings</strong> above</span>
          </label>
        </div>

        {/* Actions */}
        <div className="arm-actions">
          <button className="arm-btn-cancel" onClick={onCancel}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Cancel
          </button>
          <button className={`arm-btn-confirm ${!canProceed ? 'arm-disabled' : ''}`} onClick={handleConfirm} disabled={!canProceed}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <path d="M8 2L2 4.5v5c0 3.8 2.6 7.4 6 8.5 3.4-1.1 6-4.7 6-8.5v-5L8 2z" fill="currentColor" opacity="0.2"/>
              <path d="M5 8l2.5 2.5L11 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Enter Room
          </button>
        </div>

        {/* Footer */}
        <div className="arm-footer">
          <svg viewBox="0 0 14 14" width="11" height="11" fill="none">
            <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="#a78bfa" strokeWidth="1.3"/>
            <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Confirmation stored locally · never shared
        </div>

      </div>
    </div>
  );
};

export default AdultRoomModal;
