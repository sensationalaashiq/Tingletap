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
          background: rgba(0,0,0,0.62);
          display: flex; align-items: center; justify-content: center;
          padding: 16px; box-sizing: border-box;
          animation: epmFadeIn .22s ease both;
          backdrop-filter: blur(6px);
        }
        @keyframes epmFadeIn { from{opacity:0} to{opacity:1} }

        .epm-card {
          position: relative; z-index: 9995;
          background: #fff;
          border-radius: 22px;
          width: min(420px, 94vw);
          max-height: 88vh;
          overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow:
            0 8px 48px rgba(99,102,241,0.22),
            0 2px 14px rgba(0,0,0,0.14);
          border: 1px solid rgba(99,102,241,0.14);
          animation: epmPop .28s cubic-bezier(0.34,1.56,0.64,1) both;
          font-family: 'Inter', sans-serif;
        }
        @keyframes epmPop {
          from { opacity:0; transform:scale(0.92) translateY(16px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }

        .epm-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 20px 14px;
          background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
          flex-shrink: 0;
        }

        .epm-title-row { display: flex; align-items: center; gap: 12px; }

        .epm-icon-wrap {
          width: 44px; height: 44px; border-radius: 13px;
          background: rgba(255,255,255,0.18);
          border: 1.5px solid rgba(255,255,255,0.28);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .epm-titles h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 700; color: #fff; line-height: 1.1; margin: 0;
        }
        .epm-titles p {
          font-size: 12px; color: rgba(255,255,255,0.75); margin: 3px 0 0; font-weight: 400;
        }

        .epm-x {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.28);
          color: #fff; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .18s ease; flex-shrink: 0;
        }
        .epm-x:hover { background: rgba(255,255,255,0.28); transform: scale(1.08); }

        .epm-body {
          overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch;
        }
        .epm-body::-webkit-scrollbar { width: 4px; }
        .epm-body::-webkit-scrollbar-track { background: transparent; }
        .epm-body::-webkit-scrollbar-thumb { background: rgba(99,102,241,.22); border-radius: 4px; }
      `}</style>

      <div className="epm-overlay" onClick={onClose}>
        <div className="epm-card" onClick={e => e.stopPropagation()}>
          <div className="epm-head">
            <div className="epm-title-row">
              <div className="epm-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                  <path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z"/>
                </svg>
              </div>
              <div className="epm-titles">
                <h3>Edit Profile</h3>
                <p>Update your avatar &amp; personal info</p>
              </div>
            </div>
            <button className="epm-x" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="epm-body">
            <EditProfile onClose={onClose} onSuccess={onSuccess} />
          </div>
        </div>
      </div>
    </>
  );
};

export default EditProfileModal;
