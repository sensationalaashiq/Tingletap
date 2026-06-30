
import emailjs from '@emailjs/browser';
import CryptoJS from 'crypto-js';

const SERVICE_ID  = 'service_ifklrtb';
const PUBLIC_KEY  = '3Dza90dvmw142K5uD';
const OTP_TEMPLATE    = 'template_5yk012w';
const RESET_TEMPLATE  = 'template_rynlsk5';

// Initialize once at module load
emailjs.init(PUBLIC_KEY);

// ── helpers ──────────────────────────────────────────────────────────────────

const restSend = (templateId, params) =>
  fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: SERVICE_ID,
      template_id: templateId,
      user_id: PUBLIC_KEY,
      template_params: params
    })
  });

const sdkSend = (templateId, params) =>
  emailjs.send(SERVICE_ID, templateId, params, PUBLIC_KEY);

// ── OTP ──────────────────────────────────────────────────────────────────────

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOTPEmail = async (email, otp) => {
  // Always store first — UI can proceed even if email has a delay
  localStorage.setItem(`otp_${email}`, JSON.stringify({
    otp,
    timestamp: Date.now(),
    expires: Date.now() + 10 * 60 * 1000   // 10 min
  }));

  const params = {
    to_email:   email,
    user_email: email,
    email:      email,
    user_name:  email.split('@')[0],
    otp_code:   otp,
    otp:        otp,
    code:       otp,
    app_name:   'TingleTap',
    from_name:  'TingleTap Team',
    message:    `Your TingleTap verification code is: ${otp}. Valid for 10 minutes.`
  };

  // 1️⃣ REST API (fastest, no SDK init needed)
  try {
    const r = await restSend(OTP_TEMPLATE, params);
    if (r.ok) {
      console.log('✅ OTP sent via REST');
      return { success: true };
    }
    console.warn('REST failed:', r.status, await r.text());
  } catch (e) { console.warn('REST error:', e.message); }

  // 2️⃣ SDK
  try {
    await sdkSend(OTP_TEMPLATE, params);
    console.log('✅ OTP sent via SDK');
    return { success: true };
  } catch (e) { console.warn('SDK error:', e.message); }

  // OTP is in localStorage → verification still works even without email
  console.warn('⚠️ Email delivery failed; OTP available in localStorage for dev testing:', otp);
  return {
    success: false,
    error: 'Could not send the OTP email. Check EmailJS template settings or spam folder.'
  };
};

export const verifyOTP = (email, entered) => {
  try {
    const raw = localStorage.getItem(`otp_${email}`);
    if (!raw) return false;
    const { otp, expires } = JSON.parse(raw);
    if (Date.now() > expires) { localStorage.removeItem(`otp_${email}`); return false; }
    return otp === entered;
  } catch { return false; }
};

export const clearOTP = (email) => localStorage.removeItem(`otp_${email}`);

// ── Password Reset ────────────────────────────────────────────────────────────

const generateResetToken = (email) => {
  const payload = JSON.stringify({ email, ts: Date.now() });
  return CryptoJS.AES.encrypt(payload, 'tt-reset-secret').toString()
    .replace(/[^a-zA-Z0-9]/g, '');
};

export const sendCustomPasswordResetEmail = async (email) => {
  const token     = generateResetToken(email);
  const resetLink = `${window.location.origin}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  localStorage.setItem(`reset_token_${email}`, JSON.stringify({
    token,
    expires: Date.now() + 60 * 60 * 1000   // 1 hour
  }));

  const params = {
    to_email:   email,
    user_email: email,
    email:      email,
    user_name:  email.split('@')[0],
    reset_link: resetLink,
    app_name:   'TingleTap',
    from_name:  'TingleTap Team'
  };

  // 1️⃣ REST API
  try {
    const r = await restSend(RESET_TEMPLATE, params);
    if (r.ok) {
      console.log('✅ Reset email sent via REST');
      return { success: true };
    }
    console.warn('Reset REST failed:', r.status, await r.text());
  } catch (e) { console.warn('Reset REST error:', e.message); }

  // 2️⃣ SDK
  try {
    await sdkSend(RESET_TEMPLATE, params);
    console.log('✅ Reset email sent via SDK');
    return { success: true };
  } catch (e) { console.warn('Reset SDK error:', e.message); }

  return { success: false, error: 'Failed to send reset email. Please try again.' };
};

export const verifyResetToken = (token, email) => {
  try {
    const raw = localStorage.getItem(`reset_token_${email}`);
    if (!raw) return false;
    const { token: stored, expires } = JSON.parse(raw);
    if (Date.now() > expires) { localStorage.removeItem(`reset_token_${email}`); return false; }
    return token === stored;
  } catch { return false; }
};

// Keep export for backward compat (already inited at top)
export const initializeEmailJS = () => emailjs.init(PUBLIC_KEY);
