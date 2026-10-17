---
"@taxkit/api-http": patch
---

Preserve response-owner cache lifetimes and revalidation directives instead of replacing them with default CDN freshness. Prevent public caching when cookies are stored in Effect's response cookie collection, including cookies parsed from Web responses.
