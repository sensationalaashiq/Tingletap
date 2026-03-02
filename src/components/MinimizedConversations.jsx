import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './MinimizedConversations.css';
import { auth } from '../firebase/config';

// Global call window manager to ensure only one call window at a time
let activeCallWindow = null;
const setActiveCallWindow = (windowId) => {
  activeCallWindow = windowId;
};
const getActiveCallWindow = () => activeCallWindow;
const clearActiveCallWindow = () => {
  activeCallWindow = null;
};

// Global function to remove minimized conversation
if (!window.removeMinimizedConversation) {
  window.removeMinimizedConversation = (conversationId) => {
    console.log('🗑️ Removing minimized conversation:', conversationId);
    // This will be implemented by HomePage component
  };
}

// Export for use in other components
export { setActiveCallWindow, getActiveCallWindow, clearActiveCallWindow };

const MinimizedConversations = ({ 
  minimizedConversations, 
  onOpenConversation, 
  onRemoveConversation,
  unreadCounts,
  forceClose = false
}) => {
  
  // Make remove function globally available
  useEffect(() => {
    window.removeMinimizedConversation = (conversationId) => {
      if (onRemoveConversation) {
        onRemoveConversation(conversationId);
      }
    };
    
    return () => {
      delete window.removeMinimizedConversation;
    };
  }, [onRemoveConversation]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userAvatars, setUserAvatars] = useState({});

  // Force close dropdown when private message window is closed
  useEffect(() => {
    if (forceClose) {
      setIsDropdownOpen(false);
    }
  }, [forceClose]);

  // Listen for user profile updates without constant re-renders
  useEffect(() => {
    if (!window.userProfilesCache) return;

    // Initial load of avatars
    const initialAvatars = {};
    minimizedConversations.forEach(conv => {
      const cachedUser = window.userProfilesCache.get(conv.otherUserId);
      initialAvatars[conv.otherUserId] = getAvatarUrl(conv.otherUserId, 
        cachedUser?.gender || conv.otherUser?.gender, 
        cachedUser?.photoURL || conv.otherUser?.photoURL);
    });
    setUserAvatars(initialAvatars);

    // Listen for profile updates
    const handleProfileUpdate = (event) => {
      const { userId, userData } = event.detail;
      if (minimizedConversations.some(conv => conv.otherUserId === userId)) {
        setUserAvatars(prev => ({
          ...prev,
          [userId]: getAvatarUrl(userId, userData.gender, userData.photoURL)
        }));
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, [minimizedConversations]);

  const getAvatarUrl = (uid, gender, photoURL) => {
    const cachedUser = window.userProfilesCache?.get(uid);
    const finalPhotoURL = cachedUser?.photoURL || photoURL;
    
    if (finalPhotoURL && finalPhotoURL.trim() !== '') {
      // Only add timestamp for cache busting when photo actually changes
      return finalPhotoURL;
    }
    
    // Default avatar based on gender
    const g = (cachedUser?.gender || gender)?.toLowerCase() === 'female' ? 'female' : 'male';
    return `https://api.dicebear.com/8.x/adventurer/svg?seed=${uid}&sex=${g}&backgroundColor=c0aede`;
  };

  const getBorderClass = (user) => {
    if (!user) return 'male-border';
    const gender = user.gender?.toLowerCase() === 'female' ? 'female-border' : 'male-border';
    if (user.role === 'owner') return `owner-border ${gender}`;
    if (user.role === 'admin') return `admin-border ${gender}`;
    if (user.role === 'moderator') return `moderator-border ${gender}`;
    if (user.role === 'badge_holder' || user.badge) return `badge-holder-border ${gender}`;
    return `user-border ${gender}`;
  };

  const totalMinimized = minimizedConversations.length;
  const totalUnread = Object.values(unreadCounts || {}).reduce((sum, count) => sum + count, 0);

  if (totalMinimized === 0) return null;

  return createPortal(
    <div className="minimized-conversations-container">
      {/* Dropdown with DPs only - appears above the button */}
      {isDropdownOpen && (
        <>
          <div 
            className="minimized-dropdown-backdrop" 
            onClick={() => setIsDropdownOpen(false)}
          />
          <div className="minimized-dropdown-dps">
            {minimizedConversations.map((conversation) => {
              const unreadCount = unreadCounts[conversation.conversationId] || unreadCounts[conversation.otherUserId] || 0;

              return (
                <div 
                  key={conversation.conversationId}
                  className={`minimized-dp-only ${getBorderClass(conversation.otherUser)}`}
                  onClick={() => {
                    onOpenConversation(conversation);
                    setIsDropdownOpen(false);
                    // Scroll to bottom when opening conversation
                    if (window.scrollToBottom) {
                      setTimeout(() => window.scrollToBottom(true), 100);
                    }
                  }}
                  title={conversation.otherUserName}
                >
                  <img 
                    key={conversation.otherUserId}
                    src={userAvatars[conversation.otherUserId] || getAvatarUrl(
                      conversation.otherUserId, 
                      conversation.otherUser?.gender, 
                      conversation.otherUser?.photoURL
                    )}
                    alt={conversation.otherUserName}
                    className="minimized-avatar-img"
                    onError={(e) => {
                      // Fallback to default avatar if image fails to load
                      const g = conversation.otherUser?.gender?.toLowerCase() === 'female' ? 'female' : 'male';
                      const fallbackUrl = `https://api.dicebear.com/8.x/adventurer/svg?seed=${conversation.otherUserId}&sex=${g}&backgroundColor=c0aede`;
                      if (e.target.src !== fallbackUrl) {
                        e.target.src = fallbackUrl;
                      }
                    }}
                  />
                  {unreadCount > 0 && (
                    <span className="minimized-dp-unread-indicator">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Trigger Button */}
      <div 
        className="minimized-trigger-btn"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="white"/>
        </svg>
        {totalMinimized > 0 && (
          <span className="minimized-count-badge">{totalMinimized}</span>
        )}
        {totalUnread > 0 && (
          <span className="minimized-unread-indicator"></span>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MinimizedConversations;