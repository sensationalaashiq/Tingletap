---
name: Firebase config hosted on Netlify only
description: This TingleTap repo's Firebase/env secrets live in Netlify + GitHub auto-deploy, not in Replit.
---

The user's deployment pipeline for this project is Netlify (env vars set there) with GitHub auto-deploy
on push — Replit is used as a secondary dev/editing environment. The user explicitly declined
(twice) providing `VITE_FIREBASE_*` values as Replit secrets when asked, saying they're already
configured in Netlify.

**Consequence**: the Replit dev preview (`npm run dev`) renders a blank page because
`src/firebase/config.js` reads `import.meta.env.VITE_FIREBASE_*`, which are unset here. This is
expected, not a bug — don't chase it as an error. Code changes can still be made and verified via
`npm run build` (compiles fine without real Firebase values) and manual code review; visual/runtime
verification of Firebase-dependent features isn't possible in this Replit environment unless the
user changes their mind and provides the keys.
