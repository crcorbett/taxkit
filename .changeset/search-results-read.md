---
"@taxkit/api-http": patch
---

Return only search results from the bounded documentation search helper, skipping HTTP for an empty query. The Website reuses navigation from its existing themed page read, removing a duplicate navigation request without changing public HTTP routes.
