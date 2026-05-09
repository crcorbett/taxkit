# WhatTax

Public monorepo for WhatTax.

## Runtime Boundary

- `apps/web/src/lib/runtime.server.ts` is the only server `ManagedRuntime`.
- `apps/web/src/lib/runtime.client.ts` is the only client `ManagedRuntime`.
- `apps/web/src/lib/server/api-handler.server.ts` is the only app-side import of `@whattax/http-api/server`.
- `@whattax/http-api/client` and `@whattax/http-api/client/live` are browser-safe.
- `@whattax/http-api/client/server`, `@whattax/http-api/server`, and handler exports are server-only.
