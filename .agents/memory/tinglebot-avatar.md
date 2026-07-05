---
name: TingleBot avatar resolution
description: Why TingleBot showed a random human photo instead of a bot identity, and where the fix lives
---

TingleBot (`uid: 'tinglebot_system_official_2024'`) has no real `users/{uid}` Firestore document. Every avatar-resolution path in the app (conversation list, PM message avatars, friend-request-style avatars) falls back to `getDefaultAvatarUrl(uid, gender)` when no cached user profile is found — which deterministically hashes the uid into a `randomuser.me` stock-photo URL. Since TingleBot's uid always hashes to the same photo, it looked like an arbitrary human being was the bot's DP.

**Why:** `getDefaultAvatarUrl()` in `src/utils/roleUtils.js` is the single shared fallback for anywhere `user.photoURL` (or cached profile) is missing — it has no special case for system/bot identities.

**How to apply:** `getDefaultAvatarUrl()` now special-cases `TINGLEBOT_UID` (also exported from `roleUtils.js`) and returns a dedicated bundled mascot image (`src/assets/tinglebot-avatar.png`) instead of hashing into randomuser.me. Any other system/bot uid added in the future should get the same treatment — add the check at the top of `getDefaultAvatarUrl()`, not in each call site, since call sites are numerous (chat, PMs, conversation lists, feedback replies).
