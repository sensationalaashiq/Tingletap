// Netlify Function: sendPasswordReset
// Generates a Firebase password reset link via Admin SDK,
// then sends it through Brevo using the branded PasswordReset.html template.
// Firebase NEVER sends an email — all email delivery goes through Brevo.
import { initFirebaseAdmin } from './shared/firebaseAdmin.js';
import { sendEmailWithTemplate } from './shared/emailService.js';
import { loadTemplate } from './shared/templateLoader.js';
import { log } from './shared/logger.js';
import { validateEmail, rateLimitCheck, sanitizeString } from './shared/validation.js';

const adminModule = await import('firebase-admin');
const admin = adminModule.default;
initFirebaseAdmin();

const ALLOWED_ORIGINS = ['https://tingletap.com', 'https://www.tingletap.com'];

function corsHeaders(event) {
  const origin = event.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(event) };

  // CORS pre-flight
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  // Parse body
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const email    = sanitizeString(body.email, 254);
  const userName = sanitizeString(body.userName, 100);

  if (!email || !validateEmail(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'A valid email address is required' }) };
  }

  // Rate limit: 3 attempts per 5 minutes per IP
  const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimitCheck(`reset:${clientIp}`, 3, 5 * 60 * 1000);
  if (!rl.ok) {
    log.warn('Rate limited - password reset', { ip: clientIp });
    return {
      statusCode: 429,
      headers: { ...headers, 'Retry-After': String(rl.retryAfter) },
      body: JSON.stringify({ error: 'Too many requests. Please wait a few minutes before trying again.' }),
    };
  }

  // Generate Firebase action link (Admin SDK — no email sent by Firebase)
  const actionCodeSettings = {
    url:              'https://tingletap.com/reset-password',
    handleCodeInApp:  false,
  };

  let firebaseLink;
  try {
    firebaseLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
  } catch (err) {
    // Prevent account enumeration — always succeed externally
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
      log.warn('Reset link: user not found (suppressed for enumeration protection)', { code: err.code });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
    log.error('generatePasswordResetLink failed', { message: err.message, code: err.code });
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not generate reset link' }) };
  }

  // Extract oobCode and build our branded domain URL
  let customResetUrl;
  try {
    const parsed  = new URL(firebaseLink);
    const oobCode = parsed.searchParams.get('oobCode');
    if (!oobCode) throw new Error('oobCode missing from Firebase link');
    customResetUrl = `https://tingletap.com/reset-password?oobCode=${encodeURIComponent(oobCode)}`;
  } catch (err) {
    log.warn('Could not extract oobCode, falling back to Firebase link', { message: err.message });
    customResetUrl = firebaseLink;
  }

  // Load + render template
  const displayName = userName || email.split('@')[0];
  let html;
  try {
    const template = await loadTemplate('PasswordReset.html');
    html = template
      .replace(/\{\{user_name\}\}/g,  displayName)
      .replace(/\{\{user_email\}\}/g, email)
      .replace(/\{\{reset_link\}\}/g, customResetUrl);
  } catch (err) {
    log.error('PasswordReset template load failed', { message: err.message });
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Email template error' }) };
  }

  // Send via Brevo
  try {
    await sendEmailWithTemplate({
      to:          [{ email, name: displayName }],
      subject:     'Reset Your TingleTap Password',
      htmlContent: html,
      textContent: `Hi ${displayName},\n\nYou requested a password reset for your TingleTap account.\n\nReset your password:\n${customResetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can safely ignore this email.\n\nRegards,\nTingleTap Support Team\nalerts@tingletap.com`,
      tags:        ['password-reset'],
    });
    log.info('Password reset email sent', { to: email.replace(/(.{2}).+(@.+)/, '$1***$2') });
  } catch (err) {
    log.error('Brevo send failed for password reset', { message: err.message });
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Failed to send reset email' }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};
