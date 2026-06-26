import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import './BanKickModal.css';

/* ── SVG icons ───────────────────────────────────────────────────────────── */
const BanSVG = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="2" fill="rgba(239,68,68,0.08)"/>
    <path d="M5.64 5.64l12.72 12.72" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const KickSVG = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M16 17v-3H9v-4h7V7l5 5-5 5z" fill="#f59e0b"/>
    <path d="M14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z" fill="#f59e0b"/>
  </svg>
);

const AlertSVG = ({ color = '#ef4444' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M12 8v5" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx="12" cy="16.5" r="1.2" fill={color}/>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth="1.7" fill="none"/>
  </svg>
);

const PersonSVG = ({ color = '#6366f1' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2"/>
  </svg>
);

const CalSVG = ({ color = '#10b981' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2"/>
    <path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const ClockSVG = ({ color = '#f59e0b' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
    <path d="M12 7v5l3 2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IdSVG = ({ color = '#8b5cf6' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="2"/>
    <path d="M7 9h10M7 13h6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const RoomSVG = ({ color = '#d97706' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round"/>
    <path d="M9 22V12h6v10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MailSVG = ({ color = '#6d28d9' }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth="2"/>
    <path d="M22 6l-10 7L2 6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const ShieldSVG = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M12 2l9 4v6c0 5-4 9-9 10C3 21 3 16 3 12V6l9-4z" fill="#7c3aed" opacity="0.9"/>
  </svg>
);

/* ── Format helpers ──────────────────────────────────────────────────────── */
const fmtDate = (date) => {
  if (!date) return 'N/A';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'N/A'; }
};

const fmtCountdown = (ms) => {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

/* ── Component ───────────────────────────────────────────────────────────── */
const BanKickModal = ({ isVisible, onClose, banInfo: passedBanInfo, kickInfo: passedKickInfo }) => {
  const [banInfo, setBanInfo]             = useState(null);
  const [kickInfo, setKickInfo]           = useState(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [currentRoomName, setCurrentRoomName] = useState('Chat Room');
  const [kickMsLeft, setKickMsLeft]       = useState(0);

  /* -- room name lookup -- */
  useEffect(() => {
    const stored = localStorage.getItem('currentRoomName') || sessionStorage.getItem('currentRoomName');
    if (stored) setCurrentRoomName(stored);
    const roomId = window.location.pathname.split('/room/')[1];
    if (roomId) {
      getDoc(doc(db, 'rooms', roomId)).then(snap => {
        if (snap.exists()) {
          const name = snap.data().name || 'Chat Room';
          setCurrentRoomName(name);
          localStorage.setItem('currentRoomName', name);
        }
      }).catch(() => {});
    }
  }, []);

  /* -- aggressive body/event lock for bans -- */
  useEffect(() => {
    const isBanModal = !!passedBanInfo;
    if (isVisible && isBanModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';

      const blockKb = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
      const blockMouse = (e) => { if (!e.target.closest('.ban-kick-modal-overlay')) { e.preventDefault(); e.stopPropagation(); return false; } };
      const blockNav = (e) => { e.preventDefault(); e.returnValue = 'Account is suspended'; return 'Account is suspended'; };
      const blockSpecial = (e) => {
        if (['F5','F12'].includes(e.key) || (e.ctrlKey && ['r','u'].includes(e.key)) || (e.ctrlKey && e.shiftKey && ['I','J'].includes(e.key))) {
          e.preventDefault(); e.stopPropagation(); return false;
        }
      };

      document.addEventListener('keydown',  blockKb, true);
      document.addEventListener('keyup',    blockKb, true);
      document.addEventListener('keypress', blockKb, true);
      document.addEventListener('click',    blockMouse, true);
      document.addEventListener('mousedown',blockMouse, true);
      document.addEventListener('mouseup',  blockMouse, true);
      document.addEventListener('contextmenu', blockMouse, true);
      document.addEventListener('keydown',  blockSpecial, true);
      window.addEventListener('beforeunload', blockNav, true);

      const forceStyle = () => {
        const el = document.querySelector('.ban-kick-modal-overlay');
        if (el) {
          Object.assign(el.style, { zIndex: '2147483647', position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', display: 'flex', visibility: 'visible', opacity: '1', pointerEvents: 'all', backgroundColor: 'rgba(10,5,30,0.92)' });
        }
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.userSelect = 'none';
        document.body.style.pointerEvents = 'none';
      };
      forceStyle();
      const iv = setInterval(forceStyle, 10);

      window._bkmHandlers = { blockKb, blockMouse, blockNav, blockSpecial };
      window._bkmInterval = iv;

    } else {
      if (window._bkmInterval) { clearInterval(window._bkmInterval); window._bkmInterval = null; }
      if (window._bkmHandlers) {
        const h = window._bkmHandlers;
        document.removeEventListener('keydown',  h.blockKb, true);
        document.removeEventListener('keyup',    h.blockKb, true);
        document.removeEventListener('keypress', h.blockKb, true);
        document.removeEventListener('click',    h.blockMouse, true);
        document.removeEventListener('mousedown',h.blockMouse, true);
        document.removeEventListener('mouseup',  h.blockMouse, true);
        document.removeEventListener('contextmenu',h.blockMouse, true);
        document.removeEventListener('keydown',  h.blockSpecial, true);
        window.removeEventListener('beforeunload',h.blockNav, true);
        window._bkmHandlers = null;
      }
      document.body.style.cssText = '';
    }
    return () => {
      if (window._bkmInterval) { clearInterval(window._bkmInterval); window._bkmInterval = null; }
      if (window._bkmHandlers) {
        const h = window._bkmHandlers;
        document.removeEventListener('keydown',  h.blockKb, true);
        document.removeEventListener('keyup',    h.blockKb, true);
        document.removeEventListener('keypress', h.blockKb, true);
        document.removeEventListener('click',    h.blockMouse, true);
        document.removeEventListener('mousedown',h.blockMouse, true);
        document.removeEventListener('mouseup',  h.blockMouse, true);
        document.removeEventListener('contextmenu',h.blockMouse, true);
        document.removeEventListener('keydown',  h.blockSpecial, true);
        window.removeEventListener('beforeunload',h.blockNav, true);
        window._bkmHandlers = null;
      }
      document.body.style.cssText = '';
    };
  }, [isVisible, passedBanInfo]);

  /* -- sync info from props -- */
  useEffect(() => {
    if (isVisible) {
      if (passedBanInfo)  setBanInfo(passedBanInfo);
      if (passedKickInfo) setKickInfo(passedKickInfo);
      setIsLoading(false);
    } else {
      setBanInfo(null);
      setKickInfo(null);
      setIsLoading(true);
    }
  }, [isVisible, passedBanInfo, passedKickInfo]);

  useEffect(() => {
    if (isVisible && (passedBanInfo || passedKickInfo)) setIsLoading(false);
  }, [isVisible, passedBanInfo, passedKickInfo]);

  /* -- kick countdown timer -- */
  useEffect(() => {
    if (!kickInfo) { setKickMsLeft(0); return; }
    const KICK_DURATION = 60 * 60 * 1000;
    const computeLeft = () => {
      const at = kickInfo.kickedAt instanceof Date ? kickInfo.kickedAt : new Date(kickInfo.kickedAt);
      const expires = at.getTime() + KICK_DURATION;
      return Math.max(0, expires - Date.now());
    };
    setKickMsLeft(computeLeft());
    const iv = setInterval(() => setKickMsLeft(computeLeft()), 1000);
    return () => clearInterval(iv);
  }, [kickInfo]);

  if (!isVisible) return null;

  const uid = auth.currentUser?.uid;

  return (
    <div
      className="ban-kick-modal-overlay"
      style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:2147483647, display:'flex', alignItems:'center', justifyContent:'center', visibility:'visible', opacity:1, pointerEvents:'all', userSelect:'none' }}
      onContextMenu={(e) => e.preventDefault()}
      onSelectStart={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="ban-kick-modal">

        {/* ── BAN MODAL ── */}
        {banInfo && (
          <>
            <div className="ban-header">
              <div className="bkm-icon-bubble ban"><BanSVG /></div>
              <div>
                <p className="bkm-title">Account Suspended</p>
                <p className="bkm-subtitle">Your access to TingleTap has been restricted</p>
              </div>
            </div>

            <div className="bkm-body">
              <div className="bkm-field">
                <div className="bkm-field-icon red"><AlertSVG color="#ef4444" /></div>
                <div>
                  <div className="bkm-field-label">Reason</div>
                  <div className="bkm-field-value danger">{banInfo.reason || 'Violation of community guidelines'}</div>
                </div>
              </div>
              <div className="bkm-field">
                <div className="bkm-field-icon blue"><PersonSVG color="#6366f1" /></div>
                <div>
                  <div className="bkm-field-label">Actioned By</div>
                  <div className="bkm-field-value">{banInfo.bannedBy || 'System Administrator'}</div>
                </div>
              </div>
              <div className="bkm-field">
                <div className="bkm-field-icon green"><CalSVG color="#10b981" /></div>
                <div>
                  <div className="bkm-field-label">Date</div>
                  <div className="bkm-field-value">{banInfo.bannedAt ? fmtDate(new Date(banInfo.bannedAt)) : fmtDate(new Date())}</div>
                </div>
              </div>
              <div className="bkm-field">
                <div className="bkm-field-icon purple"><IdSVG color="#8b5cf6" /></div>
                <div>
                  <div className="bkm-field-label">User ID</div>
                  <div className="bkm-field-value mono">{uid ? `${uid.slice(0,18)}…` : 'N/A'}</div>
                </div>
              </div>
              {banInfo.email && (
                <div className="bkm-field">
                  <div className="bkm-field-icon purple"><MailSVG color="#7c3aed" /></div>
                  <div>
                    <div className="bkm-field-label">Email</div>
                    <div className="bkm-field-value">{banInfo.email}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bkm-appeal">
              <p className="bkm-appeal-title">
                <ShieldSVG /> Appeal your suspension
              </p>
              <p className="bkm-appeal-text">
                If you believe this is a mistake, contact us at{' '}
                <span className="bkm-appeal-email">admin@tingleapp.com</span>
                {' '}and include your User ID above.
              </p>
            </div>

            <div className="bkm-footer">
              <button className="bkm-btn-primary ban-btn" onClick={() => alert('Your account remains suspended. Contact admin@tingleapp.com for assistance.')}>
                I Understand
              </button>
              <button className="bkm-btn-secondary" onClick={() => {
                const reason = banInfo.reason || 'Unknown';
                const email  = auth.currentUser?.email || banInfo.email || 'Not Available';
                const body   = `Hello Admin,\n\nI am appealing my ban on TingleTap.\n\nUser ID: ${uid || 'N/A'}\nEmail: ${email}\nReason given: ${reason}\n\nReason for appeal:\n[Please explain your situation here]\n\nThank you.`;
                window.open(`mailto:admin@tingleapp.com?subject=${encodeURIComponent('Account Ban Appeal – TingleTap')}&body=${encodeURIComponent(body)}`, '_blank');
              }}>
                <MailSVG color="#7c3aed" /> Appeal
              </button>
            </div>
          </>
        )}

        {/* ── KICK MODAL ── */}
        {kickInfo && !banInfo && (
          <>
            <div className="kick-header">
              <div className="bkm-icon-bubble kick"><KickSVG /></div>
              <div>
                <p className="bkm-title">Kicked from Room</p>
                <p className="bkm-subtitle">You have been removed from {kickInfo.roomName || currentRoomName}</p>
              </div>
            </div>

            <div className="bkm-body">
              <div className="bkm-field">
                <div className="bkm-field-icon amber"><RoomSVG color="#d97706" /></div>
                <div>
                  <div className="bkm-field-label">Room</div>
                  <div className="bkm-field-value room">{kickInfo.roomName || currentRoomName}</div>
                </div>
              </div>
              <div className="bkm-field">
                <div className="bkm-field-icon blue"><PersonSVG color="#6366f1" /></div>
                <div>
                  <div className="bkm-field-label">Kicked By</div>
                  <div className="bkm-field-value">{kickInfo.kickedBy || 'Moderator'}</div>
                </div>
              </div>
              <div className="bkm-field">
                <div className="bkm-field-icon amber"><AlertSVG color="#d97706" /></div>
                <div>
                  <div className="bkm-field-label">Reason</div>
                  <div className="bkm-field-value">{kickInfo.reason || 'Kicked by a moderator'}</div>
                </div>
              </div>
              <div className="bkm-field">
                <div className="bkm-field-icon green"><CalSVG color="#10b981" /></div>
                <div>
                  <div className="bkm-field-label">When</div>
                  <div className="bkm-field-value">{fmtDate(kickInfo.kickedAt)}</div>
                </div>
              </div>
            </div>

            {kickMsLeft > 0 && (
              <div className="bkm-countdown">
                <ClockSVG color="#b45309" />
                <span className="bkm-countdown-label">You can rejoin in</span>
                <span className="bkm-countdown-time">{fmtCountdown(kickMsLeft)}</span>
              </div>
            )}

            <div className="bkm-appeal">
              <p className="bkm-appeal-title"><ShieldSVG /> What happens next?</p>
              <p className="bkm-appeal-text">You can rejoin once the kick expires. Please follow the room rules to avoid future actions. If you think this was a mistake, contact <span className="bkm-appeal-email">admin@tingleapp.com</span>.</p>
            </div>

            <div className="bkm-footer">
              <button className="bkm-btn-primary kick-btn" onClick={() => { if (onClose) onClose(); }}>
                Back to Room List
              </button>
            </div>
          </>
        )}

        {/* ── LOADING ── */}
        {isLoading && (
          <>
            <div className="loading-header">
              <div className="bkm-icon-bubble loading"><div className="bkm-spinner" /></div>
              <div>
                <p className="bkm-title">Checking status…</p>
                <p className="bkm-subtitle">Please wait a moment</p>
              </div>
            </div>
          </>
        )}

        {/* ── GENERIC ACCESS DENIED ── */}
        {!isLoading && !banInfo && !kickInfo && (
          <>
            <div className="ban-header">
              <div className="bkm-icon-bubble ban"><BanSVG /></div>
              <div>
                <p className="bkm-title">Access Restricted</p>
                <p className="bkm-subtitle">Unable to access the requested service</p>
              </div>
            </div>
            <div className="bkm-body">
              <div className="bkm-field">
                <div className="bkm-field-icon red"><AlertSVG /></div>
                <div>
                  <div className="bkm-field-label">Status</div>
                  <div className="bkm-field-value danger">Access Denied</div>
                </div>
              </div>
              <div className="bkm-field">
                <div className="bkm-field-icon purple"><IdSVG /></div>
                <div>
                  <div className="bkm-field-label">User ID</div>
                  <div className="bkm-field-value mono">{uid ? `${uid.slice(0,18)}…` : `SEC_${Date.now().toString().slice(-8)}`}</div>
                </div>
              </div>
            </div>
            <div className="bkm-appeal">
              <p className="bkm-appeal-title"><ShieldSVG /> Contact Support</p>
              <p className="bkm-appeal-text">For assistance email <span className="bkm-appeal-email">admin@tingleapp.com</span> and include your User ID.</p>
            </div>
            <div className="bkm-footer">
              <button className="bkm-btn-primary ban-btn" onClick={() => { if (onClose) onClose(); window.location.href = '/welcome'; }}>
                I Understand
              </button>
              <button className="bkm-btn-secondary" onClick={() => {
                const body = `Hello Admin,\n\nI am experiencing access restrictions on TingleTap.\n\nUser ID: ${uid || 'N/A'}\nDate: ${new Date().toLocaleDateString()}\n\nPlease help me resolve this.`;
                window.open(`mailto:admin@tingleapp.com?subject=${encodeURIComponent('Access Restriction – TingleTap')}&body=${encodeURIComponent(body)}`, '_blank');
              }}>
                <MailSVG color="#7c3aed" /> Contact Support
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default BanKickModal;
