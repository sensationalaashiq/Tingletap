---
name: Join/Leave TingleBot Notifications
description: Why join/leave messages disappeared in <1s for non-staff users, and the fix.
---

## Rule

Join/leave presence messages MUST use the real user's Firebase UID (`currentUid`) as the document `uid`. They must NOT set `isBot: true` or `systemBot: true`. Only `tinglebotType: 'join'` / `'leave'` is needed for UI rendering.

**Why:** Firestore rules only allow `isBot/systemBot` flags from `isTingleBot()` (uid='tinglebot_system_official_2024') or `isStaff()`. Regular users/guests writing those flags get an optimistic local write (shows for <1s) that is then rejected server-side and rolled back — making the notification vanish almost instantly.

**How to apply:**
- When adding any new self-reported presence event written by non-staff users: use real uid, omit system flags, rely on `tinglebotType` for detection.
- All client-side TingleBot detection must include `|| msg.tinglebotType` alongside the legacy `isBot/systemBot/uid` checks.
- All client-side guards (automod scan, sound, 25-msg pruner, owner auto-delete) must also gate on `tinglebotType`.
- Firestore rules have a `claimsPrivilegedTinglebotType()` helper that only allows `tinglebotType: 'join'` or `'leave'` from non-staff; any other value (muted, kicked, etc.) is staff-only.
- Staff-written TingleBot events (kicked, muted, banned, etc.) still use `uid: 'tinglebot_system_official_2024'` with `isBot: true` / `systemBot: true` via the `isStaff()` path.
