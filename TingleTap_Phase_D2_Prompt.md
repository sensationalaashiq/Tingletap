# TingleTap — Phase D-II Work Order
## Component Extraction + Window Global Elimination from `HomePage.jsx`
**Prerequisite:** Phase D-I fully merged and verified (all five hooks extracted, dev server clean).  
**Goal:** Extract the large inline components out of `HomePage.jsx` into their own files, and replace every `window.*` global bridge with a proper React mechanism (context or direct props). After this phase `HomePage.jsx` should be under 3,000 lines and contain zero `window.*` assignments for state/handler bridging.

---

## Ground Rules

1. **No behaviour changes.** Component extraction = move code, fix imports, verify. No redesigns.
2. **Eliminate `window.*` globals one cluster at a time**, verifying after each cluster that the feature still works.
3. **Co-locate related components.** New files go in `src/components/chat/` (chat-specific) or `src/components/icons/` (SVG icons).
4. **Use `@/` alias** for all new imports.
5. **Verify after each step** with the smoke tests listed.

---

## Step 1 — Extract SVG Icon Components
**New file:** `src/components/icons/ChatIcons.jsx`

Move all inline SVG components currently defined at the top of `HomePage.jsx` into one named-export file:

| Component | What it is |
|---|---|
| `SendIconSVG` | Paper-plane send button icon |
| `AttachmentIconSVG` | Paperclip / attachment menu icon |
| `PremiumDeleteIcon` | Trash icon on premium message context menu |
| `PremiumPrivateBoxIcon` | DM/PM box icon |
| `MusicIcon` | Song-queue icon |
| `CustomMenuIcon` | Hamburger / kebab menu icon |
| `MaleIconSVG` | Gender indicator |
| `FemaleIconSVG` | Gender indicator |
| `DeleteIconSVG` | Generic delete |
| `KickIconSVG` | Kick action icon |
| `RecordIconSVG` | Audio record icon |
| `UploadIconSVG` | Upload icon |
| `CloseIconSVG` | Close / X icon |

After moving, update the single import in `HomePage.jsx`:
```js
import {
    SendIconSVG, AttachmentIconSVG, PremiumDeleteIcon, PremiumPrivateBoxIcon,
    MusicIcon, CustomMenuIcon, MaleIconSVG, FemaleIconSVG,
    DeleteIconSVG, KickIconSVG, RecordIconSVG, UploadIconSVG, CloseIconSVG,
} from '@/components/icons/ChatIcons';
```

### Verify
- Room page loads with no missing icons anywhere (chat input, context menus, attachment bar).

---

## Step 2 — Extract `ImageMessage` Component
**New file:** `src/components/chat/ImageMessage.jsx`

`ImageMessage` is currently defined inline near the top of `HomePage.jsx`. Move it to its own file as a default export. It receives `message` and `loggedInUserProfile` as props (check exact prop list before moving).

```js
// src/components/chat/ImageMessage.jsx
export default function ImageMessage({ message, loggedInUserProfile }) { ... }
```

Update `HomePage.jsx`:
```js
import ImageMessage from '@/components/chat/ImageMessage';
```

`ChatMessage` (which renders `ImageMessage`) may need the same import update if it's also extracted — do this step first since `ChatMessage` depends on it.

### Verify
- Send an image in a room → renders correctly with expand/zoom behaviour.
- Image messages from other users render correctly.

---

## Step 3 — Extract `PendingChatMessage` Component
**New file:** `src/components/chat/PendingChatMessage.jsx`

Move the `PendingChatMessage` component (added in C2) from `HomePage.jsx`:
```js
// src/components/chat/PendingChatMessage.jsx
export default React.memo(function PendingChatMessage({ message, onRetry }) { ... });
```

Update `HomePage.jsx`:
```js
import PendingChatMessage from '@/components/chat/PendingChatMessage';
```

### Verify
- Send a message → optimistic bubble still appears and disappears.
- Force a send failure → "✗ Failed / ↻ Retry" button still renders and works.

---

## Step 4 — Extract `ChatMessage` Component
**New file:** `src/components/chat/ChatMessage.jsx`

`ChatMessage` is the largest inline component (~700 lines). Move it as a default export. It already has a clean prop interface. Before moving, confirm its exact imports (it uses DOMPurify, badge data, `getRoleDisplayLabel`, `getGenderBorderClass`, `useLiveDisplayName`, `useLivePhotoURL`, `ImageMessage`).

Checklist before moving:
- [ ] List every import `ChatMessage` uses (grep for identifiers it references).
- [ ] Copy those imports into `ChatMessage.jsx`; do NOT import them again in `HomePage.jsx` if they're only needed there.
- [ ] `getGenderBorderClass` is a tiny pure function defined just above `ChatMessage` — move it into `ChatMessage.jsx` since nothing else uses it.

```js
// src/components/chat/ChatMessage.jsx
import React from 'react';
import DOMPurify from 'dompurify';
import ImageMessage from '@/components/chat/ImageMessage';
import { useLiveDisplayName, useLivePhotoURL } from '@/utils/liveUsernames';
import { getRoleDisplayLabel } from '@/utils/roleUtils';
// ... other deps ...

export default React.memo(function ChatMessage({ ... }) { ... });
```

Update `HomePage.jsx`:
```js
import ChatMessage from '@/components/chat/ChatMessage';
```

### Verify
- Messages render with correct avatars, badges, role colours.
- Context menu (delete/kick/report/whisper/block) opens and all actions work.
- Translation button (useTranslation) still works if present inside ChatMessage.
- Badge icons render without clipping (regression check from `inline-badge-clipping` memory note).

---

## Step 5 — Extract `MessageList` Component
**New file:** `src/components/chat/MessageList.jsx`

`MessageList` is the memoized list container. It depends on `ChatMessage`, `PendingChatMessage`, `TingleBotNotification` (already external), and the parity `msgParityRef`. Move it with its full prop interface.

```js
// src/components/chat/MessageList.jsx
import React from 'react';
import ChatMessage from '@/components/chat/ChatMessage';
import PendingChatMessage from '@/components/chat/PendingChatMessage';
import TingleBotNotification from '@/components/TingleBotNotification';

const MessageList = React.memo(function MessageList({ messages, ..., onRetryPending }) { ... });
export default MessageList;
```

Update `HomePage.jsx`:
```js
import MessageList from '@/components/chat/MessageList';
```

Also move `useStableCallback` (currently defined inside `HomePage.jsx` just above `ChatMessage`) into `src/hooks/useStableCallback.js` since it's a generic utility now used by multiple files.

### Verify
- Full chat render with 60 messages: no flicker, correct even/odd row striping.
- Scroll-to-bottom works on new message.
- Pending/failed bubbles appear at the bottom of the list.

---

## Step 6 — Extract `ChatComposer` Component
**New file:** `src/components/chat/ChatComposer.jsx`

The composer is the textarea + formatting toolbar + send/attachment buttons. It is currently JSX inline inside HomePage's return. Extract it as a component that receives all the state from `useChatComposer` (already extracted in D-I) plus the send handler and room metadata.

Props it needs (derive exact list from the JSX block):
- `newMessage`, `setNewMessage`, `textareaRef`
- `fontSize`, `fontColor`, `fontFamily`, `isBold`, `isItalic`, `isUnderline`, `isStrikethrough` + their setters
- `whisperTarget`, `setWhisperTarget`
- `attachmentMenuOpen`, `setAttachmentMenuOpen`
- `onSendMessage` (= handleSendMessage)
- `onSendImage`, `onSendAudio`, `onSendSticker`, `onSendYouTube`
- `loggedInUserProfile`, `roomId`, `roomName`
- `isGuest`, `isMuted`, `isKicked`

```js
// src/components/chat/ChatComposer.jsx
export default function ChatComposer({ newMessage, setNewMessage, ... }) { ... }
```

In `HomePage.jsx`:
```jsx
<ChatComposer
    newMessage={newMessage}
    setNewMessage={setNewMessage}
    onSendMessage={handleSendMessage}
    ...
/>
```

### Verify
- Type a message, change font colour, send → works end-to-end.
- Attachment menu (image / audio / sticker / YouTube) opens correctly.
- Whisper mode indicator shows and clears after send.
- Emoji picker (if present in composer area) still works.
- Muted / kicked users cannot send (input disabled state still applies).

---

## Step 7 — Eliminate `window.*` Global Bridges

Replace all `window.*` assignments used to bridge state/handlers to other components (SettingsSidebar, Sidebar, etc.) with a `HomePageBridgeContext`.

### 7a — Create the context
**New file:** `src/context/HomePageBridgeContext.js`

```js
import { createContext, useContext } from 'react';

export const HomePageBridgeContext = createContext(null);

export function useHomePageBridge() {
    const ctx = useContext(HomePageBridgeContext);
    if (!ctx) throw new Error('useHomePageBridge must be used inside HomePage');
    return ctx;
}
```

### 7b — Wrap the return with the provider
In `HomePage.jsx`, wrap the outer `<>` in:
```jsx
<HomePageBridgeContext.Provider value={bridgeValue}>
    ...existing JSX...
</HomePageBridgeContext.Provider>
```

Where `bridgeValue` is a stable `useMemo` object (deps: the handlers themselves, which are already stable via `useStableCallback`):
```js
const bridgeValue = useMemo(() => ({
    // Sidebar actions
    handleViewProfile,
    handlePrivateMessage,
    handleBlockUser,
    handleAddFriend,
    handleWhisperUser,
    updateOnlineStatusVisibility,
    // Composer bridges
    setNewMessage,
    textareaRef,
    setPmHeaderBoxOpen,
    pmHeaderBoxOpen,
    // Profile / avatar
    setProfileUser,
    updateUserAvatarInHomePage,
    getPrivateMessageAvatarUrl,
    // Friends
    loadFriends,
    friendsProfiles,
    // TingleBot
    handleTingleBotAnnouncement,
    handleTingleBotAnnouncementAllRooms,
    // Notification sound
    playNotificationSound,
    // Font preferences (read-only snapshot)
    chatFontPreferences,
}), [/* list all stable handlers — they don't change since they're wrapped in useStableCallback */]);
```

### 7c — Update consumers
Any component that currently reads from `window.*` (primarily `SettingsSidebar`, `Sidebar`, `BroadcastPanel`) should instead call `useHomePageBridge()` to get the same values. Make the minimum targeted change per component — don't refactor the consumers beyond replacing the `window.*` reads with context reads.

Audit each consumer:
- `src/components/SettingsSidebar.jsx` — reads `window.handleViewProfile`, `window.setProfileUser`, `window.handlePrivateMessageFromSidebar`, `window.handleBlockUserFromSidebar`, `window.handleAddFriendFromSidebar`, `window.handleWhisperFromSidebar`, `window.chatFontPreferences`, `window.setPmHeaderBoxOpen`, `window.pmHeaderBoxOpen`, `window.setNewMessage`, `window.textareaRef`, `window.friendsProfiles`, `window.loadFriends`, `window.updateOnlineStatusVisibility`
- `src/components/Sidebar.jsx` (if present) — similar set
- `src/pages/BroadcastPanel.jsx` — reads `window.handleTingleBotAnnouncement`, `window.playNotificationSound`
- Any other consumer found by: `grep -rn "window\.handle\|window\.set\|window\.friends\|window\.chat\|window\.pm\|window\.tingle\|window\.play\|window\.online\|window\.fetch\|window\.update\|window\._apply\|window\.user" src/`

After updating each consumer, delete the corresponding `window.X = ...` assignment from `HomePage.jsx`.

### 7d — Remove remaining `window.*` style globals
The `window.userMessageStyles`, `window.userOnlineStatuses`, `window.onlineUsers` globals are used by components for real-time checks. Options (pick the simpler one per case):
- **`window.onlineUsers` / `window.userOnlineStatuses`:** Pass `userOnlineStatusesRef` and the online set down through context instead of as globals. SettingsSidebar/Sidebar reads these to show online indicators — they already re-render on their own state, so reading from context ref is safe.
- **`window.userMessageStyles`:** Used to style message bubbles based on user preferences — read it from context or pass `chatFontPreferences` directly.

### 7e — Remove `window.chatFontPreferences` cascade
`window.chatFontPreferences` is written in 7+ locations and read by SettingsSidebar to show a live preview. After the bridge context is in place, replace the reads with `bridgeValue.chatFontPreferences` from context, and remove all `window.chatFontPreferences = ...` assignments from `HomePage.jsx`.

### Verify (after each window.* cluster removal)
- Open SettingsSidebar → font preferences panel shows current values correctly.
- Change font colour in SettingsSidebar → chat preview updates in real time.
- Sidebar user list → online/offline indicators are correct.
- TingleBot announcements from BroadcastPanel still appear in chat.
- Notification sound plays on new private message.

---

## Final State After D-II

`HomePage.jsx` should contain:
- Five custom hook calls (from D-I)
- `bridgeValue` useMemo for context
- `HomePageBridgeContext.Provider` wrapping the return
- All orchestrating `handle*` functions that span multiple hooks (handleSendMessage, handleReportUser, handleKickUser, etc.)
- Import statements only — no inline component definitions
- Zero `window.*` assignments for state/handler bridging

**Line count target:** ≤ 3,000 lines.  
**useState target:** ≤ 30 (all from hooks).  
**useEffect target:** ≤ 8 (all from hooks; remaining ones are room-lifecycle effects that legitimately belong in HomePage).  
**`window.*` assignments:** 0 (for state/handlers; `window.cleanupHomePageListeners` debug helper may remain).

Confirm final counts:
```bash
grep -c "useState\|useEffect" src/pages/HomePage.jsx
grep -n "window\." src/pages/HomePage.jsx | grep "= " | grep -v "//"
wc -l src/pages/HomePage.jsx
```

---

## Execution Order Summary

| Step | Risk | Time estimate |
|---|---|---|
| 1 — SVG icons | Very low | 20 min |
| 2 — ImageMessage | Low | 15 min |
| 3 — PendingChatMessage | Low | 10 min |
| 4 — ChatMessage | Medium (large file, many deps) | 45 min |
| 5 — MessageList + useStableCallback | Medium | 30 min |
| 6 — ChatComposer | Medium-high (large prop surface) | 60 min |
| 7a–c — Bridge context + consumer updates | High (cross-file) | 90 min |
| 7d–e — window.* globals cleanup | Medium | 45 min |

Do steps 1–5 first — they are pure moves with minimal risk. Step 6 and 7 touch live prop surfaces and the cross-component bridge, so do them last with careful smoke testing.
