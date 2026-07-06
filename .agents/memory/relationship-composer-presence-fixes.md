---
name: Relationship Mark System, Multiline Composer, Presence Fix
description: Three features shipped together in HomePage.jsx — presence ref bug, textarea composer, private one-way relationship marks
---

## Presence Bug Fix
`setUserOnlineStatuses` never existed — only `userOnlineStatusesRef` (useRef). The early-return cleanup effect called the nonexistent setter.
Fix: replace with `userOnlineStatusesRef.current = {}; window.userOnlineStatuses = {}; window.onlineUsers = new Set();`

## Multiline Composer
- Replaced `<input type="text">` with `<textarea ref={textareaRef} className="premium-input-field premium-textarea">`
- **ref={textareaRef} is essential** — existing effects at lines ~1791, ~3351, ~4443 rely on it for auto-resize and focus-after-mention
- Auto-expand in `onChange`: `el.style.height='auto'; el.style.height = Math.min(el.scrollHeight,120)+'px'`
- maxLength={240} on element + paste handler truncates + `handleSendMessage` validates both `newMessage.length` and `trim().length`
- Removed `onKeyPress` Enter-to-send; Enter inserts newline; send only via button
- CSS: remove `height: 44px !important` / `max-height: 44px !important` overrides on `.chat-footer` and `.message-form` — added a final override block at end of `HomePage.css` that sets `height: auto !important`

## Relationship Mark System — Privacy model
- **PRIVATE**: marks are only visible to the person who created them. Never display `profileUser.relationships` (another user's marks) to anyone.
- Storage: `updateDoc(users/{currentUid}, { ['relationships.'+targetUid]: type })` — single write
- Removal: `deleteField()` (imported statically from `firebase/firestore`)
- UI: the profile modal shows only `loggedInUserProfile?.relationships?.[profileUser.uid]` — what the currently logged-in viewer has privately marked
- Guests and self-profile views: `canMark = !isSelf && !isGuest` — popover only available to authenticated non-self viewers

**Why:** Code review mandate — marking relationship labels as private (creator-only) is a firm privacy requirement.
