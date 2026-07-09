---
name: TingleBot notice timing and spam tuning
description: Why AutoMod notices could fire for absent users or spam multiple alerts, and the mitigations applied.
---

By design, `processAutoMod` in `src/utils/tinglebotAutoMod.js` runs on **every** connected room viewer's client (not just staff) so notices still post even when no staff member is online. Each client that detects a violation independently calls the `post-automod-notice` Netlify function; the server's Firestore-transaction dedup lock is the only thing preventing duplicate posts from that concurrency.

**Wrong-user / stale alerts:** the client only knows about messages in the room's Firestore history, not who is actually still present. Gate `processAutoMod` calls on room-scoped RTDB presence (`window.onlineUsers`, populated per-room in HomePage.jsx) so a notice isn't generated about someone who has already left. Important: presence loads asynchronously and resets to an empty Set on every room switch — treat an empty set as "not loaded yet" (stay permissive) rather than "nobody is here," or you get false negatives that silently skip real moderation.

**Spam / rapid-fire notices:** the server's original dedup key was `_lk_${violatorUid}_${action}` — scoped per action, so a fast violator triggering several different violation types within seconds (e.g. warn then mute) generated a separate notice for each, reading as spam. Added a second, coarser dedup key `_lkb_${violatorUid}` with a short TTL (~7s) that blocks *any* new notice about the same violator regardless of action, collapsing bursts into one notice while still allowing genuine escalation notices a few seconds later.

**Inherent latency:** the notice pipeline is client-detects → calls Netlify function → function verifies + writes Firestore → client's snapshot listener re-renders. This double round-trip (plus Netlify cold starts) is structural to the security design (server generates notice text, client is never trusted); there is no cheap way to make it instant without moving notice generation to a trusted client role, which would reopen the "client-supplied text" risk the v2 hardening was written to close.
