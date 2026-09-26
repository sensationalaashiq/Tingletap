# Base44 Dev Environment

## What this is
TingleTap — a React 18 + Vite 6 PWA (frontend only in dev). Firebase (Auth, Firestore, Realtime DB) is a hosted external service; Netlify functions exist in `netlify/functions/` but are **not** run in the Base44 dev environment (they need firebase-admin, R2, Brevo, etc.). The Vite dev server alone is what the preview shows.

## Run it
```
docker compose -f docker-compose.base44.yml up -d
```
- Web entry point: host port **3000** → container Vite on **5000**.
- `node:20` base image, repo bind-mounted at `/app`; `npm install` runs on container start, then `npx vite --host 0.0.0.0 --port 5000`.
- Live reload is on (HMR via `@vite/client`); `CHOKIDAR_USEPOLLING=true` makes file-watch fire under the bind mount.
- `node_modules` lives in a named volume so host installs don't clash with the container.

## Secrets (all required for the app to initialize Firebase)
All `VITE_FIREBASE_*` web-app SDK config values come from the user's Firebase project (Firebase Console → Project settings → Your apps → SDK setup & config). `VITE_GIPHY_API_KEY` is optional (GIF search). They are delivered via `/run/base44/app.env` (outside the repo) and wired in as the compose `env_file`.

## Quirks
- `src/firebase/config.js` calls `initializeApp` + `getAuth`/`getFirestore`/`getDatabase` at import time, so the Firebase env vars must be present or the app throws on load.
- Vite config sets `server.allowedHosts: true`, so the preview's external hostname is accepted.
- Netlify functions (`netlify/functions/*`) are serverless and not part of the dev preview; features that call `/.netlify/functions/*` (email, signed media URLs, moderation) won't work locally without `netlify dev` + their backend secrets.
- `.firebaserc` is a Base44-managed placeholder; it is not a credential.

## Verify it works
```
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/   # expect 200
docker compose -f docker-compose.base44.yml ps                  # web = Up (healthy)
```
