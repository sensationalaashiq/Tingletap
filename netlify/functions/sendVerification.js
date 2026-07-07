// Standalone email verification sender — no shared imports, no file system, HTML inline.
// Falls back to Firebase Auth REST API if Admin SDK credentials are unavailable.
import admin from 'firebase-admin';

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyAp6KtSg_7kbGwyffC7sFJxuuxB-wwPj-w';

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

function buildVerifyHtml(name, email, link) {
  const n = String(name  || 'there').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const e = String(email || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const l = String(link  || '#');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>TingleTap – Verify Your Email</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@keyframes bar-slide{0%{background-position:-300% center}100%{background-position:300% center}}
@keyframes logo-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-7px) scale(1.03)}}
@keyframes star-twirl{0%,100%{transform:rotate(0deg) scale(.85);opacity:.45}50%{transform:rotate(72deg) scale(1.15);opacity:1}}
@keyframes env-bounce{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.04)}}
@keyframes badge-pop{0%{transform:scale(0);opacity:0}70%{transform:scale(1.15);opacity:1}100%{transform:scale(1);opacity:1}}
.bar{animation:bar-slide 4s linear infinite}
.logo-img{animation:logo-float 3.5s ease-in-out infinite;display:block}
.star-a{animation:star-twirl 2.8s ease-in-out infinite}
.star-b{animation:star-twirl 3.4s ease-in-out infinite .5s}
.env-icon{animation:env-bounce 2.6s ease-in-out infinite}
.badge{animation:badge-pop .5s cubic-bezier(.34,1.56,.64,1) .9s both}
@media(max-width:600px){.outer{padding:16px 8px!important}.inner{padding:24px 18px 22px!important}.cta-btn{font-size:15px!important;padding:14px 24px!important}}
</style></head>
<body style="margin:0;padding:0;background:#ede9f9;">
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
    <div style="color:#a78bca;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Email Verification</div>
  </td></tr>
  <tr><td style="padding:0 28px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.2),transparent);"></div></td></tr>
  <tr><td class="inner" style="padding:28px 32px 26px;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;"><tr><td align="center">
      <div class="env-icon" style="display:inline-flex;align-items:center;justify-content:center;width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#ede9fe,#faf5ff);box-shadow:0 8px 24px rgba(124,58,237,.12);">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
          <defs><linearGradient id="eg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#c084fc"/></linearGradient></defs>
          <rect x="2" y="4" width="20" height="16" rx="3" fill="url(#eg2)" opacity=".15"/>
          <rect x="2" y="4" width="20" height="16" rx="3" stroke="url(#eg2)" stroke-width="1.8"/>
          <path d="M2 8l10 6 10-6" stroke="url(#eg2)" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="18" cy="18" r="5" fill="#10b981"/>
          <path d="M15.5 18l2 2 3-3" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </td></tr></table>
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#2d1b4e;text-align:center;line-height:1.3;">Verify Your Email Address</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#7e6ca8;text-align:center;line-height:1.6;">You're just one click away from joining TingleTap.</p>
    <p style="margin:0 0 6px;font-size:15px;color:#3d2565;font-weight:600;">Hi ${n},</p>
    <p style="margin:0 0 22px;font-size:14px;color:#6b5b8a;line-height:1.65;">We received a request to verify the email address <strong style="color:#7c3aed;">${e}</strong> for your TingleTap account. Click the button below to confirm your address and activate your account.</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 22px;width:100%;"><tr><td align="center">
      <a href="${l}" target="_blank" class="cta-btn" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#9333ea 50%,#c084fc 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:14px;box-shadow:0 8px 28px rgba(109,40,217,.35);letter-spacing:.2px;">Verify My Email →</a>
    </td></tr></table>
    <div style="background:rgba(109,40,217,.05);border:1px solid rgba(139,92,246,.15);border-radius:10px;padding:12px 16px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:#5b21b6;font-weight:600;">Link expires in 24 hours</p>
      <p style="margin:2px 0 0;font-size:12px;color:#7e6ca8;line-height:1.5;">If you didn't create a TingleTap account, you can safely ignore this email.</p>
    </div>
  </td></tr>
  <tr><td style="padding:0 28px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.15),transparent);"></div></td></tr>
  <tr><td align="center" style="padding:18px 28px 24px;">
    <p style="margin:0 0 6px;font-size:12px;color:#a78bca;">This is an automated email from TingleTap. Please do not reply.</p>
    <p style="margin:0 0 10px;font-size:11px;color:#c4b5fd;line-height:1.5;">If the button above doesn't work, copy and paste this URL into your browser:</p>
    <p style="margin:0 0 14px;font-size:10px;color:#a78bca;word-break:break-all;">${l}</p>
    <p style="margin:12px 0 0;font-size:10px;color:#d4c5f0;">&copy; 2026 TingleTap&trade; &middot; All rights reserved.</p>
  </td></tr>
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
      sender:      { name: 'TingleTap', email: 'alerts@tingletap.com' },
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
  const rl = rateLimit(`verify:${ip}`, 5, 60 * 60 * 1000);
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
        url: 'https://tingletap.com/verify-email',
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
        if (oobCode) verifyUrl = `https://tingletap.com/verify-email?oobCode=${encodeURIComponent(oobCode)}`;
      } catch {}

      const displayName = userName || email.split('@')[0];
      try {
        await sendViaBrevo({
          to:      email,
          subject: 'Verify Your TingleTap Email Address',
          html:    buildVerifyHtml(displayName, email, verifyUrl),
          text:    `Hi ${displayName},\n\nPlease verify your TingleTap email:\n${verifyUrl}\n\nExpires in 24 hours. If you didn't create a TingleTap account, ignore this email.\n\nTingleTap Team\nalerts@tingletap.com`,
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
