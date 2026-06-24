---
name: Guest avatar & gender consistency
description: Rules for consistent avatar and gender badge display for guest users across all components
---

## Avatar (photoURL) consistency

**Rule:** `getDefaultAvatarUrl(uid, gender)` must always receive the Firebase UID as the first argument — never the displayName.

**Why:** `getDefaultAvatarUrl` uses djb2 hash of the first arg to pick a portrait index. Passing displayName gives a different index than passing uid, so the stored photoURL diverges from fallback-generated URLs in Sidebar, SettingsSidebar, and ChatFeed.

**How to apply:**
- In `LoginPage.jsx` `handleGuestFormSubmit`: `photoURL: getDefaultAvatarUrl(user.uid, guestFormData.gender)` (NOT displayName)
- In `buildGuestProfile` (HomePage.jsx) and the lazy initializer: if stored photoURL is from randomuser.me, regenerate with uid: `storedPhoto && !storedPhoto.includes('randomuser.me') ? storedPhoto : getDefaultAvatarUrl(uid, gender)`
- In `EditProfilePanel.handleSave` (WelcomeDashboard.jsx): always update `localStorage.guestUser` with the new photoURL after saving, so all components stay in sync.

## Gender badge consistency

**Rule:** In `WelcomeDashboard.getRoleConfig`, read gender via `getStoredGuestGender()` (from roleUtils.js) as primary source, not by inline JSON-parsing localStorage.

**Why:** `getStoredGuestGender()` is the single authoritative reader for guest gender from localStorage — avoids duplicate parsing logic and subtle try/catch fallback errors.

**Gender → label mapping (guest):**
- `female` → Stree
- `transgender` / `other` → Navrang  
- `male` (or default) → Purush
