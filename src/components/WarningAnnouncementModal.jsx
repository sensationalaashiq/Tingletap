import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, limit, getDocs, where } from 'firebase/firestore';

/* ── SVG icon set ──────────────────────────────────────────── */
const ICONS = {
  warning: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#d97706" opacity=".18" stroke="#d97706" strokeWidth="1.8" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1.2" fill="#d97706"/>
    </svg>
  ),
  announcement: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill="#7c3aed" opacity=".12" stroke="#7c3aed" strokeWidth="1.8"/>
      <line x1="6" y1="1" x2="6" y2="4" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="10" y1="1" x2="10" y2="4" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="14" y1="1" x2="14" y2="4" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none">
      <polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <line x1="22" y1="2" x2="11" y2="13" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="#fff"/>
    </svg>
  ),
  sendDisabled: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <line x1="22" y1="2" x2="11" y2="13" stroke="rgba(109,40,217,0.4)" strokeWidth="2.2" strokeLinecap="round"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="rgba(109,40,217,0.4)"/>
    </svg>
  ),
  clock: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><circle cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth="1.6"/><polyline points="12 6 12 12 16 14" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  target: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><circle cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke="#7c3aed" strokeWidth="1.5"/><circle cx="12" cy="12" r="1.8" fill="#7c3aed"/></svg>),
  severity: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#f59e0b" opacity=".25" stroke="#f59e0b" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  title: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><path d="M4 6h16M4 12h8M4 18h12" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  msg: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round"/></svg>),
  room: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#7c3aed" strokeWidth="1.6" strokeLinejoin="round"/><polyline points="9 22 9 12 15 12 15 22" stroke="#7c3aed" strokeWidth="1.6" strokeLinejoin="round"/></svg>),
  user: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="#7c3aed" strokeWidth="1.6"/></svg>),
  search: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><circle cx="11" cy="11" r="8" stroke="#9ca3af" strokeWidth="1.8"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  urgent: (active) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
        fill={active ? '#ef4444' : 'none'} stroke={active ? '#ef4444' : '#9ca3af'} strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  dismiss: (active) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="10" fill={active ? 'rgba(16,185,129,.18)' : 'none'} stroke={active ? '#10b981' : '#9ca3af'} strokeWidth="1.6"/>
      <polyline points="8 12 11 15 16 9" stroke={active ? '#10b981' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  iconWarning: (active) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        fill={active ? '#d97706' : 'none'} stroke={active ? '#d97706' : '#9ca3af'} strokeWidth="1.6" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke={active ? '#d97706' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill={active ? '#d97706' : '#9ca3af'}/>
    </svg>
  ),
  iconInfo: (active) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
      <circle cx="12" cy="12" r="10" fill={active ? 'rgba(37,99,235,.15)' : 'none'} stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth="1.6"/>
      <circle cx="12" cy="8" r="1" fill={active ? '#2563eb' : '#9ca3af'}/>
      <line x1="12" y1="12" x2="12" y2="16" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  iconMegaphone: (active) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill={active ? 'rgba(124,58,237,.15)' : 'none'} stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.6"/>
    </svg>
  ),
  iconAlert: (active) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill={active ? 'rgba(220,38,38,.15)' : 'none'} stroke={active ? '#dc2626' : '#9ca3af'} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={active ? '#dc2626' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
};

/* ── Module-level cache ─────────────────────────────────────── */
let _cachedModalData = null;
const MODAL_CACHE_TTL_MS = 60000;

/* ── CheckRow: MUST be outside component to avoid remount bug ── */
const CheckRow = ({ checked, onChange, accentC, children }) => (
  <div
    onClick={onChange}
    style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 11, cursor: 'pointer',
      border: `1.5px solid ${checked ? `${accentC}55` : 'rgba(139,92,246,0.18)'}`,
      background: checked ? `${accentC}0d` : '#fafafa',
      transition: 'all 0.15s', userSelect: 'none',
    }}
  >
    <div style={{
      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
      border: `2px solid ${checked ? accentC : '#d1d5db'}`,
      background: checked ? `linear-gradient(135deg,${accentC},${accentC}cc)` : '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s', boxShadow: checked ? `0 2px 8px ${accentC}40` : 'none',
    }}>
      {checked && ICONS.check}
    </div>
    {children}
  </div>
);

/* ── IconPicker: MUST be outside component ─────────────────── */
const ICON_OPTS = [
  { v: 'warning',      label: 'Warning',   icon: ICONS.iconWarning,  color: '#d97706' },
  { v: 'info',         label: 'Info',       icon: ICONS.iconInfo,     color: '#2563eb' },
  { v: 'announcement', label: 'Megaphone',  icon: ICONS.iconMegaphone,color: '#7c3aed' },
  { v: 'alert',        label: 'Alert',      icon: ICONS.iconAlert,    color: '#dc2626' },
];

const IconPicker = ({ iconType, setIconType }) => (
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {ICON_OPTS.map(o => {
      const active = iconType === o.v;
      return (
        <button
          key={o.v}
          type="button"
          onClick={() => setIconType(o.v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 9, fontSize: '12px', fontWeight: 600,
            border: `1.5px solid ${active ? o.color : 'rgba(139,92,246,0.2)'}`,
            background: active ? `${o.color}14` : '#fff',
            color: active ? o.color : '#6b7280',
            cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: active ? `0 2px 8px ${o.color}30` : 'none',
          }}
        >
          {o.icon(active)}
          {o.label}
        </button>
      );
    })}
  </div>
);

/* ── Main Component ─────────────────────────────────────────── */
const WarningAnnouncementModal = React.memo(({ isVisible, onClose, currentUserProfile, currentRoomId }) => {
  const [type, setType]               = useState('warning');
  const [title, setTitle]             = useState('');
  const [message, setMessage]         = useState('');
  const [severity, setSeverity]       = useState('medium');
  const [targetType, setTargetType]   = useState('room');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [expiresAt, setExpiresAt]     = useState('');
  const [isUrgent, setIsUrgent]       = useState(false);
  const [allowDismiss, setAllowDismiss] = useState(true);
  const [iconType, setIconType]       = useState('warning');
  const [rooms, setRooms]             = useState([]);
  const [users, setUsers]             = useState([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [userSearch, setUserSearch]   = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    const cacheIsFresh = _cachedModalData && (Date.now() - _cachedModalData.fetchedAt) < MODAL_CACHE_TTL_MS;
    if (cacheIsFresh) {
      setRooms(_cachedModalData.rooms);
      setUsers(_cachedModalData.users);
      if (currentRoomId && !selectedRooms.includes(currentRoomId)) setSelectedRooms([currentRoomId]);
      return;
    }
    const unsubRooms = onSnapshot(query(collection(db, 'rooms'), orderBy('name')), (snap) => {
      const roomsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRooms(roomsData);
      if (currentRoomId && !selectedRooms.includes(currentRoomId)) setSelectedRooms([currentRoomId]);
      _cachedModalData = { ..._cachedModalData, rooms: roomsData, users: _cachedModalData?.users || [], fetchedAt: Date.now() };
    });
    const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(100)), (snap) => {
      const usersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData);
      _cachedModalData = { ..._cachedModalData, users: usersData, rooms: _cachedModalData?.rooms || [], fetchedAt: Date.now() };
    });
    return () => { unsubRooms(); unsubUsers(); };
  }, [isVisible, currentRoomId]);

  useEffect(() => {
    if (!isVisible || targetType !== 'selected_users') return;
    const term = userSearch.trim();
    if (!term) { setSearchResults(null); return; }
    let cancelled = false;
    setIsSearching(true);
    const handle = setTimeout(async () => {
      try {
        const q1 = query(collection(db, 'users'), orderBy('displayName'),
          where('displayName', '>=', term), where('displayName', '<=', term + '\uf8ff'), limit(30));
        const snap = await getDocs(q1);
        if (!cancelled) setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        if (!cancelled) setSearchResults(null);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [userSearch, isVisible, targetType]);

  const getBgBorder = () => {
    if (type === 'warning') {
      const m = { low: ['#fffbeb','#f59e0b'], medium: ['#fff7ed','#ef4444'], high: ['#fff1f2','#dc2626'], critical: ['#fff1f2','#991b1b'] };
      return m[severity] || m.medium;
    }
    return ['#faf5ff', '#7c3aed'];
  };
  const [cardBg, accentC] = getBgBorder();
  const isWarning = type === 'warning';

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) return;
    if (targetType === 'selected_rooms' && selectedRooms.length === 0) return;
    if (targetType === 'selected_users' && selectedUsers.length === 0) return;
    setIsLoading(true);
    try {
      const data = {
        type, title: title.trim(), message: message.trim(), severity,
        targetType,
        selectedRooms: targetType === 'selected_rooms' ? selectedRooms
          : targetType === 'room' ? [currentRoomId]
          : targetType === 'all_rooms' ? rooms.map(r => r.id) : [],
        selectedUsers: targetType === 'selected_users' ? selectedUsers
          : targetType === 'all_users' ? users.map(u => u.id) : [],
        isUrgent, allowDismiss,
        styling: { bgColor: cardBg, borderColor: accentC, iconType },
        createdBy: { uid: currentUserProfile.uid, displayName: currentUserProfile.displayName || 'System', role: currentUserProfile.role || 'admin' },
        createdAt: serverTimestamp(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true, dismissedBy: [],
      };
      if (targetType === 'room') data.roomId = currentRoomId;
      await addDoc(collection(db, 'warnings_announcements'), data);
      handleClose();
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleClose = () => {
    setType('warning'); setTitle(''); setMessage(''); setSeverity('medium');
    setTargetType('room'); setSelectedRooms([]); setSelectedUsers([]);
    setExpiresAt(''); setIsUrgent(false); setAllowDismiss(true); setIconType('warning');
    setUserSearch(''); setIsLoading(false); onClose();
  };

  const canCreate = () => currentUserProfile && ['owner','admin','moderator'].includes(currentUserProfile.role);
  if (!isVisible || !canCreate()) return null;

  const filteredUsers = userSearch.trim()
    ? (searchResults !== null ? searchResults : users.filter(u =>
        (u.displayName || u.email || '').toLowerCase().includes(userSearch.toLowerCase())))
    : users;

  const canSubmit = !isLoading && title.trim() && message.trim() &&
    !(targetType === 'selected_rooms' && selectedRooms.length === 0) &&
    !(targetType === 'selected_users' && selectedUsers.length === 0);

  const LBL = ({ icon, children, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '11px', fontWeight: 800, color: '#4c1d95', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {icon}{children}
      </div>
      {right && <div style={{ fontSize: '10.5px', color: '#9ca3af', fontWeight: 500 }}>{right}</div>}
    </div>
  );

  const inp = {
    width: '100%', padding: '9px 13px', borderRadius: 10, fontSize: '13px',
    border: '1.5px solid rgba(139,92,246,0.25)', background: '#fff',
    color: '#1e1b4b', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Inter',-apple-system,sans-serif",
  };

  const toggleRoom = (id) => setSelectedRooms(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleUser = (id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const showRoomList = targetType === 'selected_rooms';
  const showUserList = targetType === 'selected_users';

  return ReactDOM.createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(109,40,217,0.13)', backdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <style>{`
        @keyframes wamUp { from{opacity:0;transform:scale(0.9) translateY(22px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .wam-inp:focus { border-color:rgba(109,40,217,0.55)!important; background:rgba(237,233,254,0.25)!important; outline:none; }
        .wam-sel option { background:#fff; color:#1e1b4b; }
        .wam-list-row:hover { background:rgba(237,233,254,0.55)!important; }
        .wam-type-btn:hover { opacity:.9; }
        .wam-submit:hover:not(:disabled) { filter:brightness(1.07); transform:translateY(-1px); box-shadow:0 8px 24px rgba(109,40,217,0.4)!important; }
        .wam-submit:active:not(:disabled) { transform:scale(0.98); }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:rgba(139,92,246,0.06)} ::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.3);border-radius:4px}
      `}</style>

      <div style={{
        background: 'linear-gradient(160deg,#fbf9ff 0%,#f5f3ff 50%,#fdf4ff 100%)',
        border: '1.5px solid rgba(139,92,246,0.22)',
        borderRadius: 22, width: '100%', maxWidth: 700,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.88) inset, 0 28px 70px rgba(109,40,217,0.2)',
        animation: 'wamUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Top accent */}
        <div style={{ height: 4, background: `linear-gradient(90deg,${accentC},${isWarning ? '#f59e0b' : '#a855f7'},#ec4899)`, borderRadius: '22px 22px 0 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px 14px', borderBottom: '1.5px solid rgba(139,92,246,0.1)', flexShrink: 0 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg,${accentC}20,${accentC}0c)`, border: `1.5px solid ${accentC}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isWarning ? ICONS.warning : ICONS.announcement}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
              Create {isWarning ? 'Warning' : 'Announcement'}
            </div>
            <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 500, marginTop: 2, opacity: 0.75 }}>
              Broadcast to users across the platform
            </div>
          </div>
          <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(139,92,246,0.22)', background: 'rgba(237,233,254,0.6)', color: '#7c3aed', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {ICONS.close}
          </button>
        </div>

        {/* Body — Two columns */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', gap: 18, minHeight: 0 }}>

          {/* ── LEFT column ── */}
          <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Type toggle */}
            <div>
              <LBL>Type</LBL>
              <div style={{ display: 'flex', gap: 5, padding: 4, background: 'rgba(237,233,254,0.55)', borderRadius: 12, border: '1.5px solid rgba(139,92,246,0.15)' }}>
                {[['warning','⚠️ Warning', ICONS.warning], ['announcement','📢 Announcement', ICONS.announcement]].map(([v, label]) => (
                  <button key={v} type="button" className="wam-type-btn" onClick={() => setType(v)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 9, fontSize: '12px', fontWeight: 700,
                    border: `1.5px solid ${type === v ? accentC + '70' : 'transparent'}`,
                    background: type === v ? '#fff' : 'transparent',
                    color: type === v ? accentC : '#9ca3af',
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: type === v ? '0 2px 8px rgba(109,40,217,0.12)' : 'none',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <LBL icon={ICONS.title} right={`${title.length}/100`}>Title <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></LBL>
              <input
                className="wam-inp"
                style={inp}
                placeholder={`${isWarning ? 'Warning' : 'Announcement'} title…`}
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Message */}
            <div>
              <LBL icon={ICONS.msg} right={`${message.length}/500`}>Message <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span></LBL>
              <textarea
                className="wam-inp"
                style={{ ...inp, minHeight: 90, resize: 'vertical' }}
                placeholder="Message content…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={500}
              />
            </div>

            {/* Severity (warning only) */}
            {isWarning && (
              <div>
                <LBL icon={ICONS.severity}>Severity</LBL>
                <select className="wam-inp wam-sel" style={inp} value={severity} onChange={e => setSeverity(e.target.value)}>
                  <option value="low">🟡 Low</option>
                  <option value="medium">🟠 Medium</option>
                  <option value="high">🔴 High</option>
                  <option value="critical">⚫ Critical</option>
                </select>
              </div>
            )}

            {/* Icon Style */}
            <div>
              <LBL>Icon Style</LBL>
              <IconPicker iconType={iconType} setIconType={setIconType} />
            </div>

            {/* Expiry */}
            <div>
              <LBL icon={ICONS.clock} right="optional">Expiry</LBL>
              <input
                type="datetime-local"
                className="wam-inp"
                style={inp}
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          {/* ── RIGHT column ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

            {/* Send To */}
            <div>
              <LBL icon={ICONS.target}>Send To</LBL>
              <select className="wam-inp wam-sel" style={inp} value={targetType} onChange={e => setTargetType(e.target.value)}>
                <option value="room">📍 Current Room</option>
                <option value="selected_rooms">🏠 Selected Rooms</option>
                <option value="all_rooms">🌐 All Rooms</option>
                <option value="selected_users">👥 Selected Users</option>
                <option value="all_users">🌍 All Users</option>
              </select>
            </div>

            {/* ── Room list ── */}
            {showRoomList && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <LBL icon={ICONS.room} right={`${selectedRooms.length} selected`}>Rooms</LBL>
                <div style={{
                  flex: 1, overflowY: 'auto', minHeight: 200, maxHeight: 280,
                  border: '1.5px solid rgba(139,92,246,0.22)', borderRadius: 12,
                  background: '#fff', padding: '6px 4px',
                  boxShadow: 'inset 0 2px 8px rgba(109,40,217,0.04)',
                }}>
                  {rooms.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>No rooms found</div>
                  )}
                  {rooms.map(room => {
                    const sel = selectedRooms.includes(room.id);
                    return (
                      <div key={room.id} className="wam-list-row"
                        onClick={() => toggleRoom(room.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', background: sel ? `${accentC}0f` : 'transparent', margin: '1px 2px', transition: 'all 0.12s' }}>
                        <div style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, border: `2px solid ${sel ? accentC : '#d1d5db'}`, background: sel ? `linear-gradient(135deg,${accentC},${accentC}cc)` : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}>
                          {sel && ICONS.check}
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, color: '#1e1b4b', fontWeight: sel ? 700 : 500 }}>{room.name || room.id}</div>
                          {room.slug && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>/{room.slug}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {rooms.length === 0 && (
                  <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, fontWeight: 600 }}>⚠️ No rooms loaded yet — wait a moment and try again</div>
                )}
              </div>
            )}

            {/* ── User list ── */}
            {showUserList && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
                <LBL icon={ICONS.user} right={`${selectedUsers.length} selected`}>Users</LBL>
                {/* Search box */}
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>{ICONS.search}</div>
                  <input
                    className="wam-inp"
                    style={{ ...inp, paddingLeft: 32, paddingTop: 8, paddingBottom: 8 }}
                    placeholder="Search by name…"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                  />
                  {isSearching && (
                    <div style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#9ca3af' }}>…</div>
                  )}
                </div>
                {/* List */}
                <div style={{
                  flex: 1, overflowY: 'auto', minHeight: 180, maxHeight: 260,
                  border: '1.5px solid rgba(139,92,246,0.22)', borderRadius: 12,
                  background: '#fff', padding: '6px 4px',
                  boxShadow: 'inset 0 2px 8px rgba(109,40,217,0.04)',
                }}>
                  {filteredUsers.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                      {userSearch ? 'No users match this search' : 'No users loaded'}
                    </div>
                  )}
                  {filteredUsers.slice(0, 50).map(u => {
                    const sel = selectedUsers.includes(u.id);
                    return (
                      <div key={u.id} className="wam-list-row"
                        onClick={() => toggleUser(u.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', background: sel ? `${accentC}0f` : 'transparent', margin: '1px 2px', transition: 'all 0.12s' }}>
                        <div style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, border: `2px solid ${sel ? accentC : '#d1d5db'}`, background: sel ? `linear-gradient(135deg,${accentC},${accentC}cc)` : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}>
                          {sel && ICONS.check}
                        </div>
                        <div>
                          <div style={{ fontSize: 12.5, color: '#1e1b4b', fontWeight: sel ? 700 : 500 }}>{u.displayName || u.email || 'Unknown'}</div>
                          {u.email && u.displayName && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{u.email}</div>}
                        </div>
                        {sel && (
                          <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: accentC, flexShrink: 0 }} />
                        )}
                      </div>
                    );
                  })}
                  {filteredUsers.length > 50 && (
                    <div style={{ padding: '6px 14px', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
                      Showing 50 of {filteredUsers.length} users — use search to find more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fallback when no list is shown — show info card */}
            {!showRoomList && !showUserList && (
              <div style={{ padding: '14px 16px', borderRadius: 12, background: `${accentC}08`, border: `1.5px dashed ${accentC}40`, color: accentC, fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
                {targetType === 'room' && '📍 Will be sent to the current room only'}
                {targetType === 'all_rooms' && '🌐 Will be sent to ALL rooms simultaneously'}
                {targetType === 'all_users' && '🌍 Will be sent to ALL registered users'}
              </div>
            )}

            {/* ── Urgent + Dismissible ── */}
            <div>
              <LBL>Options</LBL>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <CheckRow checked={isUrgent} onChange={() => setIsUrgent(v => !v)} accentC="#ef4444">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ICONS.urgent(isUrgent)}
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: isUrgent ? '#dc2626' : '#374151' }}>Urgent</div>
                      <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>Red accent, priority display</div>
                    </div>
                  </div>
                </CheckRow>
                <CheckRow checked={allowDismiss} onChange={() => setAllowDismiss(v => !v)} accentC="#10b981">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ICONS.dismiss(allowDismiss)}
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: allowDismiss ? '#059669' : '#374151' }}>Dismissible</div>
                      <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>Users can close this notification</div>
                    </div>
                  </div>
                </CheckRow>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '13px 22px 18px', borderTop: '1.5px solid rgba(139,92,246,0.1)', display: 'flex', gap: 10, flexShrink: 0, background: 'rgba(250,248,255,0.8)' }}>
          {/* Selection summary */}
          {(selectedRooms.length > 0 || selectedUsers.length > 0) && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: 11.5, color: '#7c3aed', fontWeight: 700, gap: 5, background: 'rgba(109,40,217,0.06)', borderRadius: 9, padding: '6px 12px', border: '1px solid rgba(109,40,217,0.15)' }}>
              ✓ {selectedRooms.length > 0 ? `${selectedRooms.length} room${selectedRooms.length > 1 ? 's' : ''} selected` : ''}
              {selectedRooms.length > 0 && selectedUsers.length > 0 && ' · '}
              {selectedUsers.length > 0 ? `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} selected` : ''}
            </div>
          )}
          <button
            onClick={handleClose}
            disabled={isLoading}
            style={{ flex: '0 0 88px', height: 44, borderRadius: 11, border: '1.5px solid rgba(139,92,246,0.25)', background: 'rgba(237,233,254,0.6)', color: '#6d28d9', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >Cancel</button>
          <button
            className="wam-submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1, height: 44, borderRadius: 11, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit ? `linear-gradient(135deg,${accentC},${isWarning ? '#f59e0b' : '#a855f7'})` : 'rgba(139,92,246,0.12)',
              fontSize: 13.5, fontWeight: 800, letterSpacing: '0.02em',
              boxShadow: canSubmit ? `0 5px 18px ${accentC}45` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.18s',
            }}
          >
            {canSubmit ? ICONS.send : ICONS.sendDisabled}
            <span style={{ color: canSubmit ? '#fff' : 'rgba(109,40,217,0.4)' }}>
              {isLoading ? 'Creating…' : `Send Broadcast`}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default WarningAnnouncementModal;
