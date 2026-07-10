// TingleTap Owner Email Center — API Server (port 5001)
// Runs alongside Vite in development. Proxied by Vite at /api/*.
import express from 'express';
import cors    from 'cors';
import admin   from 'firebase-admin';

const app  = express();
const PORT = 5001;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

// ── Optional Firebase Admin init (needs FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY) ──
let adminDb = null;
try {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (clientEmail && privateKey && FIREBASE_PROJECT_ID && !admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert({ projectId: FIREBASE_PROJECT_ID, clientEmail, privateKey }) });
    adminDb = admin.firestore();
    console.log('[EmailCenter] Firebase Admin initialized ✓');
  } else {
    console.warn('[EmailCenter] Firebase Admin credentials missing — contact form Firestore write disabled in dev');
  }
} catch (e) {
  console.warn('[EmailCenter] Firebase Admin init failed:', e.message);
}

// ── Owner → sender mapping (server-only, never exposed to frontend) ───────────
const OWNER_MAP = {
  'VyomAI': { email: 'support@tingletap.com', name: 'VyomAI — TingleTap' },
  'Blurry':  { email: 'admin@tingletap.com',   name: 'Blurry — TingleTap'  },
};

app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

// ── JWT decode (no signature verify — Firestore REST call does that) ──────────
function decodeJwt(token) {
  try {
    const b64 = token.split('.')[1];
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  } catch { return null; }
}

// ── Verify Firebase ID token + check role=owner via Firestore REST ─────────────
async function verifyOwner(token) {
  const p = decodeJwt(token);
  if (!p) return { ok: false, err: 'Invalid token format' };

  const uid = p.user_id || p.sub;
  if (!uid)  return { ok: false, err: 'Token missing UID' };
  if (p.exp && Date.now() / 1000 > p.exp) return { ok: false, err: 'Token expired' };
  if (p.aud !== FIREBASE_PROJECT_ID) return { ok: false, err: 'Token audience mismatch' };

  // Firestore REST — token verification is implicit (401 if invalid)
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?fields=role,displayName`;
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    return { ok: false, err: 'Network error verifying token' };
  }
  if (!res.ok) return { ok: false, err: `Auth failed (${res.status})` };

  const data = await res.json();
  const role        = data.fields?.role?.stringValue;
  const displayName = data.fields?.displayName?.stringValue || '';

  if (role !== 'owner') return { ok: false, err: 'Access denied — owners only' };
  return { ok: true, uid, displayName };
}

// ── Build branded email HTML ───────────────────────────────────────────────────
/** Escape a string for safe embedding in HTML. */
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
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:620px;margin:40px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 48px rgba(124,58,237,.1);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#6366f1 100%);padding:36px 40px 30px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="color:rgba(255,255,255,.75);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">TingleTap™ · Official Communication</div>
          <div style="color:#fff;font-size:21px;font-weight:800;line-height:1.3;">${subject}</div>
        </td>
        <td align="right" style="padding-left:16px;white-space:nowrap;">
          <div style="background:rgba(255,255,255,.12);border-radius:8px;padding:6px 12px;display:inline-block;">
            <span style="color:rgba(255,255,255,.8);font-size:11px;font-weight:600;">${date}</span>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Body -->
  <div style="padding:36px 40px 32px;">
    <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.7;">Dear <strong style="color:#1e1b4b;">${recipientName || 'TingleTap Member'}</strong>,</p>
    <div style="background:#fafafa;border-left:3px solid #a855f7;border-radius:0 10px 10px 0;padding:18px 22px;margin-bottom:28px;color:#374151;font-size:15px;line-height:1.85;">${escapedMsg}</div>
    <!-- Signature -->
    <div style="border-top:1px solid #f3f4f6;padding-top:22px;">
      <p style="margin:0 0 3px;color:#9ca3af;font-size:12px;">Regards,</p>
      <p style="margin:0 0 2px;color:#1e1b4b;font-size:15px;font-weight:700;">${senderName}</p>
      <p style="margin:0 0 2px;color:#7c3aed;font-size:12px;font-weight:600;letter-spacing:.02em;">Owner · Godfather · TingleTap™</p>
      <a href="mailto:${senderEmail}" style="color:#a855f7;font-size:12px;text-decoration:none;">${senderEmail}</a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#fafafa;border-top:1px solid #f3f4f6;padding:16px 40px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">© 2026 TingleTap™ · India's Premium Chat Community · All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}

// ── POST /api/send-email ───────────────────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  if (!BREVO_API_KEY) {
    console.error('[EmailCenter] BREVO_API_KEY not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const v = await verifyOwner(authHeader.slice(7));
  if (!v.ok) {
    console.warn('[EmailCenter] Auth failed:', v.err);
    return res.status(403).json({ error: v.err });
  }

  const sender = OWNER_MAP[v.displayName];
  if (!sender) {
    console.warn('[EmailCenter] Unknown owner:', v.displayName);
    return res.status(403).json({ error: 'Unrecognized owner account' });
  }

  const { recipientEmail, recipientName, recipientUid, subject, message } = req.body;
  if (!recipientEmail || !subject?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Missing required fields: recipientEmail, subject, message' });
  }
  if (subject.length > 255) return res.status(400).json({ error: 'Subject too long (max 255 chars)' });
  if (message.length > 50000) return res.status(400).json({ error: 'Message too long' });

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const html = buildEmailHtml({
    subject: subject.trim(),
    message: message.trim(),
    senderName: v.displayName,
    senderEmail: sender.email,
    recipientName,
    date,
  });

  let brRes, brData;
  try {
    brRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender:    { name: `${v.displayName} — TingleTap`, email: sender.email },
        to:        [{ email: recipientEmail, name: recipientName || 'TingleTap Member' }],
        replyTo:   { email: sender.email, name: `${v.displayName} — TingleTap` },
        subject:   subject.trim(),
        htmlContent: html,
        textContent: `${subject.trim()}\n\nDear ${recipientName || 'TingleTap Member'},\n\n${message.trim()}\n\nRegards,\n${v.displayName}\nOwner · Godfather · TingleTap™\n${sender.email}`,
        tags: ['owner-email-center', `sender-${v.displayName.toLowerCase()}`],
      }),
    });
    brData = await brRes.json();
  } catch (netErr) {
    console.error('[EmailCenter] Network error calling Brevo:', netErr.message);
    return res.status(502).json({ error: 'Email delivery network error' });
  }

  if (!brRes.ok) {
    console.error('[EmailCenter] Brevo error:', brData);
    return res.status(502).json({ error: 'Email delivery failed', detail: brData?.message });
  }

  console.log(`[EmailCenter] ✓ ${v.displayName} (${sender.email}) → ${recipientEmail} | "${subject.trim()}" | msgId: ${brData.messageId}`);
  return res.json({ ok: true, messageId: brData.messageId, sender: sender.email });
});

// ── Firestore REST helpers (uses caller's Firebase ID token) ──────────────────
function fsVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean')        return { booleanValue: v };
  if (typeof v === 'number')         return { integerValue: String(v) };
  if (typeof v === 'string')         return { stringValue: v };
  if (Array.isArray(v))             return { arrayValue: { values: v.map(fsVal) } };
  if (typeof v === 'object')         return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, fv]) => [k, fsVal(fv)])) } };
  return { stringValue: String(v) };
}
function fromFsVal(v) {
  if (!v) return null;
  if ('stringValue'  in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return parseInt(v.integerValue);
  if ('doubleValue'  in v) return v.doubleValue;
  if ('nullValue'    in v) return null;
  if ('arrayValue'   in v) return (v.arrayValue.values || []).map(fromFsVal);
  if ('mapValue'     in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, fv]) => [k, fromFsVal(fv)]));
  return null;
}
function fromFsDoc(doc) {
  if (!doc?.fields) return null;
  return Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, fromFsVal(v)]));
}
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function fsGet(token, path) {
  const r = await fetch(`${FS_BASE}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return fromFsDoc(await r.json());
}
async function fsCreate(token, collection, fields) {
  const r = await fetch(`${FS_BASE}/${collection}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fsVal(v)])) }),
  });
  return r.ok;
}
async function fsPatch(token, path, fields) {
  const mask = Object.keys(fields).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const r = await fetch(`${FS_BASE}/${path}?${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fsVal(v)])) }),
  });
  return r.ok;
}

function buildReplyHtml({ subject, replyBody, originalFrom, originalBody, senderName, senderEmail }) {
  const esc2 = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const body2 = String(replyBody||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  const orig2 = String(originalBody||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc2(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:620px;margin:40px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 48px rgba(124,58,237,.1);">
  <div style="background:linear-gradient(135deg,#7c3aed,#a855f7,#6366f1);padding:32px 36px 26px;">
    <div style="color:rgba(255,255,255,.75);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">TingleTap™ · Official Reply</div>
    <div style="color:#fff;font-size:20px;font-weight:800;">${esc2(subject)}</div>
  </div>
  <div style="padding:32px 36px 28px;">
    <div style="background:#fafafa;border-left:3px solid #a855f7;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;color:#374151;font-size:15px;line-height:1.85;">${body2}</div>
    <div style="padding-top:8px;border-top:1px solid #f3f4f6;">
      <p style="margin:0 0 3px;color:#9ca3af;font-size:12px;">Regards,</p>
      <p style="margin:0 0 2px;color:#1e1b4b;font-size:15px;font-weight:700;">${esc2(senderName)}</p>
      <p style="margin:0 0 2px;color:#7c3aed;font-size:12px;font-weight:600;">Owner · Godfather · TingleTap™</p>
      <a href="mailto:${esc2(senderEmail)}" style="color:#a855f7;font-size:12px;">${esc2(senderEmail)}</a>
    </div>
    ${originalBody?`<div style="margin-top:22px;padding:14px 16px;background:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;">
      <p style="margin:0 0 6px;color:#9ca3af;font-size:11px;">From: ${esc2(originalFrom)}</p>
      <div style="color:#6b7280;font-size:13px;line-height:1.7;">${orig2}</div>
    </div>`:''}
  </div>
  <div style="background:#fafafa;border-top:1px solid #f3f4f6;padding:14px 36px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">© 2026 TingleTap™ · India's Premium Chat Community</p>
  </div>
</div></body></html>`;
}

// ── POST /api/email-action (reply / forward) ───────────────────────────────────
app.post('/api/email-action', async (req, res) => {
  if (!BREVO_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured — set BREVO_API_KEY' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const token = authHeader.slice(7);

  const v = await verifyOwner(token);
  if (!v.ok) return res.status(403).json({ error: v.err });

  const sender = OWNER_MAP[v.displayName];
  if (!sender) return res.status(403).json({ error: 'Unrecognized owner account' });

  const { action, emailId, body: replyBody, recipientEmail, recipientName, subject: subjectOverride } = req.body;

  if (!['reply', 'forward'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  if (!replyBody?.trim()) return res.status(400).json({ error: 'Body is required' });

  // Load parent email from Firestore
  const parent = emailId ? await fsGet(token, `ownerEmails/${emailId}`) : null;

  const toEmail = action === 'reply'
    ? (parent?.replyTo?.email || parent?.from?.email || recipientEmail || '')
    : (recipientEmail || '');
  const toName = action === 'reply'
    ? (parent?.from?.name || 'User')
    : (recipientName || '');
  const subject = action === 'reply'
    ? `Re: ${parent?.subject || subjectOverride || ''}`
    : (subjectOverride || `Fwd: ${parent?.subject || ''}`);

  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return res.status(400).json({ error: 'Invalid or missing recipient email' });
  }

  const html = buildReplyHtml({
    subject, replyBody: replyBody.trim(),
    originalFrom: parent?.from?.email || '',
    originalBody: action === 'forward' ? (parent?.body || '') : '',
    senderName: v.displayName,
    senderEmail: sender.email,
  });

  // Send via Brevo
  let brRes, brData;
  try {
    brRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: sender.name, email: sender.email },
        to:          [{ email: toEmail, name: toName || 'TingleTap Member' }],
        replyTo:     { email: sender.email, name: sender.name },
        subject,
        htmlContent: html,
        textContent: `${replyBody.trim()}\n\n---\n${v.displayName} · Owner · TingleTap™\n${sender.email}`,
        tags:        ['owner-email-center', action],
      }),
    });
    brData = await brRes.json();
  } catch (netErr) {
    return res.status(502).json({ error: 'Email delivery network error', detail: netErr.message });
  }
  if (!brRes.ok) return res.status(502).json({ error: 'Email delivery failed', detail: brData?.message });

  // Write sent record + update parent — best effort
  const newId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const sentRecord = {
    threadId:      parent?.threadId || newId,
    ownerInbox:    v.displayName,
    folder:        'sent',
    from:          { name: v.displayName, email: sender.email },
    to:            [{ name: toName, email: toEmail }],
    replyTo:       { email: sender.email, name: sender.name },
    subject,
    body:          replyBody.trim(),
    htmlBody:      html,
    read:          true,
    starred:       false,
    replied:       false,
    forwarded:     false,
    source:        action,
    parentEmailId: emailId || null,
    labels:        [],
    messageId:     brData.messageId || null,
  };
  await fsCreate(token, 'ownerEmails', sentRecord).catch(() => {});
  if (parent && emailId) {
    const updateField = action === 'reply' ? 'replied' : 'forwarded';
    await fsPatch(token, `ownerEmails/${emailId}`, { [updateField]: true }).catch(() => {});
  }

  console.log(`[EmailCenter] ✓ ${action} | ${v.displayName} → ${toEmail} | "${subject}" | msgId: ${brData.messageId}`);
  return res.json({ ok: true, messageId: brData.messageId });
});

// ── Shared rate-limit store (in-memory, resets on restart) ────────────────────
const _rateLimits = new Map();
function _rateLimit(key, max, windowMs) {
  const now   = Date.now();
  const entry = _rateLimits.get(key) || { count: 0, start: now };
  if (now - entry.start > windowMs) { _rateLimits.set(key, { count: 1, start: now }); return { ok: true }; }
  if (entry.count >= max) return { ok: false, retryAfter: Math.ceil((entry.start + windowMs - now) / 1000) };
  entry.count++;
  _rateLimits.set(key, entry);
  return { ok: true };
}

async function _sendViaBrevo({ to, subject, html, text, sender, replyTo, tags = [] }) {
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY not set');
  const payload = {
    sender:      sender || { name: process.env.BREVO_SENDER_NAME || 'TingleTap', email: process.env.BREVO_SENDER_EMAIL || '' },
    to:          Array.isArray(to) ? to : [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
    tags:        ['tingletap-transactional', ...tags],
  };
  if (replyTo) payload.replyTo = replyTo;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(`Brevo ${r.status}: ${e.message || JSON.stringify(e)}`); }
  return r.json();
}

// ── POST /api/sendOTP ──────────────────────────────────────────────────────────
app.post('/api/sendOTP', async (req, res) => {
  const { email: rawEmail, otp: rawOtp, userName: rawName } = req.body || {};
  const email    = String(rawEmail || '').trim().slice(0, 254);
  const otp      = String(rawOtp   || '').trim().slice(0, 10);
  const userName = String(rawName  || '').trim().slice(0, 100);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Valid email required' });
  if (!otp || !/^\d{6}$/.test(otp))
    return res.status(400).json({ error: '6-digit OTP required' });

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const rl = _rateLimit(`otp:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return res.status(429).set('Retry-After', String(rl.retryAfter)).json({ error: 'Too many requests. Please wait a few minutes.' });

  const n = userName || email.split('@')[0];
  const otpHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>TingleTap – Verify Your Email</title></head>
<body style="margin:0;padding:0;background:#ede9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:540px;margin:40px auto;background:#fff;border-radius:22px;border:1px solid rgba(139,92,246,.18);box-shadow:0 16px 56px rgba(109,40,217,.1);overflow:hidden;">
  <div style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);"></div>
  <div style="padding:32px 36px 10px;text-align:center;background:linear-gradient(180deg,#faf8ff,#fff);">
    <img src="https://res.cloudinary.com/dbqnocfoq/image/upload/f_auto,q_auto,w_300/tingletap-logo_irf2a8.png" alt="TingleTap" width="80" height="80" style="border-radius:18px;display:block;margin:0 auto 10px;"/>
    <div style="font-size:26px;font-weight:900;background:linear-gradient(135deg,#5b21b6,#9333ea,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">TingleTap</div>
    <div style="color:#a78bca;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-top:3px;">Email Verification</div>
  </div>
  <div style="padding:24px 36px 28px;">
    <h2 style="color:#1e0a3c;font-size:22px;font-weight:800;text-align:center;margin:0 0 10px;">Verify Your Email Address</h2>
    <p style="color:#5c4080;font-size:14px;text-align:center;margin:0 0 24px;line-height:1.65;">Hello <strong style="color:#6d28d9;">${String(n).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</strong>, welcome to <strong style="color:#9333ea;">TingleTap</strong>!<br>Enter the one-time code below to complete sign-up.</p>
    <div style="background:linear-gradient(135deg,#f8f5ff,#f0ebff);border:1.5px solid rgba(109,40,217,.22);border-radius:18px;padding:22px 20px;margin-bottom:16px;text-align:center;">
      <div style="color:#a78bca;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;">Your One-Time Code</div>
      <div style="background:#fff;border:2px solid rgba(109,40,217,.28);border-radius:14px;padding:14px 12px;display:inline-block;min-width:200px;">
        <span style="font-size:34px;font-weight:900;letter-spacing:8px;color:#3b0764;font-family:'Courier New',monospace;">${otp}</span>
      </div>
      <p style="color:#dc2626;font-size:12px;font-weight:700;margin:14px 0 0;">Expires in 10 minutes</p>
    </div>
    <p style="color:#a78bca;font-size:12px;text-align:center;margin:0;line-height:1.6;">Enter this code on the sign-up page to verify your address.<br>Didn't request this? You can safely ignore this email.</p>
  </div>
  <div style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);"></div>
</div></body></html>`;

  try {
    await _sendViaBrevo({
      to: email, subject: `${otp} — Your TingleTap Verification Code`,
      html: otpHtml,
      text: `Hi ${n},\n\nYour TingleTap verification code is: ${otp}\n\nExpires in 10 minutes. If you did not request this, ignore this email.\n\nTingleTap Team`,
      tags: ['otp-verification'],
    });
    console.log(`[sendOTP] ✓ OTP sent to ${email.replace(/(.{2}).+(@.+)/, '$1***$2')}`);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[sendOTP] Brevo error:', err.message);
    return res.status(502).json({ error: `Failed to send email: ${err.message}` });
  }
});

// ── POST /api/sendPasswordReset ────────────────────────────────────────────────
app.post('/api/sendPasswordReset', async (req, res) => {
  const email    = String(req.body?.email    || '').trim().slice(0, 254);
  const userName = String(req.body?.userName || '').trim().slice(0, 100);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Valid email required' });

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const rl = _rateLimit(`reset:${ip}`, 3, 5 * 60 * 1000);
  if (!rl.ok) return res.status(429).set('Retry-After', String(rl.retryAfter)).json({ error: 'Too many requests. Please wait a few minutes before trying again.' });

  if (!adminDb) {
    console.error('[sendPasswordReset] Firebase Admin not initialized — check FIREBASE_* env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  let firebaseLink;
  try {
    firebaseLink = await admin.auth().generatePasswordResetLink(email, {
      url: 'https://tingletap.com/reset-password',
      handleCodeInApp: false,
    });
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
      return res.json({ ok: true }); // silent — don't reveal account existence
    }
    console.error('[sendPasswordReset] Firebase link error:', err.message);
    return res.status(500).json({ error: 'Could not generate reset link' });
  }

  let resetUrl = firebaseLink;
  try {
    const parsed  = new URL(firebaseLink);
    const oobCode = parsed.searchParams.get('oobCode');
    if (oobCode) resetUrl = `https://tingletap.com/reset-password?oobCode=${encodeURIComponent(oobCode)}`;
  } catch {}

  const displayName = userName || email.split('@')[0];
  const eHtml = String(email).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const nHtml = String(displayName).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const resetHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>TingleTap – Reset Your Password</title></head>
<body style="margin:0;padding:0;background:#ede9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:540px;margin:40px auto;background:#fff;border-radius:22px;border:1px solid rgba(139,92,246,.18);box-shadow:0 16px 56px rgba(109,40,217,.1);overflow:hidden;">
  <div style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);"></div>
  <div style="padding:32px 36px 10px;text-align:center;background:linear-gradient(180deg,#faf8ff,#fff);">
    <img src="https://res.cloudinary.com/dbqnocfoq/image/upload/f_auto,q_auto,w_300/tingletap-logo_irf2a8.png" alt="TingleTap" width="80" height="80" style="border-radius:18px;display:block;margin:0 auto 10px;"/>
    <div style="font-size:26px;font-weight:900;background:linear-gradient(135deg,#5b21b6,#9333ea,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">TingleTap</div>
    <div style="color:#a78bca;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-top:3px;">Password Reset</div>
  </div>
  <div style="padding:24px 36px 28px;">
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#2d1b4e;text-align:center;">Password Reset Request</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#7e6ca8;text-align:center;line-height:1.6;">We received a request to reset the password for your TingleTap account.</p>
    <p style="margin:0 0 6px;font-size:15px;color:#3d2565;font-weight:600;">Hi ${nHtml},</p>
    <p style="margin:0 0 22px;font-size:14px;color:#6b5b8a;line-height:1.65;">Someone requested a password reset for the account associated with <strong style="color:#7c3aed;">${eHtml}</strong>. Click the button below to create a new password.</p>
    <div style="text-align:center;margin-bottom:22px;">
      <a href="${resetUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#9333ea 50%,#c084fc 100%);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:14px;box-shadow:0 8px 28px rgba(109,40,217,.35);">Reset My Password →</a>
    </div>
    <div style="background:rgba(109,40,217,.05);border:1px solid rgba(139,92,246,.15);border-radius:10px;padding:12px 16px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:#5b21b6;font-weight:600;">Link expires in 1 hour</p>
      <p style="margin:4px 0 0;font-size:12px;color:#7e6ca8;">For your security, this reset link is only valid for 60 minutes from when it was requested.</p>
    </div>
    <div style="background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.12);border-radius:10px;padding:12px 16px;">
      <p style="margin:0;font-size:13px;color:#b91c1c;font-weight:600;">Didn't request this?</p>
      <p style="margin:4px 0 0;font-size:12px;color:#9b1c1c;">If you did not request a password reset, please ignore this email. Your account remains secure.</p>
    </div>
  </div>
  <div style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);"></div>
</div></body></html>`;

  try {
    await _sendViaBrevo({
      to: email, subject: 'Reset Your TingleTap Password',
      html: resetHtml,
      text: `Hi ${displayName},\n\nReset your TingleTap password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.\n\nTingleTap Team`,
      tags: ['password-reset'],
    });
    console.log(`[sendPasswordReset] ✓ Reset email sent to ${email.replace(/(.{2}).+(@.+)/, '$1***$2')}`);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[sendPasswordReset] Brevo error:', err.message);
    return res.status(502).json({ error: `Failed to send email: ${err.message}` });
  }
});

// ── POST /api/sendVerification ─────────────────────────────────────────────────
app.post('/api/sendVerification', async (req, res) => {
  const email    = String(req.body?.email    || '').trim().slice(0, 254);
  const userName = String(req.body?.userName || '').trim().slice(0, 100);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Valid email required' });

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const rl = _rateLimit(`verify:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return res.status(429).set('Retry-After', String(rl.retryAfter)).json({ error: 'Too many requests. Please try again later.' });

  if (!adminDb) {
    console.error('[sendVerification] Firebase Admin not initialized — check FIREBASE_* env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  let firebaseLink;
  try {
    firebaseLink = await admin.auth().generateEmailVerificationLink(email, {
      url: 'https://tingletap.com/verify-email',
      handleCodeInApp: false,
    });
  } catch (err) {
    console.error('[sendVerification] Firebase link error:', err.message);
    return res.status(500).json({ error: 'Could not generate verification link' });
  }

  let verifyUrl = firebaseLink;
  try {
    const parsed  = new URL(firebaseLink);
    const oobCode = parsed.searchParams.get('oobCode');
    if (oobCode) verifyUrl = `https://tingletap.com/verify-email?oobCode=${encodeURIComponent(oobCode)}`;
  } catch {}

  const displayName = userName || email.split('@')[0];
  const eHtml = String(email).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const nHtml = String(displayName).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const verifyHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>TingleTap – Verify Your Email</title></head>
<body style="margin:0;padding:0;background:#ede9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:540px;margin:40px auto;background:#fff;border-radius:22px;border:1px solid rgba(139,92,246,.18);box-shadow:0 16px 56px rgba(109,40,217,.1);overflow:hidden;">
  <div style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);"></div>
  <div style="padding:32px 36px 10px;text-align:center;background:linear-gradient(180deg,#faf8ff,#fff);">
    <img src="https://res.cloudinary.com/dbqnocfoq/image/upload/f_auto,q_auto,w_300/tingletap-logo_irf2a8.png" alt="TingleTap" width="80" height="80" style="border-radius:18px;display:block;margin:0 auto 10px;"/>
    <div style="font-size:26px;font-weight:900;background:linear-gradient(135deg,#5b21b6,#9333ea,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">TingleTap</div>
    <div style="color:#a78bca;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-top:3px;">Email Verification</div>
  </div>
  <div style="padding:24px 36px 28px;">
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#2d1b4e;text-align:center;">Verify Your Email Address</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#7e6ca8;text-align:center;line-height:1.6;">You're just one click away from joining TingleTap.</p>
    <p style="margin:0 0 6px;font-size:15px;color:#3d2565;font-weight:600;">Hi ${nHtml},</p>
    <p style="margin:0 0 22px;font-size:14px;color:#6b5b8a;line-height:1.65;">We received a request to verify the email address <strong style="color:#7c3aed;">${eHtml}</strong> for your TingleTap account. Click the button below to confirm your address.</p>
    <div style="text-align:center;margin-bottom:22px;">
      <a href="${verifyUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#7c3aed 0%,#9333ea 50%,#c084fc 100%);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 36px;border-radius:14px;box-shadow:0 8px 28px rgba(109,40,217,.35);">Verify My Email →</a>
    </div>
    <div style="background:rgba(109,40,217,.05);border:1px solid rgba(139,92,246,.15);border-radius:10px;padding:12px 16px;">
      <p style="margin:0;font-size:13px;color:#5b21b6;font-weight:600;">Link expires in 24 hours</p>
      <p style="margin:4px 0 0;font-size:12px;color:#7e6ca8;">If you didn't create a TingleTap account, you can safely ignore this email.</p>
    </div>
  </div>
  <div style="height:4px;background:linear-gradient(90deg,#6d28d9,#9333ea,#c084fc,#e879f9,#c084fc,#9333ea,#6d28d9);"></div>
</div></body></html>`;

  try {
    await _sendViaBrevo({
      to: email, subject: 'Verify Your TingleTap Email Address',
      html: verifyHtml,
      text: `Hi ${displayName},\n\nPlease verify your TingleTap email:\n${verifyUrl}\n\nExpires in 24 hours. If you didn't create a TingleTap account, ignore this email.\n\nTingleTap Team`,
      tags: ['email-verification'],
    });
    console.log(`[sendVerification] ✓ Verification email sent to ${email.replace(/(.{2}).+(@.+)/, '$1***$2')}`);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[sendVerification] Brevo error:', err.message);
    return res.status(502).json({ error: `Failed to send email: ${err.message}` });
  }
});

// ── POST /api/contact ──────────────────────────────────────────────────────────
const CONTACT_ROUTE_MAP = {
  support:        { ownerInbox: 'VyomAI', toEmail: 'support@tingletap.com', toName: 'VyomAI — TingleTap' },
  administration: { ownerInbox: 'Blurry', toEmail: 'admin@tingletap.com',   toName: 'Blurry — TingleTap'  },
};

app.post('/api/contact', async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const rl = _rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return res.status(429).json({ error: `Too many messages. Try again in ${rl.retryAfter}s.` });

  const name    = String(req.body?.name    || '').trim().slice(0, 100);
  const email   = String(req.body?.email   || '').trim().slice(0, 254);
  const subject = String(req.body?.subject || '').trim().slice(0, 255);
  const message = String(req.body?.message || '').trim().slice(0, 10000);
  const route   = ['support','administration'].includes(req.body?.route) ? req.body.route : 'support';

  if (!name || name.length < 2)        return res.status(400).json({ error: 'Name is required (min 2 chars)' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (!subject || subject.length < 3) return res.status(400).json({ error: 'Subject is required' });
  if (!message || message.length < 10) return res.status(400).json({ error: 'Message is too short' });

  const target = CONTACT_ROUTE_MAP[route];
  const date   = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const tag    = route === 'administration' ? 'Administration' : 'Support Team';

  const escH = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const msgH = message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');

  const contactHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${escH(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:620px;margin:40px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 48px rgba(124,58,237,.1);">
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#6366f1 100%);padding:32px 36px 26px;">
    <div style="color:rgba(255,255,255,.75);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">TingleTap™ · Contact Form · ${escH(tag)}</div>
    <div style="color:#fff;font-size:20px;font-weight:800;">${escH(subject)}</div>
    <div style="color:rgba(255,255,255,.7);font-size:12px;margin-top:4px;">${escH(date)}</div>
  </div>
  <div style="padding:32px 36px 28px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
      <tr><td style="padding:7px 12px;background:#f5f3ff;border-radius:8px 8px 0 0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">From</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #f3f4f6;border-top:none;border-radius:0 0 8px 8px;">
        <span style="font-weight:700;color:#1e1b4b;font-size:15px;">${escH(name)}</span>
        <span style="color:#9ca3af;font-size:13px;margin-left:8px;">&lt;${escH(email)}&gt;</span>
      </td></tr>
    </table>
    <div style="background:#fafafa;border-left:3px solid #a855f7;border-radius:0 10px 10px 0;padding:16px 20px;color:#374151;font-size:15px;line-height:1.85;">${msgH}</div>
    <div style="margin-top:20px;padding:14px 16px;background:#fdf4ff;border-radius:10px;border:1px solid #e9d5ff;">
      <p style="margin:0;color:#7c3aed;font-size:12px;font-weight:600;">Reply directly to <a href="mailto:${escH(email)}" style="color:#7c3aed;">${escH(email)}</a></p>
    </div>
  </div>
  <div style="background:#fafafa;border-top:1px solid #f3f4f6;padding:14px 36px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">© 2026 TingleTap™ · India's Premium Chat Community</p>
  </div>
</div></body></html>`;

  const textContent = `Contact Form · ${tag}\n\nFrom: ${name} <${email}>\nSubject: ${subject}\n\n${message}`;
  const emailId     = `${Date.now()}_${Math.random().toString(36).slice(2,9)}`;

  // Store in Firestore (if Admin is available)
  if (adminDb) {
    try {
      await adminDb.collection('ownerEmails').doc(emailId).set({
        threadId: emailId, ownerInbox: target.ownerInbox, folder: 'inbox',
        from: { name, email }, to: [{ name: target.toName, email: target.toEmail }],
        replyTo: { email, name }, subject, body: message, htmlBody: contactHtml,
        read: false, starred: false, replied: false, forwarded: false,
        source: 'contact_form', labels: [], parentEmailId: null, senderIp: ip,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[contact] ✓ Stored in Firestore: ${emailId} → ownerInbox:${target.ownerInbox}`);
    } catch (err) {
      console.error('[contact] Firestore write failed:', err.message);
      return res.status(500).json({ error: `Server error saving message: ${err.message}` });
    }
  } else {
    console.warn('[contact] Firebase Admin not available — Firestore write skipped');
  }

  // Send Brevo notification email to owner inbox
  try {
    await _sendViaBrevo({
      sender:  { name: process.env.BREVO_SENDER_NAME || 'TingleTap', email: process.env.BREVO_SENDER_EMAIL || '' },
      to:      [{ email: target.toEmail, name: target.toName }],
      replyTo: { email, name },
      subject: `[Contact · ${route === 'administration' ? 'Admin' : 'Support'}] ${subject}`,
      html: contactHtml,
      text: textContent,
      tags: ['contact-form', route],
    });
    console.log(`[contact] ✓ Notification sent to ${target.toEmail} | from: ${email.replace(/(.{2}).+(@.+)/, '$1***$2')}`);
  } catch (err) {
    console.error('[contact] Brevo send failed:', err.message);
    return res.status(502).json({ error: `Failed to send notification email: ${err.message}` });
  }

  return res.json({ ok: true, message: 'Message sent successfully. We will respond within 2–4 hours.' });
});

// ── POST /api/post-automod-notice ────────────────────────────────────────────
// Dev-only proxy for the Netlify function `post-automod-notice` (v2 — hardened).
// In production Netlify routes /.netlify/functions/post-automod-notice directly.
// Mirrors the same security model as the Netlify function:
//   1. Token verification  2. Staff role check  3. Signal-only input
//   4. Server-side text generation  5. Dedup lock (room+violator+action)
app.post('/api/post-automod-notice', async (req, res) => {
  if (!adminDb) return res.status(503).json({ error: 'Firebase Admin not available in dev' });

  // 1 — Token verification
  const idToken = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (!idToken) return res.status(401).json({ error: 'Unauthorized — no token' });

  // checkRevoked intentionally OFF — see matching note in the Netlify function;
  // it adds a network round-trip to Google on every call with no benefit for
  // this low-risk, non-destructive notice endpoint, and dev should mirror prod.
  let callerUid;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    callerUid = decoded.uid;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // 2 — Any authenticated user may trigger notices (guest docs may not exist — that's fine)
  // Actual enforcement (mute/kick/delete) is client-side staff-only; notices are server-generated.

  // 3 — Input validation (signal only — no text/tinglebotType from client)
  const ALLOWED_ACTIONS = new Set(['warn','delete_warn','mute_5','mute_30','mute_3h','mute_24h','kick']);
  const ALLOWED_VTYPES  = new Set(['threat','doxxing','hate','scam','minor_grooming','non_consensual','spam','harassment','link','family_abuse']);
  const { roomId, violatorUid, violatorDisplayName, violationType, action } = req.body || {};
  if (!roomId || !violatorUid || !violatorDisplayName || !violationType || !action)
    return res.status(400).json({ error: 'Missing required fields' });
  if (typeof roomId !== 'string' || roomId.length > 100) return res.status(400).json({ error: 'Invalid roomId' });
  if (typeof violatorUid !== 'string' || violatorUid.length > 128) return res.status(400).json({ error: 'Invalid violatorUid' });
  if (!ALLOWED_ACTIONS.has(action)) return res.status(400).json({ error: `Invalid action: ${action}` });
  if (!ALLOWED_VTYPES.has(violationType)) return res.status(400).json({ error: `Invalid violationType: ${violationType}` });

  // 4 — Server-side notice text generation (no client text trusted)
  const sanitiseName = (raw) => String(raw || 'User').replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\s._\-]/gu, '').trim().slice(0, 50) || 'User';
  const pickVariant  = (arr, seed) => { let h = 0; for (const c of seed) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0; return arr[h % arr.length]; };
  const VLABELS = { threat:'Threat of violence', doxxing:'Personal information / doxxing', hate:'Hate speech / terrorism promotion', scam:'Scam / phishing / illegal activity', minor_grooming:'Minor safety / grooming', non_consensual:'Non-consensual sexual content', spam:'Message flooding / spam', harassment:'Repeated harassment', link:'Unauthorized link sharing', family_abuse:'Abusive language' };
  const MDURLABELS = { mute_5:'5 minutes', mute_30:'30 minutes', mute_3h:'3 hours', mute_24h:'24 hours' };
  const ACTION_TO_TYPE = { warn:'automod', delete_warn:'automod', mute_5:'muted', mute_30:'muted', mute_3h:'muted', mute_24h:'muted', kick:'kicked' };
  const safeName  = sanitiseName(violatorDisplayName);
  const label     = VLABELS[violationType] || 'Community guideline violation';
  const seed      = safeName + action;
  let noticeText;
  if (action === 'kick') {
    noticeText = pickVariant([`${safeName} was automatically removed after repeated violations.`, `${safeName} has been removed from the chat due to continued violations.`, `${safeName} was kicked by AutoMod after exceeding the violation limit.`], seed);
  } else if (action.startsWith('mute_')) {
    const dur = MDURLABELS[action] || 'some time';
    noticeText = pickVariant([`${safeName} has been muted for ${dur} — ${label}.`, `${safeName} was temporarily silenced (${dur}) due to: ${label}.`, `Chat muted for ${safeName} (${dur}). Reason: ${label}.`], seed);
  } else if (action === 'delete_warn') {
    noticeText = pickVariant([`A message from ${safeName} was removed — ${label}. Another violation may result in a mute.`, `${safeName}'s message was deleted for: ${label}. Please review the chat rules.`, `Message removed (${label}). ${safeName}, this is a final warning before muting.`], seed);
  } else {
    noticeText = pickVariant([`Hey ${safeName}, let's keep the chat welcoming for everyone. ${label} is not allowed here. This is your first warning.`, `${safeName}, please mind the community guidelines. ${label} detected — first warning.`, `Heads up, ${safeName}! ${label} isn't acceptable here. Please keep it respectful.`], seed);
  }
  const tinglebotType = ACTION_TO_TYPE[action] || 'automod';

  // 5 — Rate limits + dedup (single transaction, mirrors production function)
  const RL_WINDOW_MS  = 5 * 60 * 1000;
  const RL_CALLER_MAX = 20;
  const RL_ROOM_MAX   = 50;
  const TTL_MS        = 60 * 1000;
  const BURST_MS       = 7 * 1000; // mirrors NOTICE_BURST_MS in the Netlify function
  const now2          = Date.now();
  const callerRlRef   = adminDb.collection('rooms').doc(roomId).collection('automod').doc(`_rl_c_${callerUid}`);
  const roomRlRef     = adminDb.collection('rooms').doc(roomId).collection('automod').doc('_rl_room');
  const dedupRef      = adminDb.collection('rooms').doc(roomId).collection('automod').doc(`_lk_${violatorUid}_${action}`);
  const burstRef       = adminDb.collection('rooms').doc(roomId).collection('automod').doc(`_lkb_${violatorUid}`);
  let alreadyPosted = false;
  let rateLimited = false;
  let rateLimitReason = '';
  try {
    await adminDb.runTransaction(async (t) => {
      const [callerRlSnap, roomRlSnap, dedupSnap, burstSnap] = await Promise.all([t.get(callerRlRef), t.get(roomRlRef), t.get(dedupRef), t.get(burstRef)]);
      // Dedup (same violator + same action within TTL_MS)
      // NOTE: `.exists` is a boolean getter on Admin SDK DocumentSnapshot,
      // not a method — calling it as `.exists()` throws "not a function"
      // and was silently forcing every transaction here into the catch
      // block (500 response), breaking AutoMod notices in dev entirely.
      if (dedupSnap.exists) {
        const { expiresAt } = dedupSnap.data();
        if (typeof expiresAt === 'number' && expiresAt > now2) { alreadyPosted = true; return; }
      }
      // Burst (ANY notice about this violator within BURST_MS) — collapses a
      // fast multi-violation burst into a single visible notice.
      if (burstSnap.exists) {
        const { expiresAt } = burstSnap.data();
        if (typeof expiresAt === 'number' && expiresAt > now2) { alreadyPosted = true; return; }
      }
      // Per-caller rate limit
      const crl = callerRlSnap.exists ? callerRlSnap.data() : { count: 0, windowStart: now2 };
      if (now2 - crl.windowStart > RL_WINDOW_MS) { crl.count = 0; crl.windowStart = now2; }
      if (crl.count >= RL_CALLER_MAX) { rateLimited = true; rateLimitReason = 'caller_rate_limit'; return; }
      // Per-room rate limit
      const rrl = roomRlSnap.exists ? roomRlSnap.data() : { count: 0, windowStart: now2 };
      if (now2 - rrl.windowStart > RL_WINDOW_MS) { rrl.count = 0; rrl.windowStart = now2; }
      if (rrl.count >= RL_ROOM_MAX) { rateLimited = true; rateLimitReason = 'room_rate_limit'; return; }
      // Claim
      t.set(callerRlRef, { count: crl.count + 1, windowStart: crl.windowStart });
      t.set(roomRlRef,   { count: rrl.count + 1, windowStart: rrl.windowStart });
      t.set(dedupRef, { expiresAt: now2 + TTL_MS, postedAt: admin.firestore.FieldValue.serverTimestamp(), callerUid, violatorUid, action, violationType });
      t.set(burstRef, { expiresAt: now2 + BURST_MS, postedAt: admin.firestore.FieldValue.serverTimestamp(), callerUid, violatorUid, action });
    });
  } catch (e) {
    console.error('[post-automod-notice] Transaction error:', e.message);
    return res.status(500).json({ error: 'Rate-limit/dedup transaction failed' });
  }
  if (alreadyPosted) return res.json({ ok: true, skipped: true, reason: 'duplicate' });
  if (rateLimited) return res.status(429).json({ error: `Rate limit exceeded (${rateLimitReason})` });

  // 6 — Write TingleBot message
  try {
    const msgRef = await adminDb.collection('rooms').doc(roomId).collection('messages').add({
      text: noticeText, uid: 'tinglebot_system_official_2024', displayName: 'TingleBot',
      isBot: true, systemBot: true, tinglebotType,
      // Only the violator should ever see this notice — the client filters
      // any automod/muted/kicked notice whose targetUid isn't its own uid.
      targetUid: violatorUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      noReply: true, noReaction: true, noReport: true, noUnread: true,
    });
    console.log(`[post-automod-notice] ✓ Notice posted: ${msgRef.id} (room:${roomId} action:${action})`);
    return res.json({ ok: true, id: msgRef.id });
  } catch (e) {
    console.error('[post-automod-notice] Firestore write error:', e.message);
    return res.status(500).json({ error: 'Firestore write failed' });
  }
});

// ── GET /api/health ────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, service: 'TingleTap Email Center API', port: PORT }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[EmailCenter] API server running on port ${PORT}`);
  if (!BREVO_API_KEY) console.warn('[EmailCenter] ⚠ BREVO_API_KEY not set — emails will fail');
});
