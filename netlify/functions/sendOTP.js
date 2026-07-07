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
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>TingleTap – Verify Your Email</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
@keyframes bar-slide{0%{background-position:-300% center}100%{background-position:300% center}}
@keyframes logo-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-7px) scale(1.03)}}
@keyframes star-twirl{0%,100%{transform:rotate(0deg) scale(.85);opacity:.45}50%{transform:rotate(72deg) scale(1.15);opacity:1}}
@keyframes otp-pulse{0%,100%{box-shadow:0 0 0 0 rgba(109,40,217,.12),0 6px 24px rgba(109,40,217,.1)}50%{box-shadow:0 0 0 5px rgba(109,40,217,.07),0 10px 32px rgba(109,40,217,.18)}}
@keyframes heart-beat{0%,100%{transform:scale(1);opacity:.9}25%{transform:scale(1.28);opacity:1}50%{transform:scale(1);opacity:.9}75%{transform:scale(1.2);opacity:1}}
.bar{animation:bar-slide 4s linear infinite}
.logo-img{animation:logo-float 3.5s ease-in-out infinite;display:block}
.star-a{animation:star-twirl 2.8s ease-in-out infinite}
.star-b{animation:star-twirl 3.4s ease-in-out infinite .5s}
.otp-wrap{animation:otp-pulse 2.2s ease-in-out infinite}
.heart{animation:heart-beat 1.4s ease-in-out infinite;transform-origin:center;display:block}
.heart-b{animation:heart-beat 1.4s ease-in-out infinite .4s;transform-origin:center;display:block}
@media(max-width:600px){.outer{padding:16px 8px!important}.inner{padding:24px 18px 22px!important}.otp-num{font-size:28px!important;letter-spacing:6px!important}}
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
    <div style="color:#a78bca;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Email Verification</div>
  </td></tr>
  <tr><td style="padding:0 28px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.2),transparent);"></div></td></tr>
  <tr><td class="inner" style="padding:28px 32px 26px;">
    <h2 style="color:#1e0a3c;font-size:22px;font-weight:800;text-align:center;margin:0 0 10px;line-height:1.3;">Verify Your Email Address</h2>
    <p style="color:#5c4080;font-size:14px;text-align:center;margin:0 0 26px;line-height:1.65;">Hello <strong style="color:#6d28d9;">${n}</strong>, welcome to <strong style="color:#9333ea;">TingleTap</strong>!<br>Enter the one-time code below to complete sign-up.</p>
    <div style="background:linear-gradient(135deg,#f8f5ff,#f0ebff);border:1.5px solid rgba(109,40,217,.22);border-radius:18px;padding:22px 20px;margin-bottom:6px;overflow:hidden;box-sizing:border-box;width:100%;">
      <div style="color:#a78bca;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;text-align:center;margin-bottom:14px;">Your One-Time Code</div>
      <div class="otp-wrap" style="background:#fff;border:2px solid rgba(109,40,217,.28);border-radius:14px;padding:14px 12px;text-align:center;box-shadow:0 6px 24px rgba(109,40,217,.1);overflow:hidden;box-sizing:border-box;max-width:100%;">
        <span class="otp-num" style="font-size:34px;font-weight:900;letter-spacing:8px;color:#3b0764;font-family:'Courier New',Courier,monospace;display:block;word-break:break-all;padding-right:8px;line-height:1.2;">${o}</span>
      </div>
      <p style="color:#dc2626;font-size:12px;font-weight:700;text-align:center;margin:14px 0 0;">Expires in 10 minutes</p>
    </div>
    <p style="color:#a78bca;font-size:12px;text-align:center;margin:16px 0 0;line-height:1.6;">Enter this code on the sign-up page to verify your address.<br>Didn't request this? You can safely ignore this email.</p>
    <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.2),transparent);margin:24px 0 20px;"></div>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:linear-gradient(135deg,#faf8ff,#f3effe);border:1px solid rgba(139,92,246,.16);border-radius:14px;overflow:hidden;">
      <tr><td style="width:4px;padding:0;background:linear-gradient(180deg,#6d28d9,#c084fc);"></td>
      <td style="padding:16px 18px;"><div style="font-size:15px;font-weight:800;color:#4c1d95;">TingleTap</div><div style="font-size:12px;color:#7c3aed;font-weight:600;margin-top:2px;">alerts@tingletap.com</div></td>
      <td style="padding-right:14px;"><svg class="heart" width="22" height="22" viewBox="0 0 24 24"><path d="M12 21C12 21 3 14.5 3 8.5A5 5 0 0 1 12 6a5 5 0 0 1 9 2.5C21 14.5 12 21 12 21z" fill="#f43f5e" stroke="#e11d48" stroke-width="1.3"/></svg></td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 28px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.15),transparent);"></div></td></tr>
  <tr><td align="center" style="padding:16px 28px 10px;background:#faf8ff;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 10px;">
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
          <svg class="heart-b" width="20" height="20" viewBox="0 0 24 24"><path d="M12 21C12 21 3 14.5 3 8.5A5 5 0 0 1 12 6a5 5 0 0 1 9 2.5C21 14.5 12 21 12 21z" fill="#f43f5e" stroke="#e11d48" stroke-width="1.3"/></svg>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 4px;font-size:10.5px;color:#c4b5fd;">&copy; 2026 <strong style="color:#9333ea;">TingleTap&trade;</strong> &middot; India's Premium Chat Community &middot; All rights reserved.</p>
  </td></tr>
  <tr><td style="height:4px;padding:0;line-height:0;"><div class="bar" style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);background-size:300% 100%;font-size:0;"></div></td></tr>
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
      sender:      { name: 'TingleTap', email: 'alerts@tingletap.com' },
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
      subject: `${otp} — Your TingleTap Verification Code`,
      html:    buildOTPHtml(displayName, otp),
      text:    `Hi ${displayName},\n\nYour TingleTap verification code is: ${otp}\n\nExpires in 10 minutes. If you did not request this, ignore this email.\n\nDeveloped by Adrashtra · Loved by India\n© 2026 TingleTap™ · India's Premium Chat Community`,
    });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('[sendOTP] Brevo error:', err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: `Failed to send email: ${err.message}` }) };
  }
};
