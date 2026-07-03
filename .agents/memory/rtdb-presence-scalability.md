---
name: RTDB presence & Firestore message fan-out scalability limits
description: Structural (not code-quality) scalability ceilings found during a full architecture audit — read before any future scaling/perf work on chat rooms or presence.
---

## Global presence listener causes O(N²) growth

`HomePage.jsx` and `AdminPanelPage.jsx` both do `onValue(ref(rtdb, 'status'))` — a listener on the **entire site-wide presence node**, not scoped to the current room. Combined with a 30s heartbeat write to `status/{uid}` per connected user, every heartbeat gets pushed to every other connected client's listener.

**Why:** with N concurrent users, this is roughly N heartbeats × N listeners = N² RTDB push events per 30s window. Bandwidth/CPU cost grows quadratically with concurrent users, not linearly.

**How to apply:** any future presence/scale work should scope the status listener to only users relevant to the viewer (e.g. same room) rather than the whole site. This is the top scalability bottleneck in the app, ahead of anything React-rendering related.

## Firestore message listener fan-out

Room `messages` `onSnapshot` listeners in `HomePage.jsx` mean every new message triggers a Firestore "read" charge for **every client currently listening to that room**, not just one. Reads scale as (messages sent) × (room occupancy), so a handful of active rooms with light chat traffic can exhaust the Firebase Spark free-tier daily read quota (50K reads/day) in hours.

**Why:** this is the standard Firestore realtime-listener billing model — each doc change pushed to each open listener counts as a read.

**How to apply:** don't assume "50K reads/day is plenty" for chat features — model it as messages × concurrent room listeners when estimating capacity or discussing scaling with the user.

## Firebase Spark plan hard limits (not fixable by code)

- RTDB Spark plan caps at **100 simultaneous connections**, period. No client-side optimization changes this — only upgrading to Blaze (pay-as-you-go) does.
- Firestore Spark: 50K reads/day, 20K writes/day.

**How to apply:** when asked "how many users can this support on free tier," the ceiling is realistically ~20-35 concurrently *active* users before Firestore quota exhaustion, and ~100 concurrently *connected* users as a hard RTDB cap regardless of optimization work. Communicate this as a plan/billing constraint, not something "safe optimizations" can fully solve.

## Known open security issue (RTDB rules)

`database.rules.json`: `broadcasts/rj` has `".write": "auth != null"` — any authenticated user (not just the RJ or staff) can write/delete any RJ's live broadcast node, effectively letting anyone hijack or kill any broadcast. Flagged during the July 2026 audit; not yet fixed as of that audit (read-only pass, no code changed).
