---
name: Moderation expiry contract
description: How kick/ban/mute duration is passed from AdminBanKickModal to Firestore writers — covers the expiresAt field pattern and why writers must not call parseDurationMs on duration.
---

## Rule
`AdminBanKickModal` computes an absolute `expiresAt` ISO timestamp and passes it in `actionData`. All writers (AdminPanelPage, HomePage, Sidebar) must use `actionData.expiresAt` directly as `kickUntil`/`banUntil`/`muteUntil`. Never call `parseDurationMs(actionData.duration)` to compute an expiry — it silently produces wrong results when `duration` is an ISO string (from the datetime picker).

**Why:** When the custom datetime picker is used, `finalDuration` becomes an ISO timestamp string. `parseDurationMs` does not understand ISO strings so it returns wrong or zero milliseconds. Centralizing the computation in the modal eliminates the ambiguity at the write layer.

**How to apply:**
- In `AdminBanKickModal.jsx` `handleConfirm`: compute `expiresAt` from either `customDatetime` or a relative duration string, then include it in `actionData`.
- In every writer: `const kickUntil = actionData.expiresAt || null;` — no further math needed.
- `duration` in the doc is kept as a human-readable label (e.g., `"3h"`, `"custom"`) for display only. `kickUntil`/`expiresAt` is the authoritative expiry.
- `kickDuration` field on kickedUsers doc must equal `duration` value — `BanKickModal` reads it for the countdown label. The live countdown uses `kickUntil` (absolute) as primary source.

## BanKickModal countdown priority
1. `kickInfo.kickUntil` — absolute timestamp, most accurate, used first.
2. `kickInfo.kickedAt + parseDurationMs(kickInfo.kickDuration ?? kickInfo.duration)` — fallback for legacy docs.

## Auto-expiry side-effect
When countdown reaches zero, `BanKickModal` must:
1. `deleteDoc` the `rooms/{id}/kickedUsers/{uid}` doc.
2. `updateDoc(users/{uid}, { kickedFrom: null })` — otherwise the user stays locked out of the room join guard even after the kick expires.
