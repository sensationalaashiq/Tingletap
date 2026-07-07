
import emailjs from '@emailjs/browser';
import CryptoJS from 'crypto-js';

const SERVICE_ID  = 'service_ki69cuc';
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
  // FIX 9: Store only a hash — never the raw OTP — and only in sessionStorage
  const otpHash = CryptoJS.SHA256(otp).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 min
  sessionStorage.setItem(`otp_hash_${email}`, otpHash);
  sessionStorage.setItem(`otp_exp_${email}`, String(expires));

  const params = {
    to_email:   email,
    user_email: email,
    email:      email,
    user_name:  email.split('@')[0],
    otp_code:   otp,
    otp:        otp,
    code:       otp,
    app_name:   'TingleTap',
    from_name:  'Alerts@tingletap.com',
    message:    `Your TingleTap verification code is: ${otp}. Valid for 10 minutes.`
  };

  // 1️⃣ REST API (fastest, no SDK init needed)
  let lastError = '';
  try {
    const r = await restSend(OTP_TEMPLATE, params);
    const body = await r.text();
    if (r.ok) {
      console.log('✅ OTP sent via REST');
      return { success: true };
    }
    lastError = `EmailJS HTTP ${r.status}: ${body}`;
    console.error('❌', lastError);
  } catch (e) {
    lastError = `EmailJS network error: ${e.message}`;
    console.error('❌', lastError);
  }

  // 2️⃣ SDK fallback
  try {
    await sdkSend(OTP_TEMPLATE, params);
    console.log('✅ OTP sent via SDK');
    return { success: true };
  } catch (e) {
    const sdkErr = `EmailJS SDK ${e?.status ?? ''}: ${e?.text ?? e?.message ?? JSON.stringify(e)}`;
    console.error('❌', sdkErr);
    lastError = sdkErr;
  }

  console.warn('⚠️ Both EmailJS methods failed. OTP hash stored in sessionStorage.');
  return {
    success: false,
    error: lastError || 'Could not send OTP email.'
  };
};

export const verifyOTP = (email, entered) => {
  // FIX 9: Compare hashed values only; delete immediately on success or expiry
  try {
    const storedHash = sessionStorage.getItem(`otp_hash_${email}`);
    const storedExp  = sessionStorage.getItem(`otp_exp_${email}`);
    if (!storedHash || !storedExp) return false;

    if (Date.now() > Number(storedExp)) {
      // Expired — clean up immediately
      sessionStorage.removeItem(`otp_hash_${email}`);
      sessionStorage.removeItem(`otp_exp_${email}`);
      return false;
    }

    const enteredHash = CryptoJS.SHA256(String(entered)).toString();
    const match = enteredHash === storedHash;

    if (match) {
      // Delete immediately on successful verification
      sessionStorage.removeItem(`otp_hash_${email}`);
      sessionStorage.removeItem(`otp_exp_${email}`);
    }

    return match;
  } catch { return false; }
};

export const clearOTP = (email) => {
  // FIX 9: Clear both sessionStorage keys
  sessionStorage.removeItem(`otp_hash_${email}`);
  sessionStorage.removeItem(`otp_exp_${email}`);
};

// ── Password Reset ────────────────────────────────────────────────────────────

const generateResetToken = (email) => {
  // Secret key read from build-time env var; falls back to a local-only default so
  // the dev server on Replit still works without a Replit Secret configured.
  const secret = import.meta.env.VITE_EMAIL_SECRET || 'tt-reset-secret-local-dev';
  const payload = JSON.stringify({ email, ts: Date.now() });
  return CryptoJS.AES.encrypt(payload, secret).toString()
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
    from_name:  'Alerts@tingletap.com'
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
