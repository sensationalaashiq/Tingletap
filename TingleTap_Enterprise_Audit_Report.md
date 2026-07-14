# TingleTap — Enterprise-Grade Audit Report
**Date:** July 14, 2026  
**Auditor:** Automated multi-agent codebase scan (8 specialist agents + 4 deep probes + shell analysis)  
**Scope:** Full codebase — src/, netlify/functions/, firestore.rules, database.rules.json, vite.config.js, netlify.toml, package.json  
**Codebase size:** 75,110 lines across 80+ files  
**Audit coverage:** 100% of files scanned, key files read in full

---

## Executive Summary

TingleTap has a solid Firebase security foundation with well-written Firestore rules, a working moderation pipeline, and good architectural intent — but carries **significant operational risk** in four areas:

1. **Two unauthenticated Netlify endpoints** that can send emails to arbitrary addresses and expose server environment variable names to any internet user — both are exploitable today with a single HTTP request.
2. **Massive God-component debt** — five files exceed 1,000 lines (largest: 9,013), containing hundreds of mixed concerns, 30+ `window.*` global bridges, and untested cleanup paths.
3. **Client-side-only enforcement** of spam detection, abuse detection, trust scoring, and achievement grants — all bypassable by anyone with browser dev-tools.
4. **147 ungated `console.log` calls** in production and a `localStorage`-trusting auth gate that can be spoofed before Firebase confirms identity.

---

## Issue Registry

### 🔴 CRITICAL

---

#### C-01 — Unauthenticated Diagnostic Endpoint Sends Email to Arbitrary Addresses
- **Severity:** Critical
- **File:** `netlify/functions/check-config.js`
- **Function:** `handler`
- **Root cause:** The function has zero authentication — no `verifyIdToken`, no IP allowlist, no shared secret. It accepts `?testEmail=<any>` as a query parameter and sends a live Brevo email to that address. It also reveals the **names and existence-status of 9 sensitive environment variables** including `FIREBASE_PRIVATE_KEY`, `R2_SECRET_ACCESS_KEY`, `BREVO_API_KEY`, `FIREBASE_CLIENT_EMAIL`, and both R2 bucket names/URLs in the response body.
- **Why it happens:** Built as a developer diagnostic tool, never locked down before deployment.
- **User impact:** Any external actor can (a) send phishing emails appearing to come from the TingleTap Brevo account to any address, (b) enumerate which secrets are configured and their string lengths, (c) confirm the Firebase project ID and client email — dramatically lowering the cost of further attacks.
- **Recommended fix:** Delete or disable this endpoint entirely in production. If needed for ops, gate with `timingSafeEqual` shared-secret header check AND restrict to Netlify deploy-preview environments only.
- **Estimated effort:** 30 minutes

---

#### C-02 — Unauthenticated Test Email Endpoint
- **Severity:** Critical
- **File:** `netlify/functions/email-test.js`
- **Function:** `handler`
- **Root cause:** No authentication. Accepts `?to=<email>` and sends a test email via Brevo. CORS is `*`.
- **Why it happens:** Same as C-01 — dev tool left unprotected.
- **User impact:** Free email spam/phishing relay using TingleTap's Brevo sender reputation. Brevo accounts get suspended for abuse; this can silently kill all transactional email (OTP, password reset) for real users.
- **Recommended fix:** Delete the file. Test emails should be sent via Netlify CLI locally, never via a live public endpoint.
- **Estimated effort:** 5 minutes (delete file + add to .gitignore pattern)

---

#### C-03 — ProtectedRoute Trusts `localStorage` Before Firebase Auth Resolves
- **Severity:** Critical
- **File:** `src/components/ProtectedRoute.jsx`
- **Function:** `ProtectedRoute` (useEffect)
- **Root cause:** The effect checks `localStorage.getItem('isGuest')` first and — if it finds guest data — immediately sets `loading = false` and returns, **never consulting Firebase auth**. An attacker can set `localStorage.isGuest = "true"` and `localStorage.guestUser = <crafted JSON>` in the browser console and gain access to any protected route with a fully controlled `uid` and `displayName`.
- **Why it happens:** Guest flow was bolted on after the Firebase auth flow, with localStorage as a fast-path shortcut.
- **User impact:** Authentication bypass. A malicious user can impersonate any UID string (not a real Firebase UID, but enough to access room pages and execute client-side actions). Also causes false "logged in" state during Firebase token refresh periods for registered users who have old guest localStorage data.
- **Recommended fix:** Remove the localStorage early-return. Always wait for `onAuthStateChanged`. Guest state should be managed via a React context fed by App.jsx's single auth listener, passed as props — not read from localStorage inside route guards.
- **Estimated effort:** 2 hours

---

#### C-04 — `heartbeatInterval` and `tryPostRule` setInterval Never Cleared
- **Severity:** Critical
- **File:** `src/pages/HomePage.jsx`
- **Function:** Multiple useEffects (~L2869, ~L1734)
- **Root cause:** `setInterval` calls for the presence heartbeat and post-automod-rule retry are created inside `useEffect` but the cleanup function either doesn't call `clearInterval` or the ref is overwritten before the cleanup fires. In React StrictMode (development), this creates two intervals; in production it leaks one interval per room visit.
- **Why it happens:** Interval ref was assigned but cleanup relied on a stale closure over the ref variable instead of using `useRef` to hold the interval ID.
- **User impact:** Every room visit accumulates a background interval. After 5 room hops, the user has 5 heartbeat intervals firing simultaneously, creating duplicate RTDB presence writes, inflated Firebase billing, and eventual tab slowdown.
- **Recommended fix:** Store interval IDs in `useRef`, return `() => clearInterval(intervalRef.current)` from every effect that creates an interval.
- **Estimated effort:** 1 hour

---

#### C-05 — VPN Bypass via `localStorage` — Security Control Trivially Disabled
- **Severity:** Critical
- **File:** `src/utils/vpnDetection.js`
- **Function:** VPN check handler
- **Root cause:** `if (localStorage.getItem('vpn_bypass') === 'true') return { isVpn: false }`. Any user can open DevTools → Application → Local Storage → add key `vpn_bypass` with value `true` and bypass all VPN/proxy/hosting detection permanently.
- **Why it happens:** Developer escape hatch left in production code.
- **User impact:** The entire VPN detection security control — intended to block ban-evasion via VPN — is trivially disabled by any user who reads this code (it is shipped in the client bundle). Banned users can bypass IP bans at will.
- **Recommended fix:** Remove the localStorage bypass entirely. If a staff override is needed, implement it as a Firestore flag on the user document (checked server-side) or as a custom Firebase Auth claim.
- **Estimated effort:** 30 minutes

---

#### C-06 — BroadcastPanel WebRTC PeerConnections Not Closed on Unmount
- **Severity:** Critical
- **File:** `src/components/BroadcastPanel.jsx`
- **Function:** Unmount cleanup / `rjStopAllBroadcasterConnections`
- **Root cause:** `pubHostPCs` (a ref Map of `RTCPeerConnection` objects) is iterated and connections closed in `rjStopAllBroadcasterConnections`, but this function is not reliably called on component unmount — only on explicit "End Broadcast" actions. If a user navigates away without clicking End, all peer connections leak. Additionally, the speaker-side `RTCPeerConnection` in `startSpeakerMode` is stored in a ref but not closed if the component unmounts while a session is active.
- **Why it happens:** Cleanup was written for the happy path (user clicks End), not for navigation/crash scenarios.
- **User impact:** Leaked WebRTC connections keep media tracks open (microphone access persists after leaving the page in some browsers), cause elevated memory usage, and trigger "black screen" in WebRTC stats. At scale, leaked TURN server allocations increase infrastructure cost.
- **Recommended fix:** Add a `useEffect` cleanup that calls `rjStopAllBroadcasterConnections()` unconditionally on unmount. Use `navigator.mediaDevices.getUserMedia` track refs to stop all tracks in cleanup.
- **Estimated effort:** 2 hours

---

#### C-07 — `pmListenerRef` Firestore Listener Leaked on Room/PM Transitions
- **Severity:** Critical
- **File:** `src/pages/HomePage.jsx`
- **Function:** PM `onSnapshot` setup (~L5472, L5976)
- **Root cause:** `pmListenerRef.current` is overwritten with a new `onSnapshot` unsubscribe function whenever a new PM thread is opened — but the old unsubscribe is never called before overwriting. On fast thread-switching, the previous listener remains active, delivering messages to the old callback indefinitely.
- **Why it happens:** Ref was used as a simple slot; the "close old before open new" pattern was missing.
- **User impact:** Each PM thread switch leaks one Firestore listener. After 10 PM conversations, 10 snapshot streams are running simultaneously. This manifests as duplicate message deliveries, incorrect unread counts, and measurable Firebase read billing growth.
- **Recommended fix:** Before overwriting `pmListenerRef.current`, call `if (pmListenerRef.current) { pmListenerRef.current(); }`. Also call it in the useEffect cleanup.
- **Estimated effort:** 30 minutes

---

### 🟠 HIGH

---

#### H-01 — `check-config.js` Reveals R2 Bucket URLs and Bucket Names
- **Severity:** High (companion to C-01)
- **File:** `netlify/functions/check-config.js`
- **Function:** `handler`
- **Root cause:** Response body includes `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`, and `R2_PUBLIC_BUCKET_URL` values when those vars are set.
- **User impact:** Attacker knows exact R2 bucket paths, enabling targeted enumeration of object keys and construction of direct R2 requests.
- **Recommended fix:** Covered by deleting the endpoint (C-01). If a slimmed version is kept, never echo env var values — only echo boolean `set/not set`.
- **Estimated effort:** Already covered by C-01 fix

---

#### H-02 — Client-Side-Only Spam and Abuse Detection (Bypassable)
- **Severity:** High
- **Files:** `src/utils/antiSpamSystem.js`, `src/utils/abuseDetection.js`
- **Function:** `checkSpam()`, `detectAbuse()`
- **Root cause:** Both systems run exclusively in the browser. `offenseHistory` in `abuseDetection.js` is an in-memory object — it resets on every page refresh. `antiSpamSystem.js` uses `setTimeout` for auto-unmute; if the tab is closed, the unmute never fires, leaving users stuck muted with no server-side record of when to unmute. Any user can bypass spam/abuse filtering by opening a new tab or refreshing.
- **Why it happens:** Implemented as fast client-side pre-checks; server-side mirror was never built.
- **User impact:** Determined bad actors can flood rooms with spam/toxic content by simply refreshing between messages. The auto-mute from `setTimeout` is also unreliable — if the browser crashes, the mute is permanent until a moderator manually unmutes.
- **Recommended fix:** Persist offense history to Firestore (`users/{uid}/abuseHistory`). Move mute state to `mutedInfo` in Firestore (already exists for manual mutes) and check it server-side in the Netlify `moderationAction` function. The client-side checks can remain as a fast pre-flight UX layer, but must not be the sole enforcement.
- **Estimated effort:** 3–4 days

---

#### H-03 — Client-Side Trust Score and Achievement System (Manipulation Risk)
- **Severity:** High
- **Files:** `src/utils/trustSystem.js`, `src/utils/achievementSystem.js`
- **Function:** `updateTrustScore()`, `checkAndGrantAchievements()`
- **Root cause:** Both systems write directly to Firestore from the client. Trust score is incremented client-side on `MESSAGE_SENT` events. Achievements are evaluated client-side and written with `updateDoc`. A user who can call `updateDoc(doc(db, 'users', uid), { trustRank: 100 })` from DevTools (blocked by rules) or who manipulates the client bundle can game both systems. The `_msgSentCache` in trustSystem is also unbounded (never cleared).
- **Why it happens:** Convenience — no backend function needed for every message.
- **User impact:** Trust scores and achievement titles are not trustworthy as moderation signals. High-trust users receive fewer automod checks — a manipulated trust score reduces moderation efficacy. Achievement badges displayed in chat could be forged.
- **Recommended fix:** Move trust score increments to a Netlify function triggered post-message (or use Firestore Security Rules with `request.resource.data.trustRank <= resource.data.trustRank + 1` to limit increment size). Verify achievement eligibility server-side before writing the badge.
- **Estimated effort:** 2–3 days

---

#### H-04 — 147 Ungated `console.log` Calls in Production Bundle
- **Severity:** High
- **Files:** Throughout `src/` (147 instances)
- **Root cause:** `console.log` calls were not gated behind `import.meta.env.DEV` checks before shipping to production.
- **Why it happens:** Debug logging was added during development and never audited before production.
- **User impact:** (1) User PII (UIDs, display names, email fragments, room IDs, IP addresses logged by VPN detection) is visible in browser DevTools to any user who opens the console. (2) Performance — V8's console infrastructure adds measurable overhead on hot paths like message rendering. (3) Reveals internal architecture details (collection names, RTDB paths, function names) useful for attackers.
- **Recommended fix:** Run `grep -rn "console\.log" src/` and wrap every instance in `if (import.meta.env.DEV) { ... }`, or use a `logger` utility that no-ops in production. Consider adding an ESLint `no-console` rule with `warn` level.
- **Estimated effort:** 2–3 hours

---

#### H-05 — `window.*` Global State Bridge — 30+ Assignments (Architectural Fragility)
- **Severity:** High
- **File:** `src/pages/HomePage.jsx`, `src/components/SettingsSidebar.jsx`, `src/components/BroadcastPanel.jsx`
- **Function:** Multiple useEffects
- **Root cause:** Cross-component communication happens via `window.*` assignments (`window.handlePrivateMessageFromSidebar`, `window.chatFontPreferences`, `window.onlineUsers`, `window.friendsProfiles`, `window.textareaRef`, etc. — 30+ total). SettingsSidebar alone reads 22+ `window.*` properties.
- **Why it happens:** Components that aren't in a parent-child relationship needed to communicate; `window` was used as an escape hatch.
- **User impact:** (1) Race conditions: if SettingsSidebar mounts before HomePage registers the handler, the call fails silently. (2) Memory leaks: window-registered functions close over stale React state. (3) Test impossibility: these globals make unit testing impossible. (4) StrictMode: double-mount in development overwrites the handlers with the second mount's versions.
- **Recommended fix:** Phase D-II (`HomePageBridgeContext`) — already planned. Priority should be accelerated given the race condition risk in production.
- **Estimated effort:** Phase D-II (planned, ~5–6 days)

---

#### H-06 — `WarningAnnouncementModal` — Unbounded `onSnapshot` on `rooms` Collection
- **Severity:** High
- **File:** `src/components/WarningAnnouncementModal.jsx`
- **Function:** useEffect (~L260)
- **Root cause:** `onSnapshot(query(collection(db, 'rooms'), orderBy('name')))` — no `limit()`. This subscribes to **every room document** in real time. As room count grows, this one listener's cost grows linearly. Additionally, `onSnapshot(query(collection(db, 'users'), limit(100)))` subscribes to 100 user documents in real time just to populate a target-user dropdown.
- **Why it happens:** Convenience — wanted a live room list for the announcement target selector.
- **User impact:** At 500 rooms, this single listener delivers 500 documents on open + every subsequent room creation/update. At scale this is a significant Firebase cost hotspot. The user listener (100 docs) is similarly wasteful for what is essentially a search-as-you-type field.
- **Recommended fix:** Replace the rooms `onSnapshot` with a one-time `getDocs` with `limit(200)` on modal open. Replace the users snapshot with a search-on-demand `getDocs` triggered by the search input (already partially implemented at L282).
- **Estimated effort:** 2 hours

---

#### H-07 — Direct `users/{uid}` Reads by Non-Owner Code (28+ Locations)
- **Severity:** High
- **Files:** `src/components/RJFollowSystem.jsx`, `src/components/Sidebar.jsx`, `src/components/StatusModal.jsx`, `src/components/StylishFontPopup.jsx`, `src/components/WarningAnnouncementModal.jsx`, `src/components/CoinWalletPage.jsx`, `src/components/ChangeUsernameModal.jsx`, `src/components/EditProfile.jsx`, `src/components/SettingsSidebar.jsx`, `src/pages/RoomListPage.jsx`
- **Function:** Various
- **Root cause:** The B1 migration moved `HomePage.jsx` reads to `publicProfiles`, but 28+ reads in other components still target `users/{uid}` directly. Since Firestore rules now restrict `users/{uid}` reads to the document owner or staff, these reads will produce `permission-denied` errors for any non-owner user reading another user's document.
- **Why it happens:** B1 only migrated `HomePage.jsx` and four profile-write files. The broader component sweep was not completed.
- **User impact:** **Active bug in production.** Friend system in `Sidebar.jsx` writing to `users/{friend.id}` will fail with `permission-denied`. `WarningAnnouncementModal` reading all users will fail for non-owner staff. `CoinWalletPage` reading another user's wallet doc will fail. Multiple features are silently broken for non-owner users right now.
- **Recommended fix:** Audit every `doc(db, 'users', X)` where `X !== auth.currentUser.uid`. Replace reads with `publicProfiles`. For writes (own doc), `users/{own-uid}` is allowed — add `syncPublicProfile()` call after each own-doc write to keep `publicProfiles` in sync.
- **Estimated effort:** 4 hours

---

#### H-08 — `coinSystem.js` N+1 Firestore Read Pattern
- **Severity:** High
- **File:** `src/utils/coinSystem.js`
- **Function:** `getRJWithdrawalInfoBatch()` (~L413)
- **Root cause:** `await Promise.all(chunk.map(uid => getDoc(doc(db, 'rjWithdrawalInfo', uid))))` — fetches each document individually instead of using `where(documentId(), 'in', chunk)`. For 10 RJs this costs 10 reads; for 100 RJs it costs 100 reads, all in parallel but each still billed individually.
- **Why it happens:** Individual `getDoc` calls are simpler to write; the `where(documentId(), 'in', [...])` pattern is less well-known.
- **User impact:** Admin coin/withdrawal panels generate excessive Firestore read costs at scale. Slow load times for withdrawal dashboards.
- **Recommended fix:** Replace with `getDocs(query(collection(db, 'rjWithdrawalInfo'), where(documentId(), 'in', chunk)))` for each batch of ≤10 UIDs.
- **Estimated effort:** 1 hour

---

#### H-09 — Five God-Component Files Creating Maintenance and Performance Debt
- **Severity:** High
- **Files:** `src/pages/HomePage.jsx` (9,013 lines), `src/pages/AdminPanelPage.jsx` (5,496 lines), `src/components/SettingsSidebar.jsx` (4,519 lines), `src/components/BroadcastPanel.jsx` (3,946 lines), `src/pages/LoginPage.jsx` (1,431 lines)
- **Root cause:** Features were added incrementally to existing files without extraction.
- **Why it happens:** Organic growth without architectural gates.
- **User impact:** (1) Any change to these files risks regressions across unrelated features. (2) React reconciliation must re-evaluate the entire component tree on every state change — with 117 `useState` calls in `HomePage.jsx`, any state change triggers expensive diffing. (3) Build time: Vite must parse these files on every HMR update. (4) Code review is nearly impossible, leading to bugs slipping through.
- **Recommended fix:** Execute Phase D-I and D-II (hooks extraction, component extraction) as planned. For `AdminPanelPage.jsx`, split each tab (Users, Rooms, Reports, Coins, Badges, RJ) into its own lazy-loaded component.
- **Estimated effort:** Phase D (planned, ~3 weeks)

---

#### H-10 — `siteVisitors` RTDB Node Has No Write Authentication
- **Severity:** High
- **File:** `database.rules.json` (`siteVisitors` subtree) / `src/utils/visitorTracking.js`
- **Root cause:** The `siteVisitors` active sessions subtree is writable by unauthenticated users or any auth user without UID scoping, allowing arbitrary data flooding.
- **Why it happens:** Visitor tracking was intentionally public for anonymous visitor counts, but the write scope is too broad.
- **User impact:** Any script can flood the `siteVisitors` node with arbitrary data, inflating visitor counts and potentially triggering Firebase RTDB billing limits. If the app shows live visitor counts on a landing page, the count can be manipulated.
- **Recommended fix:** Scope writes to `auth != null && auth.uid === $sid` where `$sid` is the session key. Unauthenticated visitors should receive a Firebase Anonymous Auth token before writing.
- **Estimated effort:** 2 hours

---

#### H-11 — `ProtectedRoute` Creates Its Own `onAuthStateChanged` Listener (Duplicate Subscription)
- **Severity:** High
- **File:** `src/components/ProtectedRoute.jsx`
- **Function:** `useEffect`
- **Root cause:** Every protected page mounts `ProtectedRoute`, each instance calling `onAuthStateChanged(auth, ...)` — creating a fresh Firebase auth subscription per protected route rendered. With 8+ protected routes, multiple auth listeners coexist simultaneously.
- **Why it happens:** Standalone auth checking without sharing the top-level auth state from App.jsx.
- **User impact:** Unnecessary Firebase Auth SDK overhead. Potential for different routes to see auth state at slightly different times (listener resolution order is not guaranteed). In React StrictMode, double-mount creates and destroys listener pairs, adding noise to auth state.
- **Recommended fix:** Remove auth logic from `ProtectedRoute`. Pass the already-resolved `user` and `loading` state from App.jsx via Context (or the `profile` prop already threaded to children). `ProtectedRoute` should be a pure gate: `if (loading) return <Spinner />; if (!user) return <Navigate />;`
- **Estimated effort:** 3 hours

---

#### H-12 — `receive-webhook.js` Has No Signature Verification
- **Severity:** High
- **File:** `netlify/functions/receive-webhook.js`
- **Function:** `handler`
- **Root cause:** Inbound Brevo webhook handler does not verify the webhook signature/shared secret. Any POST request to this endpoint is processed as a legitimate inbound email.
- **Why it happens:** Noted as a placeholder/basic implementation.
- **User impact:** Attackers can forge inbound emails and inject arbitrary content into the Owner Email Center's inbox. Depending on how the content is rendered, this could be an XSS vector.
- **Recommended fix:** Implement Brevo webhook signature verification using `timingSafeEqual(computedHmac, receivedHmac)`. Reject any request whose signature doesn't match.
- **Estimated effort:** 2 hours

---

### 🟡 MEDIUM

---

#### M-01 — `WarningsContext` Context Value Not Memoized (Full Re-render on Every Poll)
- **Severity:** Medium
- **File:** `src/contexts/WarningsContext.jsx`
- **Function:** Provider component
- **Root cause:** The `value` passed to `Context.Provider` is a new object on every render (every 5-minute poll). React's context propagation re-renders every consumer even if the data hasn't changed.
- **User impact:** Every 5 minutes, all components consuming `WarningsContext` re-render — even if there are no new warnings. Manifests as brief but perceptible re-render flash for users in rooms.
- **Recommended fix:** Wrap the context value in `useMemo`: `const value = useMemo(() => ({ warnings, loading }), [warnings, loading])`. Add a deep-equality check before calling `setWarnings` to avoid unnecessary state updates.
- **Estimated effort:** 30 minutes

---

#### M-02 — `userProfileCache` Unbounded Map Growth and Simultaneous-Fetch Race
- **Severity:** Medium
- **File:** `src/utils/userProfileCache.js`
- **Root cause:** The cache `Map` grows indefinitely — profiles are added but never evicted beyond their TTL (and even TTL-expired entries are only evicted on the next access). In a long-lived session with a busy room, thousands of entries accumulate. Additionally, two simultaneous cache misses for the same UID both trigger separate `getDoc` calls before either has resolved.
- **User impact:** Memory growth in long sessions (hours). Double-billing on simultaneous cache misses. Cache does not self-clean.
- **Recommended fix:** Add an `inFlight` Map to deduplicate concurrent fetches. Cap the cache at 500 entries with LRU eviction. Or use a WeakRef-based cache.
- **Estimated effort:** 2 hours

---

#### M-03 — AutoMod Word Filter Bypassable via Unicode Normalization
- **Severity:** Medium
- **File:** `src/utils/tinglebotAutoMod.js`
- **Function:** Word matching / regex filter
- **Root cause:** The banned-word regex runs on the raw message string without Unicode normalization (`String.normalize('NFKD')`). Homoglyph substitutions (e.g., `bàd`, `b​ad` with zero-width space, `ɓad`) bypass the filter entirely.
- **User impact:** Determined users can trivially evade AutoMod by inserting accented characters or zero-width joiners. The filter provides false confidence to moderators.
- **Recommended fix:** Normalize message text before matching: `msg.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\p{Cf}/gu, '')`. Also strip zero-width characters before the regex pass.
- **Estimated effort:** 2 hours

---

#### M-04 — Report Spam — No Rate Limiting in Firestore Rules or Server
- **Severity:** Medium
- **File:** `firestore.rules` (~L674), Netlify functions
- **Root cause:** The Firestore rule for `reports` allows any `notBanned()` user to create a report with no frequency check. A user can submit thousands of reports per minute.
- **User impact:** Report queue can be flooded, burying legitimate reports. Potentially triggers Firestore write quota alerts.
- **Recommended fix:** Add a Firestore rule rate-limit using `getAfter()` pattern, or better: route report submissions through a Netlify function that tracks reports-per-user-per-hour in a dedicated collection and rejects if over threshold (e.g., 10 reports/hour).
- **Estimated effort:** 3 hours

---

#### M-05 — `birthdayUtils.js` Timezone Bug — Birthday Shown a Day Off
- **Severity:** Medium
- **File:** `src/utils/birthdayUtils.js`
- **Function:** `isTodayBirthday()`
- **Root cause:** Uses `new Date()` (local browser timezone) to get today's `MM-DD` and compares against a stored `YYYY-MM-DD` string (which may have been written in a different timezone).
- **User impact:** Users in UTC+ timezones see their birthday badge appear a day early. Users in UTC- timezones may miss it entirely.
- **Recommended fix:** Compare using UTC: `new Date().toISOString().slice(5, 10)` vs `storedDate.slice(5, 10)`. Ensure birthday is stored and compared in UTC.
- **Estimated effort:** 30 minutes

---

#### M-06 — `StylishFontPopup.jsx` Writes to `users/{uid}` Without Syncing `publicProfiles`
- **Severity:** Medium
- **File:** `src/components/StylishFontPopup.jsx`
- **Function:** Font save handler (~L203, L272)
- **Root cause:** `updateDoc(doc(db, 'users', currentUser.uid), { chatFontPreferences: ... })` — saves font preferences without calling `syncPublicProfile()`. If `chatFontPreferences` is a field in `publicProfiles`, other users' views of this user's font style will be stale.
- **User impact:** Font preference changes not reflected for other room members until next full profile save.
- **Recommended fix:** Add `syncPublicProfile(uid, updatedData)` call after the `updateDoc`.
- **Estimated effort:** 30 minutes

---

#### M-07 — `BroadcastPanel.jsx` setInterval Leaks (micLevel + pubMicLevel timers)
- **Severity:** Medium
- **File:** `src/components/BroadcastPanel.jsx`
- **Function:** `startMicLevelMeter()`, `startPubMicLevelMeter()`
- **Root cause:** Both meter timers use `setInterval` stored in refs. While `stopMicLevelMeter()` calls `clearInterval`, this stop function is not called on component unmount in all code paths (only on explicit button actions). If the component is unmounted mid-broadcast, intervals persist.
- **User impact:** Background CPU usage from running mic-level analysis after leaving the broadcast page. Accumulates across navigation events.
- **Recommended fix:** Add a `useEffect(() => () => { stopMicLevelMeter(); stopPubMicLevelMeter(); }, [])` as an unconditional unmount cleanup.
- **Estimated effort:** 1 hour

---

#### M-08 — `SettingsSidebar.jsx` Direct DOM Manipulation Bypasses React
- **Severity:** Medium
- **File:** `src/components/SettingsSidebar.jsx`
- **Function:** Username style update handler (~L570)
- **Root cause:** `document.querySelectorAll('.username-element')` is used to directly mutate DOM node styles, bypassing React's virtual DOM entirely.
- **User impact:** Style changes applied this way are wiped on the next React re-render of those nodes. Creates a visible "flash" where the username reverts to its old style before React re-renders with the updated state. Also breaks SSR compatibility if ever added.
- **Recommended fix:** Update React state (`setGlobalUsernameStyles` or equivalent), let CSS variables or class names drive the visual update declaratively.
- **Estimated effort:** 2 hours

---

#### M-09 — Duplicate `onSnapshot` on Messages During Room Transition
- **Severity:** Medium
- **File:** `src/pages/HomePage.jsx`
- **Function:** Messages useEffect (~L1591, L5394)
- **Root cause:** Two separate `onSnapshot` calls target the messages subcollection in different effects. During a room switch, if the first effect's cleanup fires after the second effect sets up its listener, there is a window where both listeners are active simultaneously, delivering duplicate messages to state.
- **User impact:** Brief duplicate message flicker during room switching. Not data-corrupting but visually jarring. Also causes double Firestore read billing during transition.
- **Recommended fix:** Consolidate into a single `useChatMessages` hook (Phase D-I). Ensure new listener is established only after old one's `unsubscribe()` has been called.
- **Estimated effort:** Part of Phase D-I

---

#### M-10 — `ipBanSystem` and `deviceBanSystem` Load Up to 500 Docs Per Check
- **Severity:** Medium
- **Files:** `src/utils/ipBanSystem.js`, `src/utils/deviceBanSystem.js`
- **Root cause:** `limit(500)` is used to load ban lists. On every user join event, all 500 banned IPs/devices are fetched to the client for local comparison. This grows in cost as bans accumulate.
- **User impact:** At 500 banned IPs, every room join costs 500 Firestore reads. With 1,000 concurrent users joining rooms, this generates 500,000 reads per join wave. It also ships the entire ban list to every client — privacy concern.
- **Recommended fix:** Move ban checking to a Netlify function (server-side lookup: `where('ip', '==', callerIp)`). The client should never receive the full ban list.
- **Estimated effort:** 1 day

---

#### M-11 — Missing Content Security Policy Header
- **Severity:** Medium
- **File:** `netlify.toml`
- **Root cause:** `netlify.toml` sets `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` but has no `Content-Security-Policy` header.
- **User impact:** Without a CSP, any XSS vulnerability (even a minor one) can escalate to full script injection — stealing auth tokens, exfiltrating user data, or hijacking sessions. CSP is the last line of XSS defense.
- **Recommended fix:** Add a strict CSP: `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com; connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com; img-src 'self' data: blob: https://*.r2.dev https://randomuser.me; frame-ancestors 'none';`. Start with `Content-Security-Policy-Report-Only` to iterate without breaking the app.
- **Estimated effort:** 4 hours

---

#### M-12 — No Code Splitting for Large Components (SettingsSidebar, BroadcastPanel)
- **Severity:** Medium
- **File:** `vite.config.js`, `src/App.jsx`
- **Root cause:** `SettingsSidebar` (4,519 lines) and `BroadcastPanel` (3,946 lines) are statically imported and bundled into the main chunk. They are loaded even for users who never open a settings panel or join a broadcast.
- **User impact:** Initial bundle is significantly larger than needed. LCP (Largest Contentful Paint) is slowed for all users, even those on the basic chat-only flow.
- **Recommended fix:** Wrap both in `React.lazy(() => import('./components/SettingsSidebar'))` with `<Suspense fallback={<div />}>`. This defers ~400KB of JS until the component is actually needed.
- **Estimated effort:** 2 hours

---

#### M-13 — `VITE_ADMIN_BYPASS_PASSWORD` Exposed in Client Bundle
- **Severity:** Medium
- **File:** `src/config/security.js` (referenced), `vite.config.js`
- **Root cause:** Any `VITE_` prefixed environment variable is inlined into the client-side JS bundle by Vite. If `VITE_ADMIN_BYPASS_PASSWORD` is used for any privilege-sensitive check, its value is visible in the production JS bundle via DevTools.
- **User impact:** If this password gates any elevated access in the client, any user can extract it from the minified bundle. Privilege escalation risk.
- **Recommended fix:** Never use `VITE_` prefix for secrets. Admin bypass logic must run server-side in a Netlify function, where `process.env.ADMIN_BYPASS_PASSWORD` is never shipped to the browser.
- **Estimated effort:** 1 hour

---

#### M-14 — `serveMedia.js` — CORS Wildcard on Private Media
- **Severity:** Medium
- **File:** `netlify/functions/serveMedia.js`
- **Root cause:** `Access-Control-Allow-Origin: *` is set even for private chat media. This means any website can embed private media URLs in `<img>` tags and the browser will load them (though the auth token is still required, reducing actual risk).
- **User impact:** Private media is fetchable cross-origin by any website that knows the URL pattern. Not a direct breach if URLs are unguessable, but reduces defense-in-depth.
- **Recommended fix:** Set `Access-Control-Allow-Origin` to the specific app domain (`https://tingletap.app`) for private media paths. Public media can remain `*`.
- **Estimated effort:** 30 minutes

---

#### M-15 — `handleSendMessage` — No Server-Side Mute Guard (Client Bypass Possible)
- **Severity:** Medium
- **File:** `src/pages/HomePage.jsx`, `firestore.rules`
- **Root cause:** Mute enforcement in `handleSendMessage` relies on checking `userProfile.mutedInfo?.isMuted` from local React state. The Firestore rule for `rooms/{roomId}/messages` write uses `validMessageBase()` which checks uid ownership but **not muted status**. A muted user who calls `addDoc` directly (e.g., via Firebase console or a custom script) bypasses the mute.
- **Why it happens:** Firestore rules cannot efficiently check cross-document state (mute status lives in `users/{uid}`).
- **User impact:** Muted users who are technically sophisticated can continue sending messages.
- **Recommended fix:** Route message sends through a Netlify function that checks `mutedInfo.isMuted` from Firestore admin before writing. This is a significant architectural change but is the only server-enforced solution.
- **Estimated effort:** 2–3 days

---

### 🟢 LOW

---

#### L-01 — `rooms` and `usernames` Collections Allow `read: if true` (Unauthenticated Enumeration)
- **Severity:** Low
- **File:** `firestore.rules`
- **Root cause:** `allow read: if true` on `/rooms/{roomId}` and `/usernames/{username}` permits unauthenticated reads. Room names, descriptions, member counts, and the username reservation mapping are public.
- **User impact:** Bots can enumerate all room names and all reserved usernames without authentication. Username enumeration can be used for targeted social engineering.
- **Recommended fix:** Change to `allow read: if request.auth != null` unless there is a specific business requirement for pre-login access (e.g., public landing page showing room list). If public display is needed, expose only a curated subset via a Netlify function with rate limiting.
- **Estimated effort:** 1 hour

---

#### L-02 — `syncPublicProfile.js` — Missing Fields and Silent Error Swallowing
- **Severity:** Low
- **File:** `src/utils/syncPublicProfile.js`
- **Root cause:** `achievements` and `lastCleanCheck` (used by trust system) are not included in the synced public fields. Errors from the `setDoc` call are logged via `console.error` but not surfaced to the caller.
- **User impact:** Achievement badges may not appear for other users until the profile owner re-saves their full profile. Trust-system displays based on public profiles could show stale data.
- **Recommended fix:** Add `achievements` to `buildPublicProfile()`. Consider returning the promise so callers can optionally `await` it.
- **Estimated effort:** 30 minutes

---

#### L-03 — `Badges.jsx` Data File Is 827 Lines of Hardcoded SVG/Metadata
- **Severity:** Low
- **File:** `src/data/Badges.jsx`
- **Root cause:** All badge SVGs, metadata, and configuration are hardcoded in a client-side JS file.
- **User impact:** (1) Every user downloads all badge SVGs even if they have none. (2) Adding a new badge type requires a code deployment. (3) 827 lines of SVG in a JS file increases parse time.
- **Recommended fix:** Store badge metadata in Firestore (`/badges` collection). Serve SVGs from R2 as static assets. Lazy-load only the badges a user actually has.
- **Estimated effort:** 2 days

---

#### L-04 — Firebase Collection Names as Magic Strings (No Constants File)
- **Severity:** Low
- **Files:** Throughout `src/`
- **Root cause:** Strings like `'users'`, `'publicProfiles'`, `'rooms'`, `'reports'` are repeated across 40+ files.
- **User impact:** A typo in a collection name causes a silent Firestore miss (returns empty, not an error). Renaming a collection requires a codebase-wide search-and-replace.
- **Recommended fix:** Create `src/constants/collections.js` exporting `COLLECTIONS = { USERS: 'users', PUBLIC_PROFILES: 'publicProfiles', ... }` and use these everywhere.
- **Estimated effort:** 3 hours (create file + find/replace)

---

#### L-05 — `react` and `react-dom` Listed in Both `dependencies` and `devDependencies`
- **Severity:** Low
- **File:** `package.json`
- **Root cause:** Duplicate entries.
- **User impact:** npm/pnpm may resolve different versions for dev vs production. No current breakage but a latent version-mismatch risk.
- **Recommended fix:** Remove from `devDependencies`, keep in `dependencies`.
- **Estimated effort:** 5 minutes

---

#### L-06 — PropTypes Absent Throughout Components
- **Severity:** Low
- **Files:** `src/components/BroadcastPanel.jsx`, `src/components/SettingsSidebar.jsx`, `src/components/LuxuryPrivateMessageWindow.jsx`, `src/components/Sidebar.jsx`, and most other components
- **Root cause:** No PropTypes validation or TypeScript used.
- **User impact:** Wrong prop types cause silent runtime errors that are hard to trace. Missing required props are not caught during development.
- **Recommended fix:** Migrate to TypeScript (long-term) or add PropTypes to all major components (short-term). At minimum, add PropTypes to the 10 most-used components.
- **Estimated effort:** 1–2 weeks (TypeScript migration) or 2 days (PropTypes)

---

#### L-07 — SEO: Client-Side-Only Rendering, No Prerendering for Public Pages
- **Severity:** Low
- **File:** `vite.config.js`, `index.html`
- **Root cause:** Pure CSR (React) means search crawlers see an empty `<div id="root">`. The landing page, FAQ, and Terms pages receive no SEO benefit.
- **User impact:** Organic search traffic is minimal. Public pages (Landing, FAQ, Privacy, Terms) are not indexed with their actual content.
- **Recommended fix:** Add `vite-plugin-prerender` or switch public pages to a static-site approach (Astro, or pre-render with `react-snap`). Room pages don't need prerendering (they're behind auth).
- **Estimated effort:** 2–3 days

---

#### L-08 — `tingletap-logo.jpg` Not Converted to WebP (166KB)
- **Severity:** Low
- **File:** `public/tingletap-logo.jpg`
- **Root cause:** Logo is a 166KB JPEG.
- **User impact:** LCP is slower than necessary. WebP equivalent would be ~60–80KB.
- **Recommended fix:** Convert to WebP/AVIF using `squoosh` or `sharp`. Update references. Add `<link rel="preload" as="image">` in `index.html` for the logo.
- **Estimated effort:** 30 minutes

---

#### L-09 — `antiSpamSystem.js` Auto-Unmute `setTimeout` Fails on Tab Close
- **Severity:** Low
- **File:** `src/utils/antiSpamSystem.js`
- **Root cause:** Auto-unmute after spam timeout uses `window.setTimeout` in the browser. If the user closes the tab before the timeout fires, they remain muted with no server-side record of when they should be unmuted.
- **User impact:** Users who trigger the spam auto-mute and immediately close their tab remain muted indefinitely (until a moderator manually unmutes).
- **Recommended fix:** Write the mute with an `muteUntil: serverTimestamp() + duration` to Firestore. On next page load, check if `muteUntil` has passed and clear the mute.
- **Estimated effort:** 2 hours

---

#### L-10 — Missing `alt` Text on Dynamic Profile Images in Multiple Components
- **Severity:** Low
- **Files:** `src/components/EditProfile.jsx`, `src/components/Sidebar.jsx`, `src/pages/AdminPanelPage.jsx`
- **Root cause:** Dynamic avatar `<img>` tags use static `alt="Profile"` or empty strings rather than the user's `displayName`.
- **User impact:** Screen reader users hear "Profile" for every avatar instead of the user's name. Fails WCAG 2.1 AA criterion 1.1.1.
- **Recommended fix:** `alt={user.displayName || 'User avatar'}` on all profile images.
- **Estimated effort:** 1 hour

---

#### L-11 — `useTranslation` Hook Missing Dependency Arrays
- **Severity:** Low
- **File:** `src/hooks/useTranslation.js`
- **Root cause:** Some internal `useEffect`/`useCallback` calls within the hook have incomplete or missing dependency arrays, causing stale closure bugs on language change.
- **User impact:** Translation may not update when language preference changes mid-session.
- **Recommended fix:** Audit all hooks inside `useTranslation` for correct deps. Use `useCallback` with `[targetLang]` as the dep for the translate function.
- **Estimated effort:** 1 hour

---

#### L-12 — `moderationAction.js` Forwards Raw Firestore Error Strings to Caller
- **Severity:** Low
- **File:** `netlify/functions/moderationAction.js`
- **Root cause:** Firestore REST error responses are forwarded directly in the HTTP response body.
- **User impact:** Internal details (collection paths, field names, error codes) are visible to any caller who triggers an error. Low risk since the function is auth-gated, but still leaks implementation details to authenticated staff.
- **Recommended fix:** Return a generic `{ error: 'Moderation action failed' }` to the caller; log the full error server-side.
- **Estimated effort:** 30 minutes

---

#### L-13 — Staff Can Read All Private Messages (Privacy Concern)
- **Severity:** Low
- **File:** `firestore.rules` (`/privateMessages/{messageId}`)
- **Root cause:** `isStaff()` grants moderators, admins, and owners read access to all private messages between any two users.
- **Why it happens:** Added for moderation purposes.
- **User impact:** Users have a reasonable expectation of privacy in direct messages. If the Privacy Policy doesn't disclose that staff can read PMs, this may create legal/GDPR exposure. Even if disclosed, it is a significant trust concern.
- **Recommended fix:** Restrict PM staff access to `isOwner() || isAdmin()` (not moderators). Add explicit disclosure in the Privacy Policy. Consider end-to-end encryption for PMs (longer-term).
- **Estimated effort:** 30 minutes (rules change) + legal review

---

#### L-14 — `usernamePreferences.js` Is 827 Lines — Should Be Split
- **Severity:** Low
- **File:** `src/utils/usernamePreferences.js`
- **Root cause:** Single utility file handling too many concerns.
- **User impact:** Maintenance difficulty. Any change risks unintended side effects.
- **Recommended fix:** Split into `usernameStyleUtils.js` (visual), `usernamePrefsStorage.js` (storage), `usernamePrefsFirestore.js` (sync).
- **Estimated effort:** 2 hours

---

#### L-15 — Missing Rollup Chunking in Vite Config
- **Severity:** Low
- **File:** `vite.config.js`
- **Root cause:** No `build.rollupOptions.output.manualChunks` configured. All vendor libraries land in a single vendor chunk.
- **User impact:** First-load performance is suboptimal. A user loading the home page downloads Firebase, DOMPurify, react-toastify, and all other vendors in one request.
- **Recommended fix:** Add manual chunks: `{ firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'], vendor: ['react', 'react-dom', 'react-router-dom'] }`.
- **Estimated effort:** 1 hour

---

## Top 20 Highest Priority Issues

| Rank | ID | Issue | Severity | Estimated Effort |
|---|---|---|---|---|
| 1 | C-01 | Unauthenticated `check-config.js` — email relay + secret enumeration | 🔴 Critical | 30 min |
| 2 | C-02 | Unauthenticated `email-test.js` — free email relay | 🔴 Critical | 5 min |
| 3 | C-05 | VPN bypass via `localStorage.setItem('vpn_bypass','true')` | 🔴 Critical | 30 min |
| 4 | C-03 | `ProtectedRoute` trusts localStorage before Firebase auth | 🔴 Critical | 2 hrs |
| 5 | H-07 | 28+ direct `users/{uid}` reads by non-owner code — `permission-denied` in production | 🟠 High | 4 hrs |
| 6 | C-07 | PM listener leaked on every thread switch — duplicate messages + billing | 🔴 Critical | 30 min |
| 7 | C-04 | `heartbeatInterval` never cleared — accumulates per room visit | 🔴 Critical | 1 hr |
| 8 | H-12 | `receive-webhook.js` — no signature verification, forged email injection | 🟠 High | 2 hrs |
| 9 | C-06 | BroadcastPanel WebRTC connections not closed on unmount | 🔴 Critical | 2 hrs |
| 10 | H-04 | 147 ungated `console.log` calls — PII in browser console | 🟠 High | 2–3 hrs |
| 11 | H-10 | `siteVisitors` RTDB node — no write authentication | 🟠 High | 2 hrs |
| 12 | H-06 | `WarningAnnouncementModal` — unbounded `onSnapshot` on rooms collection | 🟠 High | 2 hrs |
| 13 | H-11 | `ProtectedRoute` spawns duplicate `onAuthStateChanged` per route | 🟠 High | 3 hrs |
| 14 | H-02 | Spam/abuse detection client-side only — bypassable by refresh | 🟠 High | 3–4 days |
| 15 | H-05 | 30+ `window.*` globals — race conditions and stale closures | 🟠 High | Phase D-II |
| 16 | M-11 | No Content Security Policy — XSS escalation risk | 🟡 Medium | 4 hrs |
| 17 | M-13 | `VITE_ADMIN_BYPASS_PASSWORD` in client bundle | 🟡 Medium | 1 hr |
| 18 | H-08 | `coinSystem.js` N+1 reads in withdrawal batch | 🟠 High | 1 hr |
| 19 | M-03 | AutoMod unicode bypass — filter trivially evaded | 🟡 Medium | 2 hrs |
| 20 | H-03 | Trust score and achievements client-side manipulable | 🟠 High | 2–3 days |

---

## Scores

| Dimension | Score | Rationale |
|---|---|---|
| **Security** | **41 / 100** | Two unauthenticated endpoints exploitable today (C-01, C-02), `localStorage` auth bypass (C-03), VPN bypass trivial (C-05), no CSP, no webhook verification, 147 console.log leaking PII. Firestore rules are well-written but client-side enforcement of all moderation controls is the systemic weakness. |
| **Performance** | **52 / 100** | Good: modular Firebase imports, lazy-loaded routes, PWA caching, profile cache. Bad: 9,013-line component with 117 useState re-renders everything on any state change, no manual Rollup chunking, SettingsSidebar/BroadcastPanel not lazy-loaded, 30+ window.* global reads cause stale renders, unbounded listeners in WarningAnnouncementModal, N+1 reads in coinSystem. |
| **Scalability** | **48 / 100** | Good: presence is per-room-scoped, messages use limitToLast(60), profile cache reduces Firestore reads. Bad: ban lists loaded client-side (500 docs per join), siteVisitors writable without auth (flooding risk), report spam possible, mute not enforced server-side, spam/abuse checks bypass at scale. At 500+ concurrent users several cost hotspots become critical. |
| **Architecture** | **44 / 100** | Good: Netlify functions for server-side actions, Firestore rules layering, publicProfiles split. Bad: 5 God-component files totaling 27,000+ lines, 30+ window.* global bridges replacing React context, client-side security enforcement throughout, no constants file, direct Firestore imports scattered across 40+ components with no service-layer abstraction. Phase D addresses this but hasn't started. |
| **Code Quality** | **55 / 100** | Good: consistent naming, clear comments, some JSDoc, existing hook extractions (useTranslation, useLiveDisplayName). Bad: 147 ungated console.logs, empty catch blocks swallowing errors silently, magic string collection names everywhere, no PropTypes/TypeScript, 14 files over 1,000 lines, duplicate code across SettingsSidebar and HomePage for font/theme logic. |
| **Maintainability** | **40 / 100** | The 9,013-line HomePage.jsx is an active maintenance crisis — any change risks regressions across 10+ unrelated features. SettingsSidebar (4,519) and AdminPanelPage (5,496) are not far behind. window.* bridges make tracing data flow nearly impossible without running the app. No tests exist (no test framework configured). Phase D-I/D-II will substantially improve this score. |
| **Accessibility** | **58 / 100** | Good: skip-nav link, lang="en-IN", structured data in index.html, some aria-labels. Bad: widespread use of `<div>` as buttons without `role="button"` or `tabIndex`, missing `alt` text on dynamic avatars, SVG badges lack `aria-label`/`<title>`, no keyboard navigation for dropdowns, no focus management on modal open/close, color contrast not audited. |
| **Overall Health** | **48 / 100** | A chat application with thoughtful Firebase architecture, good moderation foundations, and strong product feature depth — but carrying critical security debt in two endpoints exploitable today, systemic architectural debt in God-component files, and client-side-only security enforcement. With the Top 5 issues fixed, the score rises to ~62. Full Phase D completion brings it to ~72. |

---

## Recommended Immediate Actions (This Week)

### Day 1 — Stop the Bleeding (2 hours)
1. **Delete** `netlify/functions/check-config.js` and `email-test.js` (C-01, C-02) — 5 minutes
2. **Remove** `localStorage.getItem('vpn_bypass')` bypass from `vpnDetection.js` (C-05) — 30 minutes
3. **Fix** `pmListenerRef` — call old unsubscribe before overwriting (C-07) — 30 minutes
4. **Fix** `heartbeatInterval` clearInterval in useEffect cleanup (C-04) — 30 minutes

### Day 2 — Auth and Rules (4 hours)
5. **Fix** `ProtectedRoute` — remove localStorage early-return, wait for Firebase auth (C-03) — 2 hours
6. **Fix** `siteVisitors` RTDB rule — scope writes to `auth.uid === $sid` (H-10) — 30 minutes
7. **Add** signature verification to `receive-webhook.js` (H-12) — 2 hours

### Day 3 — B1 Migration Completion (4 hours)
8. **Fix** all 28+ remaining `users/{uid}` reads in non-owner components → `publicProfiles` (H-07) — 4 hours

### Day 4-5 — Production Hygiene (4 hours)
9. **Gate** all 147 `console.log` calls behind `import.meta.env.DEV` (H-04) — 3 hours
10. **Add** CSP header to `netlify.toml` (M-11) — 2 hours
11. **Move** `VITE_ADMIN_BYPASS_PASSWORD` logic to server-side (M-13) — 1 hour

**Estimated security score after Day 5 fixes:** 41 → 68 / 100
