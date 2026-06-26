import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

const WarningAnnouncementModal = ({
  isVisible,
  onClose,
  currentUserProfile,
  currentRoomId
}) => {
  const [type, setType] = useState('warning');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [targetType, setTargetType] = useState('room');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [allowDismiss, setAllowDismiss] = useState(true);
  const [bgColor, setBgColor] = useState('#ef4444');
  const [textColor, setTextColor] = useState('#ffffff');
  const [borderColor, setBorderColor] = useState('#dc2626');
  const [iconType, setIconType] = useState('warning');
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const roomsQuery = query(collection(db, 'rooms'), orderBy('name'));
      const unsubRooms = onSnapshot(roomsQuery, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRooms(list);
        if (currentRoomId && !selectedRooms.includes(currentRoomId)) setSelectedRooms([currentRoomId]);
      });
      const usersQuery = query(collection(db, 'users'));
      const unsubUsers = onSnapshot(usersQuery, (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => { unsubRooms(); unsubUsers(); };
    }
  }, [isVisible, currentRoomId]);

  useEffect(() => {
    if (type === 'warning') {
      const map = { low: ['#f59e0b','#d97706'], medium: ['#ef4444','#dc2626'], high: ['#dc2626','#b91c1c'], critical: ['#7f1d1d','#991b1b'] };
      const [bg, bd] = map[severity] || map.medium;
      setBgColor(bg); setBorderColor(bd); setTextColor('#ffffff');
    } else { setBgColor('#3b82f6'); setBorderColor('#2563eb'); setTextColor('#ffffff'); }
  }, [type, severity]);

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) return;
    if (targetType === 'selected_rooms' && selectedRooms.length === 0) return;
    if (targetType === 'selected_users' && selectedUsers.length === 0) return;
    setIsLoading(true);
    try {
      const data = {
        type, title: title.trim(), message: message.trim(), severity, targetType,
        selectedRooms: targetType === 'selected_rooms' ? selectedRooms : targetType === 'room' ? [currentRoomId] : targetType === 'all_rooms' ? rooms.map(r => r.id) : [],
        selectedUsers: targetType === 'selected_users' ? selectedUsers : targetType === 'all_users' ? users.map(u => u.id) : [],
        isUrgent, allowDismiss,
        styling: { bgColor, textColor, borderColor, iconType },
        createdBy: { uid: currentUserProfile.uid, displayName: currentUserProfile.displayName || 'System', role: currentUserProfile.role || 'admin' },
        createdAt: serverTimestamp(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true, dismissedBy: []
      };
      if (targetType === 'room') { data.roomId = currentRoomId; }
      await addDoc(collection(db, 'warnings_announcements'), data);
      handleClose();
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleClose = () => {
    setType('warning'); setTitle(''); setMessage(''); setSeverity('medium');
    setTargetType('room'); setSelectedRooms([]); setSelectedUsers([]);
    setExpiresAt(''); setIsUrgent(false); setAllowDismiss(true); setIsLoading(false);
    onClose();
  };

  const canCreate = () => currentUserProfile && ['owner','admin','moderator'].includes(currentUserProfile.role);

  if (!isVisible || !canCreate()) return null;

  const isWarning = type === 'warning';
  const accentColor = isWarning ? '#ef4444' : '#3b82f6';
  const accentGlow  = isWarning ? 'rgba(239,68,68,0.35)' : 'rgba(59,130,246,0.35)';
  const accentLight = isWarning ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)';

  const iconOptions = [
    { value: 'warning',      label: 'Warning',      d: 'M12,2L13.09,8.26L22,9L14.74,14.74L16.18,22.91L12,18.18L7.82,22.91L9.26,14.74L2,9L10.91,8.26L12,2Z' },
    { value: 'info',         label: 'Information',  d: 'M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z' },
    { value: 'announcement', label: 'Announcement', d: 'M12,8H4A2,2 0 0,0 2,10V14A2,2 0 0,0 4,16H5V20A1,1 0 0,0 6,21H8A1,1 0 0,0 9,20V16H12L17,20V4L12,8M21.5,12C21.5,13.71 20.54,15.26 19,16V8C20.53,8.75 21.5,10.3 21.5,12Z' },
    { value: 'alert',        label: 'Alert',        d: 'M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19Z' },
  ];

  const selStyle = {
    width:'100%', padding:'8px 10px', borderRadius:'9px', fontSize:'12px', fontWeight:600,
    border:`1.5px solid rgba(255,255,255,0.12)`, background:'rgba(255,255,255,0.06)',
    color:'#e2e8f0', outline:'none', cursor:'pointer'
  };
  const inputStyle = {
    width:'100%', padding:'8px 10px', borderRadius:'9px', fontSize:'12px',
    border:`1.5px solid rgba(255,255,255,0.12)`, background:'rgba(255,255,255,0.06)',
    color:'#e2e8f0', outline:'none', boxSizing:'border-box',
    fontFamily:'inherit', resize:'none'
  };
  const labelStyle = { fontSize:'11px', fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:'5px', display:'block' };

  return ReactDOM.createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:99999,
      background:'rgba(10,8,28,0.88)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'16px',
      fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
    }} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        background:'linear-gradient(150deg,#12082a 0%,#1e0f3a 50%,#0f0820 100%)',
        border:'1.5px solid rgba(139,92,246,0.3)',
        borderRadius:'20px', width:'100%', maxWidth:'420px',
        boxShadow:`0 0 0 1px rgba(255,255,255,0.05) inset, 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.12)`,
        animation:'wamSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        maxHeight:'88vh', display:'flex', flexDirection:'column', overflow:'hidden'
      }}>
        <style>{`
          @keyframes wamSlideUp { from{opacity:0;transform:scale(0.88) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes wamPulse { 0%,100%{box-shadow:0 0 0 6px rgba(139,92,246,0.06),0 6px 24px rgba(139,92,246,0.2)} 50%{box-shadow:0 0 0 12px rgba(139,92,246,0.1),0 6px 32px rgba(139,92,246,0.35)} }
          .wam-input:focus { border-color:rgba(139,92,246,0.55)!important; background:rgba(139,92,246,0.08)!important; }
          .wam-type-btn { flex:1; padding:7px 0; border-radius:8px; border:1.5px solid transparent; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.18s; letter-spacing:0.02em; }
          .wam-type-btn.active { color:#fff; }
          .wam-chip { padding:3px 9px; border-radius:6px; font-size:10.5px; font-weight:700; border:1.5px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:#94a3b8; cursor:pointer; transition:all 0.15s; }
          .wam-chip.on { background:rgba(139,92,246,0.2); border-color:rgba(139,92,246,0.5); color:#c084fc; }
          .wam-check-row { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:9px; border:1.5px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); cursor:pointer; margin-bottom:5px; transition:all 0.15s; }
          .wam-check-row:hover { border-color:rgba(139,92,246,0.35); }
          .wam-check-box { width:16px; height:16px; border-radius:5px; border:1.5px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.04); flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
          .wam-check-row.checked .wam-check-box { background:linear-gradient(135deg,#7c3aed,#a855f7); border-color:#a855f7; }
        `}</style>

        {/* Header */}
        <div style={{ padding:'22px 22px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', textAlign:'center', flexShrink:0 }}>
          <div style={{
            width:56, height:56, borderRadius:'50%', margin:'0 auto 12px',
            background:`linear-gradient(135deg,${accentLight},rgba(139,92,246,0.15))`,
            border:`2px solid ${accentColor}55`,
            boxShadow:`0 0 0 6px ${accentLight}, 0 6px 24px ${accentGlow}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            animation:'wamPulse 3s ease-in-out infinite'
          }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill={accentColor}>
              <path d={isWarning
                ? 'M12,2L13.09,8.26L22,9L14.74,14.74L16.18,22.91L12,18.18L7.82,22.91L9.26,14.74L2,9L10.91,8.26L12,2Z'
                : 'M12,8H4A2,2 0 0,0 2,10V14A2,2 0 0,0 4,16H5V20A1,1 0 0,0 6,21H8A1,1 0 0,0 9,20V16H12L17,20V4L12,8M21.5,12C21.5,13.71 20.54,15.26 19,16V8C20.53,8.75 21.5,10.3 21.5,12Z'
              }/>
            </svg>
          </div>
          <div style={{ fontSize:'16px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', marginBottom:3 }}>
            Create {isWarning ? 'Warning' : 'Announcement'}
          </div>
          <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.45)', fontWeight:400 }}>
            Broadcast to users across the platform
          </div>
          <button onClick={handleClose} style={{
            position:'absolute', top:14, right:14, width:28, height:28, borderRadius:'50%',
            border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)',
            color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center'
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:'16px 20px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'12px' }}>

          {/* Type selector */}
          <div>
            <div style={{ display:'flex', gap:'6px', padding:'4px', background:'rgba(255,255,255,0.04)', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.08)' }}>
              <button className={`wam-type-btn ${isWarning ? 'active' : ''}`}
                style={{ background: isWarning ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'transparent', color: isWarning ? '#fff' : '#94a3b8', borderColor: isWarning ? '#ef4444' : 'transparent' }}
                onClick={() => setType('warning')}>
                ⚠️ Warning
              </button>
              <button className={`wam-type-btn ${!isWarning ? 'active' : ''}`}
                style={{ background: !isWarning ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'transparent', color: !isWarning ? '#fff' : '#94a3b8', borderColor: !isWarning ? '#3b82f6' : 'transparent' }}
                onClick={() => setType('announcement')}>
                📢 Announcement
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input className="wam-input" style={inputStyle} placeholder={`${isWarning ? 'Warning' : 'Announcement'} title…`}
              value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
          </div>

          {/* Message */}
          <div>
            <label style={labelStyle}>Message * <span style={{color:'#475569',fontWeight:400,textTransform:'none'}}>({message.length}/500)</span></label>
            <textarea className="wam-input" style={{...inputStyle, minHeight:72}} placeholder="Message content…"
              value={message} onChange={e => setMessage(e.target.value)} maxLength={500} />
          </div>

          {/* Severity + Target in a row */}
          <div style={{ display:'flex', gap:'8px' }}>
            {isWarning && (
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Severity</label>
                <select className="wam-input" style={selStyle} value={severity} onChange={e => setSeverity(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            )}
            <div style={{ flex:1 }}>
              <label style={labelStyle}>Send To</label>
              <select className="wam-input" style={selStyle} value={targetType} onChange={e => setTargetType(e.target.value)}>
                <option value="room">Current Room</option>
                <option value="selected_rooms">Selected Rooms</option>
                <option value="all_rooms">All Rooms</option>
                <option value="selected_users">Selected Users</option>
                <option value="all_users">All Users</option>
              </select>
            </div>
          </div>

          {/* Room checkboxes */}
          {targetType === 'selected_rooms' && (
            <div style={{ maxHeight:120, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
              {rooms.map(room => (
                <label key={room.id} className={`wam-check-row ${selectedRooms.includes(room.id) ? 'checked' : ''}`}
                  onClick={() => setSelectedRooms(prev => prev.includes(room.id) ? prev.filter(id => id !== room.id) : [...prev, room.id])}>
                  <div className="wam-check-box">
                    {selectedRooms.includes(room.id) && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                  </div>
                  <span style={{ fontSize:'12px', color:'#e2e8f0' }}>{room.name}</span>
                </label>
              ))}
            </div>
          )}

          {/* User checkboxes */}
          {targetType === 'selected_users' && (
            <div style={{ maxHeight:120, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
              {users.slice(0,20).map(user => (
                <label key={user.id} className={`wam-check-row ${selectedUsers.includes(user.id) ? 'checked' : ''}`}
                  onClick={() => setSelectedUsers(prev => prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id])}>
                  <div className="wam-check-box">
                    {selectedUsers.includes(user.id) && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                  </div>
                  <span style={{ fontSize:'12px', color:'#e2e8f0' }}>{user.displayName || user.email}</span>
                </label>
              ))}
              {users.length > 20 && <div style={{ fontSize:'11px', color:'#64748b', padding:'4px 10px' }}>Showing 20 of {users.length}. Use "All Users" for everyone.</div>}
            </div>
          )}

          {/* Options row */}
          <div style={{ display:'flex', gap:'8px' }}>
            <label className={`wam-check-row ${isUrgent ? 'checked' : ''}`} style={{ flex:1, marginBottom:0 }}
              onClick={() => setIsUrgent(v => !v)}>
              <div className="wam-check-box">
                {isUrgent && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
              </div>
              <span style={{ fontSize:'11.5px', color:'#e2e8f0' }}>Urgent</span>
            </label>
            <label className={`wam-check-row ${allowDismiss ? 'checked' : ''}`} style={{ flex:1, marginBottom:0 }}
              onClick={() => setAllowDismiss(v => !v)}>
              <div className="wam-check-box">
                {allowDismiss && <svg viewBox="0 0 24 24" width="10" height="10" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
              </div>
              <span style={{ fontSize:'11.5px', color:'#e2e8f0' }}>Dismissible</span>
            </label>
          </div>

          {/* Icon picker */}
          <div>
            <label style={labelStyle}>Icon</label>
            <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
              {iconOptions.map(opt => (
                <button key={opt.value} className={`wam-chip ${iconType === opt.value ? 'on' : ''}`}
                  onClick={() => setIconType(opt.value)}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label style={labelStyle}>Expiry (optional)</label>
            <input type="datetime-local" className="wam-input" style={inputStyle}
              value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0,16)} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px 16px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'10px', flexShrink:0 }}>
          <button onClick={handleClose} disabled={isLoading} style={{
            flex:'0 0 90px', height:42, borderRadius:'10px', border:'1.5px solid rgba(255,255,255,0.1)',
            background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.6)', fontSize:'13px', fontWeight:700, cursor:'pointer'
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={isLoading || !title.trim() || !message.trim()} style={{
            flex:1, height:42, borderRadius:'10px', border:'none', cursor:'pointer',
            background: (isLoading || !title.trim() || !message.trim()) ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg,${accentColor},${accentColor}cc)`,
            color: (isLoading || !title.trim() || !message.trim()) ? 'rgba(255,255,255,0.25)' : '#fff',
            fontSize:'13px', fontWeight:700, letterSpacing:'0.02em',
            boxShadow: (isLoading || !title.trim() || !message.trim()) ? 'none' : `0 4px 16px ${accentGlow}`,
            transition:'all 0.2s'
          }}>
            {isLoading ? 'Creating…' : `Create ${isWarning ? 'Warning' : 'Announcement'}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WarningAnnouncementModal;
