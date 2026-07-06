---
name: Emoji-free select pattern
description: How to remove emoji from a native select while keeping SVG icons, for premium/emoji-free UI requirements
---

Native HTML `<option>` elements cannot render `<svg>` or arbitrary markup — only plain text. So when a design requirement says "no emoji, use SVG icons instead" for a dropdown (severity picker, target picker, etc.), you cannot just swap emoji characters for SVG inside `<option>`.

**How to apply:** Replace the `<select>` with a custom button that opens a list/menu of buttons, each rendering an SVG icon + label, wired to the same state setter the `<select>` used. Keep the visual footprint (size, position, click target) consistent with the original design system. This pattern was used for severity and send-to pickers in `WarningAnnouncementModal.jsx`/`WarningAnnouncementManager.jsx`.
