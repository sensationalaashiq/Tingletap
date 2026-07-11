const APP_NAME = process.env.BREVO_SENDER_NAME || 'App';
// Standalone OTP sender — no shared imports, no file system.
// All HTML inlined. Direct Brevo API call.

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function buildOTPHtml(name, otp) {
  const n = String(name || 'there').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const o = String(otp);
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${APP_NAME} – Your Verification Code</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@keyframes bar-slide{0%{background-position:-300% center}100%{background-position:300% center}}
@keyframes logo-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.04)}}
@keyframes star-twirl{0%,100%{transform:rotate(0deg) scale(.8);opacity:.35}50%{transform:rotate(72deg) scale(1.2);opacity:1}}
@keyframes otp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(109,40,217,.15),0 8px 28px rgba(109,40,217,.12)}50%{box-shadow:0 0 0 8px rgba(109,40,217,.06),0 14px 40px rgba(109,40,217,.2)}}
@keyframes hand-tick{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes heart-beat{0%,100%{transform:scale(1)}25%{transform:scale(1.18)}75%{transform:scale(1.1)}}
@keyframes badge-pop{0%{transform:scale(0) rotate(-20deg);opacity:0}70%{transform:scale(1.2) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes digit-glow{0%,100%{text-shadow:0 0 0 rgba(109,40,217,0)}50%{text-shadow:0 0 16px rgba(109,40,217,.35),0 0 32px rgba(192,132,252,.2)}}
@keyframes sparkle{0%,100%{opacity:.2;transform:scale(.7) rotate(0deg)}50%{opacity:1;transform:scale(1.1) rotate(30deg)}}
.bar{animation:bar-slide 3.5s linear infinite}
.logo-img{animation:logo-float 3.5s ease-in-out infinite;display:block}
.star-a{animation:star-twirl 2.8s ease-in-out infinite}
.star-b{animation:star-twirl 3.6s ease-in-out infinite .7s}
.otp-wrap{animation:otp-pulse 2.2s ease-in-out infinite}
.hand{animation:hand-tick 6s linear infinite;transform-origin:12px 12px}
.heart{animation:heart-beat 1.6s ease-in-out infinite;transform-origin:center;display:block}
.heart-b{animation:heart-beat 1.6s ease-in-out infinite .5s;transform-origin:center;display:block}
.badge{animation:badge-pop .55s cubic-bezier(.34,1.56,.64,1) .9s both}
.otp-num{animation:digit-glow 2.8s ease-in-out infinite}
.sparkle-a{animation:sparkle 2.4s ease-in-out infinite}
@media(max-width:600px){.outer{padding:16px 8px!important}.inner{padding:28px 18px 24px!important}.otp-num{font-size:30px!important;letter-spacing:6px!important}}
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
    <div style="color:#a78bca;font-size:11px;letter-spacing:3.5px;text-transform:uppercase;font-weight:700;">Email Verification Code</div>
  </td></tr>
  <tr><td style="padding:0 32px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.22),transparent);"></div></td></tr>
  <tr><td class="inner" style="padding:32px 36px 28px;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 26px;"><tr><td align="center">
      <div style="position:relative;display:inline-block;">
        <div style="position:absolute;inset:-8px;border-radius:20px;border:1.5px solid rgba(139,92,246,.22);opacity:.6;"></div>
        <div style="position:absolute;inset:-16px;border-radius:24px;border:1px solid rgba(139,92,246,.12);opacity:.4;"></div>
        <div style="background:linear-gradient(135deg,#f0ebff,#e8e2f6);border:1.5px solid rgba(139,92,246,.22);border-radius:18px;padding:18px 22px;position:relative;box-shadow:0 8px 24px rgba(124,58,237,.12);">
          <svg width="44" height="44" viewBox="0 0 40 40" fill="none"><defs><linearGradient id="eg3" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stop-color="#6d28d9"/><stop offset="1" stop-color="#c084fc"/></linearGradient></defs>
            <rect x="3" y="9" width="34" height="24" rx="4" fill="rgba(109,40,217,.08)" stroke="url(#eg3)" stroke-width="2"/>
            <path d="M3 14l17 12 17-12" stroke="url(#eg3)" stroke-width="2" stroke-linecap="round"/>
            <circle class="badge" cx="33" cy="9" r="7" fill="#22c55e" stroke="white" stroke-width="1.5"/>
            <path class="badge" d="M30 9l2 2.2 3.5-3.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg class="sparkle-a" width="11" height="11" viewBox="0 0 24 24" style="position:absolute;top:-4px;right:-4px;"><path d="M12 2l2.4 7H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4 2.4-7.5L2 9h7.6z" fill="#c084fc"/></svg>
        </div>
      </div>
    </td></tr></table>
    <h2 style="color:#1e0a3c;font-size:22px;font-weight:800;text-align:center;margin:0 0 10px;letter-spacing:-.3px;line-height:1.3;">Your Verification Code</h2>
    <p style="color:#5c4080;font-size:14px;text-align:center;margin:0 0 26px;line-height:1.65;">Hi <strong style="color:#6d28d9;">${n}</strong>, welcome to <strong style="color:#9333ea;">${APP_NAME}</strong>!<br>Use the code below to complete your sign-up.</p>
    <div style="background:linear-gradient(135deg,#f8f5ff,#f0ebff);border:1.5px solid rgba(109,40,217,.2);border-radius:20px;padding:26px 22px;margin-bottom:8px;overflow:hidden;box-sizing:border-box;">
      <div style="color:#a78bca;font-size:10px;font-weight:700;letter-spacing:3.5px;text-transform:uppercase;text-align:center;margin-bottom:16px;">One-Time Code — Valid 10 Minutes</div>
      <div class="otp-wrap" style="background:#ffffff;border:2px solid rgba(109,40,217,.25);border-radius:16px;padding:18px 14px;text-align:center;box-shadow:0 8px 28px rgba(109,40,217,.12),inset 0 1px 3px rgba(109,40,217,.05);">
        <span class="otp-num" style="font-size:36px;font-weight:900;letter-spacing:10px;color:#3b0764;font-family:'Courier New',Courier,monospace;display:block;word-break:break-all;padding-right:10px;line-height:1.2;">${o}</span>
      </div>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 0;"><tr>
        <td style="padding-right:8px;vertical-align:middle;">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(239,68,68,.08);display:flex;align-items:center;justify-content:center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#ef4444" stroke-width="1.8" fill="rgba(239,68,68,.06)"/><line class="hand" x1="12" y1="12" x2="12" y2="5.5" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="12" x2="15.5" y2="12" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round"/></svg>
          </div>
        </td>
        <td style="vertical-align:middle;"><div style="font-size:13px;color:#dc2626;font-weight:700;">Expires in 10 minutes</div><div style="font-size:11px;color:#f87171;margin-top:1px;">Do not share this code with anyone</div></td>
      </tr></table>
    </div>
    <p style="color:#a78bca;font-size:12px;text-align:center;margin:16px 0 0;line-height:1.65;">Enter this code on the ${APP_NAME} sign-up page to verify your address.<br>Didn't request this? You can safely ignore this email.</p>
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.2),transparent);margin:26px 0 22px;"></div>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:linear-gradient(135deg,#faf8ff,#f5f0ff);border:1px solid rgba(139,92,246,.16);border-radius:16px;overflow:hidden;">
      <tr>
        <td style="width:5px;padding:0;background:linear-gradient(180deg,#6d28d9,#9333ea,#c084fc);"></td>
        <td style="padding:16px 18px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" fill="rgba(109,40,217,.1)" stroke="#9333ea" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="15" y1="5" x2="19" y2="9" stroke="#c084fc" stroke-width="1.5" stroke-linecap="round"/></svg></td>
            <td style="vertical-align:top;"><div style="font-size:10px;color:#a78bca;font-weight:600;letter-spacing:.5px;margin-bottom:3px;">SENT WITH CARE BY</div><div style="font-size:15px;font-weight:800;color:#4c1d95;">${APP_NAME}</div><div style="font-size:12px;color:#7c3aed;font-weight:600;margin-top:2px;">Alerts@tingletap.com</div></td>
            <td style="padding-left:14px;vertical-align:middle;"><svg class="heart" width="22" height="22" viewBox="0 0 24 24"><path d="M12 21C12 21 3 14.5 3 8.5A5 5 0 0 1 12 6a5 5 0 0 1 9 2.5C21 14.5 12 21 12 21z" fill="#fda4af" stroke="#f43f5e" stroke-width="1.4"/></svg></td>
          </tr></table>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 32px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.16),transparent);"></div></td></tr>
  <tr><td align="center" style="padding:18px 32px 26px;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 14px;"><tr>
      <td style="padding-right:8px;vertical-align:middle;"><svg class="heart" width="16" height="16" viewBox="0 0 24 24"><path d="M12 21C12 21 3 14.5 3 8.5A5 5 0 0 1 12 6a5 5 0 0 1 9 2.5C21 14.5 12 21 12 21z" fill="#f43f5e" stroke="#e11d48" stroke-width="1.3"/></svg></td>
      <td style="vertical-align:middle;"><span style="font-size:11.5px;font-weight:800;color:#7c3aed;">Developed by Adrashtra</span><span style="font-size:11.5px;color:#d8b4fe;margin:0 6px;">&middot;</span><span style="font-size:11.5px;font-weight:800;color:#db2777;">Loved by India</span></td>
      <td style="padding-left:8px;vertical-align:middle;"><svg class="heart-b" width="16" height="16" viewBox="0 0 24 24"><path d="M12 21C12 21 3 14.5 3 8.5A5 5 0 0 1 12 6a5 5 0 0 1 9 2.5C21 14.5 12 21 12 21z" fill="#f43f5e" stroke="#e11d48" stroke-width="1.3"/></svg></td>
    </tr></table>
    <p style="color:#d0c6eb;font-size:10.5px;margin:0;">&copy; 2026 ${APP_NAME}&trade; &middot; All rights reserved.</p>
  </td></tr>
  <tr><td style="height:5px;padding:0;line-height:0;font-size:0;"><div class="bar" style="height:5px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#f472b6,#e879f9,#c084fc,#9333ea,#6d28d9);background-size:300% 100%;"></div></td></tr>
</table>
</td></tr></table>
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
      tags:        ['tingletap-transactional', 'otp-verification'],
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
  const otp      = String(body.otp      || '').trim().slice(0, 10);
  const userName = String(body.userName || '').trim().slice(0, 100);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email required' }) };
  if (!otp || !/^\d{6}$/.test(otp))
    return { statusCode: 400, headers, body: JSON.stringify({ error: '6-digit OTP required' }) };

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`otp:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return { statusCode: 429, headers: { ...headers, 'Retry-After': String(rl.retryAfter) }, body: JSON.stringify({ error: 'Too many requests. Please wait a few minutes.' }) };

  const displayName = userName || email.split('@')[0];
  try {
    await sendViaBrevo({
      to:      email,
      subject: `${otp} — Your ${APP_NAME} Verification Code`,
      html:    buildOTPHtml(displayName, otp),
      text:    `Hi ${displayName},\n\nYour ${APP_NAME} verification code is: ${otp}\n\nExpires in 10 minutes. If you did not request this, ignore this email.\n\nDeveloped by Adrashtra · Loved by India\n© 2026 ${APP_NAME}™ · India's Premium Chat Community`,
    });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('[sendOTP] Brevo error:', err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: `Failed to send email: ${err.message}` }) };
  }
};
