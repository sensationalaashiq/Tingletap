# TingleTap — Full-Depth Technical & Scalability Audit
**Date:** July 3, 2026
**Scope:** Complete `src/` tree, Firestore rules/indexes, RTDB rules, `package.json`, `vite.config.js`, and build output. No code was modified for this report.
**Method:** Direct file reads of all config files + build output, combined with 7 targeted deep-dive passes over every Firestore call, every RTDB call, every auth/presence code path, every messaging/notification code path, the admin/moderation stack, the coin/leaderboard stack, and React rendering/memory-leak patterns. Every finding below is tied to a specific file and line number found in the current codebase — nothing here is inferred without a code citation.

---

## 1. Executive Summary

TingleTap is a **fully-functional, feature-rich chat app** (8,412-line `HomePage.jsx` alone) with real presence, private messaging, whispers, voice/video broadcasts, gifting, and a comprehensive moderation stack. The code quality is good for a project of this size — most queries already carry `limit()` clauses, most listeners clean up correctly, and several past optimization passes (visible in `replit.md`'s changelog) have already fixed real leaks and hardened security rules.

However, the app is built on the **Firebase Spark (free) plan**, and the core architecture pattern used for the main chat — **one persistent Firestore `onSnapshot` listener per user, per room, on the `messages` subcollection** — has an unavoidable mathematical property: **Firestore realtime listeners are billed per-listener, per-document-change ("fan-out" reads)**. This is not a bug or a coding mistake; it is how Firestore's realtime layer is priced, and no amount of `useMemo`/`React.memo`/code-splitting fixes it, because it is a **server-side billing/quota mechanic**, not a client-side performance issue.

**Bottom line finding:** for the specific scenario the prompt asks about — users **actively chatting continuously for 24 hours** — the Firestore **daily read quota (50,000 reads/day, Spark plan)** is the first and by far the most severe bottleneck, and it is exceeded at a **much lower user count than 100**, even under conservative messaging-rate assumptions, *if a meaningful share of active users share the same room*. RTDB's 10 GB/month bandwidth cap and its 100-simultaneous-connection hard limit are the second and third bottlenecks respectively, and would also be hit within the 100–200 user range even without the Firestore issue.

---

## 2. Firestore Read/Write Pattern Inventory

### 2.1 Main chat (rooms/{roomId}/messages)
| Location | Query | Notes |
|---|---|---|
| `HomePage.jsx` ~L2794 | `onSnapshot(query(collection(db,'rooms',roomId,'messages'), orderBy('timestamp'), limit(100)))` | **Persistent listener, one per user per room they're in.** This is the dominant cost driver — see §7. |
| `HomePage.jsx` ~L2101 | `onSnapshot(collection(db,'rooms',roomId,'kickedUsers'))` | 🚩 **No limit.** Persistent, fires on every kick change in the room. Low document count in practice, but unbounded by definition. |

### 2.2 Private messages / whispers / friend requests / warnings
| Location | Query | Notes |
|---|---|---|
| `HomePage.jsx` ~L2633–2641 / L4663 | `onSnapshot(query(collection(db,'privateMessages'), where('participants','array-contains',uid), limit(200)))` | Global "all my conversations" listener, one per logged-in user. |
| `HomePage.jsx` ~L5402–5417 | `onSnapshot(query(..., where('conversationId','=='), orderBy('createdAt'), limit(30)))` | Opened only when a specific PM window is open; correctly torn down (`pmListenerRef.current`) when switched. |
| `HomePage.jsx` ~L2570–2580 | `onSnapshot(query(collection(db,'friendRequests'), where('receiverId','=='), where('status','=='), limit(100)))` | One per user, low volume. |
| `WarningsContext.jsx` ~L33–49 | `onSnapshot(query(collection(db,'warnings_announcements'), where(...), orderBy('createdAt'), limit(50 or 100)))` | Correctly shared via context — **one listener for the whole app**, not per-component. Good pattern. |
| Whispers | No separate listener — a whisper is a normal message in `rooms/{roomId}/messages` flagged `isWhisper:true`, filtered client-side (`HomePage.jsx` ~L368–373). Reuses the main room listener, so it adds no extra Firestore cost, only client-side render filtering. |

**N+1 patterns found (bounded via batching, but still additive cost):**
- `HomePage.jsx` ~L1732 / ~L3253: `fetchUsersInBatches` uses `where('uid','in',batch)` in chunks of 10 — correctly batched, not true N+1, but each batch is a full read of up to 10 docs.
- `Sidebar.jsx` ~L691/1104/1141/1164: per-row `getDoc(doc(db,'rooms',roomId,'kickedUsers',uid))` inside list rendering — this **is** a real N+1: one read per visible room row, per render pass that triggers it.
- `SettingsSidebar.jsx` ~L297/359: per-ID `getDoc` for blocked/friends lists instead of batched `where('uid','in',...)`.
- `coinSystem.js` ~L418: `getDoc` inside `Promise.all(chunk.map(...))` for RJ withdrawal info — parallelized but still 1 read per RJ per call.

### 2.3 Admin Panel (always-on while the panel is mounted)
`AdminPanelPage.jsx` opens **10 simultaneous persistent `onSnapshot` listeners** the moment it mounts:
`users` (limit 100), `rooms` (limit 100–500), `bannedIPs` (limit 50–500), `bannedDevices` (limit 50–500), `reports` (limit 50–100), `modLogs` (limit 300), `feedback` (limit 100), plus a 🚩 **unbounded** `activeSessions` listener (~L438) and the global RTDB `status` node (~L256, full-tree read).
Additionally: `AdminBanKickModal.jsx` ~L225 queries the entire `rooms` collection with `orderBy('name')` and **no limit** when a kick action is opened, and `AdminPanelPage.jsx` ~L759 does a `collectionGroup('kickedUsers')` scan capped at `limit(2000)` — the single most expensive read pattern in the app when triggered (worst case: 2,000 reads in one call).

This is bounded and low-frequency (only paid staff/admins open this panel), so it is **not** a primary scalability constraint, but each open admin session does consume a non-trivial one-time read budget (~2,000–3,000 reads on mount) plus incremental reads on every change across all those collections.

### 2.4 Coin system & Leaderboard
All coin-related listeners (`coinSystem.js`) carry `limit()` (50–500) and most are per-user (wallet, own transactions) rather than global — low fan-out risk. The two shared/global listeners are `Leaderboard.jsx` (`coinTransactions`, `limit(500)`) and `coinSystem.js`'s `subscribeAllRJEarnings` (`limit(100)`) — every user who opens the Leaderboard tab adds one more listener on the same 500-doc query, so fan-out cost scales with **concurrent Leaderboard viewers**, not total users. No hard spam guard exists on gift-sending beyond the Firestore transaction's balance check — a user could technically fire many small gifts in rapid succession, each triggering ~5 writes (`coinSystem.js` ~L151: sender wallet, receiver wallet, sender tx, receiver tx, RJ earnings/gift record).

---

## 3. Realtime Database (RTDB) Inventory

| System | Path(s) | Pattern | Per-user cost |
|---|---|---|---|
| Connection tracking | `.info/connected` (`App.jsx`) | 1 listener | part of the 1 base connection |
| **Presence** | `status/{uid}` | Write on mount/room-change + `onDisconnect` + **heartbeat every 120s** (`HomePage.jsx` L2462–2468, confirmed in current code) | 1 write/120s |
| **Presence (read side)** | `status` (whole node) | **Single global `onValue` listener per user** reading the *entire* status tree (`HomePage.jsx` ~L3307, `AdminPanelPage.jsx` ~L256) | 1 persistent listener, downloads every other user's presence delta |
| Room occupancy | `roomCounts` | 1 global listener while on room list (`RoomListPage.jsx`) | 1 listener |
| Broadcast/RJ (WebRTC signaling) | `broadcasts/rj/*` | 1–2 metadata listeners if just watching; 3–6+ signaling listeners per active peer connection if actually broadcasting | 1–6+ depending on role |
| Gifts | `giftFeed/{roomId}` | `onChildAdded`, open only while a gift panel is visible | 0–1 |

**Key structural fact:** every user consumes **exactly one RTDB client connection** (one WebSocket) regardless of how many `ref()`/`onValue()` paths they subscribe to on it — RTDB's "100 simultaneous connections" Spark cap counts **sessions**, not listeners. So the connection cap is a hard, flat ceiling around **~100 concurrent browser tabs**, independent of usage pattern.

**Bandwidth is the more subtle risk.** Because the presence *read* side is one global listener per user on the *whole* `status` node, every single heartbeat write from any one user gets pushed down to **every other user's** listener. This is the same O(N²) fan-out shape as the Firestore chat listener, just on the RTDB bandwidth meter instead of the Firestore read meter (already flagged in a prior session's memory as a known, currently-unresolved growth pattern — confirmed still present in current code).

---

## 4. Authentication & Ban-Lockdown System

10 distinct `onAuthStateChanged` listeners exist across the app. Two are not cleanly unsubscribed:
- `App.jsx` ~L166 (primary) and its nested ban-checker at ~L197 — the returned `unsubscribeAuth` is never actually invoked/returned from the effect.
- `App.jsx` ~L377: `onSnapshot(userDocRef, ...)` (the real-time "ban hammer") has **no cleanup function at all** — this listener stays attached for the lifetime of the tab.

The rest (`ProtectedRoute.jsx`, `LoginPage.jsx`, `SignupPage.jsx`, `WelcomeDashboard.jsx`, `WarningsContext.jsx`, `ipBanSystem.js`, `deviceBanSystem.js`) all clean up correctly.

The ban-lockdown mechanism itself (`App.jsx`) is aggressive by design: forced sign-out, `localStorage` persistence flag, UI freeze via inline styles, and a **re-enforcement interval every 2–3 seconds** (`App.jsx` ~L280, ~L423) plus a separate inactivity timer (~L755) — none of these intervals are cleared, so if a user is banned then unbanned then banned again within one tab session without a full page reload, multiple overlapping intervals can stack up. This is a minor, rare-path leak (only affects banned-user sessions), not a general scalability concern.

---

## 5. React Rendering Performance & Memory Leaks

**File sizes** (top 5): `HomePage.jsx` 8,412 lines, `AdminPanelPage.jsx` 5,260, `SettingsSidebar.jsx` 4,215, `BroadcastPanel.jsx` 3,649, `WelcomeDashboard.jsx` 1,870.

**Memoization coverage:** 26 components are already wrapped in `React.memo` (including the just-extracted `MessageList` and pre-existing `ChatMessage`/`ChatMessageTranslatedBody`), covering essentially every modal/popup in the app plus the message list itself. **Not memoized:** `Sidebar.jsx` (has internal `useMemo` on its filtered list but the component itself isn't memoized), `SettingsSidebar.jsx` (4,215 lines, unmemoized), `AdminPanelPage.jsx` (5,260 lines, unmemoized — acceptable since it's not on the hot path for regular users).

**Confirmed leaks (not fixed by this audit — reporting only):**
- `App.jsx`: `banEnforcementInterval` (~L280) and `banLockdownInterval` (~L423), both assigned to `window`, are never cleared.
- `App.jsx` ~L377: the ban-hammer `onSnapshot` has no cleanup (noted above).
- `HomePage.jsx`: multiple hardcoded 3-minute `setTimeout`s that delete TingleBot messages (~L1266, 1299, 1326, 4007+) have no cancellation path if the component unmounts before they fire.
- `LoginPage.jsx` / `SignupPage.jsx`: `ipBanInterval` / `loginBanInterval` are declared but not cleared in a `useEffect` cleanup.

**Confirmed correct (already fixed in prior sessions):** the room-chat heartbeat interval, `WarningsContext`'s listener, `useRoomsListener.js`'s ref-counted singleton pattern, `ipBanSystem.js`/`deviceBanSystem.js`'s manual cleanup methods, and the newly-extracted `MessageList`'s `useStableCallback`-based prop wiring.

**Expensive unmemoized render-body work:** `HomePage.jsx` still computes `liveUsers.map(buildFromStatus)` and `onlineUserIds.filter(...)` on every relevant render (~L3237–3242), and conversation-ID strings (`[...].sort().join('_')`) are recomputed inline rather than memoized in several places. `AdminPanelPage.jsx` filters/maps its user and report lists directly in JSX without `useMemo`.

---

## 6. Bundle Size & Build Configuration

Current production build (`npm run build`, verified this session):

| Chunk | Size (raw / gzip) |
|---|---|
| Main bundle (`index-*.js`) | 2.75 MB / 710 KB |
| `AdminPanelPage` (lazy chunk) | 257.6 KB / 56.8 KB |
| `BuyCoinsPage`, `CoinWalletPage`, `Leaderboard`, `RJEarningsDashboard`, `RJWithdrawal` (lazy chunks) | 7–13 KB each / 2–4 KB each |
| Main CSS | 852 KB / 132 KB |

Code-splitting for the 6 admin/economy pages (done in a prior session) is working correctly — regular chat users never download the 257 KB Admin Panel chunk. The remaining 2.75 MB main bundle is still large for a chat app's critical path but is a **client download-time** concern, not a server-side scalability limiter — it affects individual users' load time, not how many users the backend can serve.

No `manualChunks` splitting is configured in `vite.config.js`; Vite's own build warning flags the >500 KB chunk.

---

## 7. Capacity Modeling — How Many Concurrent Users Can Spark Support?

### 7.1 Why Firestore chat reads are the dominant cost

Firestore's realtime listener billing model charges **one read per listener, per document included in each snapshot** — including live update snapshots, not just the initial load. The main chat listener (`rooms/{roomId}/messages`, `onSnapshot`, one per user per room they're viewing) means:

> **Every message sent in a room is billed once for every user currently listening to that room.**

This is a quadratic (O(N²)) cost in the number of users sharing a room, and it is a Firestore pricing mechanic, not a code defect — it cannot be fixed with `React.memo`, debouncing, or client-side caching. The only real levers are: fewer/smaller rooms worth of concurrent listeners, a lower message rate, or moving to a different (non-realtime-listener) data-delivery model — all of which would change behavior/architecture, which the "zero UI/UX change" prior sessions correctly avoided.

**Formula:** for `N` users evenly spread across `K` equally-sized rooms, each sending `m` messages/hour on average:

```
Firestore reads/hour  ≈  m × N² / K       (chat fan-out only)
```

**Assumption used below** (stated explicitly, per the request not to guess silently): `m = 30` messages/hour/user (one message roughly every 2 minutes) — a reasonable definition of "actively chatting continuously," not idle presence. Firestore Spark quota: **50,000 reads/day**, i.e. ~2,083 reads/hour sustained if spread evenly, though in practice quota is consumed as a running daily total, not hourly.

| N (users) | K=1 room (worst case) reads/hr | K=3 rooms reads/hr | K=5 rooms reads/hr | Time to exhaust 50K/day quota (K=1) |
|---:|---:|---:|---:|---:|
| 25 | 18,750 | 6,250 | 3,750 | **~2.7 hours** |
| 50 | 75,000 | 25,000 | 15,000 | **~40 minutes** |
| 75 | 168,750 | 56,250 | 33,750 | **~18 minutes** |
| 100 | 300,000 | 100,000 | 60,000 | **~10 minutes** |
| 150 | 675,000 | 225,000 | 135,000 | **~4.5 minutes** |
| 200 | 1,200,000 | 400,000 | 240,000 | **~2.5 minutes** |

Even in the most favorable modeled case (5 independent, evenly-loaded rooms, 25 users), sustained active chatting for 24 continuous hours consumes **90,000 reads** — nearly double the entire daily Spark quota — from the room-chat listener alone, before counting private messages, friend requests, warnings, admin panels, or presence.

**Once the 50,000 reads/day project-wide quota is exhausted, Firestore requests fail for every user in the project for the rest of that day** (Spark has no pay-as-you-go overflow without a billing account attached) — this is a full-app outage, not a degraded experience for just the heavy users.

### 7.2 RTDB bandwidth (secondary bottleneck)

The global presence listener means every heartbeat (every 120s/user) is broadcast to all other users' `status` listeners. Approximating each status payload at ~200 bytes:

```
RTDB download bytes/hour ≈ N² × 200 bytes × (3600/120)   =  N² × 6,000 bytes/hour
```

| N | Bandwidth/hour | Bandwidth/24h | Spark monthly cap (10 GB) exhausted in |
|---:|---:|---:|---:|
| 25 | 3.75 MB | 90 MB | ~111 days of this pattern |
| 50 | 15 MB | 360 MB | ~28 days |
| 75 | 33.75 MB | 810 MB | ~12 days |
| 100 | 60 MB | 1.44 GB | ~7 days |
| 150 | 135 MB | 3.24 GB | ~3 days |
| 200 | 240 MB | 5.76 GB | ~1.7 days |

This is a real limiter but on a **days-to-weeks** timescale rather than the **minutes** timescale of the Firestore issue — it matters for sustained daily usage at scale, but Firestore reads fail first.

### 7.3 RTDB connection ceiling (hard, usage-independent)

Spark plan caps RTDB at **100 simultaneous connections**. Since one browser tab = one connection regardless of listener count, this is a flat wall at **~100 concurrent active tabs**, reached before any of the above math even applies once you're near that count.

### 7.4 Confidence Table

| Concurrent users | Classification | Primary reason |
|---:|:---:|---|
| **25** | ⚠️ May experience issues | Firestore chat-listener fan-out alone exceeds the 50K/day quota within ~2.5–3 hours if concentrated in 1–2 rooms; fine if usage is short bursts rather than truly continuous 24h chatting, or split across 4+ active rooms. |
| **50** | ❌ Not recommended | Quota exhausted in well under an hour under the stated continuous-chat assumption in any single popular room; even split 3–5 ways, a full day of continuous use overruns the daily quota several-fold. |
| **75** | ❌ Not recommended | Same mechanism, faster (quota exhausted in ~15–20 minutes in a shared room). |
| **100** | ❌ Not recommended | Quota exhausted in ~10 minutes (1 room) to under an hour (5 rooms); RTDB bandwidth also becomes a same-week concern; getting close to the flat 100-connection RTDB ceiling. |
| **150** | ❌ Not recommended | All of the above, plus now within range of tripping the 100-simultaneous-RTDB-connection hard cap outright if a large share are simultaneously online. |
| **200** | ❌ Not recommended | Exceeds the RTDB 100-connection hard ceiling outright — the app will start rejecting/dropping RTDB connections (breaking presence/broadcast features) independent of the Firestore math. |

### 7.5 Why "100 concurrent active users" is not realistic on Spark, specifically

Not because of React performance (that part of the app is already reasonably optimized — memoized message list, code-split admin bundle, cleaned-up major listeners). The limiting factors, in order of how fast they bite:

1. **Firestore's 50,000-reads/day project-wide quota**, consumed almost entirely by the per-listener fan-out cost of the main room chat (`onSnapshot` billing model) — this is architectural, not a bug, and hits within *minutes* of sustained multi-user chatting in a shared room.
2. **RTDB's 100-simultaneous-connection cap** — a hard, usage-independent ceiling that 100 concurrent *browser tabs* alone can approach or exceed, especially once you add admin sessions and active broadcast listeners.
3. **RTDB's 10 GB/month bandwidth cap**, driven by the global presence listener's O(N²) fan-out — a days-to-weeks-scale limiter at these user counts, secondary to the two above but real if daily active usage is sustained over a month.

None of these three are fixable by frontend performance work alone (they are backend quota/pricing mechanics of the Spark tier itself), which matches the already-documented constraint in this project's history that Spark-plan hard limits are acknowledged as unfixable via code.

---

## 8. Full Optimization List (100% UI/UX-preserving)

These would meaningfully raise the *practical* ceiling without changing anything the user sees or how any feature behaves. None require re-architecting the chat model itself (that would require moving off pure realtime listeners, which is out of scope here since it changes the app's real-time behavior):

**Firestore read reduction:**
1. Add `limit()` to the two remaining unbounded queries: `HomePage.jsx`'s `kickedUsers` room listener (~L2101) and `AdminPanelPage.jsx`'s `activeSessions` listener (~L438).
2. Add `limit()` to `AdminBanKickModal.jsx`'s `rooms` query (~L225) — currently unbounded.
3. Replace the per-row `getDoc` kick-status checks in `Sidebar.jsx` (~L691/1104/1141/1164) with a single batched `where('uid','in',...)` read (mirrors the pattern already used correctly elsewhere in `HomePage.jsx`) or, better, derive kick status from the already-in-memory room listener data if available.
4. Replace `SettingsSidebar.jsx`'s per-ID `getDoc` loop for blocked/friends lists (~L297/359) with the same batched `where('uid','in',...)` pattern already established in `HomePage.jsx`'s `fetchUsersInBatches`.
5. Route `SettingsSidebar.jsx` and any other per-user profile fetch sites through the existing shared `userProfileCache.js` (already built and used elsewhere) to dedupe redundant `getDoc` calls project-wide.

**RTDB bandwidth reduction:**
6. The global `status` presence listener's O(N²) broadcast is the single highest-leverage fix available, but as documented in this project's history, a code-only fix was evaluated and found unsafe to do without a real architecture change (it currently also drives Sidebar's per-user online badges and the site-wide online count) — a Cloud Function presence aggregate would be needed, which is beyond a Spark-plan, zero-behavior-change fix.
7. Consider increasing the heartbeat interval further if presence freshness tolerance allows (already raised from 30s → 120s in a prior session); each further increase linearly reduces RTDB write+fan-out bandwidth.

**Memory-leak fixes (won't move the capacity ceiling, but worth doing regardless):**
8. Add proper cleanup for `App.jsx`'s ban-hammer `onSnapshot` (~L377) and its two uncle­ared intervals (`banEnforcementInterval` ~L280, `banLockdownInterval` ~L423).
9. Add `clearTimeout` cleanup paths for the hardcoded 3-minute TingleBot message-deletion timers in `HomePage.jsx`.
10. Clear `ipBanInterval`/`loginBanInterval` in `LoginPage.jsx`/`SignupPage.jsx` on unmount.

**React rendering (client-side smoothness, not backend capacity):**
11. Wrap `Sidebar.jsx` in `React.memo` (with a custom comparator given its many closures) and `useMemo` the `liveUsers`/`onlineUserIds` derivations in `HomePage.jsx` (~L3237–3242).
12. Memoize the repeated inline `[...].sort().join('_')` conversation-ID computations.
13. Extract `ChatInput` from `HomePage.jsx` using the same `useStableCallback` pattern already validated for `MessageList` this session (previously deferred as a separate, larger job).

**Cost/spam guard (small but real risk):**
14. Add a lightweight client-side or Firestore-transaction-level cooldown on gift-sending (`GiftPanel.jsx` `handleSend` → `coinSystem.js` `deductCoinsForGift`, ~L151) — currently only guarded by a local `sending` boolean, so rapid-fire gifting isn't hard-blocked server-side.

None of the above change what any user sees, how any feature behaves, or any data schema — they reduce read/write/bandwidth volume and fix leaks without touching UX.

---

## 9. What Would Be Needed to Refine This Estimate Further

This report is based on **stated, explicit assumptions** (30 messages/hour/user, users clustering in 1–5 rooms) because the actual production numbers aren't available from code alone. To replace these assumptions with real numbers, the following production metrics would be needed:

- **Actual Firebase Console usage data**: Firestore reads/writes per day (Usage tab), RTDB bandwidth and peak simultaneous connections (Usage tab) — this would immediately show how close to quota the app already is at current traffic.
- **Real message-send rate**: average and peak messages/minute per room, ideally per popular room, to replace the 30/hour assumption.
- **Real room distribution**: how many rooms are simultaneously "hot" (have several active chatters) vs. mostly empty — this is the `K` variable in the fan-out formula and has the single biggest effect on the outcome.
- **Average payload size** for messages and presence status entries, to refine the RTDB bandwidth model beyond the 200-byte assumption used here.
- **Session duration distribution**: how long a typical session actually stays connected/listening, since "24 hours continuous" is an explicit worst-case assumption from the prompt, not an observed pattern.

Without those, any more precise number than the ranges given above would be a guess rather than a code-grounded conclusion.

---

## 10. Scores

| Category | Score /100 | Why |
|---|---|---|
| Overall project architecture | 68 | Feature-complete, real transaction safety in the coin system, but two 5,000–8,400-line monolithic files (`HomePage.jsx`, `AdminPanelPage.jsx`) carry too much responsibility. |
| Firestore query discipline | 70 | Most collections are already `limit()`-bounded from prior sessions; a handful of unbounded queries remain (`kickedUsers`, `activeSessions`, admin `rooms` modal query). |
| Firestore scalability (fan-out cost model) | 25 | Not a discipline problem — it's the realtime-listener billing mechanic itself. This is the #1 blocker for 80 users × 24h continuous chat. |
| RTDB security rules | 80 | Host-gated broadcast writes, per-uid presence writes, sensible participant checks — already hardened in prior sessions. |
| RTDB bandwidth/connection scalability | 45 | Global O(N²) presence fan-out and the flat 100-connection Spark ceiling are both real, unresolved structural limits. |
| React rendering performance | 62 | 26 components memoized including the newly-extracted `MessageList`; a few large unmemoized components (`Sidebar.jsx`, `SettingsSidebar.jsx`) remain. |
| Memory-leak hygiene | 58 | Most listeners clean up correctly; a handful of confirmed leaks remain in `App.jsx`'s ban system and `HomePage.jsx`'s bot-message timers. |
| Bundle size / code-splitting | 72 | Admin + economy pages already lazy-loaded; main bundle is still 2.75 MB, on the heavy side for a chat app's first load. |
| N+1 query hygiene | 55 | Several per-row `getDoc` calls in `Sidebar.jsx`/`SettingsSidebar.jsx` where a batched read is already used correctly elsewhere in the codebase. |
| Cost/spam guarding (gifts, etc.) | 50 | Balance checks are atomic (Firestore transactions), but no cooldown against rapid repeated gift-sends. |
| **Overall scalability score (Spark, 24h continuous chat scenario)** | **22/100** | Dominated by the Firestore fan-out mechanic — this single factor caps the honest score regardless of how clean the rest of the code is. |
| **Overall code-quality/performance score** | **64/100** | Genuinely solid engineering for a project this size; the low scalability score is a Firebase-plan/pricing-model ceiling, not a reflection of code quality. |

---

## 11. Fix-It Prompt — Getting 80 Concurrent Users Through 24h of Continuous Chat on Spark

**Read this first, honestly:** every fix below is real, safe, and zero-UI/UX-change — I will implement all of them if you say go. But per §7.1's math, the Firestore realtime-listener fan-out cost for the main room chat is a **server-side billing mechanic**, not a client-side inefficiency, so **no amount of frontend code changes can mathematically guarantee** 80 users chatting continuously for a full 24 hours will stay under the fixed 50,000-reads/day Spark quota **if a large share of them are ever concentrated in the same 1–2 rooms at once**. What these fixes *can* do is: (a) eliminate every wasted/unnecessary read so 100% of your quota goes toward real chat activity instead of leaks and N+1s, (b) remove the two remaining unbounded queries that could spike usage unpredictably, (c) cut RTDB bandwidth so that stops being a second failure point, and (d) meaningfully push the realistic ceiling up from where it sits today. Whether 80 users spread across your existing room list stays under quota depends on how many rooms are actually "hot" at once (§7.1, the `K` variable) — something only real usage data can confirm. I'll flag this again once the fixes are in, and recommend checking the Firebase Console's Usage tab against real traffic before treating 80 as guaranteed-safe.

With that caveat stated plainly, here is the exact, prioritized list of everything worth fixing, in the order that gives the most quota/bandwidth back per change:

1. **Cap the two remaining unbounded Firestore listeners** — add `limit()` to `HomePage.jsx`'s `kickedUsers` room listener (~L2101) and `AdminPanelPage.jsx`'s `activeSessions` listener (~L438). Prevents unpredictable read spikes as room/session counts grow.
2. **Cap `AdminBanKickModal.jsx`'s unbounded `rooms` query** (~L225) — same reasoning, staff-triggered but unbounded today.
3. **Replace per-row `getDoc` kick-status checks in `Sidebar.jsx`** (~L691/1104/1141/1164) with one batched `where('uid','in',...)` read, or derive status from data already in memory — removes a real N+1 pattern that scales with visible room-list length × active users.
4. **Replace `SettingsSidebar.jsx`'s per-ID `getDoc` loops** for blocked/friends lists (~L297/359) with the same batched pattern already used correctly in `HomePage.jsx`'s `fetchUsersInBatches`.
5. **Route all remaining per-user profile fetches through the existing `userProfileCache.js`** so no two components ever re-fetch the same user doc within its TTL window.
6. **Increase the RTDB presence heartbeat interval further** (currently 120s) if your product tolerance allows slightly staler "last seen" data — every increase linearly cuts the O(N²) presence-bandwidth cost that scales with concurrent users squared.
7. **Add a server-enforced cooldown on gift-sending** (`GiftPanel.jsx` → `coinSystem.js` `deductCoinsForGift`, ~L151) so rapid repeated gifts can't multiply writes beyond intent — cheap insurance, not currently present beyond a local UI flag.
8. **Fix the confirmed memory leaks** — `App.jsx`'s ban-hammer `onSnapshot` (~L377) with no cleanup, its two uncleared intervals (~L280, ~L423), `HomePage.jsx`'s uncancelled 3-minute bot-message-deletion timers, and `LoginPage.jsx`/`SignupPage.jsx`'s uncleared ban-check intervals. These don't move the Firestore/RTDB ceiling but do prevent long-lived tabs (exactly what "24h continuous" implies) from silently accumulating duplicate listeners/intervals over time.
9. **Memoize `Sidebar.jsx`** and the unmemoized `liveUsers`/`onlineUserIds` derivations in `HomePage.jsx` (~L3237–3242) plus the repeated inline conversation-ID `sort().join('_')` calls — keeps 80 concurrent users' worth of UI updates from causing visible jank on lower-end devices, even though it doesn't touch server quota.
10. **Extract `ChatInput`** from `HomePage.jsx` with the same `useStableCallback` pattern already proven this session for `MessageList` — reduces re-render scope further during heavy 24h typing/sending activity.

**What I'd recommend after these are in:** check the Firebase Console Usage tab during a real multi-user test session to see actual reads/day and RTDB bandwidth against the quota, since that will tell us the real `K` (how many rooms are simultaneously busy) instead of the worst-case assumption used in this report — that's the number that ultimately decides whether 80 users is safely inside quota or not.

Say the word and I'll implement items 1–10 in this order, verifying with a build + workflow restart + screenshot after each group, exactly like the prior optimization sessions.
