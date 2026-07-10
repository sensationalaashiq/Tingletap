---
name: TingleBot notice direct Firestore write
description: Automod notices now bypass Netlify function; written directly to Firestore by the claiming staff client for speed.
---

## Rule
TingleBot automod notices (warn/delete_warn/mute/kick) are written directly via `addDoc` to `rooms/{roomId}/messages` from the staff client that wins `claimEnforcement()`. The Netlify `post-automod-notice` function is NO LONGER called for any notice.

**Why:** Netlify function added 300–800 ms latency per notice. Direct Firestore write from staff client is ~50–100 ms. `claimEnforcement()` transaction dedup already ensures only one staff client writes.

**How to apply:**
- `tinglebotAutoMod.js` → `processAutoMod`: `_noticeText` and `_noticeTinglebotType` are hoisted before the `canPostNotice` block so the staff enforcement block below can use them.
- Notice write happens INSIDE the `if (!claimed) return;` guard.
- `postNotice()` function is still exported (for possible future use) but is NOT called anywhere in normal flow.
- `onSelfNotice` still fires at 0 ms on the violator's own client for instant local feedback.

## targetUid filtering (also fixed in same session)
- `MessageList` filter now checks `msg.targetUid` for TingleBot messages — if set, only renders for the matching user (`loggedInUserProfile?.uid`).
- `localAutoModNotices` are merged into the rendered message list so self-notices actually display.
- Dedup: while a local self-notice is active (same `tinglebotType`), the matching Firestore-persisted copy is suppressed from render. After 60 s the local notice expires and the Firestore copy shows naturally.

## Edge case: no staff in room
If no staff client is online, `claimEnforcement` never runs and no notice is written to Firestore. The violating user still sees the instant local `onSelfNotice` on their own device (via `localAutoModNotices` merge). This is acceptable and consistent with enforcement being staff-gated.
