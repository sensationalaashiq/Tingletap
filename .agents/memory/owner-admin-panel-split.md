---
name: Owner vs admin panel split
description: How admin console access is split between Owner-only full panel and Owner+Admin moderation-only panel
---

`AdminPanelPage.jsx` (route `/admin-panel`) is restricted to `role === 'owner'` only — admins, moderators, and everyone else are redirected away, both via internal role check and by hiding all navigation entry points (RoomListPage floating button, SettingsSidebar "Admin Controls" section).

Owner + Admin moderation needs (ban/kick/mute users) are served by a separate, lightweight page: `src/pages/BanKickMutePanel.jsx` (route `/mod-panel`). It reuses the *exact same* Firestore/RTDB moderation logic as AdminPanelPage (same `users/{uid}` fields, `rooms/{roomId}/kickedUsers/{uid}`, `IPBanSystem`, and the shared `AdminBanKickModal` component) rather than duplicating collections or adding new listeners — it just runs its own capped `users` query and reuses the RTDB `status` presence tree.

**Why:** the app's moderation escalation ladder distinguishes "full admin console" (owner-only: user role changes, coin/economy tools, feedback replies, device bans, etc.) from "day-to-day moderation" (ban/kick/mute, which admins should also be able to do). Splitting into two pages avoids either over-granting owner-level admin console access to admins, or blocking admins from routine moderation.

**How to apply:** when adding new owner-only tooling to AdminPanelPage, do NOT loosen its role check back to include admin. If admins need a subset of a new capability, extract it into BanKickMutePanel.jsx (or a similar dedicated page) instead.
