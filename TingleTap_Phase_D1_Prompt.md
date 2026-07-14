# TingleTap — Phase D-I Work Order
## Custom Hook Extraction from `HomePage.jsx`
**Prerequisite:** Phases A, B, C all merged and verified.  
**Goal:** Pull every data-fetching / state-management concern out of `HomePage.jsx` into dedicated hook files, without changing any visible behaviour or JSX structure. After this phase `HomePage.jsx` should drop from ~9,013 lines to roughly 5,500–6,000 lines, with `useState` count falling from 117 to ≤ 60 and `useEffect` count from 48 to ≤ 20.

---

## Ground Rules

1. **No behaviour changes.** Each hook must expose exactly the same state variables and handlers that HomePage currently uses. Rename nothing during this phase.
2. **One hook per PR/commit.** Extract, verify, move on. Never batch two hooks into one commit.
3. **Verify after each hook:** dev server restarts clean, the affected feature still works end-to-end (manual smoke test listed per hook), no new console errors.
4. **Preserve all `window.*` globals for now.** Hooks may still set `window.onlineUsers`, `window.friendsProfiles`, etc. — the global cleanup is Phase D-II.
5. **Hook files go in `src/hooks/`.** Use the `@/` alias introduced in C13 for all imports inside hook files.

---

## Hook 1 — `useChatMessages`
**New file:** `src/hooks/useChatMessages.js`

### What to move
All state and effects that own the chat message stream for the current room:

| State / ref to move | Current approx. location |
|---|---|
| `messages` / `setMessages` | ~L1183 |
| `pendingMessages` / `setPendingMessages` | ~L1184 (C2) |
| `pendingMsgRef` | ~L1585 (C2) |
| `messageCacheRef` | ~L1584 |
| `localAutoModNotices` / `setLocalAutoModNotices` | ~L1187 |
| The main `onSnapshot` listener on `rooms/{roomId}/messages` | large `useEffect` ~L1591–L1730 |
| `retryPendingMessage` useCallback | ~L7230 |

### Hook signature
```js
// src/hooks/useChatMessages.js
export function useChatMessages({ roomId, loggedInUserProfile, blockedUsers, usersWhoBlockedMe }) {
    // ... all moved state + effects ...
    return {
        messages,
        pendingMessages,
        localAutoModNotices,
        setLocalAutoModNotices,
        retryPendingMessage,
        messageCacheRef,   // passed to MessageList for flicker-fix
        pendingMsgRef,     // needed by handleSendMessage
    };
}
```

### In HomePage
Replace the moved `useState`/`useRef`/`useEffect` calls with:
```js
const {
    messages, pendingMessages, localAutoModNotices, setLocalAutoModNotices,
    retryPendingMessage, messageCacheRef, pendingMsgRef,
} = useChatMessages({ roomId, loggedInUserProfile, blockedUsers, usersWhoBlockedMe });
```

### Verify
- Open a room → messages load correctly.
- Send a message → optimistic bubble appears, disappears after confirm.
- Force a network error (DevTools → Offline after page load) → "✗ Failed / ↻ Retry" bubble appears, retry sends on reconnect.
- TingleBot join/leave strips still render.

---

## Hook 2 — `useLiveUsers`
**New file:** `src/hooks/useLiveUsers.js`

### What to move
All state and effects that track who is currently online in the room via RTDB presence:

| State / ref / global to move | Approx. location |
|---|---|
| `liveUsers` / `setLiveUsers` | ~L1225 |
| `userOnlineStatusesRef` | ~L1580 |
| The RTDB `onValue` listener on `status/` + Firestore enrichment batches | `useEffect` ~L3766–L3945 |
| `window.onlineUsers = …` assignments | inside same effect |
| `window.userOnlineStatuses = …` assignments | inside same effect |

### Hook signature
```js
export function useLiveUsers({ roomId, db, rtdb }) {
    return {
        liveUsers,
        setLiveUsers,       // HomePage passes updates from friend-enrichment paths
        userOnlineStatusesRef,
    };
}
```
The hook itself keeps setting `window.onlineUsers` and `window.userOnlineStatuses` (cleanup deferred to D-II).

### Verify
- Open a room → online user list populates.
- Open a second browser tab with a different account → both tabs see each other as online within a few seconds.
- Close a tab → user disappears from the list within RTDB disconnect grace period.

---

## Hook 3 — `useFriendSystem`
**New file:** `src/hooks/useFriendSystem.js`

### What to move
All state, effects, and handlers that manage the current user's friends list and incoming friend requests:

| Item | Approx. location |
|---|---|
| `friendsProfiles` / `setFriendsProfiles` | ~L1239 |
| `friendRequests` / `setFriendRequests` | ~L1240 |
| `friendRequestCount` / `setFriendRequestCount` | ~L1241 |
| `loadFriends` function | ~L2930–L2975 |
| Friend-requests `onSnapshot` listener (with `_senderProfileCache`) | `useEffect` ~L3010–L3070 (C1 fix) |
| `handleAddFriend` | ~L4880 |
| `handleRemoveFriend` | ~L4900 |
| `handleAcceptFriendRequest` | ~L4910 |
| `handleDeclineFriendRequest` | ~L4930 |
| `window.friendsProfiles = …` assignments | multiple locations inside effects |
| `window.friendRequestCount = …` | inside snapshot listener |
| `window.loadFriends = …` | ~L5287 |

### Hook signature
```js
export function useFriendSystem({ currentUid, isGuest, db }) {
    return {
        friendsProfiles,
        friendRequests,
        friendRequestCount,
        loadFriends,
        handleAddFriend,
        handleRemoveFriend,
        handleAcceptFriendRequest,
        handleDeclineFriendRequest,
    };
}
```

### Verify
- Friend request badge count updates when a new request arrives (without page reload).
- Accepting / declining a request updates both sides' lists within one Firestore round-trip.
- "Add Friend" from chat context menu sends the request and shows toast.

---

## Hook 4 — `usePrivateMessages`
**New file:** `src/hooks/usePrivateMessages.js`

### What to move
All state, effects, and handlers for the in-room direct-message (PM) overlay:

| Item | Approx. location |
|---|---|
| `pmHeaderBoxOpen` / `setPmHeaderBoxOpen` | ~L1245 |
| `privateMessage` / `setPrivateMessage` | ~L1246 |
| `privateMessageTarget` / `setPrivateMessageTarget` | ~L1247 |
| `pmMessages` / `setPmMessages` | ~L1248 |
| `pmMessagesLoading` | ~L1249 |
| `dmThreads` / `setDmThreads` | ~L1250 |
| PM `onSnapshot` thread listener | `useEffect` ~L3475–L3530 |
| `handleSendPrivateMessage` | ~L5828 |
| `handleDeletePM` | ~L5880 |
| `handlePrivateMessage` (opens PM box for a given user) | ~L5100 |
| `window.setPmHeaderBoxOpen = …` | ~L5292 |
| `window.pmHeaderBoxOpen = …` | ~L5293 |
| `window.handlePrivateMessageFromSidebar = …` | ~L5120, L5279 |

### Hook signature
```js
export function usePrivateMessages({ currentUser, loggedInUserProfile, blockedUsers, usersWhoBlockedMe, db, roomId }) {
    return {
        pmHeaderBoxOpen, setPmHeaderBoxOpen,
        privateMessage, setPrivateMessage,
        privateMessageTarget, setPrivateMessageTarget,
        pmMessages,
        pmMessagesLoading,
        dmThreads,
        handleSendPrivateMessage,
        handleDeletePM,
        handlePrivateMessage,
    };
}
```

### Verify
- Click "Message" on a user's context menu → PM box opens, thread loads.
- Send a PM → message appears in thread; recipient sees it in real time.
- Delete a PM → soft-deleted for sender only, still visible to recipient.

---

## Hook 5 — `useChatComposer`
**New file:** `src/hooks/useChatComposer.js`

### What to move
All state and effects related to the message composer input, font/style preferences, and the current typed message:

| Item | Approx. location |
|---|---|
| `newMessage` / `setNewMessage` | ~L1195 |
| `fontSize`, `fontColor`, `fontFamily`, `isBold`, `isItalic`, `isUnderline`, `isStrikethrough` | ~L1196–1202 |
| `whisperTarget` / `setWhisperTarget` | ~L1204 |
| `attachmentMenuOpen` / `setAttachmentMenuOpen` | ~L1205 |
| Firestore `chatFontPreferences` listener (reads + writes prefs) | `useEffect` ~L2240–L2310 |
| Local storage font prefs init effect | `useEffect` ~L2420–L2445 |
| `window.chatFontPreferences = …` assignments | ~L2254, L2435, L2692, L4066, L4106, L6116, L6165 |
| `window.newMessage = …` | ~L6177 |
| `window.setNewMessage = …` | ~L6178 |
| `window.textareaRef = …` | ~L5291 |
| `textareaRef` | ~L1571 |

### Hook signature
```js
export function useChatComposer({ currentUid, db }) {
    return {
        newMessage, setNewMessage,
        fontSize, setFontSize,
        fontColor, setFontColor,
        fontFamily, setFontFamily,
        isBold, setIsBold,
        isItalic, setIsItalic,
        isUnderline, setIsUnderline,
        isStrikethrough, setIsStrikethrough,
        whisperTarget, setWhisperTarget,
        attachmentMenuOpen, setAttachmentMenuOpen,
        textareaRef,
    };
}
```

### Verify
- Typing in the composer and changing font colour / size still works.
- Preferences persist across page reload (Firestore round-trip).
- Whisper mode: clicking "Whisper" on a user pre-fills the composer target; sending clears it.

---

## Final State After D-I

`HomePage.jsx` should contain:
- Five one-liner hook calls at the top of `HomePage`
- All `handle*` functions that orchestrate across multiple hooks (e.g. `handleSendMessage`, `handleReportUser`, `handleKickUser`) — these stay in HomePage for now since they touch state from multiple hooks
- All JSX (unchanged)
- The `PendingChatMessage`, `ChatMessage`, `MessageList`, `ImageMessage` inline components (moved in D-II)
- All `window.*` handler registrations (cleaned up in D-II)

**Line count target:** ≤ 6,000 lines.  
**useState target:** ≤ 60.  
**useEffect target:** ≤ 20.

Confirm these counts with `grep -c "useState\|useEffect" src/pages/HomePage.jsx` before declaring D-I complete.
