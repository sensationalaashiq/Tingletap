import React, { useState, useEffect, useRef } from 'react';
import LiveAvatarImg from './LiveAvatar';
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './BanKickModal.css?v=3';

/* ── Helpers ─────────────────────────────────────────────── */
const parseDurationToMs = (dur) => {
  if (!dur || dur === 'permanent') return null;
  if (typeof dur === 'number' && dur > 0) return dur;
  const s = String(dur).toLowerCase().trim();
  const n = parseFloat(s) || 1;
  if (s.includes('d'))  return n * 86400000;
  if (s.includes('h'))  return n * 3600000;
  if (s.includes('m'))  return n * 60000;
  if (s.includes('w'))  return n * 604800000;
  if (s.includes('y'))  return n * 31536000000;
  return null;
};

const fmtDurationLabel = (dur) => {
  if (!dur || dur === 'permanent') return null;
  if (typeof dur === 'number') {
    const ms = dur;
    if (ms >= 86400000) return `${Math.round(ms/86400000)} Day${Math.round(ms/86400000)>1?'s':''}`;
    if (ms >= 3600000)  return `${Math.round(ms/3600000)} Hour${Math.round(ms/3600000)>1?'s':''}`;
    if (ms >= 60000)    return `${Math.round(ms/60000)} Minute${Math.round(ms/60000)>1?'s':''}`;
    return `${Math.round(ms/1000)} Second${Math.round(ms/1000)>1?'s':''}`;
  }
  const s = String(dur).toLowerCase().trim();
  const n = parseFloat(s) || 1;
  if (s.includes('d'))  return `${n} Day${n>1?'s':''}`;
  if (s.includes('h'))  return `${n} Hour${n>1?'s':''}`;
  if (s.includes('m'))  return `${n} Minute${n>1?'s':''}`;
  if (s.includes('w'))  return `${n} Week${n>1?'s':''}`;
  if (s.includes('y'))  return `${n} Year${n>1?'s':''}`;
  return String(dur);
};

const fmtDate = (date) => {
  if (!date) return 'N/A';
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return 'N/A'; }
};

const fmtCountdown = (ms) => {
  if (ms <= 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

const isByBot = (who) => who && (
  who.toLowerCase().includes('tinglebot') ||
  who.toLowerCase().includes('automod') ||
  who.toLowerCase().includes('system')
);

/* ── SVG Icons ────────────────────────────────────────────── */
const IcoBan = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" fill="rgba(239,68,68,0.12)" stroke="#ef4444" strokeWidth="2"/>
    <circle cx="16" cy="16" r="8" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5"/>
    <line x1="6" y1="6" x2="26" y2="26" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const IcoKick = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" fill="rgba(245,158,11,0.12)" stroke="#f59e0b" strokeWidth="2"/>
    <path d="M12 20v-3H20V12h-4V9l6 6-6 6v-1h-4z" fill="#f59e0b"/>
    <path d="M14 6a2 2 0 0 1 2 2v1h-2V8H10v16h4v-1h2v1a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4z" fill="#f59e0b" opacity="0.55"/>
  </svg>
);

const IcoShield = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M12 2l9 4v6c0 5-4 9-9 10C3 21 3 16 3 12V6l9-4z" fill="#a78bfa"/>
  </svg>
);

const IcoBot = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <rect x="7" y="10" width="10" height="9" rx="2" stroke="#f59e0b" strokeWidth="1.8"/>
    <path d="M9 10V8a3 3 0 0 1 6 0v2" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="10" cy="14" r="1" fill="#f59e0b"/>
    <circle cx="14" cy="14" r="1" fill="#f59e0b"/>
    <path d="M10 18h4" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 4v2" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const IcoMail = ({ c = '#818cf8' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke={c} strokeWidth="1.8"/>
    <path d="M3 7l9 6 9-6" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const IcoClock = ({ c = '#f59e0b', sz = 14 }) => (
  <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2"/>
    <path d="M12 7v5l3 2" stroke={c} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IcoUser = ({ c = '#a78bfa' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={c} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="7" r="4" stroke={c} strokeWidth="2"/>
  </svg>
);

const IcoAlert = ({ c = '#ef4444' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M12 9v4" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx="12" cy="17" r="1.2" fill={c}/>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={c} strokeWidth="1.7" fill="none"/>
  </svg>
);

const IcoCalendar = ({ c = '#34d399' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke={c} strokeWidth="2"/>
    <path d="M16 2v4M8 2v4M3 10h18" stroke={c} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IcoRoom = ({ c = '#fbbf24' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={c} strokeWidth="2" fill="none"/>
    <path d="M9 22V12h6v10" stroke={c} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IcoLock = ({ c = '#f59e0b' }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="11" width="18" height="11" rx="2" stroke={c} strokeWidth="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={c} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IcoCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IcoArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Info Row ─────────────────────────────────────────────── */
const InfoRow = ({ icon, label, children, accent = '#a78bfa' }) => (
  <div className="bkm3-row">
    <div className="bkm3-row-icon" style={{ background:`${accent}14`, border:`1px solid ${accent}2a` }}>
      {icon}
    </div>
    <div className="bkm3-row-body">
      <div className="bkm3-row-label">{label}</div>
      <div className="bkm3-row-value">{children}</div>
    </div>
  </div>
);

/* ── Component ────────────────────────────────────────────── */
const BanKickModal = React.memo(({ isVisible, onClose, banInfo: passedBanInfo, kickInfo: passedKickInfo }) => {
  const navigate = useNavigate();
  const [banInfo, setBanInfo]               = useState(null);
  const [kickInfo, setKickInfo]             = useState(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [currentRoomName, setCurrentRoomName] = useState('Chat Room');
  const [kickMsLeft, setKickMsLeft]         = useState(null);
  const [banMsLeft, setBanMsLeft]           = useState(0);
  const [understood, setUnderstood]         = useState(false);
  const [kickExpired, setKickExpired]       = useState(false);
  const [banAvatarFailed, setBanAvatarFailed]   = useState(false);
  const [kickAvatarFailed, setKickAvatarFailed] = useState(false);
  const autoRemovedRef                      = useRef(false);

  const user        = auth.currentUser;
  const displayName = user?.displayName || 'User';
  const email       = user?.email || banInfo?.email || '';
  const uid         = user?.uid || '';

  /* room name */
  useEffect(() => {
    const stored = localStorage.getItem('currentRoomName') || sessionStorage.getItem('currentRoomName');
    if (stored) setCurrentRoomName(stored);
    const roomId = window.location.pathname.split('/room/')[1];
    if (roomId) {
      getDoc(doc(db, 'rooms', roomId)).then(snap => {
        if (snap.exists()) {
          const n = snap.data().name || 'Chat Room';
          setCurrentRoomName(n);
          localStorage.setItem('currentRoomName', n);
        }
      }).catch(() => {});
    }
  }, []);

  /* body lock for bans */
  useEffect(() => {
    const isBan = !!passedBanInfo;
    if (isVisible && isBan) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width    = '100%';
      document.body.style.height   = '100%';
      document.body.style.top      = '0';
      document.body.style.left     = '0';
      document.body.style.userSelect   = 'none';
      document.body.style.pointerEvents = 'none';

      const blockKb    = (e) => { e.preventDefault(); e.stopPropagation(); return false; };
      const blockMouse = (e) => { if (!e.target.closest('.bkm3-overlay')) { e.preventDefault(); e.stopPropagation(); return false; } };
      const blockNav   = (e) => { e.preventDefault(); e.returnValue = 'Account is suspended'; return 'Account is suspended'; };
      const forceStyle = () => {
        const el = document.querySelector('.bkm3-overlay');
        if (el) Object.assign(el.style, { zIndex:'2147483647', position:'fixed', top:'0', left:'0', width:'100vw', height:'100vh', display:'flex', visibility:'visible', opacity:'1', pointerEvents:'all' });
        document.body.style.overflow = 'hidden'; document.body.style.position = 'fixed';
        document.body.style.userSelect = 'none'; document.body.style.pointerEvents = 'none';
      };
      forceStyle();
      const iv = setInterval(forceStyle, 500); // 500ms is more than sufficient to enforce modal visibility

      document.addEventListener('keydown',    blockKb,    true);
      document.addEventListener('keyup',      blockKb,    true);
      document.addEventListener('keypress',   blockKb,    true);
      document.addEventListener('click',      blockMouse, true);
      document.addEventListener('mousedown',  blockMouse, true);
      document.addEventListener('mouseup',    blockMouse, true);
      document.addEventListener('contextmenu',blockMouse, true);
      window.addEventListener('beforeunload', blockNav,   true);
      window._bkmHandlers = { blockKb, blockMouse, blockNav };
      window._bkmInterval = iv;
    } else {
      if (window._bkmInterval) { clearInterval(window._bkmInterval); window._bkmInterval = null; }
      if (window._bkmHandlers) {
        const h = window._bkmHandlers;
        document.removeEventListener('keydown',    h.blockKb,    true);
        document.removeEventListener('keyup',      h.blockKb,    true);
        document.removeEventListener('keypress',   h.blockKb,    true);
        document.removeEventListener('click',      h.blockMouse, true);
        document.removeEventListener('mousedown',  h.blockMouse, true);
        document.removeEventListener('mouseup',    h.blockMouse, true);
        document.removeEventListener('contextmenu',h.blockMouse, true);
        window.removeEventListener('beforeunload', h.blockNav,   true);
        window._bkmHandlers = null;
      }
      document.body.style.cssText = '';
    }
    return () => {
      if (window._bkmInterval) { clearInterval(window._bkmInterval); window._bkmInterval = null; }
      if (window._bkmHandlers) {
        const h = window._bkmHandlers;
        document.removeEventListener('keydown',    h.blockKb,    true);
        document.removeEventListener('keyup',      h.blockKb,    true);
        document.removeEventListener('keypress',   h.blockKb,    true);
        document.removeEventListener('click',      h.blockMouse, true);
        document.removeEventListener('mousedown',  h.blockMouse, true);
        document.removeEventListener('mouseup',    h.blockMouse, true);
        document.removeEventListener('contextmenu',h.blockMouse, true);
        window.removeEventListener('beforeunload', h.blockNav,   true);
        window._bkmHandlers = null;
      }
      document.body.style.cssText = '';
    };
  }, [isVisible, passedBanInfo]);

  /* sync props */
  useEffect(() => {
    if (isVisible) {
      if (passedBanInfo)  setBanInfo(passedBanInfo);
      if (passedKickInfo) { setKickInfo(passedKickInfo); setKickExpired(false); autoRemovedRef.current = false; }
      setIsLoading(false);
    } else {
      setBanInfo(null); setKickInfo(null);
      setIsLoading(true); setUnderstood(false);
      setKickExpired(false); autoRemovedRef.current = false;
    }
  }, [isVisible, passedBanInfo, passedKickInfo]);

  useEffect(() => {
    if (isVisible && (passedBanInfo || passedKickInfo)) setIsLoading(false);
  }, [isVisible, passedBanInfo, passedKickInfo]);

  /* kick countdown + auto-removal */
  useEffect(() => {
    if (!kickInfo) { setKickMsLeft(null); return; }

    // If kickUntil absolute timestamp is provided, use it directly
    if (kickInfo.kickUntil) {
      const kickUntilMs = new Date(kickInfo.kickUntil).getTime();
      const compute = () => Math.max(0, kickUntilMs - Date.now());
      const initial = compute();
      setKickMsLeft(initial);
      if (initial <= 0 && !autoRemovedRef.current) {
        autoRemovedRef.current = true;
        setKickExpired(true);
        const roomId = kickInfo.roomId || window.location.pathname.split('/room/')[1];
        if (roomId && uid) deleteDoc(doc(db, 'rooms', roomId, 'kickedUsers', uid)).catch(() => {});
        if (uid) updateDoc(doc(db, 'users', uid), { kickedFrom: null }).catch(() => {});
        return;
      }
      const iv = setInterval(() => {
        const remaining = compute();
        setKickMsLeft(remaining);
        if (remaining <= 0 && !autoRemovedRef.current) {
          autoRemovedRef.current = true;
          setKickExpired(true);
          clearInterval(iv);
          const roomId = kickInfo.roomId || window.location.pathname.split('/room/')[1];
          if (roomId && uid) deleteDoc(doc(db, 'rooms', roomId, 'kickedUsers', uid)).catch(() => {});
          if (uid) updateDoc(doc(db, 'users', uid), { kickedFrom: null }).catch(() => {});
        }
      }, 1000);
      return () => clearInterval(iv);
    }

    const KICK_DUR =
      (typeof kickInfo.kickDuration === 'number' && kickInfo.kickDuration > 0 ? kickInfo.kickDuration : null) ||
      parseDurationToMs(kickInfo.kickDuration) ||
      parseDurationToMs(kickInfo.duration) ||
      null;

    if (!KICK_DUR) { setKickMsLeft(null); return; }

    const compute = () => {
      const at = kickInfo.kickedAt instanceof Date
        ? kickInfo.kickedAt
        : new Date(kickInfo.kickedAt || kickInfo.time || Date.now());
      return Math.max(0, at.getTime() + KICK_DUR - Date.now());
    };

    const initial = compute();
    setKickMsLeft(initial);

    if (initial <= 0 && !autoRemovedRef.current) {
      autoRemovedRef.current = true;
      setKickExpired(true);
      const roomId = kickInfo.roomId || window.location.pathname.split('/room/')[1];
      if (roomId && uid) {
        deleteDoc(doc(db, 'rooms', roomId, 'kickedUsers', uid)).catch(() => {});
      }
      // Clear kickedFrom on user doc so room join is restored immediately
      if (uid) {
        updateDoc(doc(db, 'users', uid), { kickedFrom: null }).catch(() => {});
      }
      return;
    }

    const iv = setInterval(() => {
      const remaining = compute();
      setKickMsLeft(remaining);
      if (remaining <= 0 && !autoRemovedRef.current) {
        autoRemovedRef.current = true;
        setKickExpired(true);
        clearInterval(iv);
        const roomId = kickInfo.roomId || window.location.pathname.split('/room/')[1];
        if (roomId && uid) {
          deleteDoc(doc(db, 'rooms', roomId, 'kickedUsers', uid)).catch(() => {});
        }
        // Clear kickedFrom on user doc so room join is restored immediately
        if (uid) {
          updateDoc(doc(db, 'users', uid), { kickedFrom: null }).catch(() => {});
        }
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [kickInfo, uid]);

  /* ban countdown (timed bans) */
  useEffect(() => {
    if (!banInfo?.banUntil) { setBanMsLeft(0); return; }
    const compute = () => Math.max(0, new Date(banInfo.banUntil).getTime() - Date.now());
    setBanMsLeft(compute());
    const iv = setInterval(() => setBanMsLeft(compute()), 1000);
    return () => clearInterval(iv);
  }, [banInfo]);

  /* Auto-close when kick expires — clean up Firestore first, then dismiss immediately */
  useEffect(() => {
    if (!kickExpired) return;
    // Firestore cleanup already done in countdown effect — just close the modal promptly
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 1200); // short enough to feel instant, long enough to see the green banner
    return () => clearTimeout(timer);
  }, [kickExpired, onClose]);

  if (!isVisible) return null;

  /* derived duration label — NEVER show "Permanent" for timed kicks */
  const kickDurLabel = kickInfo
    ? fmtDurationLabel(kickInfo.kickDuration ?? kickInfo.duration ?? kickInfo.kickUntil)
    : null;
  const kickIsPermanent = !kickDurLabel;

  /* whether countdown is actively running */
  const hasCountdown = kickMsLeft !== null && kickMsLeft > 0;

  return (
    <div
      className="bkm3-overlay"
      onContextMenu={e => e.preventDefault()}
      onSelectStart={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
    >

      {/* ══════════ BAN MODAL ══════════ */}
      {banInfo && (
        <div className="bkm3-card bkm3-card--ban">
          <div className="bkm3-topbar bkm3-topbar--ban" />

          {/* Header */}
          <div className="bkm3-header">
            <div className="bkm3-icon-wrap bkm3-icon-wrap--ban">
              <IcoBan />
            </div>
            <div className="bkm3-header-text">
              <div className="bkm3-heading bkm3-heading--ban">Account Suspended</div>
              <div className="bkm3-subheading">Your access to TingleTap has been restricted</div>
            </div>
          </div>

          {/* User card */}
          <div className="bkm3-user-card bkm3-user-card--ban">
            <div className="bkm3-avatar bkm3-avatar--ban">
              <LiveAvatarImg uid={user?.uid} gender={user?.gender} fallbackPhotoURL={user?.photoURL} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}} />
            </div>
            <div className="bkm3-user-info">
              <div className="bkm3-username">{displayName}</div>
              {email && (
                <div className="bkm3-user-meta">
                  <IcoMail c="#818cf8" /> {email}
                </div>
              )}
            </div>
            <div className="bkm3-badge bkm3-badge--banned">BANNED</div>
          </div>

          {/* Timed ban countdown */}
          {banInfo.banUntil && banMsLeft > 0 && (
            <div className="bkm3-timer bkm3-timer--amber">
              <div className="bkm3-timer-left">
                <IcoClock c="#f59e0b" sz={18} />
                <div>
                  <div className="bkm3-timer-label">Suspension lifts in</div>
                  <div className="bkm3-timer-ring">{fmtCountdown(banMsLeft)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Info rows */}
          <div className="bkm3-body">
            <InfoRow icon={<IcoAlert c="#ef4444" />} label="Reason" accent="#ef4444">
              <span className="bkm3-pill bkm3-pill--red">{banInfo.reason || 'Violation of community guidelines'}</span>
            </InfoRow>
            <InfoRow icon={<IcoUser c="#a78bfa" />} label="Actioned By" accent="#a78bfa">
              {isByBot(banInfo.bannedBy) ? (
                <span className="bkm3-pill bkm3-pill--amber"><IcoBot /> TingleBot AutoMod</span>
              ) : (
                <span className="bkm3-val">Administrator</span>
              )}
            </InfoRow>
            <InfoRow icon={<IcoCalendar c="#34d399" />} label="Date" accent="#34d399">
              <span className="bkm3-val">{banInfo.bannedAt ? fmtDate(new Date(banInfo.bannedAt)) : fmtDate(new Date())}</span>
            </InfoRow>
            <InfoRow icon={<IcoClock c="#f59e0b" />} label="Duration" accent="#f59e0b">
              <span className={`bkm3-pill ${banInfo.banUntil ? 'bkm3-pill--amber' : 'bkm3-pill--red'}`}>
                {banInfo.banUntil ? 'Temporary' : 'Permanent'}
              </span>
            </InfoRow>
          </div>

          {/* Appeal */}
          <div className="bkm3-appeal">
            <div className="bkm3-appeal-title"><IcoShield /> Appeal Your Suspension</div>
            <div className="bkm3-appeal-body">
              If you believe this is a mistake, email us at{' '}
              <span className="bkm3-link">Admin@tingletap.com</span> with your User ID.
            </div>
          </div>

          {/* Footer */}
          <div className="bkm3-footer">
            <button
              className={`bkm3-btn bkm3-btn--ban-primary ${understood ? 'bkm3-btn--understood' : ''}`}
              onClick={async () => {
                setUnderstood(true);
                try { await signOut(auth); } catch {}
                localStorage.clear();
                sessionStorage.clear();
                setTimeout(() => navigate('/'), 400);
              }}
            >
              {understood ? <><IcoCheck /> Redirecting…</> : 'I Understand'}
            </button>
            <button
              className="bkm3-btn bkm3-btn--ghost"
              onClick={() => {
                const body = `Hello Admin,\n\nI am appealing my ban on TingleTap.\n\nUsername: ${displayName}\nUser ID: ${uid || 'N/A'}\nEmail: ${email || 'N/A'}\nReason given: ${banInfo.reason || 'Unknown'}\n\nReason for appeal:\n[Please explain here]\n\nThank you.`;
                window.open(`mailto:Admin@tingletap.com?subject=${encodeURIComponent('Account Ban Appeal – TingleTap')}&body=${encodeURIComponent(body)}`, '_blank');
              }}
            >
              <IcoMail c="#c4b5fd" /> Appeal
            </button>
          </div>
        </div>
      )}

      {/* ══════════ KICK MODAL ══════════ */}
      {kickInfo && !banInfo && (
        <div className="bkm3-card bkm3-card--kick">
          <div className="bkm3-topbar bkm3-topbar--kick" />

          {/* Header */}
          <div className="bkm3-header">
            <div className="bkm3-icon-wrap bkm3-icon-wrap--kick">
              <IcoKick />
            </div>
            <div className="bkm3-header-text">
              <div className="bkm3-heading bkm3-heading--kick">Removed from Room</div>
              <div className="bkm3-subheading">You were kicked from <strong style={{color:'#b45309'}}>{kickInfo.roomName || currentRoomName}</strong></div>
            </div>
          </div>

          {/* User card */}
          <div className="bkm3-user-card bkm3-user-card--kick">
            <div className="bkm3-avatar bkm3-avatar--kick">
              <LiveAvatarImg uid={user?.uid} gender={user?.gender} fallbackPhotoURL={user?.photoURL} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}} />
            </div>
            <div className="bkm3-user-info">
              <div className="bkm3-username">{displayName}</div>
              {email && (
                <div className="bkm3-user-meta">
                  <IcoMail c="#a16207" /> {email}
                </div>
              )}
            </div>
            <div className="bkm3-badge bkm3-badge--kicked">KICKED</div>
          </div>

          {/* ── Countdown Timer (only for timed kicks) ── */}
          {hasCountdown && !kickExpired && (
            <div className="bkm3-timer bkm3-timer--kick">
              <div className="bkm3-timer-left">
                <IcoClock c="#c2410c" sz={20} />
                <div>
                  <div className="bkm3-timer-label">You can rejoin in</div>
                  <div className="bkm3-timer-ring bkm3-timer-ring--kick">
                    {fmtCountdown(kickMsLeft)}
                  </div>
                </div>
              </div>
              <div className="bkm3-timer-dur">
                <div className="bkm3-timer-dur-label">Duration</div>
                <div className="bkm3-timer-dur-val">{kickDurLabel}</div>
              </div>
            </div>
          )}

          {/* Kick expired — auto-removed, can rejoin (also triggers auto-close via useEffect) */}
          {kickExpired && (
            <div className="bkm3-status-banner bkm3-status-banner--green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <div style={{fontWeight:700,color:'#34d399',fontSize:'13px'}}>Kick Expired — You can rejoin now</div>
                <div style={{fontSize:'11px',color:'rgba(52,211,153,0.7)',marginTop:'2px'}}>Your access has been automatically restored</div>
              </div>
            </div>
          )}

          {/* Permanent kick banner */}
          {kickIsPermanent && !kickExpired && (
            <div className="bkm3-status-banner bkm3-status-banner--red">
              <IcoClock c="#f87171" sz={18} />
              <div>
                <div style={{fontWeight:700,color:'#f87171',fontSize:'13px'}}>Permanent Kick — Contact staff to appeal</div>
                <div style={{fontSize:'11px',color:'rgba(248,113,113,0.7)',marginTop:'2px'}}>This kick does not expire automatically</div>
              </div>
            </div>
          )}

          {/* Info rows */}
          <div className="bkm3-body">
            <InfoRow icon={<IcoRoom c="#b45309" />} label="Room" accent="#d97706">
              <span className="bkm3-pill bkm3-pill--amber">{kickInfo.roomName || currentRoomName}</span>
            </InfoRow>
            <InfoRow icon={<IcoUser c="#a78bfa" />} label="Kicked By" accent="#a78bfa">
              {isByBot(kickInfo.kickedBy) ? (
                <span className="bkm3-pill bkm3-pill--amber"><IcoBot /> TingleBot AutoMod</span>
              ) : (
                <span className="bkm3-val">Administrator</span>
              )}
            </InfoRow>
            <InfoRow icon={<IcoAlert c="#f87171" />} label="Reason" accent="#f87171">
              <span className="bkm3-pill bkm3-pill--red">{kickInfo.reason || 'Kicked by a moderator'}</span>
            </InfoRow>
            <InfoRow icon={<IcoLock c="#f59e0b" />} label="Duration" accent="#f59e0b">
              {kickIsPermanent ? (
                <span className="bkm3-pill bkm3-pill--red">Permanent</span>
              ) : (
                <span className="bkm3-pill bkm3-pill--amber">{kickDurLabel}</span>
              )}
            </InfoRow>
            <InfoRow icon={<IcoCalendar c="#34d399" />} label="Kicked At" accent="#34d399">
              <span className="bkm3-val">{fmtDate(kickInfo.kickedAt || kickInfo.time)}</span>
            </InfoRow>
          </div>

          {/* What happens next */}
          <div className="bkm3-appeal">
            <div className="bkm3-appeal-title"><IcoShield /> What Happens Next?</div>
            <div className="bkm3-appeal-body">
              {kickExpired
                ? 'Your kick has expired. You can go back and rejoin the room freely.'
                : kickIsPermanent
                  ? 'This is a permanent removal. Contact staff at '
                  : 'Wait for the timer above to reach 00:00 and you\'ll be able to rejoin automatically. If this was a mistake, email '}
              {!kickExpired && <span className="bkm3-link">Admin@tingletap.com</span>}
              {!kickExpired && '.'}
            </div>
          </div>

          {/* Footer */}
          <div className="bkm3-footer">
            <button
              className="bkm3-btn bkm3-btn--kick-primary"
              onClick={() => { if (onClose) onClose(); }}
            >
              <IcoArrow /> Back to Room List
            </button>
          </div>
        </div>
      )}

      {/* ══════════ LOADING ══════════ */}
      {isLoading && (
        <div className="bkm3-card bkm3-card--loading">
          <div className="bkm3-header">
            <div className="bkm3-icon-wrap bkm3-icon-wrap--loading">
              <div className="bkm3-spinner" />
            </div>
            <div className="bkm3-header-text">
              <div className="bkm3-heading" style={{color:'#e2e8f0'}}>Checking status…</div>
              <div className="bkm3-subheading">Please wait a moment</div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ ACCESS DENIED ══════════ */}
      {!isLoading && !banInfo && !kickInfo && (
        <div className="bkm3-card bkm3-card--ban">
          <div className="bkm3-topbar bkm3-topbar--ban" />
          <div className="bkm3-header">
            <div className="bkm3-icon-wrap bkm3-icon-wrap--ban"><IcoBan /></div>
            <div className="bkm3-header-text">
              <div className="bkm3-heading bkm3-heading--ban">Access Restricted</div>
              <div className="bkm3-subheading">Unable to access the requested service</div>
            </div>
          </div>
          <div className="bkm3-body">
            <InfoRow icon={<IcoAlert c="#ef4444" />} label="Status" accent="#ef4444">
              <span className="bkm3-pill bkm3-pill--red">Access Denied</span>
            </InfoRow>
          </div>
          <div className="bkm3-appeal">
            <div className="bkm3-appeal-title"><IcoShield /> Contact Support</div>
            <div className="bkm3-appeal-body">Email <span className="bkm3-link">Admin@tingletap.com</span> with your User ID.</div>
          </div>
          <div className="bkm3-footer">
            <button className="bkm3-btn bkm3-btn--ban-primary" onClick={() => { if (onClose) onClose(); window.location.href = '/welcome'; }}>
              I Understand
            </button>
          </div>
        </div>
      )}

    </div>
  );
});

export default BanKickModal;
