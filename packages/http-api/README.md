---
status: canonical
last_reviewed: 2026-05-24
source_of_truth: package-readme
confidence: medium
---

# HTTP API

Effect HTTP API package for the current WhatTax health endpoint, public
calculation endpoints, generated docs and API server route wiring.

## Scope

`@whattax/http-api` owns the current HTTP API contract, generated OpenAPI
metadata, health and public calculation routes, HTTP status envelopes, thin
handler adapters and typed client helpers used by WhatTax apps. Reusable
calculator schemas, catalog entries, metadata projections, graph construction,
calculation dispatch and schema-guided expected error shaping live in
`@whattax/calculators`.

The implemented API surface is:

- `GET /api/health`
- `GET /api/docs`
- `GET /api/docs/openapi.json`
- `GET /api/v1/jurisdictions`
- `GET /api/v1/tax-years`
- `GET /api/v1/calculators`
- `GET /api/v1/calculators/:calculatorId`
- `GET /api/v1/calculators/:calculatorId/schema`
- `POST /api/v1/calculators/:calculatorId/calculate`
- `GET /api/v1/calculators/:calculatorId/graph`
- `GET /api/v1/facts`
- `GET /api/v1/rules`

The public calculation API routes expose the reusable calculator catalog,
canonical fact descriptors, canonical rule descriptors and graph validation
diagnostics from `@whattax/calculators`. Handler implementations pass route
params, query values and payloads to `PublicCalculatorService` and map tagged
service failures into route-owned HTTP error envelopes.

## Main Areas

- `src/api.ts`: `WhatTaxApi` definition and OpenAPI annotations.
- `src/groups/health.ts`: health endpoint schema and route group.
- `src/groups/calculators.ts`: public calculation HTTP route schemas, bad
  request envelope, OpenAPI annotations and compatibility exports from
  `@whattax/calculators`.
- `src/handlers/`: server-side thin handler adapters and handler layers.
- `src/server/live.layer.ts`: server route layer, CORS middleware, Scalar docs
  route, OpenAPI JSON route and calculator service layer composition.
- `src/server.ts`: server export boundary for `WhatTaxServerLayer`.
- `src/config.ts`: package-owned client config schema and neutral `httpApi`
  config source.
- `src/client/`: typed Effect HTTP API client helpers and layers.

Export paths:

- `@whattax/http-api`
- `@whattax/http-api/api`
- `@whattax/http-api/client`
- `@whattax/http-api/client/live`
- `@whattax/http-api/client/server`
- `@whattax/http-api/config`
- `@whattax/http-api/server`
- `@whattax/http-api/handlers`
- `@whattax/http-api/handlers/live`

Reusable calculator exports:

- `@whattax/calculators`
- `@whattax/calculators/catalog`
- `@whattax/calculators/errors`
- `@whattax/calculators/live`
- `@whattax/calculators/metadata`
- `@whattax/calculators/service`
- `@whattax/calculators/schemas`

## Runtime Shape

The package is built as ESM TypeScript. Runtime exports are split by boundary:

- browser-safe consumers should use `@whattax/http-api/client`
- server runtimes may use `@whattax/http-api/server`
- app or test code that needs in-process wiring can use the client layers
- handler exports are server-side and should not be imported from browser code

`ApiRoutesLive` owns reusable route middleware such as CORS inside this package.
App packages should provide a platform HTTP server and process config, not
duplicate API route middleware.

`@whattax/http-api/config` owns the reusable client config schema, type and
keyed config fragment. Apps should compose that fragment into runtime-specific
config modules, then provide server or client environment values through Effect
`ConfigProvider` composition. The package owns its env namespaces, including
`WHATTAX_API_*` and `VITE_WHATTAX_API_*`. See
`docs/architecture/configuration.md`.

Current responses are schema-backed with Effect Schema. Calculator response
schemas are imported from `@whattax/calculators`; route-only HTTP envelopes and
status annotations stay in this package. The health response is:

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

- Keep browser consumers on client exports; do not import server handlers into
  browser code.
- Keep endpoint request and response shapes schema-owned; route-only HTTP
  envelopes stay here and reusable calculator payload schemas live in
  `@whattax/calculators`.
- Keep calculation execution delegated to `PublicCalculatorService`, which is
  catalog-driven, scenario-schema decoded and `CalculationEngine` based.
- Keep metadata responses derived from canonical fact descriptors, rule
  descriptors, source refs, parameter periods and graph diagnostics from the
  owning engine and rule packages.
- Keep handlers thin. They may extract route input and translate tagged
  service errors to HTTP status envelopes; reusable calculator lookup,
  metadata transformation, graph assembly, calculation dispatch and expected
  error shaping stay in `@whattax/calculators`.
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
