---
name: Speaker-side WebRTC reconnect symmetry
description: Why a host-side reconnect fix is not enough — the peer side needs matching reconnect logic or renegotiation silently fails
---

In a manual-signaling WebRTC setup (RTDB/Firestore offer-answer-candidate exchange, not a full SFU), if only one side (the host/RJ) has retry logic that recreates its `RTCPeerConnection` and writes a fresh offer on `failed`/`disconnected`, the other side (the speaker/peer) must ALSO recreate its own `RTCPeerConnection` to accept that fresh offer.

**Why:** A peer connection whose `remoteDescription` is already set will ignore any new offer written to the same signaling path — renegotiation on an existing `pc` was never implemented, so the "fresh offer" from the host-side reconnect is silently dropped by the peer's stale connection. The result: host thinks it reconnected, but the peer is permanently silent until manually leaving/rejoining.

**How to apply:** When adding reconnect/retry logic to one side of a manually-signaled WebRTC pair, always give the OTHER side matching logic: recreate the `RTCPeerConnection` (not just re-listen), and guard every RTDB/Firestore listener with `if (pc !== currentPcRef.current) return;` so stale closures from old connection attempts never act on candidates/offers meant for a newer attempt. Also re-apply any local UI state (mute, etc.) onto the new track set after reconnecting — it doesn't carry over automatically.
