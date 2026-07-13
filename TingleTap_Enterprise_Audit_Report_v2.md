# TingleTap — Enterprise-Grade Codebase Audit Report (v2)
**Date:** July 13, 2026 (follow-up to the July 13, 2026 v1 audit, after Phase 1 & Phase 2 fixes were committed)
**Scope:** Full read-only re-audit — authentication, routing, Firestore/RTDB, profile/media, messaging (private/room/homepage), broadcast/RJ live audio, admin/moderation/badge/RJ verification, Netlify Functions/server.js, performance, architecture, dependencies, accessibility.
**Method:** No code was modified. 8 parallel focused source-code reviews re-verified every issue from the v1 report against current code, and searched for newly introduced issues. Line numbers are current as of this audit and will drift as the code changes.

> **What changed since v1:** Two commits landed between v1 and this audit — `e915c5f` ("Add webhook handler for moderation actions and update ban/kick/mute panel UI" — **Phase 1**) and `434e18b` ("Add file signature validation to upload functions and enhance private message window styling" — **Phase 2**). This report verifies what those actually fixed and what is still open, then finds new issues on top.

---

## Phase 1 & 2 — What Was Actually Fixed (Verified)

| # (v1) | Issue | Status |
|---|---|---|
| 6.1 (Critical) | Moderation (ban/kick/mute) executed entirely client-side | ✅ **FIXED** — `BanKickMutePanel.jsx` now calls `callModerationAction` → `netlify/functions/moderationAction.js`, which re-verifies the caller's staff role server-side (`verifyToken(token, STAFF_ROLES)`) and enforces a staff hierarchy (non-owners can't moderate other staff) before writing. |
| 8.1 (High) | Weak webhook signature check (`sig.includes()`) | ✅ **FIXED** — `receive-webhook.js` now uses `crypto.timingSafeEqual` (`safeSecretMatch`) for constant-time comparison. |
| 2.1 (High) | Users can self-edit `trustScore`/`trustRank`/`trustData` | ✅ **FIXED** — `firestore.rules` now lists these fields in the `staffOnly` array. |
| 2.3 / 6.2 (High) | Unbounded `getDocs(limit(1000))` used only to count badge/RJ applications | ✅ **FIXED** — `badgeApplicationService.js` / `rjApplicationService.js` now use `getCountFromServer()`. |
| 2.4 (Medium) | Missing composite index coverage risk | ✅ **FIXED** — `firestore.indexes.json` has confirmed indexes for the `reports`/`modLogs` query shapes used in `BanKickMutePanel.jsx`. |
| 3.3 (High) | No server-side MIME validation on uploads | ✅ **FIXED** — new `netlify/functions/shared/fileSignature.js` does magic-byte verification, wired into `uploadMedia.js`, `uploadBadgeMedia.js`, `uploadRJMedia.js`. |
| 4.1 (High) | Private messages cannot be deleted | ⚠️ **PARTIALLY FIXED** — `LuxuryPrivateMessageWindow.jsx` now has `handleDeletePM` wired to `deleteDoc`, but it's a **hard delete for both participants** (single shared document), not a per-participant/soft delete. If one side deletes, it vanishes for both — see new finding 4.1b below. |
| 4.3 (Medium/High) | Missing `useEffect` cleanup on chat listeners | ✅ **FIXED** — the kicked-users, individual-kick, and friend-request listeners in `HomePage.jsx` now correctly return their unsubscribe functions. |
| 6.5 (Low) | Kick/ban modal relies on fixed timeout | ✅ **FIXED** — `BanKickModal.jsx` still has the 1.2s auto-close timeout, but it's now paired with a live countdown driven by absolute server timestamps and cleans up Firestore state when it hits zero. |

**Still open from v1** (unchanged, re-confirmed present): 1.1 guest login race, 1.2 auth/interval listener cleanup, 1.3 OTP hash in sessionStorage, 1.4 duplicate ban-enforcement mechanisms, 1.5 StrictMode side effects, 2.2 client-side role-assignment attempts, 3.1 profile cache invalidation, 3.2 avatar flicker, 3.4 no retry on badge/RJ uploads, 3.5 object-URL leak, 3.6 R2 not in service-worker cache, 4.2 `dangerouslySetInnerHTML`, 4.4 no optimistic send, 4.5 no offline retry queue, 5.1–5.3 & 5.5 broadcast issues (5.4 mic-permission handling is now **partially fixed**), 6.3 real-time listeners for reports, 6.4 unsanitized admin notes, 7.1–7.4 & 7.6–7.7 performance/architecture items, 8.2–8.6 backend items.

---

## 1. Authentication, Routing & Session Handling

### 1.1 Guest login auth race condition — ✅ FIXED
- **File:** `src/pages/LoginPage.jsx` — `handleGuestFormSubmit`
- Guest metadata (`localStorage.setItem('guestGender', ...)`) is now written synchronously **before** `signInAnonymously()`. `App.jsx`'s `getStoredGuestGender()` resolves it reliably even if `onAuthStateChanged` fires early.

### 1.2 Auth/interval listeners not fully cleaned up — **High** (still present)
- **File:** `src/App.jsx` — root auth effect
- **Root cause:** The GA/visitor-tracking effect (~L94) has no cleanup; the auth listener (~L192) declares `unsubscribeAuth` but doesn't return it from the effect; a nested `onAuthStateChanged` re-subscription exists at ~L267.
- **User impact:** Listener/interval leaks across logout→login cycles and hot reloads; duplicate analytics/presence writes.
- **Fix:** One `useEffect` per listener, each returning its own unsubscribe; remove the nested re-subscription at L267.
- **Effort:** M

### 1.3 OTP hash stored in sessionStorage — **Medium** (still present)
- **File:** `src/utils/emailService.js` — `sendOTPEmail` (~L17-18)
- Verification remains client-side; a SHA-256 hash + expiry sit in `sessionStorage`, still bypassable via devtools.
- **Fix:** Verify OTP via a Netlify function. **Effort:** M

### 1.4 Duplicate/competing ban-enforcement mechanisms — **High** (still present, worse)
- **File:** `src/App.jsx`, `src/pages/LoginPage.jsx`
- **Root cause:** Now **three** separate intervals/loops confirmed: a 3s poll (~L351), a 2s "lockdown" interval (~L500), and a 20ms attempt loop (~L305) — plus `LoginPage.jsx`'s CSS-only lock (~L234).
- **User impact:** CPU overhead; possible conflicting redirect/lock states.
- **Fix:** Single Firestore-driven ban state feeding one lockdown component. **Effort:** M

### 1.5 Non-idempotent StrictMode side effects — **Medium** (still present)
- **File:** `src/App.jsx` — `initGA`, `initVisitorTracking`, RTDB presence write (~L630)
- No ran-once guard; StrictMode double-invokes in dev, causing duplicate analytics events/writes.
- **Fix:** `useRef` sentinel guard. **Effort:** S

### 1.6 (NEW) Nested auth listener — **Medium**
- **File:** `src/App.jsx` (~L267)
- **Root cause:** A second `onAuthStateChanged` subscription is created inside the outer auth observer's callback.
- **User impact:** Redundant listener stacks accumulate every time the outer auth state settles.
- **Fix:** Move to a single top-level subscription. **Effort:** S

### 1.7 (NEW) Blocking synchronous retry loop — **Low**
- **File:** `src/App.jsx` (~L305)
- **Root cause:** A 15-iteration `setTimeout` loop forces modal state instead of driving it off a real state change.
- **User impact:** Minor main-thread jank.
- **Fix:** Replace with a listener-driven state update. **Effort:** S

### 1.8 (NEW) Session event data in sessionStorage — **Low**
- **File:** `src/pages/LoginPage.jsx` (~L106, `tt_page_toast` handoff)
- Login/logout event metadata sits in sessionStorage; low-severity data exposure only.
- **Effort:** S

---

## 2. Firebase Security & Data Layer

### 2.1 Self-editing trust fields — ✅ FIXED (see summary table)

### 2.2 Client-side role assignment attempts — **Medium** (still present)
- **Files:** `src/pages/RoomListPage.jsx` (~L324), `src/pages/AdminPanelPage.jsx` (~L266)
- Both still contain `updateDoc(..., { role: 'owner' })` calls. Rules correctly block these (role is `staffOnly`), so they fail loudly rather than escalate privilege — but the client shouldn't attempt them at all.
- **Fix:** Remove these code paths entirely. **Effort:** S

### 2.3 Unbounded queries for counts — ✅ FIXED for badge/RJ stats, ⚠️ new instance found
- **New finding:** `src/pages/BanKickMutePanel.jsx` (~L367) and `src/pages/AdminPanelPage.jsx` (~L1585, `kickedUsers` at ~L864) still run `getDocs(query(..., limit(1000-2000)))` during "unkick all" actions.
- **User impact:** Client-side processing of up to 2000 docs; will get slower and costlier as rooms/kicks grow.
- **Fix:** Replace with a targeted `kickedUsers` collection-group query or a callable function that does it server-side. **Effort:** M

### 2.4 Composite index coverage — ✅ FIXED (verified against `reports`/`modLogs` query shapes)

### 2.5 (NEW) Overly permissive `users` collection read — **Medium**
- **File:** `firestore.rules` (~L222)
- **Root cause:** `allow read: if request.auth != null;` on the entire `users` collection — any authenticated user (including anonymous guests) can read every user document.
- **User impact:** Full user-profile scraping is possible by anyone who signs in, including guests.
- **Fix:** Restrict to `auth.uid == userId` for private fields, or split public-safe fields into a separate readable subset.
- **Effort:** M

### 2.6 (NEW) Public room read with no field protection — **Low**
- **File:** `firestore.rules` (~L292) — `allow read: if true;` on `rooms`.
- Likely intentional for public room listings, but has no field-level restriction. **Effort:** S

### 2.7 (NEW) Moderation function accepts unbounded/unsanitized text — **Low/Medium**
- **File:** `netlify/functions/moderationAction.js` — `handler`, ban/mute branches (~L101-107)
- **Root cause:** `reason`/`adminNotes` are written to Firestore with no length cap or sanitization even though the role-check itself is solid.
- **User impact:** A compromised or careless staff account could write oversized strings, risking document-size issues or downstream rendering problems (see 6.4).
- **Fix:** Cap length (e.g. 500 chars) and strip HTML server-side before the Firestore patch. **Effort:** S

---

## 3. Profile, Avatar & Media/Upload System

### 3.1 Profile cache not invalidated on update — **Medium** (still present)
- **File:** `src/components/EditProfile.jsx` — `handleSubmit` (~L393-459)
- Still no call to `setCachedUserProfile`/`invalidateCachedUserProfile` after a successful save. **Effort:** S

### 3.2 Avatar flicker in `LiveAvatar` — **Low** (still present)
- **File:** `src/components/LiveAvatar.jsx` (~L43-57) — state still seeded from a possibly-stale `baseSrc` before the live listener resolves. **Effort:** S

### 3.3 No server-side MIME validation — ✅ FIXED (magic-byte check now in place); ⚠️ one gap remains
- **New finding:** `src/components/StylishImageUploadModal.jsx` (~L42-48) still has no client-side size check before upload (server will still reject it via signature/size checks, but UX wastes bandwidth on large rejected files).
- **Fix:** Add the same 5MB client check used in `EditProfile.jsx`. **Effort:** S

### 3.4 Zero retry logic on badge/RJ uploads — **Medium** (still present)
- **File:** `src/services/r2StorageService.js` — `uploadMedia` (~L211-237), `uploadRJMedia` (~L342-367) still lack the 2-attempt retry that `uploadMediaFile` (~L147-164) has. **Effort:** S

### 3.5 `URL.createObjectURL` leak on cancel — **Medium** (still present)
- **File:** `src/components/EditProfile.jsx` — `handleCropCancel` (~L364) and reset path don't revoke the object URL created in `handleProfilePicChange` (~L157). **Effort:** S

### 3.6 R2 public URLs not covered by service worker — **Low** (still present)
- **File:** `sw.js` — still only covers `firebasestorage`, `randomuser.me`, Google Fonts, Giphy; no R2 (`*.r2.dev`) rule. **Effort:** S

### 3.7 (NEW) Fragile R2 key extraction — **Low/Medium**
- **File:** `src/services/r2StorageService.js` — `extractR2Key` (~L60-64)
- **Root cause:** Uses a simple pathname replacement assuming a specific public-bucket URL shape; breaks silently if the bucket URL/custom domain differs from the hardcoded pattern.
- **User impact:** Avatar-refresh logic in `LiveAvatar.jsx` can fail silently for URLs that don't match the assumed shape.
- **Fix:** Parse the key more defensively (e.g. via a configured base-URL prefix strip with a fallback warning). **Effort:** S

### 3.8 (NEW) File-extension guess from unvalidated content-type string — **Low**
- **Files:** `uploadBadgeMedia.js` (~L82-85), `uploadRJMedia.js` (~L78-81)
- Extensions are chosen via `indexOf` checks on the content-type string; a malformed-but-signature-valid string could mislabel the stored file extension. **Effort:** S

---

## 4. Messaging: Private Messages, Room Chat, Homepage Chat

### 4.1b Private-message delete is a hard, both-sides delete — **Medium** (new nuance on a "fixed" item)
- **File:** `src/components/LuxuryPrivateMessageWindow.jsx` — `handleDeletePM` (~L303-314)
- **Root cause:** Deletes the single shared `privateMessages` document outright; there's no per-participant "delete for me" semantics.
- **User impact:** If one participant deletes a message, it disappears for the other participant too, without their consent — a step beyond typical PM delete UX and a potential trust/evidence issue (e.g. deleting a message that was reported).
- **Fix:** Use a `deletedFor: [uid]` array field and filter client-side, or a proper soft-delete-per-participant model.
- **Effort:** M

### 4.2 `dangerouslySetInnerHTML` for message/badge content — **High** (still present, more sites found)
- **File:** `src/pages/HomePage.jsx` — now confirmed at L239 (rendered HTML), L610 (badges), L4269 (room title SVGs), L7973 (profile badges), L7978 (birthday badge), L7989 (achievement SVGs).
- **User impact:** Stored XSS if any of these SVG/HTML sources (room titles, badge configs) can be influenced by a compromised or malicious account.
- **Fix:** Route all six sites through React elements or DOMPurify-sanitized HTML. **Effort:** M

### 4.3 Missing `useEffect` cleanup — ✅ FIXED (kicked-users, individual-kick, friend-request listeners now return their unsubscribes)

### 4.4 No optimistic send — **Medium** (still present)
- **File:** `src/pages/HomePage.jsx` — `handleSendMessage` (~L4055), `handleSendPrivateMessage` (~L5752) still wait for `addDoc` + `onSnapshot` round-trip. **Effort:** M

### 4.5 No offline queue / retry — **Medium** (still present)
- Failed sends still only show a toast (~L5816), no retry affordance or persistent queue. **Effort:** M

### 4.6 (NEW) Expensive per-update profile fetch in friend-request listener — **Medium**
- **File:** `src/pages/HomePage.jsx` (~L2936-2950)
- **Root cause:** The friend-requests `onSnapshot` callback runs `Promise.all` of `getDoc` calls for every sender profile on every snapshot update, instead of caching/denormalizing sender name+avatar onto the request document.
- **User impact:** Firestore read amplification and UI lag under frequent friend-request activity.
- **Fix:** Denormalize sender display fields onto the request doc, or read through the shared profile cache. **Effort:** S/M

### 4.7 (NEW) Private-message listener race on rapid conversation switching — **Low**
- **File:** `src/pages/HomePage.jsx` (~L5845-5850, `pmListenerRef`)
- Rapidly opening different conversations can start a new listener before the previous one is confirmed cleared. **Effort:** S

### 4.8 (NEW) No client-side sequencing for message ordering — **Low**
- Ordering relies solely on `serverTimestamp()`; messages sent within the same second from different clients have no tiebreaker. **Effort:** S

### 4.9 (NEW) Redundant profile fetch on send — **Low**
- **File:** `src/pages/HomePage.jsx` — `handleSendMessage` (~L4139) does a `getDoc` fallback for the sender profile even though `App.jsx` already maintains a global profile listener. **Effort:** S

---

## 5. Broadcast / RJ Live Audio System

### 5.1 WebRTC reconnect asymmetry — **High** (still present)
- **File:** `src/components/BroadcastPanel.jsx` — `startSpeakerMode` (~L1080) reacts to `connectToRJ` state but its offer listener (~L1142) is set up once and doesn't fully resync with host-side `rjConnectToSpeaker` restarts (~L1400). **Effort:** M

### 5.2 Stale RTDB listeners on speaker retry — **Medium** (still present)
- **File:** `rjConnectToSpeaker` (~L1400) still does `rjSpeakerUnsubs.current[speakerUid] = []` unconditionally at ~L1405 without clearing any pre-existing array first, orphaning old listeners. **Effort:** S

### 5.3 `songQueue`/`announcements`/`youtube` not fully cleared — **Medium** (still present)
- **File:** `handleEndBroadcast` (~L1714) via `rjStopAllBroadcasterConnections` — clears connections/listeners/speakerConnections, but not `songQueue`, `announcements`, `youtube`; none have `onDisconnect().remove()`. **Effort:** S

### 5.4 Silent failure on microphone permission denial — **Medium → Partially Fixed**
- `startSpeakerMode` (~L1080) and `handleGoLive` (~L1650) now catch `NotAllowedError` and show a toast. `startLocalMic` (~L1762) itself still has no internal handling and depends on its caller catching the error.
- **Fix:** Add the same explicit catch inside `startLocalMic`. **Effort:** S

### 5.5 `AudioContext` never closed on public mic meter — **Low** (still present)
- `stopPubMicLevelMeter` (~L1855) nulls the ref but never calls `.close()`. **Effort:** S

### 5.6 (NEW) Race condition in speaker reconnect — **High**
- **File:** `rjConnectToSpeaker` (~L1461-1462)
- **Root cause:** Performs an RTDB `remove()` immediately followed by a `set()` on the same path with no transaction/completion guarantee; high-latency clients can miss the transient removed state.
- **User impact:** Reconnect can silently fail to propagate on slower connections, requiring a manual rejoin.
- **Fix:** Use a single `update()` call instead of remove-then-set. **Effort:** S/M

### 5.7 (NEW) Speaker audio node teardown ordering bug — **Medium**
- **File:** `_rjDisconnectSpeaker` (~L1376) and `rjStopAllBroadcasterConnections` (~L1347)
- Disconnects a node without nulling the ref until after the (possibly-throwing) disconnect call; broadcaster teardown doesn't handle already-suspended nodes. **Effort:** S

### 5.8 (NEW) Repeated `onDisconnect` handler registration — **Low**
- **File:** `rjJoinAudio` (~L1515), `pubJoinAudio` (~L2219) — register a fresh `onDisconnect().remove()` on every call without clearing prior registrations, accumulating server-side handlers. **Effort:** S

### 5.9 (NEW) YouTube sync drift — **Medium**
- **File:** `syncYouTubePlayer` (~L950) — drift calculated from `startedAt` without accounting for player buffering time; sync error accumulates across listeners over a session. **Effort:** M

---

## 6. Admin Panel, Moderation, Badge & RJ Verification

### 6.1 Client-side-only moderation — ✅ FIXED (see summary table — this was the report's one Critical item)

### 6.2 Unbounded queries for stats/counts — ✅ FIXED for badge/RJ; ⚠️ new instance in room/kick admin flows (see 2.3 above)

### 6.3 Real-time listeners instead of paginated reads — **Medium** (still present)
- **File:** `BanKickMutePanel.jsx` — `reports` (~L166) and `modLogs`/violations (~L178) are `onSnapshot` with 150-200 doc limits; still live rather than paginated for data that doesn't need to be. **Effort:** M

### 6.4 Admin notes/report reasons not sanitized — **Medium** (still present)
- `AdminBanKickModal.jsx` / `BanKickMutePanel.jsx` still render `reason`/`adminNotes` without sanitization (React's default escaping mitigates script injection, but not HTML/link-based abuse in admin-to-admin views). **Effort:** S

### 6.5 Kick/ban modal timeout — ✅ FIXED (now paired with a live server-timestamp-driven countdown)

### 6.6 (NEW) `moderationAction.js` accepts unbounded reason/notes text — see 2.7 above.

---

## 7. Performance & Architecture

### 7.1 `HomePage.jsx` monolith — **High → Worse**
- **File:** `src/pages/HomePage.jsx`
- **Current size:** **8,876 lines** (up from ~5,000 at v1), **116 `useState`**, **48 `useEffect`**.
- **User impact:** This single file is now nearly double its v1 size and remains the root cause clustering most listener-cleanup, XSS, and state-sync findings above.
- **Fix:** Decompose into feature-scoped components/hooks. **Effort:** L

### 7.2 Cross-component state sync via `window` events — **Medium** (still present)
- `App.jsx` dispatches `_appUserProfileChanged` (~L558); `HomePage.jsx` consumes via `window.addEventListener` (~L2222). **Effort:** M

### 7.3 No code-splitting on the main chat surface — **Medium** (still present)
- `HomePage.jsx` still eagerly imports `YouTubeSearchModal`, `GiphyStickersModal`, `StylishAudioUpload` at top level. **Effort:** M

### 7.4 Accessibility gaps — **Medium** (still present, quantified)
- `index.html` still lacks `<main>`/`<footer>` landmarks; **13** empty/generic `alt=""` instances; **765** icon-only `<button>` elements without `aria-label` app-wide. **Effort:** M

### 7.5 SEO — no issues (unchanged, informational)

### 7.6 Deprecated/unstable dependencies — **Low** (still present)
- `express@^5.2.1` (still a pre-1.0-maturity major line relative to its ecosystem), `react-helmet-async@^3.0.0` still behind current majors. **Effort:** S

### 7.7 Service worker cache ceiling — **Low** (still present)
- `sw.js`/`vite.config.js` still cap at 5MB with no `chunkSizeWarningLimit` in `vite.config.js`. **Effort:** S

### 7.8 (NEW) Active `console.log`/`console.error` in production paths — **Low/Medium**
- **File:** `src/pages/HomePage.jsx` (e.g. ~L1260, L1454, L2506 and others)
- **User impact:** Minor performance overhead and information leakage into the browser console in production.
- **Fix:** Strip via a build-time babel/vite plugin or gate behind a debug flag. **Effort:** S

### 7.9 (NEW) Inconsistent relative import depth — **Medium**
- Firebase config and other shared modules are imported via inconsistent relative paths (`../` vs `../../`) across dozens of files (~57 occurrences), which can confuse bundler tree-shaking and slow builds.
- **Fix:** Adopt path aliases (`@/firebase/config`) via `vite.config.js`/`tsconfig.json`. **Effort:** M

### 7.10 (NEW) PWA manifest conflict — **Medium**
- **File:** `vite.config.js` — `VitePWA` is configured with `manifest: false` while a hand-written `manifest.json` is separately included.
- **User impact:** The two can silently drift out of sync (icons, theme color, name).
- **Fix:** Let `VitePWA` generate the manifest from a single source of truth, or explicitly document why it's manual. **Effort:** S

---

## 8. Netlify Functions & `server.js` Backend

### 8.1 Weak webhook signature validation — ✅ FIXED (see summary table)

### 8.2 JWT payload read without verification — **Medium** (still present)
- **Files:** `server.js` (~L39), `netlify/functions/shared/firestoreAdmin.js` (~L38) — still manually base64-decode JWT payloads for early checks before the Firestore REST call implicitly validates. **Effort:** S

### 8.3 Duplicated, diverging email logic — **Medium** (still present, gap widened)
- `server.js`, `send-email.js`, `contact.js` still maintain separate Brevo/template implementations; `send-email.js`/`email-action.js` have since gained richer multi-color theming not present in `server.js`/`contact.js`, so the drift has grown since v1.
- **Fix:** Consolidate onto the Netlify-function implementation. **Effort:** M

### 8.4 Template loader path fragility — **Medium** (still present)
- `templateLoader.js`'s `getTemplatesDir` still derives from `process.cwd()`/`import.meta.url`; a `/var/task/Templates` fallback was added but the approach remains environment-dependent. **Effort:** M

### 8.5 In-memory rate limiting — **Medium** (still present)
- `contact.js`, `sendOTP.js`, `sendPasswordReset.js` still use per-instance `Map`s that reset on cold start / don't sync across instances. **Effort:** M

### 8.6 CORS wildcard — **Low** (still present, confirmed across 6 functions)
- `receive-webhook.js`, `send-email.js`, `contact.js`, `email-action.js`, `sendOTP.js`, `sendPasswordReset.js` all send `Access-Control-Allow-Origin: *`. **Effort:** S

### 8.7 (NEW) Client-side API key used as a backend fallback — **Critical**
- **File:** `netlify/functions/sendPasswordReset.js` (~L08)
- **Root cause:** Falls back to `VITE_FIREBASE_API_KEY` (a client-exposed env var) when the intended server-only `FIREBASE_WEB_API_KEY` is unset.
- **User impact:** If this fallback ever triggers in production (e.g. a misconfigured env), the function proceeds using a key that offers no real secrecy boundary — not itself a leak, but it defeats the purpose of having a separate server-only key and signals the two are being treated as interchangeable elsewhere too.
- **Fix:** Remove the fallback; fail loudly if `FIREBASE_WEB_API_KEY` is missing so misconfiguration is caught immediately instead of silently degrading.
- **Effort:** S

### 8.8 (NEW) Silent error swallowing on audit-relevant writes — **Medium**
- **File:** `server.js` (~L384, L387) — `.catch(() => {})` on Firestore writes that log sent emails.
- **User impact:** Failed audit-log writes disappear with no trace, undermining any future investigation of email activity.
- **Fix:** At minimum, log the error; consider a retry or dead-letter record. **Effort:** S

### 8.9 (NEW) Full email addresses logged server-side — **Low**
- **File:** `server.js` (~L209) logs full recipient email + subject to console, while `receive-webhook.js`/`send-email.js` already mask emails in their logs.
- **Fix:** Mask consistently across all logging sites. **Effort:** S

### 8.10 (NEW) Unbounded recursive object conversion — **Medium**
- **File:** `server.js` — `fsVal` helper (~L214-222)
- **Root cause:** Recursively converts arbitrary request-body objects into Firestore field values with no depth or size limit.
- **User impact:** A deeply nested or oversized JSON payload could cause excessive CPU/stack usage — a low-cost DoS vector against this endpoint.
- **Fix:** Cap recursion depth and payload size before conversion. **Effort:** S

---

## Top 20 Highest-Priority Issues (Post Phase 1/2)

| # | Severity | Issue | File |
|---|----------|-------|------|
| 1 | Critical | Backend function falls back to a client-exposed Firebase API key when the server-only key is missing | `netlify/functions/sendPasswordReset.js` |
| 2 | High | `dangerouslySetInnerHTML` used at 6 sites for chat/badge/room-title content — stored XSS risk | `src/pages/HomePage.jsx` |
| 3 | High | `HomePage.jsx` monolith has grown to ~8,876 lines / 116 state vars / 48 effects since v1 | `src/pages/HomePage.jsx` |
| 4 | High | WebRTC reconnect asymmetry still silently kills speaker audio after network blips | `BroadcastPanel.jsx` |
| 5 | High | Race condition in speaker reconnect (`remove()` then `set()` on same RTDB path, no transaction) | `BroadcastPanel.jsx` |
| 6 | High | Auth/interval listeners still not fully cleaned up, plus a newly found nested `onAuthStateChanged` subscription | `src/App.jsx` |
| 7 | High | Duplicate/competing ban-enforcement mechanisms (now 3 intervals + a CSS lock) | `App.jsx`, `LoginPage.jsx` |
| 8 | Medium | Users collection is readable by any authenticated (including guest) account | `firestore.rules` |
| 9 | Medium | Private-message delete is a hard delete for both participants, not per-participant | `LuxuryPrivateMessageWindow.jsx` |
| 10 | Medium | Unbounded `getDocs(limit(1000-2000))` still used in kick/room admin flows | `BanKickMutePanel.jsx`, `AdminPanelPage.jsx` |
| 11 | Medium | Duplicated, further-diverged email logic between `server.js` and Netlify functions | `server.js` |
| 12 | Medium | Client-side code still attempts privileged role writes | `RoomListPage.jsx`, `AdminPanelPage.jsx` |
| 13 | Medium | Real-time listeners used for non-live reports/violations data | `BanKickMutePanel.jsx` |
| 14 | Medium | Admin notes/report reasons still rendered without sanitization | `AdminBanKickModal.jsx` |
| 15 | Medium | In-memory rate limiting ineffective across ephemeral Netlify instances | `contact.js`, `sendOTP.js`, `sendPasswordReset.js` |
| 16 | Medium | Fragile template-path resolution can silently break transactional email | `templateLoader.js` |
| 17 | Medium | Friend-request listener re-fetches every sender profile on each snapshot | `HomePage.jsx` |
| 18 | Medium | No optimistic send / no offline retry queue for chat messages | `HomePage.jsx` |
| 19 | Medium | Profile cache not invalidated on save — stale avatar/name shown after edit | `EditProfile.jsx` / `userProfileCache.js` |
| 20 | Medium | Unbounded recursive request-body-to-Firestore conversion (DoS vector) | `server.js` (`fsVal`) |

---

## Scorecard

| Dimension | v1 Score | v2 Score | Change | Rationale |
|---|---|---|---|---|
| **Security** | 52 | **64** | +12 | The one Critical (client-side moderation) is fixed with a proper server-side re-check, and the webhook/trust-field/MIME gaps are closed. New findings (users-collection over-read, the password-reset API-key fallback) keep this from scoring higher. |
| **Performance** | 58 | 54 | −4 | `HomePage.jsx` grew ~78% larger since v1 with no decomposition; new console-log and import-hygiene findings compound the existing lack of code-splitting. |
| **Architecture** | 55 | 53 | −2 | Core structural issues (monolith, window-event state sync, no code-splitting) are unchanged while the monolith itself grew. |
| **Scalability** | 50 | 52 | +2 | Badge/RJ stat queries now use aggregation; still-unbounded kick/room queries and real-time listeners on non-live data keep this moderate. |
| **Code Quality** | 60 | 60 | 0 | Phase 1/2 fixes were clean and well-scoped, but new findings (import-path inconsistency, console logs, duplicated email logic widening) offset the gain. |
| **Maintainability** | 55 | 52 | −3 | The growing `HomePage.jsx` and continued email-logic divergence make near-term changes riskier than at v1. |
| **Overall Health** | 55 | **56 / 100** | +1 | Phase 1 & 2 meaningfully closed the most dangerous security gap and a real data-integrity risk (unbounded stat scans), but the app's single largest structural risk — `HomePage.jsx` — kept growing in the same window, and a new Critical-severity backend key-fallback issue was introduced. Net effect: security is measurably better, everything downstream of the monolith is measurably more fragile. |

---

## Recommended Phase 3 Scope (for review before implementation)

Based on this audit, a reasonable next phase would target the **highest-severity items that don't require the `HomePage.jsx` decomposition** (that refactor should be its own dedicated phase given its size/risk):

1. Remove the client-exposed API-key fallback in `sendPasswordReset.js` (Critical, effort S).
2. Sanitize/replace all 6 `dangerouslySetInnerHTML` sites in `HomePage.jsx` (High, effort M).
3. Fix the WebRTC reconnect asymmetry + the remove-then-set race condition in `BroadcastPanel.jsx` (High, effort M).
4. Consolidate the 3 competing ban-enforcement mechanisms into one Firestore-driven lockdown (High, effort M).
5. Fix the remaining `App.jsx` listener-cleanup gaps + remove the nested auth subscription (High, effort M).
6. Restrict the `users` collection read rule (Medium, effort M).
7. Change private-message delete to per-participant soft delete (Medium, effort M).

Items 8+ (email-logic consolidation, rate limiting, `HomePage.jsx` decomposition, accessibility, etc.) are larger efforts better suited to their own phases.
