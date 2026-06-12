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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700&family=Inter:wght@400;500;600;700;800;900&display=swap');

        .cum-overlay {
          position: fixed; inset: 0; z-index: 9990;
          background: rgba(14,10,40,.52);
          backdrop-filter: blur(7px);
          -webkit-backdrop-filter: blur(7px);
          animation: cumFadeIn .28s ease both;
        }
        @keyframes cumFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .cum-panel {
          position: fixed; left: 0; right: 0; bottom: 0;
          z-index: 9995;
          background: #f8f6ff;
          border-radius: 28px 28px 0 0;
          border-top: 1.5px solid rgba(168,85,247,.18);
          box-shadow: 0 -18px 64px rgba(168,85,247,.22);
          max-height: 80vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          animation: cumSlideUp .38s cubic-bezier(.32,.72,0,1) both;
          font-family: 'Inter', sans-serif;
          padding-bottom: 36px;
        }
        @keyframes cumSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        .cum-handle {
          width: 44px; height: 5px; border-radius: 999px;
          background: rgba(168,85,247,.22);
          margin: 13px auto 0;
        }

        .cum-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 12px;
        }
        .cum-title-row { display: flex; align-items: center; gap: 12px; }
        .cum-icon-wrap {
          width: 46px; height: 46px; border-radius: 14px;
          background: rgba(168,85,247,.12);
          border: 1.5px solid rgba(168,85,247,.2);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .cum-titles h3 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 700; color: #1e1b4b; line-height: 1.1; margin: 0;
        }
        .cum-titles p {
          font-size: 12.5px; color: #6d6b99; margin: 3px 0 0; font-weight: 500;
        }
        .cum-x {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(168,85,247,.09);
          border: 1.5px solid rgba(168,85,247,.2);
          color: #a855f7;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .2s ease; flex-shrink: 0;
        }
        .cum-x:hover { background: rgba(168,85,247,.18); transform: scale(1.08); }

        .cum-sep { height: 1px; background: rgba(168,85,247,.1); margin: 0 20px; }

        .cum-body { padding: 22px 20px 0; display: flex; flex-direction: column; gap: 18px; }

        .cum-desc {
          font-size: 13.5px; color: #6d6b99; line-height: 1.65;
        }

        .cum-field-group { display: flex; flex-direction: column; gap: 6px; }
        .cum-label {
          font-size: 11.5px; font-weight: 800; color: #a855f7;
          opacity: .75; letter-spacing: .09em; text-transform: uppercase;
        }
        .cum-input-wrap { position: relative; }
        .cum-input {
          width: 100%; padding: 13px 52px 13px 14px;
          border-radius: 13px;
          background: rgba(255,255,255,.9);
          border: 1.5px solid rgba(168,85,247,.2);
          font-size: 14.5px; font-family: 'Inter', sans-serif;
          color: #1e1b4b; outline: none;
          transition: border-color .2s, box-shadow .2s;
          box-sizing: border-box;
        }
        .cum-input:focus {
          border-color: #a855f7;
          box-shadow: 0 0 0 3px rgba(168,85,247,.13);
        }
        .cum-count {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%);
          font-size: 11px; color: #c084fc; font-weight: 600;
          pointer-events: none;
        }

        .cum-save-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
          padding: 16px 24px; border-radius: 16px;
          background: linear-gradient(135deg,#a855f7,#7c3aed);
          color: #fff; font-size: 15.5px; font-weight: 800;
          border: none; cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: all .28s ease;
          box-shadow: 0 6px 24px rgba(168,85,247,.38);
        }
        .cum-save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(168,85,247,.52);
        }
        .cum-save-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }
        .cum-save-btn span { color: #fff; }

        .cum-spin {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,.35);
          border-top-color: #fff; border-radius: 50%;
          animation: cumSpin .7s linear infinite; flex-shrink: 0;
        }
        @keyframes cumSpin { to { transform: rotate(360deg); } }

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
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#a855f7">
                <path d="M12,15C12.81,15 13.5,14.7 14.11,14.11C14.7,13.5 15,12.81 15,12C15,11.19 14.7,10.5 14.11,9.89C13.5,9.3 12.81,9 12,9C11.19,9 10.5,9.3 9.89,9.89C9.3,10.5 9,11.19 9,12C9,12.81 9.3,13.5 9.89,14.11C10.5,14.7 11.19,15 12,15M12,2C14.75,2 17.25,3 19.25,5C21.25,7 22.25,9.5 22.25,12C22.25,13.92 21.75,15.7 20.75,17.33L19.33,15.92C19.77,14.67 20,13.36 20,12C20,10 19.27,8.27 17.82,6.82C16.37,5.37 14.63,4.67 12.62,4.67C10.5,4.67 8.73,5.4 7.27,6.87C5.8,8.33 5.06,10.09 5.06,12.14C5.06,14.08 5.74,15.78 7.1,17.24C8.45,18.7 10.17,19.43 12.25,19.43H13V21.93H12C9.25,21.93 6.89,20.93 4.92,18.93C2.97,16.93 2,14.58 2,11.93C2,9.18 3,6.75 5,4.75C7,2.75 9.37,1.75 12,2M22,17V19H19V22H17V19H14V17H17V14H19V17H22Z"/>
              </svg>
            </div>
            <div className="cum-titles">
              <h3>Change Username</h3>
              <p>Edit your display name others see</p>
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
            Choose a unique display name that others will see in chat. Between 2–30 characters.
          </p>

          <div className="cum-field-group">
            <label className="cum-label">New Username</label>
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
              ? <span className="cum-spin" />
              : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3M19,19H5V5H16.17L19,7.83V19M12,12C10.34,12 9,13.34 9,15C9,16.66 10.34,18 12,18C13.66,18 15,16.66 15,15C15,13.34 13.66,12 12,12M6,6H15V10H6V6Z"/>
                </svg>
              )
            }
            <span>{saving ? 'Saving…' : 'Update Username'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default ChangeUsernameModal;
