import React, { useState, useEffect } from 'react';
import './TingleBot.css';

const TingleBotMessage = ({ message, onDelete, currentUser }) => {
  const [timeLeft, setTimeLeft] = useState(5); // Start with 5 seconds
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  
  // Browser compatibility detection
  const [browserInfo] = useState(() => {
    const ua = navigator.userAgent.toLowerCase();
    return {
      isChrome: ua.includes('chrome') && !ua.includes('edge'),
      isFirefox: ua.includes('firefox'),
      isSafari: ua.includes('safari') && !ua.includes('chrome'),
      isEdge: ua.includes('edge'),
      isReplit: ua.includes('replit') || window.location.hostname.includes('replit'),
      supportsPerfNow: typeof performance !== 'undefined' && performance.now,
      supportsRAF: typeof requestAnimationFrame !== 'undefined'
    };
  });

  // Check if message should be visible to current user
  const shouldShowMessage = () => {
    // If no current user, don't show any messages
    if (!currentUser || !currentUser.uid) {
      console.log('🔍 TingleBot: No current user, hiding message');
      return false;
    }

    // WELCOME MESSAGES: Show ONLY to target user (PRIVATE)
    if (message.type?.includes('welcome')) {
      const isTargetUser = message.targetUserId === currentUser.uid;
      // Welcome message privacy check
      
      if (isTargetUser) {
        // Showing private welcome message to target user
      } else {
        // Hiding welcome message from non-target user
      }
      
      return isTargetUser;
    }
    
    // For moderation and other system messages, show to all users
    if (message.type?.includes('moderation') || 
        message.type?.includes('system') || 
        message.type?.includes('announcement') ||
        message.publicMessage || 
        message.visibleToAllUsers) {
      return true;
    }
    
    // AI responses show to all users
    if (message.type?.includes('ai') || message.aiResponse) {
      return true;
    }
    
    // Default: show message
    return true;
  };

  useEffect(() => {
    if (!message.autoDelete) return;

    // ULTRA-COMPACT 5 SECONDS - NO TIMER DISPLAY
    const deleteDelay = 5000; // Always 5 seconds
    
    // No timer display - just auto delete after 5 seconds
    const deleteTimeout = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onDelete) {
          onDelete(message.id);
        }
      }, 300);
    }, deleteDelay);

    return () => {
      clearTimeout(deleteTimeout);
    };
  }, [message, onDelete]);

  if (!isVisible || !shouldShowMessage()) return null;

  // Ultra-luxury TingleBot profile
  const botProfile = {
    uid: 'tinglebot_system_official_2024',
    displayName: '✨ TingleBot Premium',
    photoURL: 'https://api.dicebear.com/8.x/bottts-neutral/svg?seed=luxurybot&backgroundColor=ffd700&eyes=hearts&mouth=smile01&primaryColor=9333ea&secondaryColor=ec4899&sidesColor=f59e0b&textureColor=a855f7&topColor=06b6d4&face=round',
    verified: true,
    isBot: true,
    systemBot: true,
    role: 'system_bot'
  };

  const getMessageClass = () => {
    let baseClass = 'tinglebot-message-container';
    if (message.type) {
      if (message.type.includes('welcome')) {
        baseClass += ' welcome-type';
        // Add role-specific classes for special styling
        if (message.type.includes('owner')) baseClass += ' owner-welcome';
        if (message.type.includes('admin')) baseClass += ' admin-welcome';
        if (message.type.includes('moderator')) baseClass += ' moderator-welcome';
        if (message.welcomeClass) baseClass += ` ${message.welcomeClass}`;
      }
      if (message.type.includes('moderation')) baseClass += ' moderation-type';
      if (message.type.includes('system')) baseClass += ' system-type';
      if (message.type.includes('announcement')) baseClass += ' announcement-type';
    }
    return baseClass;
  };

  const formatTimeLeft = (seconds) => {
    // Always show simple countdown: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1
    return `${seconds}s`;
  };

  const getBotBadge = () => {
    if (message.type?.includes('moderation')) return (
      <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff'}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"/>
        </svg>
        GUARDIAN
      </span>
    );
    if (message.type?.includes('welcome')) return (
      <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff'}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M5,9V21H1V9H5M9,21A2,2 0 0,1 7,19V9C7,8.45 7.22,7.95 7.59,7.59L14.17,1L15.23,2.06C15.5,2.33 15.67,2.7 15.67,3.11L15.64,3.43L14.69,8H21C21.83,8 22.54,8.5 22.84,9.22C23.03,9.53 23.03,9.97 22.84,10.28L19.84,17.28C19.54,18 18.83,18.5 18,18.5H9.83L16,12.34V12.34C16.17,12.17 16.17,11.83 16,11.66C15.83,11.5 15.5,11.5 15.33,11.66L9.17,17.83C9.06,17.94 9,18.08 9,18.23V19A2,2 0 0,1 9,21Z"/>
        </svg>
        GREETER
      </span>
    );
    if (message.type?.includes('system')) return (
      <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff'}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.22,15.05 2.27,14.78 2.46,14.63L4.57,12.97C4.53,12.65 4.5,12.33 4.5,12C4.5,11.67 4.53,11.34 4.57,11L2.46,9.37C2.27,9.22 2.22,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.78,8.95 21.73,9.22 21.54,9.37L19.43,11C19.47,11.34 19.5,11.67 19.5,12C19.5,12.33 19.47,12.65 19.43,12.97L21.54,14.63C21.73,14.78 21.78,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.03 19.05,18.95L16.56,17.94C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10Z"/>
        </svg>
        SYSTEM
      </span>
    );
    if (message.type?.includes('announcement')) return (
      <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff'}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12,8H4A2,2 0 0,0 2,10V14A2,2 0 0,0 4,16H5V20A1,1 0 0,0 6,21H8A1,1 0 0,0 9,20V16H12L17,20V4L12,8M21.5,12C21.5,13.71 20.54,15.26 19,16V8C20.53,8.75 21.5,10.3 21.5,12Z"/>
        </svg>
        HERALD
      </span>
    );
    return (
      <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff'}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
        </svg>
        AI ASSISTANT
      </span>
    );
  };

  const getPriorityIcon = () => {
    // Special icon for AI responses
    if (message.type?.includes('ai_response')) return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#10b981">
        <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
      </svg>
    );

    switch (message.priority) {
      case 'critical': return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#ef4444">
          <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
        </svg>
      );
      case 'high': return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b">
          <path d="M7,2V4H8V18A4,4 0 0,0 12,22A4,4 0 0,0 16,18V4H17V2H7M11,16V18A1,1 0 0,0 12,19A1,1 0 0,0 13,18V16H11Z"/>
        </svg>
      );
      case 'system': return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#06b6d4">
          <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
        </svg>
      );
      default: return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#667eea">
          <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z"/>
        </svg>
      );
    }
  };

  // Extract actual username from message content for moderation messages
  const extractUsernameFromMessage = (text) => {
    if (!text) return 'Unknown User';

    // Handle different moderation message formats
    const patterns = [
      /USER BANNED \| (.+?) has been/,
      /USER KICKED \| (.+?) has been/,
      /USER MUTED \| (.+?) has been/,
      /USER WARNED \| (.+?) received/,
      /USER UNMUTED \| (.+?) can now/,
      /USER TIMEOUT \| (.+?) has been/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return 'System User';
  };

  // Get compact moderation message with SVG icons
  const getCompactModerationMessage = () => {
    if (!message.type?.includes('moderation') || !message.text) return null;

    const username = extractUsernameFromMessage(message.text);
    const text = message.text.toLowerCase();

    if (text.includes('banned')) {
      return (
        <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
          </svg>
          {username} is Banned
        </span>
      );
    } else if (text.includes('kicked')) {
      return (
        <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M8,7L16,15L14.5,16.5L6.5,8.5L8,7Z"/>
          </svg>
          {username} is Kicked
        </span>
      );
    } else if (text.includes('muted') && !text.includes('unmuted')) {
      return (
        <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M3,9H7L12,4V20L7,15H3V9M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12Z"/>
          </svg>
          {username} is Muted
        </span>
      );
    } else if (text.includes('unmuted')) {
      return (
        <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12Z"/>
          </svg>
          {username} is Unmuted
        </span>
      );
    } else if (text.includes('timeout')) {
      return (
        <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M15,1H9V3H15V1M11,14H13V8H11M19.03,7.39L20.45,5.97C20,5.46 19.55,5 19.04,4.56L17.62,6C16.07,4.74 14.12,4 12,4A9,9 0 0,0 3,13A9,9 0 0,0 12,22C17,22 21,17.97 21,13C21,10.88 20.26,8.93 19.03,7.39Z"/>
          </svg>
          {username} is Timed Out
        </span>
      );
    } else if (text.includes('warned')) {
      return (
        <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
            <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
          </svg>
          {username} is Warned
        </span>
      );
    }

    return (
      <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
          <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
        </svg>
        {username} - Moderation Action
      </span>
    );
  };

  const getDisplayedUsername = () => {
    if (message.type?.includes('moderation') && message.text) {
      return extractUsernameFromMessage(message.text);
    }
    return message.targetUser || 'Community Member';
  };

  return (
    <div 
      className={`tinglebot-message-wrapper ${!isVisible ? 'fade-out' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-message-id={message.id}
      data-user-id={botProfile.uid}
      data-message-uid={botProfile.uid}
      data-sender-role="system_bot"
      data-sender-badge="true"
      data-sender-gender="bot"
      data-sender-is-bot="true"
    >
      <div className="message-row">
        <div className="tinglebot-avatar-section">
          <div className="tinglebot-avatar-container">
            <img 
              src={botProfile.photoURL} 
              alt="TingleBot AI Guardian"
              className="tinglebot-avatar message-avatar"
              onError={(e) => {
                e.target.src = 'https://api.dicebear.com/8.x/bottts/svg?seed=backup&backgroundColor=667eea&primaryColor=ff6b9d';
              }}
            />
            <div className="tinglebot-status-indicator">
              <div className="status-pulse"></div>
            </div>
          </div>
        </div>

        <div className="tinglebot-content-section">
          <div className="tinglebot-header">
            <div className="tinglebot-identity">
              <span 
                className="tinglebot-displayname message-displayname"
                data-user-id={botProfile.uid}
                data-user-uid={botProfile.uid}
                data-username={botProfile.displayName}
                data-role="system_bot"
                data-badge="true"
                data-gender="bot"
                data-is-bot="true"
                style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontFamily: 'Inter, SF Pro Display, system-ui, -apple-system, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="url(#botGradient)">
                  <defs>
                    <linearGradient id="botGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#667eea"/>
                      <stop offset="100%" stopColor="#764ba2"/>
                    </linearGradient>
                  </defs>
                  <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
                </svg>
                {botProfile.displayName}
                <svg className="tinglebot-verified" width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" style={{ marginLeft: '6px' }}>
                  <path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.46,13.97L5.82,21L12,17.27Z"/>
                </svg>
              </span>
              <div className="tinglebot-badge-container">
                <span className="tinglebot-role-badge">{getBotBadge()}</span>
                <span className="tinglebot-version">v3.0</span>
              </div>
            </div>

            <div className="tinglebot-meta">
              <div className="tinglebot-priority">
                {getPriorityIcon()}
              </div>
              <span className="tinglebot-timestamp">
                {message.createdAt?.toDate ? 
                  message.createdAt.toDate().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  }) : 
                  new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })
                }
              </span>
            </div>
          </div>

          <div className="tinglebot-message-body">
            <div className={getMessageClass()}>
              {message.title && !message.type?.includes('moderation') && (
                <div className="tinglebot-message-title">
                  <span className="title-icon">{getPriorityIcon()}</span>
                  {message.title}
                </div>
              )}

              <div className="tinglebot-message-content">
                {/* Show compact moderation message for moderation actions */}
                {message.type?.includes('moderation') ? (
                  <div className="compact-moderation-message">
                    {getCompactModerationMessage()}
                  </div>
                ) : (
                  message.text
                )}
              </div>

              {(message.type?.includes('welcome') || message.type?.includes('system')) && (
                <div className="tinglebot-footer">
                  <span className="footer-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                    </svg>
                    This is an automated security message from TingleBot AI Guardian System
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TingleBotMessage;