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
