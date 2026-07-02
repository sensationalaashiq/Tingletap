---
name: Broadcast Stage Speaker Audio Architecture
description: WebRTC + Web Audio API design for speaker-on-stage feature in BroadcastPanel
---

## The Pattern

When RJ goes live → `startLocalMic()` creates an `AudioContext` + `MediaStreamDestination` (`rjMixDest`).
RJ's mic is connected to the mixer. All listener PCs receive `rjMixDest.stream` tracks (not raw `localStream`).

When a speaker is accepted into `speakerMap`:
- RJ side: `rjConnectToSpeaker(uid)` → creates `RTCPeerConnection`, `createOffer({ offerToReceiveAudio: true })`, writes offer to `broadcasts/rj/speakerConnections/{uid}/offer`. On `ontrack`, connects speaker's audio into the AudioContext mixer. Listeners automatically hear the speaker (same track, no renegotiation needed).
- Speaker side: `useEffect([iAmSpeaker])` → gets mic, creates PC, adds mic tracks, watches for offer → answers → sends answer/ICE. When `iAmSpeaker` goes false → cleanup + `remove(speakerConnections/{myUid})`.

## RTDB Signal Paths

```
broadcasts/rj/speakerConnections/{speakerUid}/offer          ← RJ writes
broadcasts/rj/speakerConnections/{speakerUid}/answer         ← speaker writes
broadcasts/rj/speakerConnections/{speakerUid}/rjCandidates   ← RJ writes, speaker reads
broadcasts/rj/speakerConnections/{speakerUid}/speakerCandidates ← speaker writes, RJ reads
```

## Key Implementation Rules

- `rjSpeakerUnsubs` is a **map** `{ [speakerUid]: [unsubFn, ...] }` (NOT a flat array). Use `_rjDisconnectSpeaker(uid, removeRtdb)` to clean up one speaker's RTDB listeners precisely without disturbing others.
- On PC `failed/disconnected`: auto-reconnect via `_rjDisconnectSpeaker` + `rjConnectToSpeaker` (only if UID still in `speakerMap`). Remove stale RTDB signal data before writing new offer.
- `rjStopAllBroadcasterConnections` iterates `Object.values(rjSpeakerUnsubs.current)` (array of arrays), closes AudioContext, removes `broadcasts/rj/speakerConnections`.
- Speaker side: `speakerMicMuted` / `speakerConnecting` state; `handleSpeakerMicToggle` toggles `speakerStream` track `.enabled`.

**Why:** AudioContext mixing avoids renegotiating every listener PC when a new speaker joins. The mixed stream's tracks are already attached to all listener PCs — new audio sources are simply wired into the AudioContext graph, not added as new tracks.
