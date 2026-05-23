---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# API App

Standalone Bun process for the WhatTax Effect HTTP API.

## Scope

`apps/api` owns process config, Bun server startup, request dispatch to
`@whattax/http-api/server` and graceful shutdown. API contracts, handlers,
schemas, generated OpenAPI and docs routes stay in `packages/http-api`.

## Runtime Shape

The process entrypoint is an Effect program run with
`@effect/platform-bun/BunRuntime.runMain`. Startup reads `ApiServerConfig` from
`ApiAppLayer`, requests are served by the Bun-backed `HttpServer` layer, and
`SIGINT` or `SIGTERM` interrupts the root Effect fiber so scoped finalizers stop
the Bun server.

Local defaults:

- host: `127.0.0.1`
- port: `4000`

Environment overrides:

- `API_HOST`
- `API_PORT`
- `PORT` as the fallback port supplied by portless

## Routes

- `GET /api/health`
- `GET /api/docs`
- `GET /api/docs/openapi.json`

## Commands

```sh
bun run --filter=api dev
bun run --filter=api start
bun run --filter=api check-types
bun run --filter=api build
bun run --filter=api clean
```

For local UI development, run the API and web app in separate terminals:

```sh
bun run --filter=api dev
bun run --filter=web dev
```

`bun run --filter=api dev` serves this app through portless at
`https://api.whattax.localhost`. `bun run --filter=web dev` injects that URL
into `WHATTAX_API_BASE_URL` for SSR and `VITE_WHATTAX_API_BASE_URL` for browser
navigation.

Use the portless URL for local API smoke checks:

```sh
curl https://api.whattax.localhost/api/health
```

## Guardrails

- Do not define API contracts in this app.
- Keep app-owned schemas in `schemas.ts` and derive exported types from those
  schemas. Runtime files should consume canonical schema values and compose
  layers/startup logic, not redefine reusable shapes inline.
- Do not manually wire process signal handlers, `process.exit`, mutable
  shutdown flags or `try/catch` around Effect startup. The process entrypoint
  should be an Effect program run through `BunRuntime.runMain`.
- Do not create a runtime inside request handling.
- Keep process-owned resources in `ApiAppLayer` so root fiber interruption
  releases them through scoped finalizers.
- Keep `apps/web` as an HTTP client of this app, not an in-process API mount.

## Related Docs

- `docs/architecture/api-and-sdk.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/package-ownership.md`
- `docs/product-specs/extract-api-app.md`
