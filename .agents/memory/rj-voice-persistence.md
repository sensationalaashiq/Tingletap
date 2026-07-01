---
name: RJ Voice Broadcast Persistence
description: How to keep RJ voice playing when the BroadcastPanel is closed or the tab is backgrounded.
---

## Rule

RJ voice (WebRTC audio via `rjAudioEl.current`) must NOT be stopped when the BroadcastPanel closes (`isOpen = false`). It should only stop on: RJ ends broadcast (RTDB listener fires), user clicks "Leave" button, or page unload/unmount.

**Why:** The panel-close cleanup `useEffect` previously called `rjLeaveAudio()` on `isOpen=false`, which paused and destroyed the audio element — so minimising the panel stopped the voice entirely.

**How to apply:**
- Panel-close effect (`isOpen=false`): clean up Public broadcasts (`listeningTo`), but do NOT call `rjLeaveAudio()`.
- Add a `visibilitychange` listener (gated on `!canManageRJ && rjIsListening`) that calls `rjAudioEl.current.play()` if `audio.paused` when the tab becomes visible — browsers can throttle audio in background tabs.
- YouTube music persistence uses the same pattern (already fixed earlier): hidden 1×1 container keeps the IFrame DOM alive, plus a matching `visibilitychange` listener.
- Global unmount (`useEffect` return) still calls `rjLeaveAudio()` to clean up properly on component destroy.
