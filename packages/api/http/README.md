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

`@whattax/api-http` owns the current HTTP API contract, generated OpenAPI
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
diagnostics from `@whattax/calculators`. Metadata handlers pass route params
and query values to `PublicCalculatorService`. The calculate handler delegates
one full run to `@whattax/sdk/effect` `calculateRunRequest`, then maps tagged
service failures into route-owned HTTP error envelopes.

```ts
Production: HTTP calculate

apps/api Bun process
  -> WhatTaxServerLayer
    -> CalculatorApiHandlerLive
      -> sdkCalculationFor(params.calculatorId)
      -> @whattax/sdk/effect calculateRunRequest
        -> PublicCalculatorService.calculate
          -> CalculatorCatalogEntry.inputSchema decode
          -> CalculationEngine
          -> CalculatorRunResponseData
        -> descriptor output decode for response.report
        -> typed CalculatorRunResponse with narrowed report
      -> CalculatorApiErrorEnvelope on CalculatorServiceError
```

```ts
Tests: in-process HTTP client

HTTP API tests
  -> WhatTaxApiInProcessClientLive
    -> CalculatorApiHandlerLive
      -> @whattax/sdk/effect calculateRunRequest
        -> PublicCalculatorServiceLive
          -> CalculationEngineLive
  -> success response equals SDK full-run response
  -> CalculatorInputDecodeError maps to CalculatorApiErrorEnvelope
```

The calculate route imports reusable `CalculatorRun*` schemas and
`CalculatorServiceError` from `@whattax/calculators`. `CalculatorRunRequest`
has a `facts` field that is a union of canonical rule-owned input schemas, so
generated OpenAPI exposes concrete supported fact shapes under `facts.anyOf`
instead of `Schema.Unknown`. HTTP-only names such as
`CalculatorApiErrorEnvelope` stay in this package because they describe
calculator API transport status encoding. HTTP
handlers must not try to select or transform calculator facts locally;
`PublicCalculatorService` performs the selected-calculator `inputSchema` decode
and returns `CalculatorInputDecodeError` with descriptor-backed help for
incompatible calculator/facts combinations.

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

- `@whattax/api-http`
- `@whattax/api-http/api`
- `@whattax/api-http/client`
- `@whattax/api-http/client/live`
- `@whattax/api-http/client/server`
- `@whattax/api-http/config`
- `@whattax/api-http/server`
- `@whattax/api-http/handlers`
- `@whattax/api-http/handlers/live`

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

- browser-safe consumers should use `@whattax/api-http/client`
- server runtimes may use `@whattax/api-http/server`
- app or test code that needs in-process wiring can use the client layers
- handler exports are server-side and should not be imported from browser code

`ApiRoutesLive` owns reusable route middleware such as CORS inside this package.
App packages should provide a platform HTTP server and process config, not
duplicate API route middleware.

`@whattax/api-http/config` owns the reusable client config schema, type and
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
bun run --filter=@whattax/api-http build
bun run --filter=@whattax/api-http check-types
```

## Guardrails

- Keep browser consumers on client exports; do not import server handlers into
  browser code.
- Keep endpoint request and response shapes schema-owned; route-only HTTP
  envelopes stay here and reusable `CalculatorRun*` payload schemas live in
  `@whattax/calculators`.
- Keep calculate facts imported from `@whattax/calculators` so OpenAPI and
  typed clients reflect canonical rule-owned fact shapes.
- Keep calculation execution delegated through `@whattax/sdk/effect`
  `calculateRunRequest`, which uses `PublicCalculatorService` for the
  catalog-driven, scenario-schema decoded and `CalculationEngine` based run.
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
