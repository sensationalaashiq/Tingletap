---
name: RJ Verification system
description: Architecture of the RJ Verification feature (separate from Badge Verification) — collection, storage, approval flow, and a shared rules bug it exposed.
---

- Mirrors Badge Verification's architecture but is a fully separate pipeline: Firestore collection `rjApplications/{uid}`, R2 key prefix `rj-verifications/{uid}/{section}-{uuid}.{ext}`, Netlify functions `uploadRJMedia`/`getRJMedia`/`submitRJApplication`/`reviewRJApplication`.
- Applicants record three fixed audio sections (`intro`, `song`, `welcome`) via a parameterized `RJAudioRecorder` (label/script/min/max props) instead of forking 3 recorder components.
- Unlike Badge approval (admin picks from a badge-key picker modal), RJ approval always awards a fixed `badge: 'rj'` — no picker UI needed.
- **Why:** keeps RJ verification decoupled so it can evolve independently and never touches Badge Verification's collection/rules/components.
- Found `firestore.rules` called an undefined helper `isAuthenticated()` in the `badgeApplications` block (pre-existing bug, silently latent since Firestore rules just error out that branch). Fixed by replacing with `request.auth != null` in both `badgeApplications` and `rjApplications`.
- **How to apply:** when adding any new `match /xxx/{uid}` rules block, grep for the exact helper names actually defined near the top of `firestore.rules` (e.g. `isOwner`, `isAdmin`, `isGuest`) before reusing a helper name — don't assume one exists just because a sibling block uses it.
