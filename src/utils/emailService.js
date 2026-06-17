
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

// Send OTP verification email using direct REST API (more reliable than SDK)
export const sendOTPEmail = async (email, otp) => {
  // Store OTP in localStorage first (so it works even if email has delay)
  localStorage.setItem(`otp_${email}`, JSON.stringify({
    otp: otp,
    timestamp: Date.now(),
    expires: Date.now() + (10 * 60 * 1000) // 10 minutes
  }));

  const templateParams = {
    to_email: email,
    user_email: email,
    email: email,
    user_name: email.split('@')[0],
    otp_code: otp,
    otp: otp,
    code: otp,
    app_name: 'TingleTap',
    from_name: 'TingleTap Team',
    message: `Your TingleTap verification code is: ${otp}. It expires in 10 minutes.`
  };

  // Method 1: Direct REST API (no SDK initialization required)
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_CONFIG.serviceId,
        template_id: 'template_5yk012w',
        user_id: EMAILJS_CONFIG.publicKey,
        template_params: templateParams
      })
    });

    if (response.ok) {
      console.log('OTP email sent via REST API');
      return { success: true, message: 'OTP sent successfully!' };
    }

    const errText = await response.text();
    console.warn('REST API attempt failed:', response.status, errText);
  } catch (fetchErr) {
    console.warn('REST API fetch error:', fetchErr);
  }

  // Method 2: SDK with OTP template
  try {
    initializeEmailJS();
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      'template_5yk012w',
      templateParams,
      EMAILJS_CONFIG.publicKey
    );
    console.log('OTP email sent via SDK (OTP template):', result);
    return { success: true, message: 'OTP sent successfully!' };
  } catch (sdkErr) {
    console.warn('SDK OTP template failed:', sdkErr);
  }

  // Method 3: REST API with original working template (template_rynlsk5) as fallback
  try {
    const fallbackParams = {
      ...templateParams,
      user_email: email,
      reset_link: `Your OTP code is: ${otp} (expires in 10 minutes)`,
      message: `Your TingleTap verification code is: ${otp}. It expires in 10 minutes.`
    };
    const response2 = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_CONFIG.serviceId,
        template_id: EMAILJS_CONFIG.templateId,
        user_id: EMAILJS_CONFIG.publicKey,
        template_params: fallbackParams
      })
    });
    if (response2.ok) {
      console.log('OTP email sent via REST API (fallback template)');
      return { success: true, message: 'OTP sent successfully!' };
    }
    const errText2 = await response2.text();
    console.warn('Fallback template also failed:', response2.status, errText2);
  } catch (fallbackErr) {
    console.warn('Fallback REST API error:', fallbackErr);
  }

  // Method 4: SDK with original template
  try {
    initializeEmailJS();
    const fallbackParams = {
      ...templateParams,
      reset_link: `Your OTP code is: ${otp} (expires in 10 minutes)`
    };
    const result = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      fallbackParams,
      EMAILJS_CONFIG.publicKey
    );
    console.log('OTP email sent via SDK (fallback template):', result);
    return { success: true, message: 'OTP sent successfully!' };
  } catch (finalErr) {
    console.error('All email sending methods failed:', finalErr);
  }

  // All methods failed — OTP is still in localStorage, return error so user knows
  console.error('⚠️ All email methods failed. OTP for debugging:', otp);
  return {
    success: false,
    error: 'Could not send OTP email. Please check your EmailJS template settings or try again.'
  };
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
