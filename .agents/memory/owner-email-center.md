---
name: Owner Email Center architecture
description: Gmail-like email center for TingleTap owners — data model, Netlify functions, routing, Firestore collection, sender mapping.
---

## Data model — `ownerEmails` Firestore collection

Each doc:
- `ownerInbox`: `'VyomAI'` or `'Blurry'` — gates which owner sees the email
- `folder`: `'inbox'|'sent'|'drafts'|'archived'|'trash'`
- `from`, `to[]`, `replyTo` — address objects `{ name, email }`
- `source`: `'contact_form'|'compose'|'reply'|'forward'|'incoming_email'`
- `threadId` — root emailId for threading (replies share the same threadId)
- `parentEmailId` — for replies/forwards
- `read`, `starred`, `replied`, `forwarded` — boolean flags

## Sender mapping (immutable, owner-detected server-side)
- `VyomAI` → `support@tingletap.com`
- `Blurry`  → `admin@tingletap.com`

## Netlify functions
- `contact.js` — unauthenticated contact form → Firestore inbox + Brevo notification; rate 5/hr/IP
- `email-action.js` — authenticated owner reply/forward → Brevo send + Firestore sent copy; updates parent `replied`/`forwarded` flag
- `receive-webhook.js` — Brevo inbound webhook (JSON format) → Firestore inbox; `To` address determines ownerInbox; requires MX records pointing to Brevo

## Frontend
- Route: `/owner/email-center` (lazy-loaded in App.jsx as `OwnerEmailCenter`)
- Entry points: Admin Panel "Email Center" tab (owner-only), SettingsSidebar (if wired)
- Compose: calls `/.netlify/functions/send-email` for Brevo + writes directly to Firestore `ownerEmails` as `folder:'sent'`
- Reply/Forward: calls `/.netlify/functions/email-action` (handles Brevo + Firestore write server-side)
- Archive/delete/star/mark-read: direct Firestore `updateDoc`/`deleteDoc` (owner is authenticated)

## Contact page
- Dropdown: `route: 'support'|'administration'`
- Now POSTs to `/.netlify/functions/contact` (not FormSubmit.co)
- Appears in the correct owner's Firestore inbox automatically

**Why:** Email center needs Netlify functions for unauthenticated contact form writes and server-side Brevo relay; authenticated actions (star/archive) are safe direct Firestore ops from the frontend.

**How to apply:** For any new email action that requires Brevo send, use `email-action.js` or create a new action handler. For metadata-only changes, use direct Firestore. Never use FormSubmit.co for new contact form submissions.
