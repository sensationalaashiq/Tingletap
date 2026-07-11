// Brevo transactional email service for Netlify Functions
// Env var: BREVO_API_KEY
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const DEFAULT_SENDER = () => ({
  name:  process.env.BREVO_SENDER_NAME  || 'App',
  email: process.env.BREVO_SENDER_EMAIL || '',
});

/**
 * Send a transactional email via Brevo REST API.
 * @param {object} opts
 * @param {Array<{email:string,name?:string}>} opts.to
 * @param {string}  opts.subject
 * @param {string}  opts.htmlContent
 * @param {string}  opts.textContent
 * @param {object}  [opts.sender]        - overrides DEFAULT_SENDER
 * @param {object}  [opts.replyTo]
 * @param {Array}   [opts.tags]
 */
export async function sendEmailWithTemplate({ to, subject, htmlContent, textContent, sender, replyTo, tags = [] }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('[emailService] BREVO_API_KEY not set');

  const payload = {
    sender:      sender  || DEFAULT_SENDER(),
    to,
    subject,
    htmlContent,
    textContent,
    tags: ['tingletap-transactional', ...tags],
  };
  if (replyTo) payload.replyTo = replyTo;

  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Brevo API error ${res.status}: ${err.message || JSON.stringify(err)}`);
  }

  return res.json();
}
