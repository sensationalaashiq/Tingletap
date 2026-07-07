// Netlify Function: contact
// Contact-form handler — validates, stores inbox item in Firestore, sends Brevo notification.
// POST body: { name, email, subject, message, route: 'support'|'administration' }
import { initFirebaseAdmin } from './shared/firebaseAdmin.js';
import admin from 'firebase-admin';
import { sendEmailWithTemplate } from './shared/emailService.js';
import { rateLimitCheck, validateEmail, sanitizeString } from './shared/validation.js';
import { log } from './shared/logger.js';

const CORS_ORIGIN = 'https://tingletap.com';

const ROUTE_MAP = {
  support:        { ownerInbox: 'VyomAI', toEmail: 'support@tingletap.com', toName: 'VyomAI — TingleTap' },
  administration: { ownerInbox: 'Blurry', toEmail: 'admin@tingletap.com',   toName: 'Blurry — TingleTap'  },
};

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildContactHtml({ name, email, subject, message, route, date }) {
  const tag = route === 'administration' ? 'Administration' : 'Support Team';
  const escapedMsg = String(message || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:620px;margin:40px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 48px rgba(124,58,237,.1);">
  <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 55%,#6366f1 100%);padding:32px 36px 26px;">
    <div style="color:rgba(255,255,255,.75);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px;">TingleTap™ · Contact Form · ${esc(tag)}</div>
    <div style="color:#fff;font-size:20px;font-weight:800;">${esc(subject)}</div>
    <div style="color:rgba(255,255,255,.7);font-size:12px;margin-top:4px;">${esc(date)}</div>
  </div>
  <div style="padding:32px 36px 28px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
      <tr><td style="padding:7px 12px;background:#f5f3ff;border-radius:8px 8px 0 0;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">From</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #f3f4f6;border-top:none;border-radius:0 0 8px 8px;">
        <span style="font-weight:700;color:#1e1b4b;font-size:15px;">${esc(name)}</span>
        <span style="color:#9ca3af;font-size:13px;margin-left:8px;">&lt;${esc(email)}&gt;</span>
      </td></tr>
    </table>
    <div style="background:#fafafa;border-left:3px solid #a855f7;border-radius:0 10px 10px 0;padding:16px 20px;color:#374151;font-size:15px;line-height:1.85;">${escapedMsg}</div>
    <div style="margin-top:20px;padding:14px 16px;background:#fdf4ff;border-radius:10px;border:1px solid #e9d5ff;">
      <p style="margin:0;color:#7c3aed;font-size:12px;font-weight:600;">Reply directly to <a href="mailto:${esc(email)}" style="color:#7c3aed;">${esc(email)}</a></p>
    </div>
  </div>
  <div style="background:#fafafa;border-top:1px solid #f3f4f6;padding:14px 36px;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:11px;">© 2026 TingleTap™ · India's Premium Chat Community</p>
  </div>
</div>
</body></html>`;
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimitCheck(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return { statusCode: 429, headers, body: JSON.stringify({ error: `Too many messages. Try again in ${rl.retryAfter}s.` }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const name    = sanitizeString(body.name,    100);
  const email   = sanitizeString(body.email,   254);
  const subject = sanitizeString(body.subject, 255);
  const message = sanitizeString(body.message, 10000);
  const route   = ['support','administration'].includes(body.route) ? body.route : 'support';

  if (!name || name.length < 2) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name is required (min 2 chars)' }) };
  if (!validateEmail(email))    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email is required' }) };
  if (!subject || subject.length < 3) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Subject is required' }) };
  if (!message || message.length < 10) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message is too short' }) };

  const target = ROUTE_MAP[route];
  const date   = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const html   = buildContactHtml({ name, email, subject, message, route, date });
  const textContent = `Contact Form · ${route === 'administration' ? 'Administration' : 'Support Team'}\n\nFrom: ${name} <${email}>\n\n${message}`;

  const emailId = `${Date.now()}_${Math.random().toString(36).slice(2,9)}`;

  try {
    initFirebaseAdmin();
    const db = admin.firestore();

    const emailDoc = {
      threadId:    emailId,
      ownerInbox:  target.ownerInbox,
      folder:      'inbox',
      from:        { name, email },
      to:          [{ name: target.toName, email: target.toEmail }],
      replyTo:     { email, name },
      subject,
      body:        message,
      htmlBody:    html,
      read:        false,
      starred:     false,
      replied:     false,
      forwarded:   false,
      source:      'contact_form',
      createdAt:   admin.firestore.FieldValue.serverTimestamp(),
      labels:      [],
      parentEmailId: null,
      senderIp:    ip,
    };

    await db.collection('ownerEmails').doc(emailId).set(emailDoc);
    log.info('Contact form stored', { id: emailId, route, from: email.replace(/(.{2}).+(@.+)/, '$1***$2') });
  } catch (err) {
    log.error('Firestore write failed for contact', { message: err.message });
  }

  try {
    await sendEmailWithTemplate({
      sender:      { name: `${name} via TingleTap Contact`, email: 'alerts@tingletap.com' },
      to:          [{ email: target.toEmail, name: target.toName }],
      replyTo:     { email, name },
      subject:     `[Contact · ${route === 'administration' ? 'Admin' : 'Support'}] ${subject}`,
      htmlContent: html,
      textContent,
      tags:        ['contact-form', route],
    });
  } catch (err) {
    log.error('Brevo send failed for contact', { message: err.message });
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, message: 'Message sent successfully. We will respond within 2–4 hours.' }),
  };
};
