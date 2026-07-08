---
name: Badge Verification System
description: Architecture decisions, critical bugs fixed, and env vars required for the badge verification feature.
---

## Core architecture

- **Firestore key = user UID** (`badgeApplications/{uid}`) — O(1) lookups, overwrite on reapply.
- **Presigned PUT URL flow** — client uploads media directly to Cloudflare R2 (avoids 6 MB Netlify body limit).
- **MediaPipe from CDN** (`@mediapipe/tasks-vision@0.10.14`) — lazy-loaded only for female liveness flow.
- **Gender never classified by AI** — MediaPipe only proves a live person completed challenges.

## Flow steps

- **Female**: `['declaration', 'liveness', 'video', 'audio']` — auto-submits after audio step when `step === steps.length`. Do NOT add an 'upload' step for females; it leaves an unrendered dead-end.
- **Male**: `['declaration', 'upload']` — the 'upload' step renders a confirm-and-submit UI.

## Critical bugs fixed (post code-review)

1. **Female flow dead-end** — removed 'upload' from `STEPS_FEMALE`; auto-submit fires at `step === 4`.
2. **MIME codec param rejection** — `getUploadUrl.js` strips codec qualifiers: `blob.type.split(';')[0].trim()` before allowlist check. MediaRecorder emits `video/webm;codecs=vp8,opus`.
3. **Firestore PATCH full-doc wipeout** — `fsPatch` in `reviewBadgeApplication.js` now builds `?updateMask.fieldPaths=…` query params so only the supplied fields are updated. Without this, patching `users/{uid}` would wipe the entire user profile.
4. **Media key ownership** — `submitBadgeApplication.js` enforces `videoKey/audioKey` must start with `verifications/${user.uid}/` to prevent foreign-key injection.
5. **Camera error swallowed** — `BadgeLivenessChecker.jsx` now calls `onFailed?.(msg)` in the getUserMedia catch block, surfacing `NotAllowedError`/`NotFoundError` to the UI.

## Required Netlify environment variables

```
R2_ACCOUNT_ID          # Cloudflare account ID
R2_ACCESS_KEY_ID       # R2 API token key ID
R2_SECRET_ACCESS_KEY   # R2 API token secret
R2_BUCKET_NAME         # R2 bucket name (e.g. "badge-verifications")
R2_ENDPOINT            # https://<account_id>.r2.cloudflarestorage.com
FIREBASE_PROJECT_ID    # Firebase project ID (e.g. "tingletapofraj")
FIREBASE_CLIENT_EMAIL  # (optional) Service account for scheduled cleanup
FIREBASE_PRIVATE_KEY   # (optional) Service account for scheduled cleanup
VPNAPI_KEY             # (optional) vpnapi.io key for VPN detection on submit
```

**Why:** Without `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` the cleanup job falls back to a no-op (non-fatal). The core review functions use the caller's ID token via Firestore REST — no Admin SDK needed for those paths.

## Firestore rules

`badgeApplications/{uid}`: user create/update own doc; owner/admin full access.

## npm packages added

- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`
- `@netlify/functions` (for `@hourly` scheduled cleanup)
