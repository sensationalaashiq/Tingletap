---
name: Badge Verification System
description: Female badge verification flow architecture, known pitfalls, CSS rules, and Netlify function fixes.
---

## Flow
- Female: STEPS_FEMALE = ['declaration', 'liveness', 'video', 'audio'] — no separate 'upload' step; auto-submits via useEffect when step === steps.length
- Male: STEPS_MALE = ['declaration', 'upload'] — manual submit button on 'upload' step

## CSS — critical !important rules
- ALL solid-colour `.bv-btn` variants (--primary, --danger, --green) MUST use `!important` on `background` and `color`.
- Without `!important`, SettingsSidebar theme CSS overrides them to near-white ("whitewashed"), making text/icons invisible.
- `.bv-btn--secondary` does NOT need !important (dark text on light bg is fine without it).
- `.bv-hero-card` and `.bv-declaration-header` text also need `!important` + `text-shadow` for white-on-gradient visibility.

## Disabled button styling
- Global `opacity: 0.5` on `:disabled` washes out solid-colour buttons (white text on faded gradient ≈ invisible).
- Fix: Only apply `opacity: 0.5` to `--secondary:disabled`; use `opacity: 1; filter: saturate(0.85)` for --primary/--danger/--green:disabled.

## Netlify function: submitBadgeApplication
- `verifyToken()` in `firestoreAdmin.js` previously fetched `users/{uid}?fields=role,...` — the `?fields=` query param is NOT valid Firestore REST v1; Firestore returns 400 for it. **Fix: fetch full document (no query params) and extract fields from response.**
- The 400 response is caught and returned as `{ ok: false, err: 'Firestore error 400' }`, which then surfaces in the UI — this is how "Firestore error 400" appears after audio submission.
- `writeApplication` originally used the user's Firebase ID token for the REST PATCH. Firestore security rules (catch-all: owner/admin only) block this. **Fix: use `getAdminDb()` (Firebase Admin SDK) which bypasses rules. REST-with-user-token is now a fallback only when Admin credentials are absent.**

## Client-side: getMyApplication() after submit
- Called after `setPageState('done')` inside the main try/catch. If it fails (rules, network), the catch sets `submitError` and reverts `pageState` to 'apply' — undoing the success screen.
- **Fix: wrap `getMyApplication()` in its own try/catch; failure is non-fatal and does not revert the success state.**

## Stuck panel (female flow)
- After audio step, `step` becomes 4 (=== steps.length), `currentStepName` = '' — no step block renders.
- Added `{!currentStepName && ...}` fallback that shows spinner while waiting for auto-submit, or error + Retry button if submission failed.
- Reentrancy guard: `submitInFlightRef` prevents concurrent submissions from rapid Retry taps.

## MIME / R2
- MIME codec-stripped server-side (video/webm;codecs=... → video/webm) to match R2 presigned URL signature.
- Key ownership enforced: keys must start with `verifications/{uid}/`.

## Composite index
- Index in firestore.indexes.json enables `where(status) + orderBy(submittedAt DESC)`.
- Must be deployed via Firebase console or CI (no Firebase CLI in this Replit env).
