import React from 'react';
import EditProfile from './EditProfile';

const EditProfileModal = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700&family=Inter:wght@400;500;600;700;800;900&display=swap');

        .epm-overlay {
          position: fixed;
          inset: 0;
          z-index: 9990;
          background: rgba(14,10,40,.52);
          backdrop-filter: blur(7px);
          -webkit-backdrop-filter: blur(7px);
          animation: epmFadeIn .28s ease both;
        }
        @keyframes epmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .epm-panel {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          z-index: 9995;
          background: #f8f6ff;
          border-radius: 28px 28px 0 0;
          border-top: 1.5px solid rgba(99,102,241,.18);
          box-shadow: 0 -18px 64px rgba(99,102,241,.24);
          max-height: 92vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          animation: epmSlideUp .38s cubic-bezier(.32,.72,0,1) both;
          font-family: 'Inter', sans-serif;
        }
        @keyframes epmSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        .epm-handle {
          width: 44px; height: 5px;
          border-radius: 999px;
          background: rgba(99,102,241,.22);
          margin: 13px auto 0;
        }

        .epm-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 12px;
        }
        .epm-title-row {
          display: flex; align-items: center; gap: 12px;
        }
        .epm-icon-wrap {
          width: 46px; height: 46px; border-radius: 14px;
          background: rgba(99,102,241,.12);
          border: 1.5px solid rgba(99,102,241,.18);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .epm-titles h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 700;
          color: #1e1b4b; line-height: 1.1; margin: 0;
        }
        .epm-titles p {
          font-size: 12.5px; color: #6d6b99; margin: 3px 0 0; font-weight: 500;
        }
        .epm-x {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(99,102,241,.09);
          border: 1.5px solid rgba(99,102,241,.18);
          color: #6366f1;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .2s ease; flex-shrink: 0;
        }
        .epm-x:hover { background: rgba(99,102,241,.18); transform: scale(1.08); }

        .epm-sep {
          height: 1px; background: rgba(99,102,241,.1); margin: 0 20px;
        }

        .epm-body { padding: 0; }

        /* ── Strip EditProfile.jsx card chrome ── */
        .epm-body .modern-edit-profile {
          background: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          max-width: 100% !important;
          width: 100% !important;
        }
        .epm-body .profile-header {
          background: linear-gradient(135deg,#5b5bd6 0%,#7c3aed 50%,#a855f7 100%) !important;
          border-radius: 20px !important;
          margin: 16px 16px 0 !important;
        }
        .epm-body .avatar-section {
          background: transparent !important;
        }
        .epm-body .form-container {
          background: transparent !important;
        }
        .epm-body .action-section {
          background: transparent !important;
          padding-bottom: 36px !important;
          border-top: 1px solid rgba(99,102,241,.1) !important;
        }
        .epm-body .modern-input,
        .epm-body .modern-select,
        .epm-body .modern-textarea {
          border: 1.5px solid rgba(99,102,241,.18) !important;
          background: rgba(255,255,255,.9) !important;
          border-radius: 13px !important;
          color: #1e1b4b !important;
        }
        .epm-body .modern-input:focus,
        .epm-body .modern-select:focus,
        .epm-body .modern-textarea:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,.12) !important;
          transform: none !important;
        }
        .epm-body .primary-btn {
          background: linear-gradient(135deg,#5b5bd6,#7c3aed,#a855f7) !important;
          box-shadow: 0 6px 24px rgba(91,91,214,.38) !important;
          border-radius: 16px !important;
          text-transform: none !important;
          letter-spacing: 0 !important;
          font-size: 15.5px !important;
          font-weight: 800 !important;
        }
        .epm-body .primary-btn:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 32px rgba(91,91,214,.52) !important;
        }
        .epm-body .secondary-btn {
          background: rgba(255,255,255,.88) !important;
          border: 2px solid rgba(99,102,241,.25) !important;
          color: #3b0764 !important;
          border-radius: 16px !important;
          text-transform: none !important;
          letter-spacing: 0 !important;
          font-size: 15.5px !important;
          font-weight: 700 !important;
        }
        .epm-body .secondary-btn:hover {
          background: #fff !important;
          border-color: rgba(99,102,241,.45) !important;
          transform: translateY(-1px) !important;
        }
        .epm-body .profile-avatar {
          border-color: rgba(255,255,255,.7) !important;
        }

        /* Scrollbar */
        .epm-panel::-webkit-scrollbar { width: 4px; }
        .epm-panel::-webkit-scrollbar-track { background: transparent; }
        .epm-panel::-webkit-scrollbar-thumb { background: rgba(99,102,241,.22); border-radius: 4px; }
      `}</style>

      <div className="epm-overlay" onClick={onClose} />

      <div className="epm-panel" onClick={e => e.stopPropagation()}>
        <div className="epm-handle" />

        <div className="epm-head">
          <div className="epm-title-row">
            <div className="epm-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#6366f1">
                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
              </svg>
            </div>
            <div className="epm-titles">
              <h3>Edit Profile</h3>
              <p>Update your avatar &amp; personal info</p>
            </div>
          </div>
          <button className="epm-x" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="epm-sep" />

        <div className="epm-body">
          <EditProfile onClose={onClose} onSuccess={onSuccess} />
        </div>
      </div>
    </>
  );
};

export default EditProfileModal;
