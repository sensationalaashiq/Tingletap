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

## RTDB broadcast hijack hole — fixed via owner-uid gating pattern

`broadcasts/rj` and `broadcasts/public/{id}` previously had `".write": "auth != null"` at the root, letting any authenticated user hijack/kill/rewrite any live broadcast (including sub-paths like `youtube`/`announcements` due to RTDB's cascading write-grant behavior). Fixed by gating root `.write` to `!data.exists() || auth.uid === data.child('<ownerUidField>').val()` using the field the client already writes on session start (`rjUid` for `broadcasts/rj`, `session/hostUid` for `broadcasts/public/{id}`).

**Why this pattern, not a role check:** RTDB security rules have no access to Firestore-stored roles (e.g. "is this user an RJ") without custom auth claims, which this app doesn't use. Gating by "matches the uid that created this specific live session" is the achievable alternative — it doesn't stop unauthorized users from *starting* a session, but it does stop anyone but the current owner from hijacking an *existing* one, which was the actual exploit.

**How to apply:** for any other RTDB tree with a "single active owner" shape (`root.child('.../ownerUidField').val()` reachable via string-concatenated path when nested under a wildcard), reuse this same gating pattern rather than broad `auth != null`. Remember rule changes in `database.rules.json` require manual deploy (`firebase deploy --only database` or Firebase Console) — no Firebase CLI/credentials exist in this dev sandbox to do it automatically.
