---
"@whattax/http-api": patch
"@whattax/sdk": patch
---

Move the public calculation HTTP API handler to consume the SDK Effect facade and extend SDK import-boundary checks to prove the HTTP API depends on the SDK, not the reverse.
