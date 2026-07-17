const APP_NAME = process.env.BREVO_SENDER_NAME || 'App';
// Netlify Function: contact — fully self-contained, no shared imports.
// POST body: { name, email, subject, message, route: 'support'|'administration' }
import admin from 'firebase-admin';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Owner inboxes — ownerInbox MUST match the username field in Firestore users collection
const ROUTE_MAP = {
  support:        { ownerInbox: 'VyomAI',  toEmail: 'support@tingletap.com', toName: `VyomAI — ${APP_NAME}`  },
  administration: { ownerInbox: 'Blurry',  toEmail: 'admin@tingletap.com',   toName: `Blurry — ${APP_NAME}`  },
};

// ── Email themes (inline-style only — email-client safe, no SVG, no @keyframes) ──
const EMAIL_THEMES = {
  purple: {
    gradient: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#6366f1 100%)',
    bar:      'linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9)',
    accent:   '#7c3aed', accent2: '#a855f7', tag: 'Official Communication',
    border:   'rgba(124,58,237,.18)',
  },
  blue: {
    gradient: 'linear-gradient(135deg,#1d4ed8 0%,#3b82f6 55%,#0ea5e9 100%)',
    bar:      'linear-gradient(90deg,#1e40af,#2563eb,#60a5fa,#38bdf8,#60a5fa,#2563eb,#1e40af)',
    accent:   '#1d4ed8', accent2: '#3b82f6', tag: 'Technical Support',
    border:   'rgba(59,130,246,.18)',
  },
  amber: {
    gradient: 'linear-gradient(135deg,#b45309 0%,#d97706 55%,#f59e0b 100%)',
    bar:      'linear-gradient(90deg,#92400e,#b45309,#fbbf24,#fcd34d,#fbbf24,#b45309,#92400e)',
    accent:   '#b45309', accent2: '#d97706', tag: 'Account Support',
    border:   'rgba(217,119,6,.18)',
  },
  red: {
    gradient: 'linear-gradient(135deg,#dc2626 0%,#f43f5e 55%,#e11d48 100%)',
    bar:      'linear-gradient(90deg,#b91c1c,#dc2626,#f87171,#fb7185,#f87171,#dc2626,#b91c1c)',
    accent:   '#dc2626', accent2: '#f43f5e', tag: 'Alert &amp; Report',
    border:   'rgba(220,38,38,.18)',
  },
  gold: {
    gradient: 'linear-gradient(135deg,#78350f 0%,#b45309 35%,#d97706 65%,#f59e0b 100%)',
    bar:      'linear-gradient(90deg,#78350f,#b45309,#f59e0b,#fde68a,#f59e0b,#b45309,#78350f)',
    accent:   '#92400e', accent2: '#d97706', tag: 'Badge &amp; Verification',
    border:   'rgba(217,119,6,.2)',
  },
  green: {
    gradient: 'linear-gradient(135deg,#065f46 0%,#059669 55%,#10b981 100%)',
    bar:      'linear-gradient(90deg,#064e3b,#059669,#34d399,#6ee7b7,#34d399,#059669,#064e3b)',
    accent:   '#065f46', accent2: '#059669', tag: 'Premium Support',
    border:   'rgba(5,150,105,.18)',
  },
  teal: {
    gradient: 'linear-gradient(135deg,#0f766e 0%,#0d9488 55%,#14b8a6 100%)',
    bar:      'linear-gradient(90deg,#134e4a,#0d9488,#2dd4bf,#5eead4,#2dd4bf,#0d9488,#134e4a)',
    accent:   '#0f766e', accent2: '#0d9488', tag: 'Feature &amp; Suggestions',
    border:   'rgba(13,148,136,.18)',
  },
  pink: {
    gradient: 'linear-gradient(135deg,#9d174d 0%,#db2777 55%,#ec4899 100%)',
    bar:      'linear-gradient(90deg,#831843,#db2777,#f472b6,#fbcfe8,#f472b6,#db2777,#831843)',
    accent:   '#9d174d', accent2: '#db2777', tag: 'Welcome',
    border:   'rgba(219,39,119,.18)',
  },
  indigo: {
    gradient: 'linear-gradient(135deg,#3730a3 0%,#4f46e5 55%,#6366f1 100%)',
    bar:      'linear-gradient(90deg,#312e81,#4338ca,#818cf8,#a5b4fc,#818cf8,#4338ca,#312e81)',
    accent:   '#3730a3', accent2: '#4f46e5', tag: 'General Inquiry',
    border:   'rgba(79,70,229,.18)',
  },
};

function getThemeBySubject(subject) {
  const s = (subject || '').toLowerCase();
  if (s.includes('technical') || s.includes('support'))        return EMAIL_THEMES.blue;
  if (s.includes('account') || s.includes('id issue'))         return EMAIL_THEMES.amber;
  if (s.includes('report') || s.includes('bug'))               return EMAIL_THEMES.red;
  if (s.includes('badge') || s.includes('verification'))       return EMAIL_THEMES.gold;
  if (s.includes('premium') || s.includes('billing'))          return EMAIL_THEMES.green;
  if (s.includes('feature') || s.includes('suggestion')
   || s.includes('request'))                                   return EMAIL_THEMES.teal;
  if (s.includes('welcome') || s.includes('greeting'))         return EMAIL_THEMES.pink;
  return EMAIL_THEMES.indigo;
}

// ── Firebase Admin (singleton) ─────────────────────────────────────────────────
let fbReady = false;
function ensureFirebase() {
  if (fbReady || admin.apps.length > 0) { fbReady = true; return true; }
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[contact] Firebase env vars missing — skipping Firestore write');
    return false;
  }
  try {
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    fbReady = true;
    return true;
  } catch (err) {
    console.error('[contact] Firebase Admin init error:', err.message);
    return false;
  }
}

// ── Brevo send ────────────────────────────────────────────────────────────────
async function sendViaBrevo({ to, toName, replyToEmail, replyToName, subject, html, text }) {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY not set');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender:      { name: process.env.BREVO_SENDER_NAME || '', email: process.env.BREVO_SENDER_EMAIL || '' },
      to:          [{ email: to, name: toName }],
      replyTo:     { email: replyToEmail, name: replyToName },
      subject,
      htmlContent: html,
      textContent: text,
      tags:        ['tingletap-transactional', 'contact-form'],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo ${res.status}: ${err.message || JSON.stringify(err)}`);
  }
  return res.json();
}

// ── HTML helpers ───────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Static heart — email-client safe Unicode (no SVG, no CSS animation)
const HEART = `<span style="color:#f43f5e;font-size:20px;line-height:1;display:inline-block;vertical-align:middle;">&#10084;</span>`;

function buildContactHtml({ name, email, subject, message, route, date, theme }) {
  const t   = theme || getThemeBySubject(subject);
  const tag = route === 'administration' ? 'Administration' : 'Support Team';
  const escapedMsg = String(message || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');

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
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:#fff;border-radius:22px;border:1px solid ${t.border};box-shadow:0 16px 56px rgba(109,40,217,.1);overflow:hidden;">

  <!-- Top bar -->
  <tr><td style="height:4px;padding:0;line-height:0;font-size:0;background:${t.bar};">&nbsp;</td></tr>

  <!-- Header -->
  <tr><td style="background:${t.gradient};padding:28px 36px 24px;">
    <p style="margin:0 0 6px;color:rgba(255,255,255,.8);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">${APP_NAME}&trade; &middot; Contact Form &middot; ${esc(tag)}</p>
    <p style="margin:0 0 4px;color:#fff;font-size:20px;font-weight:800;">${esc(subject)}</p>
    <p style="margin:0;color:rgba(255,255,255,.75);font-size:12px;">${esc(date)}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 36px 24px;">

    <!-- From -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:7px 12px;background:#f5f3ff;border-radius:8px 8px 0 0;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">From</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #f3f4f6;border-top:none;border-radius:0 0 8px 8px;">
        <span style="font-weight:700;color:#1e1b4b;font-size:15px;">${esc(name)}</span>
        <span style="color:#9ca3af;font-size:13px;margin-left:8px;">&lt;${esc(email)}&gt;</span>
      </td></tr>
    </table>

    <!-- Category badge -->
    <p style="margin:0 0 14px;"><span style="display:inline-block;background:${t.gradient};color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em;padding:4px 12px;border-radius:20px;">${t.tag}</span></p>

    <!-- Message -->
    <div style="background:#fafafa;border-left:3px solid ${t.accent2};border-radius:0 10px 10px 0;padding:16px 20px;color:#374151;font-size:14px;line-height:1.85;margin-bottom:18px;">${escapedMsg}</div>

    <!-- Reply hint -->
    <div style="padding:14px 16px;background:#fdf4ff;border-radius:10px;border:1px solid #e9d5ff;margin-bottom:6px;">
      <p style="margin:0;color:${t.accent};font-size:12px;font-weight:600;">Reply directly to <a href="mailto:${esc(email)}" style="color:${t.accent2};">${esc(email)}</a></p>
    </div>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:0 28px;"><div style="height:1px;background:linear-gradient(90deg,transparent,${t.border},transparent);"></div></td></tr>

  <!-- Footer -->
  <tr><td align="center" style="padding:16px 28px 10px;background:#faf8ff;">
    <p style="margin:0 0 10px;">${HEART}&nbsp;<span style="font-size:12px;font-weight:800;color:${t.accent};letter-spacing:.3px;">Developed by Adrashtra</span>&nbsp;<span style="font-size:12px;color:#d8b4fe;">&middot;</span>&nbsp;<span style="font-size:12px;font-weight:800;color:#db2777;">Loved by India</span>&nbsp;${HEART}</p>
    <p style="margin:0 0 4px;font-size:10.5px;color:#c4b5fd;">&copy; 2026 <strong style="color:#9333ea;">${APP_NAME}&trade;</strong> &middot; India's Premium Chat Community &middot; All rights reserved.</p>
  </td></tr>

  <!-- Bottom bar -->
  <tr><td style="height:4px;padding:0;line-height:0;font-size:0;background:${t.bar};">&nbsp;</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Rate limiter ───────────────────────────────────────────────────────────────
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

// ── Input helpers ──────────────────────────────────────────────────────────────
function sanitize(val, max = 500) {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, max);
}
function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ── Handler ────────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: `Too many messages. Try again in ${rl.retryAfter}s.` }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const name    = sanitize(body.name,    100);
  const email   = sanitize(body.email,   254);
  const subject = sanitize(body.subject, 255);
  const message = sanitize(body.message, 10000);
  const route   = ['support', 'administration'].includes(body.route) ? body.route : 'support';

  if (!name || name.length < 2)         return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Name is required (min 2 chars)' }) };
  if (!validEmail(email))                return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid email is required' }) };
  if (!subject || subject.length < 3)   return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Subject is required' }) };
  if (!message || message.length < 10)  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Message is too short' }) };

  const target  = ROUTE_MAP[route];
  const theme   = getThemeBySubject(subject);
  const emailId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const date    = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
  const html    = buildContactHtml({ name, email, subject, message, route, date, theme });
  const text    = `Contact Form · ${route === 'administration' ? 'Administration' : 'Support Team'}\n\nFrom: ${name} <${email}>\nDate: ${date}\n\n${message}\n\n---\nDeveloped by Adrashtra · Loved by India\n© 2026 ${APP_NAME}™`;

  // ── Step 1: Firestore write (non-fatal) ──────────────────────────────────────
  let firestoreOk = false;
  const fbAvailable = ensureFirebase();
  if (fbAvailable) {
    try {
      const db = admin.firestore();
      await db.collection('ownerEmails').doc(emailId).set({
        threadId:      emailId,
        ownerInbox:    target.ownerInbox,
        folder:        'inbox',
        from:          { name, email },
        to:            [{ name: target.toName, email: target.toEmail }],
        replyTo:       { email, name },
        subject,
        body:          message,
        htmlBody:      html,
        read:          false,
        starred:       false,
        replied:       false,
        forwarded:     false,
        source:        'contact_form',
        createdAt:     admin.firestore.FieldValue.serverTimestamp(),
        labels:        [],
        parentEmailId: null,
        senderIp:      ip,
      });
      firestoreOk = true;
      console.log('[contact] ✓ Firestore write OK', { id: emailId, route, inbox: target.ownerInbox });
    } catch (err) {
      console.error('[contact] Firestore write failed (continuing):', err.message);
    }
  }

  // ── Step 2: Brevo notification email to owner ─────────────────────────────
  try {
    await sendViaBrevo({
      to:          target.toEmail,
      toName:      target.toName,
      replyToEmail: email,
      replyToName:  name,
      subject:     `[Contact · ${route === 'administration' ? 'Admin' : 'Support'}] ${subject}`,
      html,
      text,
    });
    console.log('[contact] ✓ Brevo email sent to', target.toEmail);
  } catch (err) {
    console.error('[contact] Brevo send failed:', err.message);
    if (!firestoreOk) {
      return {
        statusCode: 502,
        headers: CORS,
        body: JSON.stringify({ error: 'Failed to send your message. Please try again later.' }),
      };
    }
    console.warn('[contact] Brevo failed but Firestore saved — returning success');
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      ok: true,
      message: 'Message sent successfully. We will respond within 2–4 hours.',
      inboxSaved: firestoreOk,
    }),
  };
};
