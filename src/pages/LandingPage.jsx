import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  // Function to increment user count on real registrations/guest logins
  const incrementUserCount = () => {
    const currentUsers = localStorage.getItem('currentActiveUsers');
    const newCount = currentUsers ? parseInt(currentUsers) + 1 : 556;
    localStorage.setItem('currentActiveUsers', newCount.toString());

    setRealTimeStats(prev => ({
      ...prev,
      activeUsers: newCount,
      onlineNow: Math.floor(newCount * 0.25)
    }));
  };

  // Listen for storage events to detect new users across tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'currentActiveUsers') {
        const newCount = parseInt(e.newValue) || 555;
        setRealTimeStats(prev => ({
          ...prev,
          activeUsers: newCount,
          onlineNow: Math.floor(newCount * 0.25)
        }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const [isVisible, setIsVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(0);

  // Real-time stats updater - only increments on actual user actions
  useEffect(() => {
    // Check if there are any new guest logins or registrations
    const checkForNewUsers = () => {
      // Only increment if there's actual activity, otherwise keep stable numbers
      const currentUsers = localStorage.getItem('currentActiveUsers');
      const storedUsers = currentUsers ? parseInt(currentUsers) : 555;

      // Only update if we detect real user activity (for now, keep stable)
      setRealTimeStats(prev => ({
        ...prev,
        activeUsers: storedUsers, // Keep stable at 555+
        totalRooms: 9, // Keep stable at 9
        onlineNow: Math.floor(storedUsers * 0.25) // About 25% of total users online
      }));
    };

    // Check every 30 seconds instead of 5 seconds for stability
    const interval = setInterval(checkForNewUsers, 30000);
    checkForNewUsers(); // Initial check

    return () => clearInterval(interval);
  }, []);

  const [realTimeStats, setRealTimeStats] = useState({
    activeUsers: 555,
    totalRooms: 9,
    onlineNow: 138
  });

  const mockUsers = [
    { 
      uid: "user1",
      name: "Riya Sharma", 
      avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=riya&sex=female", 
      gender: "female", 
      color: "#9C27B0", 
      role: "badge_holder", 
      badge: "premium" 
    },
    { 
      uid: "user2",
      name: "Arjun Singh", 
      avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=arjun&sex=male", 
      gender: "male", 
      color: "#FF69B4", 
      role: "badge_holder", 
      badge: "premium" 
    },
    { 
      uid: "user3",
      name: "Priya Gupta", 
      avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=priya&sex=female", 
      gender: "female", 
      color: "#E91E63", 
      role: "badge_holder", 
      badge: "premium" 
    },
    { 
      uid: "user4",
      name: "Rohan Mehta", 
      avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=rohan&sex=male", 
      gender: "male", 
      color: "#3F51B5", 
      role: "badge_holder", 
      badge: "premium" 
    },
    { 
      uid: "user5",
      name: "Neha Patel", 
      avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=neha&sex=female", 
      gender: "female", 
      color: "#FF5722", 
      role: "badge_holder", 
      badge: "premium" 
    }
  ];

  const getBorderClass = (user) => {
    const genderClass = user.gender?.toLowerCase() === 'female' ? 'female-border' : 'male-border';

    if (user.role === 'owner') return `owner-border ${genderClass}`;
    if (user.role === 'admin') return `admin-border ${genderClass}`;
    if (user.role === 'moderator') return `moderator-border ${genderClass}`;
    if (user.role === 'badge_holder' || user.badge) return `badge-holder-border ${genderClass}`;
    return `user-border ${genderClass}`;
  };

  const mockMessages = [
    "Hey everyone! 🌟",
    "Music suggestions please? 🎵",
    "What's your favorite food? 🍕",
    "Good morning friends! ☀️",
    "Anyone playing games today? 🎮"
  ];

  useEffect(() => {
    setIsVisible(true);

    // Simulate live chat activity
    const interval = setInterval(() => {
      setCurrentUser(prev => (prev + 1) % mockUsers.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // HomePage-style SVG Icons for enhanced chat preview
  const YouTubeIconCustom = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="youtube_premium_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF0000" />
                <stop offset="50%" stopColor="#DC143C" />
                <stop offset="100%" stopColor="#B22222" />
            </linearGradient>
            <filter id="youtube_premium_shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(220,20,60,0.6)"/>
            </filter>
        </defs>
        <rect x="1" y="6" width="22" height="12" rx="2" fill="url(#youtube_premium_gradient)" filter="url(#youtube_premium_shadow)" />
        <path d="M9.5 9L15.5 12L9.5 15V9Z" fill="white" />
        <circle cx="20" cy="8" r="2" fill="#FFD700" opacity="0.9" />
        <text x="20" y="9.5" textAnchor="middle" fontSize="3" fontWeight="bold" fill="#B22222">P</text>
    </svg>
  );

  const ImageUploadIconCustom = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px">
        <defs>
            <linearGradient id="linear-gradient" gradientUnits="userSpaceOnUse" x1="43.585" x2="67.615" y1="73.878" y2="49.848">
                <stop offset="0" stopColor="#e6dee9" />
                <stop offset="1" stopColor="#fdcbf1" />
            </linearGradient>
            <linearGradient id="New_Gradient_Swatch_9" gradientUnits="userSpaceOnUse" x1="5.016" x2="94.984" y1="50" y2="50">
                <stop offset="0" stopColor="#ba0089" />
                <stop offset="1" stopColor="#2e3192" />
            </linearGradient>
        </defs>
        <path d="M21,3A2,2 0 0,1 23,5V19A2,2 0 0,1 21,21H3A2,2 0 0,1 1,19V5A2,2 0 0,1 3,3H21M5,17L8.5,12.5L11,15.5L14.5,11L19,17H5Z" fill="url(#New_Gradient_Swatch_9)"/>
    </svg>
  );

  const AudioIconCustom = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="audioGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6c54a3" />
                <stop offset="100%" stopColor="#00b1d2" />
            </linearGradient>
        </defs>
        <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" fill="url(#audioGradient)"/>
    </svg>
  );

  // Premium SVG Icons
  const PremiumChatIcon = () => (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
      <defs>
        <linearGradient id="chatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="50%" stopColor="#764ba2" />
          <stop offset="100%" stopColor="#f093fb" />
        </linearGradient>
        <filter id="chatGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#667eea" floodOpacity="0.6"/>
        </filter>
      </defs>
      <rect x="2" y="4" width="20" height="14" rx="4" fill="url(#chatGradient)" filter="url(#chatGlow)" />
      <circle cx="8" cy="11" r="1.5" fill="white" opacity="0.9" />
      <circle cx="12" cy="11" r="1.5" fill="white" opacity="0.9" />
      <circle cx="16" cy="11" r="1.5" fill="white" opacity="0.9" />
      <path d="M6 18l3-2h11c2.2 0 4-1.8 4-4V6c0-2.2-1.8-4-4-4H4C1.8 2 0 3.8 0 6v6c0 2.2 1.8 4 4 4h2v2z" fill="url(#chatGradient)" opacity="0.3" />
    </svg>
  );

  const VoiceMessageIcon = () => (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
      <defs>
        <linearGradient id="voiceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b6b" />
          <stop offset="50%" stopColor="#ee5a52" />
          <stop offset="100%" stopColor="#ff8e53" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#voiceGradient)" />
      <path d="M12 2A3 3 0 0 1 15 5v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" fill="white" opacity="0.9" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );

  const VideoSharingIcon = () => (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
      <defs>
        <linearGradient id="videoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff0000" />
          <stop offset="50%" stopColor="#dc143c" />
          <stop offset="100%" stopColor="#b22222" />
        </linearGradient>
      </defs>
      <rect x="2" y="6" width="20" height="12" rx="2" fill="url(#videoGradient)" />
      <path d="M9 9l6 3-6 3V9z" fill="white" />
      <circle cx="19" cy="7" r="2" fill="#ffd700" />
      <text x="19" y="8.5" textAnchor="middle" fontSize="3" fontWeight="bold" fill="#b22222">YT</text>
    </svg>
  );

  const PrivateMessagingIcon = () => (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
      <defs>
        <linearGradient id="privateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="url(#privateGradient)" />
      <circle cx="9" cy="9" r="1.5" fill="white" />
      <circle cx="15" cy="9" r="1.5" fill="white" />
      <path d="M12 2l-2 2h4l-2-2z" fill="#ffd700" />
      <rect x="10" y="12" width="4" height="1" rx="0.5" fill="white" opacity="0.8" />
      <rect x="8" y="14" width="8" height="1" rx="0.5" fill="white" opacity="0.6" />
    </svg>
  );

  const GenderFilterIcon = () => (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
      <defs>
        <linearGradient id="genderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="8" cy="8" r="6" fill="url(#genderGradient)" opacity="0.8" />
      <circle cx="16" cy="16" r="6" fill="url(#genderGradient)" opacity="0.8" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="url(#genderGradient)" strokeWidth="2" strokeLinecap="round" />
      <text x="8" y="10" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white">♂</text>
      <text x="16" y="18" textAnchor="middle" fontSize="6" fontWeight="bold" fill="white">♀</text>
    </svg>
  );

  const AdminModerationIcon = () => (
    <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
      <defs>
        <linearGradient id="adminGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="50%" stopColor="#ffed4a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path d="M12 1l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 1z" fill="url(#adminGradient)" />
      <circle cx="12" cy="11" r="3" fill="white" opacity="0.9" />
      <path d="M10 10h4v2h-4z" fill="url(#adminGradient)" />
      <circle cx="12" cy="11" r="1" fill="url(#adminGradient)" />
    </svg>
  );

  return (
    <div className="landing-page" style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 50%, #E6E6FA 100%)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Premium Header */}
      <header className="luxury-header">
        <div className="header-content">
          <div className="header-brand">
            <div className="brand-logo">
              <img 
                src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" 
                alt="TingleTap" 
                className="logo-image"
              />
            </div>
            <div className="brand-text">
              <span className="brand-name">TingleTap</span>
              <span className="brand-tagline">Premium Chat Experience</span>
            </div>
          </div>

          <nav className="header-nav">
            <button 
              className="nav-btn login-btn"
              onClick={() => navigate('/login')}
            >
              <span>Sign In</span>
              <div className="btn-glow"></div>
            </button>
            <button 
              className="nav-btn signup-btn"
              onClick={() => {
                incrementUserCount();
                navigate('/signup');
              }}
            >
              <span>Get Started</span>
              <div className="btn-glow"></div>
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section with Live Chat Preview */}
      <section className="luxury-hero">
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="hero-container">
          <div className="hero-left">
            <div className={`hero-content ${isVisible ? 'animate-in' : ''}`}>
              <div className="premium-badge">
                <span>✨ India's Premium Chat Platform</span>
              </div>

              <h1 className="hero-title">
                Connect with India's
                <span className="gradient-text"> Most Vibrant </span>
                Chat Community
              </h1>

              <p className="hero-description">
                Experience real-time conversations with advanced features like voice messages, YouTube video sharing, private messaging, gender filters, and premium customization options. Join thousands of users across India in our beautifully designed chat rooms.
              </p>

              <div className="hero-actions">
                <button 
                  className="primary-cta"
                  onClick={() => {
                    incrementUserCount();
                    navigate('/rooms');
                  }}
                >
                  <span className="cta-text">Start Chatting Now</span>
                  <div className="cta-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="cta-shimmer"></div>
                </button>

                <button className="secondary-cta" onClick={() => {
                  incrementUserCount();
                  navigate('/signup');
                }}>
                  <span>Create Free Account</span>
                </button>
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="chat-preview-container">
              <div className="preview-glow"></div>

              <div className="chat-preview">
                <div className="chat-header">
                  <div className="chat-header-left">
                    <button className="settings-btn-preview">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                      </svg>
                    </button>
                    <div className="room-info-preview">
                      <span className="room-name-preview">Indian Chat</span>
                      <span className="room-count-preview">(1)</span>
                    </div>
                  </div>
                  <div className="chat-header-right">
                    <button className="header-action-btn" title="Private Messages">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4C22,2.89 21.1,2 20,2Z"/>
                      </svg>
                    </button>
                    <button className="header-action-btn" title="Friend Requests">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
                      </svg>
                    </button>
                    <button className="header-action-btn" title="Menu Options">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="chat-messages">
                    {/* First message - Riya Sharma */}
                    <div className="message-row-wrapper" style={{background: "#ffffff"}}>
                        <div className="message-row">
                            <div className="avatar-wrapper badge-holder-border female-border">
                                <img 
                                    src="https://api.dicebear.com/8.x/adventurer/svg?seed=riya&sex=female" 
                                    alt="Riya Sharma" 
                                    className="message-avatar"
                                />
                                <div className="gender-badge-container">
                                    <span className="gender-badge">♀</span>
                                </div>
                                <div className="user-badge">👑</div>
                            </div>
                            <div className="message-content-container">
                                <div className="message-header-row">
                                    <div className="user-info">
                                        <span className="message-displayname" style={{color: "#9C27B0", fontWeight: "700", fontSize: "12px"}}>
                                            Riya Sharma
                                        </span>
                                        <span className="inline-badge">👑</span>
                                    </div>
                                </div>
                                <div className="message-body">
                                    <p className="message-text" style={{color: "#9C27B0", fontSize: "13px"}}>Hey everyone! 🌟</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Second message - Arjun Singh */}
                    <div className="message-row-wrapper" style={{background: "hsl(270, 85%, 96%)"}}>
                        <div className="message-row">
                            <div className="avatar-wrapper badge-holder-border male-border">
                                <img 
                                    src="https://api.dicebear.com/8.x/adventurer/svg?seed=arjun&sex=male" 
                                    alt="Arjun Singh" 
                                    className="message-avatar"
                                />
                                <div className="gender-badge-container">
                                    <span className="gender-badge">♂</span>
                                </div>
                                <div className="user-badge">👑</div>
                            </div>
                            <div className="message-content-container">
                                <div className="message-header-row">
                                    <div className="user-info">
                                        <span className="message-displayname" style={{color: "#FF69B4", fontWeight: "700", fontSize: "12px"}}>
                                            Arjun Singh
                                        </span>
                                        <span className="inline-badge">👑</span>
                                    </div>
                                </div>
                                <div className="message-body">
                                    <p className="message-text" style={{color: "#FF69B4", fontSize: "13px"}}>Music suggestions please? 🎵</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Third message - Priya Gupta */}
                    <div className="message-row-wrapper" style={{background: "#ffffff"}}>
                        <div className="message-row">
                            <div className="avatar-wrapper badge-holder-border female-border">
                                <img 
                                    src="https://api.dicebear.com/8.x/adventurer/svg?seed=priya&sex=female" 
                                    alt="Priya Gupta" 
                                    className="message-avatar"
                                />
                                <div className="gender-badge-container">
                                    <span className="gender-badge">♀</span>
                                </div>
                                <div className="user-badge">👑</div>
                            </div>
                            <div className="message-content-container">
                                <div className="message-header-row">
                                    <div className="user-info">
                                        <span className="message-displayname" style={{color: "#E91E63", fontWeight: "700", fontSize: "12px"}}>
                                            Priya Gupta
                                        </span>
                                        <span className="inline-badge">👑</span>
                                    </div>
                                </div>
                                <div className="message-body">
                                    <p className="message-text" style={{color: "#E91E63", fontSize: "13px"}}>What's your favorite food? 🍕</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fourth message - Rohan Mehta */}
                    <div className="message-row-wrapper" style={{background: "hsl(270, 85%, 96%)"}}>
                        <div className="message-row">
                            <div className="avatar-wrapper badge-holder-border male-border">
                                <img 
                                    src="https://api.dicebear.com/8.x/adventurer/svg?seed=rohan&sex=male" 
                                    alt="Rohan Mehta" 
                                    className="message-avatar"
                                />
                                <div className="gender-badge-container">
                                    <span className="gender-badge">♂</span>
                                </div>
                                <div className="user-badge">👑</div>
                            </div>
                            <div className="message-content-container">
                                <div className="message-header-row">
                                    <div className="user-info">
                                        <span className="message-displayname" style={{color: "#3F51B5", fontWeight: "700", fontSize: "12px"}}>
                                            Rohan Mehta
                                        </span>
                                        <span className="inline-badge">👑</span>
                                    </div>
                                </div>
                                <div className="message-body">
                                    <p className="message-text" style={{color: "#3F51B5", fontSize: "13px"}}>Good morning friends! ☀️</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fifth message - Neha Patel */}
                    <div className="message-row-wrapper" style={{background: "#ffffff"}}>
                        <div className="message-row">
                            <div className="avatar-wrapper badge-holder-border female-border">
                                <img 
                                    src="https://api.dicebear.com/8.x/adventurer/svg?seed=neha&sex=female" 
                                    alt="Neha Patel" 
                                    className="message-avatar"
                                />
                                <div className="gender-badge-container">
                                    <span className="gender-badge">♀</span>
                                </div>
                                <div className="user-badge">👑</div>
                            </div>
                            <div className="message-content-container">
                                <div className="message-header-row">
                                    <div className="user-info">
                                        <span className="message-displayname" style={{color: "#FF5722", fontWeight: "700", fontSize: "12px"}}>
                                            Neha Patel
                                        </span>
                                        <span className="inline-badge">👑</span>
                                    </div>
                                </div>
                                <div className="message-body">
                                    <p className="message-text" style={{color: "#FF5722", fontSize: "13px"}}>Anyone playing games today? 🎮</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="chat-input">
                  <div className="input-container-preview">
                    <button className="attachment-btn-preview" title="Attachments">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="attach_gradient_preview" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#7c3aed" />
                          </linearGradient>
                        </defs>
                        <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" fill="url(#attach_gradient_preview)" stroke="url(#attach_gradient_preview)" strokeWidth="0.5"/>
                      </svg>
                    </button>
                    <div className="input-field-preview">
                      <span className="input-placeholder-preview">Type your message here...</span>
                    </div>
                    <button className="send-button-preview">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" fill="#10b981"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features Section */}
      <section className="luxury-features">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">Experience TingleTap's Premium Features</h2>
            <p className="section-subtitle">Discover what makes TingleTap India's most advanced chat platform</p>
          </div>

          <div className="features-grid">
            <div className="feature-card premium">
              <div className="feature-icon">
                <PremiumChatIcon />
              </div>
              <h3>Real-Time Chat Rooms</h3>
              <p>Join 8+ themed chat rooms including Indian Chat, International Chat, Gaming Zone, Music Lounge, and exclusive Staff Rooms for moderators</p>
              <div className="feature-tags">
                <span className="tag">Live Messaging</span>
                <span className="tag">Auto-Scroll</span>
                <span className="tag">Message Styling</span>
              </div>
            </div>

            <div className="feature-card premium">
              <div className="feature-icon">
                <VoiceMessageIcon />
              </div>
              <h3>Voice & Media Sharing</h3>
              <p>Send voice messages, share images via IMGBB, record audio directly in chat, and share YouTube videos with real-time embedding</p>
              <div className="feature-tags">
                <span className="tag">Voice Recording</span>
                <span className="tag">Image Upload</span>
                <span className="tag">YouTube Integration</span>
              </div>
            </div>

            <div className="feature-card premium">
              <div className="feature-icon">
                <PrivateMessagingIcon />
              </div>
              <h3>Private Messaging System</h3>
              <p>1-on-1 private conversations with file sharing, voice messages, and conversation management. Draggable chat windows for seamless multitasking</p>
              <div className="feature-tags">
                <span className="tag">End-to-End Privacy</span>
                <span className="tag">File Sharing</span>
                <span className="tag">Conversation History</span>
              </div>
            </div>

            <div className="feature-card premium">
              <div className="feature-icon">
                <GenderFilterIcon />
              </div>
              <h3>Advanced User Features</h3>
              <p>Gender-based filtering, friend requests system, user blocking, whisper messages, and comprehensive user profiles with status customization</p>
              <div className="feature-tags">
                <span className="tag">Gender Filters</span>
                <span className="tag">Friends System</span>
                <span className="tag">User Blocking</span>
              </div>
            </div>

            <div className="feature-card premium">
              <div className="feature-icon">
                <AdminModerationIcon />
              </div>
              <h3>Premium Customization</h3>
              <p>Badge holders and premium users get access to advanced text styling, gradient effects, animations, and exclusive username customization options</p>
              <div className="feature-tags">
                <span className="tag premium-tag">Premium Only</span>
                <span className="tag">Text Styling</span>
                <span className="tag">Animations</span>
              </div>
            </div>

            <div className="feature-card premium">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
                  <defs>
                    <linearGradient id="securityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="url(#securityGradient)" />
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Security & Moderation</h3>
              <p>VPN detection, automated moderation, kick/ban/mute systems, real-time monitoring, and comprehensive reporting features for safe chatting</p>
              <div className="feature-tags">
                <span className="tag">VPN Detection</span>
                <span className="tag">Auto Moderation</span>
                <span className="tag">Report System</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Tiers Section */}
      <section className="user-tiers-section">
        <div className="tiers-container">
          <div className="section-header">
            <h2 className="section-title">Choose Your Experience</h2>
            <p className="section-subtitle">From free users to premium badge holders - find your perfect tier</p>
          </div>

          <div className="tiers-grid">
            <div className="tier-card basic">
              <div className="tier-header">
                <h3>Free User</h3>
                <div className="tier-price">₹0</div>
              </div>
              <div className="tier-features">
                <div className="feature-item">✅ Access to all public chat rooms</div>
                <div className="feature-item">✅ Basic text messaging</div>
                <div className="feature-item">✅ Voice message sending</div>
                <div className="feature-item">✅ Image & YouTube sharing</div>
                <div className="feature-item">✅ Private messaging</div>
                <div className="feature-item">✅ Friend requests</div>
                <div className="feature-item">❌ Advanced text styling</div>
                <div className="feature-item">❌ Username customization</div>
                <div className="feature-item">❌ Status styling</div>
              </div>
            </div>

            <div className="tier-card premium featured">
              <div className="tier-badge">Most Popular</div>
              <div className="tier-header">
                <h3>Badge Holder</h3>
                <div className="tier-price">Premium</div>
              </div>
              <div className="tier-features">
                <div className="feature-item">✅ Everything in Free User</div>
                <div className="feature-item">✅ Advanced username styling</div>
                <div className="feature-item">✅ Gradient text effects</div>
                <div className="feature-item">✅ Text animations</div>
                <div className="feature-item">✅ Custom status styling</div>
                <div className="feature-item">✅ Premium badges display</div>
                <div className="feature-item">✅ Enhanced profile customization</div>
                <div className="feature-item">✅ Priority support</div>
                <div className="feature-item">✅ Exclusive features access</div>
              </div>
            </div>

            <div className="tier-card staff">
              <div className="tier-header">
                <h3>Staff Access</h3>
                <div className="tier-price">Invite Only</div>
              </div>
              <div className="tier-features">
                <div className="feature-item">✅ Everything in Badge Holder</div>
                <div className="feature-item">✅ Staff room access</div>
                <div className="feature-item">✅ User moderation tools</div>
                <div className="feature-item">✅ Kick/Ban/Mute powers</div>
                <div className="feature-item">✅ Advanced reporting</div>
                <div className="feature-item">✅ Real-time monitoring</div>
                <div className="feature-item">✅ Admin panel access</div>
                <div className="feature-item">✅ Special role badges</div>
                <div className="feature-item">✅ Priority in all features</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="luxury-cta">
        <div className="cta-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Join India's Best Chat Community?</h2>
            <p className="cta-subtitle">Start your journey with thousands of users across India in our premium chat platform</p>

            <div className="cta-actions">
              <button 
                className="primary-cta-large"
                onClick={() => {
                  incrementUserCount();
                  navigate('/rooms');
                }}
              >
                <span>Join TingleTap Now</span>
                <div className="cta-shimmer"></div>
              </button>
              <button 
                className="secondary-cta-large"
                onClick={() => {
                  incrementUserCount();
                  navigate('/signup');
                }}
              >
                <span>Create Free Account</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Ultra Rich Footer */}
      <footer className="luxury-footer">
        <div className="footer-background">
          <div className="footer-orb footer-orb-1"></div>
          <div className="footer-orb footer-orb-2"></div>
          <div className="footer-orb footer-orb-3"></div>
        </div>

        <div className="footer-content">
          <div className="footer-main">
            <div className="footer-brand-section">
              <div className="footer-brand">
                <img 
                  src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" 
                  alt="TingleTap" 
                  className="footer-logo"
                />
                <div className="footer-brand-text">
                  <h3>TingleTap</h3>
                  <p>India's Premium Chat Experience</p>
                </div>
              </div>
              <p className="footer-description">
                Connect with thousands of users across India in our beautifully designed chat platform. Experience real-time conversations with advanced features and premium customization options.
              </p>
              <div className="footer-stats">
                <div className="footer-stat">
                  <span className="stat-number">{realTimeStats.activeUsers.toLocaleString()}+</span>
                  <span className="stat-label">Active Users</span>
                </div>
                <div className="footer-stat">
                  <span className="stat-number">{realTimeStats.totalRooms}+</span>
                  <span className="stat-label">Chat Rooms</span>
                </div>
                <div className="footer-stat">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Support</span>
                </div>
              </div>
            </div>

            <div className="footer-links-section">
              <div className="footer-column">
                <h4>Chat Features</h4>
                <ul>
                  <li><button onClick={() => navigate('/rooms')}>Public Chat Rooms</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Private Messaging</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Voice Messages</button></li>
                  <li><button onClick={() => navigate('/rooms')}>YouTube Sharing</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Image Upload</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Gender Filters</button></li>
                </ul>
              </div>

              <div className="footer-column">
                <h4>Premium Features</h4>
                <ul>
                  <li><button onClick={() => navigate('/signup')}>Advanced Text Styling</button></li>
                  <li><button onClick={() => navigate('/signup')}>Username Customization</button></li>
                  <li><button onClick={() => navigate('/signup')}>Gradient Effects</button></li>
                  <li><button onClick={() => navigate('/signup')}>Text Animations</button></li>
                  <li><button onClick={() => navigate('/signup')}>Premium Badges</button></li>
                  <li><button onClick={() => navigate('/signup')}>Status Styling</button></li>
                </ul>
              </div>

              <div className="footer-column">
                <h4>Chat Rooms</h4>
                <ul>
                  <li><button onClick={() => navigate('/rooms')}>Indian Chat</button></li>
                  <li><button onClick={() => navigate('/rooms')}>International Chat</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Gaming Zone</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Music Lounge</button></li>
                  <li><button onClick={() => navigate('/rooms')}>General Discussion</button></li>
                  <li><button onClick={() => navigate('/rooms')}>Staff Room</button></li>
                </ul>
              </div>

              <div className="footer-column">
                <h4>Support & Legal</h4>
                <ul>
                  <li><button onClick={() => navigate('/about')}>About TingleTap</button></li>
                  <li><button onClick={() => navigate('/contact')}>Contact Support</button></li>
                  <li><button onClick={() => navigate('/faq')}>FAQ & Help</button></li>
                  <li><button onClick={() => navigate('/privacy')}>Privacy Policy</button></li>
                  <li><button onClick={() => navigate('/terms')}>Terms of Service</button></li>
                  <li><button onClick={() => navigate('/disclaimer')}>Disclaimer</button></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-bottom-content">
              <div className="footer-copyright">
                <div className="copyright-diamond">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#diamondGradient1)" stroke="#ffffff" strokeWidth="1"/>
                    <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="url(#diamondGradient2)" stroke="#ffffff" strokeWidth="1"/>
                    <defs>
                      <linearGradient id="diamondGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                      </linearGradient>
                      <linearGradient id="diamondGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f093fb" />
                        <stop offset="100%" stopColor="#f5576c" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <p className="copyright-text">
                  <span className="copyright-year">© 2024</span>
                  <span className="copyright-brand">TingleTap™</span>
                </p>
                <p className="copyright-subtext">
                  All rights reserved • Developed by Adrashtra Inc.
                </p>
              </div>

              <div className="footer-actions">
                <button 
                  className="footer-cta-btn"
                  onClick={() => {
                    incrementUserCount();
                    navigate('/signup');
                  }}
                >
                  Join Now - It's Free!
                </button>
                <button 
                  className="footer-login-btn"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;