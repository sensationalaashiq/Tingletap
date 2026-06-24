import React, { useState, useEffect } from 'react';
import {signInWithEmailAndPassword, setPersistence, browserLocalPersistence, signInAnonymously, updateProfile } from "firebase/auth";
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import BanKickModal from '../components/BanKickModal';
import IPBanModal from '../components/IPBanModal';
import { IPBanSystem } from '../utils/ipBanSystem';
import './LandingPage.css';

const originalAlert = window.alert;
const originalConfirm = window.confirm;
const originalPrompt = window.prompt;

window.alert = function(...args) { return undefined; };
window.confirm = function(...args) { return false; };
window.prompt = function(...args) { return null; };
window.showAlert = window.alert;
window.showModalDialog = () => null;

if (typeof document !== 'undefined') {
  document.write = function(...args) { return undefined; };
}

const EyeOpenSVG = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="eyeGradOpen" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#c084fc"/>
        <stop offset="60%" stopColor="#9b59d0"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </radialGradient>
      <radialGradient id="pupilGrad" cx="35%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#5b21b6"/>
        <stop offset="100%" stopColor="#3b0764"/>
      </radialGradient>
      <filter id="eyeGlow">
        <feGaussianBlur stdDeviation="0.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
      fill="url(#eyeGradOpen)" stroke="#9b59d0" strokeWidth="0.5" filter="url(#eyeGlow)"/>
    <ellipse cx="12" cy="12" rx="4.5" ry="4.5" fill="url(#pupilGrad)"/>
    <ellipse cx="12" cy="12" rx="2.2" ry="2.2" fill="#1e0a3c"/>
    <ellipse cx="10.5" cy="10.8" rx="0.9" ry="0.9" fill="rgba(255,255,255,0.7)"/>
    <ellipse cx="13.2" cy="11.4" rx="0.45" ry="0.45" fill="rgba(255,255,255,0.4)"/>
    <path d="M4 8.5C5.5 7 7.5 5.5 12 5C16.5 4.5 19.5 7 21 9" stroke="rgba(192,132,252,0.3)" strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M4 15.5C5.5 17 7.5 18.5 12 19C16.5 19.5 19.5 17 21 15" stroke="rgba(192,132,252,0.3)" strokeWidth="1" fill="none" strokeLinecap="round"/>
  </svg>
);

const EyeClosedSVG = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="eyeGradClosed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc"/>
        <stop offset="100%" stopColor="#9b59d0"/>
      </linearGradient>
    </defs>
    <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12" stroke="url(#eyeGradClosed)" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M3 16L5.5 13.5" stroke="url(#eyeGradClosed)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M8 18.5L9 15.5" stroke="url(#eyeGradClosed)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M12 19V16" stroke="url(#eyeGradClosed)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M16 18.5L15 15.5" stroke="url(#eyeGradClosed)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M21 16L18.5 13.5" stroke="url(#eyeGradClosed)" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="4" y1="4" x2="20" y2="20" stroke="url(#eyeGradClosed)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
  </svg>
);

const LoginPage = () => {
  useState(() => {
    window.alert = () => undefined;
    window.confirm = () => false;
    window.prompt = () => null;
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestFormData, setGuestFormData] = useState({ displayName: '', age: '', gender: '' });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaError, setCaptchaError] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [banModalData, setBanModalData] = useState(null);
  const [showIPBanModal, setShowIPBanModal] = useState(false);
  const [ipBanData, setIPBanData] = useState(null);
  const [ipCheckPerformed, setIPCheckPerformed] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkBansOnLoad = async () => {
      if (!ipCheckPerformed) {
        try {
          const accessResult = await IPBanSystem.checkUserAccess(navigator.userAgent);
          setIPCheckPerformed(true);
          if (!accessResult.allowed && accessResult.reason === 'ip_banned') {
            setIPBanData(accessResult.banInfo);
            setShowIPBanModal(true);
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.userSelect = 'none';
            const ipBanInterval = setInterval(() => {
              setShowIPBanModal(true);
              setIPBanData(accessResult.banInfo);
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
            return;
          }
        } catch (error) {
          setIPCheckPerformed(true);
        }
      }

      const isBannedUser = localStorage.getItem('isBannedUser');
      if (isBannedUser === 'true') {
        const storedBanData = localStorage.getItem('userBanStatus');
        if (storedBanData) {
          try {
            const banData = JSON.parse(storedBanData);
            if (banData.bannedAt) banData.bannedAt = new Date(banData.bannedAt);
            setBanModalData(banData);
            setShowBanModal(true);
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.userSelect = 'none';
            document.body.style.pointerEvents = 'none';
            const loginBanInterval = setInterval(() => {
              setShowBanModal(true);
              setBanModalData(banData);
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
          } catch (error) {}
        }
      }
    };

    checkBansOnLoad();
    setTimeout(checkBansOnLoad, 100);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.isBanned === true) {
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
              await auth.signOut();
              for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                  setShowBanModal(true);
                  setBanModalData(banData);
                  const modalElement = document.querySelector('.ban-kick-modal-overlay');
                  if (modalElement) {
                    modalElement.style.display = 'flex';
                    modalElement.style.zIndex = '2147483647';
                    modalElement.style.pointerEvents = 'all';
                    modalElement.style.opacity = '1';
                    modalElement.style.visibility = 'visible';
                  }
                }, i * 10);
              }
              document.body.style.overflow = 'hidden';
              document.body.style.position = 'fixed';
              document.body.style.width = '100%';
              document.body.style.height = '100%';
              document.body.style.top = '0';
              document.body.style.left = '0';
              window.onbeforeunload = (e) => { e.preventDefault(); e.returnValue = 'Account is suspended'; return 'Account is suspended'; };
              window.history.pushState(null, null, '/login');
              const banModalInterval = setInterval(() => {
                setShowBanModal(true);
                setBanModalData(banData);
                document.body.style.overflow = 'hidden';
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                document.body.style.height = '100%';
                document.body.style.top = '0';
                document.body.style.left = '0';
                document.body.style.userSelect = 'none';
                document.body.style.pointerEvents = 'none';
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
                if (window.location.pathname !== '/login') window.history.replaceState(null, null, '/login');
              }, 20);
              window.banModalForceInterval = banModalInterval;
              return;
            }
          }
        } catch (error) {}
      }
    });
    return () => unsubscribe();
  }, []);

  const getPasswordStrength = (password) => {
    if (!password) return { level: 'none', text: '', score: 0 };
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/\d/.test(password)) score += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    if (password.length >= 12) score += 10;
    if (score >= 85) return { level: 'strong', text: 'Strong Password', score };
    if (score >= 60) return { level: 'medium', text: 'Medium Strength', score };
    if (score >= 30) return { level: 'weak', text: 'Weak Password', score };
    return { level: 'very-weak', text: 'Very Weak', score };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!identifier.trim()) { setError('Please enter your email or username'); setLoading(false); return; }
    if (!password.trim()) { setError('Please enter your password'); setLoading(false); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let loginEmail = identifier.trim();

    if (!emailRegex.test(loginEmail)) {
      // Strip leading @ if user typed @username
      const usernameToLookup = loginEmail.startsWith('@') ? loginEmail.slice(1) : loginEmail;
      let foundEmail = null;
      let anonUser = null;

      // Use anonymous auth as a bridge so Firestore rules (request.auth != null) are satisfied
      try {
        const anonCredential = await signInAnonymously(auth);
        anonUser = anonCredential.user;
      } catch (anonErr) {
        console.warn('Anonymous auth failed:', anonErr.code);
      }

      // Strategy 1: Check usernames collection (has email stored directly)
      try {
        const usernameRef = doc(db, 'usernames', usernameToLookup.toLowerCase());
        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists()) {
          const data = usernameSnap.data();
          if (data.email) {
            foundEmail = data.email;
          } else if (data.uid) {
            // email not in username doc — fetch from users doc
            try {
              const userRef = doc(db, 'users', data.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists() && userSnap.data().email) {
                foundEmail = userSnap.data().email;
              }
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('usernames collection lookup failed:', err.code || err.message);
      }

      // Strategy 2: Query users collection by username field
      if (!foundEmail) {
        try {
          const usersQ = query(collection(db, 'users'), where('username', '==', usernameToLookup.toLowerCase()));
          const usersSnap = await getDocs(usersQ);
          if (!usersSnap.empty) {
            foundEmail = usersSnap.docs[0].data().email;
          }
        } catch (err) {
          console.warn('users username query failed:', err.code || err.message);
        }
      }

      // Strategy 3: Query users by displayName (for older accounts without username field)
      if (!foundEmail) {
        try {
          const displayQ = query(collection(db, 'users'), where('displayName', '==', usernameToLookup));
          const displaySnap = await getDocs(displayQ);
          if (!displaySnap.empty) {
            foundEmail = displaySnap.docs[0].data().email;
          }
        } catch (err) {
          console.warn('users displayName query failed:', err.code || err.message);
        }
      }

      // Strategy 4: Case-insensitive displayName match (covers Vyom vs vyom etc.)
      if (!foundEmail) {
        try {
          const displayQLower = query(collection(db, 'users'), where('displayName', '==', usernameToLookup.toLowerCase()));
          const displaySnapLower = await getDocs(displayQLower);
          if (!displaySnapLower.empty) {
            foundEmail = displaySnapLower.docs[0].data().email;
          }
        } catch (err) {
          console.warn('users displayName lowercase query failed:', err.code || err.message);
        }
      }

      // Sign out the anonymous session before real login
      if (anonUser) {
        try { await auth.signOut(); } catch (_) {}
      }

      if (!foundEmail) {
        setError('No account found with this username. Please check the spelling or use your email address instead.');
        setLoading(false);
        return;
      }
      loginEmail = foundEmail;
    }

    try {
      if (rememberMe) await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
      const user = userCredential.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      let isBanned = false;
      let userData = null;
      if (userSnap.exists()) { userData = userSnap.data(); isBanned = userData.isBanned === true; }
      if (isBanned) {
        await auth.signOut();
        const banData = {
          reason: userData.banReason || "Account suspended due to policy violations",
          bannedBy: userData.bannedBy || "System Administrator",
          bannedAt: userData.bannedAt ? userData.bannedAt.toDate() : new Date(),
          type: "account_banned", userId: user.uid, email: user.email
        };
        setBanModalData(banData);
        setShowBanModal(true);
        setError('');
        setLoading(false);
        setTimeout(() => { setShowBanModal(true); setBanModalData(banData); }, 50);
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        return;
      } else {
        try { await IPBanSystem.storeUserIP(user.uid, userData); } catch (ipError) {}

        // Auto-register username in usernames collection for future username logins
        // (especially important for older accounts that predate the username system)
        if (userData) {
          const usernameToRegister = userData.username || userData.displayName;
          if (usernameToRegister && usernameToRegister.trim()) {
            try {
              const unameKey = usernameToRegister.toLowerCase().replace(/\s+/g, '_');
              const usernameDocRef = doc(db, 'usernames', unameKey);
              const existing = await getDoc(usernameDocRef);
              // Only write if: doc doesn't exist OR doc belongs to this user
              if (!existing.exists() || existing.data().uid === user.uid) {
                await setDoc(usernameDocRef, {
                  uid: user.uid,
                  email: user.email,
                  reserved: true,
                  createdAt: existing.exists() ? existing.data().createdAt : new Date().toISOString()
                });
              }
            } catch (unameErr) {
              console.warn('Auto-register username failed (non-critical):', unameErr.code);
            }
          }
        }

        navigate('/welcome');
      }
    } catch (err) {
      window.alert = () => undefined;
      let errorMessage = 'Login failed. Please try again.';
      if (err.code === 'auth/user-not-found') errorMessage = 'No account found with this email address';
      else if (err.code === 'auth/wrong-password') errorMessage = 'Invalid email or password';
      else if (err.code === 'auth/invalid-email') errorMessage = 'Please enter a valid email address';
      else if (err.code === 'auth/user-disabled') {
        setBanModalData({ reason: "Account has been disabled by administration", bannedBy: "System Administrator", bannedAt: new Date(), type: "account_disabled", userId: identifier, email: identifier });
        setError('');
        setLoading(false);
        setShowBanModal(true);
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        return;
      } else if (err.code === 'auth/too-many-requests') errorMessage = 'Too many failed attempts. Please try again later';
      else if (err.code === 'auth/network-request-failed') errorMessage = 'Network error. Please check your connection';
      else if (err.code === 'auth/invalid-credential') errorMessage = 'Invalid email or password';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = () => setShowGuestModal(true);

  const handleGuestFormSubmit = async (e) => {
    e.preventDefault();
    if (!guestFormData.displayName.trim()) { setError('Please enter your display name'); return; }
    if (!guestFormData.age || guestFormData.age < 18 || guestFormData.age > 100) { setError('Age must be between 18 and 100'); return; }
    if (!guestFormData.gender) { setError('Please select your gender'); return; }
    if (!captchaToken) { setError('Please complete the captcha verification'); return; }
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      const guestUserData = {
        uid: user.uid, email: null, displayName: guestFormData.displayName,
        age: parseInt(guestFormData.age), gender: guestFormData.gender,
        role: 'guest', isAnonymous: true, isGuest: true,
        photoURL: `https://api.dicebear.com/8.x/adventurer/svg?seed=${guestFormData.displayName}&sex=${guestFormData.gender.toLowerCase()}`,
        createdAt: new Date().toISOString(), lastLogin: new Date().toISOString()
      };
      await updateProfile(user, { displayName: guestFormData.displayName, photoURL: guestUserData.photoURL });
      await setDoc(doc(db, 'users', user.uid), guestUserData);
      localStorage.setItem('guestUser', JSON.stringify(guestUserData));
      localStorage.setItem('isGuest', 'true');
      navigate('/welcome');
    } catch (err) {
      setError('Guest login failed. Please try again.');
    } finally {
      setLoading(false);
      setShowGuestModal(false);
    }
  };

  const handleGuestInputChange = (e) => {
    const { name, value } = e.target;
    setGuestFormData(prev => ({ ...prev, [name]: value }));
  };

  const onCaptchaVerify = (token) => { setCaptchaToken(token); setCaptchaError(''); };
  const onCaptchaExpire = () => { setCaptchaToken(null); setCaptchaError('Captcha expired, please verify again'); };
  const onCaptchaError = (err) => { setCaptchaToken(null); setCaptchaError('Captcha error, please try again'); };

  const resetGuestModal = () => {
    setShowGuestModal(false);
    setGuestFormData({ displayName: '', age: '', gender: '' });
    setError('');
    setCaptchaToken(null);
    setCaptchaError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(145deg, #f8f0ff 0%, #ede4fb 25%, #f3e8ff 50%, #e8d8fa 75%, #f0e6ff 100%)',
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');

        * { box-sizing: border-box; }

        @keyframes floatOrb1 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.55; }
          33% { transform: translate(30px,40px) scale(1.08); opacity: 0.75; }
          66% { transform: translate(-20px,20px) scale(0.93); opacity: 0.5; }
        }
        @keyframes floatOrb2 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.45; }
          50% { transform: translate(-35px,-40px) scale(1.12); opacity: 0.65; }
        }
        @keyframes floatOrb3 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.5; }
          33% { transform: translate(-25px,30px) scale(1.1); opacity: 0.7; }
          66% { transform: translate(20px,-20px) scale(0.9); opacity: 0.4; }
        }
        @keyframes floatOrb4 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(22px,-28px) scale(1.15); }
        }
        @keyframes shimmerBorder {
          0%,100% { background-position: 400% 0; }
          50% { background-position: -400% 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardEntrance {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmerSlide {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        @keyframes checkPop {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          60% { transform: scale(1.25) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        .lv-card {
          background: rgba(255,255,255,0.78);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border-radius: 28px;
          padding: 32px 28px 24px;
          width: 100%;
          max-width: 400px;
          max-height: 98vh;
          overflow-y: auto;
          overflow-x: hidden;
          box-shadow:
            0 32px 80px rgba(139,92,246,0.18),
            0 8px 32px rgba(155,89,208,0.12),
            inset 0 1px 0 rgba(255,255,255,0.9),
            0 0 0 1.5px rgba(192,132,252,0.3);
          border: 1.5px solid rgba(192,132,252,0.25);
          position: relative;
          animation: cardEntrance 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards;
          scrollbar-width: none;
        }
        .lv-card::-webkit-scrollbar { display: none; }

        .lv-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3.5px;
          background: linear-gradient(90deg, #c084fc, #a855f7, #9333ea, #7c3aed, #c084fc);
          background-size: 400% 100%;
          animation: shimmerBorder 4s ease-in-out infinite;
          border-radius: 28px 28px 0 0;
        }

        .lv-logo-wrap {
          text-align: center;
          margin-bottom: 20px;
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 12px 28px rgba(139,92,246,0.35)); }
          50% { transform: translateY(-10px) scale(1.03); filter: drop-shadow(0 22px 36px rgba(139,92,246,0.5)); }
        }

        .lv-logo-img {
          width: 100px;
          height: 100px;
          border-radius: 26px;
          border: none;
          background: none;
          object-fit: contain;
          animation: logoFloat 3.5s ease-in-out infinite;
          margin-bottom: 10px;
        }
        .lv-logo-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
          font-size: 2.1rem;
          font-weight: 700;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 4px;
          letter-spacing: 0.02em;
        }
        .lv-logo-sub {
          color: #7e6ca8;
          font-size: 0.82rem;
          margin: 0;
          font-weight: 500;
          letter-spacing: 0.2px;
        }

        .lv-label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 7px;
          font-weight: 600;
          color: #4c366b;
          font-size: 0.84rem;
          letter-spacing: 0.15px;
        }
        .lv-label svg { flex-shrink: 0; }

        .lv-group {
          margin-bottom: 14px;
          position: relative;
        }

        .lv-input {
          width: 100%;
          padding: 13px 16px;
          border: 2px solid rgba(192,132,252,0.25);
          border-radius: 14px;
          font-size: 0.93rem;
          font-family: inherit;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          background: rgba(255,255,255,0.85);
          color: #2d1b4e;
          box-sizing: border-box;
          height: 48px;
          outline: none;
        }
        .lv-input:focus {
          border-color: #a855f7;
          background: rgba(255,255,255,0.98);
          box-shadow: 0 0 0 4px rgba(168,85,247,0.12), 0 4px 16px rgba(168,85,247,0.1);
          transform: translateY(-1px);
        }
        .lv-input::placeholder { color: #b09dcc; }
        .lv-input::-webkit-calendar-picker-indicator { filter: invert(40%) sepia(50%) saturate(500%) hue-rotate(240deg); }

        .lv-pw-wrap { position: relative; }
        .lv-pw-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .lv-pw-toggle:hover { background: rgba(168,85,247,0.1); transform: translateY(-50%) scale(1.1); }

        .lv-strength-bar {
          height: 5px;
          background: rgba(192,132,252,0.15);
          border-radius: 3px;
          overflow: hidden;
          margin: 8px 0 4px;
        }
        .lv-strength-fill {
          height: 100%;
          border-radius: 3px;
          transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
          position: relative;
          overflow: hidden;
        }
        .lv-strength-fill::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: shimmerSlide 1.8s infinite;
        }
        .lv-s-very-weak .lv-strength-fill { width: 20%; background: linear-gradient(90deg,#f87171,#ef4444); }
        .lv-s-weak .lv-strength-fill { width: 45%; background: linear-gradient(90deg,#fb923c,#f97316); }
        .lv-s-medium .lv-strength-fill { width: 72%; background: linear-gradient(90deg,#facc15,#eab308); }
        .lv-s-strong .lv-strength-fill { width: 100%; background: linear-gradient(90deg,#4ade80,#22c55e); }
        .lv-strength-text {
          display: flex; align-items: center; justify-content: space-between;
          font-size: 0.74rem; font-weight: 600;
        }
        .lv-st-very-weak { color: #ef4444; }
        .lv-st-weak { color: #f97316; }
        .lv-st-medium { color: #eab308; }
        .lv-st-strong { color: #22c55e; }

        .lv-check-row {
          display: flex; align-items: center; gap: 8px;
          margin: 12px 0;
        }
        .lv-checkbox {
          width: 18px; height: 18px;
          accent-color: #a855f7;
          cursor: pointer;
          flex-shrink: 0;
        }
        .lv-check-label {
          font-size: 0.83rem; color: #5c4480; font-weight: 500; cursor: pointer;
        }

        .lv-error {
          background: rgba(239,68,68,0.08);
          border: 1.5px solid rgba(239,68,68,0.25);
          color: #dc2626;
          padding: 11px 14px;
          border-radius: 12px;
          font-size: 0.83rem;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: fadeInUp 0.3s ease forwards;
          font-weight: 500;
        }

        .lv-btn-primary {
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #9333ea 0%, #a855f7 50%, #c084fc 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          position: relative;
          overflow: hidden;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(147,51,234,0.3), inset 0 1px 0 rgba(255,255,255,0.25);
          letter-spacing: 0.3px;
          -webkit-tap-highlight-color: transparent;
          margin-bottom: 10px;
        }
        .lv-btn-primary::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transition: left 0.5s ease;
        }
        .lv-btn-primary:hover::before { left: 100%; }
        .lv-btn-primary:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 14px 36px rgba(147,51,234,0.38), inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .lv-btn-primary:active { transform: translateY(0) scale(0.99); }
        .lv-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .lv-btn-secondary {
          width: 100%;
          padding: 13px 20px;
          background: rgba(255,255,255,0.6);
          border: 2px solid rgba(192,132,252,0.35);
          border-radius: 14px;
          color: #7c3aed;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.2px;
          -webkit-tap-highlight-color: transparent;
          backdrop-filter: blur(10px);
        }
        .lv-btn-secondary:hover {
          background: rgba(168,85,247,0.1);
          border-color: #a855f7;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168,85,247,0.18);
          color: #6d28d9;
        }
        .lv-btn-secondary:active { transform: translateY(0); }

        .lv-btn-guest {
          width: 100%;
          padding: 13px 20px;
          background: linear-gradient(135deg, rgba(255,255,255,0.7), rgba(245,235,255,0.8));
          border: 2px solid rgba(192,132,252,0.3);
          border-radius: 14px;
          color: #6d28d9;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
          -webkit-tap-highlight-color: transparent;
          backdrop-filter: blur(10px);
        }
        .lv-btn-guest:hover {
          background: linear-gradient(135deg, rgba(192,132,252,0.15), rgba(168,85,247,0.2));
          border-color: #c084fc;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(192,132,252,0.2);
        }

        .lv-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 16px 0;
          color: #a99cc4;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .lv-divider::before, .lv-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(192,132,252,0.35), transparent);
        }

        .lv-footer {
          text-align: center;
          margin-top: 18px;
          color: #7e6ca8;
          font-size: 0.84rem;
        }
        .lv-footer a {
          color: #9333ea;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.2s ease;
        }
        .lv-footer a:hover { color: #a855f7; text-decoration: underline; }

        .lv-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* Guest Modal */
        .lv-modal-overlay {
          position: fixed !important;
          top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
          background: rgba(60,20,100,0.55) !important;
          backdrop-filter: blur(12px) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          z-index: 999999999 !important;
          padding: 20px !important;
          animation: fadeInUp 0.3s ease !important;
        }
        .lv-modal {
          background: linear-gradient(145deg, #fdf8ff, #f5eaff, #fdf4ff) !important;
          border-radius: 28px !important;
          padding: 32px 28px !important;
          width: 100% !important;
          max-width: 440px !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
          position: relative !important;
          box-shadow:
            0 32px 80px rgba(139,92,246,0.28),
            0 8px 32px rgba(168,85,247,0.2),
            inset 0 1px 0 rgba(255,255,255,0.95) !important;
          border: 2px solid rgba(192,132,252,0.35) !important;
          animation: cardEntrance 0.45s cubic-bezier(0.34,1.56,0.64,1) !important;
          scrollbar-width: none !important;
        }
        .lv-modal::-webkit-scrollbar { display: none; }
        .lv-modal-close {
          position: absolute;
          top: 16px; right: 16px;
          background: rgba(255,255,255,0.9);
          border: 2px solid rgba(192,132,252,0.3);
          border-radius: 50%;
          width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #9333ea;
          font-size: 18px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(139,92,246,0.15);
        }
        .lv-modal-close:hover {
          background: rgba(147,51,234,0.9);
          color: white;
          transform: scale(1.1) rotate(90deg);
        }
        .lv-modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          font-weight: 800;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-align: center;
          margin: 0 0 6px;
        }
        .lv-modal-sub {
          text-align: center;
          color: #7e6ca8;
          font-size: 0.85rem;
          margin: 0 0 22px;
        }
        .lv-modal-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.85rem; font-weight: 700;
          color: #4c366b;
          margin-bottom: 7px;
        }
        .lv-modal-input {
          width: 100%;
          padding: 13px 16px;
          border: 2px solid rgba(192,132,252,0.25);
          border-radius: 12px;
          font-size: 0.92rem;
          font-family: inherit;
          background: rgba(255,255,255,0.9);
          color: #2d1b4e;
          transition: all 0.3s ease;
          outline: none;
          box-sizing: border-box;
        }
        .lv-modal-input:focus {
          border-color: #a855f7;
          background: white;
          box-shadow: 0 0 0 4px rgba(168,85,247,0.1);
        }
        .lv-modal-input::placeholder { color: #b09dcc; }
        .lv-modal-group { margin-bottom: 14px; }

        .lv-captcha-wrap { display: flex; justify-content: center; margin: 10px 0; }
        .lv-guest-info {
          background: rgba(168,85,247,0.07);
          border: 1.5px solid rgba(168,85,247,0.2);
          border-radius: 12px;
          padding: 12px 14px;
          display: flex; align-items: flex-start; gap: 10px;
          margin-top: 10px;
          font-size: 0.8rem;
          color: #5c4480;
          line-height: 1.5;
        }

        /* Strength indicator check pop */
        .check-pop { animation: checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }

        /* Match indicator */
        .lv-match-ok { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #22c55e; font-weight: 600; margin-top: 5px; }
        .lv-match-err { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #ef4444; font-weight: 600; margin-top: 5px; }

        @media (max-width: 480px) {
          .lv-card { padding: 24px 18px 18px; border-radius: 22px; max-width: 98vw; }
          .lv-logo-title { font-size: 1.8rem; }
          .lv-logo-img { width: 80px; height: 80px; border-radius: 22px; }
          .lv-input { height: 46px; font-size: 16px; }
          .lv-btn-primary, .lv-btn-secondary, .lv-btn-guest { min-height: 46px; font-size: 0.88rem; }
          .lv-modal { padding: 24px 18px; border-radius: 22px; }
        }
        @media (max-height: 700px) {
          .lv-card { padding: 18px 20px 14px; }
          .lv-group { margin-bottom: 10px; }
          .lv-logo-wrap { margin-bottom: 14px; }
        }
      `}</style>

      {/* Floating lavender orbs */}
      <div style={{position:'absolute',width:'420px',height:'420px',borderRadius:'50%',background:'radial-gradient(circle,rgba(192,132,252,.25) 0%,transparent 70%)',top:'-160px',left:'-160px',animation:'floatOrb1 12s ease-in-out infinite',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',width:'300px',height:'300px',borderRadius:'50%',background:'radial-gradient(circle,rgba(216,180,254,.22) 0%,transparent 70%)',bottom:'-100px',right:'-100px',animation:'floatOrb2 15s ease-in-out infinite',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',width:'220px',height:'220px',borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,.2) 0%,transparent 70%)',top:'40%',right:'-80px',animation:'floatOrb3 18s ease-in-out infinite',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',width:'180px',height:'180px',borderRadius:'50%',background:'radial-gradient(circle,rgba(233,213,255,.3) 0%,transparent 70%)',bottom:'15%',left:'-60px',animation:'floatOrb4 10s ease-in-out infinite',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',width:'140px',height:'140px',borderRadius:'50%',background:'radial-gradient(circle,rgba(192,132,252,.18) 0%,transparent 70%)',top:'15%',right:'8%',animation:'floatOrb1 9s ease-in-out infinite reverse',pointerEvents:'none',zIndex:0}}/>

      {showBanModal && banModalData && (
        <BanKickModal
          isOpen={showBanModal}
          banInfo={banModalData}
          onClose={() => {}}
        />
      )}
      {showIPBanModal && (
        <IPBanModal
          isOpen={showIPBanModal}
          banInfo={ipBanData}
          onClose={() => {}}
        />
      )}

      <div className="lv-card" style={{position:'relative',zIndex:1}}>
        {/* Logo */}
        <div className="lv-logo-wrap">
          <img
            src="/tingletap-logo.jpg"
            alt="TingleTap Logo"
            className="lv-logo-img"
          />
          <h1 className="lv-logo-title">TingleTap</h1>
          <p className="lv-logo-sub">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle',marginRight:'5px'}}>
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#c084fc" stroke="#a855f7" strokeWidth="1"/>
            </svg>
            Welcome back! Sign in to continue
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle',marginLeft:'5px'}}>
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#c084fc" stroke="#a855f7" strokeWidth="1"/>
            </svg>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email or Username */}
          <div className="lv-group">
            <label className="lv-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="#a855f7" strokeWidth="2" fill="none"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <rect x="14" y="3" width="8" height="5.5" rx="1.5" fill="rgba(168,85,247,0.15)" stroke="#a855f7" strokeWidth="1.2"/>
                <path d="M15 5.5l1.5 1.5 2.5-2" stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Email Address or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="your@email.com or @username"
              className="lv-input"
              autoComplete="username"
              required
            />
          </div>

          {/* Password */}
          <div className="lv-group">
            <label className="lv-label">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="#a855f7" strokeWidth="2"/>
                <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1.5" fill="#a855f7"/>
              </svg>
              Password
            </label>
            <div className="lv-pw-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="lv-input"
                style={{paddingRight:'52px'}}
                required
              />
              <button type="button" className="lv-pw-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? <EyeOpenSVG/> : <EyeClosedSVG/>}
              </button>
            </div>
            {password && (
              <div style={{animation:'fadeInUp 0.3s ease forwards'}}>
                <div className={`lv-strength-bar lv-s-${getPasswordStrength(password).level}`}>
                  <div className="lv-strength-fill"/>
                </div>
                <div className="lv-strength-text">
                  <span className={`lv-st-${getPasswordStrength(password).level}`}>{getPasswordStrength(password).text}</span>
                  {getPasswordStrength(password).level === 'strong' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="check-pop">
                      <circle cx="12" cy="12" r="10" fill="#22c55e"/>
                      <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Remember me + Forgot Password */}
          <div className="lv-check-row" style={{justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="lv-checkbox"
              />
              <label htmlFor="rememberMe" className="lv-check-label">Remember me</label>
            </div>
            <Link to="/forgot-password" style={{
              fontSize:'0.82rem',color:'#9333ea',fontWeight:600,
              textDecoration:'none',display:'flex',alignItems:'center',gap:'4px',
              transition:'color 0.2s ease'
            }}
            onMouseEnter={e=>e.currentTarget.style.color='#a855f7'}
            onMouseLeave={e=>e.currentTarget.style.color='#9333ea'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#9333ea" strokeWidth="2"/>
                <path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" stroke="#9333ea" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1" fill="#9333ea"/>
              </svg>
              Forgot password?
            </Link>
          </div>
          {error && (
            <div className="lv-error">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
                <circle cx="12" cy="12" r="10" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="2"/>
                <path d="M12 7v5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="#ef4444"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="lv-btn-primary" disabled={loading}>
            {loading ? (
              <><div className="lv-spinner"/><span>Signing In...</span></>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="10 17 15 12 10 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="15" y1="12" x2="3" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Sign In to TingleTap
              </>
            )}
          </button>
        </form>

        <div className="lv-divider">or</div>

        {/* Guest Login */}
        <button className="lv-btn-guest" onClick={handleAnonymousLogin}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="none" stroke="#7c3aed" strokeWidth="2"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="19" cy="8" r="2.5" fill="rgba(168,85,247,0.2)" stroke="#a855f7" strokeWidth="1.5"/>
            <path d="M19 7v2" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M18 8h2" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Continue as Guest
        </button>

        <div className="lv-footer">
          Don't have an account?{' '}
          <Link to="/signup">Create one free</Link>
        </div>
      </div>

      {/* Guest Modal */}
      {showGuestModal && (
        <div className="lv-modal-overlay">
          <div className="lv-modal">
            <button className="lv-modal-close" onClick={resetGuestModal}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>

            <div style={{textAlign:'center',marginBottom:'8px'}}>
              <div style={{
                width:'60px',height:'60px',borderRadius:'50%',
                background:'linear-gradient(135deg,#e9d5ff,#c084fc)',
                margin:'0 auto 12px',
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:'0 8px 24px rgba(168,85,247,0.3)'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="none" stroke="white" strokeWidth="2"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="lv-modal-title">Guest Access</h2>
              <p className="lv-modal-sub">Fill in your details to explore TingleTap</p>
            </div>

            <form onSubmit={handleGuestFormSubmit}>
              <div className="lv-modal-group">
                <label className="lv-modal-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="7" r="4" stroke="#a855f7" strokeWidth="2"/>
                  </svg>
                  Display Name
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={guestFormData.displayName}
                  onChange={handleGuestInputChange}
                  placeholder="How should we call you?"
                  className="lv-modal-input"
                  required
                />
              </div>

              <div className="lv-modal-group">
                <label className="lv-modal-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="#a855f7" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="2" x2="8" y2="6" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="3" y1="10" x2="21" y2="10" stroke="#a855f7" strokeWidth="2"/>
                  </svg>
                  Age (18+)
                </label>
                <input
                  type="number"
                  name="age"
                  value={guestFormData.age}
                  onChange={handleGuestInputChange}
                  placeholder="Your age"
                  className="lv-modal-input"
                  min="18" max="100"
                  required
                />
              </div>

              <div className="lv-modal-group">
                <label className="lv-modal-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#a855f7" strokeWidth="2"/>
                    <path d="M12 8v4l3 3" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Gender
                </label>
                <select
                  name="gender"
                  value={guestFormData.gender}
                  onChange={handleGuestInputChange}
                  className="lv-modal-input"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="transgender">Transgender</option>
                </select>
              </div>

              {error && (
                <div className="lv-error" style={{marginBottom:'12px'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                    <path d="M12 7v5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="#ef4444"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="lv-captcha-wrap">
                <HCaptcha
                  sitekey="50b2fe65-b00b-4b9e-ad62-3ba471098be2"
                  onVerify={onCaptchaVerify}
                  onExpire={onCaptchaExpire}
                  onError={onCaptchaError}
                />
              </div>
              {captchaError && (
                <div style={{color:'#dc2626',fontSize:'0.8rem',textAlign:'center',marginBottom:'8px'}}>{captchaError}</div>
              )}

              <button type="submit" className="lv-btn-primary" disabled={loading || !captchaToken}>
                {loading ? (
                  <><div className="lv-spinner"/><span>Joining...</span></>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>
                    </svg>
                    Enter as Guest
                  </>
                )}
              </button>
            </form>

            <div className="lv-guest-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,marginTop:'2px'}}>
                <circle cx="12" cy="12" r="10" fill="rgba(168,85,247,0.15)" stroke="#a855f7" strokeWidth="2"/>
                <path d="M12 7v5" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="#a855f7"/>
              </svg>
              <span>Guest accounts are temporary. Some features may be limited. Create a full account for the complete TingleTap experience.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
