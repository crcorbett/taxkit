---
"@taxkit/content": minor
"@taxkit/og-image": minor
"@taxkit/aeo": patch
"api": patch
---

Share images are drawn when the API is built. `DocsOgImages` now reads one
finished image by page address, and `@taxkit/og-image` exports the build-time
`./archive` instead of the request-time `./live` cache.
