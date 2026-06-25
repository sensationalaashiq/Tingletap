import React from 'react';
import EditProfile from './EditProfile';
import './EditProfile.css';

const EditProfileModal = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;500;600;700;800&display=swap');

        @keyframes epmFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes epmPop {
          from { opacity:0; transform:scale(0.9) translateY(20px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }

        .epm-overlay {
          position:fixed; inset:0; z-index:9990;
          background:rgba(15,5,45,0.55);
          display:flex; align-items:center; justify-content:center;
          padding:12px; box-sizing:border-box;
          animation:epmFadeIn .2s ease both;
          backdrop-filter:blur(14px) saturate(1.3);
          -webkit-backdrop-filter:blur(14px) saturate(1.3);
        }

        .epm-card {
          position:relative; z-index:9995;
          background:linear-gradient(160deg,#faf8ff 0%,#f3effe 50%,#ede9fe 100%);
          border-radius:20px;
          width:min(420px,95vw);
          max-height:88vh;
          overflow:hidden;
          display:flex; flex-direction:column;
          box-shadow:
            0 24px 64px rgba(109,40,217,.26),
            0 0 0 1px rgba(196,181,253,.5),
            inset 0 1px 0 rgba(255,255,255,.9);
          animation:epmPop .28s cubic-bezier(0.34,1.56,0.64,1) both;
          font-family:'Inter',sans-serif;
        }

        /* ── Header ── */
        .epm-head {
          background:linear-gradient(135deg,#ede9fe 0%,#ddd6fe 60%,#c4b5fd 100%);
          padding:13px 14px 11px;
          display:flex; align-items:center; gap:11px;
          flex-shrink:0; position:relative;
          border-bottom:1px solid rgba(196,181,253,.35);
        }
        .epm-head::after {
          content:'';
          position:absolute; bottom:0; left:50%; transform:translateX(-50%);
          width:40px; height:2.5px;
          background:linear-gradient(90deg,#a78bfa,#7c3aed,#a78bfa);
          border-radius:2px;
        }

        .epm-icon-wrap {
          width:42px; height:42px; border-radius:13px; flex-shrink:0;
          background:linear-gradient(135deg,#7c3aed,#6d28d9,#a855f7);
          border:1.5px solid rgba(255,255,255,.28);
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 16px rgba(124,58,237,.4), 0 0 0 3px rgba(167,139,250,.18),
                     inset 0 1px 0 rgba(255,255,255,.2);
        }

        .epm-titles { flex:1; }
        .epm-titles h3 {
          font-family:'Playfair Display',serif;
          font-size:.97rem; font-weight:700; color:#3b0764;
          margin:0 0 1px; letter-spacing:.02em;
        }
        .epm-titles p {
          font-size:.67rem; color:#6d28d9; opacity:.72;
          margin:0; font-weight:500;
        }

        .epm-x {
          width:28px; height:28px; border-radius:8px; flex-shrink:0;
          background:rgba(167,139,250,.14);
          border:1px solid rgba(167,139,250,.28) !important;
          color:#6d28d9 !important;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer !important; transition:all .15s ease;
          position:absolute; top:11px; right:12px;
        }
        .epm-x:hover { background:rgba(167,139,250,.28); transform:scale(1.08) rotate(90deg); }

        .epm-accent-bar {
          height:2.5px; flex-shrink:0;
          background:linear-gradient(90deg,#818cf8 0%,#a78bfa 40%,#c084fc 70%,#f0abfc 100%);
        }

        .epm-body {
          overflow-y:auto; flex:1;
          -webkit-overflow-scrolling:touch;
        }
        .epm-body::-webkit-scrollbar { width:3px; }
        .epm-body::-webkit-scrollbar-thumb { background:rgba(167,139,250,.28); border-radius:3px; }
      `}</style>

      <div className="epm-overlay" onClick={onClose}>
        <div className="epm-card" onClick={e => e.stopPropagation()}>

          {/* ── Header ── */}
          <div className="epm-head">
            <div className="epm-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="epmG" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f0abfc"/>
                    <stop offset="50%" stopColor="#a78bfa"/>
                    <stop offset="100%" stopColor="#67e8f9"/>
                  </linearGradient>
                </defs>
                <path fill="white" d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                <circle cx="19" cy="5" r="4" fill="url(#epmG)"/>
                <path fill="white" d="M18 5h1V3.5h-1V5zm0 1.5h1V5.5h-1V6.5z" opacity=".9"/>
              </svg>
            </div>
            <div className="epm-titles">
              <h3>Edit Profile</h3>
              <p>Customise your avatar &amp; details</p>
            </div>
            <button className="epm-x" onClick={onClose} aria-label="Close">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="epm-accent-bar"/>

          <div className="epm-body">
            <EditProfile onClose={onClose} onSuccess={onSuccess}/>
          </div>

        </div>
      </div>
    </>
  );
};

export default EditProfileModal;
