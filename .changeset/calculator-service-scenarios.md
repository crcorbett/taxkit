---
"@whattax/calculators": patch
"@whattax/http-api": patch
---

Add Effect Vitest coverage for public calculator service scenarios and
in-process HTTP API calculator execution/error handling. The public calculate
contract now exposes a canonical facts union while the calculator service
validates facts again against the selected catalog entry schema.
