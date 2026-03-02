
import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, createUserProfile } from '../firebase/config';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { generateOTP, sendOTPEmail, verifyOTP, clearOTP, initializeEmailJS } from '../utils/emailService';
import IPBanModal from '../components/IPBanModal';
import { IPBanSystem } from '../utils/ipBanSystem';
import './LandingPage.css';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    dateOfBirth: '',
    gender: '',
    country: '',
    profession: '',
    bio: '',
    status: '',
    profilePic: null
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

  // IP Ban System states
  const [showIPBanModal, setShowIPBanModal] = useState(false);
  const [ipBanData, setIPBanData] = useState(null);
  const [ipCheckPerformed, setIPCheckPerformed] = useState(false);

  const navigate = useNavigate();

  // Initialize EmailJS
  React.useEffect(() => {
    initializeEmailJS();
  }, []);

  // IP Ban System Check - Same as LoginPage
  useEffect(() => {
    const checkIPBanOnLoad = async () => {
      // Check for IP ban before allowing signup
      if (!ipCheckPerformed) {
        try {
          console.log('🔍 IP Ban System: Checking user access on SignupPage...');
          const accessResult = await IPBanSystem.checkUserAccess(navigator.userAgent);
          
          setIPCheckPerformed(true);
          
          if (!accessResult.allowed && accessResult.reason === 'ip_banned') {
            console.log('🚫 IP Ban System: IP is banned, blocking signup access', accessResult.ip);
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
            return; // Don't allow signup if IP is banned
          }
          
          console.log('✅ IP Ban System: IP access allowed for signup', accessResult.ip);
        } catch (error) {
          console.error('❌ IP Ban System: Error checking IP ban on SignupPage', error);
          setIPCheckPerformed(true); // Allow continuation on error
        }
      }
    };

    checkIPBanOnLoad();
  }, [ipCheckPerformed]);

  // Send OTP function
  const sendOTP = async () => {
    setOtpLoading(true);
    const otpCode = generateOTP();
    const result = await sendOTPEmail(formData.email, otpCode);

    if (result.success) {
      setOtpSent(true);
      toast.success('OTP sent to your email!');
    } else {
      toast.error(result.error);
    }
    setOtpLoading(false);
  };

  // Verify OTP function
  const handleOTPVerification = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

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

  // Validate email domains
  const validateEmail = (email) => {
    const validDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.co.in'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    return validDomains.includes(emailDomain);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle profile picture upload
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile picture must be less than 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        profilePic: file
      }));

      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Move to next step with validation
  const nextStep = async () => {
    if (currentStep === 1) {
      // Clear previous errors
      setError('');

      // Validate step 1
      if (!formData.email.trim()) {
        setError('Please enter your email address');
        return;
      }

      if (!formData.password.trim()) {
        setError('Please enter a password');
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      if (!formData.confirmPassword.trim()) {
        setError('Please confirm your password');
        return;
      }

      if (!validateEmail(formData.email)) {
        setError('Please use a valid email from Gmail, Hotmail, Outlook, or Yahoo');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Move to OTP verification step
      setCurrentStep(2);
      // Auto-send OTP when moving to step 2
      if (!otpSent) {
        await sendOTP();
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate step 2
    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      setLoading(false);
      return;
    }

    if (!formData.dateOfBirth) {
      setError('Please enter your date of birth');
      setLoading(false);
      return;
    }

    if (!formData.gender) {
      setError('Please select your gender');
      setLoading(false);
      return;
    }

    if (!formData.country) {
      setError('Please select your country');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Wait for auth state to be properly set
      await new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
          if (currentUser && currentUser.uid === user.uid) {
            unsubscribe();
            resolve();
          }
        });
      });

      let profilePicURL = '';

      // Upload profile picture if provided
      if (formData.profilePic) {
        try {
          const formDataImg = new FormData();
          formDataImg.append('image', formData.profilePic);
          formDataImg.append('key', '46c5e6c30b68dd8f5c5c3e7c6e8d8c8e');

          const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formDataImg
          });

          const result = await response.json();
          if (result.success) {
            profilePicURL = result.data.url;
          }
        } catch (imgError) {
          console.warn('Failed to upload profile picture, using default');
        }
      }

      // Use gender-appropriate default avatar if no profile pic uploaded
      const defaultAvatar = formData.gender === 'female'
        ? `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=female&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
        : `https://api.dicebear.com/8.x/adventurer/svg?seed=${user.uid}&sex=male&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

      const userProfileData = {
        uid: user.uid,
        email: formData.email,
        displayName: formData.fullName,
        gender: formData.gender || 'Not specified',
        country: formData.country || 'Unknown',
        status: formData.status || "I'm new here!",
        bio: formData.bio || '',
        profession: formData.profession || '',
        photoURL: profilePicURL || defaultAvatar,
        dateOfBirth: formData.dateOfBirth
      };

      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = await createUserProfile(userProfileData);

      if (!result.success) {
        // Clean up the created auth user if profile creation fails
        try {
          await user.delete();
        } catch (deleteError) {
          console.error('Failed to clean up user after profile creation failure:', deleteError);
        }
        throw new Error('Failed to create user profile. Please try again.');
      }

      toast.success('Account created successfully! Welcome to TingleTap!');
      navigate('/rooms');
    } catch (err) {
      // Custom error messages instead of Firebase errors
      let errorMessage = 'Account creation failed. Please try again.';

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters long';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later';
      } else if (err.message === 'Failed to create user profile. Please try again.') {
        errorMessage = 'Failed to create user profile. Please try again.';
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
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

          .signup-container {
            background: rgba(15, 15, 35, 0.95);
            border-radius: 20px;
            padding: 20px;
            width: 100%;
            max-width: 360px;
            height: auto;
            max-height: 95vh;
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

          .signup-container::before {
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
          
          .signup-container::after {
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
            margin-bottom: 10px;
          }

          .logo h1 {
            font-size: 1.8rem;
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
            font-size: 0.8rem;
            margin: 5px 0 0 0;
            font-weight: 600;
            letter-spacing: 0.3px;
          }

          .step-indicator {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 15px;
            gap: 8px;
          }

          .step-circle {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.8rem;
            transition: all 0.3s ease;
          }

          .step-circle.active {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #2a5298 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(79, 172, 254, 0.3);
          }

          .step-circle.inactive {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .step-line {
            width: 30px;
            height: 2px;
            border-radius: 1px;
            transition: all 0.3s ease;
          }

          .step-line.active {
            background: linear-gradient(90deg, #4facfe, #00f2fe);
          }

          .step-line.inactive {
            background: rgba(255, 255, 255, 0.2);
          }

          .step-title {
            font-size: 1.2rem;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.95);
            text-align: center;
            margin-bottom: 15px;
          }

          .form-group {
            margin-bottom: 8px;
            position: relative;
          }

          .form-label {
            display: block;
            margin-bottom: 6px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.85rem;
            letter-spacing: 0.2px;
          }

          .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            font-size: 0.9rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.95);
            box-sizing: border-box;
            height: 44px;
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

          .primary-btn {
            width: 100%;
            padding: 14px 20px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #2a5298 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            min-height: 44px;
            -webkit-tap-highlight-color: transparent;
            overflow: hidden;
            box-shadow: 
              0 6px 20px rgba(79, 172, 254, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
            margin-bottom: 8px;
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
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-top: 8px;
            min-height: 44px;
          }

          .secondary-btn:hover {
            border-color: #4facfe;
            color: #4facfe;
            background: rgba(79, 172, 254, 0.1);
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(79, 172, 254, 0.2);
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

          .profile-pic-preview {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #4facfe;
            margin: 0 auto 10px auto;
            display: block;
          }

          .file-input {
            display: none;
          }

          .file-input-label {
            display: inline-block;
            padding: 10px 16px;
            background: rgba(255, 255, 255, 0.08);
            border: 2px dashed rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            color: rgba(255, 255, 255, 0.9);
            cursor: pointer;
            text-align: center;
            transition: all 0.2s ease;
            width: 100%;
            font-size: 0.85rem;
            font-weight: 500;
            box-sizing: border-box;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .file-input-label:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: #4facfe;
            color: #4facfe;
          }

          .login-link {
            text-align: center;
            margin-top: 12px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
          }

          .login-link a {
            color: #4facfe;
            text-decoration: none;
            font-weight: 700;
            transition: all 0.3s ease;
          }

          .login-link a:hover {
            color: #00f2fe;
            text-shadow: 0 0 6px rgba(0, 242, 254, 0.5);
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

          .password-requirements {
            margin-top: 8px;
            padding: 8px 10px;
            background: rgba(249, 250, 251, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            animation: slideDown 0.3s ease-out;
          }

          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
              max-height: 0;
            }
            to {
              opacity: 1;
              transform: translateY(0);
              max-height: 150px;
            }
          }

          .requirements-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }

          .requirement {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.7rem;
            transition: all 0.3s ease;
            padding: 3px;
            border-radius: 4px;
          }

          .requirement.met {
            color: #059669;
            background: rgba(16, 185, 129, 0.1);
          }

          .requirement.unmet {
            color: rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.05);
          }

          .req-icon {
            font-size: 0.65rem;
            font-weight: bold;
            width: 10px;
            text-align: center;
          }

          .requirement.met .req-icon {
            color: #10b981;
            animation: checkPulse 0.4s ease-out;
          }

          @keyframes checkPulse {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }

          .password-match-indicator {
            margin-top: 6px;
            opacity: 0;
            animation: fadeInUp 0.3s ease-out forwards;
          }

          .match-success,
          .match-error {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            padding: 6px 10px;
            border-radius: 6px;
            transition: all 0.3s ease;
          }

          .match-success {
            color: #059669;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
          }

          .match-error {
            color: #dc2626;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
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

          .otp-input {
            text-align: center;
            font-size: 1.3rem !important;
            letter-spacing: 0.4rem;
            font-weight: 600;
            font-family: 'Courier New', monospace;
          }

          .otp-container {
            text-align: center;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .email-icon {
            margin-bottom: 10px;
            color: #4facfe;
          }

          @media (max-width: 768px) {
            .signup-container {
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

            .step-circle {
              width: 26px;
              height: 26px;
              font-size: 0.75rem;
            }

            .step-line {
              width: 25px;
            }

            .step-title {
              font-size: 1.1rem;
              margin-bottom: 12px;
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

            .otp-input {
              font-size: 1.1rem !important;
              letter-spacing: 0.3rem;
            }

            .profile-pic-preview {
              width: 45px;
              height: 45px;
            }
          }

          @media (max-width: 480px) {
            .signup-container {
              max-width: 320px;
              padding: 16px;
            }

            .logo h1 {
              font-size: 1.5rem;
            }

            .step-circle {
              width: 24px;
              height: 24px;
              font-size: 0.7rem;
            }

            .step-line {
              width: 20px;
            }

            .form-group {
              margin-bottom: 6px;
            }

            .requirements-grid {
              grid-template-columns: 1fr;
              gap: 4px;
            }

            .otp-input {
              font-size: 1rem !important;
              letter-spacing: 0.2rem;
            }
          }

          @media (max-height: 700px) {
            .signup-container {
              max-height: 98vh;
              padding: 15px;
            }

            .logo {
              margin-bottom: 8px;
            }

            .step-indicator {
              margin-bottom: 10px;
            }

            .form-group {
              margin-bottom: 6px;
            }
          }

          @media (max-height: 600px) {
            .signup-container {
              padding: 12px;
            }

            .logo h1 {
              font-size: 1.4rem;
            }

            .logo p {
              font-size: 0.7rem;
            }

            .step-indicator {
              margin-bottom: 8px;
            }

            .form-group {
              margin-bottom: 5px;
            }

            .primary-btn, .secondary-btn {
              padding: 10px;
              min-height: 40px;
            }
          }
        `}
      </style>

      <div className="signup-container">
        <div className="logo">
          <img 
            src="https://i.ibb.co/4ZPtbZPP/IMG-20250705-044659-583.png" 
            alt="TingleTap Logo" 
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              marginBottom: '6px',
              border: '3px solid transparent',
              background: 'white, linear-gradient(45deg, #ff0080, #ff1493, #ff4081, #e91e63, #9c27b0, #8a2be2, #673ab7, #3f51b5, #2196f3, #00bcd4, #20b2aa, #009688, #4caf50, #32cd32, #8bc34a, #cddc39, #ffeb3b, #ffd700, #ffc107, #ff9800, #ff8c00, #ff5722, #f44336, #dc143c, #ff0080)',
              backgroundClip: 'padding-box, border-box',
              objectFit: 'contain',
              padding: '3px',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}
          />
          <h1>TingleTap</h1>
          <p>Create your amazing profile ✨</p>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step-circle ${currentStep >= 1 ? 'active' : 'inactive'}`}>
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <div className={`step-line ${currentStep >= 2 ? 'active' : 'inactive'}`}></div>
          <div className={`step-circle ${currentStep >= 2 ? 'active' : 'inactive'}`}>
            {currentStep > 2 ? '✓' : '2'}
          </div>
          <div className={`step-line ${currentStep >= 3 ? 'active' : 'inactive'}`}></div>
          <div className={`step-circle ${currentStep >= 3 ? 'active' : 'inactive'}`}>
            {currentStep > 3 ? '✓' : '3'}
          </div>
        </div>

        {/* Step 1: Credentials */}
        {currentStep === 1 && (
          <div>
            <h3 className="step-title">Setup Your Credentials</h3>

            <form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@gmail.com"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password (min. 6 characters)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a strong password"
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
                        <path d="M17.9417.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                {formData.password && (
                  <div className="password-strength-indicator">
                    <div className={`strength-bar strength-${getPasswordStrength(formData.password).level}`}>
                      <div className="strength-fill"></div>
                    </div>
                    <div className="strength-text">
                      <span className={`strength-label strength-${getPasswordStrength(formData.password).level}`}>
                        {getPasswordStrength(formData.password).text}
                      </span>
                      {getPasswordStrength(formData.password).level === 'strong' && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="strength-icon">
                          <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/>
                        </svg>
                      )}
                    </div>
                    {getPasswordStrength(formData.password).level !== 'strong' && (
                      <div className="password-requirements">
                        <div className="requirements-grid">
                          <div className={`requirement ${formData.password.length >= 8 ? 'met' : 'unmet'}`}>
                            <span className="req-icon">{formData.password.length >= 8 ? '✓' : '○'}</span>
                            <span>8+ characters</span>
                          </div>
                          <div className={`requirement ${/[A-Z]/.test(formData.password) ? 'met' : 'unmet'}`}>
                            <span className="req-icon">{/[A-Z]/.test(formData.password) ? '✓' : '○'}</span>
                            <span>Uppercase</span>
                          </div>
                          <div className={`requirement ${/[a-z]/.test(formData.password) ? 'met' : 'unmet'}`}>
                            <span className="req-icon">{/[a-z]/.test(formData.password) ? '✓' : '○'}</span>
                            <span>Lowercase</span>
                          </div>
                          <div className={`requirement ${/\d/.test(formData.password) ? 'met' : 'unmet'}`}>
                            <span className="req-icon">{/\d/.test(formData.password) ? '✓' : '○'}</span>
                            <span>Number</span>
                          </div>
                          <div className={`requirement ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'met' : 'unmet'}`}>
                            <span className="req-icon">{/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? '✓' : '○'}</span>
                            <span>Special char</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    className="form-input"
                    style={{ paddingRight: '45px' }}
                    required
                  />
                  <div
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle"
                  >
                    {showConfirmPassword ? (
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
                {formData.confirmPassword && (
                  <div className="password-match-indicator">
                    {formData.password === formData.confirmPassword ? (
                      <div className="match-success">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2"/>
                        </svg>
                        <span>Passwords match</span>
                      </div>
                    ) : (
                      <div className="match-error">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                          <line x1="15" y1="9" x2="9" y2="15" stroke="#ef4444" strokeWidth="2"/>
                          <line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444" strokeWidth="2"/>
                        </svg>
                        <span>Passwords don't match</span>
                      </div>
                    )}
                  </div>
                )}
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

              <button type="submit" className="primary-btn">
                Continue to Step 2 →
              </button>
            </form>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {currentStep === 2 && (
          <div>
            <h3 className="step-title">Verify Your Email</h3>

            <div className="otp-container">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="email-icon">
                <defs>
                  <linearGradient id="emailVerifyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4facfe" />
                    <stop offset="100%" stopColor="#00f2fe" />
                  </linearGradient>
                </defs>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="url(#emailVerifyGradient)"/>
                <polyline points="22,6 12,13 2,6" stroke="white" strokeWidth="2" fill="none"/>
                <circle cx="18" cy="8" r="3" fill="#22c55e"/>
                <path d="M16.5 9.5L17.5 10.5L19.5 8.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p style={{ color: rgba(255, 255, 255, 0.9), fontSize: '0.85rem', margin: '0 0 6px 0' }}>
                We've sent a 6-digit verification code to:
              </p>
              <p style={{ color: '#4facfe', fontSize: '1rem', fontWeight: '600', margin: '0' }}>
                {formData.email}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Enter Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                }}
                placeholder="Enter 6-digit OTP"
                className="form-input otp-input"
                maxLength={6}
                required
              />
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
              onClick={handleOTPVerification}
              className="primary-btn"
              disabled={!otp || otp.length !== 6}
            >
              Verify Email →
            </button>

            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginTop: '12px' 
            }}>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setError('');
                  setOtp('');
                  setOtpSent(false);
                }}
                className="secondary-btn"
                style={{ flex: '1' }}
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={sendOTP}
                disabled={otpLoading}
                className="secondary-btn"
                style={{ flex: '1' }}
              >
                {otpLoading ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Profile Details */}
        {currentStep === 3 && (
          <div>
            <h3 className="step-title">Complete Your Profile</h3>

            <form onSubmit={handleSubmit}>
              {profilePicPreview && (
                <img src={profilePicPreview} alt="Profile Preview" className="profile-pic-preview" />
              )}

              <div className="form-group">
                <label className="form-label">Profile Picture</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  className="file-input"
                  id="profilePic"
                />
                <label htmlFor="profilePic" className="file-input-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                    <defs>
                      <linearGradient id="cameraGradientSignup" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4facfe" />
                        <stop offset="100%" stopColor="#00f2fe" />
                      </linearGradient>
                    </defs>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill="url(#cameraGradientSignup)"/>
                    <circle cx="12" cy="13" r="4" fill="white"/>
                  </svg>
                  {formData.profilePic ? 'Change Picture' : 'Upload Picture'}
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Country</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                >
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

              <div className="form-group">
                <label className="form-label">Profession</label>
                <input
                  type="text"
                  name="profession"
                  value={formData.profession}
                  onChange={handleInputChange}
                  placeholder="What do you do for work?"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status Message</label>
                <input
                  type="text"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  placeholder="What's on your mind?"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself..."
                  rows="2"
                  className="form-input"
                  style={{ resize: 'vertical', minHeight: '50px', borderRadius: '12px', padding: '12px 16px' }}
                />
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
                {loading ? 'Creating Account...' : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                      <defs>
                        <linearGradient id="partyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" />
                          <stop offset="100%" stopColor="#f0f0f0" />
                        </linearGradient>
                      </defs>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#partyGradient)"/>
                    </svg>
                    Create Account
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentStep(2);
                  setError('');
                }}
                className="secondary-btn"
              >
                ← Back to Verification
              </button>
            </form>
          </div>
        )}

        <div className="login-link">
          Already have an account? <Link to="/login">Login here</Link>
        </div>

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
    </div>
  );
};

export default SignupPage;
