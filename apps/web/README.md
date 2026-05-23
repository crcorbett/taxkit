---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# Web App

Current TanStack Start scaffold for WhatTax.

## Scope

`apps/web` proves the current browser/server runtime split and calls the
Effect HTTP API health endpoint. It is not the long-term calculation engine and
should not own tax-domain contracts.

## Main Areas

- `src/routes/`: TanStack Router routes
- `src/lib/runtime.server.ts`: server `ManagedRuntime`
- `src/lib/runtime.client.ts`: client `ManagedRuntime`
- `src/lib/route-runtime.ts`: route runtime selection
- `src/server.ts`: server entrypoint

## Runtime Shape

The root route loads `@whattax/http-api/client` through the route runtime and
renders API health status from the standalone API service over HTTP.
Server-only API exports must stay out of browser code.

The web runtime reads the API origin from:

- `WHATTAX_API_BASE_URL` on the server
- `VITE_WHATTAX_API_BASE_URL` in the browser

Both default to `http://127.0.0.1:4000`, which is the local `apps/api`
default. Do not include `/api` in the base URL; the typed API client owns route
prefixes.

## Guardrails

- Keep tax rules, facts and calculators in engine packages.
- Use browser-safe API client exports from routes.
- Do not import `@whattax/http-api/server` from browser code.
- Keep the app README local; route durable architecture to `docs/architecture`.

## Commands

```bash
bun run --filter=api dev
bun run --filter=web dev
bun run --filter=web check-types
bun run --filter=web build
```

## Related Docs

- `docs/architecture/frontend.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/deployment.md`
