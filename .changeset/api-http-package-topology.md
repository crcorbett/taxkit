---
"@whattax/api-http": patch
---

Relocate the HTTP API transport package to `packages/api/http` and rename it
from `@whattax/http-api` to `@whattax/api-http` while preserving the existing
runtime, client and handler export paths under the new package name.
