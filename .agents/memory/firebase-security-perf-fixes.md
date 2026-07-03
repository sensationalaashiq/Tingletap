---
name: Firebase security and performance fixes
description: 10 security/performance optimizations applied to TingleTap; key decisions and patterns for future consistency.
---

## Summary
10 Firebase/security fixes applied in one session. Zero UI/UX/behavior changes intended.

## FIX 1+2 — Room-scoped style listeners (messageTextPreferences.js / usernamePreferences.js)
- `initializeGlobalMessageStyles(roomParticipantUids=[])` and `initializeUsernameStyles(roomParticipantUids=[])` now accept UID arrays.
- Chunk UIDs into groups of 30 and use `where(documentId(), 'in', chunk)` — one listener per chunk.
- Empty array (default) = tear down all listeners, create none.
- **Called from**: HomePage.jsx messages snapshot handler (after `setMessages(newMessages)`); extracts `senderUids` and re-initializes only when the UID set changes (`window._lastStyleUidKey`).
- App.jsx still imports them but calls them with no args (no-op) at login; room-level calls happen in the room flow.

## FIX 3 — Lazy per-UID profile fetching (HomePage.jsx)
- Removed `onSnapshot(collection(db,'users'))` — was downloading ALL user profiles to every client.
- Replaced with `window.fetchUserProfile(uid)`: checks `window.userProfilesCache` (Map) with 5-minute TTL before calling `getDoc()`.
- Cache also populates `window.userMessageStyles[uid]` for font rendering.
- Dispatches `userProfileUpdated` CustomEvent for DOM avatar refresh.

## FIX 5 — Single Firestore listener for own profile (App.jsx + HomePage.jsx)
- App.jsx keeps the `onSnapshot(doc(db,'users',currentUser.uid))` listener (it handles ban detection).
- After `setUserProfile(resolvedProfile)`, App.jsx sets `window._appUserProfile = resolvedProfile` and dispatches `window.dispatchEvent(new CustomEvent('_appUserProfileChanged', { detail: resolvedProfile }))`.
- HomePage.jsx `useEffect([user, roomId, navigate])` now:
  - Uses `getDoc()` once for initial load
  - Listens to `_appUserProfileChanged` window event for real-time updates
  - `handleLoggedInProfile(userData)` extracts ALL logic (fonts, blockedUsers, settings, darkMode, loggedInUserProfile state)
- The "Real-time friends list updates" listener (old line 2829) was ALSO removed — the App.jsx event already carries the full profile including friends.
- **Why:** Multiple `onSnapshot` on the same document `users/{uid}` were redundant and wasteful.

## FIX 6 — Shared WarningsContext (src/contexts/WarningsContext.jsx)
- ONE listener for `warnings_announcements` (newest 100, ordered by createdAt desc).
- Auth-gated: `onAuthStateChanged` guard before opening Firestore listener to avoid permission-denied errors on app load.
- `WarningsProvider` wraps `<BrowserRouter>` in App.jsx.
- WarningAnnouncementPopup and WarningAnnouncementManager consume `useWarnings()` instead of creating their own listeners.

## FIX 7 — Admin RTDB status cap (AdminPanelPage.jsx)
- Status structure is FLAT: `status/{uid} = { state, currentRoomId, last_changed, ... }` — NOT nested by roomId.
- AdminPanel reader was previously treating it as nested (pre-existing bug); fixed to flat traversal.
- Cap at 200 entries (sort by `last_changed` desc, slice 0-200).
- Comment added: production should use a Cloud Function aggregate.

## FIX 8 — Remove hardcoded admin123 (security.js + VPNBlockModal.jsx)
- `ADMIN_BYPASS.password` now reads from `import.meta.env.VITE_ADMIN_BYPASS_PASSWORD`.
- `.env.local` created with placeholder value. Already in `.gitignore`.
- `console.warn` fires if env var is absent at runtime.

## FIX 9 — OTP security (emailService.js)
- OTP is hashed with `CryptoJS.SHA256(otp).toString()` before storage.
- Stored only in `sessionStorage` (keys: `otp_hash_{email}`, `otp_exp_{email}`).
- `verifyOTP`: hashes entered value, compares to stored hash, deletes immediately on match or expiry.
- `clearOTP`: removes both sessionStorage keys.

## FIX 10 — RTDB rules (database.rules.json)
- `status`: any auth user may READ (presence is not sensitive); only owner may WRITE their uid.
- `broadcasts/rj/listeners/$uid`, `speakers/$uid`, `joinRequests/$uid`, `connections/$uid`: write scoped to `auth.uid === $uid`.
- `privateMessages/$conversationId`: read/write restricted to `$conversationId.contains(auth.uid)` — best-effort in RTDB (no regex); strong enough given 28-char UID randomness. Note: full security requires an explicit participants map.

## Known remaining limitations
- FIX 4 (WarningAnnouncementModal users limit): server-side `getDocs` search not yet wired to search input — existing client-side filter over 100 users is functional for typical use.
- FIX 10 privateMessages participant check: `.contains()` is substring — should be upgraded to a participants-map approach if UIDs ever overlap.
