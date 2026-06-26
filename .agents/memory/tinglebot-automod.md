---
name: TingleBot AutoMod Architecture
description: Key design decisions for the TingleBot intelligent auto-moderation system
---

## Staff-only enforcement model

Detection (pattern matching, rate tracking) runs on ALL connected clients.
Enforcement (deleteDoc, updateDoc mute, setDoc kick, addDoc TingleBot notice) runs ONLY when the viewing client is `owner/admin/moderator`.

**Why:** Firestore security rules restrict message deletion, user muting, and kickedUsers writes to staff. Client-side automod must respect existing rules rather than trying to bypass them.

**How to apply:** Pass `isStaff = ['owner','admin','moderator'].includes(loggedInUserProfile?.role)` as the 4th argument to `processAutoMod()`. Non-staff calls return early after updating in-memory counters.

## Duplicate enforcement prevention

Firestore transaction at `rooms/{roomId}/automod/{messageId}` is used as an atomic claim. First staff client to write this doc proceeds; others see the doc exists and return. This prevents two staff members both posting a TingleBot notice for the same violation.

**Why:** `deleteDoc` and `updateDoc` (mute) are idempotent, but `addDoc` (TingleBot notice) is not — without the claim, N staff clients would post N duplicate notices.

## processedMsgIds Set (module-level)

`processedMsgIds` in `tinglebotAutoMod.js` prevents re-running detection on the same message ID within a session (e.g. when snapshot fires again after a message is deleted).

Call `resetAutoModState()` when the user leaves/changes rooms (in the useEffect cleanup return).

## Snapshot integration

AutoMod is called inside the `onSnapshot` handler on every snapshot update (not just when `newMessages.length > prevMsgCount`) using `newMessages.forEach(m => processAutoMod(...))`. The `processedMsgIds` Set ensures each message is only processed once regardless of how many times the snapshot fires.

The `prevMsgCount > 0` guard (before the forEach) skips the initial load batch so old messages aren't moderated retroactively.

## Attachment dropdown order

Canonical order: Audio → Photo → YouTube → Style/Font → GIF.
Lock rules: Audio = always open; Photo/YouTube/GIF = locked for guest+registered; Style = locked for guest only, open for registered+privileged.
