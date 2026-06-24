---
name: Role display labels
description: Shared getRoleDisplayLabel() utility and guest gender label names
---

Shared `getRoleDisplayLabel()` lives in `src/utils/roleUtils.js`.

**Non-guest roles:**
- owner / superowner → Godfather
- admin → High Council
- moderator → Guardian
- badge holder → badge name from Badges[]
- registered user → Member

**Guest roles (gender-specific):**
- guest + male → Purush
- guest + female → Stree
- guest + transgender/other → Navrang  ← (NOT Ardhnaari — changed per user request)

**Why:** User explicitly renamed transgender guest label from "Ardhnaari" to "Navrang".

**How to apply:** Any place that renders a guest role label must go through `getRoleDisplayLabel()` or the WelcomeDashboard inline logic. Both have been updated. Do NOT hardcode "Ardhnaari" anywhere.

**Companion utilities (also in roleUtils.js):**
- `getStoredGuestGender()` — reads guest gender from localStorage without an inline IIFE. Use instead of `JSON.parse(localStorage.getItem('guestUser')).gender` one-liners. Used in Sidebar and SettingsSidebar.
- `dicebearSex(gender)` — normalises any gender string to `'male'` or `'female'` for DiceBear avatar URLs (DiceBear adventurer style only accepts these two values). Use for all `sex=` params in DiceBear URLs.

**Why:** `loggedInUserProfile` is lazily initialised from localStorage before first render, so `loggedInUserProfile.gender` is always correct on render 1 for guests — no IIFE needed. `dicebearSex` prevents 'transgender'/'other' being passed to DiceBear which silently ignores unknown values.
