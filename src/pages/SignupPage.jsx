
import React, { useState, useEffect, useRef } from 'react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, createUserProfile, checkUsernameAvailability, reserveUsername } from '../firebase/config';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { generateOTP, sendOTPEmail, verifyOTP, clearOTP, initializeEmailJS } from '../utils/emailService';
import IPBanModal from '../components/IPBanModal';
import { IPBanSystem } from '../utils/ipBanSystem';
import './LandingPage.css';

const EyeOpenSVG = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="eyeGradOpenS" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#c084fc"/>
        <stop offset="60%" stopColor="#9b59d0"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </radialGradient>
      <radialGradient id="pupilGradS" cx="35%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#5b21b6"/>
        <stop offset="100%" stopColor="#3b0764"/>
      </radialGradient>
      <filter id="eyeGlowS">
        <feGaussianBlur stdDeviation="0.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
      fill="url(#eyeGradOpenS)" stroke="#9b59d0" strokeWidth="0.5" filter="url(#eyeGlowS)"/>
    <ellipse cx="12" cy="12" rx="4.5" ry="4.5" fill="url(#pupilGradS)"/>
    <ellipse cx="12" cy="12" rx="2.2" ry="2.2" fill="#1e0a3c"/>
    <ellipse cx="10.5" cy="10.8" rx="0.9" ry="0.9" fill="rgba(255,255,255,0.7)"/>
    <ellipse cx="13.2" cy="11.4" rx="0.45" ry="0.45" fill="rgba(255,255,255,0.4)"/>
  </svg>
);

const EyeClosedSVG = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="eyeGradClosedS" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc"/>
        <stop offset="100%" stopColor="#9b59d0"/>
      </linearGradient>
    </defs>
    <path d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12" stroke="url(#eyeGradClosedS)" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <path d="M3 16L5.5 13.5" stroke="url(#eyeGradClosedS)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M8 18.5L9 15.5" stroke="url(#eyeGradClosedS)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M12 19V16" stroke="url(#eyeGradClosedS)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M16 18.5L15 15.5" stroke="url(#eyeGradClosedS)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M21 16L18.5 13.5" stroke="url(#eyeGradClosedS)" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="4" y1="4" x2="20" y2="20" stroke="url(#eyeGradClosedS)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
  </svg>
);

const SignupPage = () => {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', username: '', fullName: '',
    dateOfBirth: '', gender: '', country: '', profession: '', bio: '', status: '', profilePic: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showIPBanModal, setShowIPBanModal] = useState(false);
  const [ipBanData, setIPBanData] = useState(null);
  const [ipCheckPerformed, setIPCheckPerformed] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const usernameDebounceRef = useRef(null);

  const navigate = useNavigate();

  React.useEffect(() => { initializeEmailJS(); }, []);

  useEffect(() => {
    const checkIPBanOnLoad = async () => {
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
    };
    checkIPBanOnLoad();
  }, [ipCheckPerformed]);

  const handleUsernameChange = (value) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setFormData(prev => ({ ...prev, username: cleaned }));
    setUsernameStatus(null);
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    if (cleaned.length < 3) { setUsernameChecking(false); return; }
    setUsernameChecking(true);
    usernameDebounceRef.current = setTimeout(async () => {
      const available = await checkUsernameAvailability(cleaned);
      setUsernameStatus(available ? 'available' : 'taken');
      setUsernameChecking(false);
    }, 600);
  };

  const sendOTP = async () => {
    setOtpLoading(true);
    try {
      initializeEmailJS();
      const otpCode = generateOTP();
      const result = await sendOTPEmail(formData.email, otpCode);
      if (result.success) { setOtpSent(true); toast.success('OTP sent to your email! Check inbox and spam folder.'); }
      else { toast.error(result.error || 'Failed to send OTP. Please try again.'); }
    } catch (err) {
      toast.error('Failed to send OTP. Please try again.');
    }
    setOtpLoading(false);
  };

  const handleOTPVerification = async () => {
    if (!otp.trim()) { setError('Please enter the OTP'); return; }
    if (otp.length !== 6) { setError('OTP must be 6 digits'); return; }
    const isValid = verifyOTP(formData.email, otp);
    if (isValid) {
      clearOTP(formData.email);
      setCurrentStep(3);
      setError('');
      toast.success('Email verified successfully!');
    } else {
      setError('Invalid or expired OTP. Please try again.');
    }
  };

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

  const validateEmail = (email) => {
    const validDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.co.in'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    return validDomains.includes(emailDomain);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setError('Profile picture must be less than 5MB'); return; }
      setFormData(prev => ({ ...prev, profilePic: file }));
      const reader = new FileReader();
      reader.onload = (e) => setProfilePicPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      setError('');
      if (!formData.username.trim()) { setError('Please choose a username'); return; }
      if (formData.username.length < 3) { setError('Username must be at least 3 characters'); return; }
      if (usernameStatus === 'taken') { setError('This username is already taken. Please choose another.'); return; }
      if (usernameChecking) { setError('Please wait while we check username availability...'); return; }
      if (!formData.email.trim()) { setError('Please enter your email address'); return; }
      if (!formData.password.trim()) { setError('Please enter a password'); return; }
      if (formData.password.length < 6) { setError('Password must be at least 6 characters long'); return; }
      if (!formData.confirmPassword.trim()) { setError('Please confirm your password'); return; }
      if (!validateEmail(formData.email)) { setError('Please use a valid email from Gmail, Hotmail, Outlook, or Yahoo'); return; }
      if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
      const usernameAvail = await checkUsernameAvailability(formData.username.toLowerCase());
      if (!usernameAvail) { setError('This username was just taken. Please choose another.'); return; }
      setCurrentStep(2);
      if (!otpSent) await sendOTP();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!formData.fullName.trim()) { setError('Please enter your full name'); setLoading(false); return; }
    if (!formData.dateOfBirth) { setError('Please enter your date of birth'); setLoading(false); return; }
    if (!formData.gender) { setError('Please select your gender'); setLoading(false); return; }
    if (!formData.country) { setError('Please select your country'); setLoading(false); return; }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      await new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
          if (currentUser && currentUser.uid === user.uid) { unsubscribe(); resolve(); }
        });
      });
      let profilePicURL = '';
      if (formData.profilePic) {
        try {
          const formDataImg = new FormData();
          formDataImg.append('image', formData.profilePic);
          formDataImg.append('key', '46c5e6c30b68dd8f5c5c3e7c6e8d8c8e');
          const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formDataImg });
          const result = await response.json();
          if (result.success) profilePicURL = result.data.url;
        } catch (imgError) { console.warn('Failed to upload profile picture, using default'); }
      }
      const defaultAvatar = formData.gender === 'female'
        ? `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=female&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
        : `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=male&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
      const userProfileData = {
        uid: user.uid, email: formData.email, displayName: formData.fullName,
        username: formData.username.toLowerCase(),
        gender: formData.gender || 'Not specified', country: formData.country || 'Unknown',
        status: formData.status || "I'm new here!", bio: formData.bio || '',
        profession: formData.profession || '', photoURL: profilePicURL || defaultAvatar,
        dateOfBirth: formData.dateOfBirth
      };
      await new Promise(resolve => setTimeout(resolve, 2000));
      const result = await createUserProfile(userProfileData);
      if (result.success && formData.username) {
        await reserveUsername(formData.username.toLowerCase(), user.uid, formData.email);
      }
      if (!result.success) {
        try { await user.delete(); } catch (deleteError) {}
        throw new Error('Failed to create user profile. Please try again.');
      }
      toast.success('Account created successfully! Welcome to TingleTap!');
      navigate('/rooms');
    } catch (err) {
      let errorMessage = 'Account creation failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') errorMessage = 'An account with this email already exists';
      else if (err.code === 'auth/invalid-email') errorMessage = 'Please enter a valid email address';
      else if (err.code === 'auth/weak-password') errorMessage = 'Password should be at least 6 characters long';
      else if (err.code === 'auth/network-request-failed') errorMessage = 'Network error. Please check your connection';
      else if (err.code === 'auth/too-many-requests') errorMessage = 'Too many attempts. Please try again later';
      else if (err.message === 'Failed to create user profile. Please try again.') errorMessage = 'Failed to create user profile. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
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
      top: 0, left: 0,
      boxSizing: 'border-box'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600;1,700&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');

        * { box-sizing: border-box; }

        @keyframes sFloatOrb1 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.5; }
          33% { transform: translate(30px,40px) scale(1.08); opacity: 0.7; }
          66% { transform: translate(-20px,18px) scale(0.93); opacity: 0.45; }
        }
        @keyframes sFloatOrb2 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.4; }
          50% { transform: translate(-35px,-40px) scale(1.12); opacity: 0.6; }
        }
        @keyframes sFloatOrb3 {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.45; }
          50% { transform: translate(25px,-30px) scale(1.1); opacity: 0.65; }
        }
        @keyframes sCardIn {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sShimmer {
          0%,100% { background-position: 400% 0; }
          50% { background-position: -400% 0; }
        }
        @keyframes sFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sSpin { to { transform: rotate(360deg); } }
        @keyframes sSlide { 0%{left:-100%} 100%{left:100%} }
        @keyframes sStepPop {
          0% { transform: scale(0.7); opacity: 0; }
          70% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        .su-card {
          background: rgba(255,255,255,0.78);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border-radius: 28px;
          padding: 28px 26px 22px;
          width: 100%;
          max-width: 420px;
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
          animation: sCardIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards;
          scrollbar-width: none;
        }
        .su-card::-webkit-scrollbar { display: none; }
        .su-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3.5px;
          background: linear-gradient(90deg, #c084fc, #a855f7, #9333ea, #7c3aed, #c084fc);
          background-size: 400% 100%;
          animation: sShimmer 4s ease-in-out infinite;
          border-radius: 28px 28px 0 0;
        }

        .su-logo { text-align: center; margin-bottom: 16px; }
        @keyframes sLogoFloat {
          0%, 100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 12px 26px rgba(139,92,246,0.35)); }
          50% { transform: translateY(-10px) scale(1.03); filter: drop-shadow(0 22px 34px rgba(139,92,246,0.52)); }
        }

        .su-logo-img {
          width: 100px; height: 100px;
          border-radius: 26px;
          border: none;
          background: none;
          object-fit: contain;
          animation: sLogoFloat 3.5s ease-in-out infinite;
          margin-bottom: 8px;
        }
        .su-logo-title {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
          font-size: 1.9rem;
          font-weight: 700;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 3px;
        }
        .su-logo-sub { color: #7e6ca8; font-size: 0.8rem; margin: 0; font-weight: 500; }

        /* Step indicator */
        .su-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 18px;
        }
        .su-step-circle {
          width: 34px; height: 34px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 0.82rem;
          transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
          position: relative;
          z-index: 1;
        }
        .su-step-circle.su-step-active {
          background: linear-gradient(135deg, #9333ea, #c084fc);
          color: white;
          box-shadow: 0 6px 20px rgba(147,51,234,0.38);
          animation: sStepPop 0.4s ease forwards;
        }
        .su-step-circle.su-step-done {
          background: linear-gradient(135deg, #22c55e, #4ade80);
          color: white;
          box-shadow: 0 4px 14px rgba(34,197,94,0.3);
        }
        .su-step-circle.su-step-inactive {
          background: rgba(192,132,252,0.12);
          color: #b09dcc;
          border: 2px solid rgba(192,132,252,0.25);
        }
        .su-step-line {
          height: 2.5px;
          width: 40px;
          border-radius: 2px;
          transition: all 0.4s ease;
        }
        .su-step-line.su-line-active {
          background: linear-gradient(90deg, #9333ea, #c084fc);
        }
        .su-step-line.su-line-inactive {
          background: rgba(192,132,252,0.2);
        }
        .su-step-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #3d2565;
          text-align: center;
          margin-bottom: 14px;
          letter-spacing: 0.1px;
        }

        .su-group { margin-bottom: 12px; position: relative; }
        .su-label {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 6px;
          font-weight: 600;
          color: #4c366b;
          font-size: 0.83rem;
        }
        .su-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid rgba(192,132,252,0.22);
          border-radius: 13px;
          font-size: 0.92rem;
          font-family: inherit;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          background: rgba(255,255,255,0.85);
          color: #2d1b4e;
          box-sizing: border-box;
          height: 46px;
          outline: none;
        }
        .su-input:focus {
          border-color: #a855f7;
          background: rgba(255,255,255,0.98);
          box-shadow: 0 0 0 4px rgba(168,85,247,0.1), 0 4px 14px rgba(168,85,247,0.08);
          transform: translateY(-1px);
        }
        .su-input::placeholder { color: #b09dcc; }
        .su-input::-webkit-calendar-picker-indicator { filter: invert(40%) sepia(50%) saturate(500%) hue-rotate(240deg); }
        .su-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid rgba(192,132,252,0.22);
          border-radius: 13px;
          font-size: 0.92rem;
          font-family: inherit;
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.85);
          color: #2d1b4e;
          box-sizing: border-box;
          resize: vertical;
          min-height: 56px;
          outline: none;
        }
        .su-textarea:focus {
          border-color: #a855f7;
          background: rgba(255,255,255,0.98);
          box-shadow: 0 0 0 4px rgba(168,85,247,0.1);
        }
        .su-textarea::placeholder { color: #b09dcc; }

        .su-pw-wrap { position: relative; }
        .su-pw-toggle {
          position: absolute;
          right: 13px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer; padding: 4px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .su-pw-toggle:hover { background: rgba(168,85,247,0.1); transform: translateY(-50%) scale(1.1); }

        .su-strength-bar {
          height: 5px;
          background: rgba(192,132,252,0.15);
          border-radius: 3px;
          overflow: hidden;
          margin: 7px 0 4px;
        }
        .su-strength-fill {
          height: 100%;
          border-radius: 3px;
          transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
          position: relative; overflow: hidden;
        }
        .su-strength-fill::after {
          content: '';
          position: absolute; top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: sSlide 1.8s infinite;
        }
        .su-s-very-weak .su-strength-fill { width: 20%; background: linear-gradient(90deg,#f87171,#ef4444); }
        .su-s-weak .su-strength-fill { width: 45%; background: linear-gradient(90deg,#fb923c,#f97316); }
        .su-s-medium .su-strength-fill { width: 72%; background: linear-gradient(90deg,#facc15,#eab308); }
        .su-s-strong .su-strength-fill { width: 100%; background: linear-gradient(90deg,#4ade80,#22c55e); }
        .su-strength-text { display: flex; align-items: center; justify-content: space-between; font-size: 0.73rem; font-weight: 600; }
        .su-st-very-weak { color: #ef4444; }
        .su-st-weak { color: #f97316; }
        .su-st-medium { color: #eab308; }
        .su-st-strong { color: #22c55e; }

        .su-reqs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin-top: 8px;
        }
        .su-req {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.72rem; font-weight: 500;
          padding: 4px 6px;
          border-radius: 7px;
          transition: all 0.2s ease;
        }
        .su-req-met { color: #22c55e; background: rgba(34,197,94,0.08); }
        .su-req-unmet { color: #a99cc4; background: rgba(192,132,252,0.07); }

        .su-match-ok { display: flex; align-items: center; gap: 6px; font-size: 0.74rem; color: #22c55e; font-weight: 600; margin-top: 5px; }
        .su-match-err { display: flex; align-items: center; gap: 6px; font-size: 0.74rem; color: #ef4444; font-weight: 600; margin-top: 5px; }

        .su-error {
          background: rgba(239,68,68,0.08);
          border: 1.5px solid rgba(239,68,68,0.22);
          color: #dc2626;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.82rem;
          margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
          font-weight: 500;
          animation: sFadeUp 0.3s ease forwards;
        }

        .su-btn-primary {
          width: 100%;
          padding: 13px 20px;
          background: linear-gradient(135deg, #9333ea 0%, #a855f7 50%, #c084fc 100%);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 0.93rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          position: relative; overflow: hidden;
          min-height: 48px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 8px 24px rgba(147,51,234,0.3), inset 0 1px 0 rgba(255,255,255,0.25);
          letter-spacing: 0.3px;
          -webkit-tap-highlight-color: transparent;
          margin-bottom: 8px;
        }
        .su-btn-primary::before {
          content: '';
          position: absolute; top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transition: left 0.5s ease;
        }
        .su-btn-primary:hover::before { left: 100%; }
        .su-btn-primary:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 14px 36px rgba(147,51,234,0.38); }
        .su-btn-primary:active { transform: translateY(0) scale(0.99); }
        .su-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .su-btn-secondary {
          width: 100%;
          padding: 12px 18px;
          background: rgba(255,255,255,0.65);
          border: 2px solid rgba(192,132,252,0.32);
          border-radius: 14px;
          color: #7c3aed;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          min-height: 46px;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          -webkit-tap-highlight-color: transparent;
          backdrop-filter: blur(10px);
          margin-top: 6px;
        }
        .su-btn-secondary:hover {
          background: rgba(168,85,247,0.1);
          border-color: #a855f7;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168,85,247,0.15);
        }

        .su-spinner {
          width: 17px; height: 17px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: sSpin 0.7s linear infinite;
        }

        .su-divider {
          display: flex; align-items: center; gap: 10px;
          margin: 10px 0;
          color: #a99cc4;
          font-size: 0.78rem; font-weight: 500;
        }
        .su-divider::before, .su-divider::after {
          content: '';
          flex: 1; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(192,132,252,0.32), transparent);
        }

        .su-footer {
          text-align: center;
          margin-top: 14px;
          color: #7e6ca8;
          font-size: 0.83rem;
        }
        .su-footer a { color: #9333ea; text-decoration: none; font-weight: 700; }
        .su-footer a:hover { color: #a855f7; text-decoration: underline; }

        /* OTP section */
        .su-otp-icon-wrap {
          display: flex; flex-direction: column; align-items: center;
          background: rgba(168,85,247,0.06);
          border: 1.5px solid rgba(168,85,247,0.18);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 14px;
          text-align: center;
        }
        .su-otp-email { color: #7c3aed; font-size: 0.92rem; font-weight: 700; margin-top: 4px; word-break: break-all; }
        .su-otp-desc { color: #7e6ca8; font-size: 0.8rem; margin-top: 4px; }
        .su-otp-input {
          width: 100%;
          padding: 14px 20px;
          border: 2.5px solid rgba(192,132,252,0.3);
          border-radius: 14px;
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: 0.5rem;
          text-align: center;
          font-family: 'Courier New', monospace;
          background: rgba(255,255,255,0.9);
          color: #3d2565;
          transition: all 0.3s ease;
          outline: none;
          box-sizing: border-box;
        }
        .su-otp-input:focus {
          border-color: #a855f7;
          box-shadow: 0 0 0 4px rgba(168,85,247,0.12);
          background: white;
        }
        .su-otp-input::placeholder { color: rgba(176,157,204,0.6); letter-spacing: 0.3rem; font-size: 1rem; }
        .su-otp-row { display: flex; gap: 8px; margin-top: 8px; }

        /* Profile pic */
        .su-pic-preview {
          width: 64px; height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid transparent;
          background: linear-gradient(white,white) padding-box,
                      linear-gradient(135deg,#c084fc,#7c3aed) border-box;
          margin: 0 auto 12px; display: block;
          box-shadow: 0 6px 20px rgba(139,92,246,0.25);
        }
        .su-file-label {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 16px;
          background: rgba(255,255,255,0.7);
          border: 2px dashed rgba(192,132,252,0.4);
          border-radius: 13px;
          color: #7c3aed;
          cursor: pointer;
          transition: all 0.25s ease;
          width: 100%;
          font-size: 0.85rem; font-weight: 600;
          height: 46px;
        }
        .su-file-label:hover {
          background: rgba(168,85,247,0.08);
          border-color: #a855f7;
        }
        .su-file-input { display: none; }

        @media (max-width: 480px) {
          .su-card { padding: 22px 16px 18px; border-radius: 22px; max-width: 98vw; }
          .su-logo-title { font-size: 1.7rem; }
          .su-input, .su-textarea { font-size: 16px; }
          .su-btn-primary, .su-btn-secondary { min-height: 46px; font-size: 0.86rem; }
          .su-step-line { width: 28px; }
          .su-otp-input { font-size: 1.2rem; letter-spacing: 0.35rem; }
        }
        @media (max-height: 720px) {
          .su-card { padding: 18px 20px 14px; }
          .su-group { margin-bottom: 9px; }
          .su-logo { margin-bottom: 10px; }
          .su-steps { margin-bottom: 12px; }
        }
      `}</style>

      {/* Ambient orbs */}
      <div style={{position:'absolute',width:'420px',height:'420px',borderRadius:'50%',background:'radial-gradient(circle,rgba(192,132,252,.22) 0%,transparent 70%)',top:'-160px',left:'-160px',animation:'sFloatOrb1 12s ease-in-out infinite',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',width:'300px',height:'300px',borderRadius:'50%',background:'radial-gradient(circle,rgba(216,180,254,.2) 0%,transparent 70%)',bottom:'-100px',right:'-100px',animation:'sFloatOrb2 15s ease-in-out infinite',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',width:'220px',height:'220px',borderRadius:'50%',background:'radial-gradient(circle,rgba(168,85,247,.18) 0%,transparent 70%)',top:'40%',right:'-80px',animation:'sFloatOrb3 18s ease-in-out infinite',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'absolute',width:'170px',height:'170px',borderRadius:'50%',background:'radial-gradient(circle,rgba(233,213,255,.28) 0%,transparent 70%)',bottom:'12%',left:'-55px',animation:'sFloatOrb1 10s ease-in-out infinite reverse',pointerEvents:'none',zIndex:0}}/>

      <div className="su-card" style={{position:'relative',zIndex:1}}>
        {/* Logo */}
        <div className="su-logo">
          <img
            src="/tingletap-logo.jpg"
            alt="TingleTap Logo"
            className="su-logo-img"
          />
          <h1 className="su-logo-title">TingleTap</h1>
          <p className="su-logo-sub">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle',marginRight:'5px'}}>
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#c084fc" stroke="#a855f7" strokeWidth="1"/>
            </svg>
            Create your amazing profile
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle',marginLeft:'5px'}}>
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#c084fc" stroke="#a855f7" strokeWidth="1"/>
            </svg>
          </p>
        </div>

        {/* Step Indicator */}
        <div className="su-steps">
          <div className={`su-step-circle ${currentStep > 1 ? 'su-step-done' : currentStep === 1 ? 'su-step-active' : 'su-step-inactive'}`}>
            {currentStep > 1 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : '1'}
          </div>
          <div className={`su-step-line ${currentStep >= 2 ? 'su-line-active' : 'su-line-inactive'}`}/>
          <div className={`su-step-circle ${currentStep > 2 ? 'su-step-done' : currentStep === 2 ? 'su-step-active' : 'su-step-inactive'}`}>
            {currentStep > 2 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5 9-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : '2'}
          </div>
          <div className={`su-step-line ${currentStep >= 3 ? 'su-line-active' : 'su-line-inactive'}`}/>
          <div className={`su-step-circle ${currentStep === 3 ? 'su-step-active' : 'su-step-inactive'}`}>3</div>
        </div>

        {/* Step 1: Credentials */}
        {currentStep === 1 && (
          <div>
            <h3 className="su-step-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle',marginRight:'6px'}}>
                <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="#9333ea" strokeWidth="2"/>
                <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#9333ea" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Setup Your Credentials
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>

              {/* Username Field */}
              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="#a855f7" strokeWidth="2" fill="none"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  </svg>
                  Username <span style={{color:'#ef4444',marginLeft:'2px'}}>*</span>
                  <span style={{marginLeft:'auto',fontSize:'0.72rem',color:'#a99cc4',fontWeight:400}}>letters, numbers, _ only</span>
                </label>
                <div style={{position:'relative'}}>
                  <span style={{
                    position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',
                    color:'#a855f7',fontWeight:700,fontSize:'1rem',pointerEvents:'none',userSelect:'none'
                  }}>@</span>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="choose_username"
                    className="su-input"
                    style={{paddingLeft:'30px', paddingRight: usernameChecking || usernameStatus ? '38px' : '16px'}}
                    maxLength={20}
                    required
                  />
                  <div style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)'}}>
                    {usernameChecking && (
                      <div style={{width:'14px',height:'14px',border:'2px solid rgba(168,85,247,0.3)',borderTopColor:'#a855f7',borderRadius:'50%',animation:'sSpin 0.7s linear infinite'}}/>
                    )}
                    {!usernameChecking && usernameStatus === 'available' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#22c55e"/>
                        <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {!usernameChecking && usernameStatus === 'taken' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#ef4444"/>
                        <path d="M8 8l8 8M16 8l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                {formData.username.length >= 3 && !usernameChecking && usernameStatus === 'available' && (
                  <div style={{color:'#22c55e',fontSize:'0.74rem',fontWeight:600,marginTop:'4px',display:'flex',alignItems:'center',gap:'4px'}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#22c55e"/><path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    @{formData.username} is available!
                  </div>
                )}
                {formData.username.length >= 3 && !usernameChecking && usernameStatus === 'taken' && (
                  <div style={{color:'#ef4444',fontSize:'0.74rem',fontWeight:600,marginTop:'4px',display:'flex',alignItems:'center',gap:'4px'}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#ef4444"/><path d="M8 8l8 8M16 8l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                    Username taken. Try another one.
                  </div>
                )}
                {formData.username.length > 0 && formData.username.length < 3 && (
                  <div style={{color:'#f97316',fontSize:'0.74rem',fontWeight:500,marginTop:'4px'}}>Minimum 3 characters required</div>
                )}
              </div>

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="#a855f7" strokeWidth="2"/>
                    <path d="M2 8l10 7 10-7" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Email Address
                </label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange}
                  placeholder="your.email@gmail.com" className="su-input" required/>
              </div>

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="#a855f7" strokeWidth="2"/>
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1.5" fill="#a855f7"/>
                  </svg>
                  Password
                </label>
                <div className="su-pw-wrap">
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password}
                    onChange={handleInputChange} placeholder="Create a strong password"
                    className="su-input" style={{paddingRight:'50px'}} required/>
                  <button type="button" className="su-pw-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOpenSVG/> : <EyeClosedSVG/>}
                  </button>
                </div>
                {formData.password && (
                  <div style={{animation:'sFadeUp 0.3s ease forwards'}}>
                    <div className={`su-strength-bar su-s-${getPasswordStrength(formData.password).level}`}>
                      <div className="su-strength-fill"/>
                    </div>
                    <div className="su-strength-text">
                      <span className={`su-st-${getPasswordStrength(formData.password).level}`}>{getPasswordStrength(formData.password).text}</span>
                      {getPasswordStrength(formData.password).level === 'strong' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" fill="#22c55e"/>
                          <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    {getPasswordStrength(formData.password).level !== 'strong' && (
                      <div className="su-reqs">
                        {[
                          [formData.password.length >= 8, '8+ characters'],
                          [/[A-Z]/.test(formData.password), 'Uppercase'],
                          [/[a-z]/.test(formData.password), 'Lowercase'],
                          [/\d/.test(formData.password), 'Number'],
                          [/[!@#$%^&*(),.?":{}|<>]/.test(formData.password), 'Special char'],
                        ].map(([met, label]) => (
                          <div key={label} className={`su-req ${met ? 'su-req-met' : 'su-req-unmet'}`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                              {met
                                ? <><circle cx="12" cy="12" r="10" fill="#22c55e"/><path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></>
                                : <circle cx="12" cy="12" r="10" fill="none" stroke="#c084fc" strokeWidth="2"/>
                              }
                            </svg>
                            {label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="#a855f7" strokeWidth="2"/>
                  </svg>
                  Confirm Password
                </label>
                <div className="su-pw-wrap">
                  <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword}
                    onChange={handleInputChange} placeholder="Confirm your password"
                    className="su-input" style={{paddingRight:'50px'}} required/>
                  <button type="button" className="su-pw-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                    {showConfirmPassword ? <EyeOpenSVG/> : <EyeClosedSVG/>}
                  </button>
                </div>
                {formData.confirmPassword && (
                  formData.password === formData.confirmPassword ? (
                    <div className="su-match-ok">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#22c55e"/>
                        <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Passwords match
                    </div>
                  ) : (
                    <div className="su-match-err">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#ef4444"/>
                        <path d="M8 8l8 8M16 8l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Passwords don't match
                    </div>
                  )
                )}
              </div>

              {error && (
                <div className="su-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                    <path d="M12 7v5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="#ef4444"/>
                  </svg>
                  {error}
                </div>
              )}
              <button type="submit" className="su-btn-primary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Continue to Verification
              </button>
            </form>
          </div>
        )}

        {/* Step 2: OTP */}
        {currentStep === 2 && (
          <div>
            <h3 className="su-step-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle',marginRight:'6px'}}>
                <rect x="2" y="4" width="20" height="16" rx="3" fill="none" stroke="#9333ea" strokeWidth="2"/>
                <path d="M2 8l10 7 10-7" stroke="#9333ea" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Verify Your Email
            </h3>

            <div className="su-otp-icon-wrap">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="otpMailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc"/>
                    <stop offset="100%" stopColor="#7c3aed"/>
                  </linearGradient>
                </defs>
                <rect x="2" y="4" width="20" height="16" rx="3" fill="url(#otpMailGrad)"/>
                <path d="M2 8l10 7 10-7" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <circle cx="18" cy="7" r="3.5" fill="#22c55e"/>
                <path d="M16.5 7l1.2 1.2 2-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{margin:'6px 0 2px',color:'#7e6ca8',fontSize:'0.8rem'}}>Verification code sent to:</p>
              <p className="su-otp-email">{formData.email}</p>
              <p className="su-otp-desc">Check your inbox and spam folder</p>
            </div>

            <div className="su-group">
              <label className="su-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                6-Digit Verification Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                }}
                placeholder="• • • • • •"
                className="su-otp-input"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="su-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
                  <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                  <path d="M12 7v5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1" fill="#ef4444"/>
                </svg>
                {error}
              </div>
            )}

            <button onClick={handleOTPVerification} className="su-btn-primary" disabled={!otp || otp.length !== 6}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
              </svg>
              Verify Email
            </button>

            <div className="su-otp-row">
              <button type="button" onClick={() => { setCurrentStep(1); setError(''); setOtp(''); setOtpSent(false); }} className="su-btn-secondary" style={{flex:1}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5M12 19l-7-7 7-7" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back
              </button>
              <button type="button" onClick={sendOTP} disabled={otpLoading} className="su-btn-secondary" style={{flex:1}}>
                {otpLoading ? (
                  <><div className="su-spinner" style={{width:'14px',height:'14px',borderColor:'rgba(124,58,237,0.3)',borderTopColor:'#7c3aed'}}/> Sending...</>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Resend OTP
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Profile */}
        {currentStep === 3 && (
          <div>
            <h3 className="su-step-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle',marginRight:'6px'}}>
                <circle cx="12" cy="8" r="4" fill="none" stroke="#9333ea" strokeWidth="2"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#9333ea" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Complete Your Profile
            </h3>

            <form onSubmit={handleSubmit}>
              {profilePicPreview && (
                <img src={profilePicPreview} alt="Profile Preview" className="su-pic-preview"/>
              )}

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="13" r="4" fill="none" stroke="#a855f7" strokeWidth="2"/>
                    <path d="M20 21a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M9 3l1.5 2h3L15 3" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Profile Picture
                </label>
                <input type="file" accept="image/*" onChange={handleProfilePicChange} className="su-file-input" id="profilePic"/>
                <label htmlFor="profilePic" className="su-file-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="#7c3aed" strokeWidth="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="#a855f7"/>
                    <path d="M21 15l-5-5L5 21" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {formData.profilePic ? 'Change Picture' : 'Upload Profile Picture'}
                </label>
              </div>

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="7" r="4" stroke="#a855f7" strokeWidth="2"/>
                  </svg>
                  Full Name
                </label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange}
                  placeholder="Enter your full name" className="su-input" required/>
              </div>

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="#a855f7" strokeWidth="2"/>
                    <line x1="16" y1="2" x2="16" y2="6" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="2" x2="8" y2="6" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="3" y1="10" x2="21" y2="10" stroke="#a855f7" strokeWidth="2"/>
                  </svg>
                  Date of Birth
                </label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange}
                  className="su-input" required/>
              </div>

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#a855f7" strokeWidth="2"/>
                    <path d="M12 8v4l3 3" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Gender
                </label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="su-input" required>
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#a855f7" strokeWidth="2"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#a855f7" strokeWidth="2"/>
                    <path d="M2 12h20" stroke="#a855f7" strokeWidth="2"/>
                  </svg>
                  Country
                </label>
                <select name="country" value={formData.country} onChange={handleInputChange} className="su-input" required>
                  <option value="">Select Country</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="India">India</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Japan">Japan</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Mexico">Mexico</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="7" width="20" height="14" rx="2" fill="none" stroke="#a855f7" strokeWidth="2"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="#a855f7" strokeWidth="2"/>
                    <line x1="12" y1="12" x2="12" y2="16" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="10" y1="14" x2="14" y2="14" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Profession <span style={{color:'#b09dcc',fontWeight:400}}>(optional)</span>
                </label>
                <input type="text" name="profession" value={formData.profession} onChange={handleInputChange}
                  placeholder="What do you do for work?" className="su-input"/>
              </div>

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#a855f7" strokeWidth="2"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="9" y1="9" x2="9.01" y2="9" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round"/>
                    <line x1="15" y1="9" x2="15.01" y2="9" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  Status Message <span style={{color:'#b09dcc',fontWeight:400}}>(optional)</span>
                </label>
                <input type="text" name="status" value={formData.status} onChange={handleInputChange}
                  placeholder="What's on your mind?" className="su-input"/>
              </div>

              <div className="su-group">
                <label className="su-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Bio <span style={{color:'#b09dcc',fontWeight:400}}>(optional)</span>
                </label>
                <textarea name="bio" value={formData.bio} onChange={handleInputChange}
                  placeholder="Tell us about yourself..." rows={2} className="su-textarea"/>
              </div>

              {error && (
                <div className="su-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
                    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                    <path d="M12 7v5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="#ef4444"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="su-btn-primary">
                {loading ? (
                  <><div className="su-spinner"/><span>Creating Account...</span></>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="white"/>
                    </svg>
                    Create My Account
                  </>
                )}
              </button>

              <button type="button" onClick={() => { setCurrentStep(2); setError(''); }} className="su-btn-secondary">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5M12 19l-7-7 7-7" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Verification
              </button>
            </form>
          </div>
        )}

        <div className="su-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in here</Link>
        </div>

        {showIPBanModal && (
          <IPBanModal
            banInfo={ipBanData}
            onRetry={async () => {
              try {
                const accessResult = await IPBanSystem.checkUserAccess(navigator.userAgent);
                if (accessResult.allowed) {
                  setShowIPBanModal(false);
                  setIPBanData(null);
                  document.body.style.overflow = '';
                  document.body.style.position = '';
                  document.body.style.userSelect = '';
                  if (window.ipBanInterval) clearInterval(window.ipBanInterval);
                } else {
                  toast.error('Your IP address is still banned from accessing this platform.');
                }
              } catch (error) {
                toast.error('Error checking access. Please try again later.');
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SignupPage;
