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

`apps/api` is the current API runtime owner. It is a standalone Bun process
that owns host/port config, process startup, one process-lifetime Effect
`ManagedRuntime`, Bun request serving and graceful shutdown. It delegates API
contracts, handlers, schemas and generated docs to `packages/http-api`.

The current implemented API surface is health/docs only:

```txt
GET /api/health
GET /api/docs
GET /api/docs/openapi.json
```

`apps/web` consumes this API over HTTP. It must not mount the canonical API or
import server-only `@whattax/http-api` exports.

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

Future calculation endpoints should be calculation-goal oriented:

```txt
POST /api/calculate/take-home-pay
POST /api/calculate/payg-withholding
POST /api/calculate/annual-tax-estimate
GET  /api/rules/au/:year
GET  /api/graph/:calculator
GET  /api/docs/openapi.json
```

Inputs and outputs should decode through Effect Schema. Outputs should include reports, traces and diagnostics where relevant.

## TypeScript SDK

The SDK package should live under:

```txt
packages/sdk/typescript
```

Package name:

```txt
@whattax/sdk-typescript
```

It owns:

- browser-safe API client
- server-side client helpers
- exported input and output schemas
- typed calculator request builders
- examples for Node and browser usage

The SDK must not import server handlers or Node-only modules from browser-safe entrypoints.

## Export Boundaries

Recommended SDK exports:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client/index.ts",
    "./schemas": "./src/schemas/index.ts",
    "./server": "./src/server/index.ts"
  }
}
```

`./client` and `./schemas` must be browser-safe. `./server` may include Node/server-only helpers.

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
