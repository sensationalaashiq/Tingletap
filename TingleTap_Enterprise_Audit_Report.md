# TingleTap — Enterprise-Grade Codebase Audit Report
**Date:** July 13, 2026
**Scope:** Full read-only audit — authentication, routing, Firestore/RTDB, profile/media, messaging (private/room/homepage), broadcast/RJ live audio, admin/moderation/badge/RJ verification, Netlify Functions/server.js, performance, architecture, dependencies, accessibility, SEO.
**Method:** No code was modified. Findings below were gathered by 8 focused source-code reviews across the codebase (194 files in `src/`, 33 files in `netlify/`, plus `server.js`, Firebase rule files, and config) and verified against actual file contents.

> Note on scope: "every possible issue" across an app this size would run into hundreds of micro-findings. This report prioritizes **every issue that was concretely verified in the code**, organized by subsystem, so nothing high-value is buried. It intentionally omits speculative issues that could not be confirmed by reading the source.

---

## 1. Authentication, Routing & Session Handling

### 1.1 Guest login auth race condition — **High**
- **File:** `src/pages/LoginPage.jsx` — `handleGuestFormSubmit`
- **Root cause:** `localStorage.setItem('isGuest', 'true')` and guest profile metadata are written **after** `signInAnonymously()` resolves, but `onAuthStateChanged` in `App.jsx`/`ProtectedRoute.jsx` can fire before that metadata exists.
- **Why it happens:** Firebase auth state and localStorage are two independent, unsynchronized sources of truth updated in sequence rather than atomically.
- **User impact:** Guests can briefly see a null/incorrect profile or role flicker ("Member" instead of guest label) right after joining.
- **Fix:** Write guest metadata to localStorage (or Firestore) before calling `signInAnonymously`, or gate app rendering on both auth state AND profile-metadata readiness.
- **Effort:** M

### 1.2 Auth/interval listeners not fully cleaned up — **High**
- **File:** `src/App.jsx` (root auth `useEffect`)
- **Root cause:** Multiple listeners (`onAuthStateChanged`, profile `onSnapshot`, RTDB `onValue` for presence) and a ban-enforcement `setInterval` are initialized together; some paths lack a returned cleanup function.
- **Why it happens:** Effect has grown organically to own many concerns instead of one listener per effect.
- **User impact:** Memory leaks and duplicate listeners/intervals stacking up across logout → login cycles in a single session.
- **Fix:** Split into one `useEffect` per listener, each returning its own unsubscribe; clear intervals explicitly on unmount and on auth-state transitions.
- **Effort:** M

### 1.3 OTP hash stored in sessionStorage — **Medium**
- **File:** `src/utils/emailService.js`
- **Root cause:** `otp_hash_${email}` and expiry are kept client-side in `sessionStorage`.
- **Why it happens:** OTP verification is done client-side rather than server-side.
- **User impact:** XSS on the page could read/manipulate OTP verification state.
- **Fix:** Verify OTP server-side (Netlify function) rather than trusting a client-held hash.
- **Effort:** M

### 1.4 Duplicate/competing ban-enforcement mechanisms — **Medium**
- **File:** `src/App.jsx`, `src/pages/LoginPage.jsx`
- **Root cause:** Ban lockdown is enforced through three overlapping mechanisms: a 3-second `setInterval` poll, `window.history.replaceState` redirects, and CSS-only lock overlays — plus a separate localStorage-based ban flag vs. a Firestore-snapshot-based one.
- **Why it happens:** Layered fixes added over time without consolidating into one source of truth.
- **User impact:** CPU overhead from constant polling; possible redirect loops if the two ban sources disagree.
- **Fix:** Single Firestore-driven ban state feeding one React-level lockdown component; remove the polling interval and localStorage flag duplication.
- **Effort:** M

### 1.5 Non-idempotent StrictMode side effects — **Low**
- **File:** `src/App.jsx`
- **Root cause:** GA initialization, IP/VPN lookups, and RTDB presence writes run directly in `useEffect` without a "did this already run" guard.
- **Why it happens:** React 18 StrictMode double-invokes effects in development.
- **User impact:** Double-counted analytics events and redundant writes in dev; low risk in production builds but masks real bugs during development.
- **Fix:** Guard with a `useRef` sentinel or move analytics/presence init outside component lifecycle.
- **Effort:** S

---

## 2. Firebase Security & Data Layer (Firestore Rules, RTDB Rules, Indexes)

### 2.1 Users can self-edit trust/rank fields — **High**
- **File:** `firestore.rules`, `registeredProfileUpdate` (~line 152)
- **Root cause:** `trustScore`, `trustRank`, and `trustData` are included in the fields a regular authenticated user is allowed to write on their own profile document.
- **Why it happens:** These fields were likely added to the general allow-list instead of the `staffOnly` list.
- **User impact:** Any user can set their own trust score/rank via the client SDK, defeating the "Royal Trust System" moderation signal entirely.
- **Fix:** Move `trustScore`, `trustRank`, `trustData` into the staff-only field list (mirroring the existing pattern at ~line 164).
- **Effort:** S

### 2.2 Client-side role assignment attempts (defense-in-depth gap) — **Medium**
- **Files:** `src/pages/RoomListPage.jsx` (~L324), `src/pages/AdminPanelPage.jsx` (~L266)
- **Root cause:** Client code contains paths that attempt to set `role: 'owner'`/staff roles; rules currently block this on `create` and properly restrict `update`, but the client shouldn't be attempting privileged writes at all.
- **Why it happens:** Convenience code written against the assumption "rules will catch it," rather than never emitting the attempt.
- **User impact:** Currently blocked by rules, but any future rule regression becomes an instant privilege-escalation hole with no code-level backstop.
- **Fix:** Remove client-side role-setting code paths entirely; role changes should only ever originate from staff-triggered admin actions with explicit rule coverage.
- **Effort:** S

### 2.3 Unbounded/expensive queries used just for counts — **High**
- **Files:** `src/services/badgeApplicationService.js`, `src/services/rjApplicationService.js` (`getApplicationStats`)
- **Root cause:** `getDocs` pulls up to `limit(1000)` documents purely to count them for stats display.
- **Why it happens:** `getCountFromServer()` (aggregation queries) wasn't used.
- **User impact:** Firestore read costs scale linearly with collection size every time stats are viewed; will become expensive and slow as applications accumulate.
- **Fix:** Replace with `getCountFromServer()` aggregation queries.
- **Effort:** S

### 2.4 Missing/incomplete composite index coverage risk — **Medium**
- **Files:** `firestore.indexes.json` vs. various `.where()+.orderBy()` combinations across `src/`
- **Root cause:** Several moderation/report listeners in `BanKickMutePanel.jsx` combine filters and ordering without corresponding indexes verified for every combination (badge index is present and documented; not all admin queries were confirmed indexed).
- **Why it happens:** Indexes are added reactively when Firestore throws a "missing index" error, not audited proactively.
- **User impact:** Any newly added filter/sort combination not yet indexed will hard-fail in production with a console error and a blank list for the admin.
- **Fix:** Enumerate every `.where` + `.orderBy` pair used in the app and confirm each has a matching entry in `firestore.indexes.json`.
- **Effort:** M

### 2.5 No hardcoded secrets found — informational
- Firebase config, R2 credentials, and API keys were not found committed in the audited source files. Good practice already in place.

*(Also see §4 for RTDB-specific gaps in the broadcast/speaker paths, previously documented in project memory and still partially open — `announcements`/`youtube` RTDB nodes lack `onDisconnect` cleanup.)*

---

## 3. Profile, Avatar & Media/Upload System

### 3.1 Profile cache not invalidated on update — **Medium**
- **File:** `src/components/EditProfile.jsx` — `handleSubmit`
- **Root cause:** `photoURL` is updated via Firebase Auth `updateProfile` and Firestore `setDoc`, but `userProfileCache.js`'s cache entry is never invalidated/refreshed.
- **Why it happens:** The cache write path and the profile-edit write path were built independently.
- **User impact:** Components reading from the cache show the old avatar/name for up to the cache TTL (~60s) after a successful save, looking like the update silently failed.
- **Fix:** Call the cache's setter (e.g. `setCachedUserProfile`) immediately after a successful save.
- **Effort:** S

### 3.2 Avatar flicker risk in `LiveAvatar` — **Low**
- **File:** `src/components/LiveAvatar.jsx`
- **Root cause:** Component seeds state from a possibly-stale `baseSrc` prop, then a `useEffect` swaps to the live Firestore-driven value — creating one render where the wrong image briefly shows.
- **Why it happens:** Two competing sources of truth (prop vs. live listener) render before syncing.
- **User impact:** Momentary avatar "pop" on room/homepage load, most visible on slower connections.
- **Fix:** Initialize state lazily from the live source when available, falling back to prop only until the first snapshot resolves.
- **Effort:** S

### 3.3 No server-side MIME validation on uploads — **High**
- **Files:** `src/services/r2StorageService.js`, `src/components/EditProfile.jsx`, `src/components/StylishImageUploadModal.jsx`
- **Root cause:** File-size checks exist client-side (5MB) but `contentType` sent to R2 is trusted from the client with no re-validation; `StylishImageUploadModal.jsx` has no size check at all before processing.
- **Why it happens:** Validation was implemented only where convenient (one modal), not centrally.
- **User impact:** A crafted upload could mislabel content type (stored-content spoofing); very large files in the modal without a check can hang/crash the browser tab.
- **Fix:** Centralize file validation (type sniffing + size cap) in one shared util used by every upload entry point; validate again server-side before finalizing the R2 object.
- **Effort:** M

### 3.4 Zero retry logic on badge/RJ media uploads — **Medium**
- **File:** `src/services/r2StorageService.js` — `uploadMedia` (badges), `uploadRJMedia`
- **Root cause:** Unlike `uploadMediaFile` (2-attempt retry), these two upload paths have no retry at all.
- **Why it happens:** Retry logic wasn't factored into a shared helper.
- **User impact:** A transient network blip fails badge/RJ verification submission outright, forcing the user to redo the whole flow.
- **Fix:** Extract the retry wrapper from `uploadMediaFile` into a shared helper and apply to all upload paths.
- **Effort:** S

### 3.5 `URL.createObjectURL` leak on cancel — **Medium**
- **File:** `src/components/EditProfile.jsx` — `handleCropCancel`, `resetModal`
- **Root cause:** Object URLs created for image previews are revoked in `handleCropComplete` but **not** in the cancel/reset paths.
- **Why it happens:** Cleanup was added only on the success path.
- **User impact:** Repeated open/cancel cycles on the avatar uploader leak memory over a session.
- **Fix:** Revoke the object URL in every exit path (cancel, reset, unmount).
- **Effort:** S

### 3.6 R2 public URLs not covered by the service worker — **Low**
- **File:** `sw.js`
- **Root cause:** Caches `firebasestorage` and `randomuser.me` origins but not the R2 public bucket domain (`pub-xxxx.r2.dev`) actually used for user-uploaded avatars.
- **User impact:** Slightly slower repeat loads and avoidable egress for real user avatars.
- **Fix:** Add an R2 origin cache rule to `sw.js` matching the existing image-caching strategy.
- **Effort:** S

---

## 4. Messaging: Private Messages, Room Chat, Homepage Chat

### 4.1 Private messages cannot be deleted — **High**
- **File:** `src/components/LuxuryPrivateMessageWindow.jsx`, `src/pages/HomePage.jsx`
- **Root cause:** Room-message deletion exists (`deleteDoc` calls in `HomePage.jsx`), but there is no equivalent delete path wired into the private-message UI/collection.
- **Why it happens:** PM delete was never implemented, only room-chat delete.
- **User impact:** Users have no way to remove private conversations; data persists indefinitely, which is also a privacy/retention concern.
- **Fix:** Add delete affordance + `deleteDoc`/soft-delete-per-participant logic for `privateMessages`.
- **Effort:** M

### 4.2 `dangerouslySetInnerHTML` used for message/badge content — **High**
- **Files:** `src/pages/HomePage.jsx` (multiple sites, e.g. ~L239, L610, L4269, L7973)
- **Root cause:** Some message/badge rendering paths inject raw HTML instead of using `linkifyText.jsx`'s safe React-element output consistently.
- **Why it happens:** Mixed rendering strategies accumulated across features (badges vs. linkified text vs. plain messages).
- **User impact:** A crafted message or badge payload could execute arbitrary script in another user's browser (stored XSS).
- **Fix:** Replace all `dangerouslySetInnerHTML` message/badge rendering with React children or sanitize through DOMPurify before injection.
- **Effort:** M

### 4.3 Missing `useEffect` cleanup on several chat listeners — **Medium/High**
- **File:** `src/pages/HomePage.jsx` (e.g. ~L2373, L2383, L2929)
- **Root cause:** Several `onSnapshot`/listener-registering effects don't return an unsubscribe function.
- **Why it happens:** `HomePage.jsx` is a very large component (see §7.1) where effect hygiene is hard to track manually.
- **User impact:** Duplicate listeners accumulate across re-renders/room switches, driving up Firestore reads and causing occasional duplicate/ghost message renders.
- **Fix:** Audit every `onSnapshot`/`onValue` call in the file and ensure each returns its unsubscribe in the effect cleanup.
- **Effort:** M

### 4.4 No optimistic send / possible message flicker — **Medium**
- **File:** `src/pages/HomePage.jsx` — `handleSendMessage`, `handleSendPrivateMessage`
- **Root cause:** Messages aren't added to local state immediately on send; the UI waits for the `onSnapshot` round-trip with `serverTimestamp()`.
- **User impact:** Sent messages feel laggy, and the ordering can appear to jump once the server timestamp resolves.
- **Fix:** Add optimistic local insertion with a pending/sent state, reconciled by document ID when the snapshot arrives.
- **Effort:** M

### 4.5 No offline queue / retry on send failure — **Medium**
- **File:** `src/pages/HomePage.jsx` (send handlers)
- **Root cause:** Send failures show a toast/alert only; no retry button or offline queueing.
- **User impact:** Messages sent while briefly offline are silently lost from the user's perspective.
- **Fix:** Enable Firestore offline persistence and/or a local "failed — tap to retry" state.
- **Effort:** M

### 4.6 No typing-indicator debounce — **Low**
- No typing-indicator feature currently exists; flagged only so that if one is added, it must be debounced (~500ms) to avoid Firestore write spikes.
- **Effort:** S (preventative note)

---

## 5. Broadcast / RJ Live Audio System

### 5.1 WebRTC reconnect asymmetry — speaker audio stalls silently — **High**
- **File:** `src/components/BroadcastPanel.jsx` — `rjConnectToSpeaker` (host side, ~L1445) vs. `startSpeakerMode` (speaker side, ~L1142)
- **Root cause:** The RJ host clears and re-pushes a fresh offer on `connectionstatechange`, but the speaker only reacts to new RTDB nodes, not connection-state transitions. If the host overwrites the offer before the speaker notices its own ICE failure, both sides fall out of sync.
- **User impact:** Speaker shows "connected" but transmits no audio after a brief host-side network blip; requires a manual rejoin.
- **Fix:** Add a speaker-side `connectionstatechange` handler that calls `restartIce()` or forces a full renegotiation on `failed`/`disconnected`.
- **Effort:** M

### 5.2 Stale RTDB listeners accumulate on speaker retry — **Medium**
- **File:** `src/components/BroadcastPanel.jsx` — `rjConnectToSpeaker` (~L1400-1478)
- **Root cause:** `rjSpeakerUnsubs.current[speakerUid]` isn't cleared before re-initializing on retry/rejoin, so old `onValue`/`onChildAdded` listeners for the same speaker keep firing alongside new ones.
- **User impact:** Redundant signaling traffic and potential race conditions during reconnect attempts.
- **Fix:** Call and clear any existing unsub functions for `speakerUid` before creating new listeners.
- **Effort:** S

### 5.3 `songQueue`/`announcements`/`youtube` RTDB nodes not fully cleared — **Medium**
- **File:** `src/components/BroadcastPanel.jsx` — `handleEndBroadcast` (~L1714)
- **Root cause:** Only `songQueue` is explicitly cleared on end; `announcements` and `youtube` nodes are not, and none have `onDisconnect().remove()` registered, so an abrupt tab close leaves them stale.
- **User impact:** New broadcast sessions can start with leftover "ghost" songs/announcements from a previous session.
- **Fix:** Clear all three nodes on end, and register `onDisconnect().remove()` for each at broadcast start.
- **Effort:** S

### 5.4 Silent failure on microphone permission denial — **Medium**
- **File:** `src/components/BroadcastPanel.jsx` — `startLocalMic` (~L1762), `startSpeakerMode` (~L1080)
- **Root cause:** `getUserMedia` calls have no specific handling for `NotAllowedError`.
- **User impact:** UI hangs on "Connecting…" indefinitely with no feedback if the user denies mic access.
- **Fix:** Catch and branch on `NotAllowedError`, reset connecting state, show a clear toast.
- **Effort:** S

### 5.5 `AudioContext` never closed on the public mic meter — **Low**
- **File:** `src/components/BroadcastPanel.jsx` — `startPubMicLevelMeter`/`stopPubMicLevelMeter` (~L1834)
- **Root cause:** `stopPubMicLevelMeter` disconnects nodes but never calls `ctx.close()`.
- **User impact:** Repeated mic-check toggles can exhaust the browser's AudioContext limit, eventually breaking all audio on the page.
- **Fix:** Store the context in a ref, call `.close()` before creating a new one.
- **Effort:** S

---

## 6. Admin Panel, Moderation, Badge & RJ Verification

### 6.1 Moderation actions executed entirely client-side — **Critical**
- **File:** `src/pages/BanKickMutePanel.jsx` — `handleConfirmAction`
- **Root cause:** Ban/kick/mute/unmute actions write directly to Firestore/RTDB from the client SDK; the only gate is a client-side role check.
- **Why it happens:** No Cloud Functions layer exists for privileged moderation actions — everything relies on Firestore Security Rules as the sole backstop.
- **User impact:** Any weakening of the security rules (accidental or otherwise) turns into an immediately client-exploitable privilege escalation, since there is no server-side re-check of "is this caller actually staff" before the action executes.
- **Fix:** Move moderation writes behind callable Cloud Functions (or Netlify Functions with verified ID tokens) that re-check the caller's role server-side before writing.
- **Effort:** L

### 6.2 Unbounded queries for stats/counts — **High**
- *(Same root cause as §2.3, cross-referenced here)* `getApplicationStats` in `badgeApplicationService.js`/`rjApplicationService.js` pulls up to 1000 docs to produce a count.
- **Fix:** `getCountFromServer()`. **Effort:** S

### 6.3 Real-time listeners instead of paginated reads for reports/violations — **Medium**
- **File:** `src/pages/BanKickMutePanel.jsx`
- **Root cause:** Users, reports, and violations are all subscribed via `onSnapshot` without pagination, even though this data doesn't need to be live.
- **User impact:** Unnecessary Firestore read volume and memory footprint that grows with report/violation history.
- **Fix:** Switch reports/violations to `getDocs` with pagination; reserve `onSnapshot` for genuinely live data (active bans in effect).
- **Effort:** M

### 6.4 Admin notes / report reasons not sanitized — **Medium**
- **Files:** `src/components/AdminBanKickModal.jsx`, `src/pages/BanKickMutePanel.jsx`
- **Root cause:** Free-text `adminNotes`/`reason` fields are stored and later rendered without sanitization.
- **User impact:** XSS risk if a malicious string reaches an admin's rendered view (e.g. via a crafted report reason) or if an admin account is compromised.
- **Fix:** Sanitize on write or render through a safe-text component; never render as raw HTML.
- **Effort:** S

### 6.5 Kick/ban modal relies on a timeout rather than a live state check — **Low**
- **File:** `src/components/BanKickModal.jsx`
- **Root cause:** Modal auto-dismiss on expiry uses a fixed 1.2s timeout instead of reacting to the underlying ban/kick doc becoming null.
- **User impact:** Rare cases where the modal outlives the actual ban/kick state briefly (already partially mitigated per project memory's kick-expiry-pattern fix, but the modal's own dismiss logic is still timer-based).
- **Fix:** Dismiss immediately on a listener-driven state change rather than a timer.
- **Effort:** S

---

## 7. Performance & Architecture

### 7.1 `HomePage.jsx` is a monolith — **High**
- **File:** `src/pages/HomePage.jsx`
- **Root cause:** Single component exceeding ~5,000 lines, 116 state variables, 48 effects — covering chat, presence, broadcast UI hooks, modals, and profile sync all in one file.
- **User impact:** Indirect — this is why so many of the listener-cleanup and XSS findings above cluster in one file; it also slows down every future change and increases regression risk.
- **Fix:** Decompose into feature-scoped components/hooks (chat, presence, modals, broadcast bridge) each owning its own effects.
- **Effort:** L

### 7.2 Cross-component state sync via custom `window` events — **Medium**
- **File:** `src/App.jsx` → `src/pages/HomePage.jsx` (`_appUserProfileChanged` window event)
- **Root cause:** Profile updates are broadcast via a global DOM event instead of React context/state.
- **User impact:** Bypasses React's data flow, making updates harder to trace and more prone to missed/duplicate handling.
- **Fix:** Introduce a `UserProfileContext` and remove the window-event bridge.
- **Effort:** M

### 7.3 No code-splitting on the main chat surface — **Medium**
- **File:** `src/pages/HomePage.jsx` and heavy dependents (emoji picker, audio/video recorder, GIF search)
- **Root cause:** `App.jsx` lazy-loads routes, but `HomePage.jsx` itself pulls in heavy modal dependencies eagerly.
- **User impact:** Larger initial bundle for the most-visited page, slower first paint especially on mobile.
- **Fix:** `React.lazy` the emoji picker, media recorder, and search modals.
- **Effort:** M

### 7.4 Accessibility gaps — **Medium**
- **Files:** `index.html`, `src/pages/AdminPanelPage.jsx`, various icon buttons app-wide
- **Root cause:** No `<main>`/`<footer>` landmarks; generic or empty `alt` text on avatars; icon-only buttons without `aria-label`.
- **User impact:** Screen-reader users get poor navigation landmarks and no meaningful description for avatar images or icon actions.
- **Fix:** Add semantic landmarks, descriptive `alt` text tied to username, and `aria-label`s on icon buttons.
- **Effort:** M

### 7.5 SEO — no major issues found (informational)
- `index.html` metadata, `react-helmet-async` dynamic tags, hreflang, and JSON-LD structured data are already comprehensive and correctly implemented.

### 7.6 Deprecated/unstable dependency versions — **Low**
- **File:** `package.json`
- `express@5.x` (major version, less battle-tested than 4.x) is present as a dependency in what is primarily a client-side Vite project; `react-helmet-async@3.0.0` is behind current major releases.
- **Fix:** Confirm `express` is actually needed outside `server.js`'s scope, pin to a stable line, and evaluate upgrading `react-helmet-async`.
- **Effort:** S

### 7.7 Service worker cache size ceiling may admit bloated bundles — **Low**
- **File:** `sw.js` — `maximumFileSizeToCacheInBytes: 5MB`
- **User impact:** A future large JS chunk would still get cached, masking a bundle-size regression instead of surfacing it.
- **Fix:** Lower the ceiling and add a bundle-size budget check to the build (e.g. via Vite's `build.chunkSizeWarningLimit`).
- **Effort:** S

---

## 8. Netlify Functions & `server.js` Backend

### 8.1 Weak webhook signature validation — **High**
- **File:** `netlify/functions/receive-webhook.js`
- **Root cause:** Signature check is `sig.includes(WEBHOOK_SECRET)` — a substring check, not a constant-time HMAC comparison.
- **User impact:** A sufficiently determined attacker could potentially spoof inbound-email webhooks and inject fabricated messages into owner inboxes.
- **Fix:** Implement proper HMAC-SHA256 verification with `crypto.timingSafeEqual` per Brevo's documented webhook signing scheme.
- **Effort:** S

### 8.2 JWT payload read without signature verification in places — **Medium**
- **Files:** `server.js` (~L39), `netlify/functions/shared/firestoreAdmin.js` (~L38)
- **Root cause:** `decodeJwt` manually base64-decodes the payload (e.g., to check `exp`) without verifying the signature; actual authorization elsewhere does call the Firestore REST API, which validates implicitly, but the decoded-but-unverified claims are used for logic in between.
- **User impact:** Low direct exploitability today, but any future logic that trusts the decoded claims without the downstream verification becomes an auth bypass.
- **Fix:** Standardize on `admin.auth().verifyIdToken(token)` everywhere (already used correctly in `send-email.js`).
- **Effort:** S

### 8.3 Duplicated, diverging email logic between `server.js` and Netlify functions — **Medium**
- **Files:** `server.js` vs. `netlify/functions/send-email.js`, `contact.js`, `email-action.js`
- **Root cause:** Two independent implementations of email sending/rate limiting/HTML templating have drifted apart over time.
- **User impact:** Inconsistent email appearance/behavior depending on which path handles a given request; doubled maintenance effort.
- **Fix:** Consolidate on one implementation (Netlify functions, matching the project's stated Netlify-hosted architecture) and remove/deprecate the duplicate in `server.js`.
- **Effort:** M

### 8.4 Template loader path resolution is environment-fragile — **Medium**
- **File:** `netlify/functions/shared/templateLoader.js`
- **Root cause:** `getTemplatesDir` derives the templates path from `process.cwd()`/`import.meta.url`, which can resolve incorrectly once bundled/zipped by Netlify.
- **User impact:** Transactional emails (verification, password reset, etc.) can silently fail to render if the template file isn't found at runtime.
- **Fix:** Bundle templates as inline strings or use `included_files` in `netlify.toml` with a path verified against Netlify's actual function bundle layout.
- **Effort:** M

### 8.5 In-memory rate limiting doesn't survive horizontal scaling — **Medium**
- **Files:** `contact.js`, `sendOTP.js`, `sendPasswordReset.js`
- **Root cause:** Rate limits are tracked in a per-instance in-memory `Map`; Netlify functions are stateless/ephemeral and can scale to multiple instances or cold-start, resetting the map.
- **User impact:** Rate limiting is only nominally effective; determined abuse (spam via contact form or OTP requests) can exceed intended limits.
- **Fix:** Use a persistent store (e.g., Upstash Redis) for rate-limit counters.
- **Effort:** M

### 8.6 CORS wildcard on functions — **Low**
- **Files:** Multiple Netlify functions (`contact.js`, `receive-webhook.js`, etc.)
- **Root cause:** `Access-Control-Allow-Origin: *`.
- **User impact:** Low risk given most sensitive endpoints also require auth, but unnecessarily broad.
- **Fix:** Restrict to the production origin.
- **Effort:** S

---

## Top 20 Highest-Priority Issues

| # | Severity | Issue | File |
|---|----------|-------|------|
| 1 | Critical | Moderation actions (ban/kick/mute) executed entirely client-side with no server-side role re-check | `src/pages/BanKickMutePanel.jsx` |
| 2 | High | Users can self-edit `trustScore`/`trustRank`/`trustData` via Firestore rules gap | `firestore.rules` |
| 3 | High | `dangerouslySetInnerHTML` used for chat/badge content — stored XSS risk | `src/pages/HomePage.jsx` |
| 4 | High | Weak webhook signature check (`includes()` instead of HMAC) on inbound email webhook | `netlify/functions/receive-webhook.js` |
| 5 | High | No server-side MIME/type validation on uploaded media | `r2StorageService.js`, `EditProfile.jsx` |
| 6 | High | Private messages have no delete capability — orphaned data indefinitely | `LuxuryPrivateMessageWindow.jsx` |
| 7 | High | WebRTC reconnect asymmetry silently kills speaker audio after network blips | `BroadcastPanel.jsx` |
| 8 | High | Unbounded `getDocs(limit(1000))` used just to compute counts (badge/RJ stats) | `badgeApplicationService.js`, `rjApplicationService.js` |
| 9 | High | Missing `onSnapshot` cleanup across several chat effects → duplicate listeners | `HomePage.jsx` |
| 10 | High | `HomePage.jsx` monolith (~5000 lines, 116 state vars) drives many of the above bugs | `HomePage.jsx` |
| 11 | High | Guest login race condition between auth state and localStorage metadata | `LoginPage.jsx` |
| 12 | High | Auth/interval listeners not consistently cleaned up in root effect | `App.jsx` |
| 13 | Medium | Client-side code still attempts privileged role writes (rules-dependent backstop only) | `RoomListPage.jsx`, `AdminPanelPage.jsx` |
| 14 | Medium | Duplicated/diverging email logic between `server.js` and Netlify functions | `server.js` |
| 15 | Medium | Fragile template-path resolution can silently break transactional email | `templateLoader.js` |
| 16 | Medium | In-memory rate limiting ineffective across ephemeral Netlify instances | `contact.js`, `sendOTP.js` |
| 17 | Medium | Profile photo cache not invalidated on save — stale avatar shown after edit | `EditProfile.jsx` / `userProfileCache.js` |
| 18 | Medium | Admin notes/report reasons stored and rendered without sanitization | `AdminBanKickModal.jsx` |
| 19 | Medium | No optimistic send + no offline retry queue for chat messages | `HomePage.jsx` |
| 20 | Medium | Real-time (`onSnapshot`) listeners used for non-live admin data (reports/violations) instead of paginated reads | `BanKickMutePanel.jsx` |

---

## Scorecard

| Dimension | Score (/100) | Rationale |
|---|---|---|
| **Performance** | 58 | Functional but hindered by an oversized `HomePage.jsx`, missing memoization in hot paths, and no code-splitting on the busiest screen. |
| **Security** | 52 | One critical (client-side-only moderation enforcement) and several high-severity issues (rules gap, XSS vectors, weak webhook validation) bring this down; no committed secrets is a positive. |
| **Architecture** | 55 | Feature set is impressively broad and mostly modular (services/utils/components separation exists), but the central page component violates single-responsibility badly and state sync leans on window events instead of context. |
| **Scalability** | 50 | Multiple unbounded/count-via-full-scan queries, in-memory rate limiting, and real-time listeners on non-live data will all get materially more expensive as user/report volume grows. |
| **Code Quality** | 60 | Generally consistent patterns (hooks, services, shared utils) but inconsistent effect-cleanup discipline and duplicated backend logic between `server.js` and Netlify functions. |
| **Maintainability** | 55 | Extensive prior fix history shows the team can navigate the codebase, but the `HomePage.jsx` monolith and duplicated email logic actively work against future changes. |
| **Overall Health** | **55 / 100** | A feature-rich, actively maintained app with solid SEO and no leaked secrets, but carrying one critical security gap and enough accumulated complexity in its largest file that the next 6-12 months of feature work will get progressively slower and riskier without the top-priority fixes above. |

---

## Notes on Methodology & Coverage
- This audit read and cross-referenced: `firestore.rules`, `database.rules.json`, `firestore.indexes.json`, `firebase.json`, `src/App.jsx`, `src/pages/*` (HomePage, LoginPage, SignupPage, AdminPanelPage, BanKickMutePanel, RoomListPage, RoomSlugPage, etc.), `src/components/*` (BroadcastPanel, EditProfile, LuxuryPrivateMessageWindow, MinimizedConversations, LiveAvatar, badge/*, rj/*, modals), `src/services/*`, `src/utils/*`, `src/hooks/*`, `netlify/functions/*`, `server.js`, `package.json`, `vite.config.js`, `sw.js`, and `index.html`.
- No code was modified as part of this audit, per instructions.
- Line numbers cited are approximate locators at the time of this audit (July 13, 2026) and should be re-confirmed before patching, since the file may have shifted since.
