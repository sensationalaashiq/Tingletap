import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import './BanKickModal.css';

// SVG Icons Components
const BanIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" fill="rgba(239, 68, 68, 0.2)"/>
    <path d="m4.93 4.93 14.14 14.14" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 8v4" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="7" r="4" stroke="#60a5fa" strokeWidth="2"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#10b981" strokeWidth="2"/>
    <line x1="16" y1="2" x2="16" y2="6" stroke="#10b981" strokeWidth="2"/>
    <line x1="8" y1="2" x2="8" y2="6" stroke="#10b981" strokeWidth="2"/>
    <line x1="3" y1="10" x2="21" y2="10" stroke="#10b981" strokeWidth="2"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2"/>
    <polyline points="12,6 12,12 16,14" stroke="#f59e0b" strokeWidth="2"/>
  </svg>
);

const IdIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke="#8b5cf6" strokeWidth="2"/>
    <line x1="7" y1="9" x2="17" y2="9" stroke="#8b5cf6" strokeWidth="2"/>
    <line x1="7" y1="13" x2="13" y2="13" stroke="#8b5cf6" strokeWidth="2"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#06b6d4" strokeWidth="2"/>
    <polyline points="22,6 12,13 2,6" stroke="#06b6d4" strokeWidth="2"/>
  </svg>
);

const ExitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="#94a3b8" strokeWidth="2"/>
    <polyline points="16,17 21,12 16,7" stroke="#94a3b8" strokeWidth="2"/>
    <line x1="21" y1="12" x2="9" y2="12" stroke="#94a3b8" strokeWidth="2"/>
  </svg>
);

const KickIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M15 6h-1V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1H9a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1zm-3 11a1 1 0 0 1-1-1 1 1 0 0 1 1-1 1 1 0 0 1 1 1 1 1 0 0 1-1 1zm0-13a1 1 0 0 1 1 1v1h-2V5a1 1 0 0 1 1-1z" fill="#f59e0b"/>
    <circle cx="12" cy="12" r="11" stroke="#f59e0b" strokeWidth="1" fill="rgba(245, 158, 11, 0.1)"/>
  </svg>
);

const RoomIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#f59e0b" strokeWidth="2"/>
    <polyline points="9,22 9,12 15,12 15,22" stroke="#f59e0b" strokeWidth="2"/>
  </svg>
);

const SupportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#06b6d4" strokeWidth="2"/>
    <path d="M8 12l4 4 4-4" stroke="#06b6d4" strokeWidth="2"/>
  </svg>
);

const BanKickModal = ({ isVisible, onClose, banInfo: passedBanInfo, kickInfo: passedKickInfo }) => {
  const [banInfo, setBanInfo] = useState(null);
  const [kickInfo, setKickInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [currentRoomName, setCurrentRoomName] = useState('Unknown Room');

  // Get current room name from URL or storage
  useEffect(() => {
    const getRoomName = async () => {
      // Try to get room name from URL first
      const currentRoomId = window.location.pathname.split('/room/')[1];

      // Also try localStorage/sessionStorage for room info
      const storedRoomName = localStorage.getItem('currentRoomName') || 
                            sessionStorage.getItem('currentRoomName');

      if (storedRoomName) {
        setCurrentRoomName(storedRoomName);
      }

      if (currentRoomId) {
        try {
          const roomDoc = await getDoc(doc(db, 'rooms', currentRoomId));
          if (roomDoc.exists()) {
            const roomName = roomDoc.data().name || 'Chat Room';
            setCurrentRoomName(roomName);
            // Store for future use
            localStorage.setItem('currentRoomName', roomName);
          }
        } catch (error) {
          console.error("Error fetching room name:", error);
          // Fallback to stored name or default
          if (!storedRoomName) {
            setCurrentRoomName('Chat Room');
          }
        }
      } else if (!storedRoomName) {
        // If no room ID in URL and no stored name, use default
        setCurrentRoomName('Chat Room');
      }
    };
    getRoomName();
  }, []);

  // Force modal to show when isVisible becomes true - ULTRA AGGRESSIVE MODE (ban only)
  useEffect(() => {
    const isBanModal = !!passedBanInfo;
    if (isVisible && isBanModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
      
      // Block ALL keyboard events
      const blockKeyboard = (e) => {
        console.log("🚫 Keyboard event blocked:", e.key);
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      // Block ALL mouse events except on modal
      const blockMouse = (e) => {
        if (!e.target.closest('.ban-kick-modal-overlay')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      
      // Block browser back button and navigation
      const blockNavigation = (e) => {
        console.log("🚫 Navigation blocked for banned user");
        e.preventDefault();
        e.returnValue = 'Account is suspended';
        return 'Account is suspended';
      };
      
      // Add all event listeners
      document.addEventListener('keydown', blockKeyboard, true);
      document.addEventListener('keyup', blockKeyboard, true);
      document.addEventListener('keypress', blockKeyboard, true);
      document.addEventListener('click', blockMouse, true);
      document.addEventListener('mousedown', blockMouse, true);
      document.addEventListener('mouseup', blockMouse, true);
      document.addEventListener('contextmenu', blockMouse, true);
      window.addEventListener('beforeunload', blockNavigation, true);
      
      // Block F5, Ctrl+R, F12, Ctrl+Shift+I
      const blockSpecialKeys = (e) => {
        if (e.key === 'F5' || 
            e.key === 'F12' ||
            (e.ctrlKey && e.key === 'r') ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.key === 'u')) {
          console.log("🚫 Special key blocked:", e.key);
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      
      document.addEventListener('keydown', blockSpecialKeys, true);
      
      // Store event handlers for cleanup
      window.banModalEventHandlers = {
        blockKeyboard,
        blockMouse, 
        blockNavigation,
        blockSpecialKeys
      };
      
      // Force modal element styling immediately and repeatedly - ULTRA AGGRESSIVE
      const forceModalStyling = () => {
        const modalElement = document.querySelector('.ban-kick-modal-overlay');
        if (modalElement) {
          modalElement.style.zIndex = '2147483647'; // Maximum z-index
          modalElement.style.position = 'fixed';
          modalElement.style.top = '0';
          modalElement.style.left = '0';
          modalElement.style.width = '100vw';
          modalElement.style.height = '100vh';
          modalElement.style.display = 'flex';
          modalElement.style.visibility = 'visible';
          modalElement.style.opacity = '1';
          modalElement.style.pointerEvents = 'all';
          modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
          
          // Make modal unselectable and prevent right-click
          modalElement.style.userSelect = 'none';
          modalElement.style.webkitUserSelect = 'none';
          modalElement.style.mozUserSelect = 'none';
          modalElement.style.msUserSelect = 'none';
        }
        
        // Also ensure body stays locked
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.userSelect = 'none';
        document.body.style.pointerEvents = 'none';
      };
      
      // Apply styling immediately
      forceModalStyling();
      
      // Keep applying styling every 10ms for maximum effectiveness
      const styleInterval = setInterval(forceModalStyling, 10);
      
      // Store interval to clear later
      window.banModalStyleInterval = styleInterval;
      
    } else {
      // Clear styling interval and restore body for ban-modal cleanup
      if (window.banModalStyleInterval) {
        clearInterval(window.banModalStyleInterval);
        window.banModalStyleInterval = null;
      }
      if (window.banModalEventHandlers) {
        const handlers = window.banModalEventHandlers;
        document.removeEventListener('keydown', handlers.blockKeyboard, true);
        document.removeEventListener('keyup', handlers.blockKeyboard, true);
        document.removeEventListener('keypress', handlers.blockKeyboard, true);
        document.removeEventListener('click', handlers.blockMouse, true);
        document.removeEventListener('mousedown', handlers.blockMouse, true);
        document.removeEventListener('mouseup', handlers.blockMouse, true);
        document.removeEventListener('contextmenu', handlers.blockMouse, true);
        document.removeEventListener('keydown', handlers.blockSpecialKeys, true);
        window.removeEventListener('beforeunload', handlers.blockNavigation, true);
        window.banModalEventHandlers = null;
      }
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.style.width = 'auto';
      document.body.style.height = 'auto';
      document.body.style.top = 'auto';
      document.body.style.left = 'auto';
      document.body.style.userSelect = 'auto';
      document.body.style.pointerEvents = 'auto';
    }
    
    return () => {
      if (window.banModalStyleInterval) {
        clearInterval(window.banModalStyleInterval);
        window.banModalStyleInterval = null;
      }
      if (window.banModalEventHandlers) {
        const handlers = window.banModalEventHandlers;
        document.removeEventListener('keydown', handlers.blockKeyboard, true);
        document.removeEventListener('keyup', handlers.blockKeyboard, true);
        document.removeEventListener('keypress', handlers.blockKeyboard, true);
        document.removeEventListener('click', handlers.blockMouse, true);
        document.removeEventListener('mousedown', handlers.blockMouse, true);
        document.removeEventListener('mouseup', handlers.blockMouse, true);
        document.removeEventListener('contextmenu', handlers.blockMouse, true);
        document.removeEventListener('keydown', handlers.blockSpecialKeys, true);
        window.removeEventListener('beforeunload', handlers.blockNavigation, true);
        window.banModalEventHandlers = null;
      }
      document.body.style.overflow = 'auto';
      document.body.style.position = 'static';
      document.body.style.width = 'auto';
      document.body.style.height = 'auto';
      document.body.style.top = 'auto';
      document.body.style.left = 'auto';
      document.body.style.userSelect = 'auto';
      document.body.style.pointerEvents = 'auto';
    };
  }, [isVisible, passedBanInfo]);

  // Set ban/kick info from props immediately
  useEffect(() => {
    console.log("🚫 BanKickModal: useEffect triggered", { 
      isVisible, 
      passedBanInfo: !!passedBanInfo, 
      passedKickInfo: !!passedKickInfo 
    });
    
    if (isVisible) {
      if (passedBanInfo) {
        console.log("🚫 Setting ban info:", passedBanInfo);
        setBanInfo(passedBanInfo);
      }
      
      if (passedKickInfo) {
        console.log("🚫 Setting kick info:", passedKickInfo);
        setKickInfo(passedKickInfo);
      }
      
      setIsLoading(false);
    } else {
      // Clear state when modal is hidden
      setBanInfo(null);
      setKickInfo(null);
      setIsLoading(true);
    }
  }, [isVisible, passedBanInfo, passedKickInfo]);

  // Simple loading state management
  useEffect(() => {
    if (isVisible && (passedBanInfo || passedKickInfo)) {
      setIsLoading(false);
    }
  }, [isVisible, passedBanInfo, passedKickInfo]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return 'N/A'; }
  };

  const isKickOnly = !banInfo && !!kickInfo;

  // Only render when visible
  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="ban-kick-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 2147483647, // Maximum possible z-index
        display: 'flex',
        visibility: 'visible',
        opacity: 1,
        pointerEvents: 'all',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(10px)',
        userSelect: 'none',
        webkitUserSelect: 'none',
        mozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      onContextMenu={(e) => e.preventDefault()}
      onSelectStart={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="ban-kick-modal">
        {/* Ban Modal */}
        {banInfo && (
          <div className="ban-notification">
            <div className="modal-header ban-header">
              <div className="status-icon-container">
                <BanIcon />
              </div>
              <div className="header-content">
                <h2 className="modal-title">Account Suspended</h2>
                <p className="modal-subtitle">Your account has been disabled</p>
              </div>
            </div>

            <div className="modal-content">
              <div className="info-section">
                <div className="detail-item">
                  <AlertIcon />
                  <span className="label">Reason:</span>
                  <span className="value banned">{banInfo.reason || 'Account suspended due to policy violations'}</span>
                </div>
                <div className="detail-item">
                  <UserIcon />
                  <span className="label">Banned By:</span>
                  <span className="value">{banInfo.bannedBy || 'System Administrator'}</span>
                </div>
                <div className="detail-item">
                  <CalendarIcon />
                  <span className="label">Date:</span>
                  <span className="value">{banInfo.bannedAt ? formatDate(new Date(banInfo.bannedAt)) : formatDate(new Date())}</span>
                </div>
                <div className="detail-item">
                  <IdIcon />
                  <span className="label">User ID:</span>
                  <span className="value user-id">{auth.currentUser?.uid ? `${auth.currentUser.uid.slice(0, 16)}...` : (banInfo.userId ? `${banInfo.userId.slice(0,16)}...` : 'Not Available')}</span>
                </div>
                {banInfo.email && (
                  <div className="detail-item">
                    <EmailIcon />
                    <span className="label">Email:</span>
                    <span className="value">{banInfo.email}</span>
                  </div>
                )}
              </div>

              <div className="info-section">
                <h3 className="section-title">
                  <SupportIcon />
                  Appeal Your Ban
                </h3>
                <div className="contact-info">
                  <p>If you believe this ban is a mistake, contact: <span className="contact-email">admin@tingleapp.com</span></p>
                  <p>Include your User ID and the reason for appeal.</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary-btn" onClick={() => {
                alert('Your account remains suspended. Please contact support at admin@tingleapp.com for assistance.');
              }}>
                I Understand
              </button>
              <button className="secondary-btn" onClick={() => {
                const uid = auth.currentUser?.uid || banInfo.userId || 'Not Available';
                const email = auth.currentUser?.email || banInfo.email || 'Not Available';
                const reason = banInfo.reason || 'Unknown';
                const subject = 'Account Ban Appeal - TingleTap';
                const body = `Hello Admin,\n\nI am writing to appeal my account ban on TingleTap.\n\nUser ID: ${uid}\nEmail: ${email}\nBan Reason Given: ${reason}\nDate: ${new Date().toLocaleDateString()}\n\nI believe this ban was issued in error because: [Please explain your situation here]\n\nThank you for reviewing my appeal.\n\nBest regards`;
                window.open(`mailto:admin@tingleapp.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
              }}>
                <ExitIcon />
                Appeal Ban
              </button>
            </div>
          </div>
        )}

        {/* Kick Modal */}
        {kickInfo && !banInfo && (
          <div className="kick-notification">
            <div className="modal-header kick-header">
              <div className="status-icon-container kick">
                <KickIcon />
              </div>
              <div className="header-content">
                <h2 className="modal-title">Account Kicked</h2>
                <p className="modal-subtitle">Your account is kicked from {kickInfo.roomName}</p>
              </div>
            </div>

            <div className="modal-content">
              <div className="info-section">
                <div className="detail-item">
                  <RoomIcon />
                  <span className="label">Room:</span>
                  <span className="value room-name">{kickInfo.roomName}</span>
                </div>
                <div className="detail-item">
                  <UserIcon />
                  <span className="label">Kicked By:</span>
                  <span className="value">{kickInfo.kickedBy}</span>
                </div>
                <div className="detail-item">
                  <CalendarIcon />
                  <span className="label">When:</span>
                  <span className="value">{formatDate(kickInfo.kickedAt)}</span>
                </div>
                <div className="detail-item">
                  <AlertIcon />
                  <span className="label">Reason:</span>
                  <span className="value">{kickInfo.reason}</span>
                </div>
              </div>

              <div className="info-section">
                <h3 className="section-title">
                  <SupportIcon />
                  What's Next?
                </h3>
                <div className="notice-content">
                  <p>You can rejoin this room unless permanently banned</p>
                  <p>Please follow room rules to avoid future kicks</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary-btn kick-btn" onClick={() => {
                if (onClose) onClose();
              }}>
                Back to Room List
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="ban-notification">
            <div className="modal-header loading-header">
              <div className="status-icon-container loading">
                <div className="loading-spinner"></div>
              </div>
              <div className="header-content">
                <h2 className="modal-title">Loading...</h2>
                <p className="modal-subtitle">Checking account status</p>
              </div>
            </div>
          </div>
        )}

        {/* Default modal for when no specific ban/kick info but modal should be visible */}
        {!isLoading && !banInfo && !kickInfo && isVisible && (
          <div className="ban-notification">
            <div className="modal-header ban-header">
              <div className="status-icon-container">
                <BanIcon />
              </div>
              <div className="header-content">
                <h2 className="modal-title">Access Restricted</h2>
                <p className="modal-subtitle">Unable to access the requested service</p>
              </div>
            </div>

            <div className="modal-content">
              <div className="info-section">
                <div className="detail-item">
                  <AlertIcon />
                  <span className="label">Status:</span>
                  <span className="value banned">Access Denied</span>
                </div>
                <div className="detail-item">
                  <UserIcon />
                  <span className="label">System:</span>
                  <span className="value">Security Check</span>
                </div>
                <div className="detail-item">
                  <CalendarIcon />
                  <span className="label">Detected:</span>
                  <span className="value">{formatDate(new Date())}</span>
                </div>
                <div className="detail-item">
                  <IdIcon />
                  <span className="label">User ID:</span>
                  <span className="value user-id">{auth.currentUser?.uid ? `${auth.currentUser.uid.slice(0, 16)}...` : `SEC_${Date.now().toString().slice(-8)}`}</span>
                </div>
              </div>

              <div className="info-section">
                <h3 className="section-title">
                  <SupportIcon />
                  Contact Support
                </h3>
                <div className="contact-info">
                  <p>For assistance, email: <span className="contact-email">admin@tingleapp.com</span></p>
                  <p>Include your Session ID in your message</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary-btn" onClick={() => {
                console.log("Access restriction acknowledged by user");
                if (onClose) onClose();
                window.location.href = '/welcome';
              }}>
                I Understand
              </button>
              <button className="secondary-btn" onClick={() => {
                const subject = 'Access Restriction Issue - TingleTap';
                const body = `Hello Admin,

I am experiencing access restrictions on TingleTap and need assistance.

User ID: ${auth.currentUser?.uid || `SEC_${Date.now().toString().slice(-8)}`}
Email: ${auth.currentUser?.email || 'Not Available'}
Date: ${new Date().toLocaleDateString()}

Please help me resolve this access issue.

Thank you for your assistance.

Best regards`;
                
                const mailtoLink = `mailto:admin@tingleapp.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.open(mailtoLink, '_blank');
              }}>
                <ExitIcon />
                Contact Support
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BanKickModal;