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

- **usernamePreferences full scan**: `syncAllUsersStyles()` still calls `getDocs(collection(db, 'users'))` on init — high-read risk on large user base.
- **UserProfileContext refactor**: Major refactor to share user profile data via Context instead of prop drilling — high risk, not done.
- **messageTextPreferences idempotency**: Already correct — uses `window._messageStylesUnsubscribe` guard before starting listener.

## Session 2 additions (July 2026)

- **React.memo**: Added to `GenderBadge`, `RoyalTrustBadge`, `PremiumImageMessage`, `TingleBotNotification`. Sidebar's per-row "online user" item was evaluated and deliberately NOT memoized — too many closures/portal/mod-action wiring for the perf gain; treat as a standing exception, not an oversight.
- **useMemo for filtered lists**: Sidebar's online-user filter/sort/dedupe pipeline (`filteredUsers`) now memoized on `[liveUsers, searchQuery, genderFilter]`. Other HomePage message-filter pipelines were NOT surveyed/memoized this pass — still open if revisited.
- **Extracting ChatInput.jsx / MessageList.jsx from HomePage.jsx**: Evaluated and deferred both times across two sessions. File is 8,300+ lines with deeply tangled state; treat this as needing a dedicated, carefully-scoped session rather than bundling with smaller perf fixes.
- **Timer leak in WelcomeDashboard.jsx**: Ban-modal polling `setInterval` wasn't cleared on unmount; fixed with a ref + cleanup. When auditing `setInterval`, distinguish real leaks from intentional persistent ones (see below).
- **Ban-lockdown intervals are intentional**: `LoginPage.jsx`, `SignupPage.jsx`, and `App.jsx` each run a persistent interval to keep enforcing an active ban screen — do not "fix" these, it would change visible behavior.
- **Shared profile cache**: `src/utils/userProfileCache.js` (60s TTL, in-flight dedup) is the canonical place for user-profile caching; wired into Leaderboard.jsx. Prefer wiring new call sites into this utility over building bespoke local caches.
- **RJFollowSystem**: Follower/following counts use one-time `getCountFromServer` + optimistic local updates instead of persistent `onSnapshot` listeners on the subcollections — avoids listener buildup for a rarely-changing count.
- **Gotcha**: when wrapping a component in `React.memo(...)`, make sure there's exactly one matching closing `});` for that component — files with multiple sibling function components (e.g. a memoized main export + a plain named export below it) can end up with a mismatched brace if you search-replace the wrong `};` occurrence. Always rebuild (`vite build`) after memo-wrapping edits to catch this early.

## Session 5 additions (July 3, 2026)

- **Shared singleton listener pattern for duplicate Firestore listeners**: when two+ components independently run the same `onSnapshot` query (e.g. Sidebar + a list page both listening to `rooms`), extract a ref-counted singleton hook (module-level `unsubscribeFn` + `listenerRefCount` + `Set` of subscriber setState callbacks) rather than lifting state into Context — lower-risk for a large codebase since each consumer keeps its own local state, just fed by one shared subscription.
- **Debounce network writes, not local UI updates**: for user-preference sliders/typing (username/message style prefs), apply the local/instant UI effect synchronously every time, but debounce only the Firestore write (500ms, per-user timer map) — this collapses rapid changes into one write without any perceived lag.
- **Time-boxed module-level cache for rarely-changing modal data**: for admin/staff modals that re-fetch the same mostly-static data (rooms, user list) every open/close toggle, a simple module-level `{ data, fetchedAt }` cache with a fixed TTL (e.g. 60s) avoids re-subscribing without needing a full shared-context refactor.
- **Rules-of-hooks risk in large files**: when a big legacy file (5000+ lines) has multiple filter/sort computations embedded inside inline render-time IIFEs, only memoize the ones outside IIFEs unless you're willing to restructure — wrapping hooks inside an IIFE is invalid and risky to retrofit safely under time pressure.
