import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc, onSnapshot, collection, query, orderBy, where, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import BanKickModal from '../components/BanKickModal';
import EditProfileModal from '../components/EditProfileModal';
import '../components/BanKickModal.css';
import './LandingPage.css';

const WelcomeDashboard = () => {
  const [user, setUser] = useState(null);
  const [guestUser, setGuestUser] = useState(null);
  const [currentDate, setCurrentDate] = useState('');
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for authenticated user
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);

      // Get actual signup date from Firebase user profile and check ban status
          const fetchUserData = async () => {
            try {
              const userRef = doc(db, 'users', currentUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();

                // Check if user is banned and show modal IMMEDIATELY
                console.log("🚫 Checking ban status for user:", userData.isBanned);
                if (userData.isBanned === true) {
                  console.log("🚫 BANNED USER DETECTED - Showing ban modal immediately");
                  
                  // Prevent ANY browser alerts from showing
                  const originalAlert = window.alert;
                  const originalConfirm = window.confirm;
                  window.alert = () => {};
                  window.confirm = () => false;
                  
                  setShowBanModal(true);
                  // Force the modal to stay visible and override any close attempts
                  setTimeout(() => setShowBanModal(true), 50);
                  setTimeout(() => setShowBanModal(true), 100);
                  setTimeout(() => setShowBanModal(true), 200);
                  setTimeout(() => setShowBanModal(true), 500);
                  setTimeout(() => setShowBanModal(true), 1000);
                  
                  // Keep forcing it to show every second for banned users
                  const banModalInterval = setInterval(() => {
                    setShowBanModal(true);
                    // Continue blocking browser alerts
                    window.alert = () => {};
                    window.confirm = () => false;
                  }, 1000);
                  
                  // Store interval ID to clear it later if needed
                  window.banModalInterval = banModalInterval;
                  
                  // Also force immediate display by directly manipulating the DOM
                  setTimeout(() => {
                    const modal = document.querySelector('.ban-kick-modal-overlay');
                    if (modal) {
                      modal.style.display = 'flex';
                      modal.style.zIndex = '999999';
                      modal.style.pointerEvents = 'all';
                    }
                  }, 10);
                }

                let signupDate = userData.createdAt || currentUser.metadata.creationTime;

                // Convert Firestore timestamp to Date if needed
                if (signupDate && typeof signupDate.toDate === 'function') {
                  signupDate = signupDate.toDate();
                } else if (typeof signupDate === 'string') {
                  signupDate = new Date(signupDate);
                }

                const options = { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                };

                const formattedDate = signupDate && !isNaN(signupDate) 
                  ? signupDate.toLocaleDateString('en-US', options)
                  : new Date().toLocaleDateString('en-US', options);

                setCurrentDate(formattedDate);
              } else {
                // Fallback to Firebase Auth creation time
                const creationTime = new Date(currentUser.metadata.creationTime);
                const options = { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                };
                setCurrentDate(creationTime.toLocaleDateString('en-US', options));
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
              // Fallback to current date
              const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              };
              setCurrentDate(new Date().toLocaleDateString('en-US', options));
            }
          };

      fetchUserData();
    } else {
      // Check for guest user
      const isGuest = localStorage.getItem('isGuest') === 'true';
      const guestData = localStorage.getItem('guestUser');
      if (isGuest && guestData) {
        const guestUserData = JSON.parse(guestData);
        setGuestUser(guestUserData);

        // For guest users, use current date as they just joined
        const today = new Date();
        const options = { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        };
        setCurrentDate(today.toLocaleDateString('en-US', options));
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      if (user) {
        await signOut(auth);
      } else if (guestUser) {
        localStorage.removeItem('guestUser');
        localStorage.removeItem('isGuest');
      }
      toast.success('Successfully logged out!');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const handleManageAccount = () => {
    if (user) {
      setShowEditProfileModal(true);
      toast.success('✏️ Opening Edit Profile!');
    } else {
      toast.info('Guest users can update their profile in chat settings');
      navigate('/rooms');
    }
  };

  const handleChatClick = () => {
    navigate('/rooms');
  };

  const displayName = user?.displayName || guestUser?.displayName || 'User';
  const userType = user ? 'Registered User' : 'Guest User';

  return (
    <div style={styles.container}>
      <div style={styles.backgroundOverlay}></div>
      <div style={styles.particlesLayer}></div>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(60px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-60px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes glowPulse {
            0%, 100% {
              box-shadow: 0 0 40px rgba(102, 126, 234, 0.6), 0 0 80px rgba(102, 126, 234, 0.4);
            }
            50% {
              box-shadow: 0 0 60px rgba(102, 126, 234, 0.8), 0 0 120px rgba(102, 126, 234, 0.6);
            }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-15px) rotate(2deg); }
            66% { transform: translateY(-5px) rotate(-1deg); }
          }

          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(1); }
          }

          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }

          @keyframes luxuryFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }

          .glass-morphism {
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 32px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .glass-morphism:hover {
            background: rgba(255, 255, 255, 0.18);
            border-color: rgba(255, 255, 255, 0.35);
            box-shadow: 0 35px 70px rgba(0, 0, 0, 0.25);
            transform: translateY(-5px);
          }

          .premium-btn {
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid transparent;
            background: linear-gradient(135deg, var(--btn-color-1), var(--btn-color-2));
            background-size: 200% 200%;
            animation: shimmer 3s ease-in-out infinite;
          }

          .premium-btn:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          }

          .premium-btn:hover::before {
            opacity: 1;
          }

          .premium-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0));
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: inherit;
          }

          .premium-btn svg {
            filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
            transition: all 0.3s ease;
          }

          .premium-btn:hover svg {
            transform: scale(1.1);
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
          }

          .sparkle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            animation: sparkle 2s ease-in-out infinite;
          }

          .sparkle:nth-child(1) { top: 20%; left: 20%; animation-delay: 0s; }
          .sparkle:nth-child(2) { top: 80%; right: 30%; animation-delay: 0.5s; }
          .sparkle:nth-child(3) { bottom: 30%; left: 70%; animation-delay: 1s; }
          .sparkle:nth-child(4) { top: 50%; right: 15%; animation-delay: 1.5s; }

          @media (max-width: 768px) {
            .main-card {
              padding: 15px !important;
              max-height: calc(100vh - 60px) !important;
              width: calc(100vw - 20px) !important;
            }

            .app-title {
              font-size: 1.5rem !important;
            }

            .welcome-title {
              font-size: 1rem !important;
            }

            .user-name {
              font-size: 1.1rem !important;
            }

            .buttons-container {
              flex-direction: column !important;
              gap: 8px !important;
            }

            .premium-btn {
              width: 100% !important;
              padding: 10px !important;
              min-width: auto !important;
              height: 36px !important;
              font-size: 0.7rem !important;
            }

            .description-card {
              padding: 12px !important;
              margin-bottom: 8px !important;
            }

            .user-welcome {
              margin-bottom: 10px !important;
            }

            .welcome-message {
              font-size: 0.9rem !important;
              margin-bottom: 4px !important;
            }

            .login-info {
              font-size: 0.65rem !important;
            }
          }

          @media (max-width: 480px) {
            .main-card {
              padding: 12px !important;
              max-height: calc(100vh - 40px) !important;
              width: calc(100vw - 16px) !important;
            }

            .description-card {
              padding: 10px !important;
              margin-bottom: 6px !important;
            }

            .app-title {
              font-size: 1.3rem !important;
            }

            .welcome-title {
              font-size: 0.9rem !important;
            }

            .user-name {
              font-size: 1rem !important;
            }

            .premium-btn {
              height: 32px !important;
              font-size: 0.65rem !important;
              padding: 8px !important;
            }

            .welcome-message {
              font-size: 0.8rem !important;
            }

            .login-info {
              font-size: 0.6rem !important;
            }

            /* Force welcome message to be white and override any styling */
            .welcome-user-name {
              color: #ffffff !important;
              background: none !important;
              -webkit-background-clip: initial !important;
              background-clip: initial !important;
              -webkit-text-fill-color: #ffffff !important;
              text-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
            }
          }

          @media (max-width: 360px) {
            .main-card {
              padding: 10px !important;
              width: calc(100vw - 12px) !important;
            }

            .app-title {
              font-size: 1.2rem !important;
            }

            .welcome-title {
              font-size: 0.85rem !important;
            }

            .premium-btn {
              height: 30px !important;
              font-size: 0.6rem !important;
            }
          }
        `}
      </style>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.mainCard} className="glass-morphism main-card">

          {/* Sparkle Effects */}
          <div className="sparkle"></div>
          <div className="sparkle"></div>
          <div className="sparkle"></div>
          <div className="sparkle"></div>

          {/* TingleTap Logo and Title inside container */}
          <div style={styles.titleSection}>
            <img 
              src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" 
              alt="TingleTap Logo" 
              style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                marginBottom: '8px',
                border: '4px solid transparent',
                background: 'white, linear-gradient(45deg, #ff0080, #ff1493, #ff4081, #e91e63, #9c27b0, #8a2be2, #673ab7, #3f51b5, #2196f3, #00bcd4, #20b2aa, #009688, #4caf50, #32cd32, #8bc34a, #cddc39, #ffeb3b, #ffd700, #ffc107, #ff9800, #ff8c00, #ff5722, #f44336, #dc143c, #ff0080)',
                backgroundClip: 'padding-box, border-box',
                objectFit: 'contain',
                padding: '4px',
                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)',
                display: 'block',
                margin: '0 auto 8px auto'
              }}
            />
            <h1 style={styles.appTitle} className="app-title">TingleTap</h1>
          </div>

          {/* Welcome Section */}
          <div style={{...styles.welcomeSection, marginTop: '1rem'}}>
            <h2 style={styles.welcomeTitle} className="welcome-title">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{marginRight: '12px', verticalAlign: 'middle'}} className="icon-float">
                <defs>
                  <linearGradient id="communityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700"/>
                    <stop offset="50%" stopColor="#FFA500"/>
                    <stop offset="100%" stopColor="#FF6B6B"/>
                  </linearGradient>
                </defs>
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 5.5V7.5L21 9ZM3 9L9 7.5V5.5L3 7V9ZM15 10.5V19L13.5 20.5C13.1 20.9 12.4 20.9 12 20.5L10.5 19V10.5L15 10.5ZM5.7 10.8C5.7 13.3 7.7 15.3 10.2 15.3H13.8C16.3 15.3 18.3 13.3 18.3 10.8V10.5L15 10.5V15.3C15 16.4 14.1 17.3 13 17.3H11C9.9 17.3 9 16.4 9 15.3V10.5L5.7 10.5V10.8Z" fill="url(#communityGrad)"/>
                <circle cx="12" cy="12" r="8" stroke="url(#communityGrad)" strokeWidth="1.5" fill="none" opacity="0.3"/>
              </svg>
              Join Our Community
            </h2>
          </div>

          {/* Description Card */}
          <div style={styles.descriptionCard} className="glass-morphism description-card">
            <p style={styles.description}>
              Connect with amazing people and experience real-time conversations in our vibrant community!
            </p>
          </div>

          {/* User Welcome */}
          <div style={styles.userWelcome}>
            <h3 style={styles.welcomeMessage} className="welcome-user-name">Welcome {displayName}!</h3>
            <p style={styles.loginInfo}>
              You're now part of our amazing community as a {userType}. 
              Your journey started on {currentDate}. Let's explore together!
            </p>
          </div>

          {/* Action Buttons */}
          <div style={styles.buttonsContainer} className="buttons-container">
            <button 
              onClick={handleManageAccount}
              style={{...styles.manageBtn, '--btn-color-1': '#86EFAC', '--btn-color-2': '#4ADE80'}}
              className="premium-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '8px'}}>
                <defs>
                  <linearGradient id="userGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff"/>
                    <stop offset="100%" stopColor="#ffffff"/>
                  </linearGradient>
                </defs>
                <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="url(#userGrad)"/>
                <circle cx="12" cy="8" r="3" stroke="url(#userGrad)" strokeWidth="1" fill="none" opacity="0.5"/>
                <path d="M19 14L21 16L19 18M17 16H21" stroke="url(#userGrad)" strokeWidth="1.5" fill="none"/>
              </svg>
              MANAGE ACCOUNT
            </button>

            <button 
              onClick={handleChatClick}
              style={{...styles.chatBtn, '--btn-color-1': '#FCA5A5', '--btn-color-2': '#F87171'}}
              className="premium-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '8px'}}>
                <defs>
                  <linearGradient id="chatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff"/>
                    <stop offset="100%" stopColor="#ffffff"/>
                  </linearGradient>
                </defs>
                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="url(#chatGrad)"/>
                <circle cx="8" cy="9" r="1" fill="#F87171"/>
                <circle cx="12" cy="9" r="1" fill="#F87171"/>
                <circle cx="16" cy="9" r="1" fill="#F87171"/>
                <path d="M7 13H17" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              START CHATTING
            </button>

            <button 
              onClick={handleLogout}
              style={{...styles.logoutBtn, '--btn-color-1': '#D1D5DB', '--btn-color-2': '#9CA3AF'}}
              className="premium-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '8px'}}>
                <defs>
                  <linearGradient id="logoutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff"/>
                    <stop offset="100%" stopColor="#ffffff"/>
                  </linearGradient>
                </defs>
                <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.59L17 17L22 12L17 7ZM4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z" fill="url(#logoutGrad)"/>
                <path d="M21 12L17 8V11H8V13H17V16L21 12Z" stroke="url(#logoutGrad)" strokeWidth="0.5" fill="none" opacity="0.7"/>
              </svg>
              LOGOUT
            </button>
          </div>

        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
          onSuccess={() => {
            setShowEditProfileModal(false);
            toast.success('✅ Profile updated successfully!');
          }}
        />
      )}

      {/* Ban/Kick Modal - Force show for banned users */}
      {showBanModal && (
        <BanKickModal
          isVisible={true}
          onClose={() => {
            // Completely prevent closing ban modal for banned users
            console.log("🚫 Ban modal close attempted - BLOCKED for banned user");
            setShowBanModal(true);
            // Immediately force it back open
            setTimeout(() => setShowBanModal(true), 1);
            return false;
          }}
        />
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.copyrightContainer}>
            <div style={styles.copyrightDiamond}>
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
            <p style={styles.copyrightText}>
              <span style={styles.copyrightYear}>© 2024</span>
              <span style={styles.copyrightBrand}>TingleTap™</span>
            </p>
            <p style={styles.copyrightSubtext}>
              All rights reserved • Developed by Adrashtra Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    background: 'linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 50%, #E6E6FA 100%)',
    fontFamily: "'Poppins', 'Inter', sans-serif",
    position: 'fixed',
    top: 0,
    left: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
    boxSizing: 'border-box'
  },

  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 20%, rgba(102, 126, 234, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 40% 60%, rgba(79, 172, 254, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 60% 30%, rgba(245, 101, 101, 0.1) 0%, transparent 50%)
    `,
    zIndex: 0
  },

  particlesLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(2px 2px at 20px 30px, rgba(255, 255, 255, 0.3), transparent),
      radial-gradient(2px 2px at 40px 70px, rgba(255, 255, 255, 0.2), transparent),
      radial-gradient(1px 1px at 90px 40px, rgba(255, 255, 255, 0.4), transparent),
      radial-gradient(1px 1px at 130px 80px, rgba(255, 255, 255, 0.3), transparent),
      radial-gradient(2px 2px at 160px 30px, rgba(255, 255, 255, 0.2), transparent)
    `,
    backgroundRepeat: 'repeat',
    backgroundSize: '200px 100px',
    animation: 'float 20s ease-in-out infinite',
    zIndex: 0
  },

  titleSection: {
    textAlign: 'center',
    marginBottom: '0.5rem',
    animation: 'slideInLeft 1s ease-out'
  },

  appTitle: {
    fontSize: '1.4rem',
    fontWeight: '900',
    color: '#2d3748',
    margin: '0',
    textShadow: '0 2px 8px rgba(0,0,0,0.2)',
    letterSpacing: '0.05em',
    background: 'linear-gradient(135deg, #8A2BE2 0%, #BA55D3 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
  },

  main: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '450px',
    height: 'auto',
    flex: 1,
    padding: '10px',
    margin: '0 auto',
    overflow: 'hidden'
  },

  mainCard: {
    width: '100%',
    padding: '20px',
    textAlign: 'center',
    animation: 'fadeInUp 1s ease-out 0.3s both',
    position: 'relative',
    maxHeight: 'calc(100vh - 100px)',
    overflow: 'visible',
    boxSizing: 'border-box'
  },

  welcomeSection: {
    marginBottom: '0.3rem',
    marginTop: '0.2rem'
  },

  welcomeTitle: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0',
    textShadow: '0 4px 16px rgba(0,0,0,0.4)',
    lineHeight: '1.2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #ffffff, #fef3c7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },

  descriptionCard: {
    padding: '0.6rem',
    marginBottom: '0.3rem',
    textAlign: 'center',
    position: 'relative'
  },

  description: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: '1.3',
    margin: '0',
    fontWeight: '500',
    textAlign: 'center'
  },

  userWelcome: {
    marginBottom: '0.3rem'
  },

  welcomeMessage: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#ffffff !important',
    margin: '0 0 0.2rem 0',
    textShadow: '0 3px 15px rgba(0,0,0,0.4)',
  },

  loginInfo: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.85)',
    margin: '0',
    fontWeight: '500',
    lineHeight: '1.2'
  },

  buttonsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    alignItems: 'center'
  },

  manageBtn: {
    color: '#ffffff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '20px',
    fontSize: '0.6rem',
    fontWeight: '700',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '110px',
    position: 'relative',
    height: '30px'
  },

  chatBtn: {
    color: '#ffffff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '20px',
    fontSize: '0.6rem',
    fontWeight: '700',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '110px',
    position: 'relative',
    height: '30px'
  },

  logoutBtn: {
    color: '#ffffff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '20px',
    fontSize: '0.6rem',
    fontWeight: '700',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '110px',
    position: 'relative',
    height: '30px'
  },

  footer: {
    position: 'relative',
    zIndex: 10,
    padding: '1.5rem 1rem',
    marginTop: '1rem',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
    borderTop: '2px solid rgba(139, 92, 246, 0.2)'
  },

  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center'
  },

  copyrightContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem'
  },

  copyrightDiamond: {
    animation: 'luxuryFloat 3s ease-in-out infinite',
    filter: 'drop-shadow(0 4px 12px rgba(139, 92, 246, 0.4))'
  },

  copyrightText: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    margin: '0',
    fontSize: '1rem',
    fontWeight: '600'
  },

  copyrightYear: {
    color: '#1f2937',
    fontWeight: '700',
    fontSize: '1.1rem'
  },

  copyrightBrand: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: '800',
    fontSize: '1.2rem',
    letterSpacing: '0.5px',
    textShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
  },

  copyrightSubtext: {
    margin: '0',
    fontSize: '0.85rem',
    color: '#9ca3af',
    fontWeight: '400',
    letterSpacing: '0.3px',
    fontStyle: 'italic'
  }
};

export default WelcomeDashboard;