---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: high
---

# API And SDK

WhatTax should publish a reusable API app server and TypeScript SDK around the
open-source calculation engine.

The API and SDK are part of this repository because they expose reusable tax
calculation capabilities through stable, documented boundaries.

## Current API Runtime

See [SDK facade export](../specs/sdk-facade.md) for the implementation spec for
the public `WhatTax.{method}` facade, the plain TypeScript entrypoint and the
`/effect` entrypoint.

`apps/api` is the current API runtime owner. It is a standalone Bun process
that owns host/port config, process startup through
`@effect/platform-bun/BunRuntime.runMain`, Bun request serving and graceful
shutdown through Effect interruption and scoped layer finalizers. It delegates
API contracts, handlers, schemas and generated docs to `packages/http-api`.

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
import server-only `@whattax/http-api` exports.

API process entrypoints should be Effect programs run with
`@effect/platform-bun/BunRuntime.runMain(...)`. The app owns process config,
platform server creation and root lifecycle. The HTTP API package owns
`HttpApi` definitions, `HttpApiBuilder.group(...)` handlers, generated docs
and reusable route layers. Apps should provide a platform `HttpServer` and
serve the package route layer. Packages must not call `Bun.serve`, read
process env or own process signal handling.

## Current API Package

The current API package lives under:

```txt
packages/http-api
```

Package name:

```txt
@whattax/http-api
```

It owns the current Effect HTTP API definitions, health endpoint schema,
server route layer, OpenAPI metadata, typed client helpers and reusable client
config schema.

`@whattax/http-api/config` exports the package-owned HTTP API client config
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

## Planned API Package

Longer term, the calculation API package may move toward:

```txt
packages/api/http
```

Package name:

```txt
@whattax/api-http
```

It owns:

- Effect HTTP API definitions
- calculation endpoint schemas
- server handlers
- OpenAPI generation
- handler layers that compose rule packs and calculators

## Planned API App Scope

The reusable API app server lives under:

```txt
apps/api
```

It is a reusable server for open-source and integration use. Applications may
run their own API servers that import WhatTax packages or call this API, but
the app remains a thin transport over the calculation engine.

## Endpoint Shape

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

Metadata and calculation routes may accept a `help` query parameter for richer
client guidance. Help output should be generated from canonical schemas, fact
descriptors, rule descriptors, graph diagnostics and source references instead
of hand-written route-specific DTOs.

## TypeScript SDK Facade

The primary SDK package should live under:

```txt
packages/sdk/typescript
```

Preferred public package name:

```txt
whattax
```

If the unscoped package name is unavailable at first publish, use `@whattax/sdk` with the same export contract.

It owns:

- direct in-process calculation facade
- plain TypeScript `WhatTax.create(...)` client factory and `WhatTax.{method}` generic helpers
- Effect-native `whattax/effect` entrypoint
- jurisdiction-specific opt-in subpaths such as `whattax/au`
- Layer-backed typed modules that preserve compile-time calculation, fact, rule and period capabilities
- typed declarations, provider Layers and bindings shared by plain and Effect entrypoints
- browser-safe API client helpers where needed
- server-side client helpers
- exported input and output schemas
- typed calculator request builders
- examples for Node and browser usage

The SDK must not import server handlers or Node-only modules from browser-safe entrypoints. It also must not expose Effect runtime types from the plain TypeScript entrypoint.

## Export Boundaries

Recommended SDK exports:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./au": "./src/au.ts",
    "./effect": "./src/effect.ts",
    "./au/effect": "./src/au-effect.ts",
    "./client": "./src/client/index.ts",
    "./schemas": "./src/schemas/index.ts",
    "./server": "./src/server/index.ts",
    "./testing": "./src/testing/index.ts"
  }
}
```

`.` should expose the plain, jurisdiction-neutral `WhatTax` facade. `./effect` should expose the Effect-native `WhatTax` facade used by HTTP handlers. Jurisdiction subpaths such as `./au` and `./au/effect` should expose local Layer-backed modules, calculation descriptors and thin convenience clients without making the root bundle import those rules. `./client` and `./schemas` must be browser-safe. `./server` may include Node/server-only helpers.

## Fumadocs Site

The public docs site should live under:

```txt
apps/docs
```

If documentation content or config needs to be shared, it can additionally live under:

```txt
packages/docs/fumadocs
```

It should document:

- rule package architecture
- supported Australian tax years
- calculator inputs and outputs
- API reference
- SDK usage
- contribution guide for official rule tables and golden tests
