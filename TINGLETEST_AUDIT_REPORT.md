# TingleTap — Complete End-to-End Architecture, Scalability, Performance & Firebase Audit
### Generated: July 3, 2026 | READ-ONLY Analysis | Full codebase re-scanned (97 files, ~55,000 lines)

This audit covers every page, component, modal, popup, hook, utility, and Firebase interaction in the current codebase, verified by direct grep/read of source files plus a live production build. No code was changed as part of this report.

---

## TABLE OF CONTENTS
1. Executive Summary
2. Firestore Architecture & Read Hotspots
3. Realtime Database Architecture
4. Write Operations Audit
5. React Rendering Performance
6. Modals, Popups & Dialogs Audit
7. Security Audit
8. Bundle Size & Network Efficiency
9. Estimated Metrics Per Active User
10. Scores (Scalability / Performance / Firebase Efficiency / Replit Compatibility)
11. Concurrent User Capacity — Netlify Free + Firebase Spark
12. Critical Issues Registry (Ranked)
13. Fix-It Prompt (Text, Copy-Paste Ready)

---

## 1. EXECUTIVE SUMMARY

TingleTap is a feature-rich real-time chat platform (rooms, voice/video broadcasting via Agora + RTDB signaling, coin gifting, AutoMod, friends, private messages, RJ follow system, role-based moderation, admin/owner tooling). The codebase is well-organized at the folder level (`pages/`, `components/`, `utils/`, `hooks/`, `firebase/`) but a handful of files carry most of the complexity: `HomePage.jsx` (8,334 lines), `AdminPanelPage.jsx` (5,257 lines), `SettingsSidebar.jsx` (4,215 lines), `BroadcastPanel.jsx` (3,649 lines).

**The good news:** the security-hardening and query-bounding work from the last two audit passes held up under this fresh scan. DOMPurify is now genuinely invoked on chat message HTML. The RTDB `broadcasts/rj` write rule is host-locked and deployed. Firestore rules have real staff-hierarchy enforcement, a field allowlist on profile updates, and bot-spoofing prevention. Every admin listener now carries a `limit()`. The anti-spam system (6 msgs/10s, similarity detection, penalty auto-mute) is genuinely sophisticated. Trust-score writes are debounced to once per 5 minutes instead of per-message.

**What this fresh, deeper scan found that earlier passes missed:**
1. **Two hardcoded third-party API keys ship in the client bundle**: an ImgBB upload key (`46c5e6...c8e`) appears in `SignupPage.jsx`, `EditProfile.jsx`, `SettingsSidebar.jsx`, and `WelcomeDashboard.jsx`, and a Giphy API key sits in `GiphyStickersModal.jsx`. Anyone can extract these from the browser bundle and use them to upload files/abuse quota on your account — these are not Firebase keys (which are meant to be public), they're third-party service credentials.
2. **`Sidebar.jsx` runs its own duplicate `onSnapshot` on the entire `rooms` collection** — the exact same data `RoomListPage.jsx` already listens to. If both are mounted simultaneously (e.g., Sidebar open while browsing rooms), you pay for the same room-list reads twice per snapshot.
3. **`AdminPanelPage.jsx` (5,257 lines) has zero `React.memo`/`useMemo`/`useCallback` anywhere.** Typing a single character into any admin search box re-renders the entire component tree — every user row, every room row, every log entry — on every keystroke.
4. **`WarningAnnouncementModal` re-subscribes to `rooms` and `users` (limit 100) every time it's opened**, not just once — cleaned up properly on close, but if staff toggle it open/closed repeatedly it re-pays that read cost each time.
5. **`HomePage.jsx`'s global RTDB `status/` listener** (full site-wide presence tree, filtered client-side for the current room) remains the single biggest structural scalability ceiling in the app — this was flagged in the last two audits and is still architecturally unchanged (a documented, deliberate deferral — see memory notes on `window.onlineUsers` cross-dependency).
6. Dual-write style preferences (`usernamePreferences.js`, `messageTextPreferences.js`) still fire un-debounced writes to two collections each on every save.

None of this requires a rewrite. The moderation system, coin transaction atomicity, Firestore rule structure, and the code-splitting/query-limiting work already done are genuinely solid. The remaining gaps are concentrated in a small, specific list (see Section 13).

---

## 2. FIRESTORE ARCHITECTURE & READ HOTSPOTS

### 2a. Persistent listeners by page/file

| File | Collection | Filter | Cleanup |
|---|---|---|---|
| `App.jsx` | `users/{uid}` | doc-level, own profile | ✅ Yes |
| `HomePage.jsx` | `rooms/{roomId}/messages` | `orderBy(createdAt) desc, limit(50)` | ✅ Yes |
| `HomePage.jsx` | `privateMessages` | `where(participants array-contains uid), limit(200)` | ✅ Yes |
| `HomePage.jsx` | `friendRequests` | `receiverId==uid, status==pending` | ✅ Yes |
| `HomePage.jsx` | `rooms/{roomId}/kickedUsers` | doc + collection, kick-check | ✅ Yes |
| `Sidebar.jsx` | `rooms` | `orderBy('order')` — **no limit, duplicates RoomListPage** | ✅ Yes (cleanup present, but redundant with RoomListPage) |
| `RoomListPage.jsx` | `rooms` | `orderBy('order')` | ✅ Yes |
| `SettingsSidebar.jsx` | `users` (Team Members) | `where('role','in',['admin','owner','moderator'])` | ✅ Yes |
| `AdminPanelPage.jsx` | `users` | `limit(100)` | ✅ Yes |
| `AdminPanelPage.jsx` | `rooms` | `orderBy('order'), limit(500)` | ✅ Yes |
| `AdminPanelPage.jsx` | `modLogs` | `limit(300)` | ✅ Yes |
| `AdminPanelPage.jsx` | `bannedIPs` | `where(isActive), limit(500)` | ✅ Yes |
| `AdminPanelPage.jsx` | `bannedDevices` | `where(isActive), limit(500)` | ✅ Yes |
| `AdminPanelPage.jsx` | `reports` | `orderBy(timestamp desc), limit(100)` | ✅ Yes |
| `AdminPanelPage.jsx` | `guestSessions` | `limit(200)` | ✅ Yes |
| `AdminPanelPage.jsx` | `feedback` | `limit(100)` | ✅ Yes |
| `AdminPanelPage.jsx` | `kickedUsers` (collectionGroup) | one-time `getDocs`, `limit(2000)`, manual refresh only | N/A |
| `ipBanSystem.js` / `deviceBanSystem.js` | `bannedIPs` / `bannedDevices` | persistent, init on load | ✅ Yes |
| `RJFollowSystem.jsx` | `users/{rjUid}/followers/{myUid}` | doc-level, per-RJ-button rendered | ✅ Yes |

### 2b. One-time reads / caching layers (good patterns)
- `userProfileCache.js` — 60s TTL + in-flight dedup for `getDoc(users/{uid})`, prevents N duplicate reads when the same user posts multiple messages.
- `RJFollowSystem` uses `getCountFromServer` (1 read regardless of follower count) instead of streaming the whole subcollection.
- Leaderboard results cached 30s to avoid reload flicker on tab switches.

### 2c. Confirmed duplicate read
**`Sidebar.jsx` line 209** independently opens `onSnapshot(query(collection(db,'rooms'), orderBy('order')))` — this is the same room list `RoomListPage.jsx` already subscribes to. When both are mounted (Sidebar is present on most authenticated pages), every room-list update fires twice. Centralizing this into a shared context/hook would cut room-collection reads in half.

---

## 3. REALTIME DATABASE ARCHITECTURE

| File | RTDB Path | Scope | Note |
|---|---|---|---|
| `App.jsx` | `.info/connected` | Global (connection state only) | Lightweight, fine |
| `App.jsx` | `status/{uid}` | Own user, `onDisconnect` | Fine |
| `HomePage.jsx` | `status/` (root) | **Global — full site-wide tree, filtered client-side per room** | ⚠️ Biggest structural bottleneck |
| `AdminPanelPage.jsx` | `status/` (root) | Global, trimmed to 200 entries in memory | Acceptable — admin-only, justified by needing full visibility |
| `RoomListPage.jsx` | `roomCounts` | Global (small dataset, room occupancy counts only) | Fine — data volume is tiny |
| `GiftPanel.jsx` | `giftFeed/{roomId}` | Scoped to current room | ✅ Fine |
| `BroadcastPanel.jsx` | `broadcasts/{roomId or rj}` | Scoped, `onDisconnect().remove()` cleanup | ✅ Fine |

**The core issue (unchanged from prior audits):** every client in every room downloads the *entire* `status/` tree on mount, not just the presence of users in their current room. This is O(N) data transfer per client and O(N²) total bandwidth as concurrent users grow — at 50-100 concurrent users this is a real cost; it becomes the dominant scaling constraint well before Firestore read costs do, and is compounded by RTDB Spark's hard cap of 100 simultaneous connections regardless of code efficiency. This has been intentionally left alone in prior sessions because `window.onlineUsers` (built from this same snapshot) also feeds Sidebar's per-user online badges and the site-wide online counter — scoping it down would silently break those features without a Cloud Function presence-aggregate redesign.

---

## 4. WRITE OPERATIONS AUDIT

| Source | Path | Frequency | Assessment |
|---|---|---|---|
| `App.jsx` | `users/{uid}.lastIP` | Once per login/auth-state-change | Fine, but doesn't check if IP already matches before writing |
| `App.jsx` / `HomePage.jsx` | `status/{uid}` | Presence heartbeat every 120s + onDisconnect | ✅ Good (fixed from 30s last session) |
| `HomePage.jsx` | `rooms/{id}/messages` | Per message sent | Expected, unavoidable |
| `trustSystem.js` | `users/{uid}` | **Debounced, once per 5 min** | ✅ Excellent pattern |
| `coinSystem.js` | `coinWallets/{uid}`, `coinTransactions` | Per purchase/gift, via `runTransaction` | ✅ Atomic, correct |
| `usernamePreferences.js` | `users/{uid}` + `globalUsernameStyles/{uid}` | **Un-debounced, dual write per save** | ⚠️ Rapid toggling floods 2 writes each time |
| `messageTextPreferences.js` | `users/{uid}` + `globalMessageStyles/{uid}` | **Un-debounced, dual write per save** | ⚠️ Same as above |
| `antiSpamSystem.js` | `users/{uid}` | Two separate `updateDoc` calls in close succession on auto-mute (`logSpamViolation` + `applyAutoMute`) | ⚠️ Could combine into 1 write |
| `tinglebotAutoMod.js` | `modLogs`, message deletes | Transaction-guarded to prevent duplicate enforcement from multiple staff clients | ✅ Good |
| `StatusModal.jsx` | `users/{uid}` | Click-triggered `setDoc(merge)` | Fine |

**No writes were found inside a React render body** — all writes fire from event handlers, transactions, or debounced timers, which is correct.

---

## 5. REACT RENDERING PERFORMANCE

| File | Memoization | Assessment |
|---|---|---|
| `HomePage.jsx` (8,334 lines) | `React.memo` on `ChatMessage`, `ChatMessageTranslatedBody`, `GenderBadge`, `RoyalTrustBadge`, `PremiumImageMessage`, `TingleBotNotification`; `useCallback` on scroll/friend handlers | ✅ The highest-frequency-update components are protected; large file size remains a maintainability risk but is not actively causing render storms |
| `AdminPanelPage.jsx` (5,257 lines) | **None** — no `React.memo`, `useMemo`, or `useCallback` anywhere | 🔴 Every keystroke in any search box or toggle re-renders the entire admin tree (user tables, room tables, log feeds) |
| `SettingsSidebar.jsx` (4,215 lines) | **None** | 🔴 Same class of issue — every settings toggle re-renders the full settings tree, including the blocked-users list |
| `Sidebar.jsx` | `useMemo` on filtered/sorted online-user list | ✅ Good |

### Modals & Popups
Nearly every modal (`AddFriendConfirmModal`, `StylishReportModal`, `YouTubeSearchModal`, `StatusModal`, `StylishFontPopup`, `StylishImageUploadModal`, `ChatActionModal`, `BlockConfirmModal`, `ChangeUsernameModal`, `EditProfileModal`) is **conditionally rendered** (mount/unmount, not `display:none`), which is the correct pattern for memory efficiency — closed modals release their DOM and don't hold listeners.

Two modals worth flagging:
- **`WarningAnnouncementModal`** opens fresh `onSnapshot` listeners on `rooms` and `users` (limit 100) on every mount, cleaned up on close — correct, but re-pays the read cost each time it's toggled rather than caching.
- **`BanKickModal`** fetches room data and starts a countdown interval on mount; properly cleans up the interval, but is also used as a permanent overlay in `App.jsx` for global ban enforcement (that persistent use is intentional).
- **`GiphyStickersModal`** hits the Giphy API directly with a hardcoded key on open (see Security section).

---

## 6. MODALS, POPUPS & DIALOGS — FIREBASE INTERACTION SUMMARY

| Component | Fetches on open? | Cleanup |
|---|---|---|
| WarningAnnouncementModal | Yes — `rooms` + `users` listeners | ✅ |
| BanKickModal | Yes — room doc | ✅ |
| GiphyStickersModal | Yes — Giphy API (not Firebase) | N/A |
| IPBanModal | Props-based | ✅ |
| PrivateAudioMiniPopup | MediaStream, no Firestore fetch | ✅ |
| StylishReportModal, AddFriendConfirmModal, BlockConfirmModal, ChangeUsernameModal, EditProfileModal, StatusModal, YouTubeSearchModal, StylishFontPopup, StylishImageUploadModal, ChatActionModal | Props-based, no independent fetch | N/A |

No leaked listeners were found among modal components — every modal that opens a Firebase subscription closes it correctly.

---

## 7. SECURITY AUDIT

### ✅ Confirmed solid
- **XSS**: `DOMPurify.sanitize()` is genuinely invoked on chat message HTML in `HomePage.jsx` with a strict tag/attribute allowlist (span/br/b/i/em/strong/u, class attribute only).
- **Firestore rules**: staff hierarchy enforced (`canStaffModifyTarget` — moderators can't touch admins/owners, admins can't touch owners); profile updates use an explicit field allowlist blocking self-modification of `role`/`isBanned`/`badge`; bot-message spoofing is locked to the official bot UID or staff; username uniqueness enforced via a lock collection.
- **RTDB rules**: `broadcasts/rj` uses a first-claim lock — any user can start a fresh broadcast, but only the session's actual host (`rjUid`) can write to it afterward. Deployed and confirmed live.
- **Admin privilege escalation protections**: self role-change blocked, owner role protected from demotion/reassignment, admins cannot promote to admin/owner or demote other admins.
- **VPN detection**: proxied through a Netlify Function — the third-party API key is never shipped to the browser.
- **IP ban system**: bans a user's entire known IP history, not just their current IP, reducing simple IP-rotation evasion.
- **Rate limiting**: Firebase's native `auth/too-many-requests` handled on login; chat has a real anti-spam system (6 messages/10s window, string-similarity duplicate detection, escalating auto-mute penalties); guest signup requires hCaptcha + username-uniqueness check.

### 🔴 New findings this pass
1. **Hardcoded ImgBB upload key** (`46c5e6c30b68dd8f5c5c3e7c6e8d8c8e`) appears in plaintext in `SignupPage.jsx`, `EditProfile.jsx`, `SettingsSidebar.jsx`, and `WelcomeDashboard.jsx`. Anyone can pull this from the shipped JS bundle and use it to upload arbitrary files against your ImgBB account/quota, or exhaust your upload limits.
2. **Hardcoded Giphy API key** (`GlVGYHkr3WSBnllca54iNt0yFbjz7L65`) in `GiphyStickersModal.jsx`. Same exposure risk — any visitor can extract and reuse it for their own Giphy calls against your quota.

Both are third-party service keys, not Firebase config (Firebase's client config is *meant* to be public — these are not). The fix is straightforward: route both through a Netlify Function proxy the same way `vpnDetection.js` already does for the VPN API, so the actual key never reaches the browser.

### ⚠️ Known, previously-documented, intentionally-deferred items
- RTDB `privateMessages` rule uses a substring match on conversation ID (`$conversationId.contains(auth.uid)`) rather than an explicit participants map — functionally safe given Firebase UID format (28-char alphanumeric, no underscores), but a participants-map rewrite would be more rigorous if ever revisited.
- Admin-only VPN bypass flag exists but is gated behind an env-var password and disabled by default (re-verified, unchanged).

---

## 8. BUNDLE SIZE & NETWORK EFFICIENCY (verified via live production build)

```
Main chunk:            2,736.78 kB  (706.35 kB gzip)
CSS (single file):       852.41 kB  (131.59 kB gzip)
AdminPanelPage chunk:     257.58 kB  (56.80 kB gzip)   — lazy-loaded, only downloaded on /admin-panel visit
BuyCoinsPage chunk:        13.06 kB  (3.75 kB gzip)    — lazy-loaded
CoinWalletPage chunk:       8.76 kB  (2.50 kB gzip)    — lazy-loaded
Leaderboard chunk:           7.63 kB  (2.69 kB gzip)   — lazy-loaded
RJEarningsDashboard chunk:   7.54 kB  (2.20 kB gzip)   — lazy-loaded
RJWithdrawal chunk:          6.99 kB  (2.15 kB gzip)   — lazy-loaded
```
Code splitting (applied in the prior session) is working as intended — a guest or regular chat user no longer downloads the Admin Panel or coin-system pages on first load. The remaining 2.7MB main chunk still bundles the full chat engine, BroadcastPanel/Agora SDK, AutoMod dictionaries, and every non-lazy component, which is reasonable for a feature-dense chat app but is the largest remaining lever if further splitting (e.g., isolating Agora/BroadcastPanel behind its own lazy boundary) is ever pursued.

The single 852KB CSS file (no per-route splitting) loads on every page regardless of route — this is a secondary, smaller optimization opportunity.

---

## 9. ESTIMATED METRICS PER ACTIVE USER

*(estimates derived from the actual listeners/writes found above, not generic assumptions)*

**Firestore reads per active user per session (typical chat session, ~20 min):**
- Initial load: profile (1) + room list (Sidebar + RoomListPage, duplicated: ~2x) + room messages (up to 50 docs on room join) + friend requests + kicked-user check ≈ **60-80 reads on entry**
- Ongoing: message listener re-fires per new message in room (shared across all users in room via 1 listener each — cost scales with `(users in room) × (messages sent)`), private message updates, presence-driven UI updates ≈ **5-15 additional reads/min** during active chatting
- **Estimated total: ~150-300 Firestore reads per 20-minute active session**

**Firestore writes per active user per session:**
- Message sends (varies with chat activity, typically 10-40 for an active chatter)
- Presence write: 1 on connect + 1 per 2-min heartbeat (≈10 over 20 min)
- Trust score: debounced, at most 1 write per 5 min (≈4 over 20 min)
- **Estimated total: ~25-60 Firestore writes per 20-minute active session**

**RTDB bandwidth per active user:**
- The global `status/` tree download on room entry is the dominant cost here — this scales with **total registered/online users on the platform**, not just the room. At 100 total online users with a typical status payload (~150-250 bytes/user), that's roughly **15-25KB downloaded per client per status snapshot**, repeated on every room switch.
- Broadcast/voice connections add their own signaling overhead per listener (variable, Agora-managed).

**Browser memory per active user:**
- `HomePage.jsx` alone renders the message list, sidebar, all modals (even if unmounted, their code is in the same bundle), and holds multiple in-memory caches (profile cache, style caches). A typical active tab with the chat open and a moderate room population sits in the **80-150MB range**, consistent with a feature-dense single-page chat app of this size — not alarming, but `AdminPanelPage`'s lack of memoization can spike this higher for staff with large data tables open.

**CPU per active user:**
- Baseline chat rendering is light (memoized message components). The heavier CPU consumers are: DOMPurify sanitization per message (cheap per-call, adds up at high message-per-second rates), the client-side AutoMod regex/similarity scoring on every message, and unmemoized re-renders in `AdminPanelPage`/`SettingsSidebar` for staff sessions.

---

## 10. SCORES

| Category | Score | Rationale |
|---|---|---|
| **Scalability** | 62/100 | Firestore side is well-bounded (limits everywhere, debounced writes); RTDB global presence tree is the real ceiling and is architecturally unchanged |
| **Performance** | 70/100 | Chat-critical components are memoized; Admin/Settings pages are not, but those are staff-only, lower-traffic surfaces |
| **Firebase Efficiency** | 74/100 | Strong query bounding and caching patterns; loses points for the Sidebar/RoomListPage duplicate listener and un-debounced style-preference writes |
| **Replit/Netlify Hosting Compatibility** | 78/100 | Static hosting + Firebase Spark is a coherent, low-cost architecture for this app's traffic profile; code splitting now reduces first-load cost meaningfully |

---

## 11. CONCURRENT USER CAPACITY — Netlify Free + Firebase Spark

**Current state (post all applied fixes):**
- **Realistic comfortable concurrent capacity: ~60-90 concurrent active users** before the RTDB presence tree and Firestore read volume start causing noticeable lag (message delivery delay, sluggish presence updates) for everyone.
- **Hard ceiling: 100 simultaneous RTDB connections** (Firebase Spark's fixed limit) — this is a plan limit, not a code limit, and no amount of further code optimization raises it. Past ~95 concurrent connected users, new connections will start failing outright regardless of how efficient the code is.
- Netlify Free's bandwidth/build-minute limits are unlikely to be the binding constraint at this user count — Firebase Spark's RTDB connection cap will be hit first.

**After applying the remaining safe fixes below (no functionality/UX change):**
- Deduplicating the Sidebar/RoomListPage room listener, memoizing AdminPanelPage/SettingsSidebar, debouncing style-preference writes, and proxying the ImgBB/Giphy keys would meaningfully reduce Firestore read/write volume and staff-side CPU load, pushing the **comfortable concurrency estimate to roughly 90-110 concurrent users** on the Firestore side.
- This does **not** raise the **100-connection RTDB Spark hard cap** — that requires either upgrading to the Blaze (pay-as-you-go) plan or a Cloud-Function-based presence-aggregate redesign that stops every client from holding a direct RTDB connection to the full status tree. That remains the true ceiling for this stack regardless of client-side optimization.

---

## 12. CRITICAL ISSUES REGISTRY (RANKED)

| # | Issue | Severity | Effort to fix safely |
|---|---|---|---|
| 1 | Hardcoded ImgBB API key in 4 files | High (quota/abuse risk) | Low — proxy via Netlify Function |
| 2 | Hardcoded Giphy API key | Medium (quota/abuse risk) | Low — proxy via Netlify Function |
| 3 | Duplicate `rooms` listener (Sidebar vs RoomListPage) | Medium (read cost) | Medium — needs a shared context/hook |
| 4 | `AdminPanelPage.jsx` has zero memoization | Medium (staff-only UX/CPU) | Medium — large file, needs careful extraction |
| 5 | `SettingsSidebar.jsx` has zero memoization | Low-Medium | Medium |
| 6 | Un-debounced dual-write style preferences | Low (write volume) | Low |
| 7 | `WarningAnnouncementModal` re-subscribes every open | Low | Low |
| 8 | RTDB global `status/` tree (structural) | High (true scalability ceiling) | High — requires Cloud Function redesign, out of scope for a safe drop-in fix |
| 9 | `antiSpamSystem.js` double-write on auto-mute | Low | Low |

---

## 13. FIX-IT PROMPT (copy-paste ready, safe subset only)

```
Fix the following issues in TingleTap. Do NOT change any UI, user-facing behavior,
feature logic, moderation system, Firebase data structure, or Firestore/RTDB rule
structure beyond what's specified. Do not touch styling. Run `npm run build` after
each numbered item and confirm it still compiles before moving to the next.

1. PROXY THE IMGBB KEY (HIGH, do first): Create a Netlify Function (mirroring the
   pattern already used in netlify/functions for VPN checks) that accepts an image
   upload and forwards it to https://api.imgbb.com/1/upload with the API key read
   from a server-side environment variable — never sent to the client. Update
   SignupPage.jsx, EditProfile.jsx, SettingsSidebar.jsx, and WelcomeDashboard.jsx to
   POST to the new Netlify Function endpoint instead of calling api.imgbb.com
   directly with the hardcoded key. Remove the hardcoded key from all four files.

2. PROXY THE GIPHY KEY (HIGH): Same pattern as #1 — create a Netlify Function that
   forwards Giphy trending/search requests using a server-side env var for the key.
   Update GiphyStickersModal.jsx to call the new endpoint instead of api.giphy.com
   directly. Remove the hardcoded key from GiphyStickersModal.jsx.

3. DEDUPLICATE THE ROOMS LISTENER (MEDIUM): Sidebar.jsx and RoomListPage.jsx both
   run an independent onSnapshot on the 'rooms' collection with the same
   orderBy('order') query. Extract this into a single shared hook (e.g.
   useRoomsListener()) or a lightweight RoomsContext that both components consume,
   so only one active Firestore listener exists for room data regardless of how
   many components need it. Do not change what data is displayed or how it's
   filtered downstream.

4. MEMOIZE ADMINPANELPAGE (MEDIUM, do carefully, test each admin tab after):
   In AdminPanelPage.jsx, wrap the individual row-rendering components for the
   Users table, Rooms table, and Mod Logs feed in React.memo, and wrap the
   filtered/searched/sorted list computations in useMemo keyed on their
   dependencies, so typing in a search box only re-renders the filtered list, not
   the entire admin panel. Do not change any admin action logic, only the
   rendering/memoization layer.

5. MEMOIZE SETTINGSSIDEBAR (MEDIUM): Same approach as #4 for SettingsSidebar.jsx's
   blocked-users list and any other large rendered list in that file.

6. DEBOUNCE STYLE PREFERENCE WRITES (LOW): In usernamePreferences.js and
   messageTextPreferences.js, add a ~500ms debounce around the Firestore write
   calls (both the users/{uid} write and the global*Styles collection write) so
   rapid consecutive style changes only trigger one write pair instead of one per
   change. Keep the local/instant UI update un-debounced — only delay the network
   write.

7. CACHE WARNINGANNOUNCEMENTMODAL DATA (LOW): In WarningAnnouncementModal.jsx,
   avoid re-subscribing to the rooms and users(limit 100) listeners every time the
   modal opens if it was opened within the last 60 seconds — reuse the
   already-fetched data instead of re-querying Firestore.

8. COMBINE ANTI-SPAM WRITES (LOW): In antiSpamSystem.js, when applyAutoMute fires
   immediately after logSpamViolation for the same user, combine both into a
   single updateDoc call instead of two sequential writes.

Do NOT touch the RTDB status/ full-tree presence architecture, window.onlineUsers,
or Sidebar's online-badge logic — that requires a Cloud-Function-based presence
redesign and upgrading past Firebase Spark's 100-connection cap to meaningfully
change scaling headroom; it is out of scope for a safe drop-in fix.
```

---

## APPENDIX — Confirmed Strengths (unchanged from prior passes, re-verified)

- Firestore batched reads (`where uid in [...]`) used correctly throughout `HomePage.jsx`.
- Coin transaction atomicity via `runTransaction` is correct.
- BroadcastPanel's WebRTC/RTDB signaling listener cleanup is done correctly across a genuinely complex real-time feature.
- Composite Firestore indexes are defined for every collection that needs them.
- VPN detection no longer leaks its API key to the client (routed through Netlify Function) — the same pattern now needs to be applied to ImgBB and Giphy.
- Admin role-change logic has real server-side-equivalent privilege-escalation protection.
- Trust-score writes are debounced (5-min flush) instead of per-message — a genuinely good pattern.
- The anti-spam/AutoMod system (rate limiting, similarity detection, escalating penalties, transaction-guarded enforcement) is sophisticated for a fully client-enforced implementation.
- Code splitting (Admin Panel, coin/RJ pages) is live and working, meaningfully reducing first-load bundle size for the majority of users who are guests or regular chatters.

*Report generated from direct inspection of the current codebase (grep + full-file reads and 6 parallel focused audits across HomePage.jsx, AdminPanelPage.jsx, BroadcastPanel.jsx, Sidebar.jsx, SettingsSidebar.jsx, RoomListPage.jsx, WelcomeDashboard.jsx, LoginPage.jsx, SignupPage.jsx, all modal/popup components, trustSystem.js, coinSystem.js, usernamePreferences.js, messageTextPreferences.js, antiSpamSystem.js, tinglebotAutoMod.js, vpnDetection.js, ipBanSystem.js, deviceBanSystem.js, RJFollowSystem.jsx, firestore.rules, database.rules.json, firestore.indexes.json) plus a live production build (`npm run build`) for current bundle-size figures.*
