---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# HTTP API

Effect HTTP API package for the current WhatTax health endpoint and API server
wiring.

## Scope

`@whattax/http-api` owns the current HTTP API contract, generated OpenAPI
metadata, health handler and typed client helpers used by WhatTax apps.

The implemented API surface is intentionally small:

- `GET /api/health`
- `GET /api/docs`
- `GET /api/docs/openapi.json`

## Main Areas

- `src/api.ts`: `WhatTaxApi` definition and OpenAPI annotations.
- `src/groups/health.ts`: health endpoint schema and route group.
- `src/handlers/`: server-side handlers and handler layers.
- `src/server.ts`: server route layer, Scalar docs route and OpenAPI JSON
  route.
- `src/client/`: typed Effect HTTP API client helpers and layers.

Export paths:

- `@whattax/http-api`
- `@whattax/http-api/api`
- `@whattax/http-api/client`
- `@whattax/http-api/client/live`
- `@whattax/http-api/client/server`
- `@whattax/http-api/server`
- `@whattax/http-api/handlers`
- `@whattax/http-api/handlers/live`

## Runtime Shape

The package is built as ESM TypeScript. Runtime exports are split by boundary:

- browser-safe consumers should use `@whattax/http-api/client`
- server runtimes may use `@whattax/http-api/server`
- app or test code that needs in-process wiring can use the client layers
- handler exports are server-side and should not be imported from browser code

Current responses are schema-backed with Effect Schema. The health response is:

```ts
{
  status: "ok";
  service: "whattax";
}
```

## Commands

From the package root:

```sh
bun run build
bun run check-types
bun run clean
```

From the repo root:

```sh
bun run --filter=@whattax/http-api build
bun run --filter=@whattax/http-api check-types
```

## Guardrails

- Do not document calculation endpoints until they are implemented.
- Keep browser consumers on client exports; do not import server handlers into
  browser code.
- Keep endpoint request and response shapes schema-owned.
- Add OpenAPI annotations with new API groups so docs stay generated from the
  contract.
- Add tests or focused verification when new endpoints, handlers or client
  layers are added.

## Related Docs

- `docs/architecture/api-and-sdk.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/testing-and-quality.md`
- `docs/product-specs/documentation-improvement-roadmap.md`
