# TingleTap — Hybrid Architecture (Firebase + Custom WebSocket) Migration Audit
**Date:** July 3, 2026
**Scope:** Full `src/` tree, Firestore rules/indexes, RTDB rules, `package.json`, plus targeted deep-dives into message schema, WebRTC broadcast signaling, moderation enforcement paths, wallet realtime needs, and TingleBot's event flow.
**No code was modified for this report.** This is a planning document only, per your instructions — implementation code comes later, if/when you approve a direction.

---

## 1. Is this architecture suitable for your project?

**Yes, directionally — this is the textbook-correct fix for the exact bottleneck identified in the prior audit** (`TINGLETAP_DEEP_AUDIT_2026-07-03.md`): Firestore's realtime-listener billing model charges per-listener-per-message, which is why the current architecture cannot cleanly support more than a few dozen truly-continuous concurrent chatters on Spark, and gets expensive fast even on the paid Blaze plan (see §6.4). Moving high-frequency, ephemeral, fan-out-heavy traffic (chat, presence, WebRTC signaling) to a custom WebSocket server while keeping low-frequency, durable, security-rule-dependent data (profiles, coins, reports, moderation logs) on Firestore is exactly the right split — this is the standard pattern used by essentially every chat app that outgrows Firestore/RTDB's realtime tier.

**However**, "suitable in principle" is different from "low-risk to execute in *this specific* codebase today." Three codebase-specific facts change the risk profile:
1. There is currently **zero backend/server code** in this project — it's a 100% static Vite frontend backed entirely by managed Firebase services. A WebSocket server is genuinely new infrastructure, not an extension of something that exists.
2. The main chat's entire real-time data layer lives inside `HomePage.jsx`, an **8,412-line file** already flagged in this project's own history as too large/tangled to safely refactor without a dedicated session. Migrating chat to WebSocket means rewriting a meaningful fraction of that file's data layer.
3. The most complex feature in the app — the RJ live-audio broadcast (`BroadcastPanel.jsx`, 3,649 lines, full-mesh WebRTC) — is also explicitly in scope to migrate, and it's the single most fragile, hardest-to-regression-test feature in the codebase.

See §10 for how this shapes the readiness score.

---

## 2. Exact files/features that should REMAIN on Firebase

| Feature | File(s) | Why it stays |
|---|---|---|
| Authentication | `src/firebase/config.js`, `App.jsx` (`onAuthStateChanged`), `LoginPage.jsx`, `SignupPage.jsx`, `ForgotPasswordPage.jsx`, `ProtectedRoute.jsx` | Explicitly kept per your instructions; the WS server should verify Firebase ID tokens on connect rather than reinvent auth. |
| User profiles, friends, badges, settings | `EditProfile.jsx`, `SettingsSidebar.jsx`'s profile/friend sections, `usernamePreferences.js`, `messageTextPreferences.js` | Low write frequency, needs durable storage + Firestore security-rule access control, no realtime fan-out cost today. |
| Friend requests | `HomePage.jsx`'s `friendRequests` listener, `SettingsSidebar.jsx` | Infrequent; also benefits from Firestore's "delivered when the user next comes online" model, which a stateless WS push cannot do for offline users. |
| Coin wallets & transactions | `coinSystem.js` (`coinWallets`, `coinTransactions`, `rjEarnings`, `paymentOrders`, `rjPayments`) | Needs Firestore's atomic `runTransaction` guarantees and durable audit trail — see §4 for why this should NOT move. |
| Coin/RJ economy UI | `BuyCoinsPage.jsx`, `CoinWalletPage.jsx`, `RJEarningsDashboard.jsx`, `RJWithdrawal.jsx`, `Leaderboard.jsx` | Consumers of the above; stay Firestore-backed. |
| Reports & appeals | `reports` collection, `StylishReportModal.jsx` | Durable audit record staff need to query/filter/sort historically — exactly Firestore's strength, exactly WS's weakness (no built-in persistence or query engine). |
| Moderation logs & bans/mutes (source of truth) | `trustSystem.js`, `ipBanSystem.js`, `deviceBanSystem.js`, `tinglebotAutoMod.js`'s `modLogs` writes, `users/{uid}.isBanned` / `.mutedInfo` fields | The *authoritative* ban/mute state must survive a WS server crash/restart — keep it in Firestore; the WS server reads/caches it and pushes instant notifications on top (see §3). |
| Admin Panel's historical/administrative views | `AdminPanelPage.jsx`'s `users`, `bannedIPs`, `bannedDevices`, `reports`, `modLogs`, `feedback`, `guestSessions` listeners | Staff-only, low-frequency, benefit from Firestore's `where`/`orderBy` query support that WS has no equivalent for. |
| Warnings & announcements | `WarningsContext.jsx` | Already a single shared app-wide listener (cheap); low enough frequency that migrating it isn't necessary, though it *could* move for extra polish (see §3). |
| Image/audio/GIF hosting | ImgBB (images), Catbox/tmpfiles/file.io (audio), Giphy (GIFs), YouTube iframe (music) | Already fully external to Firebase — no change needed either way; this part of your assumption list is already true today. |

---

## 3. Exact files/features that should MOVE to WebSocket

| Feature | Current implementation | What moves |
|---|---|---|
| **Main room chat** | `HomePage.jsx` `onSnapshot` on `rooms/{roomId}/messages` (~L2794) + `addDoc` writes | The single biggest win. Replace the Firestore listener/write with a WS `subscribe(roomId)` + `send(message)` protocol. This is the change that eliminates the O(N²) fan-out billing problem entirely. |
| **Whispers** | Same collection, `isWhisper`/`whisperTo` flag, filtered client-side (`HomePage.jsx` ~L368–373) | Travels over the same new WS channel; server enforces whisper visibility (only sender + target receive it) instead of every client silently receiving-then-hiding it — this is also a **privacy improvement**, since today every client in the room technically downloads whisper content and just hides it in the UI. |
| **Presence / online status** | RTDB `status/{uid}` global tree + 120s heartbeat + global `onValue` listener (`HomePage.jsx` ~L3307) | Move to WS connect/disconnect + heartbeat, tracked server-side in memory (or Redis if multi-node). Server pushes only *deltas* to room-scoped subscribers instead of the full-tree O(N²) broadcast RTDB does today — this directly fixes the presence bandwidth bottleneck flagged in the prior audit. |
| **Typing indicators** | **Does not exist in code today** (only mentioned in marketing copy) | If you want this, build it WS-native from day one — trivial over WS, and would have been a bad idea to ever add via Firestore/RTDB given the write-per-keystroke cost. |
| **Room join/leave events** | Inferred client-side by diffing RTDB presence snapshots, no explicit event today | Emit as explicit WS `user_joined`/`user_left` events per room — cleaner and cheaper than the current diffing approach. |
| **Room occupancy counts** | RTDB `roomCounts` (`RoomListPage.jsx`) | Server maintains live in-memory counts, pushes to room-list viewers. |
| **Kick/ban real-time enforcement** | `rooms/{roomId}/kickedUsers` Firestore subcollection + client-side listener | The *instant eviction* (force-disconnect the moment a kick/ban happens) moves to WS — server holds the authoritative kick/ban list in memory (synced from Firestore) and force-closes the socket immediately. The *historical record* (who was kicked, when, by whom, expiry) still gets written to Firestore for the admin panel's audit views — this is a **dual-write pattern**, not a full removal. |
| **Live mute enforcement** | `users/{uid}.mutedInfo` field, listened via profile snapshot | Same dual-write pattern: Firestore stays the source of truth, WS pushes the instant "you are now muted" notification. |
| **TingleBot's ephemeral events** | Currently written as real Firestore messages (`addDoc` with `isBot:true`) for join/leave notices and live automod flags (`Sidebar.jsx` ~L153) | Ephemeral notices (joins/leaves, live automod flags) should be pushed via WS only — no reason to ever persist "X joined the room" as a billable Firestore document. TingleBot's actual **violation log** entries (used for staff review) should still be written to Firestore's `modLogs`, unchanged. |
| **RJ Broadcast signaling** (`BroadcastPanel.jsx`) | RTDB paths for offer/answer/ICE candidates, `listeners`, `speakers`, `speakerConnections`, `songQueue`, `announcements`, `youtube` sync state | Move the entire signaling layer to the WS server — WebSocket is architecturally a *better* fit for WebRTC signaling than RTDB ever was (lower latency, no polling semantics, natural request/response framing). The actual audio/video media itself already flows peer-to-peer and is untouched by this migration either way. |
| **Gift feed animations** | RTDB `giftFeed/{roomId}` `onChildAdded` | The *animation trigger* ("someone just sent a gift, play the animation") is ephemeral — push via WS. The underlying `coinTransactions`/gift ledger record still gets written to Firestore, unchanged (see §4 — money data stays put). |

---

## 4. Features that should NOT move to WebSocket (and why)

1. **Coin/wallet balance mutations** (`deductCoinsForGift`, purchases, RJ earnings, withdrawals). Firestore's `runTransaction` gives you atomicity and a built-in audit trail for free; a hand-rolled WS server would need to reimplement ACID-style balance-checking from scratch, and any bug here is a **real-money-adjacent bug**, not a UX inconvenience. Keep the mutation in Firestore; optionally have the WS server push an instant "balance updated" notification right after the Firestore write completes, so the UI still feels instant without moving the actual transaction logic.
2. **Reports, appeals, moderation logs.** These exist specifically so staff can query, filter, and sort historical records — Firestore's query engine (`where`/`orderBy`) is the right tool; WebSocket has no persistence or query model at all, so this would require bolting on a separate database anyway, at which point you've gained nothing by moving it.
3. **Friend requests / friends list.** A WS push can only reach a user who is currently connected. Friend requests need to be visible **the next time the recipient logs in**, even if that's tomorrow — this is precisely what Firestore's persistence gives you for free and WS cannot.
4. **Ban/mute state (the source of truth).** The *notification* of a ban can be instant via WS, but the underlying "is this user banned" flag must live somewhere that survives a WS server crash or redeploy — that's Firestore's job, not the WS server's in-memory state.
5. **Badges, long-lived profile fields.** No realtime need exists or has ever existed for these; migrating them would add complexity for zero benefit.
6. **Image/audio/GIF/YouTube hosting.** Already external to Firebase entirely (ImgBB, Catbox/tmpfiles, Giphy, YouTube iframe) — there's nothing to "move" here in either direction; this part of your architecture is already correct.

---

## 5. Expected Performance Improvement

| Dimension | Current (Firebase-only chat) | After hybrid migration | Why |
|---|---|---|---|
| **Message latency** | Typically 100–400ms (Firestore write → server timestamp → listener fan-out round trip) | Typically 10–50ms (direct WS push, no intermediate database round trip for delivery) | WS delivers directly between server and connected clients; Firestore's listener model adds a full write-then-snapshot round trip. |
| **Firestore reads (chat)** | O(messages × listeners) — the core problem identified in the prior audit | ~0 for chat (messages never touch Firestore) | Chat traffic no longer touches a billed, quota-capped database at all. |
| **RTDB bandwidth (presence)** | O(N²) — every heartbeat broadcasts to every listener on the global `status` tree | Near-linear — server pushes only deltas to room-scoped subscribers | Eliminates the specific structural bottleneck flagged in the prior audit as "not fixable by safe code tweaks alone." |
| **Browser CPU** | Each client processes full Firestore snapshot diffs (even for messages/updates it doesn't care about) plus the existing React render cost | Lower — WS messages are already-filtered, minimal JSON events; React render cost is unchanged (that's a separate, already-partially-addressed concern from the prior audit) | Removing Firestore's snapshot-diffing overhead reduces client-side parsing work, though this is a secondary effect compared to the network/cost wins. |
| **Network overhead** | Firestore's protocol carries more framing/metadata per update than a minimal custom WS message format would | Lower, if you deliberately keep the WS message format compact (see §9 — don't just port the current ~300–900 byte Firestore message schema verbatim) | Real gain requires *designing* a lean wire format, not just swapping transport. |
| **Scalability ceiling** | Hard-capped by Firestore's 50K-reads/day (Spark) or linear-cost-scaling (Blaze), and RTDB's flat 100-connection cap (Spark) | Bounded by your own server's CPU/RAM/bandwidth — you control the ceiling, and it scales far higher per dollar (see §6–8) | This is the actual point of the migration — moving from a fixed, plan-imposed ceiling to a ceiling you can raise by spending more on infrastructure. |

---

## 6. Infrastructure Cost Estimates

**Assumptions used** (as specified): 24h/day active users, 3 messages/min/user average, 5 chat rooms, users distributed across those 5 rooms (so "~100/room" describes the 500-user case specifically; at other totals I distribute evenly across the same 5 rooms and show the resulting per-room count, since you specified a fixed room count rather than a fixed per-room count).

### 6.1 Hybrid architecture — Firebase-side monthly cost (after migration)

Once chat/presence/signaling leave Firestore, the *only* Firestore traffic left is: profile loads, friend-list reads, settings, moderation checks, coin transactions, report/appeal writes, admin panel reads. This volume does **not** scale with message rate — it scales with login/session frequency, which is far lower.

Estimated at ~30–60 Firestore reads and ~10–20 writes per user **per day** (profile/session loads, coin transactions, occasional moderation checks) — a generous estimate that assumes fairly active feature usage beyond just chatting:

| Concurrent users | Est. reads/month | Est. writes/month | Firestore cost/month* | Fits Spark free tier? |
|---:|---:|---:|---:|---|
| 100 | ~180,000 | ~45,000 | **$0** (well under 50K reads/day, 20K writes/day) | Yes |
| 250 | ~450,000 | ~112,500 | **$0–2** (still likely under daily free caps) | Likely yes |
| 500 | ~900,000 | ~225,000 | **~$3–5** | Borderline — may need Blaze for headroom |
| 1000 | ~1,800,000 | ~450,000 | **~$6–10** | Needs Blaze (pay-as-you-go), but trivial cost |

*Firestore Blaze pricing used for reference: ~$0.036/100K reads, ~$0.108/100K writes (approximate published rates — verify current pricing in the Firebase Console before budgeting, as Google adjusts these periodically).

**This is the headline result of the migration**: Firebase cost becomes essentially flat and negligible at every scale you asked about, because the one thing that scaled badly (chat fan-out) is gone.

### 6.2 WebSocket server / VPS monthly cost

Using your stated load (3 msg/min/user, 5 rooms, users spread across them), the WS server's real cost driver is **bandwidth**, not CPU (message rates here are light for a modern server — the bottleneck is fan-out bytes, not processing).

Formula: `bandwidth/sec ≈ (users_per_room × 3/60) × users_per_room × avg_message_size × num_rooms`

| Concurrent users | Users/room (5 rooms) | Est. bandwidth/month | Recommended VPS tier | Est. monthly cost |
|---:|---:|---:|---|---:|
| 100 | 20 | ~130 GB | 1–2 vCPU, 2GB RAM, basic tier (e.g. DigitalOcean/Linode/Hetzner entry droplet) | **$6–12** |
| 250 | 50 | ~810 GB | 2–4 vCPU, 4GB RAM | **$20–40** |
| 500 | 100 | ~3.2 TB | 4 vCPU, 8GB RAM, provider with generous/pooled bandwidth | **$40–80** |
| 1000 | 200 | ~13 TB | 8 vCPU, 16GB RAM, provider with unmetered or very high bandwidth allowance (e.g. Hetzner dedicated, OVH) — on a metered hyperscaler (AWS/GCP) this bandwidth alone would cost **$1,000+/month** in egress fees, so provider choice matters enormously here | **$80–180** (flat-rate bandwidth provider) or **$1,200+** (pay-per-GB cloud) |

**Important caveat:** these are engineering estimates based on the message-rate assumptions you gave, not measurements of a running system — real payload sizes, connection overhead, and provider-specific bandwidth policies will shift these numbers. Load-testing the actual WS server before committing to a VPS tier is strongly recommended.

### 6.3 Total estimated monthly infrastructure cost (hybrid architecture)

| Concurrent users | Firebase | WebSocket/VPS | **Total/month** |
|---:|---:|---:|---:|
| 100 | $0 | $6–12 | **~$6–12** |
| 250 | $0–2 | $20–40 | **~$20–42** |
| 500 | $3–5 | $40–80 | **~$45–85** |
| 1000 | $6–10 | $80–180 (flat-rate provider) | **~$90–190** |

### 6.4 For comparison — what the CURRENT (Firebase-only) architecture would cost at these scales

This is the justification for migrating at all: if you scaled the app to these user counts **without** migrating, Firestore's fan-out billing model (§7 of the prior audit) means the *chat feature alone* would cost, on the Blaze plan (Spark would simply stop working — see the prior audit's quota-exhaustion timelines):

| Concurrent users | Est. Firestore cost/month (chat fan-out only) |
|---:|---:|
| 100 | ~$110–130 |
| 250 | ~$600–650 |
| 500 | ~$2,300–2,500 |
| 1000 | ~$9,300–9,600 |

This confirms the migration isn't just a technical nicety — at 500+ concurrent continuously-chatting users, staying Firebase-only for chat would cost roughly **25–50x more** than the hybrid architecture, on top of also being flatly impossible on the free Spark plan in the first place.

---

## 7. Minimum VPS Specification Recommendations

| Target | CPU | RAM | Bandwidth | Notes |
|---|---|---|---|---|
| **100 users** | 1–2 vCPU | 2 GB | ~500 GB–1 TB/month | Any budget VPS (DigitalOcean Basic, Linode Nanode+, Hetzner CX-series) comfortably covers this with headroom. |
| **500 users** | 4 vCPU | 8 GB | ~4–5 TB/month | Mid-tier VPS; consider a provider with bandwidth pooling or a flat-rate allowance rather than pure pay-per-GB. |
| **1000 users** | 8 vCPU | 16 GB | ~15 TB/month or unmetered | At this tier, seriously evaluate a dedicated server (Hetzner/OVH dedicated lines often bundle very high or unmetered bandwidth at a flat monthly rate) over a cloud VM, since bandwidth — not CPU — is the dominant cost driver at your stated message rate. Also the point at which you should introduce Redis for shared presence/room state, even if still running a single WS process, to make a future move to multiple WS nodes straightforward. |

RAM sizing assumes ~20–50KB overhead per open WebSocket connection (raw `ws` library) plus in-memory room/presence state; CPU sizing assumes Node.js with cluster-mode across cores, since message fan-out at 3 msg/min/user is CPU-light even at 1000 concurrent users — bandwidth and connection-count (RAM), not CPU, are your real scaling constraints here.

---

## 8. Maximum Concurrent Users Before Horizontal Scaling Is Required

Based on the message-rate assumptions given (3 msg/min/user is a *light* load for a WS server — modern single-node Node.js WebSocket servers commonly handle tens of thousands of idle-ish connections), the realistic ceiling for a **single, well-specced node** (8–16 vCPU, 16–32 GB RAM, high-bandwidth network) is approximately **5,000–8,000 concurrent connections** before you'd want to introduce horizontal scaling (multiple WS server processes/machines behind a load balancer, with Redis pub/sub to broadcast messages across nodes so users on different servers can still be in the same room).

**This is an engineering estimate, not a code-derived fact** — there is no existing WS server in this codebase to benchmark, so this number is based on typical published capacity figures for lean Node.js WebSocket implementations under comparable message rates, not a measurement of your actual future implementation. Real capacity depends heavily on: exact message payload size, whether you use raw `ws` vs. heavier frameworks like Socket.IO (which adds overhead), how much per-connection application state you keep in memory, and the specific VPS/network hardware. **Load testing the actual implementation before relying on this number for a production capacity plan is essential.**

---

## 9. Migration Risks & Challenges

1. **No existing backend/server code to build on.** This project is currently a 100% static frontend backed by managed Firebase services. A WebSocket server is an entirely new operational component: you'll need a process manager (PM2 or similar), crash recovery, log aggregation, deployment pipeline, TLS/WSS certificate management, and monitoring/alerting — all things Firebase currently gives you for free as a managed platform. This is a real, ongoing operational responsibility shift, not just a one-time coding task.
2. **`HomePage.jsx` is 8,412 lines and already flagged as too risky to safely refactor without a dedicated session.** Migrating the main chat's data layer means rewriting a meaningful portion of this file's real-time logic — the single biggest execution risk in this whole plan.
3. **`BroadcastPanel.jsx`'s WebRTC signaling is the most fragile feature in the app** (full-mesh P2P, dynamic speaker connections, an `AudioContext` mixer) at 3,649 lines. Re-plumbing its signaling channel from RTDB to WS touches every part of an already-complex, hard-to-regression-test feature.
4. **Reinventing Firestore/RTDB's security rules as custom server-side logic.** Today, access control (who can read a room's messages, whisper visibility, blocked-user filtering) is partly enforced by Firestore rules and partly client-side filtering. A custom WS server must correctly reimplement *all* of this authorization logic server-side from scratch — get it wrong, and you leak whispers or messages to blocked/kicked users, which today's Firestore rules provide a safety net against even when client code has a bug.
5. **No offline queuing/resync for free.** Firestore/RTDB clients automatically resync missed data on reconnect. A custom WS layer needs its own reconnect/resync logic (what messages did a client miss while its socket was dropped?), message ordering guarantees, and de-duplication — none of this is automatic with raw WebSockets.
6. **Presence/disconnect detection must be rebuilt.** Firebase's `onDisconnect()` handles abrupt tab closes server-side automatically. A WS server needs its own ping/pong heartbeat and timeout logic to reliably detect a dead connection versus a slow one.
7. **Dual-write consistency for the "stays on Firestore but needs instant notification" features** (kicks, mutes, gifts) — you'll be writing to Firestore *and* pushing a WS event for the same action, and need to handle the case where one succeeds and the other fails (e.g., the Firestore ban write succeeds but the WS server is temporarily down and never force-disconnects the user).
8. **Horizontal scaling readiness** — even though §8 suggests a single node covers a large range of your stated targets, you should design the pub/sub layer (Redis) from day one rather than retrofitting it later, since retrofitting cross-node message routing into an already-running single-node design is a much bigger rewrite than building it in from the start.
9. **Cutover risk to your live users.** This is your core product feature (chat). A careful phased rollout (e.g., feature-flag by room, or a dual-write/shadow-read period where both systems run in parallel before fully cutting over) is necessary to avoid an outage during migration — a "big bang" cutover on a monolithic 8,400-line file is high-risk.
10. **Team/tooling gap.** Nothing in this project's history shows prior backend/WebSocket server work — this is a new skill-set/tooling area for the project, separate from the mostly-frontend work done in prior sessions.

---

## 10. Migration Readiness Score & Recommendation

### **Score: 5/10 — Architecturally correct, but not low-risk to execute in this codebase today.**

**Why not lower:** the core idea is sound engineering, not a fad — it directly targets the exact, already-diagnosed bottleneck (Firestore's per-listener fan-out billing) that a prior audit in this project already confirmed is not fixable by any amount of "safe" code-level tweaking. If your real trajectory is toward hundreds-to-thousands of concurrently active users, you will need something like this eventually, and doing it deliberately now (rather than under production-outage pressure later) is the right instinct.

**Why not higher:** three specific, codebase-grounded facts keep this from being a clean "go ahead" — (1) there is zero existing backend infrastructure to build on, meaning this is a from-scratch server build, not an extension; (2) the two most complex, highest-regression-risk files in the entire codebase (`HomePage.jsx` at 8,412 lines and `BroadcastPanel.jsx` at 3,649 lines) are both directly in the migration's blast radius; and (3) per the prior audit, your *current* actual bottleneck only starts to bite meaningfully somewhere in the 25–50 concurrent same-room continuous-chatter range on Spark — if your real current traffic is well below that, this migration is solving tomorrow's problem with today's engineering budget, and the risk/reward calculation should reflect how close you actually are to that ceiling right now (recommend checking your real Firebase Console usage numbers before prioritizing this over other work).

**Recommendation:** proceed, but in **phases, not one migration**, roughly in this order of increasing risk:
1. Presence/typing/room-occupancy (lowest risk — no existing feature to regress, and it's exactly where RTDB's O(N²) problem already lives)
2. Room join/leave events + ephemeral TingleBot notices (low risk — currently inferred/ad-hoc anyway)
3. Kick/mute instant-enforcement push (medium risk — dual-write pattern, needs careful correctness testing)
4. Main room chat + whispers (highest value, highest risk — this is the `HomePage.jsx` rewrite)
5. RJ Broadcast signaling (do this last — it's your most fragile feature, and by phase 5 your WS server will already be proven in production on lower-stakes traffic)

This phased approach also means you get real production bandwidth/CPU numbers from phases 1–3 to validate or correct the cost/capacity estimates in §6–8 before betting the core chat feature on them.
