const APP_NAME = process.env.BREVO_SENDER_NAME || 'App';
// Standalone password reset sender — no shared imports, no file system, HTML inline.
import admin from 'firebase-admin';

// FIREBASE_WEB_API_KEY is the Firebase Web API key used by the server-side REST fallback.
// It must be set as its own server-only Netlify environment variable. We intentionally do
// NOT fall back to VITE_FIREBASE_API_KEY here: that variable is bundled into the client build
// and treating it as interchangeable with a server-only secret defeats the point of having one.
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;

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

const PREMIUM_FOOTER = `
  <tr><td style="padding:0 28px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.18),transparent);"></div></td></tr>
  <tr><td align="center" style="padding:16px 28px 8px;background:#faf8ff;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 8px;">
      <tr>
        <td style="padding-right:8px;vertical-align:middle;">
          <svg class="heart" width="20" height="20" viewBox="0 0 24 24"><path d="M12 21C12 21 3 14.5 3 8.5A5 5 0 0 1 12 6a5 5 0 0 1 9 2.5C21 14.5 12 21 12 21z" fill="#f43f5e" stroke="#e11d48" stroke-width="1.3"/></svg>
        </td>
        <td style="vertical-align:middle;">
          <span style="font-size:12px;font-weight:800;color:#7c3aed;letter-spacing:.3px;">Developed by Adrashtra</span>
          <span style="font-size:12px;color:#d8b4fe;margin:0 6px;">&middot;</span>
          <span style="font-size:12px;font-weight:800;color:#db2777;">Loved by India</span>
        </td>
        <td style="padding-left:8px;vertical-align:middle;">
          <svg class="heart" width="20" height="20" viewBox="0 0 24 24" style="animation-delay:.4s"><path d="M12 21C12 21 3 14.5 3 8.5A5 5 0 0 1 12 6a5 5 0 0 1 9 2.5C21 14.5 12 21 12 21z" fill="#f43f5e" stroke="#e11d48" stroke-width="1.3"/></svg>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 4px;font-size:10.5px;color:#a78bca;">This is an automated security email. Please do not reply directly.</p>
    <p style="margin:0;font-size:10.5px;color:#c4b5fd;">&copy; 2026 <strong style="color:#9333ea;">${APP_NAME}&trade;</strong> &middot; India's Premium Chat Community &middot; All rights reserved.</p>
  </td></tr>`;

function buildResetHtml(name, email, link) {
  const n = String(name  || 'there').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const e = String(email || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const l = String(link  || '#');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${APP_NAME} – Reset Your Password</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@keyframes bar-slide{0%{background-position:-300% center}100%{background-position:300% center}}
@keyframes logo-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.04)}}
@keyframes star-twirl{0%,100%{transform:rotate(0deg) scale(.8);opacity:.35}50%{transform:rotate(72deg) scale(1.2);opacity:1}}
@keyframes shield-pulse{0%,100%{box-shadow:0 0 0 0 rgba(109,40,217,.18),0 10px 32px rgba(109,40,217,.14)}50%{box-shadow:0 0 0 10px rgba(109,40,217,.06),0 16px 44px rgba(109,40,217,.22)}}
@keyframes lock-appear{0%{transform:translateY(-8px) scale(.9);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes heart-beat{0%,100%{transform:scale(1)}25%{transform:scale(1.18)}75%{transform:scale(1.1)}}
@keyframes badge-pop{0%{transform:scale(0) rotate(-20deg);opacity:0}70%{transform:scale(1.2) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes sparkle{0%,100%{opacity:.2;transform:scale(.7) rotate(0deg)}50%{opacity:1;transform:scale(1.1) rotate(30deg)}}
.bar{animation:bar-slide 3.5s linear infinite}
.logo-img{animation:logo-float 3.5s ease-in-out infinite;display:block}
.star-a{animation:star-twirl 2.8s ease-in-out infinite}
.star-b{animation:star-twirl 3.6s ease-in-out infinite .7s}
.shield-wrap{animation:shield-pulse 2.4s ease-in-out infinite}
.lock-icon{animation:lock-appear .6s cubic-bezier(.34,1.56,.64,1) .3s both}
.heart{animation:heart-beat 1.6s ease-in-out infinite;transform-origin:center;display:block}
.heart-b{animation:heart-beat 1.6s ease-in-out infinite .5s;transform-origin:center;display:block}
.badge{animation:badge-pop .55s cubic-bezier(.34,1.56,.64,1) .9s both}
.sparkle-a{animation:sparkle 2.4s ease-in-out infinite}
.sparkle-b{animation:sparkle 3.2s ease-in-out infinite .9s}
@media(max-width:600px){.outer{padding:16px 8px!important}.inner{padding:28px 18px 24px!important}.cta-btn{font-size:15px!important;padding:15px 24px!important;width:100%!important;box-sizing:border-box!important}}
</style></head>
<body style="margin:0;padding:0;background:#ede9f9;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(155deg,#f3eeff 0%,#ede9f9 50%,#e8e4f6 100%);min-height:100vh;">
<tr><td class="outer" align="center" style="padding:32px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:24px;border:1px solid rgba(139,92,246,.16);box-shadow:0 20px 64px rgba(109,40,217,.13),0 4px 20px rgba(109,40,217,.07);overflow:hidden;">
  <tr><td style="height:5px;padding:0;line-height:0;font-size:0;"><div class="bar" style="height:5px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#f472b6,#e879f9,#c084fc,#9333ea,#6d28d9);background-size:300% 100%;"></div></td></tr>
  <tr><td align="center" style="padding:36px 32px 22px;background:linear-gradient(180deg,#faf8ff 0%,#f5f0ff 50%,#fff 100%);">
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;"><tr>
      <td style="padding-right:18px;vertical-align:middle;"><svg class="star-a" width="18" height="18" viewBox="0 0 24 24"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc" stroke="#a855f7" stroke-width="1"/></svg></td>
      <td><div style="position:relative;display:inline-block;"><div style="position:absolute;inset:-4px;border-radius:22px;background:linear-gradient(135deg,rgba(124,58,237,.22),rgba(192,132,252,.12));filter:blur(6px);"></div><img class="logo-img" src="https://res.cloudinary.com/dbqnocfoq/image/upload/f_auto,q_auto,w_300/tingletap-logo_irf2a8.png" alt="${APP_NAME}" width="84" height="84" style="display:block;width:84px;height:84px;border-radius:20px;border:0;position:relative;box-shadow:0 8px 28px rgba(124,58,237,.25);"/></div></td>
      <td style="padding-left:18px;vertical-align:middle;"><svg class="star-b" width="18" height="18" viewBox="0 0 24 24"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc" stroke="#a855f7" stroke-width="1"/></svg></td>
    </tr></table>
    <div style="font-size:28px;font-weight:900;letter-spacing:.2px;margin:0 0 5px;background:linear-gradient(135deg,#5b21b6,#9333ea,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${APP_NAME}</div>
    <div style="color:#a78bca;font-size:11px;letter-spacing:3.5px;text-transform:uppercase;font-weight:700;">Password Reset</div>
  </td></tr>
  <tr><td style="padding:0 32px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.22),transparent);"></div></td></tr>
  <tr><td class="inner" style="padding:32px 36px 28px;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;"><tr><td align="center">
      <div style="position:relative;display:inline-block;">
        <div style="position:absolute;inset:-10px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.12) 0%,transparent 70%);"></div>
        <div class="shield-wrap" style="display:inline-flex;align-items:center;justify-content:center;width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#f0ebff,#ede9fe);border:1.5px solid rgba(139,92,246,.18);position:relative;">
          <div class="lock-icon" style="display:flex;align-items:center;justify-content:center;">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="shG2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#c084fc"/></linearGradient></defs>
              <path d="M12 2L4 6v6c0 5.25 3.5 9.75 8 11 4.5-1.25 8-5.75 8-11V6L12 2z" fill="url(#shG2)" opacity=".12"/>
              <path d="M12 2L4 6v6c0 5.25 3.5 9.75 8 11 4.5-1.25 8-5.75 8-11V6L12 2z" stroke="url(#shG2)" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
              <rect x="8.5" y="11" width="7" height="6.5" rx="1.5" fill="url(#shG2)"/>
              <path d="M10 11V9a2 2 0 014 0v2" stroke="url(#shG2)" stroke-width="1.6" stroke-linecap="round" fill="none"/>
              <circle cx="12" cy="14.5" r="1.1" fill="white" opacity=".9"/>
            </svg>
          </div>
          <svg class="sparkle-a" width="12" height="12" viewBox="0 0 24 24" style="position:absolute;top:4px;right:6px;"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc"/></svg>
          <svg class="sparkle-b" width="9" height="9" viewBox="0 0 24 24" style="position:absolute;bottom:6px;left:5px;"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#a855f7"/></svg>
        </div>
      </div>
    </td></tr></table>
    <h1 style="margin:0 0 10px;font-size:23px;font-weight:800;color:#2d1b4e;text-align:center;letter-spacing:-.4px;line-height:1.3;">Password Reset Request</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#7e6ca8;text-align:center;line-height:1.65;">We received a request to reset the password for your ${APP_NAME} account.</p>
    <p style="margin:0 0 7px;font-size:15px;color:#3d2565;font-weight:700;">Hi ${n},</p>
    <p style="margin:0 0 26px;font-size:14px;color:#6b5b8a;line-height:1.7;">Someone requested a password reset for the account associated with <strong style="color:#7c3aed;background:rgba(124,58,237,.07);padding:1px 6px;border-radius:6px;">${e}</strong>. If this was you, click the button below to set a new secure password.</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 26px;width:100%;"><tr><td align="center">
      <a href="${l}" target="_blank" class="cta-btn" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#9333ea 55%,#c084fc 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:17px 40px;border-radius:16px;box-shadow:0 10px 32px rgba(109,40,217,.38),0 2px 8px rgba(109,40,217,.2);letter-spacing:.3px;width:100%;box-sizing:border-box;text-align:center;">&#128273;&nbsp; Reset My Password</a>
    </td></tr></table>
    <div style="background:rgba(109,40,217,.05);border:1px solid rgba(139,92,246,.15);border-radius:14px;padding:16px 18px;margin-bottom:20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="38" style="vertical-align:top;padding-top:1px;"><div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#ede9fe,#f5f0ff);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(124,58,237,.1);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#9333ea" stroke-width="1.8"/><path d="M12 7v5l3 3" stroke="#9333ea" stroke-width="1.8" stroke-linecap="round"/></svg></div></td>
        <td style="padding-left:12px;"><p style="margin:0;font-size:13px;color:#5b21b6;font-weight:700;">Link expires in 1 hour</p><p style="margin:3px 0 0;font-size:12px;color:#7e6ca8;line-height:1.55;">For your security, this reset link is only valid for 60 minutes from when it was requested.</p></td>
      </tr></table>
    </div>
    <div style="background:linear-gradient(135deg,#faf8ff,#f5f0ff);border-radius:16px;padding:18px 20px;margin-bottom:20px;border:1px solid rgba(139,92,246,.1);">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#5b21b6;text-transform:uppercase;letter-spacing:1.5px;">&#128274; Password Security Tips</p>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="padding:4px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right:8px;vertical-align:top;padding-top:1px;"><div style="width:18px;height:18px;border-radius:50%;background:rgba(124,58,237,.1);display:flex;align-items:center;justify-content:center;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#7c3aed" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div></td><td style="font-size:12.5px;color:#6b5b8a;line-height:1.5;">Use at least 8 characters — longer is better</td></tr></table></td></tr>
        <tr><td style="padding:4px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right:8px;vertical-align:top;padding-top:1px;"><div style="width:18px;height:18px;border-radius:50%;background:rgba(124,58,237,.1);display:flex;align-items:center;justify-content:center;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#7c3aed" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div></td><td style="font-size:12.5px;color:#6b5b8a;line-height:1.5;">Mix uppercase, lowercase, numbers &amp; symbols</td></tr></table></td></tr>
        <tr><td style="padding:4px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-right:8px;vertical-align:top;padding-top:1px;"><div style="width:18px;height:18px;border-radius:50%;background:rgba(124,58,237,.1);display:flex;align-items:center;justify-content:center;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#7c3aed" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div></td><td style="font-size:12.5px;color:#6b5b8a;line-height:1.5;">Never reuse passwords across different sites</td></tr></table></td></tr>
      </table>
    </div>
    <div style="background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.13);border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="30" style="vertical-align:top;padding-top:1px;"><div style="width:22px;height:22px;border-radius:50%;background:rgba(239,68,68,.1);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17v.5" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/><path d="M12 2L2 20h20L12 2z" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div></td>
        <td style="padding-left:10px;"><p style="margin:0;font-size:13px;color:#b91c1c;font-weight:700;">Didn't request this?</p><p style="margin:4px 0 0;font-size:12px;color:#9b1c1c;line-height:1.6;">If you did not request a password reset, please ignore this email. Your account remains secure and no changes have been made.</p></td>
      </tr></table>
    </div>
  </td></tr>
  <tr><td style="padding:0 32px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.16),transparent);"></div></td></tr>
  <tr><td align="center" style="padding:20px 32px 28px;">
    <p style="margin:0 0 6px;font-size:12px;color:#a78bca;">This is an automated security email from ${APP_NAME}. Please do not reply.</p>
    <p style="margin:0 0 10px;font-size:11px;color:#c4b5fd;line-height:1.55;">If the button above doesn't work, copy and paste this URL into your browser:</p>
    <p style="margin:0 0 18px;font-size:10px;color:#b09ed4;word-break:break-all;">${l}</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px;"><tr>
      <td style="padding-right:8px;vertical-align:middle;"><svg class="heart" width="16" height="16" viewBox="0 0 24 24"><path d="M12 21C12 21 3 14.5 3 8.5A5 5 0 0 1 12 6a5 5 0 0 1 9 2.5C21 14.5 12 21 12 21z" fill="#f43f5e" stroke="#e11d48" stroke-width="1.3"/></svg></td>
      <td style="vertical-align:middle;"><span style="font-size:11.5px;font-weight:800;color:#7c3aed;">Developed by Adrashtra</span><span style="font-size:11.5px;color:#d8b4fe;margin:0 6px;">&middot;</span><span style="font-size:11.5px;font-weight:800;color:#db2777;">Loved by India</span></td>
      <td style="padding-left:8px;vertical-align:middle;"><svg class="heart-b" width="16" height="16" viewBox="0 0 24 24"><path d="M12 21C12 21 3 14.5 3 8.5A5 5 0 0 1 12 6a5 5 0 0 1 9 2.5C21 14.5 12 21 12 21z" fill="#f43f5e" stroke="#e11d48" stroke-width="1.3"/></svg></td>
    </tr></table>
    <div class="badge" style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#f5f0ff,#ede9fe);border-radius:24px;padding:7px 18px;border:1px solid rgba(139,92,246,.18);box-shadow:0 3px 12px rgba(124,58,237,.1);">
      <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc"/></svg>
      <span style="font-size:11.5px;font-weight:800;color:#7c3aed;letter-spacing:.05em;">${APP_NAME} — Secure &amp; Premium</span>
      <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc"/></svg>
    </div>
    <p style="margin:14px 0 0;font-size:10px;color:#d4c5f0;">&copy; 2026 ${APP_NAME}&trade; &middot; India's Premium Chat Community &middot; All rights reserved.</p>
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
      tags:        ['tingletap-transactional', 'password-reset'],
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Brevo ${res.status}: ${e.message || JSON.stringify(e)}`);
  }
  return res.json();
}

// Firestore-backed rate limiter (H-06 fix — survives cold starts)
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
  const rl = await firestoreRateLimitCheck(`reset:${ip}`, 3, 5 * 60 * 1000);
  if (!rl.ok) return { statusCode: 429, headers: { ...headers, 'Retry-After': String(rl.retryAfter) }, body: JSON.stringify({ error: 'Too many requests. Please wait a few minutes before trying again.' }) };

  // ── Try Firebase Admin first ───────────────────────────────────────────────
  let adminWorking = false;
  try { ensureFirebase(); adminWorking = true; }
  catch (err) {
    console.error('[sendPasswordReset] Firebase Admin init failed:', err.message);
  }

  if (adminWorking) {
    // Check if user exists
    let userRecord = null;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        // User definitely does NOT exist
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'No account found with this email. Please use your registered login email for password reset.' }),
        };
      }
      console.error('[sendPasswordReset] getUserByEmail error:', err.message);
      // Unknown error — don't reveal email status, return generic error
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'Unable to process your request right now. Please try again in a moment.' }),
      };
    }

    if (userRecord) {
      // User confirmed to exist — generate reset link
      let firebaseLink;
      try {
        // Do NOT pass continueUrl — doing so requires tingletap.com to be in Firebase
        // "Authorized Domains" list; if it's not, Admin SDK throws and we fall back to
        // plain Firebase REST (which sends the generic noreply@ email that lands in spam).
        // We extract the oobCode from the generated link and build our own URL below.
        firebaseLink = await admin.auth().generatePasswordResetLink(email);
      } catch (err) {
        console.error('[sendPasswordReset] generatePasswordResetLink failed:', err.message);
        return await sendViaFirebaseRest(email, headers);
      }

      // Extract clean URL with just the oobCode pointing to our page
      let resetUrl = firebaseLink;
      try {
        const parsed  = new URL(firebaseLink);
        const oobCode = parsed.searchParams.get('oobCode');
        if (oobCode) resetUrl = `https://tingletap.com/reset-password?oobCode=${encodeURIComponent(oobCode)}`;
      } catch {}

      const displayName = userName || userRecord.displayName || email.split('@')[0];

      // Send branded email via Brevo
      try {
        await sendViaBrevo({
          to:      email,
          subject: 'Reset Your ${APP_NAME} Password',
          html:    buildResetHtml(displayName, email, resetUrl),
          text:    `Hi ${displayName},\n\nReset your ${APP_NAME} password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.\n\n${APP_NAME} Team\n${process.env.BREVO_SENDER_EMAIL || ''}`,
        });
        console.log('[sendPasswordReset] ✓ Branded email sent via Brevo to:', email.replace(/(.{2}).+(@.+)/, '$1***$2'));
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      } catch (brevoErr) {
        console.warn('[sendPasswordReset] Brevo failed, trying Firebase REST (user is verified):', brevoErr.message);
        // User is verified to exist — use Firebase REST just to send the email
        return await sendViaFirebaseRest(email, headers);
      }
    }
  }

  // ── Admin SDK not available — can't safely verify email ───────────────────
  // Instead of silently succeeding for any email, return a service error
  console.error('[sendPasswordReset] Firebase Admin unavailable, cannot safely verify email');
  return {
    statusCode: 503,
    headers,
    body: JSON.stringify({ error: 'Password reset service is temporarily unavailable. Please try again in a few minutes or contact support at support@tingletap.com' }),
  };
};

async function sendViaFirebaseRest(email, headers) {
  if (!FIREBASE_WEB_API_KEY) {
    console.error('[sendPasswordReset] FIREBASE_WEB_API_KEY is not set — cannot use Firebase REST fallback');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Password reset service is misconfigured. Please contact support at support@tingletap.com' }),
    };
  }
  try {
    const fbRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_WEB_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
      }
    );
    const fbData = await fbRes.json().catch(() => ({}));
    if (!fbRes.ok) {
      console.error('[sendPasswordReset] Firebase REST error:', fbData.error?.message);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Unable to send reset email. Please try again later.' }),
      };
    }
    console.log('[sendPasswordReset] ✓ Firebase REST fallback succeeded');
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('[sendPasswordReset] Firebase REST failed:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Unable to send reset email. Please try again later.' }) };
  }
}
