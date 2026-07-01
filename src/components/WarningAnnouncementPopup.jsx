import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, where, updateDoc, doc, arrayUnion, orderBy } from 'firebase/firestore';
import renderTextWithLinks from '../utils/linkifyText';
import './WarningAnnouncementPopup.css';

/* ── Premium SVG Icons ─────────────────────────────────────── */
const ICONS = {
  warning: (color='#d97706') => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill={color} opacity=".18"/>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="1" fill={color}/>
    </svg>
  ),
  announcement: (color='#6d28d9') => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" fill={color} opacity=".12" stroke={color} strokeWidth="1.8"/>
      <line x1="6" y1="1" x2="6" y2="4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="10" y1="1" x2="10" y2="4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="14" y1="1" x2="14" y2="4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  info: (color='#2563eb') => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <circle cx="12" cy="12" r="10" fill={color} opacity=".12" stroke={color} strokeWidth="1.8"/>
      <line x1="12" y1="8" x2="12" y2="8" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="12" y1="12" x2="12" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  alert: (color='#dc2626') => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill={color} opacity=".12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  notice: (color='#0891b2') => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill={color} opacity=".12" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <polyline points="14 2 14 8 20 8" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <line x1="9" y1="13" x2="15" y2="13" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="9" y1="17" x2="15" y2="17" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  urgent: () => (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="#ef4444">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  close: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  ),
  clock: () => (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
      <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  user: () => (
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  ),
};

const getIconForWarning = (warning) => {
  const type = warning.styling?.iconType || (warning.type === 'warning' ? 'warning' : 'announcement');
  const isUrgent = warning.isUrgent;

  const colorMap = {
    warning:      isUrgent ? '#dc2626' : '#d97706',
    info:         '#2563eb',
    announcement: '#6d28d9',
    alert:        '#dc2626',
    notice:       '#0891b2',
  };
  const color = colorMap[type] || '#7c3aed';
  return ICONS[type] ? ICONS[type](color) : ICONS.warning(color);
};

const getAccentColor = (warning) => {
  if (warning.isUrgent) return { border: '#ef4444', bg: '#fff1f2', badge: '#fecdd3', badgeText: '#be123c' };
  switch (warning.type) {
    case 'warning': {
      const map = { low:'#f59e0b', medium:'#ef4444', high:'#dc2626', critical:'#991b1b' };
      const c = map[warning.severity] || '#ef4444';
      const bgMap = { low:'#fffbeb', medium:'#fff1f2', high:'#fff1f2', critical:'#fff1f2' };
      return { border: c, bg: bgMap[warning.severity] || '#fff1f2', badge:'#fee2e2', badgeText:'#991b1b' };
    }
    case 'announcement':
    default:
      return { border: '#7c3aed', bg: '#faf5ff', badge:'#ede9fe', badgeText:'#5b21b6' };
  }
};

const WarningAnnouncementPopup = ({ currentUser, currentRoomId }) => {
  const [activeWarnings, setActiveWarnings]   = useState([]);
  const [visibleWarnings, setVisibleWarnings] = useState([]);
  const dismissedRef = useRef(new Set());

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'warnings_announcements'), where('isActive', '==', true), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const relevant = all.filter(w => {
        if (dismissedRef.current.has(w.id)) return false;
        if (w.dismissedBy?.includes(currentUser.uid)) return false;
        if (w.expiresAt) {
          let exp;
          if (w.expiresAt.toDate) exp = w.expiresAt.toDate();
          else if (w.expiresAt.seconds) exp = new Date(w.expiresAt.seconds * 1000);
          else exp = new Date(w.expiresAt);
          if (exp <= new Date()) return false;
        }
        switch (w.targetType) {
          case 'all_users':   return true;
          case 'selected_users': return w.selectedUsers?.includes(currentUser.uid);
          case 'room':        return true;
          case 'selected_rooms': return w.selectedRooms?.includes(currentRoomId);
          case 'all_rooms':   return true;
          default:            return true;
        }
      });
      setActiveWarnings(relevant);
    });
    return () => unsubscribe();
  }, [currentUser, currentRoomId]);

  useEffect(() => {
    const sorted = [...activeWarnings].sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate - aDate;
    });
    setVisibleWarnings(sorted);
    const interval = setInterval(() => {
      const now = new Date();
      setVisibleWarnings(prev => prev.filter(w => {
        if (!w.expiresAt) return true;
        let exp;
        if (w.expiresAt.toDate) exp = w.expiresAt.toDate();
        else if (w.expiresAt.seconds) exp = new Date(w.expiresAt.seconds * 1000);
        else exp = new Date(w.expiresAt);
        return exp > now;
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, [activeWarnings]);

  const handleDismiss = async (warningId) => {
    /* 1. Guard locally first — prevents re-show even before Firestore writes */
    dismissedRef.current.add(warningId);
    setVisibleWarnings(prev => prev.filter(w => w.id !== warningId));
    try {
      await updateDoc(doc(db, 'warnings_announcements', warningId), {
        dismissedBy: arrayUnion(currentUser.uid)
      });
    } catch (err) {
      console.error('Dismiss failed:', err);
    }
  };

  if (visibleWarnings.length === 0) return null;

  return (
    <div className="wap-container">
      {visibleWarnings.map((w, idx) => {
        const accent = getAccentColor(w);
        const formatDate = (ts) => {
          if (!ts) return null;
          try {
            const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
            return d.toLocaleDateString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
          } catch { return null; }
        };
        return (
          <div key={w.id} className={`wap-card${w.isUrgent ? ' wap-urgent' : ''}`}
            style={{ borderLeftColor: accent.border, background: accent.bg, animationDelay: `${idx * 0.08}s` }}>

            {/* Top accent strip */}
            <div className="wap-strip" style={{ background: accent.border }} />

            <div className="wap-body">
              {/* Icon + Title row */}
              <div className="wap-header">
                <div className="wap-icon-wrap" style={{ background: `${accent.border}18`, border: `1.5px solid ${accent.border}30` }}>
                  {getIconForWarning(w)}
                  {w.isUrgent && <span className="wap-urgent-dot" />}
                </div>

                <div className="wap-title-block">
                  <div className="wap-badges">
                    {w.isUrgent && (
                      <span className="wap-badge wap-badge--urgent">
                        {ICONS.urgent()} URGENT
                      </span>
                    )}
                    <span className="wap-badge" style={{ background: accent.badge, color: accent.badgeText }}>
                      {(w.type || 'announcement').toUpperCase()}
                    </span>
                    {w.severity && w.type === 'warning' && (
                      <span className="wap-badge wap-badge--severity" style={{ borderColor: accent.border, color: accent.border }}>
                        {w.severity.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="wap-title">{w.title}</h3>
                </div>

                {w.allowDismiss && (
                  <button className="wap-dismiss" onClick={() => handleDismiss(w.id)} title="Dismiss">
                    {ICONS.close()}
                  </button>
                )}
              </div>

              {/* Message */}
              <p className="wap-message">{renderTextWithLinks(w.message)}</p>

              {/* Footer */}
              <div className="wap-footer">
                <div className="wap-meta">
                  <span className="wap-meta-chip">
                    {ICONS.user()}
                    {w.createdBy?.displayName || 'System'}
                  </span>
                  {formatDate(w.expiresAt) && (
                    <span className="wap-meta-chip">
                      {ICONS.clock()}
                      Expires {formatDate(w.expiresAt)}
                    </span>
                  )}
                </div>
                <div className="wap-severity-pill" style={{ background: accent.border }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WarningAnnouncementPopup;
