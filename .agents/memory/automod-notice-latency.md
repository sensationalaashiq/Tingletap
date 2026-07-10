---
name: AutoMod notice latency fixes
description: What made TingleBot AutoMod moderation notices feel slow, and the fixes applied (production + dev proxy).
---

Reported symptom: moderation notices ("warning"/"muted"/"kicked" TingleBot messages) felt slow
and occasionally duplicated. The pipeline is inherently multi-hop (client detects → Netlify
function → Firebase Admin verifies + Firestore transaction + write → all clients' snapshot
listener re-renders), so it can never be truly zero-latency, but several avoidable costs were
found and removed in `netlify/functions/post-automod-notice.js` (production) and the dev mirror
in `server.js` (`/api/post-automod-notice`):

1. **`verifyIdToken(idToken, /* checkRevoked= */ true)`** — the `checkRevoked` flag adds an extra
   network round-trip to Google on every single call. Removed it for this endpoint: it only ever
   posts a rate-limited, server-generated, non-destructive chat notice (no enforcement action), so
   the marginal security value of revocation-checking didn't justify the latency.
2. **Two non-gating Firestore `.get()` lookups** (caller-doc existence, violator-doc existence) —
   both only ever logged a warning and never changed control flow (guests legitimately have no
   user doc either way). Removed; pure latency with zero behavioral effect.
3. **Dev proxy `.exists()` vs `.exists` bug** — Firebase Admin SDK's `DocumentSnapshot.exists` is a
   boolean **property**, not a method. `server.js`'s dev-only proxy called it as `.exists()`,
   which throws and forces every rate-limit/dedup transaction into the catch block (500 response),
   silently breaking AutoMod notices in the Replit dev environment. The production Netlify function
   already used the correct property form. Fixed all four call sites in `server.js` to match.
4. Dev proxy was also missing the coarser per-violator "burst" dedup lock (~7s TTL) that the
   production function already had — added it so a fast multi-violation burst collapses into a
   single visible notice in dev, matching production ("only one message per violation").

**Why this matters for future changes:** any new field/lookup added to this endpoint should be
checked against "does this actually gate behavior?" before being added — this endpoint is on the
hot path for something the whole room sees in real time, so every extra `await` is felt directly
as visible lag. Also: when mirroring a Firebase Admin SDK Netlify function into `server.js` for
local dev, double-check snapshot/property vs method usage — the two SDKs are easy to write
identically but subtly diverge, and a proxy that silently 500s everywhere can look like "it's just
slow" instead of "it's completely broken" if the client swallows the error.
