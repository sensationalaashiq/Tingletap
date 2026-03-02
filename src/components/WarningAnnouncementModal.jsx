import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import './WarningAnnouncementModal.css';

const WarningAnnouncementModal = ({ 
  isVisible, 
  onClose, 
  currentUserProfile, 
  currentRoomId 
}) => {
  const [type, setType] = useState('warning'); // 'warning' or 'announcement'
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('medium'); // 'low', 'medium', 'high', 'critical'
  const [targetType, setTargetType] = useState('room'); // 'room', 'all_rooms', 'selected_users', 'all_users'
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [allowDismiss, setAllowDismiss] = useState(true);

  // Styling options
  const [bgColor, setBgColor] = useState('#ef4444');
  const [textColor, setTextColor] = useState('#ffffff');
  const [borderColor, setBorderColor] = useState('#dc2626');
  const [iconType, setIconType] = useState('warning');

  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch rooms and users
  useEffect(() => {
    if (isVisible) {
      // Fetch rooms
      const roomsQuery = query(collection(db, 'rooms'), orderBy('name'));
      const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
        const roomsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRooms(roomsList);
        if (currentRoomId && !selectedRooms.includes(currentRoomId)) {
          setSelectedRooms([currentRoomId]);
        }
      });

      // Fetch users
      const usersQuery = query(collection(db, 'users'));
      const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
      });

      return () => {
        unsubscribeRooms();
        unsubscribeUsers();
      };
    }
  }, [isVisible, currentRoomId]);

  // Update colors based on type and severity
  useEffect(() => {
    if (type === 'warning') {
      switch (severity) {
        case 'low':
          setBgColor('#f59e0b');
          setBorderColor('#d97706');
          setTextColor('#ffffff');
          break;
        case 'medium':
          setBgColor('#ef4444');
          setBorderColor('#dc2626');
          setTextColor('#ffffff');
          break;
        case 'high':
          setBgColor('#dc2626');
          setBorderColor('#b91c1c');
          setTextColor('#ffffff');
          break;
        case 'critical':
          setBgColor('#7f1d1d');
          setBorderColor('#991b1b');
          setTextColor('#ffffff');
          break;
      }
    } else {
      setBgColor('#3b82f6');
      setBorderColor('#2563eb');
      setTextColor('#ffffff');
    }
  }, [type, severity]);

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (targetType === 'selected_rooms' && selectedRooms.length === 0) {
      alert('Please select at least one room');
      return;
    }

    if (targetType === 'selected_users' && selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    setIsLoading(true);

    try {
      const warningData = {
        type,
        title: title.trim(),
        message: message.trim(),
        severity,
        targetType,
        selectedRooms: targetType === 'selected_rooms' ? selectedRooms : 
                      targetType === 'room' ? [currentRoomId] : 
                      targetType === 'all_rooms' ? rooms.map(r => r.id) : [],
        selectedUsers: targetType === 'selected_users' ? selectedUsers : 
                      targetType === 'all_users' ? users.map(u => u.id) : [],
        isUrgent,
        allowDismiss,
        styling: {
          bgColor,
          textColor,
          borderColor,
          iconType
        },
        createdBy: {
          uid: currentUserProfile.uid,
          displayName: currentUserProfile.displayName || 'System',
          role: currentUserProfile.role || 'admin'
        },
        createdAt: serverTimestamp(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        dismissedBy: [] // Track who dismissed it
      };

      // Set target-specific data
    if (targetType === 'room') {
      warningData.selectedRooms = [currentRoomId];
      warningData.roomId = currentRoomId; // Also store room ID for easier filtering
    } else if (targetType === 'selected_rooms') {
      warningData.selectedRooms = selectedRooms;
    } else if (targetType === 'selected_users') {
      warningData.selectedUsers = selectedUsers;
    } else if (targetType === 'all_users') {
      // Ensure all_users type is properly handled
      warningData.selectedRooms = [];
      warningData.selectedUsers = [];
    } else if (targetType === 'all_rooms') {
      // Ensure all_rooms type is properly handled
      warningData.selectedRooms = [];
      warningData.selectedUsers = [];
    }

      console.log('📢 Creating warning/announcement:', warningData);

      await addDoc(collection(db, 'warnings_announcements'), warningData);

      console.log(`${type} created successfully`);
      handleClose();
    } catch (error) {
      console.error('Error creating warning/announcement:', error);
      alert('Failed to create warning/announcement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setType('warning');
    setTitle('');
    setMessage('');
    setSeverity('medium');
    setTargetType('room');
    setSelectedRooms([]);
    setSelectedUsers([]);
    setExpiresAt('');
    setIsUrgent(false);
    setAllowDismiss(true);
    setIsLoading(false);
    onClose();
  };

  const canCreateWarnings = () => {
    if (!currentUserProfile) return false;
    return ['owner', 'admin', 'moderator'].includes(currentUserProfile.role);
  };

  if (!isVisible || !canCreateWarnings()) return null;

  const severityOptions = [
    { value: 'low', label: 'Low - General Notice', color: '#f59e0b' },
    { value: 'medium', label: 'Medium - Important', color: '#ef4444' },
    { value: 'high', label: 'High - Urgent', color: '#dc2626' },
    { value: 'critical', label: 'Critical - Immediate Action', color: '#7f1d1d' }
  ];

  const iconOptions = [
    { value: 'warning', label: 'Warning', icon: 'M12,2L13.09,8.26L22,9L14.74,14.74L16.18,22.91L12,18.18L7.82,22.91L9.26,14.74L2,9L10.91,8.26L12,2Z' },
    { value: 'info', label: 'Information', icon: 'M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z' },
    { value: 'announcement', label: 'Announcement', icon: 'M12,8H4A2,2 0 0,0 2,10V14A2,2 0 0,0 4,16H5V20A1,1 0 0,0 6,21H8A1,1 0 0,0 9,20V16H12L17,20V4L12,8M21.5,12C21.5,13.71 20.54,15.26 19,16V8C20.53,8.75 21.5,10.3 21.5,12Z' },
    { value: 'alert', label: 'Alert', icon: 'M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19Z' },
    { value: 'notice', label: 'Notice', icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' }
  ];

  return (
    <div className="warning-modal-overlay">
      <div className="warning-modal">
        <div className="warning-modal-header">
          <div className="warning-modal-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d={type === 'warning' ? "M12,2L13.09,8.26L22,9L14.74,14.74L16.18,22.91L12,18.18L7.82,22.91L9.26,14.74L2,9L10.91,8.26L12,2Z" : "M12,8H4A2,2 0 0,0 2,10V14A2,2 0 0,0 4,16H5V20A1,1 0 0,0 6,21H8A1,1 0 0,0 9,20V16H12L17,20V4L12,8M21.5,12C21.5,13.71 20.54,15.26 19,16V8C20.53,8.75 21.5,10.3 21.5,12Z"} />
            </svg>
          </div>
          <div className="warning-modal-title-section">
            <h2 className="warning-modal-title">
              Create {type === 'warning' ? 'Warning' : 'Announcement'}
            </h2>
            <p className="warning-modal-subtitle">
              Send notifications to users across the platform
            </p>
          </div>
          <button className="warning-modal-close" onClick={handleClose}>✕</button>
        </div>

        <div className="warning-modal-content">
          {/* Type Selection */}
          <div className="form-section">
            <label className="form-label">Type</label>
            <div className="type-selection">
              <button
                type="button"
                className={`type-btn ${type === 'warning' ? 'active' : ''}`}
                onClick={() => setType('warning')}
              >
                ⚠️ Warning
              </button>
              <button
                type="button"
                className={`type-btn ${type === 'announcement' ? 'active' : ''}`}
                onClick={() => setType('announcement')}
              >
                📢 Announcement
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="form-section">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder={`Enter ${type} title...`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div className="form-section">
            <label className="form-label">Message *</label>
            <textarea
              className="form-textarea"
              placeholder={`Enter ${type} message...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="4"
              maxLength={500}
            />
            <div className="char-count">{message.length}/500</div>
          </div>

          {/* Severity (for warnings only) */}
          {type === 'warning' && (
            <div className="form-section">
              <label className="form-label">Severity Level</label>
              <select 
                className="form-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                {severityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Selection */}
          <div className="form-section">
            <label className="form-label">Send To</label>
            <select 
              className="form-select"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
            >
              <option value="room">Current Room Only</option>
              <option value="selected_rooms">Selected Rooms</option>
              <option value="all_rooms">All Rooms</option>
              <option value="selected_users">Selected Users</option>
              <option value="all_users">All Users</option>
            </select>
          </div>

          {/* Room Selection */}
          {targetType === 'selected_rooms' && (
            <div className="form-section">
              <label className="form-label">Select Rooms</label>
              <div className="selection-grid">
                {rooms.map(room => (
                  <label key={room.id} className="selection-item">
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
                    <span className="selection-name">{room.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* User Selection */}
          {targetType === 'selected_users' && (
            <div className="form-section">
              <label className="form-label">Select Users</label>
              <div className="selection-grid">
                {users.slice(0, 20).map(user => (
                  <label key={user.id} className="selection-item">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                    />
                    <span className="checkmark"></span>
                    <span className="selection-name">{user.displayName || user.email}</span>
                  </label>
                ))}
              </div>
              {users.length > 20 && (
                <p className="selection-note">Showing first 20 users. Use "All Users" for everyone.</p>
              )}
            </div>
          )}

          {/* Styling Options */}
          <div className="form-section">
            <label className="form-label">Styling</label>
            <div className="styling-options">
              <div className="color-option">
                <label>Background Color</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                />
              </div>
              <div className="color-option">
                <label>Text Color</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                />
              </div>
              <div className="color-option">
                <label>Border Color</label>
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                />
              </div>
              <div className="icon-option">
                <label>Icon</label>
                <select
                  value={iconType}
                  onChange={(e) => setIconType(e.target.value)}
                >
                  {iconOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="form-section">
            <label className="form-label">Preview</label>
            <div 
              className="warning-preview"
              style={{
                backgroundColor: bgColor,
                color: textColor,
                borderColor: borderColor
              }}
            >
              <div className="preview-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d={iconOptions.find(opt => opt.value === iconType)?.icon || iconOptions[0].icon} />
                </svg>
              </div>
              <div className="preview-content">
                <h3>{title || `Sample ${type} title`}</h3>
                <p>{message || `This is a sample ${type} message preview.`}</p>
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="form-section">
            <label className="form-label">Options</label>
            <div className="options-grid">
              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span>Mark as Urgent (stays on top)</span>
              </label>
              <label className="option-checkbox">
                <input
                  type="checkbox"
                  checked={allowDismiss}
                  onChange={(e) => setAllowDismiss(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span>Allow users to dismiss</span>
              </label>
            </div>
          </div>

          {/* Expiration */}
          <div className="form-section">
            <label className="form-label">Expiration (Optional)</label>
            <input
              type="datetime-local"
              className="form-input"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        </div>

        <div className="warning-modal-footer">
          <button className="warning-btn-cancel" onClick={handleClose} disabled={isLoading}>
            Cancel
          </button>
          <button 
            className="warning-btn-confirm" 
            onClick={handleSubmit}
            disabled={isLoading || !title.trim() || !message.trim()}
          >
            {isLoading ? 'Creating...' : `Create ${type === 'warning' ? 'Warning' : 'Announcement'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarningAnnouncementModal;