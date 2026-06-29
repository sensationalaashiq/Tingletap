import React, { useState, useEffect } from 'react';
import { getDefaultAvatarUrl, getRoleDisplayLabel } from '../utils/roleUtils';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import './AdminBanKickModal.css';

/* ─────────────────────────────────────────────────────────
   SVG Icon Library
───────────────────────────────────────────────────────── */
const D = {
  ban:     'M12 2A10 10 0 1 0 12 22A10 10 0 0 0 12 2M12 4A8 8 0 0 1 19.3 17.3L6.7 4.7C8.1 3.6 9.97 3 12 3M12 20A8 8 0 0 1 4.7 6.7L17.3 19.3C15.9 20.4 14.03 21 12 21',
  unban:   'M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2M11 16.5L18 9.5L16.59 8.09L11 13.67L7.91 10.59L6.5 12Z',
  mute:    'M19 11H17.3C17.3 11.74 17.14 12.43 16.87 13.05L18.1 14.28C18.66 13.3 19 12.19 19 11M15 11.16L9 5.18V5A3 3 0 0 1 15 5M4.27 3L3 4.27L6.01 7.28C5.37 8.42 5 9.66 5 11H7A5 5 0 0 0 12 16C12.62 16 13.22 15.97 13.77 15.74L15.54 16.81C14.77 17.27 13.91 17.58 13 17.72V21H11V17.72C9.07 17.44 7.3 16.48 6 15.1L3 4.27 4.27 3Z M9 11V10.27L13.18 14.45A3 3 0 0 1 9 11Z',
  unmute:  'M12 2A3 3 0 0 1 15 5V11A3 3 0 0 1 12 14A3 3 0 0 1 9 11V5A3 3 0 0 1 12 2M19 11C19 14.53 16.39 17.44 13 17.93V21H11V17.93C7.61 17.44 5 14.53 5 11H7A5 5 0 0 0 12 16A5 5 0 0 0 17 11Z',
  kick:    'M16 17V14H9V10H16V7L21 12L16 17M14 2A2 2 0 0 1 16 4V6H14V4H5V20H14V18H16V20A2 2 0 0 1 14 22H5A2 2 0 0 1 3 20V4A2 2 0 0 1 5 2Z',
  unkick:  'M16 13V10L11 15L16 20V17H22V13H16M14 2A2 2 0 0 0 12 4V6H14V4H5V20H14V18H12A2 2 0 0 1 10 16H5A2 2 0 0 1 3 14V4A2 2 0 0 1 5 2Z',
  clock:   'M12 20A8 8 0 0 0 20 12A8 8 0 0 0 12 4A8 8 0 0 0 4 12A8 8 0 0 0 12 20M12 2A10 10 0 0 1 22 12A10 10 0 0 1 12 22C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2M12.5 7V12.25L17 14.92L16.25 16.15L11 13V7Z',
  reason:  'M14 17H7V15H14M17 13H7V11H17M17 9H7V7H17M19 3H5C3.89 3 3 3.89 3 5V19A2 2 0 0 0 5 21H19A2 2 0 0 0 21 19V5C21 3.89 20.1 3 19 3Z',
  room:    'M10 20V14H14V20H19V12H22L12 3L2 12H5V20Z',
  note:    'M20 2H4A2 2 0 0 0 2 4V22L6 18H20A2 2 0 0 0 22 16V4C22 2.89 21.1 2 20 2M20 16H5.17L4 17.17V4H20Z',
  shield:  'M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9Z',
  close:   'M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12Z',
  check:   'M21 7L9 19L3.5 13.5L4.91 12.09L9 16.17L19.59 5.59Z',
  info:    'M13 9H11V7H13M13 17H11V11H13M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2Z',
  user:    'M12 4A4 4 0 0 1 16 8A4 4 0 0 1 12 12A4 4 0 0 1 8 8A4 4 0 0 1 12 4M12 14C16.42 14 20 15.79 20 18V20H4V18C4 15.79 7.58 14 12 14Z',
  scope:   'M17 12V3A1 1 0 0 0 16 2H3A1 1 0 0 0 2 3V17L6 13H16A1 1 0 0 0 17 12M21 6H19V15H6V17A1 1 0 0 0 7 18H18L22 22V7A1 1 0 0 0 21 6Z',
  warning: 'M12 2L1 21H23M12 6L19.53 19H4.47M11 10V14H13V10M11 16V18H13V16Z',
  global:  'M17.9 17.39C17.64 16.59 16.89 16 16 16H15V13A1 1 0 0 0 14 12H8V10H10A1 1 0 0 0 11 9V7H13A2 2 0 0 0 15 5V4.59C17.93 5.77 20 8.64 20 12C20 14.08 19.2 15.97 17.9 17.39M11 19.93C7.05 19.44 4 16.08 4 12C4 11.38 4.08 10.79 4.21 10.21L9 15V16A2 2 0 0 0 11 18M12 2A10 10 0 0 0 2 12A10 10 0 0 0 12 22A10 10 0 0 0 22 12A10 10 0 0 0 12 2Z',
};

const Ico = ({ name, color = 'currentColor', size = 18 }) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size, flexShrink: 0 }}>
    <path fill={color} d={D[name]} />
  </svg>
);

/* ─────────────────────────────────────────────────────────
   Action config: color, labels, reverse mapping
───────────────────────────────────────────────────────── */
const AC = {
  ban:    { color: '#ef4444', dark: '#7f1d1d', glow: 'rgba(239,68,68,0.35)',   label: 'Ban User',     tabLabel: 'Ban',    reverse: 'unban',  tab: 'ban',   durations: 'ban',  hasDuration: true  },
  unban:  { color: '#10b981', dark: '#064e3b', glow: 'rgba(16,185,129,0.35)',  label: 'Unban User',   tabLabel: 'Unban',  reverse: 'ban',   tab: 'ban',   durations: null,   hasDuration: false },
  mute:   { color: '#f59e0b', dark: '#78350f', glow: 'rgba(245,158,11,0.35)',  label: 'Mute User',    tabLabel: 'Mute',   reverse: 'unmute', tab: 'mute',  durations: 'mute', hasDuration: true  },
  unmute: { color: '#3b82f6', dark: '#1e3a8a', glow: 'rgba(59,130,246,0.35)', label: 'Unmute User',  tabLabel: 'Unmute', reverse: 'mute',  tab: 'mute',  durations: null,   hasDuration: false },
  kick:   { color: '#f97316', dark: '#7c2d12', glow: 'rgba(249,115,22,0.35)', label: 'Kick User',    tabLabel: 'Kick',   reverse: 'unkick', tab: 'kick',  durations: 'kick', hasDuration: true  },
  unkick: { color: '#06b6d4', dark: '#164e63', glow: 'rgba(6,182,212,0.35)',  label: 'Unkick User',  tabLabel: 'Unkick', reverse: 'kick',  tab: 'kick',  durations: null,   hasDuration: false },
};

const REASONS = {
  ban:    ['Violation of community guidelines', 'Harassment or bullying', 'Inappropriate content', 'Spam or promotional content', 'Impersonation', 'Hate speech or discrimination', 'Doxxing or sharing personal info', 'Circumventing previous bans', 'custom'],
  mute:   ['Excessive messaging', 'Inappropriate language', 'Disrupting conversation', 'Warning was ignored', 'Minor rule violation', 'Emoji or sticker spam', 'custom'],
  kick:   ['Disruptive behavior', 'Off-topic conversation', 'Inappropriate language', 'Spamming messages', 'Room rule violation', 'Trolling or baiting', 'Ignoring prior warnings', 'custom'],
};

const DURATIONS = {
  ban:  [{ v: '1h', l: '1 Hr' }, { v: '24h', l: '24 Hrs' }, { v: '3d', l: '3 Days' }, { v: '7d', l: '7 Days' }, { v: '30d', l: '30 Days' }, { v: '1y', l: '1 Year' }, { v: 'permanent', l: 'Permanent' }, { v: 'custom', l: 'Custom…' }],
  mute: [{ v: '5m', l: '5 Min' }, { v: '15m', l: '15 Min' }, { v: '30m', l: '30 Min' }, { v: '1h', l: '1 Hr' }, { v: '6h', l: '6 Hrs' }, { v: '24h', l: '24 Hrs' }, { v: '7d', l: '7 Days' }, { v: 'permanent', l: 'Permanent' }, { v: 'custom', l: 'Custom…' }],
  kick: [{ v: '1h', l: '1 Hr' }, { v: '3h', l: '3 Hrs' }, { v: '6h', l: '6 Hrs' }, { v: '12h', l: '12 Hrs' }, { v: '24h', l: '24 Hrs' }, { v: '3d', l: '3 Days' }, { v: '7d', l: '7 Days' }, { v: 'permanent', l: 'Permanent' }, { v: 'custom', l: 'Custom…' }],
};

/* ─────────────────────────────────────────────────────────
   AdminBanKickModal Component
───────────────────────────────────────────────────────── */
const AdminBanKickModal = ({
  isVisible,
  onClose,
  selectedUser,
  actionType,
  onConfirm,
  currentUserProfile,
  currentRoomId,
  currentRoomName,
}) => {
  /* ── local action tracks the modal's current action (may differ from prop after toggle) */
  const [localAction, setLocalAction]       = useState(actionType || 'ban');
  const [reason, setReason]                 = useState('');
  const [customReason, setCustomReason]     = useState('');
  const [duration, setDuration]             = useState('permanent');
  const [customDuration, setCustomDuration] = useState('');
  const [kickScope, setKickScope]           = useState('this_room');
  const [unkickScope, setUnkickScope]       = useState('all_rooms');
  const [selectedRooms, setSelectedRooms]   = useState([]);
  const [adminNotes, setAdminNotes]         = useState('');
  const [appealAllowed, setAppealAllowed]   = useState(true);
  const [rooms, setRooms]                   = useState([]);
  const [isLoading, setIsLoading]           = useState(false);
  const [successBanner, setSuccessBanner]   = useState(null); // { message, prevAction }
  const [error, setError]                   = useState('');

  const cfg = AC[localAction] || AC.ban;
  const isReverse = ['unban', 'unmute', 'unkick'].includes(localAction);
  const activeTab = cfg.tab;

  /* sync localAction + reset when modal opens / actionType prop changes */
  useEffect(() => {
    if (isVisible) {
      setLocalAction(actionType || 'ban');
      setReason('');
      setCustomReason('');
      setDuration(actionType === 'mute' ? '5m' : 'permanent');
      setCustomDuration('');
      setKickScope('this_room');
      setUnkickScope('all_rooms');
      setAdminNotes('');
      setAppealAllowed(true);
      setSuccessBanner(null);
      setError('');
      setIsLoading(false);
    }
  }, [isVisible, actionType]);

  /* set default duration when localAction changes */
  useEffect(() => {
    if (localAction === 'mute') setDuration('5m');
    else if (localAction === 'kick') setDuration('1h');
    else setDuration('permanent');
    setReason('');
    setCustomReason('');
    setError('');
  }, [localAction]);

  /* room picker: load when kick scope = multiple_rooms or unkick */
  const needsRoomPicker = localAction === 'kick' && kickScope === 'multiple_rooms';

  useEffect(() => {
    if (!needsRoomPicker && localAction !== 'unkick') {
      setRooms([]);
      return;
    }
    const q = query(collection(db, 'rooms'), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRooms(list);
      if (needsRoomPicker && selectedRooms.length === 0) {
        setSelectedRooms(list.map(r => r.id));
      }
    });
    return () => unsub();
  }, [needsRoomPicker, localAction]);

  /* ── Confirm handler ─────────────────────────── */
  const handleConfirm = async () => {
    setError('');
    const finalReason   = reason === 'custom' ? customReason.trim() : reason;
    const finalDuration = duration === 'custom' ? customDuration.trim() : duration;

    if (!isReverse && !finalReason) {
      setError('Please select or enter a reason.');
      return;
    }
    if (needsRoomPicker && selectedRooms.length === 0) {
      setError('Please select at least one room.');
      return;
    }
    if (duration === 'custom' && !customDuration.trim()) {
      setError('Please enter a custom duration.');
      return;
    }

    setIsLoading(true);
    const actionData = {
      reason:        isReverse ? (adminNotes.trim() || `${localAction} by ${currentUserProfile?.displayName || 'Admin'}`) : finalReason,
      duration:      finalDuration,
      actionBy:      currentUserProfile?.displayName || 'System Administrator',
      actionById:    currentUserProfile?.uid || 'system',
      adminNotes:    adminNotes.trim(),
      appealAllowed,
      selectedRooms: needsRoomPicker ? selectedRooms : null,
      kickScope:     localAction === 'kick' ? kickScope : null,
      unkickScope:   localAction === 'unkick' ? unkickScope : null,
      currentRoomId: currentRoomId || null,
      timestamp:     new Date().toISOString(),
      /* pass along the localAction so parent uses the right branch */
      _resolvedAction: localAction,
    };

    try {
      await onConfirm(actionData, localAction);
      /* ── After success: flip to reverse action ── */
      const prevAction = localAction;
      const reverseAction = cfg.reverse;
      setSuccessBanner({
        message: `${cfg.label} applied successfully`,
        prevAction,
        prevColor: cfg.color,
      });
      setLocalAction(reverseAction);
      setReason('');
      setCustomReason('');
      setAdminNotes('');
      setCustomDuration('');
    } catch (err) {
      console.error('Moderation error:', err);
      setError('Action failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason(''); setCustomReason(''); setDuration('permanent');
    setCustomDuration(''); setAdminNotes(''); setAppealAllowed(true);
    setSelectedRooms([]); setIsLoading(false); setSuccessBanner(null); setError('');
    setKickScope('this_room'); setUnkickScope('all_rooms');
    onClose();
  };

  const handleTabClick = (tab) => {
    if (tab === activeTab) return;
    setSuccessBanner(null);
    setError('');
    /* Determine which action to switch to based on user status */
    if (tab === 'ban')  setLocalAction(selectedUser?.isBanned ? 'unban' : 'ban');
    if (tab === 'mute') setLocalAction(selectedUser?.mutedInfo?.isMuted ? 'unmute' : 'mute');
    if (tab === 'kick') setLocalAction(selectedUser?.kickedFrom?.roomId ? 'unkick' : 'kick');
  };

  if (!isVisible || !selectedUser) return null;

  const reasonList = REASONS[localAction === 'kick' && kickScope === 'multiple_rooms' ? 'kick' : localAction] || [];
  const durationList = cfg.durations ? DURATIONS[cfg.durations] : [];

  /* ── Role label + status badges ── */
  const userRole = selectedUser.role || 'user';
  const statusLabel = selectedUser.isBanned ? 'Banned' : selectedUser.mutedInfo?.isMuted ? 'Muted' : selectedUser.kickedFrom?.roomId ? 'Kicked' : 'Active';
  const statusColor = selectedUser.isBanned ? '#ef4444' : selectedUser.mutedInfo?.isMuted ? '#f59e0b' : selectedUser.kickedFrom?.roomId ? '#f97316' : '#10b981';

  /* ── Tab definitions ── */
  const tabs = [
    { id: 'ban',  action: selectedUser?.isBanned  ? 'unban'  : 'ban',   icon: selectedUser?.isBanned  ? 'unban'  : 'ban',   label: selectedUser?.isBanned  ? 'Unban'  : 'Ban'   },
    { id: 'mute', action: selectedUser?.mutedInfo?.isMuted ? 'unmute' : 'mute', icon: selectedUser?.mutedInfo?.isMuted ? 'unmute' : 'mute', label: selectedUser?.mutedInfo?.isMuted ? 'Unmute' : 'Mute' },
    { id: 'kick', action: selectedUser?.kickedFrom?.roomId ? 'unkick' : 'kick', icon: selectedUser?.kickedFrom?.roomId ? 'unkick' : 'kick', label: selectedUser?.kickedFrom?.roomId ? 'Unkick' : 'Kick' },
  ];

  return (
    <div className="luxmod-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="luxmod-card" style={{ '--action-color': cfg.color, '--action-glow': cfg.glow }}>

        {/* ── Glow top bar ── */}
        <div className="luxmod-topbar" style={{ background: `linear-gradient(90deg, ${cfg.dark}, ${cfg.color}, ${cfg.dark})` }} />

        {/* ── Header ── */}
        <div className="luxmod-header">
          <div className="luxmod-header-icon" style={{ background: `${cfg.color}18`, border: `2px solid ${cfg.color}40`, boxShadow: `0 0 20px ${cfg.glow}` }}>
            <Ico name={localAction} color={cfg.color} size={26} />
          </div>
          <div className="luxmod-header-text">
            <div className="luxmod-title">{cfg.label}</div>
            <div className="luxmod-subtitle">
              Moderating{' '}
              <span style={{ color: cfg.color, fontWeight: 800 }}>
                {selectedUser.displayName || selectedUser.email || 'User'}
              </span>
            </div>
          </div>
          <button className="luxmod-close" onClick={handleClose}>
            <Ico name="close" color="#64748b" size={16} />
          </button>
        </div>

        {/* ── Success Banner ── */}
        {successBanner && (
          <div className="luxmod-success-banner" style={{ background: `${successBanner.prevColor}14`, borderColor: `${successBanner.prevColor}35` }}>
            <div className="luxmod-success-icon" style={{ background: `${successBanner.prevColor}20`, boxShadow: `0 0 12px ${successBanner.prevColor}40` }}>
              <Ico name="check" color={successBanner.prevColor} size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: successBanner.prevColor }}>{successBanner.message}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                You can now perform the reverse action below, or close this panel.
              </div>
            </div>
          </div>
        )}

        {/* ── Action Tabs ── */}
        <div className="luxmod-tabs">
          {tabs.map(tab => {
            const tabCfg = AC[tab.action] || AC.ban;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`luxmod-tab ${isActive ? 'luxmod-tab--active' : ''}`}
                style={isActive ? { borderColor: tabCfg.color, color: tabCfg.color, background: `${tabCfg.color}15`, boxShadow: `0 0 14px ${tabCfg.glow}` } : {}}
                onClick={() => handleTabClick(tab.id)}
              >
                <Ico name={tab.icon} color={isActive ? tabCfg.color : '#64748b'} size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── User Identity Strip ── */}
        <div className="luxmod-user-strip">
          <div className="luxmod-user-avatar-wrap">
            <img
              src={selectedUser.photoURL || getDefaultAvatarUrl(selectedUser.uid, selectedUser.gender)}
              alt=""
              className="luxmod-user-avatar"
              onError={e => { e.target.src = getDefaultAvatarUrl(selectedUser.uid, selectedUser.gender); }}
            />
            <div className="luxmod-user-status-dot" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
          </div>
          <div className="luxmod-user-meta">
            <span className="luxmod-user-name">{selectedUser.displayName || 'Unknown User'}</span>
            <span className="luxmod-user-email">{selectedUser.email || 'No email'}</span>
          </div>
          <div className="luxmod-user-badges">
            <span className="luxmod-badge" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
              {getRoleDisplayLabel ? getRoleDisplayLabel(selectedUser) : userRole.toUpperCase()}
            </span>
            <span className="luxmod-badge" style={{ background: `${statusColor}18`, border: `1px solid ${statusColor}35`, color: statusColor }}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="luxmod-body">

          {/* ── Reverse action: info panel ── */}
          {isReverse && (
            <div className="luxmod-info-panel" style={{ borderColor: `${cfg.color}35`, background: `${cfg.color}0c` }}>
              <Ico name="info" color={cfg.color} size={18} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>{cfg.label} Confirmation</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
                  {localAction === 'unban'  && "This will lift the user's ban and restore full platform access."}
                  {localAction === 'unmute' && "This will allow the user to send messages again across all rooms."}
                  {localAction === 'unkick' && (unkickScope === 'all_rooms' ? "This will remove all kicks and allow the user to rejoin any room." : `This will remove the kick from ${currentRoomName || 'the current room'}.`)}
                </div>
              </div>
            </div>
          )}

          {/* ── Kick Scope Toggle ── */}
          {localAction === 'kick' && (
            <div className="luxmod-field">
              <div className="luxmod-field-label">
                <Ico name="scope" color="#7c3aed" size={13} />
                Kick Scope
              </div>
              <div className="luxmod-scope-row">
                <button
                  type="button"
                  className={`luxmod-scope-btn ${kickScope === 'this_room' ? 'luxmod-scope-btn--active' : ''}`}
                  style={kickScope === 'this_room' ? { borderColor: cfg.color, color: cfg.color, background: `${cfg.color}15` } : {}}
                  onClick={() => setKickScope('this_room')}
                >
                  <Ico name="room" color={kickScope === 'this_room' ? cfg.color : '#64748b'} size={14} />
                  This Room{currentRoomName ? ` — ${currentRoomName}` : ' Only'}
                </button>
                <button
                  type="button"
                  className={`luxmod-scope-btn ${kickScope === 'multiple_rooms' ? 'luxmod-scope-btn--active' : ''}`}
                  style={kickScope === 'multiple_rooms' ? { borderColor: cfg.color, color: cfg.color, background: `${cfg.color}15` } : {}}
                  onClick={() => setKickScope('multiple_rooms')}
                >
                  <Ico name="global" color={kickScope === 'multiple_rooms' ? cfg.color : '#64748b'} size={14} />
                  Select Rooms
                </button>
              </div>
            </div>
          )}

          {/* ── Unkick Scope Toggle ── */}
          {localAction === 'unkick' && (
            <div className="luxmod-field">
              <div className="luxmod-field-label">
                <Ico name="scope" color="#7c3aed" size={13} />
                Unkick Scope
              </div>
              <div className="luxmod-scope-row">
                <button
                  type="button"
                  className={`luxmod-scope-btn ${unkickScope === 'all_rooms' ? 'luxmod-scope-btn--active' : ''}`}
                  style={unkickScope === 'all_rooms' ? { borderColor: cfg.color, color: cfg.color, background: `${cfg.color}15` } : {}}
                  onClick={() => setUnkickScope('all_rooms')}
                >
                  <Ico name="global" color={unkickScope === 'all_rooms' ? cfg.color : '#64748b'} size={14} />
                  All Rooms
                </button>
                <button
                  type="button"
                  className={`luxmod-scope-btn ${unkickScope === 'this_room' ? 'luxmod-scope-btn--active' : ''}`}
                  style={unkickScope === 'this_room' ? { borderColor: cfg.color, color: cfg.color, background: `${cfg.color}15` } : {}}
                  onClick={() => setUnkickScope('this_room')}
                >
                  <Ico name="room" color={unkickScope === 'this_room' ? cfg.color : '#64748b'} size={14} />
                  This Room{currentRoomName ? ` — ${currentRoomName}` : ' Only'}
                </button>
              </div>
            </div>
          )}

          {/* ── Room Selector (multi-room kick) ── */}
          {needsRoomPicker && (
            <div className="luxmod-field">
              <div className="luxmod-field-label">
                <Ico name="room" color="#7c3aed" size={13} />
                Select Rooms
                <span className="luxmod-field-count">{selectedRooms.length}/{rooms.length} selected</span>
              </div>
              <div className="luxmod-rooms-header">
                <button className="luxmod-rooms-quick" onClick={() => setSelectedRooms(rooms.map(r => r.id))}>
                  <Ico name="check" color="#a78bfa" size={12} /> Select All
                </button>
                <button className="luxmod-rooms-quick" onClick={() => setSelectedRooms([])}>
                  <Ico name="close" color="#64748b" size={12} /> Deselect All
                </button>
              </div>
              <div className="luxmod-rooms-grid">
                {rooms.length === 0 ? (
                  <div className="luxmod-rooms-empty">No rooms found</div>
                ) : rooms.map(room => {
                  const isSelected = selectedRooms.includes(room.id);
                  return (
                    <button
                      key={room.id}
                      type="button"
                      className={`luxmod-room-chip ${isSelected ? 'luxmod-room-chip--selected' : ''}`}
                      style={isSelected ? { borderColor: `${cfg.color}60`, background: `${cfg.color}12`, color: cfg.color } : {}}
                      onClick={() => setSelectedRooms(prev =>
                        isSelected ? prev.filter(id => id !== room.id) : [...prev, room.id]
                      )}
                    >
                      <Ico name="room" color={isSelected ? cfg.color : '#64748b'} size={13} />
                      <span>{room.name || room.id}</span>
                      {isSelected && (
                        <div className="luxmod-room-chip-check">
                          <Ico name="check" color="#fff" size={9} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Reason Selector ── */}
          {!isReverse && (
            <div className="luxmod-field">
              <div className="luxmod-field-label">
                <Ico name="reason" color="#7c3aed" size={13} />
                Reason <span className="luxmod-required">*</span>
              </div>
              <div className="luxmod-reasons-list">
                {reasonList.filter(r => r !== 'custom').map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`luxmod-reason-btn ${reason === r ? 'luxmod-reason-btn--active' : ''}`}
                    style={reason === r ? { borderColor: `${cfg.color}60`, background: `${cfg.color}12`, color: cfg.color } : {}}
                    onClick={() => setReason(r)}
                  >
                    {reason === r && <Ico name="check" color={cfg.color} size={11} />}
                    {r}
                  </button>
                ))}
                <button
                  type="button"
                  className={`luxmod-reason-btn luxmod-reason-btn--custom ${reason === 'custom' ? 'luxmod-reason-btn--active' : ''}`}
                  style={reason === 'custom' ? { borderColor: `${cfg.color}60`, background: `${cfg.color}12`, color: cfg.color } : {}}
                  onClick={() => setReason('custom')}
                >
                  {reason === 'custom' && <Ico name="check" color={cfg.color} size={11} />}
                  Custom reason…
                </button>
              </div>
              {reason === 'custom' && (
                <textarea
                  className="luxmod-textarea"
                  placeholder="Describe the reason in detail…"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  rows={3}
                  style={{ '--focus-color': cfg.color }}
                />
              )}
            </div>
          )}

          {/* ── Duration Picker ── */}
          {cfg.hasDuration && (
            <div className="luxmod-field">
              <div className="luxmod-field-label">
                <Ico name="clock" color="#7c3aed" size={13} />
                {localAction === 'ban' ? 'Ban Duration' : localAction === 'mute' ? 'Mute Duration' : 'Kick Duration'}
              </div>
              <div className="luxmod-duration-pills">
                {durationList.map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    className={`luxmod-dur-pill ${duration === v ? 'luxmod-dur-pill--active' : ''}`}
                    style={duration === v ? { borderColor: cfg.color, background: `${cfg.color}18`, color: cfg.color, boxShadow: `0 0 10px ${cfg.glow}` } : {}}
                    onClick={() => setDuration(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {duration === 'custom' && (
                <input
                  type="text"
                  className="luxmod-input"
                  placeholder="e.g. 2 weeks, 6 months, 45 minutes"
                  value={customDuration}
                  onChange={e => setCustomDuration(e.target.value)}
                  style={{ '--focus-color': cfg.color }}
                />
              )}
            </div>
          )}

          {/* ── Internal Note ── */}
          <div className="luxmod-field">
            <div className="luxmod-field-label">
              <Ico name="note" color="#7c3aed" size={13} />
              Staff Note
              <span className="luxmod-field-optional">(optional)</span>
            </div>
            <textarea
              className="luxmod-textarea"
              placeholder="Internal note visible only to moderators…"
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={2}
              style={{ '--focus-color': cfg.color }}
            />
          </div>

          {/* ── Appeal Toggle (ban only) ── */}
          {localAction === 'ban' && (
            <button
              type="button"
              className={`luxmod-appeal-toggle ${appealAllowed ? 'luxmod-appeal-toggle--on' : ''}`}
              onClick={() => setAppealAllowed(v => !v)}
            >
              <div className={`luxmod-toggle-track ${appealAllowed ? 'luxmod-toggle-track--on' : ''}`}
                style={appealAllowed ? { background: cfg.color } : {}}>
                <div className="luxmod-toggle-thumb" />
              </div>
              <Ico name="shield" color={appealAllowed ? cfg.color : '#64748b'} size={14} />
              <span style={{ color: appealAllowed ? cfg.color : '#64748b' }}>
                {appealAllowed ? 'Appeal allowed' : 'No appeal'}
              </span>
            </button>
          )}

          {/* ── Error message ── */}
          {error && (
            <div className="luxmod-error">
              <Ico name="warning" color="#ef4444" size={14} />
              {error}
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="luxmod-footer">
          <button className="luxmod-btn-cancel" onClick={handleClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="luxmod-btn-confirm"
            style={{
              background: (isReverse || reason) ? `linear-gradient(135deg, ${cfg.dark || cfg.color}, ${cfg.color})` : 'rgba(51,65,85,0.6)',
              boxShadow: (isReverse || reason) ? `0 4px 20px ${cfg.glow}` : 'none',
              cursor: (isReverse || reason) && !isLoading ? 'pointer' : 'not-allowed',
              opacity: (!isReverse && !reason) || isLoading ? 0.6 : 1,
            }}
            onClick={handleConfirm}
            disabled={isLoading || (!isReverse && !reason)}
          >
            {isLoading ? (
              <span className="luxmod-spinner" />
            ) : (
              <>
                <Ico name={localAction} color="#fff" size={15} />
                Confirm {cfg.label}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminBanKickModal;
