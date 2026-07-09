---
name: TingleBot AutoMod Architecture
description: Key design decisions for the TingleBot intelligent auto-moderation system (v3.0-v5.0)
---

## v5.0 — No global keyword/slang blacklist; rule-based safety categories only

The v3.0-v4.0 architecture (dictionaries of profanity per language + a "context tolerance" layer bolted on top) was fully replaced. There is now no profanity/slang dictionary at all: `detectModerationContent()` only ever matches a fixed set of "immediate action" safety categories (minor safety/grooming, non-consensual content, threats of violence, doxxing/personal info, hate/terrorism, scams/phishing/malicious links) via narrow behavioural regex, never a slang word list.

**Why:** Product requirement — ordinary profanity, sexual slang, and regional-language slang must never be moderated on their own, in any room (including Adult Room), only genuine safety issues and targeted/repeated harassment.

**How to apply:** Any request to "add a bad word" or "block a slang term" should be redirected to the harassment/spam behavioural signals, not a new dictionary entry — adding words back to a blacklist regresses this policy. Room type is classified via `getRoomType(roomName)` but the safety categories are intentionally room-agnostic (enforced everywhere).

## Harassment target-identity gotcha

Harassment tracking must use ONE canonical identity for "who is the target" across mention-detection and objection-detection. The app only supports @mention-by-displayName targeting (no reply/UID targeting exists in the chat UI) — so the canonical target key must be the lower-cased display name, not the sender's UID, or objection tracking (`targetKey === senderUid`) silently never matches and "continued after objection" never fires.

**Why:** Caught by architect code review after initial rewrite passed a UID-based reply target that could never equal the display-name-based mention key.

## v4.0 — Two separate automod entry points, both must agree

There were historically TWO independent moderation systems gating chat send/receive: `tinglebotAutoMod.js` (post-send, staff-client enforcement, pattern-rich) and `abuseDetection.js` (pre-send, was a much simpler keyword-only module with its own auto-ban logic).

**Why:** Fixing policy (owner exemption, no-auto-ban, context-aware slang tolerance) in only one module leaves the other one contradicting it — e.g. `abuseDetection.js` used to auto-ban on a severity threshold and had no owner exemption, flagging casual words like "idiot/stupid/loser" as high-severity with zero context awareness.

**How to apply:** `abuseDetection.js` now delegates all classification to `detectModerationContent()` (exported from `tinglebotAutoMod.js`, wraps the internal `detectContent`) instead of maintaining a second dictionary. Any future policy change to what counts as abusive/tolerable belongs in `tinglebotAutoMod.js`'s detection layer only — `abuseDetection.js` should stay a thin pre-send wrapper (rate-limited history + kick/mute escalation, no ban).

## No-auto-ban policy

Both automod entry points cap automatic enforcement at Kick — there is no automatic ban anywhere in the client-side moderation code. `CFG.KICK_AT` in `tinglebotAutoMod.js` and `OFFENSE_CONFIG.KICK_THRESHOLD` in `abuseDetection.js` are both terminal escalation steps, not ban thresholds. Manual bans remain a staff-only Admin Panel action.

## Owner exemption

Owners must never be auto-moderated. Enforced at three layers for defense-in-depth: (1) HomePage.jsx gates the entire spam+abuse check block on `role !== 'owner'` before calling either module, (2) `abuseDetection.js`'s `detectAbuse(text, role)` short-circuits for `role === 'owner'`, (3) `handleAbuseViolation` also re-checks `opts.role !== 'owner'` before taking any action. `tinglebotAutoMod.js`'s `processAutoMod` already had its own owner/admin/moderator staff-side exemption from v3.0.

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
