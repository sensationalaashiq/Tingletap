---
name: Live username/avatar resolver pattern
description: How stale-username and stale-avatar bugs are fixed app-wide via a shared refcounted resolver
---

`src/utils/liveUsernames.js` exports `subscribeToLiveUser(uid, cb)` plus two hooks:
`useLiveDisplayName(uid, fallback)` and `useLivePhotoURL(uid)`. Both piggyback on the
same refcounted `onSnapshot` per uid (not one listener per call site).

**Why:** denormalized name/photo copies get stored on write (chat messages, reports,
mod logs, RJ/badge applications, friend lists, etc.) and go stale the moment a user
renames or changes their DP. Rewriting every write path to keep copies in sync is far
higher risk than resolving live at render time.

**How to apply:**
- Never call the hooks directly inside a `.map()` callback body — that violates the
  Rules of Hooks (call count varies with list length). Always wrap in a tiny named
  component (e.g. `LiveUserName`, `LiveAppName`, `SidebarLiveName`) that takes
  `{ uid, fallback }` and renders `useLiveDisplayName(uid, fallback) || fallback`.
  Then use it as a JSX element inside the map.
- For avatars: prefer `photoURL || getDefaultAvatarUrl(uid, gender)`, resolving
  `photoURL` live via `useLivePhotoURL(uid)` when the local object doesn't already
  carry a live-synced photoURL (e.g. RJ/badge application docs never store their own
  photo — the DP shown is always the user's account `users/{uid}.photoURL`).
- Already-live spots (self profile headers fed by an existing per-uid/self listener)
  don't need wrapping — check before adding a redundant listener.
- Applied so far: HomePage chat messages, LuxuryPrivateMessageWindow, MinimizedConversations,
  SettingsSidebar (blocked/friends/team lists), AdminPanelPage (violations/reports reportedBy
  & reportedUser), Sidebar room userlist + dropdown, RJVerificationPanel + BadgeVerificationPanel
  (name and avatar). Feedback tab and Users tab were already live via existing `users` onSnapshot
  arrays — don't re-wrap those.
