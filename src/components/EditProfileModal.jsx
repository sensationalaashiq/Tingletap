import React from 'react';
import EditProfile from './EditProfile';
import './EditProfile.css';

const EditProfileModal = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700;1,700&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .epm-overlay {
          position: fixed; inset: 0; z-index: 9990;
          background: rgba(9,6,30,0.75);
          display: flex; align-items: center; justify-content: center;
          padding: 16px; box-sizing: border-box;
          animation: epmFadeIn .22s ease both;
          backdrop-filter: blur(12px) saturate(1.4);
          -webkit-backdrop-filter: blur(12px) saturate(1.4);
        }
        @keyframes epmFadeIn { from{opacity:0} to{opacity:1} }

        .epm-card {
          position: relative; z-index: 9995;
          background: linear-gradient(160deg, #ffffff 0%, #f8f5ff 55%, #f0f4ff 100%);
          border-radius: 26px;
          width: min(440px, 95vw);
          max-height: 90vh;
          overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow:
            0 32px 80px rgba(99,102,241,0.28),
            0 8px 24px rgba(0,0,0,0.18),
            0 0 0 1px rgba(167,139,250,0.2);
          animation: epmPop .32s cubic-bezier(0.34,1.56,0.64,1) both;
          font-family: 'Inter', sans-serif;
        }
        @keyframes epmPop {
          from { opacity:0; transform:scale(0.88) translateY(24px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }

        .epm-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 22px 18px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%);
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }
        .epm-head::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.12) 0%, transparent 60%),
                      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%);
          pointer-events: none;
        }
        .epm-head::after {
          content: '';
          position: absolute; bottom: -1px; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%);
        }

        .epm-title-row { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }

        .epm-icon-wrap {
          width: 48px; height: 48px; border-radius: 15px;
          background: rgba(255,255,255,0.16);
          border: 1.5px solid rgba(255,255,255,0.3);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2);
        }

        .epm-titles h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 700; color: #fff; line-height: 1.1; margin: 0;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .epm-titles p {
          font-size: 12px; color: rgba(255,255,255,0.72); margin: 4px 0 0; font-weight: 400;
          letter-spacing: 0.02em;
        }

        .epm-x {
          position: relative; z-index: 1;
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.25) !important;
          color: #fff !important; display: flex; align-items: center; justify-content: center;
          cursor: pointer !important; transition: all .18s ease; flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .epm-x:hover { background: rgba(255,255,255,0.24); transform: scale(1.1) rotate(90deg); }

        .epm-accent-bar {
          height: 3px;
          background: linear-gradient(90deg, #818cf8 0%, #a78bfa 40%, #c084fc 70%, #f0abfc 100%);
          flex-shrink: 0;
        }

        .epm-body {
          overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch;
        }
        .epm-body::-webkit-scrollbar { width: 4px; }
        .epm-body::-webkit-scrollbar-track { background: transparent; }
        .epm-body::-webkit-scrollbar-thumb { background: rgba(99,102,241,.2); border-radius: 4px; }
        .epm-body::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,.35); }
      `}</style>

      <div className="epm-overlay" onClick={onClose}>
        <div className="epm-card" onClick={e => e.stopPropagation()}>
          <div className="epm-head">
            <div className="epm-title-row">
              <div className="epm-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                  <path d="M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </div>
              <div className="epm-titles">
                <h3>Edit Profile</h3>
                <p>Customize your avatar &amp; personal details</p>
              </div>
            </div>
            <button className="epm-x" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="epm-accent-bar" />

          <div className="epm-body">
            <EditProfile onClose={onClose} onSuccess={onSuccess} />
          </div>
        </div>
      </div>
    </>
  );
};

export default EditProfileModal;
