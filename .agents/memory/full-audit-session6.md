---
name: Full architecture/scalability audit (Session 6, read-only)
description: Findings from a complete read-only audit not previously captured in other memory files — additional unbounded listeners and concurrency estimates.
---

## New unbounded listeners found (not in earlier audit passes)

- `useRoomsListener.js` (shared singleton hook used by both Sidebar and RoomListPage) queries the full `rooms` collection with **no `limit()`** — good dedup pattern (only one listener runs app-wide) but the query itself is still uncapped in size. Add `limit()` here if room count grows.
- `subscribeAllRJEarnings` in the admin coins panel (`AdminCoinsPanel.jsx`) downloads the **entire `rjEarnings` collection with no limit** — every RJ's full ledger loads into the admin browser on open.
- `AdminPanelPage.jsx` runs its own **separate copy** of the global RTDB `status` listener (same O(N²) issue documented in `rtdb-presence-scalability.md`), independent from HomePage's copy — doubles the presence fan-out cost when both are mounted (they aren't simultaneously today, so low priority, but don't assume there's only one `status` listener in the app).
- `App.jsx` has **two separate `onAuthStateChanged` listeners** doing overlapping work — not a bug, just redundant; worth consolidating in a future session.
- Coin leaderboard aggregation (`coinSystem.js`) fetches up to 500 transaction docs and aggregates client-side — cost grows linearly forever with total transaction volume; no server-side rollup exists.

## Concurrent-user capacity estimates (asked repeatedly — reuse these numbers, don't re-derive from scratch)

Given the app's actual read/write pattern (chat message fan-out billing, global presence listener, current query limits):
- **As-is on Firebase Spark + Netlify Free**: ~15-30 concurrently *active/chatting* users before hitting the 50K reads/day Firestore quota on a busy day; RTDB's 100-connection hard cap applies regardless of activity level.
- **After only safe/behavior-preserving optimizations** (room-scoping presence, capping the remaining unbounded listeners, server-side leaderboard rollup): ~40-60 concurrent active users — quota lasts longer, but the RTDB 100-connection ceiling is a Firebase Spark plan limit that no code change removes (only Blaze upgrade does).
- Netlify Free's bandwidth (100GB/mo) is never the bottleneck for this app — it's a small static Vite bundle; Firebase Spark's quotas are hit long before Netlify's limits.

**Why this matters:** the user asks "how many concurrent users can this support" periodically — answer with these two tiers (as-is vs. after-safe-optimization) and always separate "Firestore daily quota ceiling" from "RTDB 100-connection hard cap" since they're different constraints with different fixes.
