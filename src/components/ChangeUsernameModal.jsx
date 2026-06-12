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
      toast.success('Username updated!');
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSave(); };

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
          font-family: 'Inter', sans-serif; padding-bottom: 44px;
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
          display: flex; align-items: center; gap: 7px;
        }
        .cum-titles p {
          font-size: 12.5px; color: #6d6b99; margin: 4px 0 0; font-weight: 500;
          display: flex; align-items: center; gap: 5px;
        }
        .cum-x {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(168,85,247,.09); border: 1.5px solid rgba(168,85,247,.2);
          color: #a855f7; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .2s ease; flex-shrink: 0;
        }
        .cum-x:hover { background: rgba(168,85,247,.18); transform: scale(1.08); }

        .cum-sep { height: 1px; background: rgba(168,85,247,.1); margin: 0 20px; }

        .cum-body { padding: 20px 20px 0; display: flex; flex-direction: column; gap: 18px; }

        .cum-desc {
          font-size: 13px; color: #6d6b99; line-height: 1.65;
          display: flex; align-items: flex-start; gap: 7px;
          background: rgba(168,85,247,.06); border-radius: 12px; padding: 11px 13px;
          border: 1px solid rgba(168,85,247,.1);
        }
        .cum-desc-icon { flex-shrink: 0; margin-top: 1px; }

        .cum-field-group { display: flex; flex-direction: column; gap: 6px; }
        .cum-label {
          font-size: 11px; font-weight: 800; color: #a855f7; opacity: .85;
          letter-spacing: .06em; text-transform: uppercase;
          display: flex; align-items: center; gap: 6px;
        }
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

        .cum-hint {
          font-size: 11.5px; color: #a855f7; opacity: .7; font-weight: 500;
          display: flex; align-items: center; gap: 5px; margin-top: -6px;
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
              {/* Crown icon – premium, visible on lavender */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#a855f7">
                <path d="M5,16L3,5L8.5,10L12,4L15.5,10L21,5L19,16H5M19,19C19,19.55 18.55,20 18,20H6C5.45,20 5,19.55 5,19V18H19V19Z"/>
              </svg>
            </div>
            <div className="cum-titles">
              <h3>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#a855f7" style={{opacity:.75}}>
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,17V16H9V14H13V13H10A1,1 0 0,1 9,12V9A1,1 0 0,1 10,8H11V7H13V8H15V10H11V11H14A1,1 0 0,1 15,12V15A1,1 0 0,1 14,16H13V17H11Z"/>
                </svg>
                Change Username
              </h3>
              <p>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#c084fc">
                  <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/>
                </svg>
                What others see in chat
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#c084fc">
                  <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/>
                </svg>
              </p>
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

          {/* Description card with icon */}
          <div className="cum-desc">
            <svg className="cum-desc-icon" width="16" height="16" viewBox="0 0 24 24" fill="#a855f7">
              <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>
            <span>Pick a unique name between <strong>2–30 characters</strong>. It will update across all your chats instantly.</span>
          </div>

          {/* Username field */}
          <div className="cum-field-group">
            <label className="cum-label">
              {/* At-sign / username icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,15C12.81,15 13.5,14.7 14.11,14.11C14.7,13.5 15,12.81 15,12C15,11.19 14.7,10.5 14.11,9.89C13.5,9.3 12.81,9 12,9C11.19,9 10.5,9.3 9.89,9.89C9.3,10.5 9,11.19 9,12C9,12.81 9.3,13.5 9.89,14.11C10.5,14.7 11.19,15 12,15M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,14.21 19.12,16.21 17.65,17.65C16.21,19.12 14.21,20 12,20Z"/>
              </svg>
              New Username
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{opacity:.5}}>
                <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"/>
              </svg>
            </label>
            <div className="cum-input-wrap">
              <input
                className="cum-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter new username…"
                maxLength={30}
                autoFocus
              />
              <span className="cum-count">{username.length}/30</span>
            </div>
            <div className="cum-hint">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z"/>
              </svg>
              Press Enter to save quickly
            </div>
          </div>

          {/* Save button — premium floppy-disk icon (universal save symbol) */}
          <button className="cum-save-btn" onClick={handleSave} disabled={saving}>
            {saving
              ? <><span className="cum-spin" /><span>Saving…</span></>
              : <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3M19,19H5V5H16.17L19,7.83V19M12,12C10.34,12 9,13.34 9,15C9,16.66 10.34,18 12,18C13.66,18 15,16.66 15,15C15,13.34 13.66,12 12,12M6,6H15V10H6V6Z"/>
                  </svg>
                  <span>Update Username</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{opacity:.7}}>
                    <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
                  </svg>
                </>
            }
          </button>

        </div>
      </div>
    </>
  );
};

export default ChangeUsernameModal;
