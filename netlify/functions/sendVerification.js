// Netlify Function: sendVerification
// Generates a Firebase email verification link via Admin SDK,
// then sends it through Brevo using the branded EmailVerification.html template.
// Firebase NEVER sends an email — all email delivery goes through Brevo.
import { initFirebaseAdmin } from './shared/firebaseAdmin.js';
import adminSdk from './shared/firebaseAdmin.js';
import { sendEmailWithTemplate } from './shared/emailService.js';
import { loadTemplate } from './shared/templateLoader.js';
import { log } from './shared/logger.js';
import { validateEmail, rateLimitCheck, sanitizeString } from './shared/validation.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', ...CORS_HEADERS };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const email    = sanitizeString(body.email, 254);
  const userName = sanitizeString(body.userName, 100);

  if (!email || !validateEmail(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'A valid email address is required' }) };
  }

  // Rate limit: 5 verification emails per hour per IP
  const clientIp = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimitCheck(`verify:${clientIp}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    log.warn('Rate limited - email verification', { ip: clientIp });
    return {
      statusCode: 429,
      headers: { ...headers, 'Retry-After': String(rl.retryAfter) },
      body: JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    };
  }

  // Initialize Firebase Admin inside handler (not at module load) so env var errors surface cleanly
  try {
    initFirebaseAdmin();
  } catch (err) {
    log.error('Firebase Admin init failed', { message: err.message });
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
  }
  const admin = adminSdk;

  // Generate Firebase verification link
  const actionCodeSettings = {
    url:             'https://tingletap.com/verify-email',
    handleCodeInApp: false,
  };

  let firebaseLink;
  try {
    firebaseLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
  } catch (err) {
    log.error('generateEmailVerificationLink failed', { message: err.message, code: err.code });
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not generate verification link' }) };
  }

  // Extract oobCode and build branded URL
  let customVerifyUrl;
  try {
    const parsed  = new URL(firebaseLink);
    const oobCode = parsed.searchParams.get('oobCode');
    if (!oobCode) throw new Error('oobCode missing');
    customVerifyUrl = `https://tingletap.com/verify-email?oobCode=${encodeURIComponent(oobCode)}`;
  } catch (err) {
    log.warn('Could not extract oobCode, falling back to Firebase link', { message: err.message });
    customVerifyUrl = firebaseLink;
  }

  const displayName = userName || email.split('@')[0];
  let html;
  try {
    const template = await loadTemplate('EmailVerification.html');
    html = template
      .replace(/\{\{user_name\}\}/g,         displayName)
      .replace(/\{\{user_email\}\}/g,        email)
      .replace(/\{\{verification_link\}\}/g, customVerifyUrl);
  } catch (err) {
    log.error('EmailVerification template load failed', { message: err.message });
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Email template error' }) };
  }

  try {
    await sendEmailWithTemplate({
      to:          [{ email, name: displayName }],
      subject:     'Verify Your TingleTap Email Address',
      htmlContent: html,
      textContent: `Hi ${displayName},\n\nPlease verify your email address for TingleTap:\n\n${customVerifyUrl}\n\nThis link expires in 24 hours. If you did not create a TingleTap account, you can safely ignore this email.\n\nRegards,\nTingleTap Team\nalerts@tingletap.com`,
      tags:        ['email-verification'],
    });
    log.info('Verification email sent', { to: email.replace(/(.{2}).+(@.+)/, '$1***$2') });
  } catch (err) {
    log.error('Brevo send failed for verification', { message: err.message });
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Failed to send verification email' }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
};
