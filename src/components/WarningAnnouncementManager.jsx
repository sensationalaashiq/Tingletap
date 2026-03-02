
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc,
  where 
} from 'firebase/firestore';
import './WarningAnnouncementManager.css';

const WarningAnnouncementManager = ({ 
  isVisible, 
  onClose, 
  currentUserProfile 
}) => {
  const [warnings, setWarnings] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'expired', 'warnings', 'announcements'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'severity'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const q = query(
      collection(db, 'warnings_announcements'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const warningsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWarnings(warningsList);
    });

    return () => unsubscribe();
  }, [isVisible]);

  const canManageWarnings = () => {
    if (!currentUserProfile) return false;
    return ['owner', 'admin', 'moderator'].includes(currentUserProfile.role);
  };

  const filteredAndSortedWarnings = () => {
    let filtered = [...warnings];

    // Apply filters
    switch (filter) {
      case 'active':
        filtered = filtered.filter(w => w.isActive && (!w.expiresAt || new Date(w.expiresAt.toDate()) > new Date()));
        break;
      case 'expired':
        filtered = filtered.filter(w => {
          if (!w.isActive) return true;
          if (!w.expiresAt) return false;
          
          let expiryDate;
          if (w.expiresAt.toDate) {
            expiryDate = w.expiresAt.toDate();
          } else if (w.expiresAt.seconds) {
            expiryDate = new Date(w.expiresAt.seconds * 1000);
          } else {
            expiryDate = new Date(w.expiresAt);
          }
          
          return expiryDate <= new Date();
        });
        break;
      case 'warnings':
        filtered = filtered.filter(w => w.type === 'warning');
        break;
      case 'announcements':
        filtered = filtered.filter(w => w.type === 'announcement');
        break;
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        filtered.sort((a, b) => a.createdAt?.toDate() - b.createdAt?.toDate());
        break;
      case 'severity':
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        filtered.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));
        break;
      default: // newest
        filtered.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
    }

    return filtered;
  };

  const handleToggleActive = async (warningId, currentStatus) => {
    setLoading(true);
    try {
      const warningRef = doc(db, 'warnings_announcements', warningId);
      await updateDoc(warningRef, {
        isActive: !currentStatus
      });
    } catch (error) {
      console.error('Error toggling warning status:', error);
      alert('Failed to update warning status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (warningId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const warningRef = doc(db, 'warnings_announcements', warningId);
      await deleteDoc(warningRef);
      console.log('✅ Warning deleted successfully:', title);
      alert('Warning/Announcement deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting warning:', error);
      alert(`Failed to delete warning: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (warning) => {
    let isExpired = false;
    
    if (warning.expiresAt) {
      let expiryDate;
      if (warning.expiresAt.toDate) {
        expiryDate = warning.expiresAt.toDate();
      } else if (warning.expiresAt.seconds) {
        expiryDate = new Date(warning.expiresAt.seconds * 1000);
      } else {
        expiryDate = new Date(warning.expiresAt);
      }
      isExpired = expiryDate <= new Date();
    }
    
    const isActive = warning.isActive && !isExpired;

    if (isExpired) {
      return <span className="status-badge expired">Expired</span>;
    } else if (isActive) {
      return <span className="status-badge active">Active</span>;
    } else {
      return <span className="status-badge inactive">Inactive</span>;
    }
  };

  const getSeverityBadge = (severity) => {
    if (!severity) return null;
    return <span className={`severity-badge severity-${severity}`}>{severity.toUpperCase()}</span>;
  };

  const getTargetDescription = (warning) => {
    switch (warning.targetType) {
      case 'all_users':
        return 'All Users';
      case 'selected_users':
        return `${warning.selectedUsers?.length || 0} Selected Users`;
      case 'room':
        return 'Current Room';
      case 'selected_rooms':
        return `${warning.selectedRooms?.length || 0} Selected Rooms`;
      case 'all_rooms':
        return 'All Rooms';
      default:
        return 'Unknown Target';
    }
  };

  if (!isVisible || !canManageWarnings()) return null;

  return (
    <div className="manager-modal-overlay">
      <div className="manager-modal">
        <div className="manager-modal-header">
          <div className="manager-modal-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19,3A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3H19M5,7V19H19V7H5M7,9H9V11H7V9M11,9H17V11H11V9M7,13H9V15H7V13M11,13H17V15H11V13M7,17H9V19H7V17M11,17H17V19H11V17Z"/>
            </svg>
          </div>
          <div className="manager-modal-title-section">
            <h2 className="manager-modal-title">Warning & Announcement Manager</h2>
            <p className="manager-modal-subtitle">
              Manage all warnings and announcements
            </p>
          </div>
          <button className="manager-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="manager-modal-controls">
          <div className="control-group">
            <label>Filter:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired/Inactive</option>
              <option value="warnings">Warnings Only</option>
              <option value="announcements">Announcements Only</option>
            </select>
          </div>
          <div className="control-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="severity">Severity</option>
            </select>
          </div>
        </div>

        <div className="manager-modal-content">
          {filteredAndSortedWarnings().length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                  <path d="M20,6H16V4A2,2 0 0,0 14,2H10A2,2 0 0,0 8,4V6H4A1,1 0 0,0 3,7V8A1,1 0 0,0 4,9H5V19A3,3 0 0,0 8,22H16A3,3 0 0,0 19,19V9H20A1,1 0 0,0 21,8V7A1,1 0 0,0 20,6M10,4H14V6H10V4M17,19A1,1 0 0,1 16,20H8A1,1 0 0,1 7,19V9H17V19Z"/>
                </svg>
              </div>
              <h3>No warnings or announcements found</h3>
              <p>No items match your current filter criteria.</p>
            </div>
          ) : (
            <div className="warnings-list">
              {filteredAndSortedWarnings().map((warning) => (
                <div key={warning.id} className="warning-item">
                  <div 
                    className="warning-item-header"
                    style={{
                      borderLeftColor: warning.styling?.borderColor || '#ef4444'
                    }}
                  >
                    <div className="warning-item-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d={
                          warning.styling?.iconType === 'warning' ? 'M12,2L13.09,8.26L22,9L14.74,14.74L16.18,22.91L12,18.18L7.82,22.91L9.26,14.74L2,9L10.91,8.26L12,2Z' :
                          warning.styling?.iconType === 'info' ? 'M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z' :
                          warning.styling?.iconType === 'announcement' ? 'M12,8H4A2,2 0 0,0 2,10V14A2,2 0 0,0 4,16H5V20A1,1 0 0,0 6,21H8A1,1 0 0,0 9,20V16H12L17,20V4L12,8M21.5,12C21.5,13.71 20.54,15.26 19,16V8C20.53,8.75 21.5,10.3 21.5,12Z' :
                          warning.styling?.iconType === 'alert' ? 'M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19Z' :
                          warning.styling?.iconType === 'notice' ? 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' :
                          (warning.type === 'warning' ? 'M12,2L13.09,8.26L22,9L14.74,14.74L16.18,22.91L12,18.18L7.82,22.91L9.26,14.74L2,9L10.91,8.26L12,2Z' : 'M12,8H4A2,2 0 0,0 2,10V14A2,2 0 0,0 4,16H5V20A1,1 0 0,0 6,21H8A1,1 0 0,0 9,20V16H12L17,20V4L12,8M21.5,12C21.5,13.71 20.54,15.26 19,16V8C20.53,8.75 21.5,10.3 21.5,12Z')
                        } />
                      </svg>
                    </div>
                    <div className="warning-item-info">
                      <div className="warning-item-title-row">
                        <h3 className="warning-item-title">{warning.title}</h3>
                        <div className="warning-item-badges">
                          {warning.isUrgent && <span className="urgent-badge">URGENT</span>}
                          {getStatusBadge(warning)}
                          {getSeverityBadge(warning.severity)}
                          <span className="type-badge">{warning.type.toUpperCase()}</span>
                        </div>
                      </div>
                      <p className="warning-item-message">{warning.message}</p>
                      <div className="warning-item-meta">
                        <span className="meta-item">
                          <strong>Target:</strong> {getTargetDescription(warning)}
                        </span>
                        <span className="meta-item">
                          <strong>Created by:</strong> {warning.createdBy?.displayName || 'System'}
                        </span>
                        <span className="meta-item">
                          <strong>Created:</strong> {warning.createdAt ? new Date(warning.createdAt.toDate()).toLocaleString() : 'Unknown'}
                        </span>
                        {warning.expiresAt && (
                          <span className="meta-item">
                            <strong>Expires:</strong> {new Date(warning.expiresAt.toDate()).toLocaleString()}
                          </span>
                        )}
                        {warning.dismissedBy?.length > 0 && (
                          <span className="meta-item">
                            <strong>Dismissed by:</strong> {warning.dismissedBy.length} users
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="warning-item-actions">
                    <button
                      className={`action-btn ${warning.isActive ? 'deactivate' : 'activate'}`}
                      onClick={() => handleToggleActive(warning.id, warning.isActive)}
                      disabled={loading}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{marginRight: '4px'}}>
                        <path d={warning.isActive ? 'M14,19H18V5H14M6,19H10V5H6V19Z' : 'M8,5.14V19.14L19,12.14L8,5.14Z'} />
                      </svg>
                      {warning.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDelete(warning.id, warning.title)}
                      disabled={loading}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{marginRight: '4px'}}>
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarningAnnouncementManager;
