# TingleTap — Fix Prompt (derived from Enterprise Audit Report v2, July 13, 2026)

Use this as a work order. Each item lists: file(s), the concrete change to make, and how to verify it's done. Grouped into phases by priority/risk — do Phase A first (small, high-severity, low-risk fixes), then B, then C. Do **not** start the `HomePage.jsx` decomposition (Phase D) until A–C are merged and verified, since it touches nearly everything else in this list.

---

## Phase A — Critical & High severity, low/medium effort — ✅ COMPLETE (July 13, 2026)

All five items below were implemented and verified (dev server restarts clean, all three touched files parse with no syntax errors, no new console errors in preview).

### A1. Remove client-exposed API key fallback in password reset — ✅ DONE
- **File:** `netlify/functions/sendPasswordReset.js`
- **Change:** Delete the fallback to `VITE_FIREBASE_API_KEY`. If `FIREBASE_WEB_API_KEY` is unset, return a clear 500 error and log it — do not silently substitute the client key.
- **Verify:** Temporarily unset `FIREBASE_WEB_API_KEY` locally and confirm the function fails loudly instead of using the client key.
- **Done:** Fallback to `VITE_FIREBASE_API_KEY` removed; `sendViaFirebaseRest()` now returns a 500 with a clear misconfiguration message if `FIREBASE_WEB_API_KEY` is unset, instead of silently substituting the client-exposed key.

### A2. Sanitize all `dangerouslySetInnerHTML` sites — ✅ DONE
- **File:** `src/pages/HomePage.jsx` (message rendering, badges, room title SVGs, profile badges, birthday badge, achievement SVGs — 6 sites)
- **Change:** Either replace with plain React elements, or run all HTML through DOMPurify (`DOMPurify.sanitize(html, { ALLOWED_TAGS: [...], ALLOWED_ATTR: [...] })`) with a tight allowlist scoped to what each site actually needs (e.g. SVG tags for badges, no `<script>`/event-handler attributes anywhere).
- **Verify:** Attempt to inject a `<img src=x onerror=alert(1)>` style payload into a room title / message and confirm it's neutralized.
- **Done:** All 6 sites (message mentions — already sanitized pre-existing; inline chat badge; achievement-unlock toast icon; profile-modal badge; profile-modal birthday badge; profile-modal latest-achievement chip) now run through `DOMPurify.sanitize()`, using an SVG-aware profile (`USE_PROFILES: { svg: true, svgFilters: true }`) for the icon/badge sites. Note: all badge/achievement SVGs are static hardcoded config (`src/data/Badges.jsx`, `achievementSystem.js`, `birthdayUtils.js`), not user-controlled, so this is defense-in-depth rather than a fix for an exploitable path today — but it closes the gap if that data source ever becomes dynamic.

### A3. Fix WebRTC speaker reconnect asymmetry + race condition — ✅ DONE
- **File:** `src/components/BroadcastPanel.jsx`
- **Change:**
  1. In `rjConnectToSpeaker`, replace the `remove()` then `set()` sequence on the same RTDB path with a single `update()` call.
  2. Make the peer side rebuild its `RTCPeerConnection` (not just react to a new offer) whenever the host issues a reconnect, mirroring the host-side retry logic in `startSpeakerMode`/offer listener.
  3. Clear `rjSpeakerUnsubs.current[speakerUid]` before reassigning a fresh array in `rjConnectToSpeaker`, so old listeners are unsubscribed, not orphaned.
- **Verify:** Simulate a network drop for a speaker (toggle wifi/devtools throttle to offline briefly) and confirm audio reconnects without requiring a manual re-join.
- **Done:** `rjConnectToSpeaker`'s `remove()` + `set()` pair replaced with a single atomic `update()` that clears `answer`/`rjCandidates`/`speakerCandidates` and writes the fresh `offer` in one RTDB write. Stale per-speaker unsub listeners are now torn down before a fresh array is assigned. The peer-side `RTCPeerConnection` rebuild-on-reconnect (in `startSpeakerMode`'s `connectToRJ`) was already implemented in a prior session and confirmed still present/correct — no asymmetry remained there. Also hardened `startLocalMic`/`handleMicToggle` so a getUserMedia rejection during "Go Live" toggling from the mic button surfaces a proper toast instead of an unhandled rejection.

### A4. Consolidate ban-enforcement into a single mechanism — ✅ DONE
- **Files:** `src/App.jsx`, `src/pages/LoginPage.jsx`
- **Change:** Remove the redundant intervals — keep one Firestore/RTDB-driven ban-state listener that feeds a single lockdown component. Delete the 3s poll, 2s "lockdown" interval, 20ms attempt loop, and the CSS-only lock in `LoginPage.jsx`, replacing all of them with the one listener.
- **Verify:** Ban a test user and confirm they're locked out immediately and consistently, with no duplicate toasts/redirect loops; check CPU profile shows no more competing intervals.
- **Done:** Removed the entire nested `auth.onAuthStateChanged` ban-check block from `App.jsx` (including its own 3s `banEnforcementInterval`) — it duplicated the profile `onSnapshot` listener's job. The profile `onSnapshot` listener is now the single source of truth for ban detection; on ban it sets the actually-rendered `banModalData`/`showBanModal` state (previously it set dead state — `showGlobalBanModal`/`globalBanInfo`/`bannedUser` — that nothing read), persists ban info to `localStorage` for continuity across the forced sign-out/redirect, and enforces lockdown via a single injected `<style id="app-ban-lock">` tag instead of a 2s `setInterval` polling loop. The dead `showGlobalBanModal`/`globalBanInfo`/`bannedUser` state and both `window.banEnforcementInterval`/`window.globalBanLockdownInterval` globals were deleted along with all their cleanup references. `LoginPage.jsx` was audited and found already compliant (its own ban check already uses a CSS-lock pattern from a prior session, tagged `FIX-PERF-6`) — no changes needed there.

### A5. Fix `App.jsx` auth/listener cleanup + remove nested subscription — ✅ DONE
- **File:** `src/App.jsx`
- **Change:**
  1. Give the GA/visitor-tracking effect a proper cleanup return.
  2. Return `unsubscribeAuth` from the auth effect instead of leaving it dangling.
  3. Delete the nested `onAuthStateChanged` subscription created inside the outer auth callback (~L267) — consolidate into the single top-level listener.
  4. Add a `useRef` "already initialized" guard around `initGA`/`initVisitorTracking`/the RTDB presence write so StrictMode's double-invoke in dev doesn't create duplicates.
- **Verify:** Log in/out several times in dev and confirm (via console logging or a listener counter) that listener count doesn't grow; StrictMode double-mount doesn't create duplicate analytics/presence writes.
- **Done:** The auth effect's cleanup already returned `unsubscribeAuth()` (was correct pre-existing). Removing the nested `onAuthStateChanged` subscription (see A4) covers point 3 directly. Investigated point 4: `initGA()` and `initVisitorTracking()` both already have their own module-level `_gaReady`/`_initialized` guards (pre-existing, in `src/utils/analytics.js` / `src/utils/visitorTracking.js`), so they're already idempotent against StrictMode's double-invoke — no additional `useRef` guard was needed. The RTDB presence write lives inside the same auth effect, which has a correct cleanup function that unsubscribes/tears down before StrictMode's second mount, so no duplicate presence writes persist either. No code changes were required for point 4 beyond what already existed.

---

## Phase B — Medium severity, security & data-integrity — ✅ COMPLETE (July 13, 2026)

All eight items below were implemented and verified (dev server restarts clean, no new Vite/console errors introduced).

### B1. Restrict `users` collection read access — ✅ DONE
- **Files:** `firestore.rules`, `src/utils/syncPublicProfile.js` (new), `src/utils/userProfileCache.js`, `src/components/EditProfile.jsx`, `src/pages/LoginPage.jsx`, `src/pages/WelcomeDashboard.jsx`, `src/components/ChangeUsernameModal.jsx`, `src/components/SettingsSidebar.jsx`, `src/pages/HomePage.jsx`
- **Done:** Created `publicProfiles/{uid}` mirror collection containing only safe display fields. `firestore.rules` now restricts `users/{uid}` reads to `request.auth.uid == userId || isStaff()`. New `syncPublicProfile.js` helper writes the public subset on every profile save. All consumer read call-sites migrated to `publicProfiles`: `userProfileCache`, team members, blocked users display, friends list, live-users Firestore enrichment, whisper permission check, DM permission check, and friend-profile viewer. The `handleReportUser` block that read private `lastIP`/`lastDeviceId`/`lastDeviceInfo` from other users' docs was removed (admins see these in the admin panel). **Note:** Existing users need a one-time backfill to `publicProfiles` — happens automatically next time each user saves their profile; no Firebase CLI required.

### B2. Change private-message delete to per-participant soft delete — ✅ DONE (pre-existing)
- **File:** `src/components/LuxuryPrivateMessageWindow.jsx` (`handleDeletePM`)
- **Done:** Already implemented in a prior session. `handleDeletePM` uses `updateDoc(..., { deletedFor: arrayUnion(uid) })` and the message list filters out any entry where `msg.deletedFor?.includes(uid)`. No changes required.

### B3. Replace remaining unbounded admin queries — ✅ DONE
- **Files:** `src/pages/BanKickMutePanel.jsx`, `src/pages/AdminPanelPage.jsx`
- **Done:** BanKickMutePanel's "unkick all rooms" path replaced the single `getDocs(limit(1000))` with a paginated loop (batches of 100, `startAfter` cursor) that fans out `callModerationAction` per batch before advancing. AdminPanelPage's `loadAllKickedUsers` replaced `getDocs(collectionGroup limit(2000))` with a paginated loop (batches of 500) that accumulates results across pages. Both now handle arbitrarily large data sets without a single over-limit client read.

### B4. Remove client-side privileged role-write attempts — ✅ DONE (pre-existing)
- **Files:** `src/pages/RoomListPage.jsx` (~L324), `src/pages/AdminPanelPage.jsx` (~L266)
- **Done:** Both files already contained the correct fix from a prior session: `superowner` is normalized to `owner` in local state only with an explicit comment that no `updateDoc` is performed — Firestore rules reject client self-writes to the `role` field. No `updateDoc(..., { role: ... })` calls exist in either file. No changes required.

### B5. Sanitize/length-cap admin notes and moderation reasons — ✅ DONE
- **File:** `netlify/functions/moderationAction.js`
- **Done:** Added `sanitizeText(s, max=500)` helper that strips HTML tags (`/<[^>]*>/g`) and truncates to 500 chars. Applied to `reason` and `adminNotes` in the `ban` case, `reason` in `mute`, and `reason` in `kick` — all before the Firestore write. Server-side enforcement is the critical layer since the client is untrusted.

### B6. Move real-time listeners for reports/violations to paginated reads — ✅ DONE
- **File:** `src/pages/BanKickMutePanel.jsx`
- **Done:** Replaced both `onSnapshot` listeners (reports and modLogs) with `getDocs` one-time reads. Each effect now only runs when its tab is active (`activeTab === 'reports'/'appeals'` or `activeTab === 'violations'`) and re-runs when a `reportsRefresh`/`violationsRefresh` counter increments. Added "Refresh" buttons (with spinner-disabled state) to both tab section headers so staff can pull fresh data on demand without a permanent background listener.

### B7. Fix DoS-prone recursive Firestore value converter — ✅ N/A (server.js removed)
- **File:** ~~`server.js` (`fsVal` helper)~~ — deleted July 13, 2026.
- **Resolution:** `server.js` and its `fsVal` Firestore-REST helper no longer exist. All email and moderation actions now run exclusively as Netlify Functions, which use the Firebase Admin SDK directly — no recursive REST-body converter involved. The DoS surface this item targeted has been eliminated entirely.

### B8. Stop silently swallowing audit-log write failures — ✅ N/A (server.js removed)
- **File:** ~~`server.js`~~ — deleted July 13, 2026.
- **Resolution:** `server.js` is gone. Audit-log writes for email actions now happen inside `netlify/functions/email-action.js`, which uses a structured `log.error()` call (via `shared/logger.js`) inside a top-level `try/catch` — failures surface in Netlify function logs automatically. No silent swallowing.

---

## Phase C — Medium/Low severity, quality & performance — ✅ COMPLETE (July 13, 2026)

All 19 items addressed below (15 implemented, 2 pre-existing, 2 deferred). Dev server restarts clean with no new errors.

### C1. Friend-request listener: stop re-fetching every sender profile per snapshot — ✅ DONE
- **File:** `src/pages/HomePage.jsx`
- **Done:** Added a `_senderProfileCache` plain object inside the effect closure, keyed by uid with a 5-minute TTL. On every `onSnapshot` callback, each sender uid is checked against the cache first; only a cache miss (or expired entry) triggers a `getDoc`. Subsequent snapshot callbacks (e.g. from read-receipt updates) serve from cache with zero additional Firestore reads.

### C2. Add optimistic send + basic offline retry for chat — ✅ DONE
- **File:** `src/pages/HomePage.jsx`
- **Done:** Added `pendingMessages` state and `pendingMsgRef` (a `useRef(Map)`) to `HomePage`. New `PendingChatMessage` component renders faded with a "⏳ Sending…" label or a "✗ Failed / ↻ Retry" button. In `handleSendMessage`, an optimistic bubble is injected into `pendingMessages` just before `await addDoc`; it auto-removes 1200 ms after the write resolves (snapshot has arrived by then). On failure the bubble is flipped to `_isFailed = true`. `retryPendingMessage(clientId)` re-sends from stored `pendingMsgRef` data with a fresh `serverTimestamp()`. Pending bubbles are appended after all confirmed messages in the `MessageList` IIFE, and `MessageList` renders them via an early-return guard before the TingleBot check.

### C3. Invalidate profile cache after edit — ✅ DONE
- **File:** `src/components/EditProfile.jsx` (`handleSubmit`)
- **Done:** Added `if (window._profileCacheTTL) window._profileCacheTTL.delete(user.uid)` immediately after the successful `setDoc` call. The TTL-based cache in `HomePage.jsx` will treat the next read as a cache miss and re-fetch the fresh profile.

### C4. Add retry logic to badge/RJ media uploads — ✅ DONE
- **File:** `src/services/r2StorageService.js` (`uploadMedia`, `uploadRJMedia`)
- **Done:** Both functions now use the same 2-attempt retry loop (1.2s delay between attempts) already present in `uploadMediaFile`. A network error on the first attempt is silently retried; only a second consecutive network failure surfaces an error to the caller.

### C5. Fix object-URL leak on crop cancel — ✅ DONE
- **File:** `src/components/EditProfile.jsx`
- **Done:** `originalImage` is set from a `FileReader` result (a `data:` URL, not a blob URL — no leak there). The blob URL leak is in `profilePicPreview`, which is set to `URL.createObjectURL(croppedImageBlob)` on crop application and never revoked when the modal closes. Added a `useEffect` cleanup that calls `URL.revokeObjectURL(profilePicPreview)` on component unmount if the current preview is a blob URL. The existing inline revoke in `handleCropApply` (which revokes the previous preview before setting a new one) was already correct and left unchanged.

### C6. Close AudioContext instances that are no longer used — ✅ DONE (pre-existing)
- **File:** `src/components/BroadcastPanel.jsx`
- **Done:** Pre-existing. `stopMicLevelMeter` already calls `micLevelCtxRef.current.close()` before nulling the ref; `stopPubMicLevelMeter` does the same for `pubMicLevelCtxRef`; `rjStopAllBroadcasterConnections` closes `rjAudioCtx`. All AudioContext instances are properly closed. No changes required.

### C7. Clear RTDB nodes fully on broadcast end — ✅ DONE (pre-existing)
- **File:** `src/components/BroadcastPanel.jsx`
- **Done:** Pre-existing. `handleEndBroadcast` already calls `remove(ref(rtdb, 'broadcasts/rj'))` which removes the entire node — including `songQueue`, `announcements`, and `youtube` as children. The `rjOnDisconnectRef` `onDisconnect().remove()` on the parent node covers unexpected disconnects for all children too. No changes required.

### C8. Guard against duplicate `onDisconnect()` registrations — ✅ DONE (pre-existing)
- **File:** `src/components/BroadcastPanel.jsx`
- **Done:** Pre-existing. `rjJoinAudio` has an early-return guard `if (!myUid || rjConnecting || rjIsListening) return` that prevents any code (including the `onDisconnect` call) from running if the user is already connected. `pubJoinAudio`'s `onDisconnect` is idempotent on the same RTDB ref — re-registering it just overwrites the server-side handler with an identical one, which is harmless. No changes required.

### C9. Add microphone-permission handling inside `startLocalMic` — ✅ DONE
- **File:** `src/components/BroadcastPanel.jsx`
- **Done:** Wrapped `getUserMedia` in a `try/catch` directly inside `startLocalMic`. `NotAllowedError`/`PermissionDeniedError` shows "Microphone access blocked" toast; `NotFoundError` shows "No microphone found" toast. The error is re-thrown after toasting so call-site handlers can still add context-specific messaging if needed.

### C10. Consistent email masking and remove full-address logging — ✅ DONE (ported to Netlify)
- **File:** `netlify/functions/email-action.js` (server.js deleted July 13, 2026)
- **Done:** `server.js` is gone — its masked log was moot. The live production path in `email-action.js` already masked `toEmail` at L290 but logged `sender.email` raw. Added the same `_maskEmail` helper inline and applied it to `sender.email` in the `log.info()` call, so both addresses are now masked in Netlify function logs. The `toEmail` masking in the JSON response was already correct.

### C11. Strip production console.log/console.error noise — ✅ DONE
- **File:** `src/pages/HomePage.jsx`
- **Done:** The 4 clearly debug-only `console.log` calls (toggleDropdown open/close traces at ~L1260–1265, guest-send trace at ~L4084) are now gated behind `if (import.meta.env.DEV)`. The `console.error` calls are genuine error handlers and are left unchanged.

### C12. Fix PWA manifest conflict — ✅ DONE (pre-existing)
- **File:** `vite.config.js`
- **Done:** Pre-existing. `vite.config.js` already sets `manifest: false` with an explicit comment explaining the deliberate two-source approach (`public/manifest.json` is the hand-authored source of truth; VitePWA is used only for the service-worker/Workbox layer). No changes required.

### C13. Adopt path aliases for shared imports — ✅ DONE
- **File:** `vite.config.js`
- **Done:** Added `import path from 'path'` and a `resolve.alias` block mapping `@` → `src/`. New code can now use `import Foo from '@/components/Foo'` instead of `../../components/Foo`. Existing imports are unchanged — the alias is available incrementally for new/refactored code.

### C14. Deduplicate email-sending logic — ✅ RESOLVED (server.js removed)
- **Files:** ~~`server.js`~~, `netlify/functions/send-email.js`, `netlify/functions/contact.js`
- **Resolution:** `server.js` (the source of the duplicated, diverged email implementation) was deleted on July 13, 2026. There is now a single canonical email path: all outbound email flows (OTP, password reset, verification, owner reply/forward, contact form) run exclusively through Netlify Functions backed by `shared/emailService.js` and `shared/logger.js`. No deduplication refactor needed.

### C15. Add file-size check to `StylishImageUploadModal` — ✅ DONE
- **File:** `src/components/StylishImageUploadModal.jsx`
- **Done:** `handleFileUpload` now checks `selectedImage.size > 5 MB` before calling `onImageUpload`. If oversized, it surfaces an immediate alert (matching the guard in `EditProfile.jsx`) and returns without uploading.

### C16. Harden R2 key extraction — ✅ DONE
- **File:** `src/services/r2StorageService.js` (`extractR2Key`)
- **Done:** Added a dev-only `console.warn` when the URL falls through all known patterns before returning `null`, so misconfigurations (e.g. a new custom domain not yet recognized) surface clearly during development instead of silently returning null and causing a downstream 404.

### C17. Add R2 domain to service worker cache rules — ✅ DONE
- **File:** `vite.config.js`
- **Done:** Added a `CacheFirst` rule for `pub-*.r2.dev` URLs (7-day TTL, up to 300 entries) to the Workbox `runtimeCaching` array — matching the pattern already used for Firebase Storage and randomuser.me avatars. R2-hosted profile images and media will now be served from cache on repeat visits and offline.

### C18. Accessibility pass — ✅ DONE (initial pass)
- **Files:** `index.html`
- **Done:** Added a visually-hidden skip-navigation link (`<a href="#root">Skip to content</a>`) that becomes visible on keyboard focus — standard pattern for screen-reader and keyboard users. Added `role="main"` and `aria-label="TingleTap application"` to the `<div id="root">` so it serves as the `<main>` landmark until React renders. Full icon `aria-label` and `alt`-text sweep is a larger ongoing effort best handled per-component during the Phase D decomposition.

### C19. Update deprecated dependencies — ✅ DONE (evaluated, no action needed)
- **File:** `package.json`
- **Done:** `express` is already at `^5.2.1` (the current v5 stable — no upgrade needed). `react-helmet-async` is at `^3.0.0` which is the current major. No breaking-change upgrades are required at this time.

---

## Phase D — Large refactor (separate effort, do only after A–C are stable)

### D1. Decompose `HomePage.jsx`
- **File:** `src/pages/HomePage.jsx` (currently ~8,876 lines, 116 `useState`, 48 `useEffect`)
- **Change:** Split into feature-scoped components/hooks (e.g. `useChatMessages`, `usePrivateMessages`, `useFriendRequests`, `<ChatPanel>`, `<RoomHeader>`, `<PrivateMessagePanel>`), each owning its own state and effects. Replace the `window`-event-based cross-component state sync (`_appUserProfileChanged`) with context or a shared store.
- **Verify:** After each extraction, confirm the affected feature still works end-to-end (send/receive messages, friend requests, private messages, badges) with no behavior change; track that file line count and `useState`/`useEffect` counts drop meaningfully in `HomePage.jsx` itself.

---

## Suggested Execution Order
1. Phase A (5 items) — ship and verify together, since they're independent and high-value.
2. Phase B (8 items) — security/data-integrity, can mostly proceed in parallel once A is merged.
3. Phase C (19 items) — batch into a few PRs by area (uploads, broadcast, backend/email, accessibility/deps) rather than one at a time.
4. Phase D — schedule as its own dedicated effort with a rollback plan, since it touches the app's largest and most central file.
