// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, rtdb, db } from './firebase/config';
import { ref, onValue, set, onDisconnect, serverTimestamp } from "firebase/database";
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';

import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import RoomListPage from './pages/RoomListPage';

import AdminPanelPage from './pages/AdminPanelPage';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import DisclaimerPage from './pages/DisclaimerPage';
import ContactPage from './pages/ContactPage';
import FAQPage from './pages/FAQPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import WelcomeDashboard from './pages/WelcomeDashboard';

import ProtectedRoute from './components/ProtectedRoute';
import AuthRoute from './components/AuthRoute';
import ErrorBoundary from './components/ErrorBoundary';
import VPNBlockModal from './components/VPNBlockModal';

// Removed toast notifications
import { checkUserVPN } from './utils/vpnDetection';
import BanKickModal from './components/BanKickModal';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vpnBlocked, setVpnBlocked] = useState(false);
  const [vpnInfo, setVpnInfo] = useState(null);
  const [vpnChecking, setVpnChecking] = useState(true);
  const [fontPreferences, setFontPreferences] = useState({
    fontSize: '14px',
    fontColor: '#333333',
    fontFamily: 'inherit',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrikethrough: false
  });
  const [showGlobalBanModal, setShowGlobalBanModal] = useState(false);
  const [globalBanInfo, setGlobalBanInfo] = useState(null);
  const [bannedUser, setBannedUser] = useState(null);
  const [banModalData, setBanModalData] = useState({}); // Added state for ban modal data
  const [showBanModal, setShowBanModal] = useState(false); // Added state for ban modal visibility
  const [error, setError] = useState(''); // Added state for error messages

  // VPN Detection Effect
  useEffect(() => {
    const performVPNCheck = async () => {
      try {
        setVpnChecking(true);
        console.log('🔍 Starting VPN detection...');

        const vpnResult = await checkUserVPN();
        console.log('🔍 VPN check result:', vpnResult);

        setVpnInfo(vpnResult);

        if (!vpnResult.allowed) {
          console.log('❌ VPN/Proxy detected - blocking access');
          setVpnBlocked(true);
        } else {
          console.log('✅ IP clean - allowing access');
          setVpnBlocked(false);
        }
      } catch (error) {
        console.error('❌ VPN check failed:', error);
        // On error, allow access (fail-open approach)
        setVpnBlocked(false);
      } finally {
        setVpnChecking(false);
      }
    };

    // Import periodic VPN check functions
    import('./utils/vpnDetection.js').then(({ startPeriodicVPNCheck, stopPeriodicVPNCheck }) => {
      // Start periodic VPN monitoring
      startPeriodicVPNCheck((vpnResult) => {
        setVpnInfo(vpnResult);
        setVpnBlocked(true);
      });

      // Cleanup on unmount
      return () => stopPeriodicVPNCheck();
    });

    // Perform VPN check on app start
    performVPNCheck();
  }, []);

  useEffect(() => {
    // Initialize theme on app start from localStorage (will be updated when user profile loads)
    const savedTheme = localStorage.getItem('selectedTheme') || 'light';

    // Initialize font preferences on app start using utility
    const initializeFontPreferences = () => {
      const savedFontPrefs = {
        fontSize: localStorage.getItem('chatFontSize') || '14px',
        fontColor: localStorage.getItem('chatFontColor') || '#333333',
        fontFamily: localStorage.getItem('chatFontFamily') || 'inherit',
        isBold: localStorage.getItem('chatIsBold') === 'true',
        isItalic: localStorage.getItem('chatIsItalic') === 'true',
        isUnderline: localStorage.getItem('chatIsUnderline') === 'true',
        isStrikethrough: localStorage.getItem('chatIsStrikethrough') === 'true'
      };

      window.chatFontPreferences = savedFontPrefs;
      console.log('🎨 Font preferences initialized on app start:', savedFontPrefs);

      // Apply styles immediately on app start
      setTimeout(() => {
        const messageElements = document.querySelectorAll('.message-text, .mock-message-text');
        messageElements.forEach(element => {
          element.style.fontSize = savedFontPrefs.fontSize;
          element.style.color = savedFontPrefs.fontColor;
          element.style.fontFamily = savedFontPrefs.fontFamily;
          element.style.fontWeight = savedFontPrefs.isBold ? 'bold' : 'normal';
          element.style.fontStyle = savedFontPrefs.isItalic ? 'italic' : 'normal';
          element.style.textDecoration = [
            savedFontPrefs.isUnderline ? 'underline' : '',
            savedFontPrefs.isStrikethrough ? 'line-through' : ''
          ].filter(Boolean).join(' ') || 'none';
        });
      }, 100);
    };

    initializeFontPreferences();

    // Ultra-fast theme application with zero lag
    const applyTheme = (theme) => {
      const themeClasses = ['theme-light', 'theme-dark', 'theme-nord', 'theme-tokyo', 'theme-monokai', 'theme-dracula', 'theme-cyberpunk', 'theme-ocean', 'theme-sunset', 'dark-mode'];

      // Batch DOM operations for instant switching
      document.documentElement.className = document.documentElement.className
        .split(' ')
        .filter(cls => !themeClasses.includes(cls))
        .join(' ');

      // Apply new theme instantly
      const newThemeClass = `theme-${theme}`;
      const isDarkTheme = ['dark', 'nord', 'tokyo', 'monokai', 'dracula', 'cyberpunk', 'ocean', 'sunset'].includes(theme);

      const classesToAdd = [newThemeClass];
      if (isDarkTheme) {
        classesToAdd.push('dark-mode');
      }

      document.documentElement.classList.add(...classesToAdd);
      document.body.className = document.body.className
        .split(' ')
        .filter(cls => !themeClasses.includes(cls))
        .concat(classesToAdd)
        .join(' ');

      return isDarkTheme;
    };

    applyTheme(savedTheme);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Listen for auth state changes and banned users
        // Listen for auth state changes and banned users
        const unsubscribeAuthCheck = auth.onAuthStateChanged(async (user) => {
          if (user) {
            console.log("🔍 Auth state changed - checking ban status for:", user.uid);

            try {
              const userDocRef = doc(db, 'users', user.uid);
              const userSnap = await getDoc(userDocRef);

              if (userSnap.exists()) {
                const userData = userSnap.data();
                console.log("🔍 User data loaded:", { isBanned: userData.isBanned, uid: user.uid });

                if (userData.isBanned === true) {
                  console.log("🚫 BANNED USER DETECTED - IMMEDIATE LOCKDOWN PROTOCOL ACTIVATED");

                  // Store ban info in localStorage for persistence across reloads
                  const banData = {
                    reason: userData.banReason || "Account suspended due to policy violations",
                    bannedBy: userData.bannedBy || "System Administrator",
                    bannedAt: userData.bannedAt ? userData.bannedAt.toDate().toISOString() : new Date().toISOString(),
                    type: "account_banned",
                    userId: user.uid,
                    email: user.email,
                    timestamp: Date.now()
                  };

                  // Store ban status in localStorage for persistence
                  localStorage.setItem('userBanStatus', JSON.stringify(banData));
                  localStorage.setItem('isBannedUser', 'true');

                  console.log("🚫 Ban data stored in localStorage:", banData);
                  setBanModalData(banData);
                  setShowBanModal(true);

                  // Force sign out the banned user immediately
                  await auth.signOut();

                  // AGGRESSIVE modal and page lockdown
                  for (let i = 0; i < 15; i++) {
                    setTimeout(() => {
                      console.log(`🚫 FORCE MODAL ATTEMPT ${i + 1}`);
                      setShowBanModal(true);
                      setBanModalData(banData);

                      // Lock the page completely
                      document.body.style.overflow = 'hidden';
                      document.body.style.position = 'fixed';
                      document.body.style.width = '100%';
                      document.body.style.height = '100%';
                      document.body.style.top = '0';
                      document.body.style.left = '0';
                      document.body.style.userSelect = 'none';
                      document.body.style.pointerEvents = 'none';

                      // Force modal styling
                      const modalElement = document.querySelector('.ban-kick-modal-overlay');
                      if (modalElement) {
                        modalElement.style.display = 'flex';
                        modalElement.style.zIndex = '2147483647';
                        modalElement.style.pointerEvents = 'all';
                        modalElement.style.opacity = '1';
                        modalElement.style.visibility = 'visible';
                        modalElement.style.position = 'fixed';
                        modalElement.style.top = '0';
                        modalElement.style.left = '0';
                        modalElement.style.width = '100vw';
                        modalElement.style.height = '100vh';
                        modalElement.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
                      }
                    }, i * 5);
                  }

                  // Force redirect to login page
                  window.history.replaceState(null, null, '/login');

                  // Prevent navigation attempts
                  window.onbeforeunload = (e) => {
                    e.preventDefault();
                    e.returnValue = 'Account is suspended';
                    return 'Account is suspended';
                  };

                  // Continuous enforcement for banned users
                  const banEnforcementInterval = setInterval(() => {
                    console.log("🚫 Enforcing ban modal visibility");
                    setShowBanModal(true);
                    setBanModalData(banData);

                    // Keep page locked
                    document.body.style.overflow = 'hidden';
                    document.body.style.position = 'fixed';
                    document.body.style.userSelect = 'none';
                    document.body.style.pointerEvents = 'none';

                    // Force modal styling
                    const modalElement = document.querySelector('.ban-kick-modal-overlay');
                    if (modalElement) {
                      modalElement.style.zIndex = '2147483647';
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
                    }

                    // Keep on login page
                    if (window.location.pathname !== '/login') {
                      window.history.replaceState(null, null, '/login');
                    }
                  }, 100); // Every 100ms

                  // Store interval globally
                  window.banEnforcementInterval = banEnforcementInterval;

                  return; // Don't proceed with normal flow
                } else {
                  // User is not banned, clear any stored ban status
                  localStorage.removeItem('userBanStatus');
                  localStorage.removeItem('isBannedUser');
                  console.log("✅ User is not banned, allowing normal flow");
                }
              } else {
                console.log("❌ User document does not exist for:", user.uid);
              }
            } catch (error) {
              console.error("Error checking ban status in auth listener:", error);
            }
          } else {
            // No user logged in - check if there's a stored ban status
            const storedBanStatus = localStorage.getItem('isBannedUser');
            if (storedBanStatus === 'true') {
              console.log("🚫 Found stored ban status - maintaining ban modal");
              const banData = JSON.parse(localStorage.getItem('userBanStatus') || '{}');

              // Convert stored ISO string back to Date object
              if (banData.bannedAt) {
                banData.bannedAt = new Date(banData.bannedAt);
              }

              setBanModalData(banData);
              setShowBanModal(true);

              // Continue enforcement even when logged out
              setTimeout(() => {
                const banEnforcementInterval = setInterval(() => {
                  console.log("🚫 Enforcing stored ban status");
                  setShowBanModal(true);
                  setBanModalData(banData);

                  // Keep page locked
                  document.body.style.overflow = 'hidden';
                  document.body.style.position = 'fixed';

                  // Force modal styling
                  const modalElement = document.querySelector('.ban-kick-modal-overlay');
                  if (modalElement) {
                    modalElement.style.zIndex = '2147483647';
                    modalElement.style.display = 'flex';
                    modalElement.style.visibility = 'visible';
                    modalElement.style.opacity = '1';
                    modalElement.style.pointerEvents = 'all';
                  }

                  // Keep on login page
                  if (window.location.pathname !== '/login') {
                    window.history.replaceState(null, null, '/login');
                  }
                }, 100);

                window.banEnforcementInterval = banEnforcementInterval;
              }, 100);
            }
          }
        });

        // Listen to profile changes when user is logged in
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data();
            if (profile.isBanned) {
              console.log("🚫 BANNED USER DETECTED IN APP.JSX - FORCING IMMEDIATE LOCKDOWN");

              // Immediately lock down everything
              setBannedUser(currentUser);
              setShowGlobalBanModal(true);

              const banData = {
                reason: profile.banReason || "Account suspended due to policy violations",
                bannedBy: profile.bannedBy || "System Administrator",
                bannedAt: profile.bannedAt ? profile.bannedAt.toDate() : new Date(),
                type: "account_banned",
                userId: currentUser.uid,
                email: currentUser.email
              };

              setGlobalBanInfo(banData);

              // Force sign out immediately
              signOut(auth);
              setUserProfile(null);
              setUser(null);

              // Lock the entire page
              document.body.style.overflow = 'hidden';
              document.body.style.position = 'fixed';
              document.body.style.width = '100%';
              document.body.style.height = '100%';
              document.body.style.top = '0';
              document.body.style.left = '0';

              // Block all browser navigation
              window.onbeforeunload = (e) => {
                e.preventDefault();
                e.returnValue = 'Account is suspended';
                return 'Account is suspended';
              };

              // Force URL to stay on current page
              const currentPath = window.location.pathname;
              window.history.replaceState(null, null, currentPath);

              // Continuous modal forcing and page locking
              const banLockdownInterval = setInterval(() => {
                setShowGlobalBanModal(true);
                setGlobalBanInfo(banData);
                setBannedUser(currentUser);

                // Keep page locked
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';

                // Prevent any navigation attempts
                if (window.location.pathname !== currentPath) {
                  window.history.replaceState(null, null, currentPath);
                }

                // Force modal visibility
                const modalElement = document.querySelector('.ban-kick-modal-overlay');
                if (modalElement) {
                  modalElement.style.zIndex = '999999';
                  modalElement.style.position = 'fixed';
                  modalElement.style.top = '0';
                  modalElement.style.left = '0';
                  modalElement.style.width = '100vw';
                  modalElement.style.height = '100vh';
                  modalElement.style.display = 'flex';
                  modalElement.style.visibility = 'visible';
                  modalElement.style.opacity = '1';
                  modalElement.style.pointerEvents = 'all';
                }
              }, 50);

              // Store interval globally for cleanup
              window.globalBanLockdownInterval = banLockdownInterval;

              return; // Exit early, don't process normal profile logic
            } else {
              setUserProfile(profile);

              // Apply user's saved theme from profile with optimization
              const userTheme = profile.selectedTheme || profile.settings?.selectedTheme || 'light';
              const currentTheme = localStorage.getItem('selectedTheme');

              if (userTheme !== currentTheme) {
                localStorage.setItem('selectedTheme', userTheme);
                applyTheme(userTheme);
              }

              // Enhanced font preferences synchronization system
              const fontPrefsLastUpdate = localStorage.getItem('fontPrefsLastUpdate');
              const isRecentLocalUpdate = fontPrefsLastUpdate && (Date.now() - parseInt(fontPrefsLastUpdate)) < 60000; // 60 seconds

              const existingLocalPrefs = {
                fontSize: localStorage.getItem('chatFontSize'),
                fontColor: localStorage.getItem('chatFontColor'),
                fontFamily: localStorage.getItem('chatFontFamily'),
                isBold: localStorage.getItem('chatIsBold') === 'true',
                isItalic: localStorage.getItem('chatIsItalic') === 'true',
                isUnderline: localStorage.getItem('chatIsUnderline') === 'true',
                isStrikethrough: localStorage.getItem('chatIsStrikethrough') === 'true'
              };

              const hasLocalPrefs = existingLocalPrefs.fontSize ||
                                  existingLocalPrefs.fontColor ||
                                  existingLocalPrefs.fontFamily ||
                                  localStorage.getItem('chatIsBold') !== null ||
                                  localStorage.getItem('chatIsItalic') !== null ||
                                  localStorage.getItem('chatIsUnderline') !== null ||
                                  localStorage.getItem('chatIsStrikethrough') !== null;

              let finalPrefs = null;

              // Priority 1: Recent localStorage changes (user just changed something)
              if (hasLocalPrefs && isRecentLocalUpdate) {
                finalPrefs = {
                  fontSize: existingLocalPrefs.fontSize || '14px',
                  fontColor: existingLocalPrefs.fontColor || '#333333',
                  fontFamily: existingLocalPrefs.fontFamily || 'inherit',
                  isBold: Boolean(existingLocalPrefs.isBold),
                  isItalic: Boolean(existingLocalPrefs.isItalic),
                  isUnderline: Boolean(existingLocalPrefs.isUnderline),
                  isStrikethrough: Boolean(existingLocalPrefs.isStrikethrough)
                };
                console.log('✅ Font preferences loaded from RECENT localStorage changes:', finalPrefs);

                // Sync to Firebase immediately for user changes
                try {
                  const userRef = doc(db, 'users', currentUser.uid);
                  await updateDoc(userRef, {
                    fontPreferences: finalPrefs
                  });
                  console.log('✅ Recent local font preferences synced to Firebase for user:', currentUser.uid);
                } catch (error) {
                  console.error('❌ Error syncing recent font preferences to Firebase:', error);
                }
              }
              // Priority 2: Use Firebase preferences (server source of truth)
              else if (profile.fontPreferences) {
                finalPrefs = {
                  fontSize: profile.fontPreferences.fontSize || '14px',
                  fontColor: profile.fontPreferences.fontColor || '#333333',
                  fontFamily: profile.fontPreferences.fontFamily || 'inherit',
                  isBold: Boolean(profile.fontPreferences.isBold),
                  isItalic: Boolean(profile.fontPreferences.isItalic),
                  isUnderline: Boolean(profile.fontPreferences.isUnderline),
                  isStrikethrough: Boolean(profile.fontPreferences.isStrikethrough)
                };
                console.log('✅ Font preferences loaded from Firebase in App.jsx:', finalPrefs);
              }
              // Priority 3: Fall back to localStorage if no Firebase data
              else if (hasLocalPrefs) {
                finalPrefs = {
                  fontSize: existingLocalPrefs.fontSize || '14px',
                  fontColor: existingLocalPrefs.fontColor || '#333333',
                  fontFamily: existingLocalPrefs.fontFamily || 'inherit',
                  isBold: Boolean(existingLocalPrefs.isBold),
                  isItalic: Boolean(existingLocalPrefs.isItalic),
                  isUnderline: Boolean(existingLocalPrefs.isUnderline),
                  isStrikethrough: Boolean(existingLocalPrefs.isStrikethrough)
                };
                console.log('✅ Font preferences loaded from localStorage (fallback):', finalPrefs);

                // Sync to Firebase for first-time users
                try {
                  const userRef = doc(db, 'users', currentUser.uid);
                  await updateDoc(userRef, {
                    fontPreferences: finalPrefs
                  });
                  console.log('✅ Initial font preferences synced to Firebase for user:', currentUser.uid);
                } catch (error) {
                  console.error('❌ Error syncing initial font preferences to Firebase:', error);
                }
              }
              // Priority 4: Use defaults only if nothing exists
              else {
                finalPrefs = {
                  fontSize: '14px',
                  fontColor: '#333333',
                  fontFamily: 'inherit',
                  isBold: false,
                  isItalic: false,
                  isUnderline: false,
                  isStrikethrough: false
                };
                console.log('✅ Using default font preferences in App.jsx:', finalPrefs);
              }

              // Apply final preferences consistently
              if (finalPrefs) {
                // Set global window object for immediate access
                window.chatFontPreferences = finalPrefs;

                // Update localStorage with all properties
                try {
                  localStorage.setItem('fontPrefsSource', 'firebase');
                  localStorage.setItem('fontPrefsUserId', currentUser.uid);
                  localStorage.setItem('fontPrefsLastUpdate', Date.now().toString());
                  localStorage.setItem('chatFontSize', finalPrefs.fontSize);
                  localStorage.setItem('chatFontColor', finalPrefs.fontColor);
                  localStorage.setItem('chatFontFamily', finalPrefs.fontFamily);
                  localStorage.setItem('chatIsBold', finalPrefs.isBold.toString());
                  localStorage.setItem('chatIsItalic', finalPrefs.isItalic.toString());
                  localStorage.setItem('chatIsUnderline', finalPrefs.isUnderline.toString());
                  localStorage.setItem('chatIsStrikethrough', finalPrefs.isStrikethrough.toString());

                  console.log('✅ All font preferences saved to localStorage:', finalPrefs);
                } catch (error) {
                  console.error('❌ Error saving font preferences to localStorage:', error);
                }

                // Apply font styles to messages immediately
                setTimeout(() => {
                  const messageElements = document.querySelectorAll('.message-body p, .message-text, .mock-message-text');
                  messageElements.forEach(element => {
                    element.style.fontSize = finalPrefs.fontSize;
                    element.style.color = finalPrefs.fontColor;
                    element.style.fontFamily = finalPrefs.fontFamily;
                    element.style.fontWeight = finalPrefs.isBold ? 'bold' : 'normal';
                    element.style.fontStyle = finalPrefs.isItalic ? 'italic' : 'normal';
                    element.style.textDecoration = [
                      finalPrefs.isUnderline ? 'underline' : '',
                      finalPrefs.isStrikethrough ? 'line-through' : ''
                    ].filter(Boolean).join(' ') || 'none';
                  });
                }, 100);

                console.log('✅ Font styling applied in App.jsx');
              }

              // Apply other user settings to localStorage
              if (profile.settings) {
                Object.entries(profile.settings).forEach(([key, value]) => {
                  localStorage.setItem(key, value.toString());
                });
              }
            }
          }
          setLoading(false);
        });

        // Setup online presence
        const userStatusRef = ref(rtdb, `/status/${currentUser.uid}`);
        onValue(ref(rtdb, '.info/connected'), (snapshot) => {
            if (snapshot.val() === false) return;
            const onlineData = { state: 'online', last_changed: serverTimestamp() };
            onDisconnect(userStatusRef).set({ state: 'offline', last_changed: serverTimestamp() })
                .then(() => set(userStatusRef, onlineData));
        });

        // Store unsubscribe functions globally for cleanup
        window.cleanupFirestoreListeners = () => {
          try {
            unsubscribeProfile();
            if (unsubscribeAuthCheck) unsubscribeAuthCheck();
            console.log('Firestore listeners cleaned up');
          } catch (error) {
            console.log('Error cleaning up listeners:', error);
          }
        };

        return () => {
          try {
            unsubscribeProfile();
            if (unsubscribeAuthCheck) unsubscribeAuthCheck();
            if (window.cleanupFirestoreListeners) {
              delete window.cleanupFirestoreListeners;
            }
          } catch (error) {
            console.log('Error during listener cleanup:', error);
          }
        };
      } else {
        // Clear guest data if no authenticated user and no guest session
        localStorage.removeItem('guestUser');
        localStorage.removeItem('isGuest');

        // Preserve ALL font preferences across logout/login - NEVER reset them
        const savedFontPrefs = {
          fontSize: localStorage.getItem('chatFontSize'),
          fontColor: localStorage.getItem('chatFontColor'),
          fontFamily: localStorage.getItem('chatFontFamily'),
          isBold: localStorage.getItem('chatIsBold') === 'true',
          isItalic: localStorage.getItem('chatIsItalic') === 'true',
          isUnderline: localStorage.getItem('chatIsUnderline') === 'true',
          isStrikethrough: localStorage.getItem('chatIsStrikethrough') === 'true'
        };

        // Always preserve existing font preferences
        const hasAnyFontPrefs = savedFontPrefs.fontSize || savedFontPrefs.fontColor || savedFontPrefs.fontFamily ||
            localStorage.getItem('chatIsBold') !== null || localStorage.getItem('chatIsItalic') !== null ||
            localStorage.getItem('chatIsUnderline') !== null || localStorage.getItem('chatIsStrikethrough') !== null;

        if (hasAnyFontPrefs) {
          const preservedPrefs = {
            fontSize: savedFontPrefs.fontSize || '14px',
            fontColor: savedFontPrefs.fontColor || '#333333',
            fontFamily: savedFontPrefs.fontFamily || 'inherit',
            isBold: Boolean(savedFontPrefs.isBold),
            isItalic: Boolean(savedFontPrefs.isItalic),
            isUnderline: Boolean(savedFontPrefs.isUnderline),
            isStrikethrough: Boolean(savedFontPrefs.isStrikethrough)
          };

          window.chatFontPreferences = preservedPrefs;
          console.log('✅ Font preferences preserved across logout:', preservedPrefs);

          // Mark as preserved for next login
          localStorage.setItem('fontPrefsPreserved', 'true');
        } else {
          // Set basic defaults only if no preferences exist at all
          const defaultPrefs = {
            fontSize: '14px',
            fontColor: '#333333',
            fontFamily: 'inherit',
            isBold: false,
            isItalic: false,
            isUnderline: false,
            isStrikethrough: false
          };

          window.chatFontPreferences = defaultPrefs;
          console.log('✅ Default font preferences set for logged out user:', defaultPrefs);
        }

        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth(); // Cleanup auth listener
      if (window.cleanupFirestoreListeners) {
        window.cleanupFirestoreListeners();
      }
    };
  }, []);


  useEffect(() => {
    const storedTheme = localStorage.getItem('selectedTheme') || 'light';

    // Remove all theme classes
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-nord', 'theme-tokyo', 'theme-monokai', 'theme-dracula', 'theme-cyberpunk', 'theme-ocean', 'theme-sunset');

    // Add the stored theme class
    document.body.classList.add(`theme-${storedTheme}`);

    // Apply dark-mode class for dark themes
    const isDarkTheme = ['dark', 'nord', 'tokyo', 'monokai', 'dracula', 'cyberpunk', 'ocean', 'sunset'].includes(storedTheme);
    if (isDarkTheme) {
      document.body.classList.add('dark-mode');
    }

    // Add global error handler for uncaught Firestore errors
    const handleGlobalError = (event) => {
      const error = event.error || event.reason;
      if (error?.message?.includes('FIRESTORE') && error?.message?.includes('INTERNAL ASSERTION FAILED')) {
        console.log('Global Firestore error detected, reloading page...');
        event.preventDefault();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, []);

  // Guest user authentication helper
  useEffect(() => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const guestData = localStorage.getItem('guestUser');

    if (isGuest && guestData && !user) {
      try {
        const parsedGuestData = JSON.parse(guestData);
        setUser({ 
          isGuest: true,
          uid: parsedGuestData.uid,
          displayName: parsedGuestData.displayName,
          ...parsedGuestData 
        });
        console.log('✅ Guest user authenticated from localStorage:', parsedGuestData.displayName);
      } catch (error) {
        console.error('❌ Error parsing guest data:', error);
        localStorage.removeItem('guestUser');
        localStorage.removeItem('isGuest');
      }
    }
  }, [user]);

  // Set up global font preference functions
  useEffect(() => {
    // Set up global functions for font preferences
    window.setFontPreference = (key, value) => {
      console.log(`🎨 Setting font preference ${key}:`, value);

      const currentPrefs = window.chatFontPreferences || fontPreferences;
      const newPreferences = { ...currentPrefs, [key]: value };
      setFontPreferences(newPreferences);
      window.chatFontPreferences = newPreferences;

      // Save to localStorage immediately
      localStorage.setItem('fontPreferences', JSON.stringify(newPreferences));

      // Save to Firebase if user is logged in
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        try {
          updateDoc(doc(db, 'users', auth.currentUser.uid), {
            fontPreferences: newPreferences
          });
          console.log('✅ Font preferences saved to Firebase');
        } catch (error) {
          console.error('❌ Error saving font preferences to Firebase:', error);
        }
      }
    };

    window.getFontPreferences = () => window.chatFontPreferences || fontPreferences;

    // Initialize username styling system
    const initializeUsernameSystem = async () => {
      try {
        const { applyUsernameStyles, loadAllGlobalUsernameStyles } = await import('./utils/usernamePreferences');

        // Load all users' styles first
        loadAllGlobalUsernameStyles();

        // Also load all users' message styles
        const { loadAllGlobalMessageStyles } = await import('./utils/messageTextPreferences');
        loadAllGlobalMessageStyles();

        // Apply username styles for current user if logged in
        if (user && userProfile) {
          setTimeout(() => {
            applyUsernameStyles(userProfile);
          }, 500);
        }

        console.log('✅ Username styling system initialized');
      } catch (error) {
        console.error('❌ Error initializing username system:', error);
      }
    };

    // Initialize immediately for faster loading, with shorter delay
    setTimeout(initializeUsernameSystem, 100); // Reduced from 1000ms to 100ms

    // Make styling functions globally available
    window.auth = auth;

    console.log('✅ App initialized with complete username styling system for all users');
  }, [fontPreferences, user, userProfile]);

  // Applying the font styles and settings up a mutation observer
  const applyFontStylesToMessages = (fontPrefs) => {
        if (!fontPrefs) {
            fontPrefs = window.chatFontPreferences || {
                fontSize: '14px',
                fontColor: '#333333',
                fontFamily: 'inherit',
                isBold: false,
                isItalic: false,
                isUnderline: false,
                isStrikethrough: false
            };
        }

        const messageElements = document.querySelectorAll('.message-text, .mock-message-text');
        messageElements.forEach(element => {
            element.style.fontSize = fontPrefs.fontSize;
            element.style.color = fontPrefs.fontColor;
            element.style.fontFamily = fontPrefs.fontFamily;
            element.style.fontWeight = fontPrefs.isBold ? 'bold' : 'normal';
            element.style.fontStyle = fontPrefs.isItalic ? 'italic' : 'normal';
            element.style.textDecoration = [
                fontPrefs.isUnderline ? 'underline' : '',
                fontPrefs.isStrikethrough ? 'line-through' : ''
            ].filter(Boolean).join(' ') || 'none';
        });
    };

  const handleVPNRetry = async () => {
    setVpnChecking(true);
    setVpnBlocked(false);

    try {
      console.log('🔄 Retrying VPN check...');
      const vpnResult = await checkUserVPN();
      console.log('🔄 Retry VPN result:', vpnResult);

      setVpnInfo(vpnResult);

      if (!vpnResult.allowed) {
        setVpnBlocked(true);
      }
    } catch (error) {
      console.error('❌ VPN retry failed:', error);
      // On error, allow access
      setVpnBlocked(false);
    } finally {
      setVpnChecking(false);
    }
  };

  // Show VPN checking screen
  if (vpnChecking) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        fontSize: '18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#3b82f6"/>
          </svg>
        </div>
        <div>Checking network security...</div>
        <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '10px' }}>
          Verifying your connection for safe access
        </div>
      </div>
    );
  }

  // Show VPN block modal if VPN detected
  if (vpnBlocked) {
    return <VPNBlockModal vpnInfo={vpnInfo} onRetry={handleVPNRetry} />;
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px' }}>
        Loading Application...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<AuthRoute user={user}><SignupPage /></AuthRoute>} />
        <Route path="/login" element={<AuthRoute user={user}><LoginPage /></AuthRoute>} />
        <Route path="/forgot-password" element={<AuthRoute user={user}><ForgotPasswordPage /></AuthRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ✅ FIX: Pass 'profile' to all ProtectedRoutes for consistency */}
        <Route path="/rooms" element={<ProtectedRoute user={user} profile={userProfile}><RoomListPage /></ProtectedRoute>} />
        <Route path="/room/:roomId" element={<ProtectedRoute user={user} profile={userProfile}><ErrorBoundary><HomePage user={user} /></ErrorBoundary></ProtectedRoute>} />



        {/* This route is now fully corrected */}
        <Route
          path="/admin-panel"
          element={
            <ProtectedRoute user={user} profile={userProfile}>
              <AdminPanelPage />
            </ProtectedRoute>
          }
        />


        {/* Welcome Dashboard route */}
        <Route path="/welcome" element={<ProtectedRoute user={user} profile={userProfile}><WelcomeDashboard /></ProtectedRoute>} />

        {/* Landing Page route */}
        <Route path="/landing" element={<LandingPage />} />

        {/* New routes for About, Privacy, Terms, Disclaimer, Contact, FAQ */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FAQPage />} />

        {/* Redirect all room pages to welcome dashboard on reload */}
        <Route path="/room/*" element={user ? <Navigate to="/welcome" replace /> : <Navigate to="/" replace />} />
        <Route path="/indian-room" element={user ? <Navigate to="/welcome" replace /> : <Navigate to="/" replace />} />
        <Route path="/universal-room" element={user ? <Navigate to="/welcome" replace /> : <Navigate to="/" replace />} />
        <Route path="/indian" element={user ? <Navigate to="/welcome" replace /> : <Navigate to="/" replace />} />
        <Route path="/universal" element={user ? <Navigate to="/welcome" replace /> : <Navigate to="/" replace />} />

        {/* Default route */}
        <Route path="/" element={user
          ? <Navigate to="/welcome" replace />
          : <LandingPage />
        } />
      </Routes>


      {/* Removed ToastContainer - using StylishConfirmationDialogue for moderation actions */}

      {/* Global Ban Modal - Forceful and Unbypassable */}
      {showBanModal && (
        <BanKickModal
          isVisible={showBanModal}
          banInfo={banModalData}
          onClose={() => {
            // Prevent modal from closing for banned users
            console.log("🚫 Attempted to close ban modal - BLOCKED");
            setShowBanModal(true);
          }}
        />
      )}
    </BrowserRouter>
  );
}

export default App;

// Initialize basic font system
    const initFontSystem = () => {
      try {
        // Set up basic font preferences from localStorage
        const savedFontPrefs = {
          fontSize: localStorage.getItem('chatFontSize') || '14px',
          fontColor: localStorage.getItem('chatFontColor') || '#333333',
          fontFamily: localStorage.getItem('chatFontFamily') || 'inherit',
          isBold: localStorage.getItem('chatIsBold') === 'true',
          isItalic: localStorage.getItem('chatIsItalic') === 'true',
          isUnderline: localStorage.getItem('chatIsUnderline') === 'true',
          isStrikethrough: localStorage.getItem('chatIsStrikethrough') === 'true'
        };

        window.chatFontPreferences = savedFontPrefs;
        console.log('✅ Basic font system initialized');
      } catch (error) {
        console.error('Error initializing font system:', error);
      }
    };

    initFontSystem();