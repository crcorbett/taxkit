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
renders API health status. Server-only API exports must stay out of browser
code.

## Guardrails

- Keep tax rules, facts and calculators in engine packages.
- Use browser-safe API client exports from routes.
- Do not import `@whattax/http-api/server` from browser code.
- Keep the app README local; route durable architecture to `docs/architecture`.

## Commands

```bash
pnpm --filter=web dev
pnpm --filter=web check-types
pnpm --filter=web build
```

## Related Docs

- `docs/architecture/frontend.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/deployment.md`
