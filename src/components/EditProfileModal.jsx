import React from 'react';
import EditProfile from './EditProfile';
import './EditProfile.css';

const EditProfileModal = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .epm-overlay {
          position: fixed; inset: 0; z-index: 9990;
          background: rgba(14,10,40,.52);
          backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px);
          animation: epmFadeIn .28s ease both;
        }
        @keyframes epmFadeIn { from{opacity:0} to{opacity:1} }

        .epm-panel {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 9995;
          background: #f8f6ff;
          border-radius: 28px 28px 0 0;
          border-top: 1.5px solid rgba(99,102,241,.18);
          box-shadow: 0 -18px 64px rgba(99,102,241,.24);
          max-height: 92vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
          animation: epmSlideUp .38s cubic-bezier(.32,.72,0,1) both;
          font-family: 'Inter', sans-serif;
        }
        @keyframes epmSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }

        .epm-handle {
          width: 44px; height: 5px; border-radius: 999px;
          background: rgba(99,102,241,.22); margin: 13px auto 0;
        }

        .epm-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 12px;
        }
        .epm-title-row { display: flex; align-items: center; gap: 12px; }
        .epm-icon-wrap {
          width: 46px; height: 46px; border-radius: 14px;
          background: rgba(99,102,241,.12); border: 1.5px solid rgba(99,102,241,.18);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .epm-titles h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 700; color: #1e1b4b; line-height: 1.1; margin: 0;
        }
        .epm-titles p { font-size: 12.5px; color: #6d6b99; margin: 3px 0 0; font-weight: 500; }
        .epm-x {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(99,102,241,.09); border: 1.5px solid rgba(99,102,241,.18);
          color: #6366f1; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .2s ease; flex-shrink: 0;
        }
        .epm-x:hover { background: rgba(99,102,241,.18); transform: scale(1.08); }

        .epm-sep { height: 1px; background: rgba(99,102,241,.1); margin: 0 20px; }

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
              {/* Premium pencil-star icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#6366f1">
                <path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z"/>
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

        <EditProfile onClose={onClose} onSuccess={onSuccess} />
      </div>
    </>
  );
};

export default EditProfileModal;
