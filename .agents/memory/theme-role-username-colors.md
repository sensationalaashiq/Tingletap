---
name: Theme role-based username colors
description: How username colors are applied per role per theme — structural fix for data-role placement
---

## The core structural bug (now fixed)
`data-role` and `data-gender` were only on the `.message-displayname` span, but ALL
CSS selectors in DarkMode.css and Themes.css targeted `.message-row[data-role] .message-displayname`.
Result: role-based colors in BOTH files had never worked for anyone.

**Fix:** Added `data-role={cssRole}` and `data-gender={gender||'male'}` directly to the
`.message-row` div (HomePage.jsx). Also kept them on the displayname span.

## Role value mapping (Firestore → CSS)
```js
const cssRole = badge ? 'badge-holder'     // hyphen, not underscore
    : (role === 'user' || !role) ? 'general'  // 'user' → 'general' for CSS
    : role;  // owner/admin/moderator/guest pass through unchanged
```

**Why:** Firestore stores `user` for regular members; all CSS selectors use `general`.
Badge holders were stored as `badge_holder` (underscore) but CSS uses `badge-holder` (hyphen).

## Light-theme role colors (added to App.css)
Dark themes already had role colors via `html.dark-theme-variant` + `html.dark-mode`.
Light theme now has matching rules directly on `.message-row[data-role]`.

| Role | Male | Female | Trans |
|------|------|--------|-------|
| owner | #b45309 (amber) | #be185d (rose) | — |
| admin | #b91c1c (red) | #9d174d (deep rose) | — |
| moderator | #15803d (green) | #0f766e (teal) | — |
| badge-holder | #1d4ed8 (blue) | #7e22ce (violet) | #6d28d9 |
| general | #1f2937 | #1f2937 | #1f2937 |
| guest/purush | #1e40af | — | — |
| guest/stree | — | #9d174d | — |
| guest/navrang | — | — | #6d28d9 |

## Custom username visibility across themes
Custom-styled usernames use `-webkit-text-fill-color` in their injected `<style>` tag.
Browsers render using `-webkit-text-fill-color` above the CSS `color` property — so
even when theme CSS sets `color: #FFB74D !important` with high specificity, the
custom color still shows.

## Custom message text visibility across themes
`messageTextPreferences.js` now injects `-webkit-text-fill-color` AND a dual-tone
`text-shadow` halo so custom colors remain readable even on dark/mismatched backgrounds.
