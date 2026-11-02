---
"web": patch
---

Improve the documentation reading experience with responsive navigation, a mobile menu, an active page outline, themed code blocks and copy controls. Keep keyboard access, native no-JavaScript navigation and light/dark appearance consistent across documentation and search.

Use scoped Effect Atoms for menu, search and destination focus. Isolate outline updates from article rendering and reuse the canonical page's navigation during search.

Adopt shared shadcn/Base UI components for docs actions, search, the mobile sheet, navigation collapsibles and code scroll areas. Centralise themed component variants and accessibility states while retaining native links and no-JavaScript controls.

Polish selected navigation, keyboard focus and responsive title spacing. Remove decorative side stripes, preserve selected states on hover and keep fragment headings consistent with the article typography.
