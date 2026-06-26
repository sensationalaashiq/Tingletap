---
name: TingleBot AutoMod Architecture
description: Key design decisions for the TingleBot intelligent auto-moderation system (v3.0)
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

AutoMod is called inside the `onSnapshot` handler on every snapshot update using `newMessages.forEach(m => processAutoMod(...))`. The `processedMsgIds` Set ensures each message is only processed once regardless of how many times the snapshot fires.

The `prevMsgCount > 0` guard (before the forEach) skips the initial load batch so old messages aren't moderated retroactively.

## Attachment dropdown order

Canonical order: Audio → Photo → YouTube → Style/Font → GIF.
Lock rules: Audio = always open; Photo/YouTube/GIF = locked for guest+registered; Style = locked for guest only, open for registered+privileged.

## v3.0 new features

- Homoglyph normalization (Cyrillic/Greek Unicode → Latin) in normalization pipeline
- Personal info detection (Indian phone, UPI ID, IFSC, PAN, Aadhaar, email, bank account)
- Emoji abuse signals (🖕 always fires; explicit combos accumulate score)
- CAPS/shouting detection (≥72% uppercase on 8+ char messages)
- Multi-signal confidence scoring — weak signals accumulate to threshold
- Abbreviation context guard — bc/mc/mf only fire with another signal present
- Contextual whitelist — suppresses false positives (die hard, cock robin, etc.)
- Persistent cross-session violation tracking via `autoModStats` field on user doc
- Dedicated `modLogs` Firestore collection for every automod action
- Per-type notice cooldown (60s) + global action cooldown (8s) per user
- Varied notice messages (3 random variants per action type)
- MUTE_24H_AT escalation step before kick
- Scam/personal-info always deletes regardless of violation count

## Firestore collections written by TingleBot (staff client)

- `rooms/{roomId}/automod/{msgId}` — atomic claim (transaction)
- `rooms/{roomId}/messages` — TingleBot notices (addDoc, auto-deleted after 3m)
- `rooms/{roomId}/kickedUsers/{uid}` — kick records (setDoc)
- `users/{uid}` — mutedInfo, autoModHistory (arrayUnion), autoModStats (increment), kickedFrom
- `modLogs` — violation log entries (addDoc)
