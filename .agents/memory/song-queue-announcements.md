---
name: Song Queue & Announcements
description: RTDB-based song request queue and RJ broadcast announcements in BroadcastPanel
---

## Song Queue (broadcasts/rj/songQueue/{uid})
- One entry per listener uid — prevents duplicate requests
- Status lifecycle: pending → approved/rejected/skipped
- Rejected/skipped entries auto-remove after 2-4s timeout
- URL validation: `_containsURL()` in BroadcastPanel.jsx catches protocols, www, known platforms, shorteners, and plain TLDs (comprehensive multi-pattern regex)
- Listener can cancel their own pending request

## Announcements (broadcasts/rj/announcements/{pushId})
- Push ID keys (not uid) — RJ can send multiple
- Clears automatically when handleEndBroadcast fires (explicit remove + full RTDB node remove)
- Latest 3 appear as strips in listener view (tab 0); full list in tab 3

**Why:** RTDB chosen for real-time low-latency updates; Firestore would add unnecessary cost/complexity for ephemeral session data.

**How to apply:** Both paths sit under `broadcasts/rj/` so they're cleaned up when `handleEndBroadcast` calls `remove(ref(rtdb, 'broadcasts/rj'))`.
