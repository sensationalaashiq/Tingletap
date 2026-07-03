---
name: Firestore query bounding without Firebase CLI
description: Constraint to remember when adding limit()/orderBy() to Firestore queries in this env
---

This dev environment has no Firebase CLI or deploy credentials — `firestore.indexes.json` changes are not auto-deployed, only the user can push them via the Firebase Console or their own CLI.

**Rule:** when bounding an unbounded Firestore query, prefer adding a plain `limit(N)` over adding `orderBy(field) + limit(N)` unless a matching composite index is already confirmed present in `firestore.indexes.json`. An undeployed composite index causes a runtime failure (missing-index error), not a silent no-op.

**Why:** hit this on the `privateMessages` participants-array-contains query — wanted to add `orderBy('lastMessageTime')` for a "most recent" cap, but no composite index existed for `participants (array-contains) + lastMessageTime`, and there was no way to deploy one. Used bare `limit(200)` instead.

**How to apply:** before adding `orderBy` to any query that didn't have it, grep `firestore.indexes.json` for a matching composite index. If none exists, either ask the user to deploy one first, or fall back to a plain `limit()` bound.
