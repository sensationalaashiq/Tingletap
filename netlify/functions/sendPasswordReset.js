// Standalone password reset sender — no shared imports, no file system, HTML inline.
import admin from 'firebase-admin';

// FIREBASE_WEB_API_KEY is the Firebase Web API key (same value as VITE_FIREBASE_API_KEY).
// Set it as a Netlify environment variable; VITE_FIREBASE_API_KEY is used as fallback
// since it is already present in the Netlify build environment.
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
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
    <p style="margin:0;font-size:10.5px;color:#c4b5fd;">&copy; 2026 <strong style="color:#9333ea;">TingleTap&trade;</strong> &middot; India's Premium Chat Community &middot; All rights reserved.</p>
  </td></tr>`;

function buildResetHtml(name, email, link) {
  const n = String(name  || 'there').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const e = String(email || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const l = String(link  || '#');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>TingleTap – Reset Your Password</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@keyframes bar-slide{0%{background-position:-300% center}100%{background-position:300% center}}
@keyframes logo-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-7px) scale(1.03)}}
@keyframes star-twirl{0%,100%{transform:rotate(0deg) scale(.85);opacity:.45}50%{transform:rotate(72deg) scale(1.15);opacity:1}}
@keyframes shield-pulse{0%,100%{box-shadow:0 0 0 0 rgba(109,40,217,.15),0 8px 28px rgba(109,40,217,.12)}50%{box-shadow:0 0 0 8px rgba(109,40,217,.06),0 14px 40px rgba(109,40,217,.2)}}
@keyframes heart-beat{0%,100%{transform:scale(1);opacity:.9}25%{transform:scale(1.25);opacity:1}50%{transform:scale(1);opacity:.9}75%{transform:scale(1.18);opacity:1}}
.bar{animation:bar-slide 4s linear infinite}
.logo-img{animation:logo-float 3.5s ease-in-out infinite;display:block}
.star-a{animation:star-twirl 2.8s ease-in-out infinite}
.star-b{animation:star-twirl 3.4s ease-in-out infinite .5s}
.shield{animation:shield-pulse 2.4s ease-in-out infinite}
.heart{animation:heart-beat 1.4s ease-in-out infinite;transform-origin:center;display:block}
@media(max-width:600px){.outer{padding:16px 8px!important}.inner{padding:24px 18px 22px!important}.cta-btn{font-size:15px!important;padding:14px 24px!important}}
</style></head>
<body style="margin:0;padding:0;background:#ede9f9;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(155deg,#f2effe 0%,#ede9f9 55%,#e8e2f6 100%);min-height:100vh;">
<tr><td class="outer" align="center" style="padding:28px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;background:#ffffff;border-radius:22px;border:1px solid rgba(139,92,246,.18);box-shadow:0 16px 56px rgba(109,40,217,.1),0 2px 12px rgba(109,40,217,.06);overflow:hidden;">
  <tr><td style="height:4px;padding:0;line-height:0;"><div class="bar" style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);background-size:300% 100%;font-size:0;"></div></td></tr>
  <tr><td align="center" style="padding:32px 28px 20px;background:linear-gradient(180deg,#faf8ff,#fff);">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:14px;vertical-align:middle;"><svg class="star-a" width="16" height="16" viewBox="0 0 24 24"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc" stroke="#a855f7" stroke-width="1.2"/></svg></td>
      <td><img class="logo-img" src="https://res.cloudinary.com/dbqnocfoq/image/upload/f_auto,q_auto,w_300/tingletap-logo_irf2a8.png" alt="TingleTap" width="80" height="80" style="display:block;width:80px;height:80px;border-radius:18px;border:0;"/></td>
      <td style="padding-left:14px;vertical-align:middle;"><svg class="star-b" width="16" height="16" viewBox="0 0 24 24"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc" stroke="#a855f7" stroke-width="1.2"/></svg></td>
    </tr></table>
    <div style="font-size:26px;font-weight:900;letter-spacing:.3px;margin:12px 0 3px;background:linear-gradient(135deg,#5b21b6,#9333ea,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">TingleTap</div>
    <div style="color:#a78bca;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Password Reset</div>
  </td></tr>
  <tr><td style="padding:0 28px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.2),transparent);"></div></td></tr>
  <tr><td class="inner" style="padding:28px 32px 26px;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;"><tr><td align="center">
      <div class="shield" style="display:inline-flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#ede9fe,#f5f3ff);">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#c084fc"/></linearGradient></defs>
          <path d="M12 2L4 6v6c0 5.25 3.5 9.75 8 11 4.5-1.25 8-5.75 8-11V6L12 2z" fill="url(#sg)" opacity=".15"/>
          <path d="M12 2L4 6v6c0 5.25 3.5 9.75 8 11 4.5-1.25 8-5.75 8-11V6L12 2z" stroke="url(#sg)" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
          <rect x="8.5" y="11" width="7" height="6" rx="1.5" fill="url(#sg)"/>
          <path d="M10 11V9a2 2 0 014 0v2" stroke="url(#sg)" stroke-width="1.6" stroke-linecap="round" fill="none"/>
          <circle cx="12" cy="14" r="1" fill="white" opacity=".9"/>
        </svg>
      </div>
    </td></tr></table>
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#2d1b4e;text-align:center;line-height:1.3;">Password Reset Request</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#7e6ca8;text-align:center;line-height:1.6;">We received a request to reset the password for your TingleTap account.</p>
    <p style="margin:0 0 6px;font-size:15px;color:#3d2565;font-weight:600;">Hi ${n},</p>
    <p style="margin:0 0 22px;font-size:14px;color:#6b5b8a;line-height:1.65;">Someone requested a password reset for the account associated with <strong style="color:#7c3aed;">${e}</strong>. If this was you, click the button below to create a new password.</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 22px;width:100%;"><tr><td align="center">
      <a href="${l}" target="_blank" class="cta-btn" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#9333ea 50%,#c084fc 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:14px;box-shadow:0 8px 28px rgba(109,40,217,.35);letter-spacing:.2px;">Reset My Password →</a>
    </td></tr></table>
    <div style="background:rgba(109,40,217,.05);border:1px solid rgba(139,92,246,.15);border-radius:10px;padding:12px 16px;margin-bottom:22px;">
      <p style="margin:0;font-size:13px;color:#5b21b6;font-weight:600;">Link expires in 1 hour</p>
      <p style="margin:2px 0 0;font-size:12px;color:#7e6ca8;line-height:1.5;">For your security, this reset link is only valid for 60 minutes from when it was requested.</p>
    </div>
    <div style="background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.12);border-radius:10px;padding:12px 16px;margin-bottom:6px;">
      <p style="margin:0;font-size:13px;color:#b91c1c;font-weight:600;">Didn't request this?</p>
      <p style="margin:4px 0 0;font-size:12px;color:#9b1c1c;line-height:1.5;">If you did not request a password reset, please ignore this email. Your account remains secure and no changes have been made.</p>
    </div>
    <p style="margin:16px 0 0;font-size:11px;color:#b09dcc;text-align:center;line-height:1.5;">If the button above doesn't work, copy and paste this link into your browser:<br><span style="color:#9333ea;word-break:break-all;">${l}</span></p>
  </td></tr>
  ${PREMIUM_FOOTER}
  <tr><td style="height:4px;padding:0;line-height:0;"><div class="bar" style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);background-size:300% 100%;font-size:0;"></div></td></tr>
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
      sender:      { name: process.env.BREVO_SENDER_NAME || 'TingleTap', email: process.env.BREVO_SENDER_EMAIL || '' },
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

const rateLimits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = rateLimits.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  rateLimits.set(key, entry);
  if (entry.count > max) return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  return { ok: true };
}

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
  const rl = rateLimit(`reset:${ip}`, 3, 5 * 60 * 1000);
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
          subject: 'Reset Your TingleTap Password',
          html:    buildResetHtml(displayName, email, resetUrl),
          text:    `Hi ${displayName},\n\nReset your TingleTap password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.\n\nTingleTap Team\n${process.env.BREVO_SENDER_EMAIL || ''}`,
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
