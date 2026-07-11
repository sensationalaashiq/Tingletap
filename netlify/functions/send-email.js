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

const APP_NAME = process.env.BREVO_SENDER_NAME || 'App';
const OWNER_MAP = {
  'VyomAI': { email: 'support@tingletap.com', name: `VyomAI — ${APP_NAME}` },
  'Blurry':  { email: 'admin@tingletap.com',   name: `Blurry — ${APP_NAME}` },
};
const DEFAULT_SENDER_EMAIL = process.env.OWNER_DEFAULT_EMAIL || 'admin@tingletap.com';

// ── Email themes (inline-style only — email-client safe, no SVG, no @keyframes) ──
const EMAIL_THEMES = {
  purple: {
    gradient: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#6366f1 100%)',
    bar:      'linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9)',
    accent:   '#7c3aed', accent2: '#a855f7', tag: 'Official Communication',
    border:   'rgba(124,58,237,.18)', roleColor: '#7c3aed',
  },
  blue: {
    gradient: 'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 55%,#0ea5e9 100%)',
    bar:      'linear-gradient(90deg,#1e40af,#2563eb,#60a5fa,#38bdf8,#60a5fa,#2563eb,#1e40af)',
    accent:   '#1d4ed8', accent2: '#3b82f6', tag: 'Technical Support',
    border:   'rgba(59,130,246,.18)', roleColor: '#1d4ed8',
  },
  amber: {
    gradient: 'linear-gradient(135deg,#b45309 0%,#d97706 55%,#f59e0b 100%)',
    bar:      'linear-gradient(90deg,#92400e,#b45309,#fbbf24,#fcd34d,#fbbf24,#b45309,#92400e)',
    accent:   '#b45309', accent2: '#d97706', tag: 'Account Support',
    border:   'rgba(217,119,6,.18)', roleColor: '#b45309',
  },
  red: {
    gradient: 'linear-gradient(135deg,#dc2626 0%,#f43f5e 55%,#e11d48 100%)',
    bar:      'linear-gradient(90deg,#b91c1c,#dc2626,#f87171,#fb7185,#f87171,#dc2626,#b91c1c)',
    accent:   '#dc2626', accent2: '#f43f5e', tag: 'Alert &amp; Report',
    border:   'rgba(220,38,38,.18)', roleColor: '#dc2626',
  },
  gold: {
    gradient: 'linear-gradient(135deg,#78350f 0%,#b45309 35%,#d97706 65%,#f59e0b 100%)',
    bar:      'linear-gradient(90deg,#78350f,#b45309,#f59e0b,#fde68a,#f59e0b,#b45309,#78350f)',
    accent:   '#92400e', accent2: '#d97706', tag: 'Badge &amp; Verification',
    border:   'rgba(217,119,6,.2)', roleColor: '#92400e',
  },
  green: {
    gradient: 'linear-gradient(135deg,#065f46 0%,#059669 55%,#10b981 100%)',
    bar:      'linear-gradient(90deg,#064e3b,#059669,#34d399,#6ee7b7,#34d399,#059669,#064e3b)',
    accent:   '#065f46', accent2: '#059669', tag: 'Premium Support',
    border:   'rgba(5,150,105,.18)', roleColor: '#065f46',
  },
  teal: {
    gradient: 'linear-gradient(135deg,#0f766e 0%,#0d9488 55%,#14b8a6 100%)',
    bar:      'linear-gradient(90deg,#134e4a,#0d9488,#2dd4bf,#5eead4,#2dd4bf,#0d9488,#134e4a)',
    accent:   '#0f766e', accent2: '#0d9488', tag: 'Feature &amp; Suggestions',
    border:   'rgba(13,148,136,.18)', roleColor: '#0f766e',
  },
  pink: {
    gradient: 'linear-gradient(135deg,#9d174d 0%,#db2777 55%,#ec4899 100%)',
    bar:      'linear-gradient(90deg,#831843,#db2777,#f472b6,#fbcfe8,#f472b6,#db2777,#831843)',
    accent:   '#9d174d', accent2: '#db2777', tag: 'Welcome',
    border:   'rgba(219,39,119,.18)', roleColor: '#9d174d',
  },
  indigo: {
    gradient: 'linear-gradient(135deg,#3730a3 0%,#4f46e5 55%,#6366f1 100%)',
    bar:      'linear-gradient(90deg,#312e81,#4338ca,#818cf8,#a5b4fc,#818cf8,#4338ca,#312e81)',
    accent:   '#3730a3', accent2: '#4f46e5', tag: 'General Communication',
    border:   'rgba(79,70,229,.18)', roleColor: '#3730a3',
  },
};

// Static heart — email-client safe Unicode (no SVG, no CSS animation)
const HEART = `<span style="color:#f43f5e;font-size:18px;line-height:1;display:inline-block;vertical-align:middle;">&#10084;</span>`;

// Uses Firebase Admin SDK (same as email-action.js) — no manual JWT / Firestore REST
async function verifyOwner(token) {
  try {
    initFirebaseAdmin();
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

function buildEmailHtml({ subject, message, senderName, senderEmail, recipientName, date, theme }) {
  const t = EMAIL_THEMES[theme] || EMAIL_THEMES.purple;
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
<body style="margin:0;padding:0;background:#f3f0ff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(155deg,#f2effe 0%,#ede9f9 55%,#e8e2f6 100%);min-height:100vh;">
<tr><td align="center" style="padding:28px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background:#fff;border-radius:18px;border:1px solid ${t.border};box-shadow:0 6px 48px rgba(124,58,237,.1);overflow:hidden;">

  <!-- Top bar -->
  <tr><td style="height:4px;padding:0;line-height:0;font-size:0;background:${t.bar};">&nbsp;</td></tr>

  <!-- Header -->
  <tr><td style="background:${t.gradient};padding:36px 40px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0 0 6px;color:rgba(255,255,255,.8);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">${APP_NAME}&trade; &middot; ${t.tag}</p>
          <p style="margin:0;color:#fff;font-size:21px;font-weight:800;line-height:1.3;">${esc(subject)}</p>
        </td>
        <td align="right" style="padding-left:16px;white-space:nowrap;vertical-align:top;">
          <div style="background:rgba(255,255,255,.12);border-radius:8px;padding:6px 12px;display:inline-block;">
            <span style="color:rgba(255,255,255,.85);font-size:11px;font-weight:600;">${esc(date)}</span>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px 32px;">
    <!-- Category badge -->
    <p style="margin:0 0 16px;"><span style="display:inline-block;background:${t.gradient};color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em;padding:4px 12px;border-radius:20px;">${t.tag}</span></p>

    <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.7;">Dear <strong style="color:#1e1b4b;">${esc(recipientName || `${APP_NAME} Member`)}</strong>,</p>
    <div style="background:#fafafa;border-left:3px solid ${t.accent2};border-radius:0 10px 10px 0;padding:18px 22px;margin-bottom:28px;color:#374151;font-size:15px;line-height:1.85;">${escapedMsg}</div>

    <!-- Signature -->
    <div style="border-top:1px solid #f3f4f6;padding-top:22px;">
      <p style="margin:0 0 3px;color:#9ca3af;font-size:12px;">Regards,</p>
      <p style="margin:0 0 2px;color:#1e1b4b;font-size:15px;font-weight:700;">${esc(senderName)}</p>
      <p style="margin:0 0 2px;color:${t.roleColor};font-size:12px;font-weight:600;letter-spacing:.02em;">Owner &middot; Godfather &middot; ${APP_NAME}&trade;</p>
      <a href="mailto:${esc(senderEmail)}" style="color:${t.accent2};font-size:12px;text-decoration:none;">${esc(senderEmail)}</a>
    </div>
  </td></tr>

  <!-- Footer -->
  <tr><td align="center" style="background:#faf8ff;border-top:1px solid #f3f4f6;padding:16px 40px;">
    <p style="margin:0 0 6px;">${HEART}&nbsp;<span style="font-size:12px;font-weight:800;color:${t.accent};letter-spacing:.3px;">Developed by Adrashtra</span>&nbsp;<span style="font-size:12px;color:#d8b4fe;">&middot;</span>&nbsp;<span style="font-size:12px;font-weight:800;color:#db2777;">Loved by India</span>&nbsp;${HEART}</p>
    <p style="margin:0;color:#9ca3af;font-size:11px;">&copy; 2026 ${APP_NAME}&trade; &middot; India's Premium Chat Community &middot; All rights reserved.</p>
  </td></tr>

  <!-- Bottom bar -->
  <tr><td style="height:4px;padding:0;line-height:0;font-size:0;background:${t.bar};">&nbsp;</td></tr>

</table>
</td></tr>
</table>
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
    name: `${v.displayName} — ${APP_NAME}`,
  };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const recipientEmail = sanitizeString(body.recipientEmail, 254);
  const recipientName  = sanitizeString(body.recipientName,  100);
  const subject        = sanitizeString(body.subject,        255);
  const message        = sanitizeString(body.message,       50000);
  // theme is optional — defaults to 'purple' (official communication style)
  const theme          = sanitizeString(body.theme || 'purple', 32);

  if (!recipientEmail || !subject || !message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields: recipientEmail, subject, message' }) };
  }

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const html = buildEmailHtml({
    subject, message, senderName: v.displayName,
    senderEmail: sender.email, recipientName, date, theme,
  });

  let brRes, brData;
  try {
    brRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: `${v.displayName} — ${APP_NAME}`, email: sender.email },
        to:          [{ email: recipientEmail, name: recipientName || `${APP_NAME} Member` }],
        replyTo:     { email: sender.email, name: `${v.displayName} — ${APP_NAME}` },
        subject,
        htmlContent: html,
        textContent: `${subject}\n\nDear ${recipientName || `${APP_NAME} Member`},\n\n${message}\n\nRegards,\n${v.displayName}\nOwner · Godfather · ${APP_NAME}™\n${sender.email}`,
        tags: ['owner-email-center', `sender-${v.displayName.toLowerCase()}`, `theme-${theme}`],
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
    theme,
    messageId: brData.messageId,
  });
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, messageId: brData.messageId, sender: sender.email }) };
};
