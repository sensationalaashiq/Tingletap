---
name: Achievement System
description: Architecture decisions for the TingleTap achievement title feature — evaluation trigger, Firestore write strategy, cooldown design, and component placement.
---

# Achievement System Architecture

## Rules
- 5 sequential titles stored in `users/{uid}.achievements: string[]` (extends existing doc — no new collection)
- Titles: tingle_member (age≥0d, msg≥1) → explorer (60d, 10) → star (180d, 50) → icon (270d, 150) → legend (365d, 300)
- `tingle_member` also requires profile complete (gender set)
- Sequential: each title requires the prior one; loop breaks on first unmet criterion

**Why:** Reusing the existing user doc avoids a new subcollection, keeps reads to zero (evaluation is purely in-memory from the passed profile object), and keeps writes minimal (single `updateDoc` per batch).

## Evaluation trigger
- Called fire-and-forget from `handleSendMessage` in `HomePage.jsx` after a successful `addDoc`
- Pass `{ justSentMessage: true }` to add +1 to messagesCount (trust system batches its writes, so Firestore count lags)
- Registered users only — guarded by `!isGuest && !userProfile.isGuest`

## Cooldown design
- 45-second in-memory cooldown per uid (`_evalCache` Map) — fast enough for first unlock on first message
- Early exit: skip if user already has all 5 titles (no evaluation needed)
- The actual Firestore write only happens when new titles are unlocked

**Why:** Prevents redundant evaluations on rapid sends while keeping the first qualifying message feeling immediate.

## Optimistic local state update
- On successful grant, `setLoggedInUserProfile` is called with the new achievements merged in
- Toast notification shown per unlocked title using `toast()` from react-toastify with a styled SVG + title name

## Component placement
- `AchievementsSection` component in `src/components/AchievementsSection.jsx`
- CSS in `src/styles/AchievementsSection.css`
- Rendered at the bottom of the VPM "Info" tab in `HomePage.jsx`
- NOT shown in the sidebar user list (per spec — too small a context)

## How to apply
- Any future engagement events (profile complete, room join milestones) can call `checkAndGrantAchievements(uid, profile, opts)` the same way
- To add new titles: add to `ACHIEVEMENT_TITLES` array AND `CRITERIA` array in `achievementSystem.js` — order matters (sequential)
