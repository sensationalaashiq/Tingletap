---
name: Cross-theme text contrast fix
description: Custom username/message text colors going invisible on some themes; the fix pattern used and where it lives.
---

Custom username/message-text colors (user-picked, or legacy hardcoded presets like near-black
"matte-luxe"/"minimal-mono"/"royal-script") only render safely against the one theme they were
chosen on. This app has many themes (Light, Dark, Burgundy, Aurora, etc.) toggled via
`html.dark-mode` / `html.theme-*` classes, and per-message/per-username colors are applied as
**inline styles**, so plain CSS theme rules can't fix them (inline beats non-!important CSS).

**Fix pattern**: when no explicit text-shadow was chosen by the user, auto-apply a dual-tone
halo: `0 0 3px rgba(255,255,255,0.55), 0 0 5px rgba(0,0,0,0.55)` (light+dark blur) alongside the
custom color. This keeps arbitrary colors legible against both light and dark surfaces without
per-theme detection logic.

**Where applied**: `src/utils/usernamePreferences.js` (username custom-style CSS injection),
`src/pages/HomePage.jsx` (`ChatMessageTranslatedBody` pStyle for custom message font color, and
the `PMAP`/`buildSS` username "premium style" presets + free textColor branch).

**Why**: reported bug — custom-colored usernames/messages and the built-in dark presets were
unreadable on Dark/Aurora/Burgundy themes since they were tuned for the Light theme's white
background.
