
import CryptoJS from 'crypto-js';

// ── OTP helpers ───────────────────────────────────────────────────────────────

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Send OTP via Brevo (Netlify Function) — no EmailJS.
 * OTP hash is stored in sessionStorage for client-side verification.
 */
export const sendOTPEmail = async (email, otp, userName) => {
  // Store only a hash — never the raw OTP — in sessionStorage
  const otpHash = CryptoJS.SHA256(otp).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 min
  sessionStorage.setItem(`otp_hash_${email}`, otpHash);
  sessionStorage.setItem(`otp_exp_${email}`,  String(expires));

  try {
    const res = await fetch('/.netlify/functions/sendOTP', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, otp, userName: userName || email.split('@')[0] }),
    });

    if (res.ok) {
      console.log('✅ OTP sent via Brevo');
      return { success: true };
    }

    const data = await res.json().catch(() => ({}));
    const msg  = data.error || `Server error ${res.status}`;
    console.error('❌ OTP send failed:', msg);
    return { success: false, error: msg };
  } catch (err) {
    const msg = `Network error: ${err.message}`;
    console.error('❌', msg);
    return { success: false, error: 'Could not send verification email. Please check your connection.' };
  }
};

export const verifyOTP = (email, entered) => {
  try {
    const storedHash = sessionStorage.getItem(`otp_hash_${email}`);
    const storedExp  = sessionStorage.getItem(`otp_exp_${email}`);
    if (!storedHash || !storedExp) return false;

    if (Date.now() > Number(storedExp)) {
      sessionStorage.removeItem(`otp_hash_${email}`);
      sessionStorage.removeItem(`otp_exp_${email}`);
      return false;
    }

    const enteredHash = CryptoJS.SHA256(String(entered)).toString();
    const match = enteredHash === storedHash;

    if (match) {
      sessionStorage.removeItem(`otp_hash_${email}`);
      sessionStorage.removeItem(`otp_exp_${email}`);
    }

    return match;
  } catch { return false; }
};

export const clearOTP = (email) => {
  sessionStorage.removeItem(`otp_hash_${email}`);
  sessionStorage.removeItem(`otp_exp_${email}`);
};

// No-op kept for any remaining stale imports — safe to remove callers
export const initializeEmailJS = () => {};
