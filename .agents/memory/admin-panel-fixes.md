---
name: Admin Panel — last-seen, coordinates, reports
description: Key lessons from fixing AdminPanelPage last-seen date, geo-coordinates, and adding Reports/Appeals tab
---

## Last Seen
- RTDB status object has `lastChanged` (most reliable), `lastSeen`, `connectedAt` — in that order of preference.
- If user is online (`status?.state === 'online'`), return the literal string `'Online'` — display it as "🟢 Online Now".
- Old code fell through to `user.lastLoginAt` (Firestore), which stored the original login date — NOT current activity.

**Why:** `lastLoginAt` is only updated on sign-in, not on every session reconnect. RTDB `lastChanged` is written by Firebase presence system on every disconnect.

**How to apply:** Always check `status?.lastChanged || status?.lastSeen` BEFORE any Firestore timestamp field.

## Coordinates / IP
- IP field on RTDB status is NOT always populated — also try `status?.ipAddress`, `user.lastIP`, `user.ipAddress`, `user.ip`.
- Coordinates come from ip-api.com via `fetchIPGeo(ip)` — only called when IP is not 'Unknown'. If all IP sources are 'Unknown', coords will never show.

## Reports Tab
- Reports stored in Firestore `reports` collection (written by HomePage.jsx `addDoc`).
- Report document shape: `{ reportType, messageId, messageText, roomId, category, reason, reportedUser:{uid,name}, reportedBy:{uid,name}, timestamp, status }`
- Status lifecycle: `pending` → `resolved` | `dismissed` | `action_taken` | `appeal_accepted` | `appeal_rejected`
- Admin panel reads with `orderBy('timestamp','desc')` — no composite index needed (single-field).
- Sub-tabs: all / users / messages / appeals / pending — filtered client-side.
- Action handler: `handleReportAction(reportId, action, reportData)` — opens AdminBanKickModal for ban/mute actions.
