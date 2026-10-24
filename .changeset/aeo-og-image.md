---
"@taxkit/content": minor
"@taxkit/api-http": minor
---

Content now owns each published page's addresses, share-image contracts
(`DocsOgImage`, `DocsPngBytes`, `DocsPageRenderer`, `DocsOgImages`) and head
metadata (`@taxkit/content/publication`). The HTTP route catalogue adds the
share-image path family `DocsImageApiPath`, and the shared cache policy now
stores a 307 Markdown redirect that varies on `Accept` beside its page, like
the existing 400 and 406 answers. The new `@taxkit/aeo` and `@taxkit/og-image`
packages serve the discovery documents and render share images on the API,
replacing `@taxkit/publication` and the Website's build-time images.
