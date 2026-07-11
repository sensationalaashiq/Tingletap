const APP_NAME = process.env.BREVO_SENDER_NAME || 'App';
// Full diagnostic — tests every step individually and returns exact errors.
// Usage:
//   GET  /.netlify/functions/check-config
//       → env vars + R2 buckets + Brevo ping + Firebase Admin
//   GET  /.netlify/functions/check-config?testEmail=you@gmail.com
//       → above + real Brevo send attempt
//   GET  /.netlify/functions/check-config?testEmail=you@gmail.com&firestoreTest=1
//       → above + Firestore write test

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const qs = event.queryStringParameters || {};
  const testEmail     = qs.testEmail     || null;
  const firestoreTest = qs.firestoreTest === '1';

  const results = {};
  const errors  = [];

  // ── 1. Env vars ──────────────────────────────────────────────────────────────
  const brevoKey = process.env.BREVO_API_KEY;

  // R2 env var detection (all variants)
  const r2PublicBucket  = process.env.R2_PUBLIC_BUCKET  || process.env.R2_Public_Bucket  || process.env.R2_PUBLIC_BUCKET_NAME  || null;
  const r2PrivateBucket = process.env.R2_PRIVATE_BUCKET || process.env.R2_Private_Bucket || process.env.R2_PRIVATE_BUCKET_NAME || null;
  const r2AccountId     = process.env.R2_ACCOUNT_ID     || null;
  const r2AccessKey     = process.env.R2_ACCESS_KEY_ID  || null;
  const r2SecretKey     = process.env.R2_SECRET_ACCESS_KEY || null;
  const r2PublicUrl     = process.env.R2_PUBLIC_BUCKET_URL || null;

  results.r2_env = {
    R2_ACCOUNT_ID:        r2AccountId     ? 'SET ✅'                          : 'MISSING ❌',
    R2_ACCESS_KEY_ID:     r2AccessKey     ? 'SET ✅'                          : 'MISSING ❌',
    R2_SECRET_ACCESS_KEY: r2SecretKey     ? 'SET ✅'                          : 'MISSING ❌',
    R2_PUBLIC_BUCKET:     r2PublicBucket  ? `SET ✅ → "${r2PublicBucket}"`    : 'MISSING ❌  (set R2_PUBLIC_BUCKET in Netlify)',
    R2_PRIVATE_BUCKET:    r2PrivateBucket ? `SET ✅ → "${r2PrivateBucket}"`   : 'MISSING ❌  (set R2_PRIVATE_BUCKET in Netlify)',
    R2_PUBLIC_BUCKET_URL: r2PublicUrl     ? `SET ✅ → "${r2PublicUrl}"`       : 'MISSING ❌  (profile/cover/chat images will proxy through serveMedia instead)',
  };

  // ── 2. R2 connectivity test (PutObject + DeleteObject — HeadBucket is unreliable on R2) ──
  if (r2AccountId && r2AccessKey && r2SecretKey) {
    try {
      const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const endpoint = process.env.R2_ENDPOINT || `https://${r2AccountId}.r2.cloudflarestorage.com`;
      const s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId: r2AccessKey, secretAccessKey: r2SecretKey },
        forcePathStyle: true,
      });

      const testKey = `_diag_test_${Date.now()}.txt`;
      const testBody = Buffer.from('tingletap-diag-ok');
      const bucketTests = {};

      async function testBucket(label, bucket) {
        if (!bucket) {
          return `SKIPPED — not configured ❌`;
        }
        try {
          await s3.send(new PutObjectCommand({
            Bucket: bucket, Key: testKey, Body: testBody, ContentType: 'text/plain',
          }));
          // Clean up test file
          await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey })).catch(() => {});
          return `WRITE OK ✅`;
        } catch (e) {
          const msg = e?.message || String(e);
          errors.push(`R2 ${label} bucket "${bucket}" write failed: ${msg}`);
          return `WRITE FAILED ❌: ${msg}`;
        }
      }

      bucketTests[`public_bucket (${r2PublicBucket || 'NOT SET'})`]  = await testBucket('public',  r2PublicBucket);
      bucketTests[`private_bucket (${r2PrivateBucket || 'NOT SET'})`] = await testBucket('private', r2PrivateBucket);
      if (r2LegacyBucket) {
        bucketTests[`legacy_bucket (${r2LegacyBucket})`] = await testBucket('legacy', r2LegacyBucket);
      }

      results.r2_buckets = bucketTests;
    } catch (e) {
      results.r2_buckets = `S3 client init failed: ${e.message}`;
      errors.push(`R2 S3 client init: ${e.message}`);
    }
  } else {
    results.r2_buckets = 'SKIPPED — R2 credentials incomplete ❌';
    errors.push('R2 credentials missing (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)');
  }

  results.env = {
    BREVO_API_KEY:          brevoKey                             ? 'SET'                                            : 'MISSING ❌',
    FIREBASE_PROJECT_ID:    process.env.FIREBASE_PROJECT_ID     ? 'SET'                                            : 'MISSING ❌',
    FIREBASE_CLIENT_EMAIL:  process.env.FIREBASE_CLIENT_EMAIL   ? 'SET'                                            : 'MISSING ❌',
    FIREBASE_PRIVATE_KEY:   process.env.FIREBASE_PRIVATE_KEY    ? `SET (length: ${process.env.FIREBASE_PRIVATE_KEY.length})` : 'MISSING ❌',
  };
  if (!brevoKey) errors.push('BREVO_API_KEY missing');

  // ── 2. Brevo account ping ─────────────────────────────────────────────────────
  if (brevoKey) {
    try {
      const r = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': brevoKey, accept: 'application/json' },
      });
      if (r.ok) {
        const d = await r.json();
        results.brevo_account = {
          status: 'Connected',
          plan:    d.plan?.[0]?.type    || 'unknown',
          credits: d.plan?.[0]?.credits ?? '?',
          email:   d.email             || '?',
        };
      } else {
        const e = await r.json().catch(() => ({}));
        results.brevo_account = { status: `API error ${r.status}`, detail: e };
        errors.push(`Brevo account ping failed: ${r.status} — ${e.message || JSON.stringify(e)}`);
      }
    } catch (e) {
      results.brevo_account = { status: 'Network error', detail: e.message };
      errors.push(`Brevo ping network error: ${e.message}`);
    }

    // ── 3. Verified senders list ────────────────────────────────────────────────
    try {
      const r = await fetch('https://api.brevo.com/v3/senders', {
        headers: { 'api-key': brevoKey, accept: 'application/json' },
      });
      if (r.ok) {
        const d = await r.json();
        results.verified_senders = (d.senders || []).map(s => ({
          email:  s.email,
          name:   s.fromName,
          active: s.active,
        }));
        const activeEmails = results.verified_senders.filter(s => s.active).map(s => s.email);
        const senderEmail = process.env.BREVO_SENDER_EMAIL || '';
        if (senderEmail && !activeEmails.includes(senderEmail)) {
          errors.push(`${senderEmail} is NOT in active senders — emails will be rejected by Brevo`);
        }
      } else {
        const e = await r.json().catch(() => ({}));
        results.verified_senders = `Error: ${r.status}`;
        errors.push(`Could not fetch senders: ${e.message || r.status}`);
      }
    } catch (e) {
      results.verified_senders = `Network error: ${e.message}`;
    }

    // ── 4. Domain list ───────────────────────────────────────────────────────────
    try {
      const r = await fetch('https://api.brevo.com/v3/senders/domains', {
        headers: { 'api-key': brevoKey, accept: 'application/json' },
      });
      if (r.ok) {
        const d = await r.json();
        results.authenticated_domains = (d.domains || []).map(dm => ({
          domain:        dm.domain_name,
          authenticated: dm.authenticated,
          dkim_record:   dm.dkim_record || null,
          spf_record:    dm.spf_record  || null,
        }));
      } else {
        results.authenticated_domains = `Error: ${r.status}`;
      }
    } catch (e) {
      results.authenticated_domains = `Network error: ${e.message}`;
    }
  }

  // ── 5. Firebase Admin init ────────────────────────────────────────────────────
  let adminOk = false;
  try {
    const { initFirebaseAdmin } = await import('./shared/firebaseAdmin.js');
    initFirebaseAdmin();
    results.firebase_admin = 'Initialized OK';
    adminOk = true;
  } catch (e) {
    results.firebase_admin = `FAILED: ${e.message}`;
    errors.push(`Firebase Admin init: ${e.message}`);
  }

  // ── 6. Template loading ───────────────────────────────────────────────────────
  try {
    const { loadTemplate, clearCache } = await import('./shared/templateLoader.js');
    clearCache();
    const templates = ['OneTimePassword.html', 'PasswordReset.html', 'EmailVerification.html'];
    results.templates = {};
    for (const t of templates) {
      try {
        const html = await loadTemplate(t);
        results.templates[t] = `OK (${html.length} chars)`;
      } catch (e) {
        results.templates[t] = `FAILED: ${e.message}`;
        errors.push(`Template ${t}: ${e.message}`);
      }
    }
  } catch (e) {
    results.templates = `Import error: ${e.message}`;
    errors.push(`templateLoader import: ${e.message}`);
  }

  // ── 7. Firestore write test (optional) ────────────────────────────────────────
  if (firestoreTest && adminOk) {
    try {
      const adminMod = await import('./shared/firebaseAdmin.js');
      const admin    = adminMod.default;
      const db       = admin.firestore();
      const ref      = db.collection('_diagnostics').doc('email_test');
      await ref.set({ testedAt: new Date().toISOString(), ok: true });
      results.firestore_write = 'OK — wrote to _diagnostics/email_test';
    } catch (e) {
      results.firestore_write = `FAILED: ${e.message}`;
      errors.push(`Firestore write: ${e.message}`);
    }
  }

  // ── 8. Real test email send (optional) ───────────────────────────────────────
  if (testEmail && brevoKey) {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail);
    if (!emailValid) {
      results.test_email = 'Invalid testEmail address';
    } else {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method:  'POST',
          headers: { 'api-key': brevoKey, 'content-type': 'application/json' },
          body: JSON.stringify({
            sender:      { name: process.env.BREVO_SENDER_NAME || '', email: process.env.BREVO_SENDER_EMAIL || '' },
            to:          [{ email: testEmail }],
            subject:     '[${APP_NAME}] Email Config Test',
            htmlContent: `<h2 style="color:#7c3aed">${APP_NAME} Email Working!</h2><p>If you see this, Brevo + ${process.env.BREVO_SENDER_EMAIL || 'sender'} is configured correctly.</p>`,
            textContent: `${APP_NAME} Email Working! Brevo + ${process.env.BREVO_SENDER_EMAIL || 'sender'} is configured correctly.`,
          }),
        });
        if (res.ok) {
          const d = await res.json();
          results.test_email = { status: 'SENT OK', messageId: d.messageId || 'n/a', to: testEmail };
        } else {
          const e = await res.json().catch(() => ({}));
          results.test_email = {
            status:     'FAILED',
            httpStatus: res.status,
            brevoCode:  e.code,
            brevoMsg:   e.message,
            fullError:  e,
          };
          errors.push(`Test email FAILED (${res.status}): code=${e.code} msg=${e.message}`);
        }
      } catch (e) {
        results.test_email = { status: 'Network error', detail: e.message };
        errors.push(`Test email network: ${e.message}`);
      }
    }
  } else if (testEmail && !brevoKey) {
    results.test_email = 'Skipped — BREVO_API_KEY missing';
  } else {
    results.test_email = 'Not requested — add ?testEmail=you@gmail.com to URL to send a test';
  }

  return {
    statusCode: errors.length === 0 ? 200 : 500,
    headers,
    body: JSON.stringify({ status: errors.length === 0 ? 'ALL OK' : 'ISSUES FOUND', errors, results }, null, 2),
  };
};
