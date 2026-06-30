---
name: Performance audit fixes
description: Tracks which of the 18 audit fixes were applied and what patterns to follow for future work.
---

## Applied fixes

- **PM listener leak**: `pmListenerRef = useRef(null)` in HomePage.jsx; both PM onSnapshot callers cancel existing listener before creating new one; unmount effect also calls `pmListenerRef.current?.()`.
- **PM query limit**: Both PM listener sites now use `orderBy('createdAt'), limit(30)` on the Firestore query rather than slicing in memory.
- **Message pruning race**: Only the sender of the newest user message triggers the 25-message prune — check `newestUserMsg.uid === myUid` before deleting.
- **IPBanSystem / DeviceBanSystem cleanup**: Added `static _unsubscribe = null` and `static cleanup()` method to both classes; `initialize()` stores return of `onSnapshot` in `_unsubscribe`.
- **Trust score debounce**: `_msgSentCache` in trustSystem.js accumulates MESSAGE_SENT deltas in memory, flushes to Firestore after 5-minute timeout. Violations still write immediately.
- **ChatMessage React.memo**: `const ChatMessage = React.memo(({...}) => { ... });` — wrapping is safe even with internal useState/useRef.
- **Admin users limit**: `query(collection(db, 'users'), limit(100))` — stats reflect only loaded slice.
- **loadAllKickedUsers collectionGroup**: Single `getDocs(collectionGroup(db, 'kickedUsers'))` replaces N+1 per-room getDocs loop; `collectionGroup` imported in AdminPanelPage.jsx.
- **VPN check interval**: Changed from 2 min to 10 min in `startPeriodicVPNCheck`.
- **API keys → env vars**: All keys now use `import.meta.env.VITE_*` with hardcoded fallbacks. Keys: `VITE_ABSTRACT_API_KEY`, `VITE_GIPHY_API_KEY`, `VITE_YOUTUBE_API_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_OTP_TEMPLATE`, `VITE_EMAILJS_RESET_TEMPLATE`, `VITE_OWNER_EMAIL`. Set these in Replit Secrets panel.
- **Owner email env var**: `import.meta.env.VITE_OWNER_EMAIL || 'perplexityai.03@gmail.com'` in AdminPanelPage.
- **Firestore indexes**: Added 5 indexes to firestore.indexes.json — privateMessages(conversationId+createdAt), reports(status+createdAt), modLogs(uid+createdAt), kickedUsers collectionGroup(uid+kickUntil), users(role+createdAt).

## Remaining / not applied

- **useMemo for filtered lists**: Expensive message filters in HomePage render path not yet memoized.
- **LuxuryPrivateMessageWindow / Sidebar memo**: Component-level React.memo not yet added to imported components.
- **usernamePreferences full scan**: `syncAllUsersStyles()` still calls `getDocs(collection(db, 'users'))` on init — high-read risk on large user base.
- **UserProfileContext refactor**: Major refactor to share user profile data via Context instead of prop drilling — high risk, not done.
- **messageTextPreferences idempotency**: Already correct — uses `window._messageStylesUnsubscribe` guard before starting listener.
