
import React, { useState, useEffect } from 'react';
import { getDefaultAvatarUrl } from '../utils/roleUtils';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import './AdminBanKickModal.css';

const AdminBanKickModal = ({ 
  isVisible, 
  onClose, 
  selectedUser, 
  actionType,
  onConfirm,
  currentUserProfile 
}) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [duration, setDuration] = useState('permanent');
  const [customDuration, setCustomDuration] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [adminNotes, setAdminNotes] = useState('');
  const [appealAllowed, setAppealAllowed] = useState(true);

  useEffect(() => {
    if (actionType === 'kick_all') {
      const q = query(collection(db, 'rooms'), orderBy('name'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const roomsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRooms(roomsList);
        setSelectedRooms(roomsList.map(room => room.id));
      });
      return () => unsubscribe();
    }
  }, [actionType]);

  const handleConfirm = async () => {
    const finalReason = reason === 'custom' ? customReason.trim() : reason;
    const finalDuration = duration === 'custom' ? customDuration.trim() : duration;
    if (!finalReason) { alert('Please provide a reason'); return; }
    if (actionType === 'kick_all' && selectedRooms.length === 0) { alert('Please select at least one room'); return; }
    setIsLoading(true);
    const actionData = {
      reason: finalReason,
      duration: finalDuration,
      actionBy: currentUserProfile?.displayName || 'System Administrator',
      actionById: currentUserProfile?.uid || 'system',
      adminNotes: adminNotes.trim(),
      appealAllowed,
      selectedRooms: actionType === 'kick_all' ? selectedRooms : null,
      timestamp: new Date().toISOString()
    };
    try {
      await onConfirm(actionData);
      handleClose();
    } catch (error) {
      console.error(`Error performing ${actionType}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason(''); setCustomReason(''); setDuration('permanent');
    setCustomDuration(''); setAdminNotes(''); setAppealAllowed(true);
    setSelectedRooms([]); setIsLoading(false); onClose();
  };

  if (!isVisible || !selectedUser) return null;

  const getActionInfo = () => {
    switch (actionType) {
      case 'ban': return {
        title: 'Ban User', color: '#ef4444', colorLight: '#fff1f1', colorBorder: '#fecaca',
        icon: <path fill="#ef4444" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>,
        description: 'User will be blocked from accessing the platform',
        reasons: ['Violation of community guidelines','Harassment or bullying','Inappropriate content','Spam or promotional content','Impersonation','Hate speech or discrimination','Doxxing or sharing personal info','Circumventing previous bans','custom']
      };
      case 'kick': return {
        title: 'Kick from Room', color: '#f59e0b', colorLight: '#fffbeb', colorBorder: '#fde68a',
        icon: <path fill="#f59e0b" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>,
        description: 'User will be removed from the current room',
        reasons: ['Disruptive behavior','Off-topic conversation','Inappropriate language','Spamming messages','Room rule violation','Trolling or baiting','Ignoring warnings','custom']
      };
      case 'kick_all': return {
        title: 'Kick from All Rooms', color: '#dc2626', colorLight: '#fef2f2', colorBorder: '#fca5a5',
        icon: <><path fill="#dc2626" d="M19,15H17L15,17L13,15H5C4.45,15 4,15.45 4,16V19C4,19.55 4.45,20 5,20H19C19.55,20 20,19.55 20,19V16C20,15.45 19.55,15 19,15Z"/><path fill="#dc2626" d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/></>,
        description: 'User will be removed from all selected rooms',
        reasons: ['Severe disruptive behavior','Platform-wide violations','Coordinated harassment','Repeated violations','Cross-room spamming','Evading room kicks','custom']
      };
      case 'mute': return {
        title: 'Mute User', color: '#6b7280', colorLight: '#f9fafb', colorBorder: '#d1d5db',
        icon: <path fill="#6b7280" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.45 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L4.27,3Z"/>,
        description: 'User will be prevented from sending messages',
        reasons: ['Excessive messaging','Inappropriate language','Disrupting conversation','Warning ignored','Minor rule violation','Emoji/sticker spam','custom']
      };
      default: return { title: 'Action', color: '#7c3aed', colorLight: '#faf5ff', colorBorder: '#e9d5ff', icon: null, description: '', reasons: [] };
    }
  };

  const info = getActionInfo();

  return (
    <div className="abk-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="abk-card">

        <div className="abk-header" style={{ borderTopColor: info.color }}>
          <div className="abk-header-icon" style={{ background: info.colorLight, border: `2px solid ${info.colorBorder}` }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 26, height: 26 }}>{info.icon}</svg>
          </div>
          <div className="abk-header-text">
            <h2 className="abk-title">{info.title}</h2>
            <p className="abk-subtitle">
              <span className="abk-target-name">{selectedUser.displayName || selectedUser.email}</span>
            </p>
          </div>
          <button className="abk-close" onClick={handleClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 16, height: 16 }}>
              <path fill="#94a3b8" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>

        <div className="abk-desc-bar" style={{ background: info.colorLight, borderBottom: `1px solid ${info.colorBorder}` }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, flexShrink: 0 }}>
            <path fill={info.color} d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          <span style={{ color: info.color }}>{info.description}</span>
        </div>

        <div className="abk-body">

          <div className="abk-user-strip">
            <img
              src={selectedUser.photoURL || `${getDefaultAvatarUrl(selectedUser.uid, selectedUser.gender)}`}
              alt=""
              className="abk-user-avatar"
            />
            <div className="abk-user-meta">
              <span className="abk-user-name">{selectedUser.displayName || 'Unknown'}</span>
              <span className="abk-user-email">{selectedUser.email}</span>
            </div>
            <div className="abk-user-badges">
              <span className="abk-role-pill">{selectedUser.role?.toUpperCase() || 'USER'}</span>
              <span className={`abk-status-pill ${selectedUser.isBanned ? 'banned' : selectedUser.mutedInfo?.isMuted ? 'muted' : 'active'}`}>
                {selectedUser.isBanned ? 'Banned' : selectedUser.mutedInfo?.isMuted ? 'Muted' : 'Active'}
              </span>
            </div>
          </div>

          <div className="abk-field">
            <label className="abk-label">
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13 }}>
                <path fill="#7c3aed" d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/>
              </svg>
              Reason *
            </label>
            <select className="abk-select" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select a reason…</option>
              {info.reasons.map((r, i) => (
                <option key={i} value={r}>{r === 'custom' ? 'Custom reason…' : r}</option>
              ))}
            </select>
            {reason === 'custom' && (
              <textarea
                className="abk-textarea"
                placeholder="Describe the reason in detail…"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
              />
            )}
          </div>

          {(actionType === 'ban' || actionType === 'mute') && (
            <div className="abk-field">
              <label className="abk-label">
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13 }}>
                  <path fill="#7c3aed" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
                </svg>
                {actionType === 'ban' ? 'Ban Duration' : 'Mute Duration'}
              </label>
              <select className="abk-select" value={duration} onChange={(e) => setDuration(e.target.value)}>
                {actionType === 'ban' ? (
                  <>
                    <option value="permanent">Permanent</option>
                    <option value="1h">1 Hour</option>
                    <option value="24h">24 Hours</option>
                    <option value="3d">3 Days</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="90d">90 Days</option>
                    <option value="1y">1 Year</option>
                    <option value="custom">Custom…</option>
                  </>
                ) : (
                  <>
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="30m">30 Minutes</option>
                    <option value="1h">1 Hour</option>
                    <option value="6h">6 Hours</option>
                    <option value="24h">24 Hours</option>
                    <option value="3d">3 Days</option>
                    <option value="7d">7 Days</option>
                    <option value="permanent">Permanent</option>
                    <option value="custom">Custom…</option>
                  </>
                )}
              </select>
              {duration === 'custom' && (
                <input
                  type="text"
                  className="abk-input"
                  placeholder={actionType === 'ban' ? 'e.g. 2 weeks, 6 months' : 'e.g. 2 hours, 45 minutes'}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                />
              )}
            </div>
          )}

          {actionType === 'kick_all' && (
            <div className="abk-field">
              <label className="abk-label">
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13 }}>
                  <path fill="#7c3aed" d="M17,12V3A1,1 0 0,0 16,2H3A1,1 0 0,0 2,3V17L6,13H16A1,1 0 0,0 17,12M21,6H19V15H6V17A1,1 0 0,0 7,18H18L22,22V7A1,1 0 0,0 21,6Z"/>
                </svg>
                Select Rooms
              </label>
              <div className="abk-rooms-box">
                <div className="abk-rooms-actions">
                  <button type="button" className="abk-rooms-btn" onClick={() => setSelectedRooms(rooms.map(r => r.id))}>All</button>
                  <button type="button" className="abk-rooms-btn" onClick={() => setSelectedRooms([])}>None</button>
                  <span className="abk-rooms-count">{selectedRooms.length}/{rooms.length} selected</span>
                </div>
                <div className="abk-rooms-grid">
                  {rooms.map(room => (
                    <label key={room.id} className="abk-room-check">
                      <input
                        type="checkbox"
                        checked={selectedRooms.includes(room.id)}
                        onChange={(e) => setSelectedRooms(prev =>
                          e.target.checked ? [...prev, room.id] : prev.filter(id => id !== room.id)
                        )}
                      />
                      <span>{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="abk-field">
            <label className="abk-label">
              <svg viewBox="0 0 24 24" fill="none" style={{ width: 13, height: 13 }}>
                <path fill="#7c3aed" d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2M20,16H5.17L4,17.17V4H20V16Z"/>
              </svg>
              Internal Note <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              className="abk-textarea"
              placeholder="Notes for other moderators…"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={2}
            />
          </div>

          {actionType === 'ban' && (
            <label className="abk-appeal-check">
              <input
                type="checkbox"
                checked={appealAllowed}
                onChange={(e) => setAppealAllowed(e.target.checked)}
              />
              <span>Allow user to appeal this ban</span>
            </label>
          )}

        </div>

        <div className="abk-footer">
          <button className="abk-btn-cancel" onClick={handleClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="abk-btn-confirm"
            style={{ background: reason.trim() ? info.color : '#d1d5db', cursor: reason.trim() ? 'pointer' : 'not-allowed' }}
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? (
              <span className="abk-spinner" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" style={{ width: 15, height: 15 }}>
                  {info.icon}
                </svg>
                Confirm {info.title}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminBanKickModal;
