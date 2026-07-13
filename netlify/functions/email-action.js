// Netlify Function: email-action
// Owner reply/forward handler — verifies owner auth, sends via Brevo, writes to Firestore.
// POST body: { action:'reply'|'forward', emailId, body, recipientEmail?, recipientName?, subject? }
import { initFirebaseAdmin } from './shared/firebaseAdmin.js';
import admin from 'firebase-admin';
import { sendEmailWithTemplate } from './shared/emailService.js';
import { rateLimitCheck, sanitizeString, validateEmail } from './shared/validation.js';
import { log } from './shared/logger.js';

const APP_NAME = process.env.BREVO_SENDER_NAME || 'App';
const OWNER_MAP = {
  'VyomAI': { email: 'support@tingletap.com', name: `VyomAI — ${APP_NAME}` },
  'Blurry':  { email: 'admin@tingletap.com',   name: `Blurry — ${APP_NAME}` },
};
const DEFAULT_SENDER_EMAIL = process.env.OWNER_DEFAULT_EMAIL || 'admin@tingletap.com';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Email themes (inline-style only — email-client safe, no SVG, no @keyframes) ──
const EMAIL_THEMES = {
  purple: {
    gradient: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#6366f1 100%)',
    bar:      'linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9)',
    accent:   '#7c3aed', accent2: '#a855f7', tag: 'Official Reply',
    border:   'rgba(124,58,237,.18)', roleColor: '#7c3aed',
  },
  blue: {
    gradient: 'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 55%,#0ea5e9 100%)',
    bar:      'linear-gradient(90deg,#1e40af,#2563eb,#60a5fa,#38bdf8,#60a5fa,#2563eb,#1e40af)',
    accent:   '#1d4ed8', accent2: '#3b82f6', tag: 'Technical Support Reply',
    border:   'rgba(59,130,246,.18)', roleColor: '#1d4ed8',
  },
  amber: {
    gradient: 'linear-gradient(135deg,#b45309 0%,#d97706 55%,#f59e0b 100%)',
    bar:      'linear-gradient(90deg,#92400e,#b45309,#fbbf24,#fcd34d,#fbbf24,#b45309,#92400e)',
    accent:   '#b45309', accent2: '#d97706', tag: 'Account Support Reply',
    border:   'rgba(217,119,6,.18)', roleColor: '#b45309',
  },
  red: {
    gradient: 'linear-gradient(135deg,#dc2626 0%,#f43f5e 55%,#e11d48 100%)',
    bar:      'linear-gradient(90deg,#b91c1c,#dc2626,#f87171,#fb7185,#f87171,#dc2626,#b91c1c)',
    accent:   '#dc2626', accent2: '#f43f5e', tag: 'Alert &amp; Report Reply',
    border:   'rgba(220,38,38,.18)', roleColor: '#dc2626',
  },
  gold: {
    gradient: 'linear-gradient(135deg,#78350f 0%,#b45309 35%,#d97706 65%,#f59e0b 100%)',
    bar:      'linear-gradient(90deg,#78350f,#b45309,#f59e0b,#fde68a,#f59e0b,#b45309,#78350f)',
    accent:   '#92400e', accent2: '#d97706', tag: 'Badge &amp; Verification Reply',
    border:   'rgba(217,119,6,.2)', roleColor: '#92400e',
  },
  green: {
    gradient: 'linear-gradient(135deg,#065f46 0%,#059669 55%,#10b981 100%)',
    bar:      'linear-gradient(90deg,#064e3b,#059669,#34d399,#6ee7b7,#34d399,#059669,#064e3b)',
    accent:   '#065f46', accent2: '#059669', tag: 'Premium Support Reply',
    border:   'rgba(5,150,105,.18)', roleColor: '#065f46',
  },
  teal: {
    gradient: 'linear-gradient(135deg,#0f766e 0%,#0d9488 55%,#14b8a6 100%)',
    bar:      'linear-gradient(90deg,#134e4a,#0d9488,#2dd4bf,#5eead4,#2dd4bf,#0d9488,#134e4a)',
    accent:   '#0f766e', accent2: '#0d9488', tag: 'Feature &amp; Suggestion Reply',
    border:   'rgba(13,148,136,.18)', roleColor: '#0f766e',
  },
  pink: {
    gradient: 'linear-gradient(135deg,#9d174d 0%,#db2777 55%,#ec4899 100%)',
    bar:      'linear-gradient(90deg,#831843,#db2777,#f472b6,#fbcfe8,#f472b6,#db2777,#831843)',
    accent:   '#9d174d', accent2: '#db2777', tag: 'Welcome Reply',
    border:   'rgba(219,39,119,.18)', roleColor: '#9d174d',
  },
  indigo: {
    gradient: 'linear-gradient(135deg,#3730a3 0%,#4f46e5 55%,#6366f1 100%)',
    bar:      'linear-gradient(90deg,#312e81,#4338ca,#818cf8,#a5b4fc,#818cf8,#4338ca,#312e81)',
    accent:   '#3730a3', accent2: '#4f46e5', tag: 'General Reply',
    border:   'rgba(79,70,229,.18)', roleColor: '#3730a3',
  },
};

// Derive theme from a subject string (matches contact.js logic)
function getThemeBySubject(subject) {
  const s = (subject || '').toLowerCase();
  if (s.includes('technical') || s.includes('support'))        return 'blue';
  if (s.includes('account') || s.includes('id issue'))         return 'amber';
  if (s.includes('report') || s.includes('bug'))               return 'red';
  if (s.includes('badge') || s.includes('verification'))       return 'gold';
  if (s.includes('premium') || s.includes('billing'))          return 'green';
  if (s.includes('feature') || s.includes('suggestion')
   || s.includes('request'))                                   return 'teal';
  return 'indigo';
}

// Static heart — email-client safe Unicode (no SVG, no CSS animation)
const HEART = `<span style="color:#f43f5e;font-size:18px;line-height:1;display:inline-block;vertical-align:middle;">&#10084;</span>`;

async function verifyOwner(token) {
  try {
    initFirebaseAdmin();
    // Verify signature with Firebase Admin SDK (same as send-email.js — no manual decode)
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    if (!uid) return { ok: false, err: 'Token missing UID' };

    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const data = userDoc.data() || {};
    if (data.role !== 'owner') return { ok: false, err: 'Access denied — owners only' };
    return { ok: true, uid, displayName: data.displayName || '', role: data.role };
  } catch (err) {
    return { ok: false, err: 'Auth verification failed' };
  }
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildReplyHtml({ subject, replyBody, originalFrom, originalDate, originalBody, senderName, senderEmail, themeKey }) {
  const t = EMAIL_THEMES[themeKey] || EMAIL_THEMES.purple;
  const escapedReply    = String(replyBody    || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  const escapedOriginal = String(originalBody || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');

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
  <tr><td style="background:${t.gradient};padding:32px 36px 26px;">
    <p style="margin:0 0 6px;color:rgba(255,255,255,.8);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">${APP_NAME}&trade; &middot; ${t.tag}</p>
    <p style="margin:0;color:#fff;font-size:20px;font-weight:800;">${esc(subject)}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 36px 28px;">
    <!-- Category badge -->
    <p style="margin:0 0 16px;"><span style="display:inline-block;background:${t.gradient};color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em;padding:4px 12px;border-radius:20px;">${t.tag}</span></p>

    <div style="background:#fafafa;border-left:3px solid ${t.accent2};border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;color:#374151;font-size:15px;line-height:1.85;">${escapedReply}</div>

    <div style="border-top:1px solid #f3f4f6;padding-top:18px;">
      <p style="margin:0 0 3px;color:#9ca3af;font-size:12px;">Regards,</p>
      <p style="margin:0 0 2px;color:#1e1b4b;font-size:15px;font-weight:700;">${esc(senderName)}</p>
      <p style="margin:0 0 2px;color:${t.roleColor};font-size:12px;font-weight:600;">Owner &middot; Godfather &middot; ${APP_NAME}&trade;</p>
      <a href="mailto:${esc(senderEmail)}" style="color:${t.accent2};font-size:12px;text-decoration:none;">${esc(senderEmail)}</a>
    </div>

    ${originalBody ? `<div style="margin-top:22px;padding:14px 16px;background:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;">
      <p style="margin:0 0 6px;color:#9ca3af;font-size:11px;">On ${esc(originalDate)}, ${esc(originalFrom)} wrote:</p>
      <div style="color:#6b7280;font-size:13px;line-height:1.7;">${escapedOriginal}</div>
    </div>` : ''}
  </td></tr>

  <!-- Footer -->
  <tr><td align="center" style="background:#faf8ff;border-top:1px solid #f3f4f6;padding:14px 36px;">
    <p style="margin:0 0 6px;">${HEART}&nbsp;<span style="font-size:12px;font-weight:800;color:${t.accent};letter-spacing:.3px;">Developed by Adrashtra</span>&nbsp;<span style="font-size:12px;color:#d8b4fe;">&middot;</span>&nbsp;<span style="font-size:12px;font-weight:800;color:#db2777;">Loved by India</span>&nbsp;${HEART}</p>
    <p style="margin:0;color:#9ca3af;font-size:11px;">&copy; 2026 ${APP_NAME}&trade; &middot; India's Premium Chat Community</p>
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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimitCheck(`email-action:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.ok) return { statusCode: 429, headers, body: JSON.stringify({ error: `Rate limited. Retry in ${rl.retryAfter}s.` }) };

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing auth' }) };

  const v = await verifyOwner(authHeader.slice(7));
  if (!v.ok) return { statusCode: 403, headers, body: JSON.stringify({ error: v.err }) };

  const sender = OWNER_MAP[v.displayName] || {
    email: DEFAULT_SENDER_EMAIL,
    name: `${v.displayName} — ${APP_NAME}`,
  };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const action          = body.action; // 'reply' | 'forward'
  const emailId         = sanitizeString(body.emailId, 128);
  const replyBody       = sanitizeString(body.body, 50000);
  const recipientEmail  = sanitizeString(body.recipientEmail || '', 254);
  const recipientName   = sanitizeString(body.recipientName  || '', 100);
  const subjectOverride = sanitizeString(body.subject        || '', 255);

  if (!['reply','forward'].includes(action)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
  if (!replyBody) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body is required' }) };

  try {
    initFirebaseAdmin();
    const db = admin.firestore();

    const parentDoc = emailId ? await db.collection('ownerEmails').doc(emailId).get() : null;
    const parent    = parentDoc?.exists ? parentDoc.data() : null;

    const toEmail = action === 'reply'
      ? (parent?.replyTo?.email || parent?.from?.email || recipientEmail)
      : recipientEmail;
    const toName = action === 'reply'
      ? (parent?.from?.name || 'User')
      : recipientName;
    const subject = action === 'reply'
      ? `Re: ${parent?.subject || subjectOverride}`
      : (subjectOverride || `Fwd: ${parent?.subject || ''}`);

    if (!validateEmail(toEmail)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid recipient email' }) };
    }

    // Derive theme from the parent email's subject so reply matches original contact category
    const themeKey = getThemeBySubject(parent?.subject || subjectOverride || '');

    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = buildReplyHtml({
      subject,
      replyBody,
      originalFrom: parent?.from?.email || '',
      originalDate: parent?.createdAt ? new Date(parent.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '',
      originalBody: action === 'forward' ? parent?.body : '',
      senderName:   v.displayName,
      senderEmail:  sender.email,
      themeKey,
    });

    const brevoResult = await sendEmailWithTemplate({
      sender:      { name: sender.name, email: sender.email },
      to:          [{ email: toEmail, name: toName }],
      replyTo:     { email: sender.email, name: sender.name },
      subject,
      htmlContent: html,
      textContent: `${replyBody}\n\n---\n${v.displayName} · Owner · ${APP_NAME}™\n${sender.email}`,
      tags:        ['owner-email-center', action, `theme-${themeKey}`],
    });

    const newEmailId = `${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
    await db.collection('ownerEmails').doc(newEmailId).set({
      threadId:     parent?.threadId || newEmailId,
      ownerInbox:   v.displayName,
      folder:       'sent',
      from:         { name: v.displayName, email: sender.email },
      to:           [{ name: toName, email: toEmail }],
      replyTo:      { email: sender.email, name: sender.name },
      subject,
      body:         replyBody,
      htmlBody:     html,
      read:         true,
      starred:      false,
      replied:      false,
      forwarded:    false,
      source:       action,
      parentEmailId: emailId || null,
      createdAt:    admin.firestore.FieldValue.serverTimestamp(),
      labels:       [],
      messageId:    brevoResult?.messageId || null,
    });

    if (parent && emailId) {
      await db.collection('ownerEmails').doc(emailId).update({
        [action === 'reply' ? 'replied' : 'forwarded']: true,
      });
    }

    // C10: Mask both addresses in logs — never write full emails to function logs.
    const _maskEmail = e => (typeof e === 'string' && e.includes('@'))
      ? e.replace(/^(.{1,3})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c)
      : '?';
    log.info(`Owner email ${action} sent`, {
      sender: _maskEmail(sender.email),
      to:     _maskEmail(toEmail),
      theme:  themeKey,
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, messageId: brevoResult?.messageId }) };
  } catch (err) {
    log.error(`email-action ${action} failed`, { message: err.message });
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Email action failed', detail: err.message }) };
  }
};
