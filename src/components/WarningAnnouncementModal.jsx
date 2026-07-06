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
  severityDot: (color) => (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <circle cx="12" cy="12" r="9" fill={`${color}25`} stroke={color} strokeWidth="2"/>
      <circle cx="12" cy="12" r="3.2" fill={color}/>
    </svg>
  ),
  pin: (active) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" fill={active ? 'rgba(124,58,237,.15)' : 'none'} stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="12" cy="9.5" r="2.4" fill={active ? '#7c3aed' : '#9ca3af'}/>
    </svg>
  ),
  homes: (active) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
      <path d="M3 9.5l6-4.5 6 4.5v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18.5z" fill={active ? 'rgba(124,58,237,.15)' : 'none'} stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M14 9.5l4.5-3.4L21 8v7.5a1 1 0 0 1-1 1h-2.5" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  globe: (active) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
      <circle cx="12" cy="12" r="9" fill={active ? 'rgba(124,58,237,.15)' : 'none'} stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.6"/>
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.4"/>
      <line x1="3" y1="12" x2="21" y2="12" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.4"/>
    </svg>
  ),
  usersMulti: (active) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
      <circle cx="9" cy="8" r="3" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.6"/>
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M16 4.5a3 3 0 0 1 0 5.9" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18.5 20v-1a5 5 0 0 0-2.8-4.5" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  globeUsers: (active) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
      <circle cx="12" cy="12" r="9" fill={active ? 'rgba(124,58,237,.15)' : 'none'} stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.6"/>
      <path d="M3 9h18M3 15h18" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.2"/>
      <ellipse cx="12" cy="12" rx="4" ry="9" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.2"/>
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <polyline points="6 9 12 15 18 9" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  radio: (active, color) => (
    <div style={{
      width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
      border: `2px solid ${active ? color : '#d1d5db'}`,
      background: active ? color : '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s',
    }}>
      {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
    </div>
  ),
};

const SEVERITY_OPTS = [
  { v: 'low',      label: 'Low',      sub: 'Informational nudge',            color: '#eab308' },
  { v: 'medium',   label: 'Medium',   sub: 'Needs attention',                color: '#f97316' },
  { v: 'high',     label: 'High',     sub: 'Important action required',      color: '#ef4444' },
  { v: 'critical', label: 'Critical', sub: 'Urgent & highly visible',        color: '#18181b' },
];

const TARGET_OPTS = [
  { v: 'room',           label: 'Current Room only',        icon: ICONS.pin,        color: '#7c3aed' },
  { v: 'selected_rooms', label: 'Choose specific rooms…',   icon: ICONS.homes,      color: '#7c3aed' },
  { v: 'all_rooms',      label: 'All rooms simultaneously', icon: ICONS.globe,      color: '#7c3aed' },
  { v: 'selected_users', label: 'Choose specific users…',   icon: ICONS.usersMulti, color: '#7c3aed' },
  { v: 'all_users',      label: 'All registered users',     icon: ICONS.globeUsers, color: '#7c3aed' },
];

/* ── Module-level cache ─────────────────────────────────────── */
let _cachedModalData = null;
const MODAL_CACHE_TTL_MS = 60000;

/* ── CheckRow: MUST be outside component to avoid remount bug ── */
const CheckRow = ({ checked, onChange, accentC, children }) => (
  <div
    onClick={onChange}
    style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
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

/* ── IconPicker ─────────────────────────────────────────────── */
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

  const toggleRoom = (id) => setSelectedRooms(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleUser = (id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const showRoomList = targetType === 'selected_rooms';
  const showUserList = targetType === 'selected_users';

  /* ── Shared input style ── */
  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: '13.5px',
    border: '1.5px solid rgba(139,92,246,0.25)', background: '#fff',
    color: '#1e1b4b', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Inter',-apple-system,sans-serif",
    transition: 'border-color 0.15s',
  };

  /* ── Label component ── */
  const Lbl = ({ icon, children, right }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px', fontWeight: 800, color: '#4c1d95', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {icon}{children}
      </div>
      {right && <div style={{ fontSize: '10.5px', color: '#9ca3af', fontWeight: 500 }}>{right}</div>}
    </div>
  );

  /* ── Divider ── */
  const Divider = () => (
    <div style={{ height: '1px', background: 'rgba(139,92,246,0.10)', margin: '2px 0' }} />
  );

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'linear-gradient(135deg, rgba(30,8,80,0.72) 0%, rgba(109,40,217,0.18) 100%)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px 12px',
        fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <style>{`
        @keyframes wamUp { from{opacity:0;transform:scale(0.93) translateY(24px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .wam-inp:focus { border-color:rgba(109,40,217,0.6)!important; background:rgba(237,233,254,0.2)!important; outline:none; }
        .wam-sel { appearance:none; -webkit-appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237c3aed' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:36px!important; cursor:pointer; }
        .wam-sel option { background:#fff; color:#1e1b4b; }
        .wam-list-row:hover { background:rgba(237,233,254,0.55)!important; }
        .wam-type-btn:hover { opacity:.88; }
        .wam-submit:hover:not(:disabled) { filter:brightness(1.08); transform:translateY(-1px); box-shadow:0 8px 24px rgba(109,40,217,0.42)!important; }
        .wam-submit:active:not(:disabled) { transform:scale(0.98); }
        .wam-cancel:hover { background:rgba(237,233,254,0.9)!important; }
        .wam-scrollbox::-webkit-scrollbar{width:5px} .wam-scrollbox::-webkit-scrollbar-track{background:rgba(139,92,246,0.06)} .wam-scrollbox::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.28);border-radius:4px}
        .wam-check-item:hover { background:rgba(237,233,254,0.5)!important; }
      `}</style>

      <div style={{
        background: 'linear-gradient(160deg,#fbf9ff 0%,#f5f3ff 55%,#fdf4ff 100%)',
        border: '1.5px solid rgba(139,92,246,0.2)',
        borderRadius: 22,
        width: '100%',
        maxWidth: 520,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.9) inset, 0 32px 80px rgba(109,40,217,0.28), 0 4px 16px rgba(109,40,217,0.14)',
        animation: 'wamUp 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '96vh',
        overflow: 'hidden',
      }}>

        {/* Top accent strip */}
        <div style={{
          height: 5,
          background: `linear-gradient(90deg,${accentC},${isWarning ? '#f59e0b' : '#a855f7'},#ec4899,#7c3aed)`,
          borderRadius: '22px 22px 0 0',
          flexShrink: 0,
        }} />

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px 14px',
          borderBottom: '1.5px solid rgba(139,92,246,0.1)',
          flexShrink: 0,
          background: 'rgba(250,248,255,0.6)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: `linear-gradient(135deg,${accentC}22,${accentC}0c)`,
            border: `1.5px solid ${accentC}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isWarning ? ICONS.warning : ICONS.announcement}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
              Create {isWarning ? 'Warning' : 'Announcement'}
            </div>
            <div style={{ fontSize: 11.5, color: '#7c3aed', fontWeight: 500, marginTop: 2, opacity: 0.8 }}>
              Broadcast to users across the platform
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              border: '1.5px solid rgba(139,92,246,0.22)',
              background: 'rgba(237,233,254,0.6)',
              color: '#7c3aed', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {ICONS.close}
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div
          className="wam-scrollbox"
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            padding: '18px 20px',
            display: 'flex', flexDirection: 'column', gap: 16,
            minHeight: 0,
          }}
        >

          {/* ── Type Toggle ── */}
          <div>
            <Lbl>Type</Lbl>
            <div style={{
              display: 'flex', gap: 5, padding: 4,
              background: 'rgba(237,233,254,0.55)',
              borderRadius: 13, border: '1.5px solid rgba(139,92,246,0.15)',
            }}>
              {[['warning', 'Warning', ICONS.iconWarning], ['announcement', 'Announcement', ICONS.iconMegaphone]].map(([v, label, icon]) => (
                <button key={v} type="button" className="wam-type-btn" onClick={() => setType(v)} style={{
                  flex: 1, padding: '9px 8px', borderRadius: 10, fontSize: '12.5px', fontWeight: 700,
                  border: `1.5px solid ${type === v ? accentC + '70' : 'transparent'}`,
                  background: type === v ? '#fff' : 'transparent',
                  color: type === v ? accentC : '#9ca3af',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: type === v ? '0 2px 10px rgba(109,40,217,0.14)' : 'none',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>{icon(type === v)}{label}</button>
              ))}
            </div>
          </div>

          <Divider />

          {/* ── Title ── */}
          <div>
            <Lbl icon={ICONS.title} right={`${title.length}/100`}>
              Title <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
            </Lbl>
            <input
              className="wam-inp"
              style={inp}
              placeholder={`${isWarning ? 'Warning' : 'Announcement'} title…`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* ── Message ── */}
          <div>
            <Lbl icon={ICONS.msg} right={`${message.length}/500`}>
              Message <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>
            </Lbl>
            <textarea
              className="wam-inp"
              style={{ ...inp, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }}
              placeholder="Message content…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
            />
          </div>

          <Divider />

          {/* ── Severity (warning only) ── */}
          {isWarning && (
            <div>
              <Lbl icon={ICONS.severity}>Severity</Lbl>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SEVERITY_OPTS.map(o => {
                  const active = severity === o.v;
                  return (
                    <div
                      key={o.v}
                      onClick={() => setSeverity(o.v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                        border: `1.5px solid ${active ? `${o.color}60` : 'rgba(139,92,246,0.18)'}`,
                        background: active ? `${o.color}12` : '#fafafa',
                        transition: 'all 0.15s',
                      }}
                    >
                      {ICONS.severityDot(o.color)}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? o.color : '#374151' }}>{o.label}</div>
                        <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>{o.sub}</div>
                      </div>
                      {ICONS.radio(active, o.color)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Icon Style ── */}
          <div>
            <Lbl>Icon Style</Lbl>
            <IconPicker iconType={iconType} setIconType={setIconType} />
          </div>

          <Divider />

          {/* ── Send To ── */}
          <div>
            <Lbl icon={ICONS.target}>Send To</Lbl>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TARGET_OPTS.map(o => {
                const active = targetType === o.v;
                return (
                  <div
                    key={o.v}
                    onClick={() => setTargetType(o.v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${active ? `${accentC}60` : 'rgba(139,92,246,0.18)'}`,
                      background: active ? `${accentC}0d` : '#fafafa',
                      transition: 'all 0.15s',
                    }}
                  >
                    {o.icon(active)}
                    <div style={{ flex: 1, fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? accentC : '#374151' }}>
                      {o.label}
                    </div>
                    {ICONS.radio(active, accentC)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Selected Rooms List ── */}
          {showRoomList && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Lbl icon={ICONS.room} right={
                selectedRooms.length > 0
                  ? <span style={{ color: accentC, fontWeight: 700 }}>{selectedRooms.length} selected</span>
                  : 'none selected'
              }>
                Choose Rooms
              </Lbl>
              <div
                className="wam-scrollbox"
                style={{
                  overflowY: 'auto', overflowX: 'hidden',
                  maxHeight: 200,
                  border: '1.5px solid rgba(139,92,246,0.2)',
                  borderRadius: 12,
                  background: '#fff',
                  boxShadow: 'inset 0 2px 8px rgba(109,40,217,0.04)',
                }}
              >
                {rooms.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                    Loading rooms…
                  </div>
                ) : rooms.map(room => {
                  const sel = selectedRooms.includes(room.id);
                  return (
                    <div
                      key={room.id}
                      className="wam-check-item"
                      onClick={() => toggleRoom(room.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', cursor: 'pointer',
                        background: sel ? `${accentC}0f` : 'transparent',
                        borderBottom: '1px solid rgba(139,92,246,0.07)',
                        transition: 'background 0.12s',
                        boxSizing: 'border-box', width: '100%',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${sel ? accentC : '#d1d5db'}`,
                        background: sel ? `linear-gradient(135deg,${accentC},${accentC}cc)` : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s',
                        boxShadow: sel ? `0 2px 6px ${accentC}35` : 'none',
                      }}>
                        {sel && ICONS.check}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, color: '#1e1b4b', fontWeight: sel ? 700 : 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {room.name || room.id}
                        </div>
                        {room.slug && (
                          <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 1 }}>/{room.slug}</div>
                        )}
                      </div>
                      {sel && (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: accentC, flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedRooms.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                  {ICONS.iconWarning(true)} Select at least one room to send
                </div>
              )}
            </div>
          )}

          {/* ── Selected Users List ── */}
          {showUserList && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Lbl icon={ICONS.user} right={
                selectedUsers.length > 0
                  ? <span style={{ color: accentC, fontWeight: 700 }}>{selectedUsers.length} selected</span>
                  : 'none selected'
              }>
                Choose Users
              </Lbl>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }}>
                  {ICONS.search}
                </div>
                <input
                  className="wam-inp"
                  style={{ ...inp, paddingLeft: 34 }}
                  placeholder="Search by name…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
                {isSearching && (
                  <div style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 10, color: '#9ca3af',
                  }}>•••</div>
                )}
              </div>

              {/* User list */}
              <div
                className="wam-scrollbox"
                style={{
                  overflowY: 'auto', overflowX: 'hidden',
                  maxHeight: 200,
                  border: '1.5px solid rgba(139,92,246,0.2)',
                  borderRadius: 12,
                  background: '#fff',
                  boxShadow: 'inset 0 2px 8px rgba(109,40,217,0.04)',
                }}
              >
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                    {userSearch ? 'No users match this search' : 'No users loaded'}
                  </div>
                ) : filteredUsers.slice(0, 50).map(u => {
                  const sel = selectedUsers.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className="wam-check-item"
                      onClick={() => toggleUser(u.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', cursor: 'pointer',
                        background: sel ? `${accentC}0f` : 'transparent',
                        borderBottom: '1px solid rgba(139,92,246,0.07)',
                        transition: 'background 0.12s',
                        boxSizing: 'border-box', width: '100%',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${sel ? accentC : '#d1d5db'}`,
                        background: sel ? `linear-gradient(135deg,${accentC},${accentC}cc)` : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s',
                        boxShadow: sel ? `0 2px 6px ${accentC}35` : 'none',
                      }}>
                        {sel && ICONS.check}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, color: '#1e1b4b', fontWeight: sel ? 700 : 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {u.displayName || u.email || 'Unknown'}
                        </div>
                        {u.email && u.displayName && (
                          <div style={{
                            fontSize: 10.5, color: '#9ca3af', marginTop: 1,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {u.email}
                          </div>
                        )}
                      </div>
                      {sel && (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: accentC, flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
                {filteredUsers.length > 50 && (
                  <div style={{ padding: '8px 14px', fontSize: 11, color: '#9ca3af', fontWeight: 600, textAlign: 'center' }}>
                    Showing 50 of {filteredUsers.length} — use search to narrow down
                  </div>
                )}
              </div>
              {selectedUsers.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                  {ICONS.iconWarning(true)} Select at least one user to send
                </div>
              )}
            </div>
          )}

          {/* ── Info card when no list shown ── */}
          {!showRoomList && !showUserList && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px', borderRadius: 11,
              background: `${accentC}08`,
              border: `1.5px dashed ${accentC}40`,
              color: accentC, fontSize: 12.5, fontWeight: 600, textAlign: 'center',
            }}>
              {targetType === 'room' && (<>{ICONS.pin(true)} Will be sent to the current room only</>)}
              {targetType === 'all_rooms' && (<>{ICONS.globe(true)} Will be sent to ALL rooms simultaneously</>)}
              {targetType === 'all_users' && (<>{ICONS.globeUsers(true)} Will be sent to ALL registered users</>)}
            </div>
          )}

          <Divider />

          {/* ── Options: Urgent + Dismissible ── */}
          <div>
            <Lbl>Options</Lbl>
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

          <Divider />

          {/* ── Expiry ── */}
          <div>
            <Lbl icon={ICONS.clock} right="optional">Expiry Date & Time</Lbl>
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
        {/* end scrollable body */}

        {/* ── Footer ── */}
        <div style={{
          padding: '13px 20px 16px',
          borderTop: '1.5px solid rgba(139,92,246,0.1)',
          display: 'flex', flexDirection: 'column', gap: 10,
          flexShrink: 0,
          background: 'rgba(250,248,255,0.85)',
        }}>
          {/* Selection summary badge */}
          {(selectedRooms.length > 0 || selectedUsers.length > 0) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11.5, color: '#7c3aed', fontWeight: 700,
              background: 'rgba(109,40,217,0.07)',
              borderRadius: 9, padding: '7px 12px',
              border: '1px solid rgba(109,40,217,0.16)',
            }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
                <polyline points="20 6 9 17 4 12" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {selectedRooms.length > 0 ? `${selectedRooms.length} room${selectedRooms.length > 1 ? 's' : ''} selected` : ''}
              {selectedRooms.length > 0 && selectedUsers.length > 0 && <span style={{ opacity: 0.4 }}> · </span>}
              {selectedUsers.length > 0 ? `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} selected` : ''}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="wam-cancel"
              onClick={handleClose}
              disabled={isLoading}
              style={{
                flex: '0 0 90px', height: 46, borderRadius: 12,
                border: '1.5px solid rgba(139,92,246,0.25)',
                background: 'rgba(237,233,254,0.6)',
                color: '#6d28d9', fontSize: 13.5, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              Cancel
            </button>
            <button
              className="wam-submit"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                flex: 1, height: 46, borderRadius: 12, border: 'none',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                background: canSubmit
                  ? `linear-gradient(135deg,${accentC} 0%,${isWarning ? '#f59e0b' : '#a855f7'} 100%)`
                  : 'rgba(139,92,246,0.12)',
                fontSize: 14, fontWeight: 800, letterSpacing: '0.02em',
                boxShadow: canSubmit ? `0 5px 20px ${accentC}45` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.18s',
              }}
            >
              {canSubmit ? ICONS.send : ICONS.sendDisabled}
              <span style={{ color: canSubmit ? '#fff' : 'rgba(109,40,217,0.4)' }}>
                {isLoading ? 'Sending…' : 'Send Broadcast'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
});

export default WarningAnnouncementModal;
