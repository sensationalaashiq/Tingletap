// Netlify Function: contact — fully self-contained, no shared imports.
// POST body: { name, email, subject, message, route: 'support'|'administration' }
import admin from 'firebase-admin';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Owner inboxes — ownerInbox MUST match the username field in Firestore users collection
const ROUTE_MAP = {
  support:        { ownerInbox: 'VyomAI',  toEmail: 'support@tingletap.com', toName: 'VyomAI — TingleTap'  },
  administration: { ownerInbox: 'Blurry',  toEmail: 'admin@tingletap.com',   toName: 'Blurry — TingleTap'  },
};

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
      sender:      { name: 'TingleTap Contact Form', email: 'alerts@tingletap.com' },
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

function buildContactHtml({ name, email, subject, message, route, date }) {
  const tag = route === 'administration' ? 'Administration' : 'Support Team';
  const accentColor = route === 'administration' ? '#6366f1' : '#7c3aed';
  const escapedMsg = String(message || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
@keyframes bar-slide{0%{background-position:-300% center}100%{background-position:300% center}}
@keyframes heart-beat{0%,100%{transform:scale(1);opacity:.9}25%{transform:scale(1.28);opacity:1}50%{transform:scale(1);opacity:.9}75%{transform:scale(1.2);opacity:1}}
.bar{animation:bar-slide 4s linear infinite}
.heart{animation:heart-beat 1.4s ease-in-out infinite;transform-origin:center;display:block}
.heart-b{animation:heart-beat 1.4s ease-in-out infinite .4s;transform-origin:center;display:block}
</style></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:'Inter',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(155deg,#f2effe 0%,#ede9f9 55%,#e8e2f6 100%);min-height:100vh;">
<tr><td align="center" style="padding:28px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:#fff;border-radius:22px;border:1px solid rgba(139,92,246,.18);box-shadow:0 16px 56px rgba(109,40,217,.1);overflow:hidden;">

  <!-- Top bar -->
  <tr><td style="height:4px;padding:0;line-height:0;"><div class="bar" style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);background-size:300% 100%;font-size:0;"></div></td></tr>

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,${accentColor} 0%,#a855f7 55%,#6366f1 100%);padding:28px 36px 24px;">
    <div style="color:rgba(255,255,255,.75);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">TingleTap&trade; &middot; Contact Form &middot; ${esc(tag)}</div>
    <div style="color:#fff;font-size:20px;font-weight:800;">${esc(subject)}</div>
    <div style="color:rgba(255,255,255,.7);font-size:12px;margin-top:4px;">${esc(date)}</div>
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

    <!-- Message -->
    <div style="background:#fafafa;border-left:3px solid #a855f7;border-radius:0 10px 10px 0;padding:16px 20px;color:#374151;font-size:14px;line-height:1.85;margin-bottom:18px;">${escapedMsg}</div>

    <!-- Reply hint -->
    <div style="padding:14px 16px;background:#fdf4ff;border-radius:10px;border:1px solid #e9d5ff;margin-bottom:6px;">
      <p style="margin:0;color:${accentColor};font-size:12px;font-weight:600;">Reply directly to <a href="mailto:${esc(email)}" style="color:${accentColor};">${esc(email)}</a></p>
    </div>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:0 28px;"><div style="height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.18),transparent);"></div></td></tr>

  <!-- Premium footer -->
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

  <!-- Bottom bar -->
  <tr><td style="height:4px;padding:0;line-height:0;"><div class="bar" style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);background-size:300% 100%;font-size:0;"></div></td></tr>
</table>
</td></tr></table>
</body></html>`;
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

  if (!name || name.length < 2)    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Name is required (min 2 chars)' }) };
  if (!validEmail(email))           return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid email is required' }) };
  if (!subject || subject.length < 3) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Subject is required' }) };
  if (!message || message.length < 10) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Message is too short' }) };

  const target  = ROUTE_MAP[route];
  const emailId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const date    = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' });
  const html    = buildContactHtml({ name, email, subject, message, route, date });
  const text    = `Contact Form · ${route === 'administration' ? 'Administration' : 'Support Team'}\n\nFrom: ${name} <${email}>\nDate: ${date}\n\n${message}\n\n---\nDeveloped by Adrashtra · Loved by India\n© 2026 TingleTap™`;

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
    // If Firestore also failed → no delivery at all → return error
    if (!firestoreOk) {
      return {
        statusCode: 502,
        headers: CORS,
        body: JSON.stringify({ error: 'Failed to send your message. Please try again later.' }),
      };
    }
    // Firestore saved → owner will see it in Email Center; still return success
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
