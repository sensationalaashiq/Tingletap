---
name: Kick expiry pattern
description: How kick expiry is detected and handled in RoomListPage and BanKickModal — root cause of "modal persists after kick expires" bug.
---

## Rule
`handleRoomClick` in `RoomListPage.jsx` MUST call `isKickExpired(kickData)` immediately after reading the `kickedUsers/{uid}` doc. If expired → silently `deleteDoc` + `updateDoc kickedFrom: null` and fall through to allow room entry. Never set `showBanKickModal(true)` for an expired kick.

**Why:** The kick doc may still exist in Firestore when the user clicks a room (deleteDoc is async; the prior modal session may have only just issued the delete). Without this pre-check, the user sees the modal again on every room click until Firestore propagates the delete.

## How to apply
- Import `isKickExpired` from `src/utils/modExpiryService.js` in any page that does live kick checks.
- Pattern:
  ```js
  const kickSnap = await getDoc(doc(db, 'rooms', roomId, 'kickedUsers', userId));
  if (kickSnap.exists()) {
    const kd = kickSnap.data();
    if (isKickExpired(kd)) {
      deleteDoc(...).catch(() => {});
      updateDoc(doc(db, 'users', uid), { kickedFrom: null }).catch(() => {});
      // fall through — allow entry
    } else {
      // show BanKickModal
      return;
    }
  }
  ```
- BanKickModal auto-close delay: 1200 ms (enough to show the green "Kick Expired" banner).
- `bannedBy` / `kickedBy` displayed as "Administrator" (not actual username) for privacy.
