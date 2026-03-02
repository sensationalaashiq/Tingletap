
import emailjs from '@emailjs/browser';
import CryptoJS from 'crypto-js';

// EmailJS configuration - आपको अपने credentials से replace करना होगा
const EMAILJS_CONFIG = {
  serviceId: 'service_ifklrtb', // Gmail service ID
  templateId: 'template_rynlsk5', // Custom template ID
  publicKey: '3Dza90dvmw142K5uD' // Public key
};

// Custom password reset token generation
const generateResetToken = (email) => {
  const timestamp = Date.now();
  const payload = { email, timestamp };
  const token = CryptoJS.AES.encrypt(JSON.stringify(payload), 'your-secret-key').toString();
  return token.replace(/[^a-zA-Z0-9]/g, ''); // Clean token
};

// Generate OTP for email verification
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Send OTP verification email
export const sendOTPEmail = async (email, otp) => {
  try {
    const templateParams = {
      user_email: email,
      user_name: email.split('@')[0],
      otp_code: otp,
      app_name: 'TingleTap',
      from_name: 'TingleTap Team'
    };

    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      'template_5yk012w', // OTP verification template
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    console.log('OTP email sent:', result);
    
    // Store OTP temporarily with expiration
    localStorage.setItem(`otp_${email}`, JSON.stringify({
      otp: otp,
      timestamp: Date.now(),
      expires: Date.now() + (5 * 60 * 1000) // 5 minutes
    }));

    return { success: true, message: 'OTP sent successfully!' };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { 
      success: false, 
      error: 'Failed to send OTP. Please try again.' 
    };
  }
};

// Verify OTP
export const verifyOTP = (email, enteredOTP) => {
  try {
    const storedData = localStorage.getItem(`otp_${email}`);
    if (!storedData) return false;

    const { otp, expires } = JSON.parse(storedData);
    
    if (Date.now() > expires) {
      localStorage.removeItem(`otp_${email}`);
      return false;
    }

    return otp === enteredOTP;
  } catch (error) {
    console.error('OTP verification error:', error);
    return false;
  }
};

// Clear OTP from storage
export const clearOTP = (email) => {
  localStorage.removeItem(`otp_${email}`);
};

// Custom password reset email service using EmailJS
export const sendCustomPasswordResetEmail = async (email) => {
  try {
    // Generate custom reset token
    const resetToken = generateResetToken(email);
    
    // Create reset link (आपके domain के साथ)
    const resetLink = `${window.location.origin}/reset-password?token=${resetToken}&email=${email}`;
    
    // EmailJS template parameters
    const templateParams = {
      user_email: email,
      user_name: email.split('@')[0],
      reset_link: resetLink,
      app_name: 'TingleTap',
      from_name: 'TingleTap Team'
    };

    // Send email via EmailJS
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
      EMAILJS_CONFIG.publicKey
    );

    console.log('Custom password reset email sent:', result);
    
    // Store reset token temporarily (आप localStorage या server पर store कर सकते हैं)
    localStorage.setItem(`reset_token_${email}`, JSON.stringify({
      token: resetToken,
      timestamp: Date.now(),
      expires: Date.now() + (60 * 60 * 1000) // 1 hour
    }));

    return { success: true, message: 'Password reset email sent successfully!' };
  } catch (error) {
    console.error('Error sending custom password reset email:', error);
    return { 
      success: false, 
      error: 'Failed to send password reset email. Please try again.' 
    };
  }
};

// Verify reset token
export const verifyResetToken = (token, email) => {
  try {
    const storedData = localStorage.getItem(`reset_token_${email}`);
    if (!storedData) return false;

    const { token: storedToken, expires } = JSON.parse(storedData);
    
    if (Date.now() > expires) {
      localStorage.removeItem(`reset_token_${email}`);
      return false;
    }

    return token === storedToken;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
};

// Initialize EmailJS
export const initializeEmailJS = () => {
  emailjs.init(EMAILJS_CONFIG.publicKey);
};
