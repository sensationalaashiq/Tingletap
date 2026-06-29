// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
import { auth, rtdb, db } from './firebase/config';
import { ref, onValue, set, onDisconnect, serverTimestamp, remove, get, update } from "firebase/database";
import { doc, onSnapshot, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

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
import RoomSlugPage from './pages/RoomSlugPage';

import ProtectedRoute from './components/ProtectedRoute';
import AuthRoute from './components/AuthRoute';
import ErrorBoundary from './components/ErrorBoundary';
import VPNBlockModal from './components/VPNBlockModal';

// Removed toast notifications
import { checkUserVPN } from './utils/vpnDetection';
import { getStoredGuestGender } from './utils/roleUtils';
import { initializeUsernameStyles, clearAllUsernameStyles, syncAllUsersStyles } from './utils/usernamePreferences';
import { initializeGlobalMessageStyles, clearAllMessageStyles, syncAllUsersMessageStyles } from './utils/messageTextPreferences';
import BanKickModal from './components/BanKickModal';
import './App.css';
import './styles/DarkMode.css';

function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vpnBlocked, setVpnBlocked] = useState(false);
  const [vpnInfo, setVpnInfo] = useState(null);
  const [vpnChecking, setVpnChecking] = useState(true);
  const [fontPreferences, setFontPreferences] = useState({
    fontSize: '8px',
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
      // Always start with defaults — per-account styles are loaded from Firestore on login
      const defaultPrefs = {
        fontSize: '8px',
        fontColor: '#333333',
        fontFamily: 'inherit',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        isStrikethrough: false
      };
      window.chatFontPreferences = defaultPrefs;
    };

    initializeFontPreferences();

    // Ultra-fast theme application — only light / dark
    const applyTheme = (theme) => {
      const themeClasses = ['theme-light', 'theme-dark', 'dark-mode'];

      // Remove all theme classes instantly
      document.documentElement.className = document.documentElement.className
        .split(' ')
        .filter(cls => !themeClasses.includes(cls))
        .join(' ');

      const isDark = theme === 'dark';
      const classesToAdd = [`theme-${isDark ? 'dark' : 'light'}`];
      if (isDark) classesToAdd.push('dark-mode');

      document.documentElement.classList.add(...classesToAdd);
      document.body.className = document.body.className
        .split(' ')
        .filter(cls => !themeClasses.includes(cls))
        .concat(classesToAdd)
        .join(' ');

      return isDark;
    };

    applyTheme('light');

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Start global style listeners now that the user is authenticated.
        // These require auth and must never run before login.
        initializeUsernameStyles();
        initializeGlobalMessageStyles();
        // Sync all users' saved styles from the users collection (has proper Firestore permissions)
        setTimeout(() => {
          syncAllUsersStyles();
          syncAllUsersMessageStyles();
        }, 500);

        // Capture and store real IP address for admin panel
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const { ip } = await ipRes.json();
          if (ip) {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
              lastIP: ip,
              lastIPUpdate: new Date().toISOString()
            });
          }
        } catch (e) {
          console.log('IP capture skipped:', e.message);
        }

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
              // If this is an anonymous (guest) Firebase user, ensure the profile
              // always carries isGuest + role + gender so every downstream
              // component (Sidebar, SettingsSidebar, etc.) shows Purush/Stree/Navrang
              // instead of "Member".
              const resolvedProfile = currentUser.isAnonymous
                ? {
                    ...profile,
                    isGuest: true,
                    role: 'guest',
                    gender: profile.gender || getStoredGuestGender(),
                  }
                : profile;
              setUserProfile(resolvedProfile);

              // Apply user's saved theme from profile with optimization
              const userTheme = profile.selectedTheme || profile.settings?.selectedTheme || 'light';
              const currentTheme = localStorage.getItem('selectedTheme');

              if (userTheme !== currentTheme) {
                localStorage.setItem('selectedTheme', userTheme);
                applyTheme(userTheme);
              }

              // Load this account's message font preferences from Firestore (source of truth)
              // Never use localStorage — styles are per-account and must not bleed across sessions
              let finalPrefs = null;

              if (profile.messageFontPreferences) {
                finalPrefs = {
                  fontSize: profile.messageFontPreferences.fontSize || '8px',
                  fontColor: profile.messageFontPreferences.fontColor || '#333333',
                  fontFamily: profile.messageFontPreferences.fontFamily || 'inherit',
                  isBold: Boolean(profile.messageFontPreferences.isBold),
                  isItalic: Boolean(profile.messageFontPreferences.isItalic),
                  isUnderline: Boolean(profile.messageFontPreferences.isUnderline),
                  isStrikethrough: Boolean(profile.messageFontPreferences.isStrikethrough)
                };
              } else if (profile.fontPreferences) {
                finalPrefs = {
                  fontSize: profile.fontPreferences.fontSize || '8px',
                  fontColor: profile.fontPreferences.fontColor || '#333333',
                  fontFamily: profile.fontPreferences.fontFamily || 'inherit',
                  isBold: Boolean(profile.fontPreferences.isBold),
                  isItalic: Boolean(profile.fontPreferences.isItalic),
                  isUnderline: Boolean(profile.fontPreferences.isUnderline),
                  isStrikethrough: Boolean(profile.fontPreferences.isStrikethrough)
                };
              } else {
                finalPrefs = {
                  fontSize: '8px',
                  fontColor: '#333333',
                  fontFamily: 'inherit',
                  isBold: false,
                  isItalic: false,
                  isUnderline: false,
                  isStrikethrough: false
                };
              }

              // Set global window object — no localStorage
              window.chatFontPreferences = finalPrefs;
              console.log('✅ Font preferences loaded from Firestore for account:', currentUser.uid, finalPrefs);

              // Apply other user settings to localStorage (non-style settings only)
              if (profile.settings) {
                const styleKeys = new Set([
                  'chatFontSize','chatFontColor','chatFontFamily','chatIsBold','chatIsItalic',
                  'chatIsUnderline','chatIsStrikethrough','messageFontPreferences','fontPreferences',
                  'fontPrefsSource','fontPrefsUserId','fontPrefsLastUpdate','fontPrefsPreserved',
                  'usernameFontSize','usernameFontColor','usernameFontFamily','usernameIsBold',
                  'usernameIsItalic','usernameIsUnderline','usernameIsStrikethrough',
                  'usernameFontPreferences','allUsersUsernameStyles','allGlobalMessageStyles'
                ]);
                Object.entries(profile.settings).forEach(([key, value]) => {
                  if (!styleKeys.has(key)) localStorage.setItem(key, value.toString());
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

        // One-time stale session cleanup: mark any status entry older than 8 min as offline
        const cleanupStaleStatuses = async () => {
          try {
            const statusSnap = await get(ref(rtdb, 'status'));
            if (!statusSnap.exists()) return;
            const statuses = statusSnap.val();
            const STALE_MS = 8 * 60 * 1000;
            const now = Date.now();
            const updates = {};
            Object.entries(statuses).forEach(([uid, s]) => {
              if (s?.state === 'online' && s?.last_changed && (now - s.last_changed) > STALE_MS) {
                updates[`status/${uid}/state`] = 'offline';
                updates[`status/${uid}/last_changed`] = now;
              }
            });
            if (Object.keys(updates).length > 0) {
              await update(ref(rtdb), updates);
            }
          } catch (e) {
            // Silently ignore cleanup errors
          }
        };
        cleanupStaleStatuses();

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
        // Only clear guest data if there is truly no active guest session.
        // Do NOT wipe it here when Firebase fires null briefly during anonymous-auth
        // restore on page reload — the anonymous session will re-resolve moments later.
        const hasActiveGuestSession = localStorage.getItem('isGuest') === 'true'
          && localStorage.getItem('guestUser') !== null;
        if (!hasActiveGuestSession) {
          localStorage.removeItem('guestUser');
          localStorage.removeItem('isGuest');
          // NOTE: Do NOT remove guestGender here — it may be set synchronously
          // at the start of a new guest login before signInAnonymously resolves.
          // guestGender is only cleared by explicit logout handlers.
        }

        // On logout/account-switch: clear ALL style data so the next account starts clean
        // Styles are per-account; they must never bleed across sessions or devices
        clearAllUsernameStyles();
        clearAllMessageStyles();
        window.chatFontPreferences = { fontSize: '8px', fontColor: '#333333', fontFamily: 'inherit', isBold: false, isItalic: false, isUnderline: false, isStrikethrough: false };
        // Clear all style-related localStorage keys
        [
          'usernameFontPreferences','messageFontPreferences','fontPreferences',
          'allUsersUsernameStyles','allGlobalUsernameStyles','allGlobalMessageStyles',
          'chatFontSize','chatFontColor','chatFontFamily','chatIsBold','chatIsItalic',
          'chatIsUnderline','chatIsStrikethrough','fontPrefsSource','fontPrefsUserId',
          'fontPrefsLastUpdate','fontPrefsPreserved','usernameFontSize','usernameFontColor',
          'usernameFontFamily','usernameIsBold','usernameIsItalic','usernameIsUnderline',
          'usernameIsStrikethrough','usernameGradientEnabled','usernameGradientStart',
          'usernameGradientEnd','usernameGradientDirection','usernameTextShadow',
          'usernameLetterSpacing','usernameAnimationEnabled','usernameAnimationType',
          'usernameAnimationDuration','usernameOutlineEnabled','usernameOutlineColor','usernameOutlineSize'
        ].forEach(key => localStorage.removeItem(key));
        console.log('✅ All style data cleared on logout — next account will load its own styles');

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
    document.body.classList.remove('theme-light', 'theme-dark', 'dark-mode');
    document.documentElement.classList.remove('theme-light', 'theme-dark', 'dark-mode');

    // Only light/dark supported
    const resolvedTheme = storedTheme === 'dark' ? 'dark' : 'light';
    document.body.classList.add(`theme-${resolvedTheme}`);
    document.documentElement.classList.add(`theme-${resolvedTheme}`);

    const isDarkTheme = resolvedTheme === 'dark';
    if (isDarkTheme) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
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
        localStorage.removeItem('guestGender');
      }
    }
  }, [user]);

  // 5-minute inactivity auto-logout for guest users
  useEffect(() => {
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes
    let inactivityTimer = null;

    const cleanupGuestAndLogout = async () => {
      const isGuest = localStorage.getItem('isGuest') === 'true';
      if (!isGuest) return;
      try {
        const cu = auth.currentUser;
        if (cu?.isAnonymous) {
          const uid = cu.uid;
          try { await remove(ref(rtdb, `status/${uid}`)); } catch {}
          // Mark guest session as ended; auto-delete after 1 hour
          try {
            const endTime = new Date().toISOString();
            const deleteAt = new Date(Date.now() + 3600 * 1000).toISOString();
            await updateDoc(doc(db, 'guestSessions', uid), {
              sessionEnded: endTime,
              deleteAt,
              status: 'ended'
            });
          } catch {}
          try { await deleteDoc(doc(db, 'users', uid)); } catch {}
          try { await deleteUser(cu); } catch {}
        }
        localStorage.removeItem('guestUser');
        localStorage.removeItem('isGuest');
        localStorage.removeItem('guestGender');
        setUser(null);
        setUserProfile(null);
        window.location.href = '/';
      } catch (err) {
        console.error('Guest auto-logout error:', err);
        localStorage.removeItem('guestUser');
        localStorage.removeItem('isGuest');
        localStorage.removeItem('guestGender');
        window.location.href = '/';
      }
    };

    const resetTimer = () => {
      if (localStorage.getItem('isGuest') !== 'true') return;
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(cleanupGuestAndLogout, INACTIVITY_LIMIT);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    const handleActivity = () => {
      if (localStorage.getItem('isGuest') === 'true') {
        resetTimer();
      }
    };

    // Only start the timer if this is a guest session
    if (localStorage.getItem('isGuest') === 'true') {
      activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
      resetTimer();
    }

    // Re-check when user state changes (guest logs in)
    const checkGuest = () => {
      if (localStorage.getItem('isGuest') === 'true') {
        activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
        resetTimer();
      }
    };
    checkGuest();

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
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
                fontSize: '8px',
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

        {/* Slug-based room routes — e.g. /r/indian-chat, /r/adult-chat */}
        <Route path="/r/:roomSlug" element={<ProtectedRoute user={user} profile={userProfile}><RoomSlugPage user={user} /></ProtectedRoute>} />

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
        // Always use defaults — account-specific styles are loaded from Firestore on login
        if (!window.chatFontPreferences) {
          window.chatFontPreferences = {
            fontSize: '8px',
            fontColor: '#333333',
            fontFamily: 'inherit',
            isBold: false,
            isItalic: false,
            isUnderline: false,
            isStrikethrough: false
          };
        }
        console.log('✅ Basic font system initialized');
      } catch (error) {
        console.error('Error initializing font system:', error);
      }
    };

    initFontSystem();