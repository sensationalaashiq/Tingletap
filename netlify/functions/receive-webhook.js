// Netlify Function: receive-webhook
// Handles Brevo inbound email webhook (JSON format).
// Configure in Brevo Dashboard → Inbound parsing → Webhook URL → enable JSON format.
// Incoming emails to support@tingletap.com → VyomAI inbox
// Incoming emails to admin@tingletap.com   → Blurry inbox
// Requires MX records pointing to Brevo's inbound servers.
import crypto from 'node:crypto';
import { initFirebaseAdmin } from './shared/firebaseAdmin.js';
import admin from 'firebase-admin';
import { rateLimitCheck, sanitizeString } from './shared/validation.js';
import { log } from './shared/logger.js';

const WEBHOOK_SECRET = process.env.BREVO_WEBHOOK_SECRET || '';
const APP_NAME = process.env.BREVO_SENDER_NAME || 'App';

// Constant-time exact-match comparison. `sig.includes(WEBHOOK_SECRET)` (the old
// check) accepted any header that merely *contained* the secret as a substring —
// e.g. "garbage-<secret>-garbage" would pass — and used a non-constant-time
// comparison susceptible to timing side-channels. This requires an exact match
// using crypto.timingSafeEqual.
function safeSecretMatch(candidate) {
  const a = Buffer.from(String(candidate || ''), 'utf8');
  const b = Buffer.from(WEBHOOK_SECRET, 'utf8');
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const TO_INBOX_MAP = {
  'support@tingletap.com': { ownerInbox: 'VyomAI', name: `VyomAI — ${APP_NAME}` },
  'admin@tingletap.com':   { ownerInbox: 'Blurry',  name: `Blurry — ${APP_NAME}` },
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  // Optional webhook secret validation — exact, constant-time match only.
  // Accepts the secret via header (custom header set in Brevo's webhook config)
  // or as a `?token=`/`?secret=` query param, since Brevo's inbound parsing
  // webhook does not support HMAC request signing — a shared secret compared
  // safely is the correct mechanism here, not a fabricated HMAC scheme.
  if (WEBHOOK_SECRET) {
    const headerSig = event.headers['x-brevo-signature'] || event.headers['x-sib-signature'] || event.headers['x-webhook-secret'] || '';
    const queryToken = event.queryStringParameters?.token || event.queryStringParameters?.secret || '';
    if (!safeSecretMatch(headerSig) && !safeSecretMatch(queryToken)) {
      log.warn('Webhook signature mismatch');
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Invalid signature' }) };
    }
  }

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimitCheck(`webhook:${ip}`, 200, 60 * 1000);
  if (!rl.ok) return { statusCode: 429, headers, body: JSON.stringify({ error: 'Rate limited' }) };

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const from = payload.From || payload.from || {};
  const toList = Array.isArray(payload.To) ? payload.To : (payload.to ? [payload.to] : []);
  const subject = sanitizeString(payload.Subject || payload.subject || '(No Subject)', 500);
  const htmlBody = sanitizeString(payload.RawHtmlBody || payload.html || '', 100000);
  const textBody = sanitizeString(payload.RawTextBody || payload.plain || payload.text || '', 50000);
  const messageId = sanitizeString(payload.MessageId || '', 500);
  const inReplyTo = sanitizeString(payload.InReplyTo || '', 500);

  const fromEmail = from.Address || from.email || '';
  const fromName  = from.Name    || from.name  || fromEmail;

  let targetInbox = null;
  for (const toItem of toList) {
    const toAddr = (toItem.Address || toItem.email || '').toLowerCase().trim();
    if (TO_INBOX_MAP[toAddr]) {
      targetInbox = TO_INBOX_MAP[toAddr];
      break;
    }
  }

  if (!targetInbox) {
    log.warn('Webhook: no matching inbox for recipient', { toList });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: 'no matching inbox' }) };
  }

  if (!fromEmail) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: 'no sender' }) };
  }

  const emailId = `wh_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;

  try {
    initFirebaseAdmin();
    const db = admin.firestore();

    let parentThread = null;
    if (inReplyTo) {
      const parentSnap = await db.collection('ownerEmails')
        .where('messageId', '==', inReplyTo)
        .limit(1).get();
      if (!parentSnap.empty) {
        parentThread = parentSnap.docs[0].data().threadId;
      }
    }

    const attachments = Array.isArray(payload.Attachments) ? payload.Attachments.map(a => ({
      name: a.Name || a.name || 'attachment',
      contentType: a.ContentType || a.contentType || 'application/octet-stream',
      size: a.ContentLength || a.size || 0,
    })) : [];

    await db.collection('ownerEmails').doc(emailId).set({
      threadId:     parentThread || emailId,
      ownerInbox:   targetInbox.ownerInbox,
      folder:       'inbox',
      from:         { name: fromName, email: fromEmail },
      to:           toList.map(t => ({ name: t.Name || t.name || '', email: t.Address || t.email || '' })),
      replyTo:      { email: fromEmail, name: fromName },
      subject,
      body:         textBody || htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      htmlBody:     htmlBody || textBody.replace(/\n/g,'<br>'),
      read:         false,
      starred:      false,
      replied:      false,
      forwarded:    false,
      source:       'incoming_email',
      parentEmailId: null,
      createdAt:    admin.firestore.FieldValue.serverTimestamp(),
      labels:       [],
      messageId,
      attachments,
      hasAttachments: attachments.length > 0,
    });

    log.info('Webhook email stored', {
      id: emailId,
      inbox: targetInbox.ownerInbox,
      from: fromEmail.replace(/(.{2}).+(@.+)/, '$1***$2'),
    });
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id: emailId }) };
  } catch (err) {
    log.error('Webhook Firestore write failed', { message: err.message });
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Storage failed' }) };
  }
};
