// Netlify Function: sendOTP
// Sends an OTP verification code via Brevo using the OneTimePassword.html template.
// OTP is generated client-side; hash is stored in client sessionStorage for verification.
// This function only handles email delivery — no server-side OTP state.
import { sendEmailWithTemplate } from './shared/emailService.js';
import { loadTemplate } from './shared/templateLoader.js';
import { log } from './shared/logger.js';
import { validateEmail, rateLimitCheck, sanitizeString } from './shared/validation.js';

const ALLOWED_ORIGINS = [
  'https://tingletap.com',
  'https://www.tingletap.com',
];

function corsHeaders(event) {
  const origin  = event.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(event) };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const email    = sanitizeString(body.email,    254);
  const otp      = sanitizeString(body.otp,       10);
  const userName = sanitizeString(body.userName, 100);

  if (!email || !validateEmail(email))
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'A valid email address is required' }) };

  if (!otp || !/^\d{6}$/.test(otp))
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'A 6-digit OTP is required' }) };

  // Rate limit: 5 OTPs per 10 minutes per IP
  const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimitCheck(`otp:${clientIp}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    log.warn('Rate limited - send OTP', { ip: clientIp });
    return {
      statusCode: 429,
      headers: { ...headers, 'Retry-After': String(rl.retryAfter) },
      body: JSON.stringify({ error: 'Too many requests. Please wait a few minutes.' }),
    };
  }

  const displayName = userName || email.split('@')[0];

  let html;
  try {
    const template = await loadTemplate('OneTimePassword.html');
    html = template
      .replace(/\{\{user_name\}\}/g,  displayName)
      .replace(/\{\{user_email\}\}/g, email)
      .replace(/\{\{otp_code\}\}/g,   otp);
  } catch (err) {
    log.error('OneTimePassword template load failed', { message: err.message });
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Email template error' }) };
  }

  try {
    await sendEmailWithTemplate({
      to:          [{ email, name: displayName }],
      subject:     `${otp} — Your TingleTap Verification Code`,
      htmlContent: html,
      textContent: `Hi ${displayName},\n\nYour TingleTap verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.\n\nRegards,\nTingleTap Team\nalerts@tingletap.com`,
      tags:        ['otp-verification'],
    });
    log.info('OTP email sent', { to: email.replace(/(.{2}).+(@.+)/, '$1***$2') });
  } catch (err) {
    log.error('Brevo send failed for OTP', { message: err.message });
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Failed to send verification email' }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};
