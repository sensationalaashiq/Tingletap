---
name: RJ Follow System
description: Firestore-based follow/unfollow for RJ users with compact + full button variants
---

## Architecture
- Firestore: `users/{rjUid}/followers/{followerUid}` and `users/{followerUid}/following/{rjUid}`
- Dedup via `setDoc` to deterministic doc IDs (not `addDoc`)
- Component: `src/components/RJFollowSystem.jsx` exports `RJFollowButton` (default) and `RJFollowSystemFull`
- Compact mode (`compact={true}`) used inside BroadcastPanel renderListenerView
- Follower list modal reads the `followers` subcollection in real-time

**Why:** Subcollections scale better than embedded arrays; symmetric write pattern enables future "following feed" queries.

**How to apply:** When adding follow button anywhere, import default `RJFollowButton` with `rjUid`, `rjName`, `rjAvatar`, `compact`, `showCounts` props.
