---
"@taxkit/api-http": patch
"@taxkit/sdk": patch
---

Preserve the native rate-limit response Schema's precise types, including its
Retry-After header, when generating the HTTP client. Keep response bytes and
existing compatibility exports unchanged. Finish shared lint-package adoption
and type-aware checks across the repository.
