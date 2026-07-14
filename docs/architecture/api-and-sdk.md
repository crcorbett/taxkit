---
status: canonical
last_reviewed: 2026-06-25
source_of_truth: docs
confidence: high
---

# API and SDK

WhatTax should publish a reusable API app server and TypeScript SDK around the
open-source calculation engine.

The API and SDK are part of this repository because they expose reusable tax
calculation capabilities through stable, documented boundaries.

## Current API runtime

See [TypeScript SDK and publishing](../product-specs/typescript-sdk-and-publishing.md)
and [SDK public naming and export contract](../product-specs/sdk-public-naming-and-export-contract.md)
for the SDK facade, plain TypeScript entrypoint, Effect entrypoint and export
contract specs.

`apps/api` is the current API runtime owner. It is a standalone Bun process
that owns host/port config, process startup through
`@effect/platform-bun/BunRuntime.runMain`, Bun request serving and graceful
shutdown through Effect interruption and scoped layer finalizers. It delegates
API contracts, handlers, schemas and generated docs to `packages/api/http`.

The current implemented API surface is:

```txt
GET /api/health
GET /api/docs
GET /api/docs/openapi.json
GET /api/v1/jurisdictions
GET /api/v1/tax-years
GET /api/v1/calculators
GET /api/v1/calculators/:calculatorId
GET /api/v1/calculators/:calculatorId/schema
POST /api/v1/calculators/:calculatorId/calculate
GET /api/v1/calculators/:calculatorId/graph
GET /api/v1/facts
GET /api/v1/rules
```

`apps/web` consumes this API over HTTP. It must not mount the canonical API or
import server-only `@whattax/api-http` exports.

API process entrypoints should be Effect programs run with
`@effect/platform-bun/BunRuntime.runMain(...)`. The app owns process config,
platform server creation and root lifecycle. The HTTP API package owns
`HttpApi` definitions, `HttpApiBuilder.group(...)` handlers, generated docs
and reusable route layers. Apps should provide a platform `HttpServer` and
serve the package route layer. Packages must not call `Bun.serve`, read
process env or own process signal handling.

## Current API package

The current API package lives under:

```txt
packages/api/http
```

Package name:

```txt
@whattax/api-http
```

It owns the current Effect HTTP API definitions, health endpoint schema,
server route layer, OpenAPI metadata, typed client helpers and reusable client
config schema.

`@whattax/api-http` owns transport contracts, HTTP status annotations, OpenAPI
generation, typed HTTP clients, server route layers and thin handler adapters.
Reusable calculator catalog entries, metadata transformations, graph assembly
and schema-error shaping live in `@whattax/calculators`. The calculate route
executes through the request-preserving `@whattax/sdk/effect`
`calculateRunRequest` helper as a normal in-process consumer, proving the
public SDK boundary without making the SDK depend on HTTP transport code.

`@whattax/api-http/config` exports the package-owned HTTP API client config
schema, type and keyed config fragment. Apps compose that fragment into their
own runtime config modules and provide runtime-specific values, such as server
process env or Vite client env, through `ConfigProvider` composition instead of
redefining API client config keys or env prefixes locally.

Runtime app modules should keep app-owned schemas in colocated `schemas.ts`
files and derive exported types from those schemas. Server startup files should
consume canonical schema values and compose config, layers and runtime lifecycle
only.

Every public HTTP request and response schema should live in the owning API
group or an owning package schema module. If downstream code needs the type,
export it from the same module as a schema-derived type. Do not hand-write DTO
interfaces or duplicate response shapes in handlers, clients or apps.

Route-only HTTP envelopes, query schemas and status annotations stay in
`@whattax/api-http`. HTTP-facing names such as
`CalculatorApiErrorEnvelope` stay in the transport package because they
describe calculator API status encoding. Rule-owned calculator IDs and
supported context literals are composed by `@whattax/calculators`; reusable
help modes, calculator run payloads and calculator service errors live in
`@whattax/calculators`.

The final calculate-route production graph is:

```ts
Production: HTTP calculate

apps/api Bun process
  -> WhatTaxServerLayer
    -> CalculatorApiHandlerLive
      -> sdkCalculationFor(params.calculatorId)
      -> @whattax/sdk/effect calculateRunRequest
        -> PublicCalculatorService.calculate
          -> selected CalculatorCatalogEntry.inputSchema decode
          -> constructor-closed typed scenario continuation
          -> CalculationEngine
            -> rule package scenario layer
            -> official rule pack layer
            -> calculator program
          -> CalculatorRunResponseData
        -> descriptor output decode for response.report
        -> typed CalculatorRunResponse with narrowed report
      -> CalculatorApiErrorEnvelope on CalculatorServiceError
```

Metadata routes stay direct service adapters until a broader SDK catalog
facade exists:

```ts
Production: metadata routes

CalculatorApiHandlerLive
  -> PublicCalculatorService.listCalculators / getCalculator / getCalculatorGraph
  -> calculator-owned metadata response schemas
  -> CalculatorApiErrorEnvelope for expected lookup/context failures
```

The SDK Effect full-run graph is:

```ts
Production: SDK Effect full run

Effect consumer
  -> @whattax/sdk/effect calculateRunRequest(descriptor, request)
    -> PublicCalculatorService.calculate({ calculatorId, ...request })
      -> CalculatorRunServiceRequest
      -> CalculatorRunResponse
    -> descriptor.decodeOutput(response.report)
    -> response with report narrowed to OutputSchema["Type"]

Report-only helpers
  -> calculateReportRequest(...)
    -> calculateRunRequest(...)
    -> response.report
  -> calculateReport(...)
    -> calculateReportRequest(...)
```

The matching test graph is:

```ts
Tests: HTTP over SDK

HTTP API tests
  -> WhatTaxApiInProcessClientLive
    -> CalculatorApiHandlerLive
      -> @whattax/sdk/effect calculateRunRequest
        -> PublicCalculatorServiceLive
          -> CalculationEngineLive
  -> success response equals SDK full-run response
  -> CalculatorInputDecodeError maps to CalculatorApiErrorEnvelope
```

## Current calculator package

The reusable calculator orchestration package lives under:

```txt
packages/calculators
```

Package name:

```txt
@whattax/calculators
```

It owns:

- reusable calculator catalog schemas and service methods that compose
  rule-owned calculator id and context schemas
- catalog entries that compose canonical fact descriptors, rule descriptors,
  report schemas, scenario layers and rule-pack layers
- metadata transformations for calculator, fact, rule and graph responses
- schema-guided expected error shaping with descriptor-backed help
- calculation execution through `CalculationEngine`
- canonical reusable calculator execution schemas named `CalculatorRun*`
- canonical reusable calculator failure union named `CalculatorServiceError`
- typed propagation of expected domain failures such as `CalculationError`

HTTP, SDK, CLI and in-process callers should consume this service instead of
implementing calculator business logic locally.

## HTTP API package topology

The implemented HTTP API package lives at `packages/api/http` and is named
`@whattax/api-http`. It owns Effect HTTP API definitions, calculation endpoint
schemas, thin server handlers that delegate to `@whattax/calculators`, OpenAPI
generation, HTTP status annotations and generated HTTP client helpers.

## API app scope

The reusable API app server lives under:

```txt
apps/api
```

It is a reusable server for open-source and integration use. Applications may
run their own API servers that import WhatTax packages or call this API, but
the app remains a thin transport over the calculation engine.

## Endpoint shape

Calculation endpoints are calculator, fact, rule and graph oriented rather
than jurisdiction-route oriented. Jurisdiction, tax year, rule-pack options and
capability filters are request context and metadata, not top-level route
families.

The public calculation API uses stable generic resources:

```txt
GET  /api/v1/jurisdictions
GET  /api/v1/tax-years
GET  /api/v1/calculators
GET  /api/v1/calculators/:calculatorId
GET  /api/v1/calculators/:calculatorId/schema
POST /api/v1/calculators/:calculatorId/calculate
GET  /api/v1/calculators/:calculatorId/graph
GET  /api/v1/facts
GET  /api/v1/rules
```

Calculator IDs may include jurisdiction segments, such as
`au.pay.take-home`, but route structure must remain portable to future
jurisdictions. Do not add `/api/v1/au/*` as the primary public route shape.

Inputs and outputs must decode through Effect Schema. Schema decode failures
should return structured issue details, missing/invalid field paths and
descriptor-backed help so clients can guide users toward the facts required by
the selected calculator. Outputs should include reports, traces, ledgers and
diagnostics where relevant.

The generic calculate route exposes request facts as a union of canonical
rule-owned calculator input schemas, not `Schema.Unknown`. OpenAPI should show
the supported fact shapes under `facts.anyOf`; current public shapes include
take-home/pay-withholdings input facts and annual-tax input facts. Because
Effect HTTP route schemas are not dependent on the `calculatorId` path
parameter, `@whattax/calculators` must decode `payload.facts` again with the
selected catalog entry's canonical `inputSchema` before execution. A payload
that is valid for a different calculator must fail as
`CalculatorInputDecodeError` with descriptor-backed help for the selected
calculator.

Public JSON examples must use canonical schema values, including tagged values
such as `GrossPay` and `Money` where the owning schema requires those tags.

Calculation/domain failures that are part of the engine contract should remain
typed failures and be encoded through the public error envelope. They should
not be converted into Effect defects.

Metadata and calculation routes may accept a `help` query parameter for richer
client guidance. Help output should be generated from canonical schemas, fact
descriptors, rule descriptors, graph diagnostics and source references instead
of hand-written route-specific DTOs.

## TypeScript SDK facade

The current private SDK package lives under:

```txt
packages/sdk/typescript
```

Current package name:

```txt
@whattax/sdk
```

Preferred public package name at release time:

```txt
whattax
```

If the unscoped package name is unavailable at first publish, continue with
`@whattax/sdk` and keep the same export contract.

It owns:

- direct in-process calculation facade
- plain TypeScript `WhatTax.create(...)` client factory and
  `WhatTax.{method}` generic helpers
- Effect-native `./effect` entrypoint
- jurisdiction-specific opt-in subpaths such as `./au`
- Layer-backed typed modules that preserve compile-time calculation, fact, rule and period capabilities
- typed declarations, provider Layers and bindings shared by plain and Effect entrypoints
- exported input and output schemas
- typed calculator request builders
- examples for Node and browser usage

The SDK must not import `@whattax/api-http`, server handlers or Node-only
modules from browser-safe entrypoints. It also must not expose Effect runtime
types from the plain TypeScript entrypoint. HTTP clients and OpenAPI transport
helpers stay in `@whattax/api-http`, which depends on the SDK rather than the
reverse.

## Export boundaries

The SDK package should publish a dist-only export map. Workspace-local source
conditions are useful during early scaffolding, but they must not appear in the
publish manifest unless source files are also intentionally packed and
supported.

Release packages express the two views separately: workspace `exports` may
retain `source`, while `publishConfig.exports` owns built `types` and `default`
targets and `files` limits the tarball. Because Bun resolves workspace and
catalogue dependency protocols during packing but does not apply
`publishConfig.exports`, the SDK-owned strict validator stages that declared
publication view and Bun-packs it again. Acceptance is based on the final
tarball manifest, clean installation and public-entrypoint imports.

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./effect": {
      "types": "./dist/effect.d.ts",
      "default": "./dist/effect.js"
    },
    "./au": {
      "types": "./dist/au.d.ts",
      "default": "./dist/au.js"
    },
    "./au/effect": {
      "types": "./dist/au-effect.d.ts",
      "default": "./dist/au-effect.js"
    },
    "./schemas": {
      "types": "./dist/schemas/index.d.ts",
      "default": "./dist/schemas/index.js"
    },
    "./testing": {
      "types": "./dist/testing/index.d.ts",
      "default": "./dist/testing/index.js"
    }
  }
}
```

`.` should expose the plain, jurisdiction-neutral `WhatTax` facade. `./effect`
should expose the Effect-native `WhatTax` facade used by HTTP handlers.
Jurisdiction subpaths such as `./au` and `./au/effect` should expose local
Layer-backed modules, calculation descriptors and thin convenience clients
without making the root bundle import those rules. `./schemas` must be
browser-safe and re-export calculator-owned `CalculatorRun*` schemas and
`CalculatorServiceError` without duplicating them. `./testing` may expose
test-only descriptors and helpers for consumers validating type behaviour.

## Fumadocs site

The public docs site lives under:

```txt
apps/docs
```

Reusable docs content and Fumadocs integration live under:

```txt
packages/docs-content
packages/docs-fumadocs
```

The docs app should document:

- rule package architecture
- supported Australian tax years
- calculator inputs and outputs
- API reference
- SDK usage
- contribution guide for official rule tables and golden tests
