import React, { useEffect } from 'react';
import EditProfile from './EditProfile';
import './EditProfile.css';

const EditProfileModal = React.memo(({ isOpen, onClose, onSuccess }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes epm3FadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes epm3SlideUp {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .epm3-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          box-sizing: border-box;
          animation: epm3FadeIn 0.18s ease both;
          background: rgba(15, 10, 36, 0.62);
          backdrop-filter: blur(12px) saturate(1.25);
          -webkit-backdrop-filter: blur(12px) saturate(1.25);
        }

        .epm3-card {
          position: relative;
          width: min(500px, calc(100vw - 24px));
          max-height: min(90dvh, 760px);
          display: flex;
          flex-direction: column;
          border-radius: 22px;
          overflow: hidden;
          animation: epm3SlideUp 0.24s cubic-bezier(0.16, 1, 0.3, 1) both;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: linear-gradient(175deg, #ffffff 0%, #f7f4ff 100%);
          border: 1px solid rgba(139, 92, 246, 0.28);
          box-shadow: 0 28px 72px rgba(17, 10, 46, 0.34);
          box-sizing: border-box;
        }

        .epm3-header {
          flex-shrink: 0;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
          border-bottom: 1px solid rgba(139, 92, 246, 0.2);
        }

        .epm3-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7c3aed, #6366f1);
          color: #ffffff;
          box-shadow: 0 6px 16px rgba(109, 40, 217, 0.32);
        }

        .epm3-titles {
          flex: 1;
          min-width: 0;
        }
        .epm3-titles h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #2e1065;
          margin: 0 0 2px;
          line-height: 1.2;
        }
        .epm3-titles p {
          font-size: 11.5px;
          font-weight: 500;
          color: #6b7280;
          margin: 0;
        }

        .epm3-close {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid rgba(124, 58, 237, 0.24) !important;
          background: #ffffff !important;
          color: #6d28d9 !important;
          transition: background 0.15s ease, border-color 0.15s ease;
          flex-shrink: 0;
        }
        .epm3-close:hover {
          background: #ede9fe !important;
          border-color: rgba(124, 58, 237, 0.42) !important;
        }

        .epm3-body {
          overflow-y: auto;
          overflow-x: hidden;
          flex: 1;
          -webkit-overflow-scrolling: touch;
        }
        .epm3-body::-webkit-scrollbar { width: 5px; }
        .epm3-body::-webkit-scrollbar-track { background: transparent; }
        .epm3-body::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.35);
          border-radius: 4px;
        }

        html.dark-mode .epm3-overlay,
        body.dark-mode .epm3-overlay,
        html.dark-theme-variant .epm3-overlay {
          background: rgba(5, 3, 14, 0.78) !important;
        }
        html.dark-mode .epm3-card,
        body.dark-mode .epm3-card,
        html.dark-theme-variant .epm3-card {
          background: linear-gradient(175deg, #16102d 0%, #1c133b 100%) !important;
          border-color: rgba(167, 139, 250, 0.25) !important;
          box-shadow: 0 28px 72px rgba(0, 0, 0, 0.65) !important;
        }
        html.dark-mode .epm3-header,
        body.dark-mode .epm3-header,
        html.dark-theme-variant .epm3-header {
          background: linear-gradient(135deg, #221545 0%, #2d1a5e 100%) !important;
          border-bottom-color: rgba(167, 139, 250, 0.22) !important;
        }
        html.dark-mode .epm3-titles h2,
        body.dark-mode .epm3-titles h2,
        html.dark-theme-variant .epm3-titles h2 {
          color: #f3e8ff !important;
        }
        html.dark-mode .epm3-titles p,
        body.dark-mode .epm3-titles p,
        html.dark-theme-variant .epm3-titles p {
          color: #c4b5fd !important;
        }
        html.dark-mode .epm3-close,
        body.dark-mode .epm3-close,
        html.dark-theme-variant .epm3-close {
          background: rgba(167, 139, 250, 0.14) !important;
          border-color: rgba(167, 139, 250, 0.28) !important;
          color: #e9d5ff !important;
        }
        html.dark-mode .epm3-close:hover,
        body.dark-mode .epm3-close:hover,
        html.dark-theme-variant .epm3-close:hover {
          background: rgba(239, 68, 68, 0.22) !important;
          border-color: rgba(248, 113, 113, 0.4) !important;
          color: #fecaca !important;
        }
      `}</style>

      <div className="epm3-overlay" onClick={onClose}>
        <div
          className="epm3-card"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Profile"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="epm3-header">
            <div className="epm3-icon" aria-hidden="true">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <div className="epm3-titles">
              <h2>Edit Profile</h2>
              <p>Update your photo, identity, and bio</p>
            </div>

            <button type="button" className="epm3-close" onClick={onClose} aria-label="Close">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="epm3-body">
            <EditProfile onClose={onClose} onSuccess={onSuccess} />
          </div>
        </div>
      </div>
    </>
  );
});

export default EditProfileModal;
