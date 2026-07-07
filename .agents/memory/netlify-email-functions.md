---
name: Netlify Email Functions
description: Email function architecture, known bugs, and fix patterns for TingleTap's Netlify Functions email system.
---

# Netlify Email Functions

## Architecture
- `sendOTP.js` — standalone, inline HTML, no Firebase, just Brevo. Called at signup for OTP delivery.
- `sendPasswordReset.js` — Firebase Admin to generate reset link, inline HTML, Brevo send. Has REST fallback.
- `sendVerification.js` — Firebase Admin to generate verify link, inline HTML, Brevo send. Has REST fallback; requires `idToken` from client for REST path.
- `contact.js` — writes to Firestore `ownerEmails` collection (Admin SDK), then Brevo email to owner. Firestore write is now non-fatal (continues to Brevo even if write fails).
- `email-test.js` — pure Brevo smoke test, no Firebase.
- `check-config.js` — full diagnostic. Visit `/.netlify/functions/check-config` to verify all infra.
- `send-email.js`, `email-action.js` — Owner Email Center compose/reply, use Firestore REST API (not Admin SDK).

## Shared modules
- `shared/emailService.js` — `sendEmailWithTemplate()` — just a Brevo REST wrapper, does NOT load templates; takes `htmlContent` directly.
- `shared/templateLoader.js` — only used by `check-config.js` for diagnostic template tests. NOT used by actual email functions.
- `shared/firebaseAdmin.js` — singleton Admin init, exported as `initFirebaseAdmin()` + default `admin`.

## Known bug (fixed)
`templateLoader.js` used `fileURLToPath(import.meta.url)` inside an array literal. When esbuild bundles the function, `import.meta.url` is `undefined`, which threw before `process.cwd()` path was ever tried. Fixed by wrapping in `try/catch` and evaluating lazily.

**Why:** Array literals in JS evaluate all elements eagerly. A throw in one element prevents all subsequent elements from being built.

**How to apply:** Any Netlify Function shared module that uses `import.meta.url` must guard it: `try { if (typeof import.meta.url === 'string') { ... } } catch {}`

## REST fallback pattern (sendPasswordReset / sendVerification)
When Firebase Admin fails, both functions fall back to Firebase Auth REST API using `FIREBASE_WEB_API_KEY` (or hardcoded public key as default). 
- PASSWORD_RESET → `{ requestType: 'PASSWORD_RESET', email }`
- VERIFY_EMAIL → `{ requestType: 'VERIFY_EMAIL', idToken }` — idToken is REQUIRED; client must pass it.
- `SignupPage.jsx` now calls `user.getIdToken()` and passes result to sendVerification before navigating.

## Confirmed working (via check-config diagnostic)
- BREVO_API_KEY: SET, account connected, plan: free, 296 credits
- Firebase Admin: Initialized OK
- Verified senders: alerts@, support@, admin@tingletap.com — all active
- Domain tingletap.com: authenticated

## Debugging
Run `https://tingletap.com/.netlify/functions/check-config` on deployed site.
Add `?testEmail=you@email.com` to also send a real test email.
Add `&firestoreTest=1` to also test Firestore write.
