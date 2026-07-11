# Recent Changes (July 11, 2026) — Dual-Bucket R2 Refactor (Session 14)

**Two separate Cloudflare R2 buckets** — public media loads via permanent CDN URL (never expires), private media stays in an isolated private bucket served only through auth-gated Netlify proxy functions.

Verified with `npm run build` (passes). Deploy via GitHub → Netlify pipeline.

## New Netlify Environment Variables Required

Add these in Netlify → Site settings → Environment variables:

| Variable | Value | Purpose |
|---|---|---|
| `R2_PUBLIC_BUCKET_NAME` | `tingletap-media` | Public bucket name |
| `R2_PRIVATE_BUCKET_NAME` | `tingletap-verification` | Private bucket name |
| `R2_PUBLIC_BUCKET_URL` | e.g. `https://pub-xxxx.r2.dev` | Public base URL for tingletap-media (get from Cloudflare R2 dashboard → bucket → Public Access URL) |
| `R2_BUCKET_NAME` | *(keep as-is)* | Legacy single bucket — still needed for backward-compat reads of old stored URLs |

Existing credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) are shared across both buckets — no change needed.

## Cloudflare Dashboard Steps Required

1. **Create bucket `tingletap-media`** — set "Public Access" to **Enabled**. Copy the "Public Bucket URL" and set it as `R2_PUBLIC_BUCKET_URL`.
2. **Create bucket `tingletap-verification`** — keep Access **Private** (default).
3. Your existing API token must have Object Read & Write permission on both new buckets.

## What Changed

✅ **Applied**:
1. **`netlify/functions/shared/r2Client.js`** — full dual-bucket rewrite: `getPublicBucketName()` / `getPrivateBucketName()`, `getPublicMediaUrl(key)`, `putPublicObject()` / `putPrivateObject()`, auto-routing `createPresignedGetUrl()` and `deleteObjects()` by key prefix. Legacy `createR2Client()` / `getBucketName()` kept for backward compat.
2. **`netlify/functions/uploadMedia.js`** — routes by `uploadType`: `profile`, `cover`, `chat-image`, `homepage-audio` → PUBLIC bucket → returns permanent public URL; `private-chat-image`, `private-chat-audio` → PRIVATE bucket → returns serveMedia proxy URL. Key prefixes changed: `profile/`, `cover/`, `homepage/images/`, `homepage/audio/`.
3. **`netlify/functions/serveMedia.js`** — serves legacy prefixes (`profiles/`, `covers/`, `chat-images/`, etc.) from OLD bucket and new `private-chat/` prefixes from PRIVATE bucket. Public media no longer goes through this proxy.
4. **`netlify/functions/uploadBadgeMedia.js`** — uploads to PRIVATE bucket under `badge/` prefix (was `verifications/`).
5. **`netlify/functions/uploadRJMedia.js`** — uploads to PRIVATE bucket under `rj/` prefix (was `rj-verifications/`).
6. **`netlify/functions/getBadgeMedia.js`** — backward-compat routing: `badge/` → private bucket, `verifications/` → legacy bucket.
7. **`netlify/functions/getRJMedia.js`** — backward-compat routing: `rj/` → private bucket, `rj-verifications/` → legacy bucket.
8. **`netlify/functions/generateSignedMediaUrl.js`** — accepts both `badge/` and `verifications/` prefixes.
9. **`netlify/functions/getUploadUrl.js`** — presigned PUT targets PRIVATE bucket, `badge/` prefix.
10. **`netlify/functions/getMediaUrl.js`** — prefix-based bucket routing; public bucket prefixes return early (they need no signed URL).
11. **`src/services/r2StorageService.js`** — added `isPublicR2Url()` helper; updated `extractR2Key()` for new URL formats.
12. **`src/components/PremiumImageMessage.jsx`** / **`CustomAudioPlayer.jsx`** — skip signed-URL refresh logic for public R2 URLs (they never expire).

## Backward Compatibility

- All existing `/.netlify/functions/serveMedia?key=profiles/...` URLs in Firestore continue working (served from legacy bucket).
- All existing badge/RJ applications with `verifications/` or `rj-verifications/` keys still load in the admin panel.
- Zero Firestore schema changes required.

---

# Recent Changes (July 11, 2026) — R2 Private Bucket + Signed URLs + DP Crop Modal + Logo Fix (Session 13)

**Re-import setup**: stale process on port 5000 killed, both workflows restarted cleanly. Firebase config still lives only in Netlify — Replit preview renders blank (expected). All changes ship via GitHub → Netlify pipeline.

Verified with `npm run build` (passes) + workflow restart.

✅ **Applied**:
1. **R2 bucket fully private — signed URLs everywhere**: `netlify/functions/uploadMedia.js` no longer returns a public `R2_PUBLIC_URL`-based link. After every upload (profiles, covers, chat images, audio) it now calls `createPresignedGetUrl(key, 604800)` to generate a 7-day signed GET URL (R2/S3 maximum), then returns `{ key, url }`. No bucket public access required.
2. **New `netlify/functions/getMediaUrl.js`**: any authenticated (non-guest) user can POST `{ key, expiresIn }` to get a fresh signed URL for any allowed prefix (`profiles/`, `covers/`, `chat-images/`, `chat-audio/`, `homepage-audio/`, `verifications/`, `rj-verifications/`). Reuses the same `r2Client.js` credentials as badge/RJ verification. Expiry clamped 60 – 86400 s. Key validated against path traversal and allowed-prefix whitelist.
3. **`src/services/r2StorageService.js`**: added exported `getMediaUrl(key, expiresIn?)` client function that calls the new Netlify function. Clients use this to refresh expired signed URLs.
4. **`photoKey` stored in Firestore**: `EditProfile.jsx`'s `handleSubmit` now stores the R2 object key (`photoKey`) alongside `photoURL` so that expired 7-day URLs can be refreshed client-side using the key.
5. **Welcome Dashboard DP crop modal fixed**: `EditProfilePanel` in `WelcomeDashboard.jsx` was a lightweight inline form with no crop modal. Replaced with `<EditProfile onClose={onDone} onSuccess={onDone} />` so the dashboard's Edit Profile panel now has the full drag · zoom · rotate · flip · brightness · contrast modal — same as the sidebar's Edit Profile modal.
6. **ForgotPasswordPage logo fixed**: replaced Cloudinary external URL (`res.cloudinary.com/…/tingletap-logo_irf2a8.png`) with the local `/tingletap-logo.jpg` from the public folder. All pages now use only the local logo (no external CDN logo links anywhere in the app).

⚠️ **No manual steps needed** — all changes are client-side JS and Netlify function code. The new `getMediaUrl` function deploys automatically with the rest of the Netlify functions.

# Recent Changes (July 11, 2026) — Re-import Setup + YouTube Player/Font/Presence Fixes (Session 12)

**Re-import setup**: same pattern as last time — stale process was squatting on port 5000, killed it and restarted both workflows. Firebase secrets were added, then removed again by the user during the session, so this Replit preview currently renders blank (expected — Firebase config lives only in Netlify's env vars; see Session 11 note below). All fixes in this session are code/rules changes meant to ship via the existing GitHub → Netlify pipeline, not to make the Replit preview itself functional.

Verified with `npm run build` (passes) + workflow restart.

✅ **Applied**:
1. **YouTube player now fills its lavender-bordered box edge-to-edge**: there were 4 duplicate/conflicting `.youtube-embed` CSS rules across `App.css` and `HomePage.css` — some used the old padding-bottom aspect-ratio hack, others used `height:auto`+`aspect-ratio` on the iframe without `position:absolute`, and the cascade order made them fight each other, sometimes leaving a black-bar gap inside the border. Consolidated all four to one consistent pattern: container uses native `aspect-ratio:16/9` with `max-width:320px`, iframe is `position:absolute; inset:0; width/height:100%` — so the video always fills the full bordered box with zero leftover space.
2. **Default message text is 11px for all users**: `App.css` already had `.message-body p { font-size: 11px }`, but a higher-specificity rule `.homepage-container .message-body p { font-size: 10px }` further down in `HomePage.css` was winning and silently shrinking the default. Changed it to 11px.
3. **Admin dashboard / room online counts — made genuinely real-time**:
   - Root cause of "online count never shows" on RoomListPage and the Sidebar rooms tab: `database.rules.json`'s `roomCounts` node had a `.read` grant but **no `.write` grant**, so the root `".write": false` silently rejected every client write to `roomCounts/{roomId}/{uid}` — the counters could never populate. Added a scoped write rule (`$roomId/$uid`, own-uid only) mirroring the existing `room_presence` pattern.
   - ⚠️ **Needs a manual step from the user**: `database.rules.json` is not auto-deployed in this dev environment (no Firebase CLI credentials here). The user must publish the updated rules via Firebase Console → Realtime Database → Rules (paste in `database.rules.json` contents) or run `deploy-rtdb-rules.sh` locally with the Firebase CLI. Until then, room online counts will keep showing 0.
   - Root cause of "offline users showing online" in the Admin Panel: presence relies on `onDisconnect()` + a 5-minute heartbeat, but a missed disconnect (network drop, backgrounded mobile browser, killed process) can leave a stale `state: "online"` entry in RTDB until the next login's one-time cleanup sweep runs. Added `src/utils/presenceStatus.js` (`isEffectivelyOnline`) which treats a status entry as online only if `state === 'online'` AND its `last_changed` heartbeat is fresher than 8 minutes; wired into every online/offline check in `AdminPanelPage.jsx` and `BanKickMutePanel.jsx` so stale entries display as offline immediately, without waiting on the cleanup job.

# Recent Changes (July 10, 2026) — Re-import Setup + Theme Contrast/Guest Pill Fixes (Session 11)

**Re-import setup**: Project was re-imported from zip; `node_modules` was missing (vite/express not found) and a stale process was squatting on port 5000. Ran `npm install`, killed the stale process, restarted both workflows (`Start application`, `Email Center API`) — both run cleanly now. **This project's Firebase config lives only in Netlify's environment variables (not requested/stored in this Replit dev environment)**, so the app preview here renders blank until `VITE_FIREBASE_*` values are added as Replit secrets — the user declined providing them since deploys go through Netlify/GitHub, not Replit. Deploying/running from Replit itself will need those secrets added first.

No UI redesign, no schema changes. Verified with `npm run build` (passes) + workflow restart.

✅ **Applied**:
1. **Custom username/message colors now legible on every theme**: `usernamePreferences.js` and `HomePage.jsx` (`ChatMessageTranslatedBody` pStyle, PMAP presets `matte-luxe`/`royal-script`/`velvet-shadow`/`minimal-mono`, and the free `textColor` branch in `buildSS`) now auto-apply a dual-tone (light+dark) text-shadow halo whenever no custom shadow was chosen. This keeps arbitrary user-picked colors (including near-black legacy presets) readable against Light, Dark, Burgundy, Aurora, and any future theme background, without touching users who already picked their own shadow.
2. **Emoji reactions for guests/registered users**: confirmed already correctly hidden via `getBadgeTier()` in `src/utils/badgeTier.js` (`guest`/`member` tiers return `null` for the trigger) — no code change was needed here.
3. **Guest badge pills (Stree/Purush/Navrang) — premium + smaller**: `Sidebar.jsx`'s `getRolePill()` now takes `isGuest`/`gender` and returns a gendered premium gradient chip (pink/blue/purple) instead of flat grey, wired at both the top profile card and the user list. New `.sb-user-role-pill--guest` CSS modifier (smaller font/padding) makes the longer guest labels fit like other role pills in the sidebar.

# Recent Changes (July 6, 2026) — Real Room Count + Fake Stats Removal (Session 10)

No UI redesign, no schema changes. Verified with `npm run build` + workflow restart + console check.

✅ **Applied**: Removed every fake/hardcoded user-count number from `LandingPage.jsx` (hero "555+ Active Users"/"138 Online Now", footer stat, and the "Thousands of users are chatting" CTA line). The "Chat Rooms" stat now comes from a real live Firestore count (`getCountFromServer`, refreshed every 60s) instead of a hardcoded `9`. In place of a fake user number, added a plain-text "Users Growing" label (no number) next to the room count.

⚠️ **Needs a manual step from the user**: the live room count requires `firestore.rules` to allow public read on the `rooms` collection (previously `auth != null`-gated, which blocked the pre-login landing page). This repo's `firestore.rules` was updated accordingly, but rule files are **not auto-deployed** in this dev environment — the user must publish the updated rules via Firebase Console → Firestore Database → Rules. Until then the stat shows a neutral "—" placeholder (never a fake number).

# Recent Changes (July 6, 2026) — Zero-Gap Chat Footer (Session 9)

No UI redesign, no schema/permissions changes. Verified with `npm run build` + workflow restart.

✅ **Applied**: The visible white gap between the last chat message and the message-input bar (reported via screenshot) was caused by `HomePage.css` having dozens of conflicting `!important` rules for `.chat-feed`'s `bottom` offset and `.chat-footer`'s height, built up across many past sessions — the two values had drifted out of sync. Fixed at the root by adding a `ResizeObserver`-driven effect in `HomePage.jsx` that measures the real rendered footer height live and applies `chat-feed`'s `bottom`/`height` via inline `style.setProperty(..., 'important')` (which beats stylesheet `!important`), so the two are always pixel-perfect in sync regardless of textarea growth/shrink. Also trimmed the footer's own padding/button/textarea sizing (46px→40px buttons, tighter padding) for a more compact, premium input bar per user request.

# Recent Changes (July 6, 2026) — Emoji-Free Warning Modal + Owner-Only Admin Panel + New Ban/Kick/Mute Panel (Session 8)

No UI theme/schema/rules changes, no duplicate Firebase listeners/collections. Verified with `npm run build` + workflow restart + log check.

✅ **Applied**:
1. **Warning/Announcement modal & manager — emoji removed**: `WarningAnnouncementModal.jsx` and `WarningAnnouncementManager.jsx` no longer use any emoji anywhere (tabs, severity picker, send-to picker, banners, inline severity edit). Since native `<select><option>` can't render SVG, the severity/send-to `<select>` elements were replaced with custom SVG-icon button/list pickers (new `SEVERITY_OPTS`/`TARGET_OPTS` arrays + hand-rolled SVG icon set matching the existing design system).
2. **AdminPanelPage restricted to Owner only**: internal role check now rejects anyone whose role isn't `owner` (previously allowed `owner`/`admin`), including direct URL access. All entry points (RoomListPage floating button, SettingsSidebar nav item) now show "Admin Console" only to owners.
3. **New Ban/Kick/Mute Panel** (`src/pages/BanKickMutePanel.jsx`, route `/mod-panel`): lightweight page accessible to Owner + Admin, reusing the exact same Firestore/RTDB moderation logic as AdminPanelPage (ban/unban/mute/unmute/kick/unkick via `users/{uid}` fields, `rooms/{roomId}/kickedUsers/{uid}`, `IPBanSystem`) and the same `AdminBanKickModal` component — no new listeners/collections added, just a single capped `users` query (`limit(150)`) and the shared RTDB `status` presence tree. Includes searchable user list (registered + guest Purush/Stree/Navrang via `getRoleDisplayLabel`), live moderation status badges, and search/filter by type/status. Styled with the same `AdminPanelPage.css` luxury design system plus a small companion `BanKickMutePanel.css` for panel-specific grid tweaks.
4. New entry points added to both `RoomListPage.jsx` (floating buttons split into "Admin Console" for owners and "Ban / Kick / Mute" for owner+admin) and `SettingsSidebar.jsx` (same split in the Admin Controls section).

# Recent Changes (July 5, 2026) — Speaker Auto-Reconnect + TingleBot Avatar (Session 7)

No UI redesign, no schema/permissions/routing changes. Verified with `npm run build` + workflow restart + log check.

✅ **Applied**:
1. **Broadcast speaker auto-reconnect (root cause found)**: unlike the RJ side, a stage speaker's own WebRTC connection had no retry logic at all — if it ever hit `failed`/`disconnected` (a network blip, etc.), the speaker was permanently silent until manually leaving and rejoining the stage, because RJ's own reconnect created a fresh offer that the speaker's stale `RTCPeerConnection` (with `remoteDescription` already set) would never process. `BroadcastPanel.jsx`'s `startSpeakerMode` was refactored into a reusable `connectToRJ()` that rebuilds the peer connection on failure, re-applies current mic-mute state via a new `speakerMicMutedRef`, and guards all RTDB listeners so a stale/closed `pc` can never act on a newer offer/candidate.
2. **TingleBot avatar fix**: TingleBot's DP (in Admin Panel Feedback/Complaints replies and anywhere else its uid appears) was resolving through the same `getDefaultAvatarUrl()` used for real users — since no `users/tinglebot_system_official_2024` Firestore doc exists, it fell back to a hashed `randomuser.me` stock-photo portrait instead of a bot identity. Added a dedicated cute bot mascot image (`src/assets/tinglebot-avatar.png`) and special-cased TingleBot's uid inside `getDefaultAvatarUrl()` (`src/utils/roleUtils.js`) to always return it — fixes the avatar everywhere TingleBot's uid resolves an avatar (conversation list, PM avatars, etc.), not just the feedback-reply flow.

# Recent Changes (July 4, 2026) — Friend Requests, Broadcast Speaker Audio, Homepage Flicker Fixes (Session 6)

Fixed 4 of the 5 targeted issue areas (Firebase listener cleanup for `deviceBanSystem.js`/`ipBanSystem.js` was found already fixed in a prior session — no change needed there). No UI redesign, no schema/permissions/routing changes. Verified with `npm run build` + workflow restart + screenshot/console check.

✅ **Applied**:
1. **Friend Request modal**: the `friendRequests` `onSnapshot` handler (`HomePage.jsx`) now re-fetches each sender's live `users/{uid}` doc on every update, so the popup always shows the sender's current name/photo/gender instead of stale data captured when the request was created. Added an `onError` fallback on the avatar `<img>` so a broken/missing photo URL falls back to the deterministic default avatar instead of a broken-image icon. (Button styling fix was already done earlier in this same session before compression — `!important` on `.accept-btn`/`.reject-btn` background/border to beat a global button-reset rule.)
2. **Broadcast speaker WebRTC (root cause found)**: `BroadcastPanel.jsx`'s RJ-side mixer wired each accepted speaker's incoming audio track into a `MediaStreamAudioSourceNode` that was never stored anywhere — some browsers garbage-collect unreferenced Web Audio nodes shortly after creation, silently killing the speaker's audio even though the WebRTC connection stayed "connected". Fixed by keeping a persistent per-speaker ref (`rjSpeakerSourceNodes`) and disconnecting/clearing it on speaker teardown. Also added defensive `AudioContext.resume()` calls (for both the RJ's own mixer and reacting to a new speaker track) since some browsers create/suspend contexts even inside a user-gesture-triggered async flow.
3. **Background broadcast audio**: the existing visibilitychange handler resumed YouTube and the listener's `<audio>` element on tab-foreground, but never resumed the RJ's mixer `AudioContext` — added a resume call there too, since a suspended mixer context would silently kill RJ mic + all speaker audio for every listener even though nothing looked wrong on the RJ's own screen.
4. **Homepage dark/light flicker (root cause found)**: the theme-applying `useEffect` in `HomePage.jsx` depended on the entire `loggedInUserProfile` object, so it re-ran (stripping and re-adding theme classes on `<body>`/`<html>`) on every unrelated profile field change — including the periodic `lastSeen` heartbeat write — causing a visible flicker. Narrowed the dependency to `loggedInUserProfile?.selectedTheme` only. Also skipped the duplicate `profileUser` `onSnapshot` listener when viewing one's own profile (already covered by the main profile listener), removing a redundant read + redundant re-render.
5. **Firebase listener cleanup audit**: re-verified `deviceBanSystem.js`/`ipBanSystem.js` — both already have an `initialized` guard and auth-gated listener attach/detach with a working `cleanup()`, applied in an earlier session. No further action needed.

# Recent Changes (July 4, 2026) — TingleBot AutoMod Policy Rewrite (Session 5)

Rewrote the moderation engine only (no UI/schema/RTDB/auth/roles/permissions/chat-flow/command changes). Zero visible UI/behavior/schema changes. Verified with `npm run build` + workflow restart + screenshot/console check.

**Background**: discovered TWO independent automod entry points gating chat send/receive — `tinglebotAutoMod.js` (post-send, pattern-rich, already mostly compliant) and `abuseDetection.js` (pre-send, a separate, simpler keyword-only module with its own active auto-ban logic and no owner exemption — a critical compliance gap).

✅ **Applied**:
1. Owners are now never auto-moderated, enforced at 3 layers: HomePage.jsx's spam/abuse check block is gated on `role !== 'owner'` before either module runs; `abuseDetection.js`'s `detectAbuse(text, role)` short-circuits for owners; `handleAbuseViolation` re-checks role before acting. (`tinglebotAutoMod.js`'s staff-side exemption already existed.)
2. Removed automatic banning entirely from `abuseDetection.js` (deleted `applyBan`/`SEVERE_BAN_THRESHOLD`); the most severe automatic action anywhere in the moderation engine is now Kick, matching `tinglebotAutoMod.js`'s existing Warning → Mute → Kick escalation ceiling. Added an explicit no-auto-ban policy comment next to `CFG` in `tinglebotAutoMod.js`.
3. `abuseDetection.js` no longer maintains its own keyword dictionary — it now delegates all classification to a new exported `detectModerationContent()` from `tinglebotAutoMod.js`, so both entry points share one context-aware engine instead of contradicting each other (this alone fixed "idiot/stupid/loser" etc. being wrongly flagged as high-severity abuse).
4. (Superseded July 9, 2026 — see "TingleBot Moderation Rewrite" below.) `tinglebotAutoMod.js` used to keep a `CASUAL_TOLERANT_WORDS` slang dictionary; it has since been replaced with a rule-based, no-blacklist engine.

## TingleBot Moderation Rewrite (July 9, 2026) — Rule-Based, Room-Aware, No Keyword Blacklist

`src/utils/tinglebotAutoMod.js` and `src/utils/abuseDetection.js` were rewritten from a large multilingual profanity-dictionary engine to a rule-based engine with no global slang/profanity blacklist:
- Ordinary profanity, sexual slang, Hindi/English/Hinglish/regional slang, flirting, dirty talk, roleplay, and adult-chat ads are never punished on their own, in any room (including the Adult Room and general rooms).
- Only a fixed set of "immediate action" safety categories are always enforced regardless of room: minor safety/grooming, non-consensual sexual content, threats of violence, doxxing/personal-info leaks, hate speech (religious/caste/racial) and terrorism promotion, and scams/phishing/malicious links. These are detected with narrow behavioural regex patterns, not a slang dictionary.
- Harassment requires targeted + repeated abuse (via @mention), and escalates further on continued abuse after the target objects or on repeated threats — a single insult or slang word never triggers it.
- Spam requires behavioural signals only (flooding, rapid copy-paste/repeat, repeated advertising) — never content alone.
- `getRoomType(roomName)` classifies rooms into adult / indian / international / gaming / music / general for future room-specific tuning, though the current safety-category enforcement is intentionally room-agnostic.
- Public API (`processAutoMod`, `detectModerationContent`, `postNotice`, `resetAutoModState`, `CFG`) is unchanged so callers in `HomePage.jsx` did not need updates.
5. Religion mentions alone are not flagged; only targeted religious hate patterns (existing `HATE_RX` bank) trigger action. Added a small terrorist/extremist-promotion regex bank to `HATE_RX` (join/praise a listed group, bomb-making instructions, planning an attack, "death to X") — always strictly enforced per policy.
6. All auto-moderation logic remains 100% on-device, rule-based (no external AI API) — consistent with the existing architecture.

# Recent Changes (July 3, 2026) — Fix-It Prompt Implementation (Session 4)

Implemented all 7 items from the audit's "Fix-It Prompt" (see `TINGLETEST_AUDIT_REPORT.md` section 15). Zero visible UI/behavior/schema changes. Verified with `npm run build` + workflow restart + screenshot/console check.

✅ **Applied**:
1. XSS: `DOMPurify.sanitize()` now actually invoked in `HomePage.jsx`'s `ChatMessageTranslatedBody` on `mentionedHtml` before `dangerouslySetInnerHTML` (allowed tags: span/br/b/i/em/strong/u, allowed attr: class) — the import existed but was never called before this fix.
2. RTDB security rules — user deployed these themselves via Firebase Console; not touched in this session.
3. Presence heartbeat interval in `HomePage.jsx` changed 30s → 120s (RTDB `status/{uid}` writes).
4. Trust system write debounce — audit found this already implemented in `trustSystem.js` (5-min flush on `MESSAGE_SENT`); no change needed.
5. Team Members listener role filter — audit found `SettingsSidebar.jsx` already filters by `role in [...]`; no change needed.
6. Added `limit(500)` to `AdminPanelPage.jsx`'s `bannedIPs`, `bannedDevices`, and `rooms` (orderBy('order')) queries, and `limit(200)` to `HomePage.jsx`'s `privateMessages` participants-array-contains listener (no new `orderBy` added — avoided requiring an undeployable Firestore composite index on Spark plan without CLI access).
7. Code splitting via `React.lazy()` + `Suspense` in `App.jsx`: `AdminPanelPage`, `BuyCoinsPage`, `CoinWalletPage`, `Leaderboard`, `RJEarningsDashboard`, `RJWithdrawal` are now separate on-demand chunks instead of bundled into the main JS. Main bundle dropped from 3.07 MB to ~2.74 MB; Admin Panel alone is a 257 KB chunk that most users never download.

# Recent Changes (July 3, 2026) — Performance & Security Audit (Session 3)

Zero visible UI/behavior/schema changes; internal security hardening + query bounding only. Verified with a production build, workflow restart, and screenshot/console check.

✅ **Applied**:
- **RTDB security hole closed**: `broadcasts/rj` and `broadcasts/public/{id}` root `.write` rules in `database.rules.json` were `auth != null` (ANY authenticated user could hijack, overwrite, or delete a live broadcast, or push arbitrary YouTube/announcement state into someone else's session). Now gated to the actual live host via the existing `rjUid`/`hostUid` field — anyone can start a fresh session, but only that session's owner can write to it afterward. `youtube` and `announcements` sub-paths are now host-only writes (previously any authenticated user); `songQueue` allows a user to write only their own request or the host to manage any. **This requires deploying the updated `database.rules.json` via the Firebase Console or `firebase deploy --only database` — no Firebase CLI/credentials are available in this dev environment to do it automatically.**
- Added `limit(1000)` to three previously-unbounded `getDocs(collection(db, 'rooms'))` admin/bot bulk-action calls (HomePage.jsx bot broadcast, Sidebar.jsx bulk unkick, AdminPanelPage.jsx bulk unkick) and `limit(2000)` to the `collectionGroup('kickedUsers')` scan in AdminPanelPage — safety caps well above realistic data volume, so no visible truncation.

⏭️ **Investigated and intentionally left unchanged** (documented, not oversights):
- Possible leaked `onSnapshot` in `messageTextPreferences.js` — re-verified: `window._messageStylesUnsubscribes` is synchronously initialized before any listener is created, so this was a false positive from the earlier audit pass.
- Scoping the global RTDB `status` presence listener in HomePage.jsx to the current room (to fix O(N²) growth) — investigated but unsafe: `window.onlineUsers` (built from the full site-wide snapshot) also drives Sidebar's per-user online badges for users outside the current room and the site-wide online count, so scoping it would silently break those indicators. Left as documented future work requiring a Cloud Function presence aggregate.
- VPN admin-bypass flag — re-verified already sufficiently hardened (`enabled: false` by default, password sourced from an env var, not hardcoded).
- AdminPanelPage's always-on site-wide listeners — left as-is; justified by admins needing full visibility.

# Overview

TingleTap is a modern real-time chat application built with React that allows users to communicate through text, voice, and video. The platform features public chat rooms, private messaging, voice/video calls, media sharing, and advanced user customization options. The app includes comprehensive moderation tools, user profile management, and security features including VPN detection.

## Recent Changes (July 3, 2026) — Performance & Security Audit (Session 2)

Zero visible UI/behavior/schema changes; internal perf/security/cleanup only. Verified with a production build and a workflow restart.

✅ **Applied**:
- React.memo added to `GenderBadge`, `RoyalTrustBadge`, `PremiumImageMessage`, `TingleBotNotification` (plus pre-existing `ChatMessage`).
- `useMemo` added around Sidebar's online-user filter/sort/dedupe pipeline.
- Fixed a real `setInterval` leak in `WelcomeDashboard.jsx` (ban-modal polling interval now cleared on unmount).
- Leaderboard result + user-profile caching consolidated into a shared `src/utils/userProfileCache.js` (60s TTL, in-flight dedup) plus a 30s leaderboard-query cache to avoid loading flicker on tab switches.
- Added 5 Firestore composite indexes (`warnings_announcements`, `bannedIPs`, `bannedDevices`, `coinTransactions` x2) to `firestore.indexes.json`.
- `RJFollowSystem.jsx`: replaced persistent follower/following `onSnapshot` listeners with one-time `getCountFromServer` + optimistic local count updates; added `limit(50)` to the follower list modal query.
- Added a session-cached (`sessionStorage`, 1hr TTL) geolocation lookup helper in `RoomListPage.jsx`, replacing two duplicate `fetch` calls to the IP geolocation API.
- Wrapped `<BroadcastPanel>` in an `ErrorBoundary` in `HomePage.jsx` so a broadcast-panel crash no longer takes down the whole page.
- Fixed a `.info/connected` RTDB listener leak in `App.jsx` (subscription is now unsubscribed on cleanup).
- Hardened role-change logic in `AdminPanelPage.jsx` against privilege escalation: server-side re-check of the acting user's role, blocked self role-changes, blocked changing the owner's role, blocked assigning owner/superowner, and blocked admins from promoting/demoting other admins.

⏭️ **Intentionally deferred/skipped** (documented, not oversights):
- Memoizing Sidebar's individual "online user" list item was evaluated but skipped — the item has 25+ closures, a portal, and moderation actions wired to it, making extraction high-risk for a purely internal perf gain.
- Extracting `ChatInput`/`MessageList` out of `HomePage.jsx` (8,300+ lines) was evaluated but deferred — the file's size and tangled state make a safe, zero-behavior-change extraction a much larger, higher-risk effort than the other fixes in this pass.
- Ban-lockdown polling intervals in `LoginPage.jsx`, `SignupPage.jsx`, and `App.jsx` were audited and intentionally left as-is — they exist to keep enforcing an active ban screen and "fixing" them would change visible behavior.

## Recent Changes (October 10, 2025)

✅ **Device Fingerprinting & Ban System Implementation**:
1. **Comprehensive Device Fingerprinting** (`src/utils/deviceFingerprint.js`):
   - Browser-based device ID generation using multiple fingerprinting techniques
   - Screen resolution, canvas fingerprint, WebGL renderer detection
   - Installed fonts enumeration, timezone, language, and platform detection
   - Generates unique, persistent device identifiers for tracking across sessions

2. **Device Ban System** (`src/utils/deviceBanSystem.js`):
   - Real-time device ban tracking with Firestore integration
   - Individual device ban capability independent of IP bans
   - Automatic device info capture (browser, OS, location, IP)
   - Ban persistence across browser sessions and IP changes
   - Integration with existing IP ban infrastructure

3. **Admin Panel Device Tracking Enhancements** (`src/pages/AdminPanelPage.jsx`):
   - Enhanced `getUserDeviceInfo()` function to display device fingerprint data
   - Real-time banned devices tracking with useEffect hook
   - **Device ID now displayed** in Location & IP column (first 12 chars with full ID on hover)
   - Device type, browser, OS displayed in Device Information column
   - Location and IP address displayed in Location & IP column
   - Banned devices statistics in admin dashboard
   - Device ban/unban functionality ready for implementation

4. **User Data Model Updates**:
   - Added `lastDeviceId` field to store device fingerprint
   - Added `lastDeviceInfo` object with browser, OS, and userAgent details
   - Device tracking integrated with Firebase Firestore user documents

✅ **Sidebar & Settings Design Restoration (FINAL FIX)**:
   - **Sidebar.css**: Increased `.user-status-list` from 0.5rem to 0.85rem (14px equivalent)
   - **SettingsSidebar.css**: Fixed all compact fonts from 8-9px to 13-14px
   - `.modern-nav-btn span`: 9px → 14px
   - `.modern-quick-btn`: 9px → 14px, span 8px → 13px  
   - `.action-btn`: 9px → 14px, span 8px → 13px
   - `.account-details p`: 9px → 13px
   - All buttons and text now use original larger design (13-16px)
   - Only HomePage retains compact styling via scoped CSS selectors

✅ **Admin Panel Ultra-Compact Luxurious Design (Mobile-First)**:
1. **Mobile-First Responsive Design**: Complete redesign with progressive enhancement
   - Stats grid: 140px min-width on mobile, scales to 220px on desktop
   - Compact padding: 50px/0.8rem on mobile, expands to 70px/2rem on desktop
   - Optimized gap spacing: 0.6rem mobile → 0.8rem tablet → 1rem desktop
   - All media queries follow mobile-first approach for better performance

✅ **HomePage CSS Scoping Fix**: 
   - Fixed global CSS rules in HomePage.css that were affecting all pages
   - Changed from universal `*` selector to `.homepage-container *` scope
   - Now only HomePage has compact styling, all other pages retain original design

✅ **Workflow Configuration**:
   - Successfully configured and verified Vite development server on port 5000
   - Ensured proper host binding (0.0.0.0) and allowedHosts configuration
   - Resolved port conflicts and confirmed error-free startup

## Previous Changes (January 5, 2025)

✅ **Fixed three critical UI/UX issues:**

1. **Username and Text Color Loading**: Improved immediate visibility of other users' username and text colors on site load
   - Reduced initialization delays from 1000ms to 100ms
   - Added cache-first loading approach with immediate style application
   - Enhanced Firebase permission error handling
   - Now loads 3 users' styles immediately from localStorage cache

2. **Private Message Window Optimization**: Reduced private message popup height and made contents more compact
   - Reduced maximum height from 320px to 240px
   - Reduced minimum height from 180px to 140px  
   - Decreased header height from 48px to 36px
   - Made all content elements smaller (fonts, padding, avatars) to prevent horizontal scrolling
   - Improved content density while maintaining readability

3. **Banned User Login Modal**: Fixed ban modal visibility for suspended accounts
   - Enhanced BanKickModal component to properly accept and use passed banInfo props
   - Improved login logic to better detect banned users and display appropriate warnings
   - Created simple inline modal with guaranteed visibility and proper z-index
   - Added test functionality for development (any email containing "banned" will trigger ban modal)
   - Modal shows clear suspension message with contact information and proper user acknowledgment

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 18 with Vite as the build tool, providing fast development and optimized production builds with Hot Module Reloading (HMR).

**Routing**: React Router DOM v7 for client-side navigation between landing page, main chat interface, and user profiles.

**State Management**: React hooks-based state management with local component state and context where needed. No external state management library is used, keeping the architecture simple.

**Component Structure**: Modular component architecture with dedicated components for chat interface, modals, sidebars, media players, and user interface elements. Each component has its own CSS file for styling isolation.

**Styling**: CSS-in-files approach with CSS variables for theming support (light/dark mode). Uses Google Fonts integration and CSS animations for enhanced user experience.

## Backend Architecture

**Database**: Firebase Firestore for real-time data synchronization and Firebase Realtime Database for live chat features. Firestore handles user profiles, friend requests, and persistent data while Realtime Database manages active chat sessions.

**Authentication**: Firebase Authentication for user management, registration, and login flows with email verification support.

**Real-time Communication**: 
- Firebase Realtime Database for instant messaging
- Agora SDK for voice/video calling capabilities
- WebRTC integration through lib-jitsi-meet for additional video conferencing features

**File Storage**: Firebase Storage (implied) for media file uploads including images, audio recordings, and profile pictures.

## Data Storage Solutions

**Primary Database**: Firebase Firestore with composite indexes defined in `firestore.indexes.json` for optimized queries on messages by timestamp, type, and auto-delete properties.

**Real-time Database**: Firebase Realtime Database for live chat synchronization and presence management.

**Local Storage**: Browser localStorage for caching user preferences (message styling, username styling, theme settings) to provide instant UI updates without server round-trips.

**Security Rules**: Comprehensive Firestore security rules for friend requests and user data access control, ensuring users can only access authorized data.

## Authentication and Authorization

**User Authentication**: Firebase Authentication with email/password flow and email verification via EmailJS integration.

**Access Control**: Firestore security rules controlling read/write access based on user authentication status and data ownership.

**Admin Features**: Role-based access control for admin functions including user banning, kick functionality, and announcement management.

**Security Features**: 
- VPN detection system using Abstract API to prevent proxy/VPN usage
- Device fingerprinting and tracking system for unique device identification
- Dual-layer ban system: IP-based bans and device-based bans
- Ban persistence across sessions, browser changes, and IP address changes
- Configurable security policies and IP whitelisting capabilities

## External Dependencies

**Communication Services**:
- Firebase (Firestore, Realtime Database, Authentication) - Primary backend infrastructure
- Agora RTC SDK - Voice and video calling functionality
- lib-jitsi-meet - Additional video conferencing capabilities
- EmailJS - Email verification and password reset functionality

**Media and Content**:
- Google Generative AI - AI chat bot integration (TingleBot)
- Giphy API - GIF and sticker integration for chat messages
- YouTube API - Music player and video search functionality
- React Image Crop - Profile picture editing capabilities

**Security and Validation**:
- Abstract API - IP geolocation and VPN detection services
- hCaptcha - Bot protection and spam prevention
- CryptoJS - Client-side encryption for sensitive data handling

**UI and Interaction**:
- React Toastify - User notification system
- Emoji Picker React - Emoji selection interface
- Google Fonts API - Typography and font customization

**Development Tools**:
- Vite - Build tool and development server
- TypeScript - Type checking and enhanced development experience

The architecture prioritizes real-time communication, user experience, and security while maintaining scalability through Firebase's managed services. The modular component design allows for easy feature additions and maintenance.