// TingleTap Owner Email Center — API Server (port 5001)
// Runs alongside Vite in development. Proxied by Vite at /api/*.
import express from 'express';
import cors    from 'cors';
import admin   from 'firebase-admin';

const app  = express();
const PORT = 5001;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'tingletapofraj';
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

// ── GET /api/health ────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, service: 'TingleTap Email Center API', port: PORT }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[EmailCenter] API server running on port ${PORT}`);
  if (!BREVO_API_KEY) console.warn('[EmailCenter] ⚠ BREVO_API_KEY not set — emails will fail');
});
