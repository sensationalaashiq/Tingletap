---
name: Firestore Security Rules
description: Key decisions and constraints for TingleTap's production Firestore rules
---

## TingleBot UID
The verified system account UID is `tinglebot_system_official_2024`.
Only this UID (or staff) may write documents that carry system flags:
`isBot`, `systemBot`, `isSystem`, `isAutoMod`, `isAnnouncement`, `isModerationNotice`.

**Why:** Prevents any normal user or guest from spoofing TingleBot messages, fake AutoMod actions, or fake join/leave/moderation notices.

## Role Hierarchy
`owner > admin > moderator > user (registered) > guest`
Implemented via `getRole(uid)` which is null-safe (returns `'user'` if doc missing).
- `isRegistered()` = `myRole() != 'guest'` (covers user + all staff)
- `isGuest()` = `myRole() == 'guest'`
- Badge holders = role `'user'` with a `badge` field — no special role.

## Guest Restrictions Enforced in Rules
- **Cannot**: whisper, friend request, voice/video calls, conversations, presence updates, username/message styling, achievements, font/profile/display-name changes.
- **Can**: room chat (read + send), PM other guests only, audio uploads only, reports, feedback, theme/darkMode/notification preferences.
- **Profile updates**: only `guestAllowedFields` (session/device/notification fields — no displayName, username, email, photoURL, fonts).

## Staff Hierarchy Enforcement
`canStaffModifyTarget(uid)` checks target's role:
- Owner: unrestricted
- Admin: cannot touch owner
- Moderator: cannot touch owner or admin

## Privilege Escalation Prevention
- `create` on `/users/{uid}`: role may only be `'user'` or `'guest'`; `isBanned`, `bannedBy`, `bannedAt`, `mutedInfo` fields are blocked on creation.
- Badge field can only be set by owner/admin via the staff update path.
- `staffOnlyFields` list (`role`, `isBanned`, `mutedInfo`, `badge`, etc.) only reachable via the staff update rule.

## Key Collection Permissions Summary
| Collection | Guest Read | Guest Write | Notes |
|---|---|---|---|
| rooms/messages | ✅ (if not banned/kicked) | ✅ (no system flags) | All users |
| privateMessages | ✅ (own) | ✅ (to guests only) | Guest→guest only |
| whispers | ❌ | ❌ | Registered only |
| calls | ❌ | ❌ | Registered only |
| conversations | ❌ | ❌ | Registered only |
| friendRequests | ❌ | ❌ | Registered only |
| presence | ✅ | ❌ | No guest presence writes |
| globalUsernameStyles | ✅ | ❌ | Registered only |
| globalMessageStyles | ✅ | ❌ | Registered only |
| uploads | ✅ | audio only | MIME: `audio/.*` |
| notifications | own only | own only | Staff/TingleBot: any user |
| reports | own only | ✅ | All (if not banned) |
| feedback | own only | ✅ | All (if not banned) |
| bannedIPs/bannedDevices | ✅ | ❌ | Admin+ write |
| modLogs | ❌ | ❌ | Staff + TingleBot |
| warnings_announcements | ✅ | ❌ | Staff + TingleBot write |
| settings | ❌ | ❌ | Staff read, admin+ write |

## Mute Enforcement
Muted users cannot: send room messages, send PMs, send whispers, send conversation messages.
Muted users CAN: read everything they are entitled to read.
Staff bypass mute.

## Catch-All
`match /{document=**}` → only owner/admin. Locks any new collection added in the future until explicit rules are written.
