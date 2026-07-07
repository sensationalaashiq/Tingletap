// Netlify Function: email-action
// Owner reply/forward handler — verifies owner auth, sends via Brevo, writes to Firestore.
// POST body: { action:'reply'|'forward', emailId, body, recipientEmail?, recipientName?, subject? }
import { initFirebaseAdmin } from './shared/firebaseAdmin.js';
import admin from 'firebase-admin';
import { sendEmailWithTemplate } from './shared/emailService.js';
import { rateLimitCheck, sanitizeString, validateEmail } from './shared/validation.js';
import { log } from './shared/logger.js';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'tingletapofraj';

const OWNER_MAP = {
  'VyomAI': { email: 'support@tingletap.com', name: 'VyomAI — TingleTap' },
  'Blurry':  { email: 'admin@tingletap.com',   name: 'Blurry — TingleTap'  },
};
const DEFAULT_SENDER_EMAIL = process.env.OWNER_DEFAULT_EMAIL || 'admin@tingletap.com';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function decodeJwt(token) {
  try {
    const b64 = token.split('.')[1];
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  } catch { return null; }
}

async function verifyOwner(token) {
  const p = decodeJwt(token);
  if (!p) return { ok: false, err: 'Invalid token' };
  const uid = p.user_id || p.sub;
  if (!uid) return { ok: false, err: 'Token missing UID' };
  if (p.exp && Date.now() / 1000 > p.exp) return { ok: false, err: 'Token expired' };

  try {
    initFirebaseAdmin();
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

function buildReplyHtml({ subject, replyBody, originalFrom, originalDate, originalBody, senderName, senderEmail }) {
  const escapedReply = String(replyBody || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  const escapedOriginal = String(originalBody || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:620px;margin:40px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 48px rgba(124,58,237,.1);">
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#6366f1 100%);padding:32px 36px 26px;">
    <div style="color:rgba(255,255,255,.75);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">TingleTap™ · Official Reply</div>
    <div style="color:#fff;font-size:20px;font-weight:800;">${esc(subject)}</div>
  </div>
  <div style="padding:32px 36px 28px;">
    <div style="background:#fafafa;border-left:3px solid #a855f7;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:24px;color:#374151;font-size:15px;line-height:1.85;">${escapedReply}</div>
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f3f4f6;">
      <p style="margin:0 0 3px;color:#9ca3af;font-size:12px;">Regards,</p>
      <p style="margin:0 0 2px;color:#1e1b4b;font-size:15px;font-weight:700;">${esc(senderName)}</p>
      <p style="margin:0 0 2px;color:#7c3aed;font-size:12px;font-weight:600;">Owner · Godfather · TingleTap™</p>
      <a href="mailto:${esc(senderEmail)}" style="color:#a855f7;font-size:12px;">${esc(senderEmail)}</a>
    </div>
    ${originalBody ? `<div style="margin-top:22px;padding:14px 16px;background:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;">
      <p style="margin:0 0 6px;color:#9ca3af;font-size:11px;">On ${esc(originalDate)}, ${esc(originalFrom)} wrote:</p>
      <div style="color:#6b7280;font-size:13px;line-height:1.7;">${escapedOriginal}</div>
    </div>` : ''}
  </div>
  <div style="background:#fafafa;border-top:1px solid #f3f4f6;padding:14px 36px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">© 2026 TingleTap™ · India's Premium Chat Community</p>
  </div>
</div>
</body></html>`;
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
    name: `${v.displayName} — TingleTap`,
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

    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const html = buildReplyHtml({
      subject,
      replyBody,
      originalFrom: parent?.from?.email || '',
      originalDate: parent?.createdAt ? new Date(parent.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '',
      originalBody: action === 'forward' ? parent?.body : '',
      senderName:   v.displayName,
      senderEmail:  sender.email,
    });

    const brevoResult = await sendEmailWithTemplate({
      sender:      { name: sender.name, email: sender.email },
      to:          [{ email: toEmail, name: toName }],
      replyTo:     { email: sender.email, name: sender.name },
      subject,
      htmlContent: html,
      textContent: `${replyBody}\n\n---\n${v.displayName} · Owner · TingleTap™\n${sender.email}`,
      tags:        ['owner-email-center', action],
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

    log.info(`Owner email ${action} sent`, {
      sender: sender.email,
      to: toEmail.replace(/(.{2}).+(@.+)/, '$1***$2'),
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, messageId: brevoResult?.messageId }) };
  } catch (err) {
    log.error(`email-action ${action} failed`, { message: err.message });
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Email action failed', detail: err.message }) };
  }
};
