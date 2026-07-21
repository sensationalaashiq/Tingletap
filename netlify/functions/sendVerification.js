const APP_NAME = process.env.BREVO_SENDER_NAME || 'App';
// Standalone email verification sender — no shared imports, no file system, HTML inline.
// Falls back to Firebase Auth REST API if Admin SDK credentials are unavailable.
import admin from 'firebase-admin';

// FIREBASE_WEB_API_KEY is the Firebase Web API key (same value as VITE_FIREBASE_API_KEY).
// Set it as a Netlify environment variable; VITE_FIREBASE_API_KEY is used as fallback
// since it is already present in the Netlify build environment.
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;

const CORS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

let fbInit = false;
function ensureFirebase() {
  if (fbInit || admin.apps.length > 0) { fbInit = true; return; }
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase env vars missing');
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  fbInit = true;
}

function buildVerifyHtml(name, email, link) {
  const n = String(name  || 'there').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const e = String(email || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const l = String(link  || '#');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${APP_NAME} – Verify Your Email</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@keyframes bar-slide{0%{background-position:-300% center}100%{background-position:300% center}}
@keyframes logo-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.04)}}
@keyframes star-twirl{0%,100%{transform:rotate(0deg) scale(.8);opacity:.35}50%{transform:rotate(72deg) scale(1.2);opacity:1}}
@keyframes env-float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-10px) rotate(2deg)}}
@keyframes badge-pop{0%{transform:scale(0) rotate(-20deg);opacity:0}70%{transform:scale(1.2) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes check-draw{from{stroke-dashoffset:40}to{stroke-dashoffset:0}}
@keyframes sparkle{0%,100%{opacity:.2;transform:scale(.7) rotate(0deg)}50%{opacity:1;transform:scale(1.1) rotate(30deg)}}
.bar{animation:bar-slide 3.5s linear infinite}
.logo-img{animation:logo-float 3.5s ease-in-out infinite;display:block}
.star-a{animation:star-twirl 2.8s ease-in-out infinite}
.star-b{animation:star-twirl 3.6s ease-in-out infinite .7s}
.env-icon{animation:env-float 3s ease-in-out infinite}
.badge{animation:badge-pop .55s cubic-bezier(.34,1.56,.64,1) 1s both}
.sparkle-a{animation:sparkle 2.4s ease-in-out infinite}
.sparkle-b{animation:sparkle 3.2s ease-in-out infinite .9s}
@media(max-width:600px){.outer{padding:16px 8px!important}.inner{padding:28px 20px 24px!important}.cta-btn{font-size:15px!important;padding:15px 24px!important;width:100%!important;box-sizing:border-box!important}}
</style></head>
<body style="margin:0;padding:0;background:#ede9f9;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(155deg,#f3eeff 0%,#ede9f9 50%,#e8e4f6 100%);min-height:100vh;">
<tr><td class="outer" align="center" style="padding:32px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:24px;border:1px solid rgba(139,92,246,.16);box-shadow:0 20px 64px rgba(109,40,217,.13),0 4px 20px rgba(109,40,217,.07);overflow:hidden;">
  <tr><td style="height:5px;padding:0;line-height:0;font-size:0;"><div class="bar" style="height:5px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#f472b6,#e879f9,#c084fc,#9333ea,#6d28d9);background-size:300% 100%;"></div></td></tr>
  <tr><td align="center" style="padding:36px 32px 22px;background:linear-gradient(180deg,#faf8ff 0%,#f5f0ff 50%,#fff 100%);">
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;"><tr>
      <td style="padding-right:18px;vertical-align:middle;"><svg class="star-a" width="18" height="18" viewBox="0 0 24 24"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc" stroke="#a855f7" stroke-width="1"/></svg></td>
      <td><div style="position:relative;display:inline-block;"><div style="position:absolute;inset:-4px;border-radius:22px;background:linear-gradient(135deg,rgba(124,58,237,.25),rgba(192,132,252,.15));filter:blur(6px);"></div><img class="logo-img" src="https://res.cloudinary.com/dbqnocfoq/image/upload/f_auto,q_auto,w_300/tingletap-logo_irf2a8.png" alt="${APP_NAME}" width="84" height="84" style="display:block;width:84px;height:84px;border-radius:20px;border:0;position:relative;box-shadow:0 8px 28px rgba(124,58,237,.25);"/></div></td>
      <td style="padding-left:18px;vertical-align:middle;"><svg class="star-b" width="18" height="18" viewBox="0 0 24 24"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc" stroke="#a855f7" stroke-width="1"/></svg></td>
    </tr></table>
    <div style="font-size:28px;font-weight:900;letter-spacing:.2px;margin:0 0 5px;background:linear-gradient(135deg,#5b21b6,#9333ea,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${APP_NAME}</div>
    <div style="color:#a78bca;font-size:11px;letter-spacing:3.5px;text-transform:uppercase;font-weight:700;">Email Verification</div>
  </td></tr>
  <tr><td style="padding:0 32px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.22),transparent);"></div></td></tr>
  <tr><td class="inner" style="padding:32px 36px 28px;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;"><tr><td align="center">
      <div style="position:relative;display:inline-block;">
        <div style="position:absolute;inset:-12px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.14) 0%,transparent 70%);"></div>
        <div class="env-icon" style="display:inline-flex;align-items:center;justify-content:center;width:92px;height:92px;border-radius:50%;background:linear-gradient(135deg,#f0ebff,#ede9fe);box-shadow:0 10px 32px rgba(124,58,237,.16),0 2px 8px rgba(124,58,237,.08);border:1.5px solid rgba(139,92,246,.18);position:relative;">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="evG2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#c084fc"/></linearGradient></defs>
            <rect x="2" y="4" width="20" height="16" rx="3" fill="url(#evG2)" opacity=".12"/>
            <rect x="2" y="4" width="20" height="16" rx="3" stroke="url(#evG2)" stroke-width="1.8"/>
            <path d="M2 8l10 6 10-6" stroke="url(#evG2)" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M2 20l7-7M22 20l-7-7" stroke="url(#evG2)" stroke-width="1.2" opacity=".4" stroke-linecap="round"/>
            <circle class="badge" cx="19" cy="19" r="5.5" fill="#22c55e" stroke="white" stroke-width="1.5"/>
            <path class="badge" d="M16.5 19l2 2 3-3" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10" stroke-dashoffset="10" style="animation:check-draw .4s 1.3s ease forwards;"/>
          </svg>
          <svg class="sparkle-a" width="12" height="12" viewBox="0 0 24 24" style="position:absolute;top:-2px;right:-2px;"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc"/></svg>
          <svg class="sparkle-b" width="9" height="9" viewBox="0 0 24 24" style="position:absolute;bottom:0;left:-1px;"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#a855f7"/></svg>
        </div>
      </div>
    </td></tr></table>
    <h1 style="margin:0 0 10px;font-size:23px;font-weight:800;color:#2d1b4e;text-align:center;letter-spacing:-.4px;line-height:1.3;">Confirm Your Email Address</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#7e6ca8;text-align:center;line-height:1.65;">You're one click away from unlocking your full ${APP_NAME} experience.</p>
    <p style="margin:0 0 7px;font-size:15px;color:#3d2565;font-weight:700;">Hi ${n},</p>
    <p style="margin:0 0 26px;font-size:14px;color:#6b5b8a;line-height:1.7;">We received a request to verify the email address <strong style="color:#7c3aed;background:rgba(124,58,237,.07);padding:1px 6px;border-radius:6px;">${e}</strong> for your ${APP_NAME} account. Click the button below to confirm your address and fully activate your account.</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 26px;width:100%;"><tr><td align="center">
      <a href="${l}" target="_blank" class="cta-btn" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#9333ea 55%,#c084fc 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:17px 40px;border-radius:16px;box-shadow:0 10px 32px rgba(109,40,217,.38),0 2px 8px rgba(109,40,217,.2);letter-spacing:.3px;width:100%;box-sizing:border-box;text-align:center;">&#10003;&nbsp; Verify My Email Address</a>
    </td></tr></table>
    <div style="margin-bottom:22px;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#a78bca;letter-spacing:2px;text-transform:uppercase;text-align:center;">What you'll unlock</p>
      <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;margin-bottom:8px;border-radius:12px;background:linear-gradient(135deg,rgba(124,58,237,.05),rgba(192,132,252,.04));border:1px solid rgba(139,92,246,.12);">
        <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#ede9fe,#f5f0ff);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(124,58,237,.12);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#7c3aed" stroke-width="2" stroke-linejoin="round"/></svg>
        </div>
        <div><div style="font-size:13px;font-weight:700;color:#3d2565;">Live Chat Rooms</div><div style="font-size:11.5px;color:#9b7fd4;margin-top:1px;">Connect with thousands in real time</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;margin-bottom:8px;border-radius:12px;background:linear-gradient(135deg,rgba(5,150,105,.05),rgba(52,211,153,.04));border:1px solid rgba(16,185,129,.12);">
        <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#d1fae5,#ecfdf5);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(16,185,129,.12);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15l-4 5 4-2 4 2-4-5z" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="#10b981" stroke-width="2"/></svg>
        </div>
        <div><div style="font-size:13px;font-weight:700;color:#065f46;">Achievements &amp; Badges</div><div style="font-size:11.5px;color:#6ee7b7;margin-top:1px;">Earn titles &amp; show off your status</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:12px;background:linear-gradient(135deg,rgba(59,130,246,.05),rgba(99,102,241,.04));border:1px solid rgba(99,102,241,.12);">
        <div style="width:34px;height:34px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#ede9fe,#e8eeff);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(99,102,241,.12);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2a3 3 0 0 0-3 3v4H6l-2 2v2h16v-2l-2-2h-3V5a3 3 0 0 0-3-3z" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/><path d="M9 19c0 1.66 1.34 3 3 3s3-1.34 3-3" stroke="#6366f1" stroke-width="2" stroke-linecap="round"/></svg>
        </div>
        <div><div style="font-size:13px;font-weight:700;color:#3730a3;">Live RJ Broadcasts</div><div style="font-size:11.5px;color:#818cf8;margin-top:1px;">Tune into live audio stages 24/7</div></div>
      </div>
    </div>
    <div style="background:rgba(109,40,217,.04);border:1px solid rgba(139,92,246,.15);border-radius:12px;padding:14px 18px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="36" style="vertical-align:top;padding-top:1px;"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ede9fe,#f5f0ff);display:flex;align-items:center;justify-content:center;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#9333ea" stroke-width="1.8"/><path d="M12 7v5l3 3" stroke="#9333ea" stroke-width="1.8" stroke-linecap="round"/></svg></div></td>
        <td style="padding-left:10px;"><p style="margin:0;font-size:13px;color:#5b21b6;font-weight:700;">Link expires in 24 hours</p><p style="margin:3px 0 0;font-size:12px;color:#7e6ca8;line-height:1.55;">If you didn't create a ${APP_NAME} account, you can safely ignore this email.</p></td>
      </tr></table>
    </div>
  </td></tr>
  <tr><td style="padding:0 32px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.18),transparent);"></div></td></tr>
  <tr><td align="center" style="padding:20px 32px 28px;">
    <p style="margin:0 0 6px;font-size:12px;color:#a78bca;">This is an automated email from ${APP_NAME}. Please do not reply.</p>
    <p style="margin:0 0 10px;font-size:11px;color:#c4b5fd;line-height:1.55;">If the button above doesn't work, copy and paste this URL into your browser:</p>
    <p style="margin:0 0 18px;font-size:10px;color:#b09ed4;word-break:break-all;">${l}</p>
    <div class="badge" style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#f5f0ff,#ede9fe);border-radius:24px;padding:7px 18px;border:1px solid rgba(139,92,246,.18);box-shadow:0 3px 12px rgba(124,58,237,.1);">
      <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc"/></svg>
      <span style="font-size:11.5px;font-weight:800;color:#7c3aed;letter-spacing:.08em;">${APP_NAME} — India's Premium Chat Community</span>
      <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc"/></svg>
    </div>
    <p style="margin:14px 0 0;font-size:10px;color:#d4c5f0;">&copy; 2026 ${APP_NAME}&trade; &middot; All rights reserved.</p>
  </td></tr>
  <tr><td style="height:5px;padding:0;line-height:0;font-size:0;"><div class="bar" style="height:5px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#f472b6,#e879f9,#c084fc,#9333ea,#6d28d9);background-size:300% 100%;"></div></td></tr>
</table></td></tr></table>
</body></html>`;
}

async function sendViaBrevo({ to, subject, html, text }) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY not set');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender:      { name: process.env.BREVO_SENDER_NAME || '', email: process.env.BREVO_SENDER_EMAIL || '' },
      to:          [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
      tags:        ['tingletap-transactional', 'email-verification'],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Brevo ${res.status}: ${e.message || JSON.stringify(e)}`);
  }
  return res.json();
}

// H-06 fix: removed in-memory rateLimits Map (resets on every cold start, so it
// provided no real protection across Netlify function invocations).
// firestoreRateLimitCheck persists counters in Firestore/_rateLimits and falls
// back to an in-memory check only when Firebase Admin is unavailable.
import { firestoreRateLimitCheck } from './shared/validation.js';

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', ...CORS };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')   return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const email    = String(body.email    || '').trim().slice(0, 254);
  const userName = String(body.userName || '').trim().slice(0, 100);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email required' }) };

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = await firestoreRateLimitCheck(`verify:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return { statusCode: 429, headers: { ...headers, 'Retry-After': String(rl.retryAfter) }, body: JSON.stringify({ error: 'Too many requests. Please try again later.' }) };

  // ── Try Firebase Admin path (branded Brevo email) ────────────────────────────
  let adminWorking = false;
  try { ensureFirebase(); adminWorking = true; }
  catch (err) {
    console.warn('[sendVerification] Firebase Admin init failed, will use REST fallback:', err.message);
  }

  if (adminWorking) {
    let firebaseLink;
    try {
      firebaseLink = await admin.auth().generateEmailVerificationLink(email, {
        url: `${process.env.ALLOWED_ORIGIN || ''}/verify-email`,
        handleCodeInApp: false,
      });
    } catch (err) {
      console.warn('[sendVerification] generateEmailVerificationLink failed, falling back to REST:', err.message, err.code);
      adminWorking = false;
    }

    if (adminWorking && firebaseLink) {
      let verifyUrl = firebaseLink;
      try {
        const parsed  = new URL(firebaseLink);
        const oobCode = parsed.searchParams.get('oobCode');
        if (oobCode) verifyUrl = `${process.env.ALLOWED_ORIGIN || ''}/verify-email?oobCode=${encodeURIComponent(oobCode)}`;
      } catch {}

      const displayName = userName || email.split('@')[0];
      try {
        await sendViaBrevo({
          to:      email,
          subject: 'Verify Your ${APP_NAME} Email Address',
          html:    buildVerifyHtml(displayName, email, verifyUrl),
          text:    `Hi ${displayName},\n\nPlease verify your ${APP_NAME} email:\n${verifyUrl}\n\nExpires in 24 hours. If you didn't create a ${APP_NAME} account, ignore this email.\n\n${APP_NAME} Team\n${process.env.BREVO_SENDER_EMAIL || ''}`,
        });
        console.log('[sendVerification] ✓ Branded email sent via Brevo');
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      } catch (err) {
        console.warn('[sendVerification] Brevo send failed, falling back to Firebase REST:', err.message);
      }
    }
  }

  // ── Fallback: Firebase Auth REST API (requires idToken from the client) ─────────
  // idToken must be provided by caller; without it the REST flow cannot authenticate.
  const idToken = String(body.idToken || '').trim();
  if (!idToken) {
    console.error('[sendVerification] All methods failed — no idToken for REST fallback');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not send verification email' }) };
  }

  console.log('[sendVerification] Using Firebase REST API fallback');
  try {
    const fbRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_WEB_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }),
      }
    );
    const fbData = await fbRes.json().catch(() => ({}));
    if (fbRes.ok) {
      console.log('[sendVerification] ✓ Firebase REST fallback succeeded');
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, fallback: true }) };
    }
    console.error('[sendVerification] Firebase REST fallback error:', fbData.error?.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: `Verification email failed: ${fbData.error?.message || 'Unknown error'}` }) };
  } catch (err) {
    console.error('[sendVerification] All methods failed:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not send verification email' }) };
  }
};
