import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import './BanKickModal.css';

/* ── Format helpers ────────────────────────────────────────────── */
const fmtDate = (date) => {
  if (!date) return 'N/A';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'N/A'; }
};

const fmtCountdown = (ms) => {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

/* ── SVG Icons ─────────────────────────────────────────────────── */
const IconBan = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="16" stroke="#ef4444" strokeWidth="2.2" fill="rgba(239,68,68,0.08)"/>
    <path d="M7 7l22 22" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M18 10a8 8 0 1 1 0 16 8 8 0 0 1 0-16z" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.4"/>
  </svg>
);

const IconKick = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="16" stroke="#f59e0b" strokeWidth="2.2" fill="rgba(245,158,11,0.08)"/>
    <path d="M22 23v-4H14v-6h8V9l7 7-7 7z" fill="#f59e0b"/>
    <path d="M20 4a3 3 0 0 1 3 3v3h-3V7H10v22h10v-3h3v3a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h10z" fill="#f59e0b" opacity="0.7"/>
  </svg>
);

const IconShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M12 2l9 4v6c0 5-4 9-9 10C3 21 3 16 3 12V6l9-4z" fill="#a78bfa"/>
  </svg>
);

const IconClock = ({ color = '#f59e0b', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
    <path d="M12 7v5l3 2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconUser = ({ color = '#a78bfa', size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2"/>
  </svg>
);

const IconMail = ({ color = '#818cf8', size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth="2"/>
    <path d="M22 6l-10 7L2 6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconAlert = ({ color = '#ef4444', size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 8v5" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx="12" cy="16.5" r="1.2" fill={color}/>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth="1.7" fill="none"/>
  </svg>
);

const IconCalendar = ({ color = '#34d399', size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2"/>
    <path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconRoom = ({ color = '#fbbf24', size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round"/>
    <path d="M9 22V12h6v10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconId = ({ color = '#a78bfa', size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="2"/>
    <path d="M7 9h10M7 13h6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconBot = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="7" y="10" width="10" height="9" rx="2" stroke="#f59e0b" strokeWidth="1.8"/>
    <path d="M9 10V8a3 3 0 0 1 6 0v2" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="10" cy="14" r="1" fill="#f59e0b"/>
    <circle cx="14" cy="14" r="1" fill="#f59e0b"/>
    <path d="M10 18h4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 4v2" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

/* ── Info Row ────────────────────────────────────────────────────── */
const InfoRow = ({ icon, label, children, accent }) => (
  <div className="bkm2-row">
    <div className="bkm2-row-icon" style={{ background: `${accent}14`, border: `1px solid ${accent}28` }}>
      {icon}
    </div>
    <div className="bkm2-row-body">
      <div className="bkm2-row-label">{label}</div>
      <div className="bkm2-row-value">{children}</div>
    </div>
  </div>
);

/* ── Component ───────────────────────────────────────────────────── */
const BanKickModal = ({ isVisible, onClose, banInfo: passedBanInfo, kickInfo: passedKickInfo }) => {
  const [banInfo, setBanInfo]           = useState(null);
  const [kickInfo, setKickInfo]         = useState(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [currentRoomName, setCurrentRoomName] = useState('Chat Room');
  const [kickMsLeft, setKickMsLeft]     = useState(0);
  const [banMsLeft, setBanMsLeft]       = useState(0);
  const [understood, setUnderstood]     = useState(false);

  const user = auth.currentUser;
  const displayName = user?.displayName || 'User';
  const email       = user?.email || banInfo?.email || '';
  const uid         = user?.uid || '';

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

  /* -- body lock for bans -- */
  useEffect(() => {
    const isBan = !!passedBanInfo;
    if (isVisible && isBan) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';

      const blockKb    = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
      const blockMouse = (e) => { if (!e.target.closest('.bkm2-overlay')) { e.preventDefault(); e.stopPropagation(); return false; } };
      const blockNav   = (e) => { e.preventDefault(); e.returnValue = 'Account is suspended'; return 'Account is suspended'; };
      const blockSpec  = (e) => {
        if (['F5','F12'].includes(e.key) || (e.ctrlKey && ['r','u'].includes(e.key)) || (e.ctrlKey && e.shiftKey && ['I','J'].includes(e.key))) {
          e.preventDefault(); e.stopPropagation(); return false;
        }
      };

      document.addEventListener('keydown',   blockKb,    true);
      document.addEventListener('keyup',     blockKb,    true);
      document.addEventListener('keypress',  blockKb,    true);
      document.addEventListener('click',     blockMouse, true);
      document.addEventListener('mousedown', blockMouse, true);
      document.addEventListener('mouseup',   blockMouse, true);
      document.addEventListener('contextmenu', blockMouse, true);
      document.addEventListener('keydown',   blockSpec,  true);
      window.addEventListener('beforeunload', blockNav,  true);

      const forceStyle = () => {
        const el = document.querySelector('.bkm2-overlay');
        if (el) Object.assign(el.style, { zIndex:'2147483647', position:'fixed', top:'0', left:'0', width:'100vw', height:'100vh', display:'flex', visibility:'visible', opacity:'1', pointerEvents:'all' });
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.userSelect = 'none';
        document.body.style.pointerEvents = 'none';
      };
      forceStyle();
      const iv = setInterval(forceStyle, 10);
      window._bkmHandlers = { blockKb, blockMouse, blockNav, blockSpec };
      window._bkmInterval = iv;
    } else {
      if (window._bkmInterval) { clearInterval(window._bkmInterval); window._bkmInterval = null; }
      if (window._bkmHandlers) {
        const h = window._bkmHandlers;
        document.removeEventListener('keydown',   h.blockKb,    true);
        document.removeEventListener('keyup',     h.blockKb,    true);
        document.removeEventListener('keypress',  h.blockKb,    true);
        document.removeEventListener('click',     h.blockMouse, true);
        document.removeEventListener('mousedown', h.blockMouse, true);
        document.removeEventListener('mouseup',   h.blockMouse, true);
        document.removeEventListener('contextmenu',h.blockMouse,true);
        document.removeEventListener('keydown',   h.blockSpec,  true);
        window.removeEventListener('beforeunload', h.blockNav,  true);
        window._bkmHandlers = null;
      }
      document.body.style.cssText = '';
    }
    return () => {
      if (window._bkmInterval) { clearInterval(window._bkmInterval); window._bkmInterval = null; }
      if (window._bkmHandlers) {
        const h = window._bkmHandlers;
        document.removeEventListener('keydown',   h.blockKb,    true);
        document.removeEventListener('keyup',     h.blockKb,    true);
        document.removeEventListener('keypress',  h.blockKb,    true);
        document.removeEventListener('click',     h.blockMouse, true);
        document.removeEventListener('mousedown', h.blockMouse, true);
        document.removeEventListener('mouseup',   h.blockMouse, true);
        document.removeEventListener('contextmenu',h.blockMouse,true);
        document.removeEventListener('keydown',   h.blockSpec,  true);
        window.removeEventListener('beforeunload', h.blockNav,  true);
        window._bkmHandlers = null;
      }
      document.body.style.cssText = '';
    };
  }, [isVisible, passedBanInfo]);

  /* -- sync props -- */
  useEffect(() => {
    if (isVisible) {
      if (passedBanInfo)  setBanInfo(passedBanInfo);
      if (passedKickInfo) setKickInfo(passedKickInfo);
      setIsLoading(false);
    } else {
      setBanInfo(null);
      setKickInfo(null);
      setIsLoading(true);
      setUnderstood(false);
    }
  }, [isVisible, passedBanInfo, passedKickInfo]);

  useEffect(() => {
    if (isVisible && (passedBanInfo || passedKickInfo)) setIsLoading(false);
  }, [isVisible, passedBanInfo, passedKickInfo]);

  /* -- kick countdown -- */
  useEffect(() => {
    if (!kickInfo) { setKickMsLeft(0); return; }
    const KICK_DUR = kickInfo.kickDuration || 60 * 60 * 1000;
    const compute = () => {
      const at = kickInfo.kickedAt instanceof Date ? kickInfo.kickedAt : new Date(kickInfo.kickedAt || kickInfo.time || Date.now());
      return Math.max(0, at.getTime() + KICK_DUR - Date.now());
    };
    setKickMsLeft(compute());
    const iv = setInterval(() => setKickMsLeft(compute()), 1000);
    return () => clearInterval(iv);
  }, [kickInfo]);

  /* -- ban countdown (timed bans) -- */
  useEffect(() => {
    if (!banInfo?.banUntil) { setBanMsLeft(0); return; }
    const compute = () => Math.max(0, new Date(banInfo.banUntil).getTime() - Date.now());
    setBanMsLeft(compute());
    const iv = setInterval(() => setBanMsLeft(compute()), 1000);
    return () => clearInterval(iv);
  }, [banInfo]);

  if (!isVisible) return null;

  const isByBot = (who) => who && (who.toLowerCase().includes('tinglebot') || who.toLowerCase().includes('automod') || who.toLowerCase().includes('system'));

  return (
    <div className="bkm2-overlay" onContextMenu={e => e.preventDefault()} onSelectStart={e => e.preventDefault()} onDragStart={e => e.preventDefault()}>

      {/* ── BAN MODAL ──────────────────────────────────── */}
      {banInfo && (
        <div className="bkm2-card bkm2-card--ban">

          {/* Glowing top bar */}
          <div className="bkm2-topbar bkm2-topbar--ban" />

          {/* Header */}
          <div className="bkm2-header">
            <div className="bkm2-icon-ring bkm2-icon-ring--ban">
              <IconBan />
            </div>
            <div>
              <div className="bkm2-heading bkm2-heading--ban">Account Suspended</div>
              <div className="bkm2-subheading">Your access to TingleTap has been restricted</div>
            </div>
          </div>

          {/* User Identity Card */}
          <div className="bkm2-user-card">
            <div className="bkm2-avatar">
              {getInitials(displayName)}
            </div>
            <div className="bkm2-user-info">
              <div className="bkm2-username">{displayName}</div>
              {email && <div className="bkm2-email"><IconMail size={11} color="#818cf8" /> {email}</div>}
              <div className="bkm2-uid"><IconId size={11} color="#a78bfa" /> {uid ? `${uid.slice(0,20)}…` : 'N/A'}</div>
            </div>
            <div className="bkm2-status-badge bkm2-status-badge--banned">BANNED</div>
          </div>

          {/* Info rows */}
          <div className="bkm2-body">
            <InfoRow icon={<IconAlert color="#ef4444" />} label="Reason" accent="#ef4444">
              <span className="bkm2-pill bkm2-pill--red">{banInfo.reason || 'Violation of community guidelines'}</span>
            </InfoRow>
            <InfoRow icon={<IconUser color="#a78bfa" />} label="Actioned By" accent="#a78bfa">
              {isByBot(banInfo.bannedBy) ? (
                <span className="bkm2-pill bkm2-pill--amber"><IconBot size={11} /> {banInfo.bannedBy}</span>
              ) : (
                <span className="bkm2-val">{banInfo.bannedBy || 'Administrator'}</span>
              )}
            </InfoRow>
            <InfoRow icon={<IconCalendar color="#34d399" />} label="Date" accent="#34d399">
              <span className="bkm2-val">{banInfo.bannedAt ? fmtDate(new Date(banInfo.bannedAt)) : fmtDate(new Date())}</span>
            </InfoRow>
            <InfoRow icon={<IconClock color="#f59e0b" />} label="Duration" accent="#f59e0b">
              <span className={`bkm2-pill ${banInfo.banUntil ? 'bkm2-pill--amber' : 'bkm2-pill--red'}`}>
                {banInfo.banUntil ? 'Temporary' : 'Permanent'}
              </span>
            </InfoRow>
          </div>

          {/* Timed ban countdown */}
          {banInfo.banUntil && banMsLeft > 0 && (
            <div className="bkm2-countdown bkm2-countdown--amber">
              <IconClock color="#f59e0b" size={16} />
              <span className="bkm2-countdown-label">Suspension lifts in</span>
              <span className="bkm2-countdown-time bkm2-countdown-time--amber">{fmtCountdown(banMsLeft)}</span>
            </div>
          )}

          {/* Appeal box */}
          <div className="bkm2-appeal">
            <div className="bkm2-appeal-title"><IconShield /> Appeal Your Suspension</div>
            <div className="bkm2-appeal-text">
              If you believe this is a mistake, email us at{' '}
              <span className="bkm2-link">admin@tingleapp.com</span> with your User ID.
            </div>
          </div>

          {/* Footer */}
          <div className="bkm2-footer">
            <button
              className={`bkm2-btn bkm2-btn--primary bkm2-btn--ban ${understood ? 'bkm2-btn--understood' : ''}`}
              onClick={() => setUnderstood(true)}
            >
              {understood ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Acknowledged
                </>
              ) : 'I Understand'}
            </button>
            <button
              className="bkm2-btn bkm2-btn--secondary"
              onClick={() => {
                const reason = banInfo.reason || 'Unknown';
                const emailVal = email || 'Not Available';
                const body = `Hello Admin,\n\nI am appealing my ban on TingleTap.\n\nUsername: ${displayName}\nUser ID: ${uid || 'N/A'}\nEmail: ${emailVal}\nReason given: ${reason}\n\nReason for appeal:\n[Please explain your situation here]\n\nThank you.`;
                window.open(`mailto:admin@tingleapp.com?subject=${encodeURIComponent('Account Ban Appeal – TingleTap')}&body=${encodeURIComponent(body)}`, '_blank');
              }}
            >
              <IconMail color="#a78bfa" size={14} />
              Appeal
            </button>
          </div>
        </div>
      )}

      {/* ── KICK MODAL ─────────────────────────────────── */}
      {kickInfo && !banInfo && (
        <div className="bkm2-card bkm2-card--kick">

          <div className="bkm2-topbar bkm2-topbar--kick" />

          <div className="bkm2-header">
            <div className="bkm2-icon-ring bkm2-icon-ring--kick">
              <IconKick />
            </div>
            <div>
              <div className="bkm2-heading bkm2-heading--kick">Removed from Room</div>
              <div className="bkm2-subheading">You were kicked from {kickInfo.roomName || currentRoomName}</div>
            </div>
          </div>

          {/* User Identity Card */}
          <div className="bkm2-user-card bkm2-user-card--kick">
            <div className="bkm2-avatar bkm2-avatar--kick">
              {getInitials(displayName)}
            </div>
            <div className="bkm2-user-info">
              <div className="bkm2-username">{displayName}</div>
              {email && <div className="bkm2-email"><IconMail size={11} color="#fbbf24" /> {email}</div>}
            </div>
            <div className="bkm2-status-badge bkm2-status-badge--kicked">KICKED</div>
          </div>

          {/* Countdown — prominent */}
          {kickMsLeft > 0 && (
            <div className="bkm2-countdown bkm2-countdown--kick">
              <IconClock color="#fbbf24" size={18} />
              <div className="bkm2-countdown-inner">
                <div className="bkm2-countdown-label">You can rejoin in</div>
                <div className="bkm2-countdown-time bkm2-countdown-time--kick">{fmtCountdown(kickMsLeft)}</div>
              </div>
            </div>
          )}
          {kickMsLeft === 0 && kickInfo.kickedAt && (
            <div className="bkm2-countdown bkm2-countdown--green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div className="bkm2-countdown-inner">
                <div className="bkm2-countdown-label" style={{color:'#34d399'}}>Kick has expired — you may rejoin</div>
              </div>
            </div>
          )}

          <div className="bkm2-body">
            <InfoRow icon={<IconRoom color="#fbbf24" />} label="Room" accent="#fbbf24">
              <span className="bkm2-pill bkm2-pill--amber">{kickInfo.roomName || currentRoomName}</span>
            </InfoRow>
            <InfoRow icon={<IconUser color="#a78bfa" />} label="Kicked By" accent="#a78bfa">
              {isByBot(kickInfo.kickedBy) ? (
                <span className="bkm2-pill bkm2-pill--amber"><IconBot size={11} /> TingleBot AutoMod</span>
              ) : (
                <span className="bkm2-val">{kickInfo.kickedBy || 'Moderator'}</span>
              )}
            </InfoRow>
            <InfoRow icon={<IconAlert color="#f87171" />} label="Reason" accent="#f87171">
              <span className="bkm2-pill bkm2-pill--red">{kickInfo.reason || 'Kicked by a moderator'}</span>
            </InfoRow>
            <InfoRow icon={<IconCalendar color="#34d399" />} label="When" accent="#34d399">
              <span className="bkm2-val">{fmtDate(kickInfo.kickedAt || kickInfo.time)}</span>
            </InfoRow>
          </div>

          <div className="bkm2-appeal">
            <div className="bkm2-appeal-title"><IconShield /> What Happens Next?</div>
            <div className="bkm2-appeal-text">
              Wait for the kick to expire, then you can rejoin. Follow room rules to avoid future actions. If this was a mistake, email <span className="bkm2-link">admin@tingleapp.com</span>.
            </div>
          </div>

          <div className="bkm2-footer">
            <button className="bkm2-btn bkm2-btn--primary bkm2-btn--kick" onClick={() => { if (onClose) onClose(); }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Back to Room List
            </button>
          </div>
        </div>
      )}

      {/* ── LOADING ──────────────────────────────────────── */}
      {isLoading && (
        <div className="bkm2-card bkm2-card--loading">
          <div className="bkm2-header">
            <div className="bkm2-icon-ring bkm2-icon-ring--loading"><div className="bkm2-spinner" /></div>
            <div>
              <div className="bkm2-heading" style={{color:'#e2e8f0'}}>Checking status…</div>
              <div className="bkm2-subheading">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCESS DENIED ──────────────────────────────── */}
      {!isLoading && !banInfo && !kickInfo && (
        <div className="bkm2-card bkm2-card--ban">
          <div className="bkm2-topbar bkm2-topbar--ban" />
          <div className="bkm2-header">
            <div className="bkm2-icon-ring bkm2-icon-ring--ban"><IconBan /></div>
            <div>
              <div className="bkm2-heading bkm2-heading--ban">Access Restricted</div>
              <div className="bkm2-subheading">Unable to access the requested service</div>
            </div>
          </div>
          <div className="bkm2-body">
            <InfoRow icon={<IconAlert color="#ef4444" />} label="Status" accent="#ef4444">
              <span className="bkm2-pill bkm2-pill--red">Access Denied</span>
            </InfoRow>
            <InfoRow icon={<IconId color="#a78bfa" />} label="User ID" accent="#a78bfa">
              <span className="bkm2-val" style={{fontFamily:'monospace',fontSize:'12px'}}>{uid ? `${uid.slice(0,20)}…` : `SEC_${Date.now().toString().slice(-8)}`}</span>
            </InfoRow>
          </div>
          <div className="bkm2-appeal">
            <div className="bkm2-appeal-title"><IconShield /> Contact Support</div>
            <div className="bkm2-appeal-text">Email <span className="bkm2-link">admin@tingleapp.com</span> with your User ID for assistance.</div>
          </div>
          <div className="bkm2-footer">
            <button className="bkm2-btn bkm2-btn--primary bkm2-btn--ban" onClick={() => { if (onClose) onClose(); window.location.href = '/welcome'; }}>
              I Understand
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default BanKickModal;
