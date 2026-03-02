
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import './AdminBanKickModal.css';

const AdminBanKickModal = ({ 
  isVisible, 
  onClose, 
  selectedUser, 
  actionType, // 'ban', 'kick', 'kick_all', 'mute'
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

  // Fetch all rooms for kick from all rooms functionality
  useEffect(() => {
    if (actionType === 'kick_all') {
      const q = query(collection(db, 'rooms'), orderBy('name'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const roomsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRooms(roomsList);
        // Select all rooms by default
        setSelectedRooms(roomsList.map(room => room.id));
      });
      return () => unsubscribe();
    }
  }, [actionType]);

  const handleConfirm = async () => {
    const finalReason = reason === 'custom' ? customReason.trim() : reason;
    const finalDuration = duration === 'custom' ? customDuration.trim() : duration;
    
    if (!finalReason) {
      alert('Please provide a reason');
      return;
    }

    if (actionType === 'kick_all' && selectedRooms.length === 0) {
      alert('Please select at least one room to kick from');
      return;
    }

    setIsLoading(true);
    
    const actionData = {
      reason: finalReason,
      duration: finalDuration,
      actionBy: currentUserProfile?.displayName || 'System Administrator',
      actionById: currentUserProfile?.uid || 'system',
      adminNotes: adminNotes.trim(),
      appealAllowed: appealAllowed,
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
    setReason('');
    setCustomReason('');
    setDuration('permanent');
    setCustomDuration('');
    setAdminNotes('');
    setAppealAllowed(true);
    setSelectedRooms([]);
    setIsLoading(false);
    onClose();
  };

  if (!isVisible || !selectedUser) return null;

  const getActionInfo = () => {
    switch (actionType) {
      case 'ban':
        return {
          title: 'Ban User',
          icon: (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
            </svg>
          ),
          color: '#ef4444',
          description: 'This will prevent the user from accessing the platform',
          reasons: [
            'Violation of community guidelines',
            'Harassment or bullying',
            'Inappropriate content',
            'Spam or promotional content',
            'Impersonation',
            'Multiple rule violations',
            'Hate speech or discrimination',
            'Doxxing or sharing personal information',
            'Circumventing previous bans',
            'custom'
          ]
        };
      case 'kick':
        return {
          title: 'Kick User from Room',
          icon: (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/>
              <path d="M13,9V7.5L10,4.5L7,7.5V9C7,9.55 7.45,10 8,10H9L11,12L13,10H14C14.55,10 15,9.55 15,9Z"/>
            </svg>
          ),
          color: '#f59e0b',
          description: 'This will remove the user from the current room',
          reasons: [
            'Disruptive behavior',
            'Off-topic conversation',
            'Inappropriate language',
            'Spamming messages',
            'Room rule violation',
            'Trolling or baiting',
            'Ignoring moderator warnings',
            'custom'
          ]
        };
      case 'kick_all':
        return {
          title: 'Kick User from All Rooms',
          icon: (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19,15H17L15,17L13,15H5C4.45,15 4,15.45 4,16V19C4,19.55 4.45,20 5,20H19C19.55,20 20,19.55 20,19V16C20,15.45 19.55,15 19,15Z"/>
              <path d="M13,9V7.5L10,4.5L7,7.5V9C7,9.55 7.45,10 8,10H9L11,12L13,10H14C14.55,10 15,9.55 15,9Z"/>
              <path d="M16,12A2,2 0 0,1 18,10A2,2 0 0,1 20,12A2,2 0 0,1 18,14A2,2 0 0,1 16,12M10,12A2,2 0 0,1 12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12M4,12A2,2 0 0,1 6,10A2,2 0 0,1 8,12A2,2 0 0,1 6,14A2,2 0 0,1 4,12Z"/>
            </svg>
          ),
          color: '#dc2626',
          description: 'This will remove the user from all selected rooms',
          reasons: [
            'Severe disruptive behavior across multiple rooms',
            'Platform-wide rule violations',
            'Coordinated harassment',
            'Repeated violations after warnings',
            'Cross-room spamming',
            'Trolling multiple communities',
            'Evading room-specific kicks',
            'custom'
          ]
        };
      case 'mute':
        return {
          title: 'Mute User',
          icon: (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19M16.5,12C16.78,12 17,12.22 17,12.5V13.5C17,13.78 16.78,14 16.5,14H15.5C15.22,14 15,13.78 15,13.5V12.5C15,12.22 15.22,12 15.5,12H16.5Z"/>
            </svg>
          ),
          color: '#6b7280',
          description: 'This will prevent the user from sending messages',
          reasons: [
            'Excessive messaging',
            'Inappropriate language',
            'Disrupting conversation',
            'Verbal warning ignored',
            'Minor rule violation',
            'Caps lock abuse',
            'Emoji/sticker spam',
            'custom'
          ]
        };
      default:
        return { 
          title: 'Action', 
          icon: (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
            </svg>
          ), 
          color: '#6b7280', 
          description: '', 
          reasons: [] 
        };
    }
  };

  const actionInfo = getActionInfo();

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal">
        <div className="admin-modal-header" style={{ borderTopColor: actionInfo.color }}>
          <div className="admin-modal-icon" style={{ backgroundColor: actionInfo.color, color: 'white' }}>
            {actionInfo.icon}
          </div>
          <div className="admin-modal-title-section">
            <h2 className="admin-modal-title">{actionInfo.title}</h2>
            <p className="admin-modal-subtitle">
              Target: <strong>{selectedUser.displayName || selectedUser.email}</strong>
            </p>
            <p className="admin-modal-description">{actionInfo.description}</p>
          </div>
          <button className="admin-modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="admin-modal-content">
          <div className="form-section">
            <label className="form-label">Reason for {actionType.replace('_', ' ')}</label>
            <select 
              className="form-select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="">Select a reason...</option>
              {actionInfo.reasons.map((reasonOption, index) => (
                <option key={index} value={reasonOption}>
                  {reasonOption === 'custom' ? 'Custom (specify below)' : reasonOption}
                </option>
              ))}
            </select>
            
            {reason === 'custom' && (
              <textarea
                className="form-textarea"
                placeholder="Please specify the custom reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows="3"
              />
            )}
          </div>

          {(actionType === 'ban' || actionType === 'mute') && (
            <div className="form-section">
              <label className="form-label">
                {actionType === 'ban' ? 'Ban Duration' : 'Mute Duration'}
              </label>
              <select 
                className="form-select"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
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
                    <option value="custom">Custom Duration</option>
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
                    <option value="custom">Custom Duration</option>
                  </>
                )}
              </select>
              
              {duration === 'custom' && (
                <input
                  type="text"
                  className="form-input"
                  placeholder={actionType === 'ban' ? "e.g., 2 weeks, 6 months, 2 years" : "e.g., 2 hours, 45 minutes, 5 days"}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                />
              )}
            </div>
          )}

          {actionType === 'kick_all' && (
            <div className="form-section">
              <label className="form-label">Select Rooms to Kick From</label>
              <div className="rooms-selection">
                <div className="rooms-selection-header">
                  <button 
                    type="button"
                    className="select-all-btn"
                    onClick={() => setSelectedRooms(rooms.map(room => room.id))}
                  >
                    Select All
                  </button>
                  <button 
                    type="button"
                    className="deselect-all-btn"
                    onClick={() => setSelectedRooms([])}
                  >
                    Deselect All
                  </button>
                </div>
                <div className="rooms-grid">
                  {rooms.map(room => (
                    <label key={room.id} className="room-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedRooms.includes(room.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRooms([...selectedRooms, room.id]);
                          } else {
                            setSelectedRooms(selectedRooms.filter(id => id !== room.id));
                          }
                        }}
                      />
                      <span className="checkmark"></span>
                      <span className="room-name">{room.name}</span>
                    </label>
                  ))}
                </div>
                <div className="selected-count">
                  {selectedRooms.length} of {rooms.length} rooms selected
                </div>
              </div>
            </div>
          )}

          <div className="form-section">
            <label className="form-label">Internal Admin Notes (Optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Add any internal notes for other moderators..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows="2"
            />
          </div>

          {actionType === 'ban' && (
            <div className="form-section">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  checked={appealAllowed}
                  onChange={(e) => setAppealAllowed(e.target.checked)}
                />
                <span className="checkmark"></span>
                Allow user to appeal this ban
              </label>
            </div>
          )}

          <div className="user-info-section">
            <h4>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
              </svg>
              User Information
            </h4>
            <div className="user-info-grid">
              <div className="info-item">
                <span className="info-label">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginRight: '6px' }}>
                    <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>
                  </svg>
                  Email:
                </span>
                <span className="info-value">{selectedUser.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginRight: '6px' }}>
                    <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
                  </svg>
                  Role:
                </span>
                <span className="info-value">{selectedUser.role || 'user'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ marginRight: '6px' }}>
                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M7,13H9V11H7V13M15,11H17V13H15V11Z"/>
                  </svg>
                  Current Status:
                </span>
                <span className="info-value">
                  {selectedUser.isBanned ? 'Banned' : 
                   selectedUser.mutedInfo?.isMuted ? 'Muted' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button className="admin-btn-cancel" onClick={handleClose} disabled={isLoading}>
            Cancel
          </button>
          <button 
            className="admin-btn-confirm" 
            style={{ backgroundColor: actionInfo.color }}
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? 'Processing...' : `Confirm ${actionInfo.title}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminBanKickModal;
