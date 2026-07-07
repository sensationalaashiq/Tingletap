// Netlify Function: send-email
// Owner Email Center — sends branded transactional emails via Brevo.
// Requires: BREVO_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars.
import { initFirebaseAdmin } from './shared/firebaseAdmin.js';
import admin from 'firebase-admin';
import { log } from './shared/logger.js';
import { sanitizeString } from './shared/validation.js';

const BREVO_API_KEY = process.env.BREVO_API_KEY;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OWNER_MAP = {
  'VyomAI': { email: 'support@tingletap.com', name: 'VyomAI — TingleTap' },
  'Blurry':  { email: 'admin@tingletap.com',   name: 'Blurry — TingleTap'  },
};
const DEFAULT_SENDER_EMAIL = process.env.OWNER_DEFAULT_EMAIL || 'admin@tingletap.com';

// Uses Firebase Admin SDK (same as email-action.js) — no manual JWT / Firestore REST
async function verifyOwner(token) {
  try {
    initFirebaseAdmin();
    // Verify the ID token properly with Admin SDK
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    if (!uid) return { ok: false, err: 'Token missing UID' };

    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const data = userDoc.data() || {};
    if (data.role !== 'owner') return { ok: false, err: 'Access denied — owners only' };
    return { ok: true, uid, displayName: data.displayName || '' };
  } catch (err) {
    log.warn('verifyOwner failed', { message: err.message });
    return { ok: false, err: 'Auth verification failed' };
  }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function buildEmailHtml({ subject, message, senderName, senderEmail, recipientName, date }) {
  const escapedMsg = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:620px;margin:40px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 48px rgba(124,58,237,.1);">
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#6366f1 100%);padding:36px 40px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="color:rgba(255,255,255,.75);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">TingleTap™ · Official Communication</div>
          <div style="color:#fff;font-size:21px;font-weight:800;line-height:1.3;">${esc(subject)}</div>
        </td>
        <td align="right" style="padding-left:16px;white-space:nowrap;">
          <div style="background:rgba(255,255,255,.12);border-radius:8px;padding:6px 12px;display:inline-block;">
            <span style="color:rgba(255,255,255,.8);font-size:11px;font-weight:600;">${esc(date)}</span>
          </div>
        </td>
      </tr>
    </table>
  </div>
  <div style="padding:36px 40px 32px;">
    <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.7;">Dear <strong style="color:#1e1b4b;">${esc(recipientName || 'TingleTap Member')}</strong>,</p>
    <div style="background:#fafafa;border-left:3px solid #a855f7;border-radius:0 10px 10px 0;padding:18px 22px;margin-bottom:28px;color:#374151;font-size:15px;line-height:1.85;">${escapedMsg}</div>
    <div style="border-top:1px solid #f3f4f6;padding-top:22px;">
      <p style="margin:0 0 3px;color:#9ca3af;font-size:12px;">Regards,</p>
      <p style="margin:0 0 2px;color:#1e1b4b;font-size:15px;font-weight:700;">${esc(senderName)}</p>
      <p style="margin:0 0 2px;color:#7c3aed;font-size:12px;font-weight:600;letter-spacing:.02em;">Owner · Godfather · TingleTap™</p>
      <a href="mailto:${esc(senderEmail)}" style="color:#a855f7;font-size:12px;text-decoration:none;">${esc(senderEmail)}</a>
    </div>
  </div>
  <div style="background:#fafafa;border-top:1px solid #f3f4f6;padding:16px 40px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">© 2026 TingleTap™ · India's Premium Chat Community · All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}

export const handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', ...CORS_HEADERS };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  if (!BREVO_API_KEY) {
    log.error('BREVO_API_KEY not set');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing authorization header' }) };
  }

  const v = await verifyOwner(authHeader.slice(7));
  if (!v.ok) {
    log.warn('Auth failed for send-email', { err: v.err });
    return { statusCode: 403, headers, body: JSON.stringify({ error: v.err }) };
  }

  const sender = OWNER_MAP[v.displayName] || {
    email: DEFAULT_SENDER_EMAIL,
    name: `${v.displayName} — TingleTap`,
  };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const recipientEmail = sanitizeString(body.recipientEmail, 254);
  const recipientName  = sanitizeString(body.recipientName,  100);
  const subject        = sanitizeString(body.subject,        255);
  const message        = sanitizeString(body.message,       50000);

  if (!recipientEmail || !subject || !message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields: recipientEmail, subject, message' }) };
  }

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = buildEmailHtml({
    subject, message, senderName: v.displayName,
    senderEmail: sender.email, recipientName, date,
  });

  let brRes, brData;
  try {
    brRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: `${v.displayName} — TingleTap`, email: sender.email },
        to:          [{ email: recipientEmail, name: recipientName || 'TingleTap Member' }],
        replyTo:     { email: sender.email, name: `${v.displayName} — TingleTap` },
        subject,
        htmlContent: html,
        textContent: `${subject}\n\nDear ${recipientName || 'TingleTap Member'},\n\n${message}\n\nRegards,\n${v.displayName}\nOwner · Godfather · TingleTap™\n${sender.email}`,
        tags: ['owner-email-center', `sender-${v.displayName.toLowerCase()}`],
      }),
    });
    brData = await brRes.json();
  } catch (netErr) {
    log.error('Network error calling Brevo for send-email', { message: netErr.message });
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Email delivery network error' }) };
  }

  if (!brRes.ok) {
    log.error('Brevo error for send-email', { status: brRes.status, detail: brData?.message });
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Email delivery failed', detail: brData?.message }) };
  }

  log.info('Owner email sent', {
    sender: sender.email,
    to: recipientEmail.replace(/(.{2}).+(@.+)/, '$1***$2'),
    subject,
    messageId: brData.messageId,
  });
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, messageId: brData.messageId, sender: sender.email }) };
};
