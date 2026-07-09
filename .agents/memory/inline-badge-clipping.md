---
name: Inline badge icon clipping
description: Why transform:scale() on an inline SVG badge inside a truncated-text container causes visible cropping, and the correct fix.
---

Some badge SVGs (e.g. Emerald Empress, Sapphire Goddess in the sidebar user list) have more internal whitespace in their artwork than others, so scaling them up was used to make them read as the same visual size as other badges.

**Why it broke:** `transform: scale(1.55)` on the `<svg>` only repaints it larger visually — it does not change the element's layout box. The wrapping span/badge container still reports its original (smaller) width/height to the layout engine. When that badge sits inside a container that uses `overflow: hidden` (needed elsewhere for username ellipsis truncation), anything painted outside the original layout box — including the scaled-up badge — gets cropped on every side (top/bottom/left/right).

**How to apply:** When a badge/icon needs to render bigger than its siblings, resize the actual box (`width`/`height` on both the wrapping element and the `svg`, not `transform: scale`) so the enlarged render is accounted for in layout and never exceeds its own box. This is required specifically in any container that also does ellipsis text truncation (`overflow:hidden; text-overflow:ellipsis`), since those containers cannot be given `overflow: visible` without breaking the truncation.

Trade-off to watch: giving a badge a bigger real layout box eats into the space available for the username text before it starts truncating with `…`. Prefer the smallest size bump that still reads correctly (e.g. 28-31px) rather than reverting to transform-scale.
