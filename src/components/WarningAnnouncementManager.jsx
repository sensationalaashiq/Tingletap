import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { parseDurationMs } from '../utils/modExpiryService';
import renderTextWithLinks from '../utils/linkifyText';

/* ── Premium SVG icon set ───────────────────────────────────── */
const IC = {
  header: (<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(124,58,237,.15)" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round"/><polyline points="9 12 11 14 15 10" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  close: (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>),
  filter: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke="#7c3aed" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(124,58,237,.1)"/></svg>),
  sort: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="12" x2="15" y2="12" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="18" x2="9" y2="18" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  empty: (<svg viewBox="0 0 24 24" width="46" height="46" fill="none"><circle cx="12" cy="12" r="10" fill="rgba(139,92,246,.08)" stroke="rgba(139,92,246,.25)" strokeWidth="1.5"/><line x1="8" y1="12" x2="16" y2="12" stroke="rgba(139,92,246,.5)" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  edit: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  save: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  activate: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><polygon points="5 3 19 12 5 21 5 3" fill="#10b981" opacity=".7" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round"/></svg>),
  deactivate: (<svg viewBox="0 0 24 24" width="13" height="13" fill="none"><rect x="6" y="4" width="4" height="16" rx="1" fill="#f59e0b" opacity=".8"/><rect x="14" y="4" width="4" height="16" rx="1" fill="#f59e0b" opacity=".8"/></svg>),
  delete: (<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" width="13" height="13"><defs><linearGradient id="wm_del_g" gradientUnits="userSpaceOnUse" x1="256" x2="256" y1="512" y2="0"><stop offset="0" stopColor="#fd3a84"/><stop offset="1" stopColor="#ffa68d"/></linearGradient></defs><path d="m316 90c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15zm-60-30c-8.284 0-15 6.716-15 15s6.716 15 15 15 15-6.716 15-15-6.716-15-15-15zm-60 0c-8.284 0-15 6.716-15 15s6.716 15 15 15 15-6.716 15-15-6.716-15-15-15zm95.558 391.928c8.225.81 15.585-5.191 16.401-13.455l15-152c.813-8.244-5.21-15.587-13.455-16.401-8.238-.808-15.587 5.21-16.401 13.455l-15 152c-.813 8.244 5.211 15.587 13.455 16.401zm114.442-241.928c-7.425 0-78.712 0-150 0-71.264 0-142.529 0-150 0-8.284 0-15 6.716-15 15s6.716 15 15 15h16.542s25.279 232.502 25.289 232.582c2.809 22.472 22.005 39.418 44.652 39.418h127.033c22.646 0 41.843-16.946 44.653-39.418.01-.08 25.288-232.582 25.288-232.582h16.543c8.284 0 15-6.716 15-15s-6.716-15-15-15zm-71.612 258.959c-.98 7.442-7.356 13.041-14.872 13.041h-127.033c-7.516 0-13.892-5.6-14.871-13.041l-24.893-228.959h206.562zm-130.347-30.486c.815 8.255 8.166 14.266 16.401 13.455 8.244-.814 14.268-8.157 13.455-16.401l-15-152c-.814-8.245-8.166-14.268-16.401-13.455-8.244.814-14.268 8.157-13.455 16.401zm65.376-236.765 21.708-43.417c2.557-5.114 7.698-8.292 13.416-8.292h41.459c24.813 0 45-20.187 45-45v-59.999c0-24.813-20.187-45-45-45h-180c-24.813 0-45 20.187-45 45v60c0 24.813 20.187 45 45 45h41.459c5.718 0 10.859 3.177 13.417 8.292l21.708 43.417c2.541 5.081 7.734 8.291 13.416 8.291s10.875-3.21 13.417-8.292zm-13.417-40.249-8.292-16.584c-7.672-15.343-23.094-24.875-40.249-24.875h-41.459c-8.271 0-15-6.729-15-15v-60c0-8.271 6.729-15 15-15h180c8.271 0 15 6.729 15 15v60c0 8.271-6.729 15-15 15h-41.459c-17.155 0-32.578 9.532-40.249 24.875z" fill="url(#wm_del_g)"/></svg>),
  warning: (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="rgba(217,119,6,.15)" stroke="#d97706" strokeWidth="1.6" strokeLinejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="#d97706" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="17" r="1" fill="#d97706"/></svg>),
  announcement: (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill="rgba(124,58,237,.12)" stroke="#7c3aed" strokeWidth="1.8"/></svg>),
  clock: (<svg viewBox="0 0 24 24" width="11" height="11" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/><polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  user: (<svg viewBox="0 0 24 24" width="11" height="11" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="#6b7280" strokeWidth="1.5"/></svg>),
  target: (<svg viewBox="0 0 24 24" width="11" height="11" fill="none"><circle cx="12" cy="12" r="10" stroke="#7c3aed" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke="#7c3aed" strokeWidth="1.5"/><circle cx="12" cy="12" r="1.5" fill="#7c3aed"/></svg>),
  dismiss: (<svg viewBox="0 0 24 24" width="11" height="11" fill="none"><circle cx="12" cy="12" r="10" stroke="#6b7280" strokeWidth="1.5"/><line x1="8" y1="12" x2="16" y2="12" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/></svg>),
  urgent: (<svg viewBox="0 0 24 24" width="9" height="9" fill="#ef4444"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  sweepExpired: (<svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  timerOn: (<svg viewBox="0 0 24 24" width="11" height="11" fill="none"><circle cx="12" cy="13" r="8" stroke="#10b981" strokeWidth="1.6"/><polyline points="12 9 12 13 15 15" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/><line x1="9" y1="2" x2="15" y2="2" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  timerExpired: (<svg viewBox="0 0 24 24" width="11" height="11" fill="none"><circle cx="12" cy="13" r="8" stroke="#ef4444" strokeWidth="1.6"/><line x1="9" y1="10" x2="15" y2="16" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/><line x1="15" y1="10" x2="9" y2="16" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/></svg>),
  info: (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><circle cx="12" cy="12" r="10" fill="rgba(37,99,235,.1)" stroke="#2563eb" strokeWidth="1.6"/><circle cx="12" cy="8" r="1" fill="#2563eb"/><line x1="12" y1="12" x2="12" y2="16" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round"/></svg>),
  alert: (<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="rgba(220,38,38,.1)" stroke="#dc2626" strokeWidth="1.6" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round"/></svg>),
};

/* ── helpers ──────────────────────────────────────────────── */
const toMs2 = (raw) => {
  if (!raw) return null;
  if (raw?.toDate) return raw.toDate().getTime();
  if (raw?.seconds) return raw.seconds * 1000;
  if (typeof raw === 'string') { const d = new Date(raw); return isNaN(d) ? null : d.getTime(); }
  return typeof raw === 'number' ? raw : null;
};

const getBorderColor = (w) => {
  if (w.isUrgent) return '#ef4444';
  if (w.type === 'announcement') return '#7c3aed';
  const m = { low: '#f59e0b', medium: '#ef4444', high: '#dc2626', critical: '#991b1b' };
  return m[w.severity] || '#ef4444';
};

const getTypeIcon = (w) => {
  const t = w.styling?.iconType || w.type;
  if (t === 'warning') return IC.warning;
  if (t === 'announcement') return IC.announcement;
  if (t === 'info') return IC.info;
  if (t === 'alert') return IC.alert;
  return w.type === 'warning' ? IC.warning : IC.announcement;
};

const formatDate = (ts) => {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(toMs2(ts) || 0);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
};

const getCountdown = (w, now) => {
  const expiryMs = toMs2(w.expiresAt);
  if (!expiryMs) return null;
  const diff = expiryMs - now;
  if (diff <= 0) return { expired: true, text: 'Expired' };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return { expired: false, text: `${d}d ${h}h left` };
  if (h > 0) return { expired: false, text: `${h}h ${m}m left` };
  if (m > 0) return { expired: false, text: `${m}m ${s}s left` };
  return { expired: false, text: `${s}s left` };
};

const getTarget = (w) => {
  switch (w.targetType) {
    case 'all_users': return 'All Users';
    case 'selected_users': return `${w.selectedUsers?.length || 0} Users`;
    case 'room': return 'Current Room';
    case 'selected_rooms': return `${w.selectedRooms?.length || 0} Rooms`;
    case 'all_rooms': return 'All Rooms';
    default: return '—';
  }
};

const isExpiredFn = (w) => {
  const exp = toMs2(w.expiresAt);
  return exp ? exp <= Date.now() : false;
};

/* ─── Severity label badges ─── */
const SEV = { low: { bg: '#fffbeb', c: '#92400e' }, medium: { bg: '#fff7ed', c: '#9a3412' }, high: { bg: '#fee2e2', c: '#991b1b' }, critical: { bg: '#fce7f3', c: '#9d174d' } };
const getStatusStyle = (w) => {
  if (isExpiredFn(w)) return { bg: '#fee2e2', c: '#991b1b', label: 'Expired' };
  if (w.isActive) return { bg: '#dcfce7', c: '#15803d', label: 'Active' };
  return { bg: '#f1f5f9', c: '#475569', label: 'Inactive' };
};

/* ─────────────────────────────────────────────────────────── */
const WarningAnnouncementManager = ({ isVisible, onClose, currentUserProfile }) => {
  const [warnings, setWarnings]       = useState([]);
  const [filter, setFilter]           = useState('all');
  const [sortBy, setSortBy]           = useState('newest');
  const [loading, setLoading]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingId, setEditingId]     = useState(null);
  const [editData, setEditData]       = useState({});
  const [now, setNow]                 = useState(Date.now());

  /* Live 1-second clock for countdown timers */
  useEffect(() => {
    if (!isVisible) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const q = query(collection(db, 'warnings_announcements'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setWarnings(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [isVisible]);

  const canManage = currentUserProfile && ['owner', 'admin', 'moderator'].includes(currentUserProfile.role);
  if (!isVisible || !canManage) return null;

  const expiredItems = warnings.filter(w => isExpiredFn(w));

  const displayList = (() => {
    let list = [...warnings];
    if (filter === 'active')        list = list.filter(w => w.isActive && !isExpiredFn(w));
    if (filter === 'expired')       list = list.filter(w => !w.isActive || isExpiredFn(w));
    if (filter === 'warnings')      list = list.filter(w => w.type === 'warning');
    if (filter === 'announcements') list = list.filter(w => w.type === 'announcement');
    if (sortBy === 'oldest')   list.sort((a, b) => (toMs2(a.createdAt) || 0) - (toMs2(b.createdAt) || 0));
    if (sortBy === 'severity') {
      const o = { critical: 4, high: 3, medium: 2, low: 1 };
      list.sort((a, b) => (o[b.severity] || 0) - (o[a.severity] || 0));
    }
    return list;
  })();

  const handleToggle = async (id, cur) => {
    setLoading(true);
    try { await updateDoc(doc(db, 'warnings_announcements', id), { isActive: !cur }); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try { await deleteDoc(doc(db, 'warnings_announcements', id)); setConfirmDelete(null); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleClearExpired = async () => {
    if (expiredItems.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      expiredItems.forEach(w => batch.delete(doc(db, 'warnings_announcements', w.id)));
      await batch.commit();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const startEdit = (w) => {
    setEditingId(w.id);
    setEditData({
      title: w.title || '',
      message: w.message || '',
      severity: w.severity || 'medium',
      isUrgent: !!w.isUrgent,
      allowDismiss: w.allowDismiss !== false,
      expiresAt: (() => {
        const ms = toMs2(w.expiresAt);
        if (!ms) return '';
        return new Date(ms).toISOString().slice(0, 16);
      })(),
    });
  };

  const handleSaveEdit = async (id) => {
    if (!editData.title?.trim() || !editData.message?.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'warnings_announcements', id), {
        title: editData.title.trim(),
        message: editData.message.trim(),
        severity: editData.severity,
        isUrgent: editData.isUrgent,
        allowDismiss: editData.allowDismiss,
        expiresAt: editData.expiresAt ? new Date(editData.expiresAt) : null,
        editedAt: new Date(),
      });
      setEditingId(null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* ── shared style tokens ── */
  const sel = { padding: '6px 10px', borderRadius: 9, fontSize: '12px', fontWeight: 600, border: '1.5px solid rgba(139,92,246,0.2)', background: '#fff', color: '#4c1d95', outline: 'none', cursor: 'pointer', minWidth: 130 };
  const inp = { width: '100%', padding: '7px 10px', borderRadius: 9, fontSize: '12.5px', border: '1.5px solid rgba(139,92,246,0.25)', background: '#fff', color: '#1e1b4b', outline: 'none', boxSizing: 'border-box', fontFamily: "'Inter',-apple-system,sans-serif" };

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(109,40,217,0.12)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: "'Inter',-apple-system,sans-serif" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{ background: 'linear-gradient(160deg,#faf8ff 0%,#f5f3ff 40%,#fdf4ff 100%)', border: '1.5px solid rgba(139,92,246,0.22)', borderRadius: '22px', width: '100%', maxWidth: '900px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.9) inset, 0 24px 60px rgba(109,40,217,0.16)', animation: 'wamMgrUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <style>{`
          @keyframes wamMgrUp { from{opacity:0;transform:translateY(24px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
          @keyframes wamEditSlide { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
          .wm-sel option{background:#fff;color:#1e1b4b}
          .wm-item{transition:box-shadow .15s,transform .15s}
          .wm-item:hover{box-shadow:0 4px 18px rgba(109,40,217,0.1)!important;transform:translateY(-1px)}
          .wm-btn{transition:all .15s;border:none;cursor:pointer}
          .wm-btn:hover{opacity:.85;transform:translateY(-1px)}
          .wm-btn:active{transform:scale(.97)}
          .wm-inp:focus{border-color:rgba(109,40,217,0.5)!important;outline:none}
          .wm-inp-chk{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:9px;cursor:pointer;border:1.5px solid rgba(139,92,246,0.15);background:#fff;transition:all .13s;user-select:none}
          .wm-inp-chk:hover{background:rgba(237,233,254,0.4)}
        `}</style>

        {/* Top accent strip */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#7c3aed,#a855f7,#ec4899)', borderRadius: '22px 22px 0 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 22px 12px', borderBottom: '1.5px solid rgba(139,92,246,0.1)', flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,rgba(124,58,237,.15),rgba(168,85,247,.1))', border: '1.5px solid rgba(124,58,237,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{IC.header}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.02em' }}>Warning & Announcement Manager</div>
            <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 500, opacity: 0.75, marginTop: 1 }}>
              {warnings.length} total · {warnings.filter(w => w.isActive && !isExpiredFn(w)).length} active · {expiredItems.length} expired
            </div>
          </div>
          {/* Clear expired */}
          {expiredItems.length > 0 && (
            <button className="wm-btn" onClick={handleClearExpired} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, fontSize: '11.5px', fontWeight: 700, background: 'rgba(254,242,242,0.9)', color: '#dc2626', border: '1.5px solid rgba(239,68,68,0.35)' }}>
              {IC.sweepExpired} Clear {expiredItems.length} Expired
            </button>
          )}
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(139,92,246,0.2)', background: 'rgba(237,233,254,0.6)', color: '#7c3aed', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(237,233,254,1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(237,233,254,0.6)'}>
            {IC.close}
          </button>
        </div>

        {/* Filter & Sort controls */}
        <div style={{ display: 'flex', gap: 10, padding: '10px 22px', borderBottom: '1px solid rgba(139,92,246,0.08)', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {IC.filter}
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', letterSpacing: '0.05em' }}>FILTER</span>
            <select className="wm-sel" style={sel} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Items</option>
              <option value="active">Active Only</option>
              <option value="expired">Expired / Inactive</option>
              <option value="warnings">Warnings Only</option>
              <option value="announcements">Announcements Only</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {IC.sort}
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', letterSpacing: '0.05em' }}>SORT</span>
            <select className="wm-sel" style={sel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="severity">By Severity</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af' }}>
              {IC.empty}
              <div style={{ marginTop: 14, fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>No items match this filter</div>
              <div style={{ fontSize: '12px', marginTop: 4 }}>Try changing the filter above</div>
            </div>
          ) : displayList.map(w => {
            const status = getStatusStyle(w);
            const bc = getBorderColor(w);
            const sev = SEV[w.severity];
            const countdown = getCountdown(w, now);
            const isEditing = editingId === w.id;

            return (
              <div key={w.id} className="wm-item" style={{ background: '#fff', borderRadius: 14, border: '1.5px solid rgba(139,92,246,0.13)', borderLeft: `4px solid ${bc}`, boxShadow: '0 1px 4px rgba(109,40,217,0.06)', overflow: 'hidden' }}>

                {/* Main card header */}
                <div style={{ padding: '12px 14px', display: 'flex', gap: 10 }}>
                  {/* Type icon */}
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${bc}12`, border: `1.5px solid ${bc}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    {getTypeIcon(w)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title + badges row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e1b4b', lineHeight: 1.3 }}>{w.title}</span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
                        {w.isUrgent && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 20, fontSize: '9px', fontWeight: 800, background: '#fee2e2', color: '#be123c', letterSpacing: '0.05em' }}>{IC.urgent} URGENT</span>)}
                        <span style={{ padding: '2px 6px', borderRadius: 20, fontSize: '9px', fontWeight: 800, background: status.bg, color: status.c, letterSpacing: '0.04em' }}>{status.label.toUpperCase()}</span>
                        {sev && w.type === 'warning' && (<span style={{ padding: '2px 6px', borderRadius: 20, fontSize: '9px', fontWeight: 800, background: sev.bg, color: sev.c, letterSpacing: '0.04em' }}>{w.severity?.toUpperCase()}</span>)}
                        <span style={{ padding: '2px 6px', borderRadius: 20, fontSize: '9px', fontWeight: 800, background: '#ede9fe', color: '#5b21b6', letterSpacing: '0.04em' }}>{(w.type || 'announcement').toUpperCase()}</span>
                      </div>
                    </div>

                    {/* Message preview */}
                    <p style={{ margin: '0 0 8px', fontSize: '11.5px', color: '#4b5563', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{renderTextWithLinks(w.message)}</p>

                    {/* Meta row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '10px', color: '#6b7280', fontWeight: 500 }}>{IC.target} {getTarget(w)}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '10px', color: '#6b7280', fontWeight: 500 }}>{IC.user} {w.createdBy?.displayName || 'System'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '10px', color: '#6b7280', fontWeight: 500 }}>{IC.clock} Created {formatDate(w.createdAt)}</span>
                      {/* Live countdown timer */}
                      {countdown && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '10px', fontWeight: 700, color: countdown.expired ? '#dc2626' : '#10b981' }}>
                          {countdown.expired ? IC.timerExpired : IC.timerOn} {countdown.text}
                        </span>
                      )}
                      {(w.dismissedBy?.length || 0) > 0 && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '10px', color: '#6b7280', fontWeight: 500 }}>{IC.dismiss} Dismissed by {w.dismissedBy.length}</span>)}
                    </div>
                  </div>
                </div>

                {/* ── Inline Edit Panel ── */}
                {isEditing && (
                  <div style={{ padding: '12px 14px 14px', borderTop: '1.5px solid rgba(139,92,246,0.15)', background: 'rgba(237,233,254,0.25)', animation: 'wamEditSlide .2s ease' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#7c3aed', letterSpacing: '0.07em', marginBottom: 10, textTransform: 'uppercase' }}>Edit Announcement</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Title */}
                      <input className="wm-inp" style={inp} placeholder="Title…" value={editData.title} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} maxLength={100} />
                      {/* Message */}
                      <textarea className="wm-inp" style={{ ...inp, minHeight: 60, resize: 'vertical' }} placeholder="Message…" value={editData.message} onChange={e => setEditData(p => ({ ...p, message: e.target.value }))} maxLength={500} />
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {/* Severity (only for warnings) */}
                        {w.type === 'warning' && (
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 4 }}>Severity</div>
                            <select className="wm-inp wm-sel" style={{ ...inp, minWidth: 120 }} value={editData.severity} onChange={e => setEditData(p => ({ ...p, severity: e.target.value }))}>
                              <option value="low">🟡 Low</option>
                              <option value="medium">🟠 Medium</option>
                              <option value="high">🔴 High</option>
                              <option value="critical">⚫ Critical</option>
                            </select>
                          </div>
                        )}
                        {/* Expiry */}
                        <div style={{ flex: 2 }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 4 }}>Expiry</div>
                          <input type="datetime-local" className="wm-inp" style={inp} value={editData.expiresAt} onChange={e => setEditData(p => ({ ...p, expiresAt: e.target.value }))} />
                        </div>
                      </div>
                      {/* Toggles */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div className="wm-inp-chk" style={{ flex: 1, borderColor: editData.isUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(139,92,246,0.15)', background: editData.isUrgent ? 'rgba(254,242,242,0.6)' : '#fff' }}
                          onClick={() => setEditData(p => ({ ...p, isUrgent: !p.isUrgent }))}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${editData.isUrgent ? '#ef4444' : 'rgba(139,92,246,0.3)'}`, background: editData.isUrgent ? '#ef4444' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {editData.isUrgent && <svg viewBox="0 0 24 24" width="10" height="10" fill="none"><polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: editData.isUrgent ? '#dc2626' : '#374151' }}>Urgent</span>
                        </div>
                        <div className="wm-inp-chk" style={{ flex: 1, borderColor: editData.allowDismiss ? 'rgba(16,185,129,0.4)' : 'rgba(139,92,246,0.15)', background: editData.allowDismiss ? 'rgba(240,253,250,0.6)' : '#fff' }}
                          onClick={() => setEditData(p => ({ ...p, allowDismiss: !p.allowDismiss }))}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${editData.allowDismiss ? '#10b981' : 'rgba(139,92,246,0.3)'}`, background: editData.allowDismiss ? '#10b981' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {editData.allowDismiss && <svg viewBox="0 0 24 24" width="10" height="10" fill="none"><polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: editData.allowDismiss ? '#10b981' : '#374151' }}>Dismissible</span>
                        </div>
                      </div>
                      {/* Save / Cancel */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        <button className="wm-btn" onClick={() => handleSaveEdit(w.id)} disabled={loading || !editData.title?.trim() || !editData.message?.trim()}
                          style={{ flex: 1, height: 38, borderRadius: 10, background: (loading || !editData.title?.trim() || !editData.message?.trim()) ? 'rgba(139,92,246,0.15)' : 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 3px 12px rgba(109,40,217,0.25)' }}>
                          {IC.save} Save Changes
                        </button>
                        <button className="wm-btn" onClick={() => setEditingId(null)}
                          style={{ flex: '0 0 80px', height: 38, borderRadius: 10, background: 'rgba(237,233,254,0.6)', color: '#7c3aed', fontSize: '12.5px', fontWeight: 700, border: '1.5px solid rgba(139,92,246,0.22)' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Action buttons ── */}
                <div style={{ padding: '8px 12px 10px', borderTop: '1px solid rgba(139,92,246,0.08)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Activate / Deactivate */}
                  <button className="wm-btn" onClick={() => handleToggle(w.id, w.isActive)} disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, fontSize: '11.5px', fontWeight: 700, border: '1.5px solid', borderColor: w.isActive ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)', background: w.isActive ? 'rgba(255,251,235,0.9)' : 'rgba(240,253,250,0.9)', color: w.isActive ? '#b45309' : '#15803d' }}>
                    {w.isActive ? IC.deactivate : IC.activate}
                    {w.isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  {/* Edit */}
                  <button className="wm-btn" onClick={() => isEditing ? setEditingId(null) : startEdit(w)} disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, fontSize: '11.5px', fontWeight: 700, border: `1.5px solid ${isEditing ? 'rgba(109,40,217,0.4)' : 'rgba(109,40,217,0.25)'}`, background: isEditing ? 'rgba(237,233,254,0.9)' : '#fff', color: '#7c3aed' }}>
                    {IC.edit} {isEditing ? 'Close Edit' : 'Edit'}
                  </button>

                  {/* Delete / Confirm row */}
                  {confirmDelete === w.id ? (
                    <div style={{ display: 'flex', gap: 5, marginLeft: 'auto', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>Delete forever?</span>
                      <button className="wm-btn" onClick={() => handleDelete(w.id)} disabled={loading}
                        style={{ padding: '6px 11px', borderRadius: 9, fontSize: '11.5px', fontWeight: 700, background: 'rgba(254,242,242,0.9)', color: '#dc2626', border: '1.5px solid rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {IC.delete} Yes, Delete
                      </button>
                      <button className="wm-btn" onClick={() => setConfirmDelete(null)}
                        style={{ padding: '6px 11px', borderRadius: 9, fontSize: '11.5px', fontWeight: 700, background: 'rgba(237,233,254,0.6)', color: '#7c3aed', border: '1.5px solid rgba(139,92,246,0.2)' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="wm-btn" onClick={() => setConfirmDelete(w.id)} disabled={loading}
                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, fontSize: '11.5px', fontWeight: 700, background: 'rgba(254,242,242,0.8)', color: '#dc2626', border: '1.5px solid rgba(239,68,68,0.35)' }}>
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
