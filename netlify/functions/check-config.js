// Diagnostic endpoint — checks env vars, pings Brevo, and sends a real test email.
// GET  /.netlify/functions/check-config          → env + ping check only
// POST /.netlify/functions/check-config          → body: { testEmail: "you@example.com" } → sends a real test email

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const checks = {};
  const issues = [];

  // 1. Env vars
  const brevoKey = process.env.BREVO_API_KEY;
  checks.BREVO_API_KEY           = brevoKey                              ? 'SET' : 'MISSING';
  checks.FIREBASE_PROJECT_ID     = process.env.FIREBASE_PROJECT_ID      ? 'SET' : 'MISSING';
  checks.FIREBASE_CLIENT_EMAIL   = process.env.FIREBASE_CLIENT_EMAIL    ? 'SET' : 'MISSING';
  checks.FIREBASE_PRIVATE_KEY    = process.env.FIREBASE_PRIVATE_KEY
    ? `SET (length: ${process.env.FIREBASE_PRIVATE_KEY.length})`
    : 'MISSING';

  if (!brevoKey)                           issues.push('BREVO_API_KEY missing');
  if (!process.env.FIREBASE_PROJECT_ID)    issues.push('FIREBASE_PROJECT_ID missing');
  if (!process.env.FIREBASE_CLIENT_EMAIL)  issues.push('FIREBASE_CLIENT_EMAIL missing');
  if (!process.env.FIREBASE_PRIVATE_KEY)   issues.push('FIREBASE_PRIVATE_KEY missing');

  // 2. Brevo account ping
  if (brevoKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': brevoKey, 'accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        checks.BREVO_PING          = `Connected — plan: ${data.plan?.[0]?.type || 'unknown'}, credits: ${data.plan?.[0]?.credits ?? '?'}`;
        checks.BREVO_ACCOUNT_EMAIL = data.email || '?';

        // List verified senders
        const sRes = await fetch('https://api.brevo.com/v3/senders', {
          headers: { 'api-key': brevoKey, 'accept': 'application/json' },
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          const verified = (sData.senders || []).filter(s => s.active).map(s => s.email);
          checks.VERIFIED_SENDERS = verified.length ? verified.join(', ') : 'NONE — this is why emails fail!';
          if (!verified.includes('alerts@tingletap.com')) {
            issues.push('alerts@tingletap.com is NOT a verified sender in Brevo — go to Brevo → Senders and add+verify it');
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        checks.BREVO_PING = `API error ${res.status}: ${err.message || JSON.stringify(err)}`;
        issues.push(`Brevo API error: ${res.status}`);
      }
    } catch (e) {
      checks.BREVO_PING = `Network error: ${e.message}`;
      issues.push(`Brevo network error: ${e.message}`);
    }
  } else {
    checks.BREVO_PING = 'Skipped (no API key)';
  }

  // 3. Firebase Admin init
  try {
    const { initFirebaseAdmin } = await import('./shared/firebaseAdmin.js');
    initFirebaseAdmin();
    checks.FIREBASE_ADMIN_INIT = 'OK';
  } catch (e) {
    checks.FIREBASE_ADMIN_INIT = `FAILED: ${e.message}`;
    issues.push(`Firebase Admin: ${e.message}`);
  }

  // 4. Optional: send a real test email (POST with { testEmail: "..." })
  if (event.httpMethod === 'POST' && brevoKey) {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}
    const testEmail = body.testEmail;

    if (testEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': brevoKey, 'content-type': 'application/json' },
          body: JSON.stringify({
            sender:      { name: 'TingleTap', email: 'alerts@tingletap.com' },
            to:          [{ email: testEmail }],
            subject:     'TingleTap — Email Config Test',
            htmlContent: '<p>If you see this, Brevo + alerts@tingletap.com sender is working correctly!</p>',
            textContent: 'If you see this, Brevo + alerts@tingletap.com sender is working correctly!',
          }),
        });
        if (res.ok) {
          checks.TEST_EMAIL_SEND = `SUCCESS — sent to ${testEmail}`;
        } else {
          const err = await res.json().catch(() => ({}));
          checks.TEST_EMAIL_SEND = `FAILED: ${err.message || JSON.stringify(err)}`;
          issues.push(`Test email failed: ${err.message || JSON.stringify(err)}`);
        }
      } catch (e) {
        checks.TEST_EMAIL_SEND = `FAILED (network): ${e.message}`;
        issues.push(`Test email network error: ${e.message}`);
      }
    } else if (testEmail) {
      checks.TEST_EMAIL_SEND = 'Invalid testEmail address provided';
    } else {
      checks.TEST_EMAIL_SEND = 'No testEmail in POST body — skipped';
    }
  }

  return {
    statusCode: issues.length === 0 ? 200 : 500,
    headers,
    body: JSON.stringify({
      status: issues.length === 0 ? 'ALL OK' : 'ISSUES FOUND',
      issues,
      checks,
    }, null, 2),
  };
};
