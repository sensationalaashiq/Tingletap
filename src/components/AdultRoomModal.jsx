
import React, { useState } from 'react';
import './AdultRoomModal.css';

const AdultRoomModal = ({ isOpen, onConfirm, onCancel, roomName }) => {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [understandingConfirmed, setUnderstandingConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (ageConfirmed && understandingConfirmed) {
      onConfirm();
    }
  };

  const canProceed = ageConfirmed && understandingConfirmed;

  return (
    <div className="adult-modal-overlay">
      <div className="adult-modal-container">
        {/* Warning Header */}
        <div className="adult-modal-header">
          <div className="warning-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none">
              <defs>
                <linearGradient id="warningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b6b"/>
                  <stop offset="100%" stopColor="#e74c3c"/>
                </linearGradient>
              </defs>
              <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z" fill="url(#warningGrad)"/>
            </svg>
          </div>
          <h2 className="adult-modal-title">
            <span className="age-badge">18+</span>
            Adult Content Warning
          </h2>
          <p className="adult-modal-subtitle">
            You are about to enter: <strong>{roomName}</strong>
          </p>
        </div>

        {/* Warning Content */}
        <div className="adult-modal-content">
          <div className="warning-box">
            <div className="warning-text">
              <h3>⚠️ Important Notice</h3>
              <p>
                This room contains adult content and discussions intended for users 18 years of age or older. 
                By proceeding, you acknowledge that:
              </p>
              <ul className="warning-list">
                <li>You are at least 18 years old</li>
                <li>You understand this room may contain mature content</li>
                <li>You are not offended by adult discussions</li>
                <li>You accept responsibility for your participation</li>
                <li>All community guidelines still apply</li>
              </ul>
            </div>
          </div>

          {/* Confirmation Checkboxes */}
          <div className="confirmation-section">
            <label className="confirmation-checkbox">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
              />
              <span className="checkmark"></span>
              <span className="checkbox-text">
                I confirm that I am <strong>18 years of age or older</strong>
              </span>
            </label>

            <label className="confirmation-checkbox">
              <input
                type="checkbox"
                checked={understandingConfirmed}
                onChange={(e) => setUnderstandingConfirmed(e.target.checked)}
              />
              <span className="checkmark"></span>
              <span className="checkbox-text">
                I understand and accept the <strong>content warnings</strong> above
              </span>
            </label>
          </div>

          {/* Legal Disclaimer */}
          <div className="legal-disclaimer">
            <p>
              <strong>Legal Disclaimer:</strong> By entering this room, you certify that you are of legal age 
              in your jurisdiction and that accessing adult content is legal where you reside. TingleTap 
              assumes no responsibility for users misrepresenting their age.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="adult-modal-actions">
          <button className="cancel-btn" onClick={onCancel}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
            Cancel
          </button>
          <button 
            className={`confirm-btn ${!canProceed ? 'disabled' : ''}`}
            onClick={handleConfirm}
            disabled={!canProceed}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            Enter Adult Room
          </button>
        </div>

        {/* Privacy Notice */}
        <div className="privacy-notice">
          <p>
            🔒 Your privacy is important. This confirmation is stored locally and not shared with other users.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdultRoomModal;
