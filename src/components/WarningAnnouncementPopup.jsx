
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  updateDoc, 
  doc, 
  arrayUnion,
  orderBy 
} from 'firebase/firestore';
import './WarningAnnouncementPopup.css';

const WarningAnnouncementPopup = ({ currentUser, currentRoomId }) => {
  const [activeWarnings, setActiveWarnings] = useState([]);
  const [visibleWarnings, setVisibleWarnings] = useState([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'warnings_announcements'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📢 Raw warnings from Firebase:', snapshot.docs.length);
      console.log('📢 Current user:', currentUser.uid);
      console.log('📢 Current room:', currentRoomId);

      const warnings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('📢 All warnings from Firebase:', warnings);
      warnings.forEach(warning => {
        console.log(`📢 Warning "${warning.title}":`, {
          targetType: warning.targetType,
          selectedRooms: warning.selectedRooms,
          selectedUsers: warning.selectedUsers,
          isActive: warning.isActive,
          createdBy: warning.createdBy?.displayName
        });
      });

      // Filter warnings relevant to current user
      const relevantWarnings = warnings.filter(warning => {
        console.log(`🔍 Checking warning "${warning.title}" for user ${currentUser.uid}`);

        // Check if already dismissed
        if (warning.dismissedBy?.includes(currentUser.uid)) {
          console.log('❌ Already dismissed by user');
          return false;
        }

        // Check expiration with proper date handling
        if (warning.expiresAt) {
          let expiryDate;
          if (warning.expiresAt.toDate) {
            // Firebase Timestamp
            expiryDate = warning.expiresAt.toDate();
          } else if (warning.expiresAt.seconds) {
            // Firebase Timestamp object
            expiryDate = new Date(warning.expiresAt.seconds * 1000);
          } else {
            // Regular date string/object
            expiryDate = new Date(warning.expiresAt);
          }
          
          const now = new Date();
          if (expiryDate <= now) {
            console.log('❌ Warning expired:', {
              title: warning.title,
              expiryDate: expiryDate.toLocaleString(),
              currentTime: now.toLocaleString()
            });
            return false;
          }
          
          console.log('✅ Warning not expired:', {
            title: warning.title,
            expiryDate: expiryDate.toLocaleString(),
            currentTime: now.toLocaleString(),
            timeLeft: Math.round((expiryDate - now) / (1000 * 60)) + ' minutes'
          });
        }

        // Check target criteria
        switch (warning.targetType) {
          case 'all_users':
            console.log('✅ Target: All users - showing');
            return true;

          case 'selected_users':
            const isSelectedUser = warning.selectedUsers?.includes(currentUser.uid);
            console.log(`${isSelectedUser ? '✅' : '❌'} Target: Selected users - ${isSelectedUser ? 'user included' : 'user not included'}`);
            return isSelectedUser;

          case 'room':
            // Show to all users in the current room
            console.log(`✅ Target: Current room (${currentRoomId}) - showing to all users in room`);
            return true;

          case 'selected_rooms':
            const isInSelectedRooms = warning.selectedRooms?.includes(currentRoomId);
            console.log(`${isInSelectedRooms ? '✅' : '❌'} Target: Selected rooms - ${isInSelectedRooms ? 'room included' : 'room not included'}`);
            return isInSelectedRooms;

          case 'all_rooms':
            console.log('✅ Target: All rooms - showing');
            return true;

          default:
            console.log('❌ Unknown target type, defaulting to show for current room');
            // Default to showing for current room to be safe
            return true;
        }
      });

      console.log('📢 Relevant warnings for user:', relevantWarnings.length);
      setActiveWarnings(relevantWarnings);
    });

    return () => unsubscribe();
  }, [currentUser, currentRoomId]);

  useEffect(() => {
    // Sort warnings by urgency and creation date
    const sortedWarnings = [...activeWarnings].sort((a, b) => {
      // Urgent warnings first
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;

      // Then by creation date (newest first)
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return bDate - aDate;
    });

    setVisibleWarnings(sortedWarnings);

    // Set up automatic expiration check every minute
    const expirationInterval = setInterval(() => {
      const now = new Date();
      setVisibleWarnings(prev => {
        const nonExpired = prev.filter(warning => {
          if (!warning.expiresAt) return true;
          
          let expiryDate;
          if (warning.expiresAt.toDate) {
            expiryDate = warning.expiresAt.toDate();
          } else if (warning.expiresAt.seconds) {
            expiryDate = new Date(warning.expiresAt.seconds * 1000);
          } else {
            expiryDate = new Date(warning.expiresAt);
          }
          
          const isExpired = expiryDate <= now;
          if (isExpired) {
            console.log('🕐 Auto-removing expired warning:', warning.title);
          }
          return !isExpired;
        });
        
        return nonExpired;
      });
    }, 60000); // Check every minute

    return () => clearInterval(expirationInterval);
  }, [activeWarnings]);

  const handleDismiss = async (warningId) => {
    try {
      const warningRef = doc(db, 'warnings_announcements', warningId);
      await updateDoc(warningRef, {
        dismissedBy: arrayUnion(currentUser.uid)
      });

      // Remove from local state with animation
      setVisibleWarnings(prev => prev.filter(w => w.id !== warningId));
      console.log('✅ Warning dismissed successfully');
    } catch (error) {
      console.error('❌ Error dismissing warning:', error);
    }
  };

  if (visibleWarnings.length === 0) return null;

  const getWarningIcon = (warning) => {
    if (warning.styling?.iconType === 'warning') {
      return '⚠️';
    } else if (warning.styling?.iconType === 'info') {
      return 'ℹ️';
    } else if (warning.styling?.iconType === 'announcement') {
      return '📢';
    } else if (warning.styling?.iconType === 'alert') {
      return '🚨';
    } else if (warning.styling?.iconType === 'notice') {
      return '📋';
    } else if (warning.type === 'warning') {
      return '⚠️';
    } else {
      return '📢';
    }
  };

  const getGradientBackground = (warning) => {
    if (warning.isUrgent) {
      return 'linear-gradient(135deg, #ff0844, #ffb199)';
    }
    
    switch (warning.type) {
      case 'warning':
        return 'linear-gradient(135deg, #ff6b6b, #feca57)';
      case 'announcement':
        return 'linear-gradient(135deg, #667eea, #764ba2)';
      default:
        return 'linear-gradient(135deg, #4facfe, #00f2fe)';
    }
  };

  return (
    <div className="stylish-announcements-container">
      {visibleWarnings.map((warning, index) => (
        <div
          key={warning.id}
          className={`stylish-announcement ${warning.type} ${warning.isUrgent ? 'urgent' : ''}`}
          style={{
            background: warning.styling?.bgColor ? 
              `linear-gradient(135deg, ${warning.styling.bgColor}, ${warning.styling.borderColor || '#764ba2'})` : 
              getGradientBackground(warning),
            animationDelay: `${index * 0.1}s`
          }}
        >
          {/* Animated Background Elements */}
          <div className="announcement-bg-effects">
            <div className="floating-particles">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`particle particle-${i + 1}`}></div>
              ))}
            </div>
            <div className="gradient-overlay"></div>
          </div>

          {/* Main Content */}
          <div className="announcement-content">
            {/* Header */}
            <div className="announcement-header">
              <div className="icon-container">
                <div className="animated-icon">
                  {getWarningIcon(warning)}
                </div>
                {warning.isUrgent && (
                  <div className="urgent-pulse"></div>
                )}
              </div>
              
              <div className="header-content">
                <div className="title-section">
                  <h3 className="announcement-title">
                    {warning.title}
                  </h3>
                  <div className="badges-container">
                    {warning.isUrgent && (
                      <span className="urgent-badge">
                        ⚡ URGENT
                      </span>
                    )}
                    <span className="type-badge">
                      {warning.type.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {warning.allowDismiss && (
                <button
                  className="stylish-dismiss-btn"
                  onClick={() => handleDismiss(warning.id)}
                  title="Dismiss"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Message */}
            <div className="announcement-message">
              <p>{warning.message}</p>
            </div>

            {/* Footer */}
            <div className="announcement-footer">
              <div className="author-info">
                <div className="author-avatar">
                  {warning.createdBy?.displayName?.charAt(0) || 'S'}
                </div>
                <div className="author-details">
                  <span className="author-name">
                    {warning.createdBy?.displayName || 'System'}
                  </span>
                  {warning.expiresAt && (
                    <span className="expires-info">
                      🕐 Expires: {new Date(warning.expiresAt.toDate()).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="severity-indicator">
                <div className={`severity-dot ${warning.severity || 'medium'}`}></div>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="decorative-corner top-left"></div>
          <div className="decorative-corner top-right"></div>
          <div className="decorative-corner bottom-left"></div>
          <div className="decorative-corner bottom-right"></div>
        </div>
      ))}
    </div>
  );
};

export default WarningAnnouncementPopup;
