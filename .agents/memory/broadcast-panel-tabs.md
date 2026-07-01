---
name: BroadcastPanel 5-tab layout
description: Current tab numbering after Phase 1 feature addition
---

## Tab map (as of Phase 1)
- Tab 0: Studio (RJ) / Live (Listeners) — RJ controls + listener broadcast view
- Tab 1: Stage — Join Stage requests
- Tab 2: Songs — Song Request Queue
- Tab 3: Updates — Announcements
- Tab 4: Public — Public Broadcasts

**Why:** Added Songs + Updates as tabs 2 & 3, pushing Public from 2 → 4.

**How to apply:** Any new tab must be added at the end (tab 5+) and its renderTabBadge case added.
