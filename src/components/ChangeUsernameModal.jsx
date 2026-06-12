import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const ChangeUsernameModal = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState(auth.currentUser?.displayName || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    const val = username.trim();
    if (!val) { toast.error('Username cannot be empty'); return; }
    if (val.length < 2) { toast.error('Minimum 2 characters'); return; }
    if (val.length > 30) { toast.error('Maximum 30 characters'); return; }
    setSaving(true);
    try {
      const user = auth.currentUser;
      await updateProfile(user, { displayName: val });
      await setDoc(doc(db, 'users', user.uid), { displayName: val, updatedAt: new Date().toISOString() }, { merge: true });
      toast.success('✅ Username updated!');
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      toast.error('❌ ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .cum-overlay {
          position: fixed; inset: 0; z-index: 9990;
          background: rgba(14,10,40,.52);
          backdrop-filter: blur(7px); -webkit-backdrop-filter: blur(7px);
          animation: cumFadeIn .28s ease both;
        }
        @keyframes cumFadeIn { from{opacity:0} to{opacity:1} }

        .cum-panel {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 9995;
          background: #f8f6ff;
          border-radius: 28px 28px 0 0;
          border-top: 1.5px solid rgba(168,85,247,.18);
          box-shadow: 0 -18px 64px rgba(168,85,247,.22);
          max-height: 80vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
          animation: cumSlideUp .38s cubic-bezier(.32,.72,0,1) both;
          font-family: 'Inter', sans-serif; padding-bottom: 40px;
        }
        @keyframes cumSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }

        .cum-handle {
          width: 44px; height: 5px; border-radius: 999px;
          background: rgba(168,85,247,.22); margin: 13px auto 0;
        }

        .cum-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 12px;
        }
        .cum-title-row { display: flex; align-items: center; gap: 12px; }
        .cum-icon-wrap {
          width: 46px; height: 46px; border-radius: 14px;
          background: rgba(168,85,247,.12); border: 1.5px solid rgba(168,85,247,.2);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cum-titles h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 700; color: #1e1b4b; line-height: 1.1; margin: 0;
        }
        .cum-titles p { font-size: 12.5px; color: #6d6b99; margin: 3px 0 0; font-weight: 500; }
        .cum-x {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(168,85,247,.09); border: 1.5px solid rgba(168,85,247,.2);
          color: #a855f7; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .2s ease; flex-shrink: 0;
        }
        .cum-x:hover { background: rgba(168,85,247,.18); transform: scale(1.08); }

        .cum-sep { height: 1px; background: rgba(168,85,247,.1); margin: 0 20px; }

        .cum-body { padding: 22px 20px 0; display: flex; flex-direction: column; gap: 20px; }

        .cum-desc { font-size: 13.5px; color: #6d6b99; line-height: 1.65; }

        .cum-field-group { display: flex; flex-direction: column; gap: 6px; }
        .cum-label {
          font-size: 11px; font-weight: 800; color: #a855f7; opacity: .85;
          letter-spacing: .06em; text-transform: uppercase;
          display: flex; align-items: center; gap: 6px;
        }
        .cum-label svg { flex-shrink: 0; }
        .cum-input-wrap { position: relative; }
        .cum-input {
          width: 100%; padding: 13px 52px 13px 14px; border-radius: 13px;
          background: rgba(255,255,255,.9); border: 1.5px solid rgba(168,85,247,.22);
          font-size: 14.5px; font-family: 'Inter', sans-serif; color: #1e1b4b;
          outline: none; transition: border-color .2s, box-shadow .2s; box-sizing: border-box;
        }
        .cum-input:focus { border-color: #a855f7; box-shadow: 0 0 0 3px rgba(168,85,247,.13); }
        .cum-input::placeholder { color: #c084fc; font-weight: 400; }
        .cum-count {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          font-size: 11px; color: #c084fc; font-weight: 700; pointer-events: none;
        }

        .cum-save-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 16px 24px; border-radius: 16px;
          background: linear-gradient(135deg,#a855f7,#7c3aed);
          color: #fff; font-size: 15.5px; font-weight: 800;
          border: none; cursor: pointer; font-family: 'Inter', sans-serif;
          transition: all .28s ease; box-shadow: 0 6px 24px rgba(168,85,247,.38);
        }
        .cum-save-btn:hover:not(:disabled) {
          transform: translateY(-2px); box-shadow: 0 10px 32px rgba(168,85,247,.52);
        }
        .cum-save-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }
        .cum-save-btn span { color: #fff; }

        .cum-spin {
          width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,.32);
          border-top-color: #fff; border-radius: 50%;
          animation: cumSpin .7s linear infinite; flex-shrink: 0;
        }
        @keyframes cumSpin { to{transform:rotate(360deg)} }

        .cum-panel::-webkit-scrollbar { width: 4px; }
        .cum-panel::-webkit-scrollbar-track { background: transparent; }
        .cum-panel::-webkit-scrollbar-thumb { background: rgba(168,85,247,.2); border-radius: 4px; }
      `}</style>

      <div className="cum-overlay" onClick={onClose} />

      <div className="cum-panel" onClick={e => e.stopPropagation()}>
        <div className="cum-handle" />

        <div className="cum-head">
          <div className="cum-title-row">
            <div className="cum-icon-wrap">
              {/* Premium crown icon – clearly visible on lavender */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#a855f7">
                <path d="M5,16L3,5L8.5,10L12,4L15.5,10L21,5L19,16H5M19,19C19,19.55 18.55,20 18,20H6C5.45,20 5,19.55 5,19V18H19V19Z"/>
              </svg>
            </div>
            <div className="cum-titles">
              <h3>Change Username</h3>
              <p>Edit your display name others see in chat</p>
            </div>
          </div>
          <button className="cum-x" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="cum-sep" />

        <div className="cum-body">
          <p className="cum-desc">
            Choose a unique display name between 2–30 characters. This is what other users will see.
          </p>

          <div className="cum-field-group">
            <label className="cum-label">
              {/* At / username icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,15C12.81,15 13.5,14.7 14.11,14.11C14.7,13.5 15,12.81 15,12C15,11.19 14.7,10.5 14.11,9.89C13.5,9.3 12.81,9 12,9C11.19,9 10.5,9.3 9.89,9.89C9.3,10.5 9,11.19 9,12C9,12.81 9.3,13.5 9.89,14.11C10.5,14.7 11.19,15 12,15M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,14.21 19.12,16.21 17.65,17.65C16.21,19.12 14.21,20 12,20Z"/>
              </svg>
              New Username
            </label>
            <div className="cum-input-wrap">
              <input
                className="cum-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your new username"
                maxLength={30}
                autoFocus
              />
              <span className="cum-count">{username.length}/30</span>
            </div>
          </div>

          <button className="cum-save-btn" onClick={handleSave} disabled={saving}>
            {saving
              ? <><span className="cum-spin" /><span>Saving…</span></>
              : <>
                  {/* Premium verified-badge save icon */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.46L12,21L15.4,22.46L17.29,19.29L20.9,18.47L20.56,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
                  </svg>
                  <span>Update Username</span>
                </>
            }
          </button>
        </div>
      </div>
    </>
  );
};

export default ChangeUsernameModal;
