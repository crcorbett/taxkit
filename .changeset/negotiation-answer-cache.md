---
"@taxkit/api-http": patch
---

`cacheHeaders` also shares a 400 or 406 that varies on `Accept`. Workers Cache
drops a page's stored entry when an uncacheable reply arrives at the same
address, so these negotiation answers are stored as their own variant instead
of letting an odd `Accept` header empty the page's cache.
