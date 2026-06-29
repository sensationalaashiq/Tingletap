import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';

/* ── Premium SVG icons ──────────────────────────────── */
const IC = {
  header: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(124,58,237,.15)" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round"/>
      <polyline points="9 12 11 14 15 10" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(124,58,237,.1)"/>
    </svg>
  ),
  sort: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <line x1="3" y1="6" x2="21" y2="6" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="3" y1="12" x2="15" y2="12" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="3" y1="18" x2="9" y2="18" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  empty: (
    <svg viewBox="0 0 24 24" width="48" height="48" fill="none">
      <circle cx="12" cy="12" r="10" fill="rgba(139,92,246,.08)" stroke="rgba(139,92,246,.25)" strokeWidth="1.5"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke="rgba(139,92,246,.5)" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  activate: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <polygon points="5 3 19 12 5 21 5 3" fill="#10b981" opacity=".7" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  deactivate: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <rect x="6" y="4" width="4" height="16" rx="1" fill="#f59e0b" opacity=".8"/>
      <rect x="14" y="4" width="4" height="16" rx="1" fill="#f59e0b" opacity=".8"/>
    </svg>
  ),
  delete: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <polyline points="3 6 5 6 21 6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 11v6M14 11v6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#ef4444" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="rgba(217,119,6,.15)" stroke="#d97706" strokeWidth="1.6" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill="#d97706"/>
    </svg>
  ),
  announcement: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill="rgba(124,58,237,.12)" stroke="#7c3aed" strokeWidth="1.8"/>
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <circle cx="12" cy="12" r="10" fill="rgba(37,99,235,.1)" stroke="#2563eb" strokeWidth="1.6"/>
      <circle cx="12" cy="8" r="1" fill="#2563eb"/>
      <line x1="12" y1="12" x2="12" y2="16" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="rgba(220,38,38,.1)" stroke="#dc2626" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  notice: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="rgba(8,145,178,.1)" stroke="#0891b2" strokeWidth="1.6" strokeLinejoin="round"/>
      <polyline points="14 2 14 8 20 8" stroke="#0891b2" strokeWidth="1.6" strokeLinejoin="round"/>
      <line x1="8" y1="13" x2="16" y2="13" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  urgent: (
    <svg viewBox="0 0 24 24" width="9" height="9" fill="#ef4444"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="5" stroke="#7c3aed" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="1.5" fill="#7c3aed"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#6b7280" strokeWidth="1.5"/>
      <polyline points="12 6 12 12 16 14" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="7" r="4" stroke="#6b7280" strokeWidth="1.5"/>
    </svg>
  ),
  dismiss: (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#6b7280" strokeWidth="1.5"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
      <polyline points="3 6 5 6 21 6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const getTypeIcon = (w) => {
  const t = w.styling?.iconType || w.type;
  if (t === 'warning')      return IC.warning;
  if (t === 'info')         return IC.info;
  if (t === 'announcement') return IC.announcement;
  if (t === 'alert')        return IC.alert;
  if (t === 'notice')       return IC.notice;
  return w.type === 'warning' ? IC.warning : IC.announcement;
};

const getBorderColor = (w) => {
  if (w.isUrgent) return '#ef4444';
  if (w.type === 'announcement') return '#7c3aed';
  const m = { low:'#f59e0b', medium:'#ef4444', high:'#dc2626', critical:'#991b1b' };
  return m[w.severity] || '#ef4444';
};

const WarningAnnouncementManager = ({ isVisible, onClose, currentUserProfile }) => {
  const [warnings, setWarnings]       = useState([]);
  const [filter, setFilter]           = useState('all');
  const [sortBy, setSortBy]           = useState('newest');
  const [loading, setLoading]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!isVisible) return;
    const q = query(collection(db, 'warnings_announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setWarnings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isVisible]);

  const canManage = () => currentUserProfile && ['owner','admin','moderator'].includes(currentUserProfile.role);
  if (!isVisible || !canManage()) return null;

  const getExpiry = (w) => {
    if (!w.expiresAt) return null;
    if (w.expiresAt.toDate) return w.expiresAt.toDate();
    if (w.expiresAt.seconds) return new Date(w.expiresAt.seconds * 1000);
    return new Date(w.expiresAt);
  };

  const isExpiredFn = (w) => { const d = getExpiry(w); return d ? d <= new Date() : false; };

  const displayList = (() => {
    let list = [...warnings];
    if (filter === 'active')        list = list.filter(w => w.isActive && !isExpiredFn(w));
    if (filter === 'expired')       list = list.filter(w => !w.isActive || isExpiredFn(w));
    if (filter === 'warnings')      list = list.filter(w => w.type === 'warning');
    if (filter === 'announcements') list = list.filter(w => w.type === 'announcement');
    if (sortBy === 'oldest')   list.sort((a,b) => (a.createdAt?.toDate?.()??0) - (b.createdAt?.toDate?.()??0));
    if (sortBy === 'severity') {
      const o = { critical:4, high:3, medium:2, low:1 };
      list.sort((a,b) => (o[b.severity]||0) - (o[a.severity]||0));
    }
    return list;
  })();

  const handleToggle = async (id, cur) => {
    setLoading(true);
    try { await updateDoc(doc(db,'warnings_announcements',id), { isActive: !cur }); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try { await deleteDoc(doc(db,'warnings_announcements',id)); setConfirmDelete(null); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds*1000 : ts);
      return d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
    } catch { return '—'; }
  };

  const getStatusBadge = (w) => {
    const exp = isExpiredFn(w);
    if (exp) return { label:'Expired',  bg:'#fee2e2', color:'#991b1b' };
    if (w.isActive) return { label:'Active',   bg:'#dcfce7', color:'#15803d' };
    return         { label:'Inactive', bg:'#f1f5f9', color:'#475569' };
  };

  const severityBadge = {
    low:      { bg:'#fffbeb', color:'#92400e' },
    medium:   { bg:'#fff7ed', color:'#9a3412' },
    high:     { bg:'#fee2e2', color:'#991b1b' },
    critical: { bg:'#fce7f3', color:'#9d174d' },
  };

  const getTarget = (w) => {
    switch (w.targetType) {
      case 'all_users':      return 'All Users';
      case 'selected_users': return `${w.selectedUsers?.length||0} Users`;
      case 'room':           return 'Current Room';
      case 'selected_rooms': return `${w.selectedRooms?.length||0} Rooms`;
      case 'all_rooms':      return 'All Rooms';
      default:               return '—';
    }
  };

  /* ── shared styles ── */
  const sel = {
    padding:'6px 10px', borderRadius:9, fontSize:'12px', fontWeight:600,
    border:'1.5px solid rgba(139,92,246,0.2)', background:'#fff', color:'#4c1d95',
    outline:'none', cursor:'pointer', minWidth:130,
  };

  return ReactDOM.createPortal(
    <div style={{
      position:'fixed', inset:0, zIndex:99999,
      background:'rgba(109,40,217,0.12)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'16px', fontFamily:"'Inter',-apple-system,sans-serif",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{
        background:'linear-gradient(160deg,#faf8ff 0%,#f5f3ff 40%,#fdf4ff 100%)',
        border:'1.5px solid rgba(139,92,246,0.22)',
        borderRadius:'22px', width:'100%', maxWidth:'860px', maxHeight:'90vh',
        display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow:'0 0 0 1px rgba(255,255,255,0.9) inset, 0 24px 60px rgba(109,40,217,0.16)',
        animation:'wamMgrUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>
        <style>{`
          @keyframes wamMgrUp { from{opacity:0;transform:translateY(24px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
          .wm-sel option { background:#fff; color:#1e1b4b; }
          .wm-item { transition:box-shadow 0.15s,transform 0.15s; }
          .wm-item:hover { box-shadow:0 4px 18px rgba(109,40,217,0.1)!important; transform:translateY(-1px); }
          .wm-btn { transition:all 0.15s; }
          .wm-btn:hover { opacity:0.85; transform:translateY(-1px); }
          .wm-btn:active { transform:scale(0.97); }
        `}</style>

        {/* Top strip */}
        <div style={{ height:4, background:'linear-gradient(90deg,#7c3aed,#a855f7,#ec4899)', borderRadius:'22px 22px 0 0', flexShrink:0 }} />

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 22px 14px', borderBottom:'1.5px solid rgba(139,92,246,0.1)', flexShrink:0 }}>
          <div style={{ width:46, height:46, borderRadius:14, background:'linear-gradient(135deg,rgba(124,58,237,.15),rgba(168,85,247,.1))', border:'1.5px solid rgba(124,58,237,.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {IC.header}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'15px', fontWeight:800, color:'#1e1b4b', letterSpacing:'-0.02em' }}>Warning & Announcement Manager</div>
            <div style={{ fontSize:'12px', color:'#7c3aed', fontWeight:500, opacity:0.75, marginTop:1 }}>
              {warnings.length} total • {warnings.filter(w => w.isActive && !isExpiredFn(w)).length} active
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(139,92,246,0.2)', background:'rgba(237,233,254,0.6)', color:'#7c3aed', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(237,233,254,1)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(237,233,254,0.6)'}>
            {IC.close}
          </button>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', gap:10, padding:'10px 22px', borderBottom:'1px solid rgba(139,92,246,0.08)', flexShrink:0, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            {IC.filter}
            <span style={{ fontSize:'11px', fontWeight:700, color:'#7c3aed', letterSpacing:'0.05em' }}>FILTER</span>
            <select className="wm-sel" style={sel} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Items</option>
              <option value="active">Active Only</option>
              <option value="expired">Expired / Inactive</option>
              <option value="warnings">Warnings Only</option>
              <option value="announcements">Announcements Only</option>
            </select>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            {IC.sort}
            <span style={{ fontSize:'11px', fontWeight:700, color:'#7c3aed', letterSpacing:'0.05em' }}>SORT</span>
            <select className="wm-sel" style={sel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="severity">By Severity</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
          {displayList.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#9ca3af' }}>
              {IC.empty}
              <div style={{ marginTop:14, fontSize:'14px', fontWeight:600, color:'#6b7280' }}>No items match this filter</div>
              <div style={{ fontSize:'12px', marginTop:4 }}>Try changing the filter above</div>
            </div>
          ) : displayList.map(w => {
            const status = getStatusBadge(w);
            const sev = severityBadge[w.severity];
            const bc = getBorderColor(w);
            const expiryDate = getExpiry(w);

            return (
              <div key={w.id} className="wm-item" style={{
                background:'#fff', borderRadius:14,
                border:'1.5px solid rgba(139,92,246,0.13)',
                borderLeft:`4px solid ${bc}`,
                boxShadow:'0 1px 4px rgba(109,40,217,0.06)',
                overflow:'hidden',
              }}>
                {/* Item header */}
                <div style={{ padding:'12px 14px', display:'flex', gap:10 }}>
                  {/* Icon */}
                  <div style={{ width:36, height:36, borderRadius:10, background:`${bc}12`, border:`1.5px solid ${bc}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                    {getTypeIcon(w)}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Title row */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:5 }}>
                      <span style={{ fontSize:'13.5px', fontWeight:700, color:'#1e1b4b', lineHeight:1.3 }}>{w.title}</span>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap', flexShrink:0 }}>
                        {w.isUrgent && (
                          <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:20, fontSize:'9px', fontWeight:800, background:'#fee2e2', color:'#be123c', letterSpacing:'0.05em' }}>
                            {IC.urgent} URGENT
                          </span>
                        )}
                        <span style={{ padding:'2px 7px', borderRadius:20, fontSize:'9px', fontWeight:800, background:status.bg, color:status.color, letterSpacing:'0.04em' }}>
                          {status.label.toUpperCase()}
                        </span>
                        {sev && w.type === 'warning' && (
                          <span style={{ padding:'2px 7px', borderRadius:20, fontSize:'9px', fontWeight:800, background:sev.bg, color:sev.color, letterSpacing:'0.04em' }}>
                            {w.severity?.toUpperCase()}
                          </span>
                        )}
                        <span style={{ padding:'2px 7px', borderRadius:20, fontSize:'9px', fontWeight:800, background:'#ede9fe', color:'#5b21b6', letterSpacing:'0.04em' }}>
                          {(w.type||'warning').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Message */}
                    <p style={{ margin:'0 0 8px', fontSize:'12px', color:'#4b5563', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                      {w.message}
                    </p>

                    {/* Meta chips */}
                    <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'10.5px', color:'#6b7280', fontWeight:500 }}>
                        {IC.target} {getTarget(w)}
                      </span>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'10.5px', color:'#6b7280', fontWeight:500 }}>
                        {IC.user} {w.createdBy?.displayName || 'System'}
                      </span>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'10.5px', color:'#6b7280', fontWeight:500 }}>
                        {IC.clock} Created {formatDate(w.createdAt)}
                      </span>
                      {expiryDate && (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'10.5px', color: isExpiredFn(w) ? '#dc2626' : '#6b7280', fontWeight:500 }}>
                          {IC.clock} Expires {formatDate(w.expiresAt)}
                        </span>
                      )}
                      {(w.dismissedBy?.length || 0) > 0 && (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:'10.5px', color:'#6b7280', fontWeight:500 }}>
                          {IC.dismiss} Dismissed by {w.dismissedBy.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding:'8px 14px 10px', borderTop:'1px solid rgba(139,92,246,0.08)', display:'flex', gap:7, alignItems:'center' }}>
                  <button className="wm-btn" onClick={() => handleToggle(w.id, w.isActive)} disabled={loading}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:9, fontSize:'11.5px', fontWeight:700, cursor:'pointer', border:'1.5px solid',
                      borderColor: w.isActive ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)',
                      background:   w.isActive ? 'rgba(255,251,235,0.9)' : 'rgba(240,253,250,0.9)',
                      color:        w.isActive ? '#b45309' : '#15803d' }}>
                    {w.isActive ? IC.deactivate : IC.activate}
                    {w.isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  {confirmDelete === w.id ? (
                    <div style={{ display:'flex', gap:5, marginLeft:'auto' }}>
                      <span style={{ fontSize:'11px', color:'#dc2626', fontWeight:600, display:'flex', alignItems:'center' }}>Sure?</span>
                      <button className="wm-btn" onClick={() => handleDelete(w.id)} disabled={loading}
                        style={{ padding:'6px 11px', borderRadius:9, fontSize:'11.5px', fontWeight:700, cursor:'pointer',
                          border:'1.5px solid rgba(239,68,68,0.5)', background:'rgba(254,242,242,0.9)', color:'#dc2626', display:'flex', alignItems:'center', gap:4 }}>
                        {IC.trash} Delete
                      </button>
                      <button className="wm-btn" onClick={() => setConfirmDelete(null)}
                        style={{ padding:'6px 11px', borderRadius:9, fontSize:'11.5px', fontWeight:700, cursor:'pointer',
                          border:'1.5px solid rgba(139,92,246,0.2)', background:'rgba(237,233,254,0.6)', color:'#7c3aed' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="wm-btn" onClick={() => setConfirmDelete(w.id)} disabled={loading}
                      style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:9, fontSize:'11.5px', fontWeight:700, cursor:'pointer',
                        border:'1.5px solid rgba(239,68,68,0.35)', background:'rgba(254,242,242,0.8)', color:'#dc2626' }}>
                      {IC.delete} Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WarningAnnouncementManager;
