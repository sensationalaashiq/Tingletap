import React, { useState, useEffect } from 'react';
import {signInWithEmailAndPassword, setPersistence, browserLocalPersistence, signInAnonymously } from "firebase/auth";
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import BanKickModal from '../components/BanKickModal';
import IPBanModal from '../components/IPBanModal';
import { IPBanSystem } from '../utils/ipBanSystem';
import './LandingPage.css';

// GLOBAL ALERT BLOCKING - Block immediately when file loads

// Store original functions
const originalAlert = window.alert;
const originalConfirm = window.confirm;
const originalPrompt = window.prompt;

// AGGRESSIVELY block ALL browser dialogs
window.alert = function(...args) {
  return undefined;
};

window.confirm = function(...args) {
  return false;
};

window.prompt = function(...args) {
  return null;
};

// Also block common variations
window.showAlert = window.alert;
window.showModalDialog = () => null;

// Block document methods that could show alerts
if (typeof document !== 'undefined') {
  const originalWrite = document.write;
  document.write = function(...args) {
    return undefined;
  };
}

const LoginPage = () => {
  // IMMEDIATELY block ALL browser alerts at component initialization
  useState(() => {
    window.alert = () => {
      return undefined;
    };
    window.confirm = () => {
      return false;
    };
    window.prompt = () => {
      return null;
    };
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestFormData, setGuestFormData] = useState({
    displayName: '',
    age: '',
    gender: ''
  });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaError, setCaptchaError] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [banModalData, setBanModalData] = useState(null);

  // IP Ban states
  const [showIPBanModal, setShowIPBanModal] = useState(false);
  const [ipBanData, setIPBanData] = useState(null);
  const [ipCheckPerformed, setIPCheckPerformed] = useState(false);

  const navigate = useNavigate();

  // Check for IP ban and user ban immediately on LoginPage load
  useEffect(() => {
    const checkBansOnLoad = async () => {
      // First, check for IP ban (highest priority)
      if (!ipCheckPerformed) {
        try {
          console.log('🔍 IP Ban System: Checking user access on LoginPage...');
          const accessResult = await IPBanSystem.checkUserAccess(navigator.userAgent);

          setIPCheckPerformed(true);

          if (!accessResult.allowed && accessResult.reason === 'ip_banned') {
            console.log('🚫 IP Ban System: IP is banned, blocking access', accessResult.ip);
            setIPBanData(accessResult.banInfo);
            setShowIPBanModal(true);

            // Immediate IP ban lockdown (but preserve modal interactions)
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.userSelect = 'none';
            // Don't disable pointer events globally - let modal handle its own interactions

            // Continuous IP ban modal enforcement
            const ipBanInterval = setInterval(() => {
              setShowIPBanModal(true);
              setIPBanData(accessResult.banInfo);

              // Force IP ban modal visibility
              const ipModalElement = document.querySelector('.ip-ban-overlay');
              if (ipModalElement) {
                ipModalElement.style.zIndex = '2147483647';
                ipModalElement.style.display = 'flex';
                ipModalElement.style.visibility = 'visible';
                ipModalElement.style.opacity = '1';
                ipModalElement.style.pointerEvents = 'all';
              }
            }, 50);

            window.ipBanInterval = ipBanInterval;
            return; // Don't check user ban if IP is banned
          }

          console.log('✅ IP Ban System: IP access allowed', accessResult.ip);
        } catch (error) {
          console.error('❌ IP Ban System: Error checking IP ban', error);
          setIPCheckPerformed(true); // Allow continuation on error
        }
      }

      // Then check for user ban (if IP is allowed)
      const isBannedUser = localStorage.getItem('isBannedUser');
      if (isBannedUser === 'true') {

        const storedBanData = localStorage.getItem('userBanStatus');
        if (storedBanData) {
          try {
            const banData = JSON.parse(storedBanData);
            // Convert stored ISO string back to Date object
            if (banData.bannedAt) {
              banData.bannedAt = new Date(banData.bannedAt);
            }

            setBanModalData(banData);
            setShowBanModal(true);

            // Immediate lockdown
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none';

            // Continuous modal enforcement
            const loginBanInterval = setInterval(() => {
              setShowBanModal(true);
              setBanModalData(banData);

              // Force modal visibility
              const modalElement = document.querySelector('.ban-kick-modal-overlay');
              if (modalElement) {
                modalElement.style.zIndex = '2147483647';
                modalElement.style.display = 'flex';
                modalElement.style.visibility = 'visible';
                modalElement.style.opacity = '1';
                modalElement.style.pointerEvents = 'all';
              }
            }, 50);

            window.loginBanInterval = loginBanInterval;

          } catch (error) {
          }
        }
      }
    };

    checkBansOnLoad();
    setTimeout(checkBansOnLoad, 100);
  }, []);

  // Listen for auth state changes and banned users
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {

        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();

            if (userData.isBanned === true) {

              // Set ban modal data FIRST
              const banData = {
                reason: userData.banReason || "Account suspended due to policy violations",
                bannedBy: userData.bannedBy || "System Administrator", 
                bannedAt: userData.bannedAt ? userData.bannedAt.toDate() : new Date(),
                type: "account_banned",
                userId: user.uid,
                email: user.email
              };

              setBanModalData(banData);

              // IMMEDIATELY force modal display WITHOUT ANY DELAY
              setShowBanModal(true);
              setError('');
              setLoading(false);

              // Force sign out the banned user immediately
              await auth.signOut();

              // ULTRA-AGGRESSIVE modal forcing - multiple immediate attempts
              for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                  setShowBanModal(true);
                  setBanModalData(banData);

                  // Also force DOM manipulation
                  const modalElement = document.querySelector('.ban-kick-modal-overlay');
                  if (modalElement) {
                    modalElement.style.display = 'flex';
                    modalElement.style.zIndex = '2147483647';
                    modalElement.style.pointerEvents = 'all';
                    modalElement.style.opacity = '1';
                    modalElement.style.visibility = 'visible';
                  }
                }, i * 10); // Staggered attempts every 10ms
              }

              // Lock the page completely
              document.body.style.overflow = 'hidden';
              document.body.style.position = 'fixed';
              document.body.style.width = '100%';
              document.body.style.height = '100%';
              document.body.style.top = '0';
              document.body.style.left = '0';

              // Prevent navigation
              window.onbeforeunload = (e) => {
                e.preventDefault();
                e.returnValue = 'Account is suspended';
                return 'Account is suspended';
              };

              // Force URL to stay on login
              window.history.pushState(null, null, '/login');

              // ULTRA-CONTINUOUS modal forcing every 20ms for banned users
              const banModalInterval = setInterval(() => {
                setShowBanModal(true);
                setBanModalData(banData);

                // Lock page completely
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

                // Keep URL on login and block navigation
                if (window.location.pathname !== '/login') {
                  window.history.replaceState(null, null, '/login');
                }
              }, 20); // Much more frequent - every 20ms

              // Store interval globally
              window.banModalForceInterval = banModalInterval;

              return; // Don't proceed with normal login flow
            } else {
              // User is not banned, allow normal flow
            }
          } else {
          }
        } catch (error) {
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Password strength calculation
  const getPasswordStrength = (password) => {
    if (!password) return { level: 'none', text: '', score: 0 };

    let score = 0;
    let feedback = [];

    // Length check
    if (password.length >= 8) score += 25;
    else feedback.push('8+ characters');

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 25;
    else feedback.push('uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) score += 25;
    else feedback.push('lowercase letter');

    // Number check
    if (/\d/.test(password)) score += 25;
    else feedback.push('number');

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    else feedback.push('special character');

    // Length bonus
    if (password.length >= 12) score += 10;

    if (score >= 85) return { level: 'strong', text: 'Strong Password', score };
    if (score >= 60) return { level: 'medium', text: 'Medium Strength', score };
    if (score >= 30) return { level: 'weak', text: 'Weak Password', score };
    return { level: 'very-weak', text: 'Very Weak', score };
  };

  // Handle form submission with proper error messages
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Client-side validation
    if (!identifier.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      if (rememberMe) {
        await setPersistence(auth, browserLocalPersistence);
      }

      const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
      const user = userCredential.user;


      // Check if user is banned immediately after login
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      let isBanned = false;
      let userData = null;

      if (userSnap.exists()) {
        userData = userSnap.data();
        isBanned = userData.isBanned === true;
      }

      if (isBanned) {

        // Force sign out the banned user
        await auth.signOut();

        // Set ban modal data immediately
        const banData = {
          reason: userData.banReason || "Account suspended due to policy violations",
          bannedBy: userData.bannedBy || "System Administrator",
          bannedAt: userData.bannedAt ? userData.bannedAt.toDate() : new Date(),
          type: "account_banned",
          userId: user.uid,
          email: user.email
        };

        setBanModalData(banData);
        setShowBanModal(true);
        setError('');
        setLoading(false);

        // Force modal visibility
        setTimeout(() => {
          setShowBanModal(true);
          setBanModalData(banData);
        }, 50);

        // Lock the page
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';

        return; // Don't navigate away
      } else {
        // Store user IP for future IP banning capabilities
        try {
          console.log('💾 IP Ban System: Storing IP for successful login');
          await IPBanSystem.storeUserIP(user.uid, userData);
          console.log('✅ IP Ban System: IP stored successfully for user', user.uid);
        } catch (ipError) {
          console.warn('⚠️ IP Ban System: Failed to store IP for user', user.uid, ipError);
          // Don't block login if IP storage fails
        }

        navigate('/welcome');
      }
    } catch (err) {

      // Block alerts during error handling
      window.alert = () => {
        return undefined;
      };

      // Custom error messages instead of Firebase errors
      let errorMessage = 'Login failed. Please try again.';

      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (err.code === 'auth/user-disabled') {

        // Set ban modal data for disabled user
        setBanModalData({
          reason: "Account has been disabled by administration",
          bannedBy: "System Administrator",
          bannedAt: new Date(),
          type: "account_disabled",
          userId: identifier,
          email: identifier
        });

        // Clear error and show modal
        setError('');
        setLoading(false);
        setShowBanModal(true);

        // Lock page for disabled user
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';

        return;
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle guest login
  const handleAnonymousLogin = () => {
    setShowGuestModal(true);
  };

  const handleGuestFormSubmit = async (e) => {
    e.preventDefault();

    if (!guestFormData.displayName.trim()) {
      setError('Please enter your display name');
      return;
    }

    if (!guestFormData.age || guestFormData.age < 13 || guestFormData.age > 100) {
      setError('Age must be between 13 and 100');
      return;
    }

    if (!guestFormData.gender) {
      setError('Please select your gender');
      return;
    }

    if (!captchaToken) {
      setError('Please complete the captcha verification');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      const guestUserData = {
        uid: user.uid,
        email: null,
        displayName: guestFormData.displayName,
        age: parseInt(guestFormData.age),
        gender: guestFormData.gender,
        role: 'guest',
        isAnonymous: true,
        isGuest: true,
        photoURL: `https://api.dicebear.com/8.x/adventurer/svg?seed=${guestFormData.displayName}&sex=${guestFormData.gender.toLowerCase()}`,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), guestUserData);

      // Store guest data in localStorage
      localStorage.setItem('guestUser', JSON.stringify(guestUserData));
      localStorage.setItem('isGuest', 'true');

      console.log('✅ Guest user created successfully:', guestUserData);

      // Navigate to welcome page
      navigate('/welcome');
    } catch (err) {
      console.error('❌ Guest login error:', err);
      setError('Guest login failed. Please try again.');
    } finally {
      setLoading(false);
      setShowGuestModal(false);
    }
  };

  const handleGuestInputChange = (e) => {
    const { name, value } = e.target;
    setGuestFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // hCaptcha handlers
  const onCaptchaVerify = (token) => {
    setCaptchaToken(token);
    setCaptchaError('');
  };

  const onCaptchaExpire = () => {
    setCaptchaToken(null);
    setCaptchaError('Captcha expired, please verify again');
  };

  const onCaptchaError = (err) => {
    setCaptchaToken(null);
    setCaptchaError('Captcha error, please try again');
  };

  // Reset guest modal state
  const resetGuestModal = () => {
    setShowGuestModal(false);
    setGuestFormData({ displayName: '', age: '', gender: '' });
    setError('');
    setCaptchaToken(null);
    setCaptchaError('');
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 50%, #E6E6FA 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      boxSizing: 'border-box'
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

          .login-container {
            background: rgba(15, 15, 35, 0.95);
            border-radius: 16px;
            padding: 15px;
            width: 100%;
            max-width: 340px;
            height: auto;
            max-height: 98vh;
            box-shadow: 
              0 25px 60px rgba(0, 0, 0, 0.4),
              0 8px 25px rgba(30, 60, 114, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 0 40px rgba(42, 82, 152, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.15);
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .login-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #2a5298, #1e3c72, #16213e, #1a1a2e, #2a5298);
            background-size: 400% 100%;
            animation: shimmer 4s ease-in-out infinite;
          }

          .login-container::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(42, 82, 152, 0.1) 0%, transparent 70%);
            animation: floating-glow 6s ease-in-out infinite;
            pointer-events: none;
          }

          @keyframes shimmer {
            0%, 100% { background-position: 400% 0; }
            50% { background-position: -400% 0; }
          }

          @keyframes floating-glow {
            0%, 100% { 
              transform: rotate(0deg) scale(1);
              opacity: 0.5;
            }
            33% { 
              transform: rotate(120deg) scale(1.1);
              opacity: 0.7;
            }
            66% { 
              transform: rotate(240deg) scale(0.9);
              opacity: 0.6;
            }
          }

          .logo {
            text-align: center;
            margin-bottom: 6px;
          }

          .logo h1 {
            font-size: 1.6rem;
            font-weight: 900;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #2a5298 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0;
            letter-spacing: -0.8px;
            text-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
          }

          .logo p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.75rem;
            margin: 3px 0 0 0;
            font-weight: 600;
            letter-spacing: 0.3px;
          }

          .form-group {
            margin-bottom: 6px;
            position: relative;
          }

          .form-label {
            display: block;
            margin-bottom: 4px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.8rem;
            letter-spacing: 0.2px;
          }

          .form-input {
            width: 100%;
            padding: 10px 14px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            font-size: 0.85rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.95);
            box-sizing: border-box;
            height: 40px;
          }

          .form-input:focus {
            outline: none;
            border-color: #4facfe;
            background: rgba(255, 255, 255, 0.12);
            box-shadow: 
              0 0 0 3px rgba(79, 172, 254, 0.2),
              0 6px 20px rgba(79, 172, 254, 0.15);
            transform: translateY(-1px);
          }

          .form-input::placeholder {
            color: rgba(255, 255, 255, 0.5);
          }

          .password-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            color: #6b7280;
            transition: color 0.2s ease;
            min-width: 40px;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            -webkit-tap-highlight-color: transparent;
          }

          .password-toggle:hover {
            color: #374151;
          }

          .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 6px 0;
            position: relative;
          }

          .checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.08);
            cursor: pointer;
            position: relative;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            appearance: none;
            -webkit-appearance: none;
            outline: none;
            box-shadow: 
              0 3px 12px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            overflow: hidden;
          }

          .checkbox:hover {
            border-color: #4facfe;
            background: rgba(79, 172, 254, 0.15);
            box-shadow: 
              0 6px 20px rgba(79, 172, 254, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
            transform: translateY(-2px) scale(1.05);
          }

          .checkbox:checked {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #2a5298 100%);
            border-color: #4facfe;
            box-shadow: 
              0 10px 30px rgba(79, 172, 254, 0.4),
              0 3px 12px rgba(0, 242, 254, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
            animation: premiumCheckboxPulse 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }

          @keyframes premiumCheckboxPulse {
            0% { 
              transform: scale(1); 
              box-shadow: 
                0 6px 20px rgba(79, 172, 254, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
            }
            50% { 
              transform: scale(1.15); 
              box-shadow: 
                0 12px 35px rgba(79, 172, 254, 0.5),
                0 4px 15px rgba(0, 242, 254, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.4);
            }
            100% { 
              transform: scale(1); 
              box-shadow: 
                0 10px 30px rgba(79, 172, 254, 0.4),
                0 3px 12px rgba(0, 242, 254, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.3);
            }
          }

          .checkbox:checked::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(255,255,255,0.2), transparent);
            border-radius: 4px;
          }

          .checkbox:checked::after {
            content: '✓';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 14px;
            font-weight: 900;
            text-shadow: 
              0 2px 4px rgba(0, 0, 0, 0.3),
              0 0 6px rgba(255, 255, 255, 0.5);
            animation: premiumCheckmarkAppear 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both;
          }

          @keyframes premiumCheckmarkAppear {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.2) rotate(-45deg);
            }
            60% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.2) rotate(0deg);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1) rotate(0deg);
            }
          }

          .checkbox-label {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.9);
            cursor: pointer;
            user-select: none;
            transition: all 0.3s ease;
            font-weight: 600;
            letter-spacing: 0.3px;
          }

          .checkbox-label:hover {
            color: #4facfe;
            text-shadow: 0 0 6px rgba(79, 172, 254, 0.4);
          }

          .primary-btn {
            width: 100%;
            padding: 10px 16px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #2a5298 100%);
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            min-height: 38px;
            -webkit-tap-highlight-color: transparent;
            overflow: hidden;
            box-shadow: 
              0 6px 20px rgba(79, 172, 254, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
            margin-bottom: 5px;
          }

          .primary-btn:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 
              0 10px 30px rgba(79, 172, 254, 0.4),
              0 3px 12px rgba(0, 242, 254, 0.3);
          }

          .primary-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }

          .secondary-btn {
            width: 100%;
            padding: 10px 14px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-top: 4px;
            min-height: 38px;
          }

          .secondary-btn:hover {
            border-color: #4facfe;
            color: #4facfe;
            background: rgba(79, 172, 254, 0.1);
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(79, 172, 254, 0.2);
          }

          .divider {
            display: flex;
            align-items: center;
            margin: 8px 0;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.75rem;
          }

          .divider::before,
          .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255, 255, 255, 0.2);
          }

          .divider span {
            padding: 0 12px;
            font-weight: 500;
          }

          .error-message {
            background: rgba(255, 100, 100, 0.1);
            border: 1px solid rgba(255, 100, 100, 0.3);
            color: #ff6464;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 0.85rem;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .forgot-link {
            display: block;
            text-align: center;
            color: #4facfe;
            text-decoration: none;
            font-size: 0.75rem;
            font-weight: 600;
            margin: 6px 0 4px 0;
            transition: all 0.3s ease;
          }

          .forgot-link:hover {
            color: #00f2fe;
            text-shadow: 0 0 6px rgba(0, 242, 254, 0.5);
          }

          .signup-link {
            text-align: center;
            margin-top: 6px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.8rem;
          }

          .signup-link a {
            color: #4facfe;
            text-decoration: none;
            font-weight: 700;
            transition: all 0.3s ease;
          }

          .signup-link a:hover {
            color: #00f2fe;
            text-shadow: 0 0 6px rgba(0, 242, 254, 0.5);
          }

          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 20px;
          }

          .modal {
            background: white;
            border-radius: 16px;
            padding: 25px;
            width: 100%;
            max-width: 350px;
            position: relative;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-close {
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            font-size: 1.3rem;
            cursor: pointer;
            color: #6b7280;
            padding: 4px;
            border-radius: 50%;
            transition: all 0.2s ease;
          }

          .modal-close:hover {
            background: #f3f4f6;
            color: #374151;
          }

          .modal-title {
            font-size: 1.3rem;
            font-weight: 700;
            color: #374151;
            text-align: center;
            margin-bottom: 20px;
          }

          .password-strength-indicator {
            margin-top: 6px;
            opacity: 0;
            animation: fadeInUp 0.3s ease-out forwards;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .strength-bar {
            height: 4px;
            background: #e5e7eb;
            border-radius: 2px;
            overflow: hidden;
            position: relative;
            margin-bottom: 6px;
          }

          .strength-fill {
            height: 100%;
            border-radius: 2px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }

          .strength-bar.strength-very-weak .strength-fill {
            width: 25%;
            background: linear-gradient(90deg, #ef4444, #dc2626);
          }

          .strength-bar.strength-weak .strength-fill {
            width: 50%;
            background: linear-gradient(90deg, #f59e0b, #d97706);
          }

          .strength-bar.strength-medium .strength-fill {
            width: 75%;
            background: linear-gradient(90deg, #eab308, #ca8a04);
          }

          .strength-bar.strength-strong .strength-fill {
            width: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            position: relative;
          }

          .strength-bar.strength-strong .strength-fill::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            animation: shimmer 2s infinite;
          }

          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
          }

          .strength-text {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .strength-label {
            font-size: 0.75rem;
            font-weight: 600;
            transition: color 0.3s ease;
          }

          .strength-label.strength-very-weak {
            color: #dc2626;
          }

          .strength-label.strength-weak {
            color: #d97706;
          }

          .strength-label.strength-medium {
            color: #ca8a04;
          }

          .strength-label.strength-strong {
            color: #059669;
          }

          .strength-icon {
            animation: checkmark 0.5s ease-out;
          }

          @keyframes checkmark {
            0% {
              transform: scale(0) rotate(45deg);
              opacity: 0;
            }
            50% {
              transform: scale(1.2) rotate(45deg);
              opacity: 1;
            }
            100% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }

          @media (max-width: 768px) {
            .login-container {
              max-width: 340px;
              padding: 18px;
              max-height: 98vh;
            }

            .logo h1 {
              font-size: 1.6rem;
            }

            .logo p {
              font-size: 0.75rem;
            }

            .form-input {
              padding: 10px 14px;
              font-size: 16px;
              height: 42px;
            }

            .primary-btn, .secondary-btn {
              padding: 12px;
              font-size: 0.9rem;
              min-height: 42px;
            }
          }

          @media (max-width: 480px) {
            .login-container {
              max-width: 320px;
              padding: 16px;
            }

            .logo h1 {
              font-size: 1.5rem;
            }

            .form-group {
              margin-bottom: 6px;
            }

            .checkbox-group {
              margin: 8px 0;
            }
          }

          @media (max-height: 700px) {
            .login-container {
              max-height: 98vh;
              padding: 15px;
            }

            .logo {
              margin-bottom: 8px;
            }

            .form-group {
              margin-bottom: 6px;
            }

            .checkbox-group {
              margin: 8px 0;
            }

            .divider {
              margin: 10px 0;
            }
          }

          @media (max-height: 600px) {
            .login-container {
              padding: 12px;
            }

            .logo h1 {
              font-size: 1.4rem;
            }

            .logo p {
              font-size: 0.7rem;
            }

            .form-group {
              margin-bottom: 5px;
            }

            .primary-btn, .secondary-btn {
              padding: 10px;
              min-height: 40px;
            }
          }

          /* Landing Page Premium Styling */
          .page-container {
            min-height: 100vh;
            max-width: 100vw;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 25%, #2c2c54 50%, #3d3d73 75%, #1a1a2e 100%);
            overflow-x: hidden;
            overflow-y: auto;
            box-sizing: border-box;
          }

          .login-container svg {
            color: #8b5cf6 !important;
            fill: #8b5cf6 !important;
            filter: drop-shadow(0 2px 8px rgba(139, 92, 246, 0.4));
          }

          .primary-btn svg,
          .secondary-btn svg {
            color: #ffffff !important;
            fill: #ffffff !important;
          }

          /* Guest Modal Styling - Matching RoomListPage */
          .guest-modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.85) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 999999999 !important;
            padding: 20px !important;
            animation: fadeIn 0.3s ease !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: all !important;
          }

          .guest-modal-content {
            background: linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 50%, #E6E6FA 100%) !important;
            border-radius: 24px !important;
            padding: 32px !important;
            width: 100% !important;
            max-width: 480px !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            position: relative !important;
            box-shadow: 
              0 25px 60px rgba(0, 0, 0, 0.4),
              0 8px 25px rgba(139, 92, 246, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
            border: 2px solid rgba(255, 255, 255, 0.5) !important;
            animation: slideUp 0.4s ease !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: all !important;
            z-index: 999999999 !important;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideUp {
            from { 
              opacity: 0;
              transform: translateY(40px) scale(0.95);
            }
            to { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .guest-modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid rgba(139, 92, 246, 0.3);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 24px;
            color: #8b5cf6;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
          }

          .guest-modal-close:hover {
            background: rgba(139, 92, 246, 0.9);
            color: white;
            transform: scale(1.1) rotate(90deg);
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
          }

          .guest-modal-header {
            text-align: center;
            margin-bottom: 28px;
          }

          .guest-modal-logo {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            margin-bottom: 16px;
            border: 3px solid white;
            box-shadow: 
              0 8px 24px rgba(139, 92, 246, 0.3),
              inset 0 2px 4px rgba(255, 255, 255, 0.5);
          }

          .guest-modal-title {
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(135deg, #8A2BE2 0%, #BA55D3 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0 0 8px 0;
            font-family: 'Playfair Display', serif;
          }

          .guest-modal-subtitle {
            font-size: 14px;
            color: #6b7280;
            margin: 0;
            font-weight: 500;
          }

          .guest-modal-form {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }

          .guest-form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .guest-form-label {
            font-size: 14px;
            font-weight: 700;
            color: #2d3748;
            letter-spacing: 0.3px;
          }

          .guest-form-input {
            padding: 14px 16px;
            border: 2px solid rgba(139, 92, 246, 0.2);
            border-radius: 12px;
            font-size: 15px;
            background: rgba(255, 255, 255, 0.9);
            color: #1f2937;
            transition: all 0.3s ease;
            font-family: inherit;
          }

          .guest-form-input:focus {
            outline: none;
            border-color: #8b5cf6;
            background: white;
            box-shadow: 
              0 0 0 4px rgba(139, 92, 246, 0.1),
              0 4px 12px rgba(139, 92, 246, 0.2);
            transform: translateY(-1px);
          }

          .guest-form-input::placeholder {
            color: #9ca3af;
          }

          .guest-captcha-wrapper {
            display: flex;
            justify-content: center;
            margin: 8px 0;
          }

          .guest-captcha-error {
            color: #dc2626;
            font-size: 13px;
            text-align: center;
            margin-top: 8px;
            padding: 8px 12px;
            background: rgba(220, 38, 38, 0.1);
            border-radius: 8px;
            border: 1px solid rgba(220, 38, 38, 0.2);
          }

          .guest-error-message {
            background: rgba(239, 68, 68, 0.15);
            border: 2px solid rgba(239, 68, 68, 0.3);
            color: #dc2626;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
          }

          .guest-error-message svg {
            flex-shrink: 0;
          }

          .guest-submit-btn {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 
              0 8px 24px rgba(139, 92, 246, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          .guest-submit-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
            transform: translateY(-2px);
            box-shadow: 
              0 12px 32px rgba(139, 92, 246, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }

          .guest-submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .guest-btn-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .guest-info-note {
            background: rgba(139, 92, 246, 0.08);
            border: 1.5px solid rgba(139, 92, 246, 0.2);
            border-radius: 12px;
            padding: 14px;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-top: 8px;
          }

          .guest-info-note svg {
            flex-shrink: 0;
          }

          .guest-info-note p {
            margin: 0;
            font-size: 13px;
            color: #4b5563;
            line-height: 1.5;
          }

          @media (max-width: 480px) {
            .guest-modal-content {
              padding: 24px;
              max-width: 95%;
            }

            .guest-modal-logo {
              width: 56px;
              height: 56px;
            }

            .guest-modal-title {
              font-size: 24px;
            }

            .guest-form-input {
              padding: 12px 14px;
              font-size: 16px;
            }
          }
        `}
      </style>

      <div className="login-container">
        <div className="logo">
          <img 
            src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" 
            alt="TingleTap Logo" 
            style={{
              width: '35px',
              height: '35px',
              borderRadius: '50%',
              marginBottom: '4px',
              border: '2px solid transparent',
              background: 'white, linear-gradient(45deg, #ff0080, #ff1493, #ff4081, #e91e63, #9c27b0, #8a2be2, #673ab7, #3f51b5, #2196f3, #00bcd4, #20b2aa, #009688, #4caf50, #32cd32, #8bc34a, #cddc39, #ffeb3b, #ffd700, #ffc107, #ff9800, #ff8c00, #ff5722, #f44336, #dc143c, #ff0080)',
              backgroundClip: 'padding-box, border-box',
              objectFit: 'contain',
              padding: '2px',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}
          />
          <h1>TingleTap</h1>
          <p>Welcome back! Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your email"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input"
                style={{ paddingRight: '45px' }}
                required
              />
              <div
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            {password && (
              <div className="password-strength-indicator">
                <div className={`strength-bar strength-${getPasswordStrength(password).level}`}>
                  <div className="strength-fill"></div>
                </div>
                <div className="strength-text">
                  <span className={`strength-label strength-${getPasswordStrength(password).level}`}>
                    {getPasswordStrength(password).text}
                  </span>
                  {getPasswordStrength(password).level === 'strong' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="strength-icon">
                      <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/>
                    </svg>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="checkbox"
            />
            <label htmlFor="rememberMe" className="checkbox-label">
              Remember me
            </label>
          </div>

          {error && (
            <div className="error-message">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 22h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="primary-btn"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="primary-btn"
            style={{ marginTop: '3px' }}
          >
            Create New Account
          </button>

          <Link to="/forgot-password" className="forgot-link">
            Forgot your password?
          </Link>

          <div className="divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            onClick={handleAnonymousLogin}
            className="secondary-btn"
          >
            Continue as Guest
          </button>
        </form>

        <div className="signup-link">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </div>
      </div>

      {/* Guest Modal */}
      {showGuestModal && (
        <div className="guest-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999999,
          display: 'flex',
          visibility: 'visible',
          opacity: 1,
          pointerEvents: 'all'
        }}>
          <div className="guest-modal-content" style={{
            position: 'relative',
            zIndex: 999999999,
            visibility: 'visible',
            opacity: 1,
            pointerEvents: 'all'
          }}>
            <button
              onClick={resetGuestModal}
              className="guest-modal-close"
            >
              ×
            </button>

            <div className="guest-modal-header">
              <img 
                src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" 
                alt="TingleTap Logo" 
                className="guest-modal-logo"
              />
              <h2 className="guest-modal-title">TingleTap Guest</h2>
              <p className="guest-modal-subtitle">Please provide your details to continue</p>
            </div>

            <form onSubmit={handleGuestFormSubmit} className="guest-modal-form">
              <div className="guest-form-group">
                <label className="guest-form-label">Display Name</label>
                <input
                  type="text"
                  name="displayName"
                  value={guestFormData.displayName}
                  onChange={handleGuestInputChange}
                  placeholder="Enter your display name"
                  className="guest-form-input"
                  required
                />
              </div>

              <div className="guest-form-group">
                <label className="guest-form-label">Age</label>
                <input
                  type="number"
                  name="age"
                  value={guestFormData.age}
                  onChange={handleGuestInputChange}
                  placeholder="Enter your age"
                  min="13"
                  max="100"
                  className="guest-form-input"
                  required
                />
              </div>

              <div className="guest-form-group">
                <label className="guest-form-label">Gender</label>
                <select
                  name="gender"
                  value={guestFormData.gender}
                  onChange={handleGuestInputChange}
                  className="guest-form-input"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="guest-form-group">
                <label className="guest-form-label">Security Verification</label>
                <div className="guest-captcha-wrapper">
                  <HCaptcha
                    sitekey="56aae798-c886-4ab0-a71e-987a23f26f12"
                    onVerify={onCaptchaVerify}
                    onExpire={onCaptchaExpire}
                    onError={onCaptchaError}
                    theme="light"
                  />
                </div>
                {captchaError && (
                  <div className="guest-captcha-error">{captchaError}</div>
                )}
              </div>

              {error && (
                <div className="guest-error-message">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 22h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !captchaToken}
                className="guest-submit-btn"
              >
                {loading ? (
                  <div className="guest-btn-spinner"></div>
                ) : (
                  'Continue as Guest'
                )}
              </button>
            </form>
            <div className="guest-info-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10-4.477-10-10-10zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z" fill="currentColor"/>
                <path d="M12 7a1 1 0 100 2 1 1 0 000-2zM12 13a1 1 0 00-1 1v3a1 1 0 002 0v-3a1 1 0 00-1-1z" fill="currentColor"/>
              </svg>
              <p>Your guest account is temporary. For a full experience, consider creating a permanent account.</p>
            </div>
          </div>
        </div>
      )}

      {/* Ban/Kick Modal - Force show for banned users */}
      {showBanModal && (
        <BanKickModal 
          isVisible={true}
          banInfo={banModalData}
          onClose={() => {

            // For banned users, prevent closing the modal completely
            if (banModalData && (banModalData.type === "account_banned" || banModalData.type === "login_blocked")) {

              // Force modal to stay open immediately
              setShowBanModal(true);

              // Keep page locked
              document.body.style.overflow = 'hidden';
              document.body.style.position = 'fixed';

              // Prevent any navigation
              window.history.pushState(null, null, '/login');

              return false; // Don't allow close
            }

            // For non-banned users (kicks, etc), allow normal close
            setShowBanModal(false);
            setBanModalData(null);
          }}
        />
      )}

      {/* IP Ban Modal - Force show for banned IPs */}
      {showIPBanModal && (
        <IPBanModal 
          banInfo={ipBanData}
          onRetry={async () => {
            console.log('🔄 IP Ban System: Retrying access check...');
            try {
              const accessResult = await IPBanSystem.checkUserAccess(navigator.userAgent);
              if (accessResult.allowed) {
                console.log('✅ IP Ban System: Access restored');
                setShowIPBanModal(false);
                setIPBanData(null);
                // Restore page functionality
                document.body.style.overflow = '';
                document.body.style.position = '';
                document.body.style.userSelect = '';
                document.body.style.pointerEvents = '';
                if (window.ipBanInterval) {
                  clearInterval(window.ipBanInterval);
                }
              } else {
                console.log('🚫 IP Ban System: Access still denied');
                toast.error('Your IP address is still banned from accessing this platform.');
              }
            } catch (error) {
              console.error('❌ IP Ban System: Error retrying access', error);
              toast.error('Error checking access. Please try again later.');
            }
          }}
        />
      )}
    </div>
  );
};

export default LoginPage;