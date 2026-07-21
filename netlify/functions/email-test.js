const APP_NAME = process.env.BREVO_SENDER_NAME || 'App';
// Standalone email test — zero shared-module dependencies.
// FIX C-03: Now requires owner-role Firebase ID token via Authorization: Bearer <token>
// Just open: <your-domain>/.netlify/functions/email-test?to=you@gmail.com
export const handler = async (event) => {
  const h = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: h, body: '' };

  // ── Auth guard: owner only ────────────────────────────────────────────────
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { statusCode: 401, headers: h, body: JSON.stringify({ error: 'Unauthorized — Bearer token required' }) };
  }
  try {
    const { verifyToken } = await import('./shared/firestoreAdmin.js');
    const auth = await verifyToken(token, ['owner']);
    if (!auth.ok) {
      return { statusCode: 403, headers: h, body: JSON.stringify({ error: 'Forbidden — owner role required', detail: auth.err }) };
    }
  } catch (e) {
    return { statusCode: 500, headers: h, body: JSON.stringify({ error: 'Auth check failed', detail: e.message }) };
  }

  const to = (event.queryStringParameters || {}).to;
  const key = process.env.BREVO_API_KEY;

  if (!key) return { statusCode: 500, headers: h, body: JSON.stringify({ error: 'BREVO_API_KEY not set' }) };
  if (!to)  return { statusCode: 400, headers: h, body: JSON.stringify({ error: 'Add ?to=your@email.com in URL' }) };

  const payload = {
    sender:      { name: process.env.BREVO_SENDER_NAME || '', email: process.env.BREVO_SENDER_EMAIL || '' },
    to:          [{ email: to }],
    subject:     '${APP_NAME} — Direct Email Test',
    htmlContent: `<h2 style="color:#7c3aed">${APP_NAME} Email Test</h2><p>Agar yeh email aayi hai toh Brevo working hai!</p><p>Sent from: ${process.env.BREVO_SENDER_EMAIL || 'configured sender'}</p>`,
    textContent: '${APP_NAME} email test working! Brevo is configured correctly.',
  };

  try {
    const res  = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: { 'api-key': key, 'content-type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return { statusCode: 200, headers: h, body: JSON.stringify({ success: true, messageId: data.messageId, sentTo: to }) };
    }
    return { statusCode: res.status, headers: h, body: JSON.stringify({ success: false, brevoStatus: res.status, brevoCode: data.code, brevoMessage: data.message, fullResponse: data }) };
  } catch (err) {
    return { statusCode: 500, headers: h, body: JSON.stringify({ success: false, networkError: err.message }) };
  }
};
