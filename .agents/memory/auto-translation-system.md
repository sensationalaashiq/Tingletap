---
name: Auto Translation System
description: Architecture decisions for the TingleTap client-side auto translation feature
---

## Core architecture

- **API**: MyMemory free tier (`api.mymemory.translated.net`) — no key required, 500 chars/request max
- **Language detection**: pure client-side Unicode heuristics in `translationService.js`
- **Cache**: 600-entry LRU in-memory Map, key = `text|||targetLang`
- **In-flight dedup**: `pending` Map prevents duplicate simultaneous API calls

## Rules of Hooks — ChatMessage pattern

`ChatMessage` in `HomePage.jsx` has an early return (`if (isBot...) return null`) BEFORE any hooks — this is a pre-existing violation in the codebase. Adding `useTranslation` inside ChatMessage directly would worsen it.

**Fix**: Extract into `ChatMessageTranslatedBody` (a standalone `React.memo` component above ChatMessage) that safely holds `useTranslation` at its own top level. ChatMessage renders `<ChatMessageTranslatedBody>` as a JSX child after the early-return guard.

**Why**: React rules prohibit hooks after conditional returns; extracting to a child component sidesteps this cleanly without restructuring ChatMessage.

## Stale-state cancellation pattern

All per-message translation effects use a cancellation flag:
```js
let cancelled = false;
translate(text, lang).then(res => {
  if (cancelled) return;
  setResult(res);
});
return () => { cancelled = true; };
```
Applied in: `TBTranslationStrip`, `PMTranslatedText`, `BPAnnTranslated`.

## Settings keys

Five new settings stored in Firebase `settings.*` + localStorage:
- `autoTranslation` (bool, default false)
- `translationLanguage` (string, default 'en')
- `showOriginalMessage` (bool, default true)
- `translateBroadcastAnnouncements` (bool, default true)
- `translatePrivateMessages` (bool, default true)

Settings reactivity: all components subscribe to `tbSettingChanged` custom window event (existing pattern).

## Integration points

| Component | Approach |
|-----------|----------|
| `ChatMessage` (HomePage.jsx) | `ChatMessageTranslatedBody` child with `useTranslation` hook |
| `LuxuryPrivateMessageWindow` | `PMTranslatedText` component with `_ttPM`/`_tsPM` direct imports |
| `TingleBotNotification` | `TBTranslationStrip` component (announcement + rule types only) |
| `BroadcastPanel` | `BPAnnTranslated` component (strips + card list) |
| `SettingsSidebar` | 'chat' tab with 5 controls + `SUPPORTED_LANGUAGES` select |

## Privacy note

Message text (including PMs when enabled) is sent to third-party MyMemory API client-side. Scope controls (translatePrivateMessages, translateBroadcastAnnouncements) exist to limit exposure.
