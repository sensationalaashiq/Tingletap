# TingleTap — Fix Prompt (derived from Enterprise Audit Report v2, July 13, 2026)

Use this as a work order. Each item lists: file(s), the concrete change to make, and how to verify it's done. Grouped into phases by priority/risk — do Phase A first (small, high-severity, low-risk fixes), then B, then C. Do **not** start the `HomePage.jsx` decomposition (Phase D) until A–C are merged and verified, since it touches nearly everything else in this list.

---

## Phase A — Critical & High severity, low/medium effort

### A1. Remove client-exposed API key fallback in password reset
- **File:** `netlify/functions/sendPasswordReset.js`
- **Change:** Delete the fallback to `VITE_FIREBASE_API_KEY`. If `FIREBASE_WEB_API_KEY` is unset, return a clear 500 error and log it — do not silently substitute the client key.
- **Verify:** Temporarily unset `FIREBASE_WEB_API_KEY` locally and confirm the function fails loudly instead of using the client key.

### A2. Sanitize all `dangerouslySetInnerHTML` sites
- **File:** `src/pages/HomePage.jsx` (message rendering, badges, room title SVGs, profile badges, birthday badge, achievement SVGs — 6 sites)
- **Change:** Either replace with plain React elements, or run all HTML through DOMPurify (`DOMPurify.sanitize(html, { ALLOWED_TAGS: [...], ALLOWED_ATTR: [...] })`) with a tight allowlist scoped to what each site actually needs (e.g. SVG tags for badges, no `<script>`/event-handler attributes anywhere).
- **Verify:** Attempt to inject a `<img src=x onerror=alert(1)>` style payload into a room title / message and confirm it's neutralized.

### A3. Fix WebRTC speaker reconnect asymmetry + race condition
- **File:** `src/components/BroadcastPanel.jsx`
- **Change:**
  1. In `rjConnectToSpeaker`, replace the `remove()` then `set()` sequence on the same RTDB path with a single `update()` call.
  2. Make the peer side rebuild its `RTCPeerConnection` (not just react to a new offer) whenever the host issues a reconnect, mirroring the host-side retry logic in `startSpeakerMode`/offer listener.
  3. Clear `rjSpeakerUnsubs.current[speakerUid]` before reassigning a fresh array in `rjConnectToSpeaker`, so old listeners are unsubscribed, not orphaned.
- **Verify:** Simulate a network drop for a speaker (toggle wifi/devtools throttle to offline briefly) and confirm audio reconnects without requiring a manual re-join.

### A4. Consolidate ban-enforcement into a single mechanism
- **Files:** `src/App.jsx`, `src/pages/LoginPage.jsx`
- **Change:** Remove the redundant intervals — keep one Firestore/RTDB-driven ban-state listener that feeds a single lockdown component. Delete the 3s poll, 2s "lockdown" interval, 20ms attempt loop, and the CSS-only lock in `LoginPage.jsx`, replacing all of them with the one listener.
- **Verify:** Ban a test user and confirm they're locked out immediately and consistently, with no duplicate toasts/redirect loops; check CPU profile shows no more competing intervals.

### A5. Fix `App.jsx` auth/listener cleanup + remove nested subscription
- **File:** `src/App.jsx`
- **Change:**
  1. Give the GA/visitor-tracking effect a proper cleanup return.
  2. Return `unsubscribeAuth` from the auth effect instead of leaving it dangling.
  3. Delete the nested `onAuthStateChanged` subscription created inside the outer auth callback (~L267) — consolidate into the single top-level listener.
  4. Add a `useRef` "already initialized" guard around `initGA`/`initVisitorTracking`/the RTDB presence write so StrictMode's double-invoke in dev doesn't create duplicates.
- **Verify:** Log in/out several times in dev and confirm (via console logging or a listener counter) that listener count doesn't grow; StrictMode double-mount doesn't create duplicate analytics/presence writes.

---

## Phase B — Medium severity, security & data-integrity

### B1. Restrict `users` collection read access
- **File:** `firestore.rules`
- **Change:** Replace the blanket `allow read: if request.auth != null;` on `users` with `allow read: if request.auth.uid == userId || <staff check>;`. If some fields need to stay publicly readable (display name, avatar, badges) for room rendering, split those into a separate `publicProfiles/{uid}` document that's kept in sync, rather than opening the whole document.
- **Verify:** As a signed-in non-owner test account, confirm you can no longer `getDoc` another user's full profile document; confirm room rendering (names/avatars) still works via the public subset.

### B2. Change private-message delete to per-participant soft delete
- **File:** `src/components/LuxuryPrivateMessageWindow.jsx` (`handleDeletePM`)
- **Change:** Add a `deletedFor: string[]` array field on PM documents. On delete, `arrayUnion(currentUid)` instead of `deleteDoc`. Filter messages where `deletedFor` includes the current user out of the rendered list. Only hard-delete once both participants have deleted it (optional cleanup job), or leave it as a soft delete indefinitely.
- **Verify:** User A deletes a message; confirm User B still sees it, and User A does not.

### B3. Replace remaining unbounded admin queries
- **Files:** `src/pages/BanKickMutePanel.jsx` ("unkick all" flow), `src/pages/AdminPanelPage.jsx` (`kickedUsers`)
- **Change:** Replace `getDocs(query(..., limit(1000-2000)))` used purely for bulk-action counts with either `getCountFromServer()` (for counts) or process in paginated batches (e.g. 100 at a time via `startAfter`) for bulk writes.
- **Verify:** With >1000 kicked-user records (or a mocked equivalent), confirm the unkick-all action completes without a single 1000-2000-doc client read.

### B4. Remove client-side privileged role-write attempts
- **Files:** `src/pages/RoomListPage.jsx` (~L324), `src/pages/AdminPanelPage.jsx` (~L266)
- **Change:** Delete the client-side `updateDoc(..., { role: 'owner' })` calls entirely; role changes should only ever go through the server-verified `moderationAction.js` path (or a new equivalent function if this is a different flow).
- **Verify:** Confirm the affected UI flows still work end-to-end via the server path, and grep confirms no remaining direct client writes to the `role` field.

### B5. Sanitize/length-cap admin notes and moderation reasons
- **Files:** `netlify/functions/moderationAction.js`, `src/pages/AdminBanKickModal.jsx`, `src/pages/BanKickMutePanel.jsx`
- **Change:** In `moderationAction.js`, cap `reason`/`adminNotes` to ~500 chars and strip HTML server-side before the Firestore write. On the client, sanitize before rendering in admin views too (defense in depth).
- **Verify:** Submit a moderation action with a 5000-character reason containing HTML tags; confirm it's truncated and tags are stripped in the stored document.

### B6. Move real-time listeners for reports/violations to paginated reads
- **File:** `src/pages/BanKickMutePanel.jsx`
- **Change:** Replace `onSnapshot` on `reports` and `modLogs`/violations with a one-time `getDocs` + manual "Refresh" button and/or cursor-based pagination, since this data doesn't need live updates.
- **Verify:** Confirm the panel loads a bounded first page and a refresh action fetches new data instead of a permanent listener running in the background.

### B7. Fix DoS-prone recursive Firestore value converter
- **File:** `server.js` (`fsVal` helper)
- **Change:** Add a max recursion depth (e.g. 10) and a max serialized-size check before conversion; reject the request with a 400 if exceeded.
- **Verify:** Send a deeply nested JSON payload (50+ levels) to the affected endpoint and confirm it's rejected quickly rather than consuming excessive CPU.

### B8. Stop silently swallowing audit-log write failures
- **File:** `server.js` (email audit-log write, `.catch(() => {})`)
- **Change:** Log the error (with context) instead of an empty catch; optionally write to a dead-letter mechanism.
- **Verify:** Force a Firestore write failure (e.g. bad credentials in a test) and confirm the error now appears in logs.

---

## Phase C — Medium/Low severity, quality & performance

### C1. Friend-request listener: stop re-fetching every sender profile per snapshot
- **File:** `src/pages/HomePage.jsx` (friend-requests `onSnapshot`)
- **Change:** Denormalize sender display name + avatar URL onto the friend-request document at creation time, or read through the existing shared profile cache instead of a fresh `Promise.all(getDoc)` on every snapshot.
- **Verify:** Trigger several friend-request updates in a row and confirm Firestore read count doesn't spike proportionally to (requests × updates).

### C2. Add optimistic send + basic offline retry for chat
- **File:** `src/pages/HomePage.jsx` (`handleSendMessage`, `handleSendPrivateMessage`)
- **Change:** Render the outgoing message immediately in local state with a "sending" indicator, replacing it with the confirmed doc once `addDoc`/snapshot resolves; on failure, keep it visible with a retry button instead of only a toast.
- **Verify:** Throttle network in devtools and confirm messages appear immediately and a failed send offers retry instead of disappearing.

### C3. Invalidate profile cache after edit
- **File:** `src/components/EditProfile.jsx` (`handleSubmit`)
- **Change:** Call the existing `setCachedUserProfile`/`invalidateCachedUserProfile` helper right after a successful save.
- **Verify:** Edit your avatar/name and confirm it updates immediately everywhere in the UI without a refresh.

### C4. Add retry logic to badge/RJ media uploads
- **File:** `src/services/r2StorageService.js` (`uploadMedia`, `uploadRJMedia`)
- **Change:** Reuse the existing 2-attempt retry pattern from `uploadMediaFile`.
- **Verify:** Simulate a transient upload failure and confirm it retries once before surfacing an error.

### C5. Fix object-URL leak on crop cancel
- **File:** `src/components/EditProfile.jsx` (`handleCropCancel` and reset path)
- **Change:** Call `URL.revokeObjectURL()` on the object URL created in `handleProfilePicChange` whenever the crop flow is cancelled or reset.
- **Verify:** Repeatedly open/cancel the crop modal and confirm no growing memory usage from unreleased object URLs (devtools memory profiler).

### C6. Close AudioContext instances that are no longer used
- **File:** `src/components/BroadcastPanel.jsx` (`stopPubMicLevelMeter`, speaker disconnects)
- **Change:** Call `.close()` on the AudioContext before nulling the ref.
- **Verify:** Join/leave the mic meter repeatedly and confirm AudioContext count doesn't grow (devtools performance/memory tab).

### C7. Clear RTDB nodes fully on broadcast end
- **File:** `src/components/BroadcastPanel.jsx` (`handleEndBroadcast` / `rjStopAllBroadcasterConnections`)
- **Change:** Also clear `songQueue`, `announcements`, and `youtube` RTDB nodes, and add `onDisconnect().remove()` registrations for these paths so an unexpected disconnect cleans them up too.
- **Verify:** End a broadcast and confirm all four RTDB subtrees (connections, listeners, speakerConnections, songQueue/announcements/youtube) are empty.

### C8. Guard against duplicate `onDisconnect()` registrations
- **File:** `src/components/BroadcastPanel.jsx` (`rjJoinAudio`, `pubJoinAudio`)
- **Change:** Track whether an `onDisconnect()` handler is already registered for the current session and skip re-registering.
- **Verify:** Repeatedly call the join flow and confirm only one disconnect handler is attached per session (log a counter in dev).

### C9. Add microphone-permission handling inside `startLocalMic`
- **File:** `src/components/BroadcastPanel.jsx`
- **Change:** Add the same `NotAllowedError` catch + toast used elsewhere directly inside `startLocalMic`, so it's handled regardless of caller.
- **Verify:** Deny mic permission in the browser and confirm a clear toast appears from this path specifically.

### C10. Consistent email masking and remove full-address logging
- **File:** `server.js`
- **Change:** Apply the same email-masking helper already used in `receive-webhook.js`/`send-email.js` to the logging call at ~L209.
- **Verify:** Send a test email and confirm logs show a masked address, not the full recipient.

### C11. Strip production console.log/console.error noise
- **File:** `src/pages/HomePage.jsx` (and any other hot paths)
- **Change:** Wrap debug logs behind a `DEBUG`/`import.meta.env.DEV` flag, or add a build-time plugin (e.g. `vite-plugin-remove-console`) to strip them from production builds.
- **Verify:** Build for production and confirm console output is clean during normal usage.

### C12. Fix PWA manifest conflict
- **File:** `vite.config.js`
- **Change:** Either let `VitePWA` generate the manifest from a single config object (remove `manifest: false` and the separate hand-written `manifest.json`), or explicitly document why both exist and ensure they're kept in sync.
- **Verify:** Confirm only one manifest source of truth exists and installed-PWA icons/theme match the app.

### C13. Adopt path aliases for shared imports
- **File:** `vite.config.js` (add `resolve.alias`), then update imports incrementally
- **Change:** Add an alias like `@/` → `src/`, and migrate `firebase/config` imports (and other frequently-relative-imported modules) to use it instead of inconsistent `../`/`../../` chains.
- **Verify:** Build succeeds; new imports use the alias; no behavior change.

### C14. Deduplicate email-sending logic
- **Files:** `server.js`, `netlify/functions/send-email.js`, `netlify/functions/contact.js`
- **Change:** Pick one implementation (recommend the Netlify functions, since they have the more current theming) as the source of truth; have `server.js` call into shared helpers instead of maintaining a second implementation.
- **Verify:** Send a transactional email through both the dev server path and the Netlify function path and confirm identical output/templates.

### C15. Add file-size check to `StylishImageUploadModal`
- **File:** `src/components/StylishImageUploadModal.jsx`
- **Change:** Add the same client-side 5MB check used in `EditProfile.jsx` before initiating upload.
- **Verify:** Attempt to select an oversized file and confirm an immediate client-side error instead of a wasted upload attempt.

### C16. Harden R2 key extraction
- **File:** `src/services/r2StorageService.js` (`extractR2Key`)
- **Change:** Parse the key by stripping a configured base-URL prefix (from env/config) with a clear fallback/warning log if the URL doesn't match, instead of a hardcoded pathname assumption.
- **Verify:** Test with both the default R2 URL and a custom-domain URL and confirm key extraction succeeds for both, logging clearly if not.

### C17. Add R2 domain to service worker cache rules
- **File:** `sw.js`
- **Change:** Add a cache rule for the R2 public domain(s) matching the existing pattern used for `firebasestorage`/`randomuser.me`.
- **Verify:** Load a page with R2-hosted images offline (after first visit) and confirm they render from cache.

### C18. Accessibility pass
- **Files:** `index.html`, `src/pages/HomePage.jsx` and other icon-heavy components
- **Change:** Add `<main>`/landmark roles to `index.html`; add meaningful `alt` text to the 13 currently-empty/generic image alts; add `aria-label` to icon-only buttons (prioritize the most-used ones first — this doesn't need to be all 765 in one pass).
- **Verify:** Run an automated accessibility audit (e.g. axe/Lighthouse) before/after and confirm the landmark and alt-text/aria-label violation counts drop.

### C19. Update deprecated dependencies
- **File:** `package.json`
- **Change:** Evaluate and upgrade `express` and `react-helmet-async` to their current stable majors; run the app's test/manual smoke checks afterward.
- **Verify:** App builds and core flows (auth, chat, broadcast) work unchanged after the bump.

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
