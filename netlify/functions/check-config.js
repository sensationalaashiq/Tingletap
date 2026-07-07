// Diagnostic endpoint — checks that all required env vars are present
// and does a lightweight Brevo API ping (no email sent).
// DELETE or restrict this after debugging.
// GET /.netlify/functions/check-config

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const checks = {};

  // 1. Brevo API key
  const brevoKey = process.env.BREVO_API_KEY;
  checks.BREVO_API_KEY = brevoKey ? '✅ SET' : '❌ MISSING';

  // 2. Firebase Admin vars
  checks.FIREBASE_PROJECT_ID   = process.env.FIREBASE_PROJECT_ID   ? '✅ SET' : '❌ MISSING';
  checks.FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL ? '✅ SET' : '❌ MISSING';
  checks.FIREBASE_PRIVATE_KEY  = process.env.FIREBASE_PRIVATE_KEY  ? '✅ SET (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : '❌ MISSING';

  // 3. Brevo live ping (account info — no email sent)
  if (brevoKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': brevoKey, 'accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        checks.BREVO_PING = `✅ Connected — plan: ${data.plan?.[0]?.type || 'unknown'}, credits: ${data.plan?.[0]?.credits ?? '?'}`;
        checks.BREVO_ACCOUNT_EMAIL = data.email || '?';
      } else {
        const err = await res.json().catch(() => ({}));
        checks.BREVO_PING = `❌ API error ${res.status}: ${err.message || JSON.stringify(err)}`;
      }
    } catch (e) {
      checks.BREVO_PING = `❌ Network error: ${e.message}`;
    }
  } else {
    checks.BREVO_PING = '⏭️ Skipped (no API key)';
  }

  // 4. Firebase Admin init test
  try {
    const { initFirebaseAdmin } = await import('./shared/firebaseAdmin.js');
    initFirebaseAdmin();
    checks.FIREBASE_ADMIN_INIT = '✅ Initialized OK';
  } catch (e) {
    checks.FIREBASE_ADMIN_INIT = `❌ ${e.message}`;
  }

  const allOk = Object.values(checks).every(v => v.startsWith('✅'));

  return {
    statusCode: allOk ? 200 : 500,
    headers,
    body: JSON.stringify({ status: allOk ? 'ALL OK' : 'ISSUES FOUND', checks }, null, 2),
  };
};
