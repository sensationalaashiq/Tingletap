---
name: Firestore query bounding without Firebase CLI
description: Constraint to remember when adding limit()/orderBy() to Firestore queries in this env
---

This dev environment has no Firebase CLI or deploy credentials — `firestore.indexes.json` changes are not auto-deployed, only the user can push them via the Firebase Console or their own CLI.

**Rule:** when bounding an unbounded Firestore query, prefer adding a plain `limit(N)` over adding `orderBy(field) + limit(N)` unless a matching composite index is already confirmed present in `firestore.indexes.json`. An undeployed composite index causes a runtime failure (missing-index error), not a silent no-op.

**Why:** hit this on the `privateMessages` participants-array-contains query — wanted to add `orderBy('lastMessageTime')` for a "most recent" cap, but no composite index existed for `participants (array-contains) + lastMessageTime`, and there was no way to deploy one. Used bare `limit(200)` instead.

**How to apply:** before adding `orderBy` to any query that didn't have it, grep `firestore.indexes.json` for a matching composite index. If none exists, either ask the user to deploy one first, or fall back to a plain `limit()` bound.

**Same constraint applies to `firestore.rules` and `database.rules.json` (RTDB) edits.** Editing these files in the repo does NOT change live production rules — the user must paste/publish them via Firebase Console (or their own CLI). Any feature that depends on a rule change (e.g. a public landing page reading a collection previously gated to `auth != null`) will keep failing with `permission-denied` until they do this. Always tell the user explicitly which rule changed and that they must republish it, and add a graceful loading/fallback UI state (not a fake hardcoded value) for the window before they do.
