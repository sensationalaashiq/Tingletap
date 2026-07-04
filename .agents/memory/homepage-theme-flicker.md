---
name: Homepage dark/light theme flicker
description: Root cause pattern for visible theme-class flicker on HomePage and the fix
---

## Root cause

`HomePage.jsx` had a `useEffect` that strips all theme classes off `document.body`/`document.documentElement` and re-adds the correct one, depending on the **entire** `loggedInUserProfile` object. Since a `setInterval` writes `lastSeen` to Firestore periodically, and an `onSnapshot` in `App.jsx` propagates any profile doc change (even unrelated fields) into `loggedInUserProfile`, the effect re-ran on every heartbeat — producing a visible strip/re-add flash even though the theme itself never changed.

**Fix pattern:** never depend a class-mutating effect on a whole profile/user object. Depend on the specific field that actually drives the DOM change (e.g. `loggedInUserProfile?.selectedTheme`).

## Related: duplicate profile listeners

A second `onSnapshot` on `users/{profileUser.uid}` fired even when `profileUser.uid === auth.currentUser.uid` (i.e. viewing your own profile), duplicating reads/renders already covered by the main logged-in-profile listener. Guard: skip attaching the second listener when the viewed profile is the current user's own.
