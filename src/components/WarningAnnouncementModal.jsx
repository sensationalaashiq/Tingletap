import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, limit, getDocs, where } from 'firebase/firestore';

/* ── Premium SVG icons ──────────────────────────────── */
const IC = {
  warning: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#d97706" opacity=".18" stroke="#d97706" strokeWidth="1.6" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill="#d97706"/>
    </svg>
  ),
  announcement: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill="#7c3aed" opacity=".12" stroke="#7c3aed" strokeWidth="1.8"/>
      <line x1="6" y1="1" x2="6" y2="4" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="10" y1="1" x2="10" y2="4" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="14" y1="1" x2="14" y2="4" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  title: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M4 6h16M4 12h8M4 18h12" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth="1.6"/>
      <circle cx="12" cy="12" r="6" stroke="#7c3aed" strokeWidth="1.6"/>
      <circle cx="12" cy="12" r="2" fill="#7c3aed"/>
    </svg>
  ),
  severity: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#f59e0b" opacity=".2" stroke="#f59e0b" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth="1.6"/>
      <polyline points="12 6 12 12 16 14" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <line x1="18" y1="6" x2="6" y2="18" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
      <polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" opacity=".9"/>
    </svg>
  ),
  iconWarning: (active) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        fill={active ? '#d97706' : 'none'} stroke={active ? '#d97706' : '#9ca3af'} strokeWidth="1.6" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke={active ? '#d97706' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill={active ? '#d97706' : '#9ca3af'}/>
    </svg>
  ),
  iconInfo: (active) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <circle cx="12" cy="12" r="10" fill={active ? 'rgba(37,99,235,.15)' : 'none'} stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth="1.6"/>
      <circle cx="12" cy="8" r="1" fill={active ? '#2563eb' : '#9ca3af'}/>
      <line x1="12" y1="12" x2="12" y2="16" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  iconAnn: (active) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill={active ? 'rgba(124,58,237,.12)' : 'none'} stroke={active ? '#7c3aed' : '#9ca3af'} strokeWidth="1.6"/>
    </svg>
  ),
  iconAlert: (active) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill={active ? 'rgba(220,38,38,.12)' : 'none'} stroke={active ? '#dc2626' : '#9ca3af'} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={active ? '#dc2626' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  urgent: (active) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
        fill={active ? '#ef4444' : 'none'} stroke={active ? '#ef4444' : '#9ca3af'} strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  dismiss: (active) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <circle cx="12" cy="12" r="10" fill={active ? 'rgba(16,185,129,.12)' : 'none'} stroke={active ? '#10b981' : '#9ca3af'} strokeWidth="1.6"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke={active ? '#10b981' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
};

const WarningAnnouncementModal = ({ isVisible, onClose, currentUserProfile, currentRoomId }) => {
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

  useEffect(() => {
    if (!isVisible) return;
    const unsubRooms = onSnapshot(query(collection(db, 'rooms'), orderBy('name')), (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      if (currentRoomId && !selectedRooms.includes(currentRoomId)) setSelectedRooms([currentRoomId]);
    });
    // FIX 4: Limit the initial users listener to 100 entries
    const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(100)), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubRooms(); unsubUsers(); };
  }, [isVisible, currentRoomId]);

  const getBgBorder = () => {
    if (type === 'warning') {
      const m = { low:['#fffbeb','#f59e0b'], medium:['#fff7ed','#ef4444'], high:['#fff1f2','#dc2626'], critical:['#fff1f2','#991b1b'] };
      return m[severity] || m.medium;
    }
    return ['#faf5ff','#7c3aed'];
  };
  const [cardBg, accentC] = getBgBorder();

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
        isActive: true, dismissedBy: []
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

  const isWarning = type === 'warning';
  const filteredUsers = users.filter(u => !userSearch.trim() ||
    (u.displayName || u.email || '').toLowerCase().includes(userSearch.toLowerCase()));

  /* ── Shared style tokens ── */
  const lbl = { fontSize:'11px', fontWeight:700, color:'#4c1d95', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:'5px', display:'flex', alignItems:'center', gap:'5px' };
  const inp = {
    width:'100%', padding:'9px 12px', borderRadius:'10px', fontSize:'13px',
    border:'1.5px solid rgba(139,92,246,0.25)', background:'#fff',
    color:'#1e1b4b', outline:'none', boxSizing:'border-box',
    fontFamily:"'Inter',-apple-system,sans-serif", transition:'border 0.15s',
  };
  const inpFocus = { borderColor:'rgba(109,40,217,0.55)', background:'rgba(237,233,254,0.3)' };

  const IconPicker = () => {
    const opts = [
      { v:'warning',      label:'Warning',      icon: IC.iconWarning },
      { v:'info',         label:'Info',          icon: IC.iconInfo },
      { v:'announcement', label:'Megaphone',     icon: IC.iconAnn },
      { v:'alert',        label:'Alert',         icon: IC.iconAlert },
    ];
    return (
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {opts.map(o => (
          <button key={o.v} onClick={() => setIconType(o.v)} style={{
            display:'flex', alignItems:'center', gap:'5px',
            padding:'6px 10px', borderRadius:'9px', fontSize:'11.5px', fontWeight:600,
            border:`1.5px solid ${iconType === o.v ? accentC : 'rgba(139,92,246,0.2)'}`,
            background: iconType === o.v ? `${accentC}12` : '#fff',
            color: iconType === o.v ? accentC : '#6b7280',
            cursor:'pointer', transition:'all 0.15s',
          }}>
            {o.icon(iconType === o.v)}
            {o.label}
          </button>
        ))}
      </div>
    );
  };

  const CheckRow = ({ checked, onChange, children }) => (
    <div onClick={onChange} style={{
      display:'flex', alignItems:'center', gap:'9px',
      padding:'8px 12px', borderRadius:'10px', cursor:'pointer',
      border:`1.5px solid ${checked ? `${accentC}50` : 'rgba(139,92,246,0.15)'}`,
      background: checked ? `${accentC}08` : '#fff',
      transition:'all 0.15s', userSelect:'none',
    }}>
      <div style={{
        width:17, height:17, borderRadius:5, flexShrink:0,
        border:`1.5px solid ${checked ? accentC : 'rgba(139,92,246,0.3)'}`,
        background: checked ? `linear-gradient(135deg,${accentC},${accentC}cc)` : '#fff',
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all 0.15s',
      }}>
        {checked && IC.check}
      </div>
      {children}
    </div>
  );

  return ReactDOM.createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:99999,
      background:'rgba(109,40,217,0.12)',
      backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'16px',
      fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>

      <div style={{
        background:'linear-gradient(160deg,#faf8ff 0%,#f5f3ff 50%,#fdf4ff 100%)',
        border:'1.5px solid rgba(139,92,246,0.25)',
        borderRadius:'22px', width:'100%', maxWidth:'440px',
        boxShadow:'0 0 0 1px rgba(255,255,255,0.9) inset, 0 24px 60px rgba(109,40,217,0.18), 0 8px 20px rgba(109,40,217,0.08)',
        animation:'wamUp 0.32s cubic-bezier(0.34,1.56,0.64,1) both',
        maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden',
        position:'relative',
      }}>
        <style>{`
          @keyframes wamUp { from{opacity:0;transform:scale(0.88) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
          .wam-inp:focus { border-color:rgba(109,40,217,0.5)!important; background:rgba(237,233,254,0.35)!important; }
          .wam-sel option { background:#fff; color:#1e1b4b; }
          .wam-list-item:hover { background:rgba(237,233,254,0.5)!important; }
        `}</style>

        {/* Decorative top strip */}
        <div style={{ height:4, background:`linear-gradient(90deg,${accentC},${isWarning?'#f59e0b':'#a855f7'})`, borderRadius:'22px 22px 0 0', flexShrink:0 }} />

        {/* Close */}
        <button onClick={handleClose} style={{
          position:'absolute', top:18, right:18, width:30, height:30, borderRadius:'50%',
          border:'1.5px solid rgba(139,92,246,0.2)', background:'rgba(237,233,254,0.6)',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.15s',
        }} onMouseEnter={e => e.currentTarget.style.background='rgba(237,233,254,1)'}
           onMouseLeave={e => e.currentTarget.style.background='rgba(237,233,254,0.6)'}>
          {IC.close}
        </button>

        {/* Header */}
        <div style={{ padding:'20px 22px 14px', textAlign:'center', flexShrink:0 }}>
          <div style={{
            width:52, height:52, borderRadius:'50%', margin:'0 auto 10px',
            background:`linear-gradient(135deg,${accentC}18,${accentC}08)`,
            border:`2px solid ${accentC}35`,
            boxShadow:`0 0 0 6px ${accentC}08`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {isWarning ? IC.warning : IC.announcement}
          </div>
          <div style={{ fontSize:'16px', fontWeight:800, color:'#1e1b4b', letterSpacing:'-0.02em', marginBottom:3 }}>
            Create {isWarning ? 'Warning' : 'Announcement'}
          </div>
          <div style={{ fontSize:'12px', color:'#7c3aed', fontWeight:500, opacity:0.7 }}>
            Broadcast to users across the platform
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'0 20px 4px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'11px' }}>

          {/* Type toggle */}
          <div style={{ display:'flex', gap:'5px', padding:'4px', background:'rgba(237,233,254,0.5)', borderRadius:'12px', border:'1.5px solid rgba(139,92,246,0.15)' }}>
            {[['warning','Warning',IC.warning],['announcement','Announcement',IC.announcement]].map(([v,lbl2,icon]) => (
              <button key={v} onClick={() => setType(v)} style={{
                flex:1, padding:'7px 0', borderRadius:'9px', fontSize:'12px', fontWeight:700,
                border:`1.5px solid ${type===v ? accentC+'60' : 'transparent'}`,
                background: type===v ? '#fff' : 'transparent',
                color: type===v ? accentC : '#9ca3af',
                cursor:'pointer', transition:'all 0.15s',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
                boxShadow: type===v ? '0 2px 8px rgba(109,40,217,0.1)' : 'none',
              }}>
                {icon}{lbl2}
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label style={lbl}>{IC.title} Title <span style={{color:'#ef4444'}}>*</span></label>
            <input className="wam-inp" style={inp} placeholder={`${isWarning ? 'Warning' : 'Announcement'} title…`}
              value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
          </div>

          {/* Message */}
          <div>
            <label style={lbl}>
              {IC.message} Message <span style={{color:'#ef4444'}}>*</span>
              <span style={{fontWeight:400,textTransform:'none',fontSize:'10px',color:'#9ca3af',marginLeft:4}}>{message.length}/500</span>
            </label>
            <textarea className="wam-inp" style={{...inp, minHeight:68, resize:'vertical'}}
              placeholder="Message content…" value={message}
              onChange={e => setMessage(e.target.value)} maxLength={500} />
          </div>

          {/* Severity + Target */}
          <div style={{ display:'flex', gap:'8px' }}>
            {isWarning && (
              <div style={{ flex:1 }}>
                <label style={lbl}>{IC.severity} Severity</label>
                <select className="wam-inp wam-sel" style={inp} value={severity} onChange={e => setSeverity(e.target.value)}>
                  <option value="low">🟡 Low</option>
                  <option value="medium">🟠 Medium</option>
                  <option value="high">🔴 High</option>
                  <option value="critical">⚫ Critical</option>
                </select>
              </div>
            )}
            <div style={{ flex:1 }}>
              <label style={lbl}>{IC.target} Send To</label>
              <select className="wam-inp wam-sel" style={inp} value={targetType} onChange={e => setTargetType(e.target.value)}>
                <option value="room">Current Room</option>
                <option value="selected_rooms">Selected Rooms</option>
                <option value="all_rooms">All Rooms</option>
                <option value="selected_users">Selected Users</option>
                <option value="all_users">All Users</option>
              </select>
            </div>
          </div>

          {/* Room list */}
          {targetType === 'selected_rooms' && (
            <div style={{ maxHeight:110, overflowY:'auto', display:'flex', flexDirection:'column', gap:3,
              border:'1.5px solid rgba(139,92,246,0.2)', borderRadius:10, padding:6, background:'#fff' }}>
              {rooms.map(room => (
                <label key={room.id} className="wam-list-item" onClick={() => setSelectedRooms(prev => prev.includes(room.id) ? prev.filter(i=>i!==room.id) : [...prev,room.id])}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:7, cursor:'pointer',
                    background: selectedRooms.includes(room.id) ? `${accentC}10` : 'transparent', transition:'all 0.12s' }}>
                  <div style={{ width:16,height:16,borderRadius:4,border:`1.5px solid ${selectedRooms.includes(room.id)?accentC:'rgba(139,92,246,0.3)'}`,
                    background:selectedRooms.includes(room.id)?`linear-gradient(135deg,${accentC},${accentC}bb)`:'#fff',
                    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.12s' }}>
                    {selectedRooms.includes(room.id) && IC.check}
                  </div>
                  <span style={{ fontSize:'12px', color:'#374151', fontWeight:500 }}>{room.name}</span>
                </label>
              ))}
            </div>
          )}

          {/* User list */}
          {targetType === 'selected_users' && (
            <>
              <input className="wam-inp" style={{...inp, padding:'7px 12px'}} placeholder="Search users…"
                value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              <div style={{ maxHeight:110, overflowY:'auto', display:'flex', flexDirection:'column', gap:3,
                border:'1.5px solid rgba(139,92,246,0.2)', borderRadius:10, padding:6, background:'#fff', marginTop:-5 }}>
                {filteredUsers.slice(0,30).map(u => (
                  <label key={u.id} className="wam-list-item" onClick={() => setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(i=>i!==u.id) : [...prev,u.id])}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:7, cursor:'pointer',
                      background: selectedUsers.includes(u.id) ? `${accentC}10` : 'transparent', transition:'all 0.12s' }}>
                    <div style={{ width:16,height:16,borderRadius:4,border:`1.5px solid ${selectedUsers.includes(u.id)?accentC:'rgba(139,92,246,0.3)'}`,
                      background:selectedUsers.includes(u.id)?`linear-gradient(135deg,${accentC},${accentC}bb)`:'#fff',
                      display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.12s' }}>
                      {selectedUsers.includes(u.id) && IC.check}
                    </div>
                    <span style={{ fontSize:'12px', color:'#374151', fontWeight:500 }}>{u.displayName || u.email}</span>
                  </label>
                ))}
                {filteredUsers.length > 30 && <div style={{ fontSize:'11px', color:'#9ca3af', padding:'3px 8px' }}>Showing 30 of {filteredUsers.length}</div>}
              </div>
            </>
          )}

          {/* Urgent + Dismissible */}
          <div style={{ display:'flex', gap:'7px' }}>
            <CheckRow checked={isUrgent} onChange={() => setIsUrgent(v=>!v)}>
              <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:'12px', color: isUrgent ? '#dc2626' : '#374151', fontWeight:600 }}>
                {IC.urgent(isUrgent)} Urgent
              </span>
            </CheckRow>
            <CheckRow checked={allowDismiss} onChange={() => setAllowDismiss(v=>!v)}>
              <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:'12px', color: allowDismiss ? '#10b981' : '#374151', fontWeight:600 }}>
                {IC.dismiss(allowDismiss)} Dismissible
              </span>
            </CheckRow>
          </div>

          {/* Icon picker */}
          <div>
            <label style={lbl}>Icon Style</label>
            <IconPicker />
          </div>

          {/* Expiry */}
          <div>
            <label style={lbl}>{IC.clock} Expiry <span style={{fontWeight:400,textTransform:'none',fontSize:'10px',color:'#9ca3af'}}>(optional)</span></label>
            <input type="datetime-local" className="wam-inp" style={inp}
              value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0,16)} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px 18px', borderTop:'1.5px solid rgba(139,92,246,0.1)', display:'flex', gap:'10px', flexShrink:0 }}>
          <button onClick={handleClose} disabled={isLoading} style={{
            flex:'0 0 88px', height:42, borderRadius:'11px',
            border:'1.5px solid rgba(139,92,246,0.22)', background:'rgba(237,233,254,0.5)',
            color:'#6d28d9', fontSize:'13px', fontWeight:700, cursor:'pointer',
            transition:'all 0.15s',
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isLoading || !title.trim() || !message.trim()} style={{
            flex:1, height:42, borderRadius:'11px', border:'none', cursor:'pointer',
            background: (isLoading || !title.trim() || !message.trim())
              ? 'rgba(139,92,246,0.15)'
              : `linear-gradient(135deg,${accentC},${isWarning?'#f59e0b':'#a855f7'})`,
            color: (isLoading || !title.trim() || !message.trim()) ? 'rgba(109,40,217,0.4)' : '#fff',
            fontSize:'13px', fontWeight:700, letterSpacing:'0.02em',
            boxShadow: (isLoading || !title.trim() || !message.trim()) ? 'none' : '0 4px 16px rgba(109,40,217,0.32)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'7px',
            transition:'all 0.18s',
          }}>
            {IC.send}
            {isLoading ? 'Creating…' : `Broadcast ${isWarning ? 'Warning' : 'Announcement'}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WarningAnnouncementModal;
