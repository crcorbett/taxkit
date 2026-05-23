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

The process creates exactly one Effect `ManagedRuntime` from `ApiAppLayer`.
Startup runs through that runtime, requests are served by the Bun-backed
`HttpServer` layer, and `SIGINT` or `SIGTERM` disposes the runtime so scoped
finalizers stop the Bun server.

Local defaults:

- host: `127.0.0.1`
- port: `4000`

Environment overrides:

- `API_HOST`
- `API_PORT`

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

The web app defaults to `http://127.0.0.1:4000` for API calls. Override the API
origin with `WHATTAX_API_BASE_URL` for SSR and `VITE_WHATTAX_API_BASE_URL` for
browser navigation.

## Guardrails

- Do not define API contracts in this app.
- Do not create a `ManagedRuntime` inside request handling.
- Keep process-owned resources in `ApiAppLayer` so runtime disposal releases
  them.
- Keep `apps/web` as an HTTP client of this app, not an in-process API mount.

## Related Docs

- `docs/architecture/api-and-sdk.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/package-ownership.md`
- `docs/product-specs/extract-api-app.md`
