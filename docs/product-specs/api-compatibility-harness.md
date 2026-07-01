---
status: implemented
last_reviewed: 2026-07-01
source_of_truth: docs
confidence: high
---

# API compatibility harness

## Overview

Stabilize the public HTTP API contract before adding broader API, SDK or app
surface area.

The API app and HTTP API package now sit in the intended topology:
`apps/api` owns the standalone Bun runtime, and `packages/api/http` owns
`@whattax/api-http`. This spec added a deterministic compatibility harness
that makes public route and OpenAPI drift visible during normal development.

This spec adds three pieces of proof:

- a package-owned OpenAPI snapshot generated from the same `WhatTaxApi`
  contract that serves `/api/docs/openapi.json`
- focused route fixtures for health, metadata, calculate success and
  schema-guided error responses
- a live API app smoke command that starts `apps/api`, calls public routes and
  shuts the process down cleanly

## Implementation status

Implemented on 2026-07-01. The HTTP API package now owns a normalized OpenAPI
snapshot, route fixture tests and compatibility update workflow. The API app
now owns `bun run --filter=api smoke:public-routes` for live process smoke
coverage.

## Problem

The current HTTP API tests prove the most important calculate path and one
typed input-error path through the in-process client. They do not pin the
public route inventory, generated OpenAPI document, metadata response
contracts, route-owned error envelope shape or live `apps/api` process serving
the same contract.

That leaves several compatibility gaps:

- OpenAPI annotations, route paths or status schemas can drift silently during
  handler and schema refactors.
- Metadata and error routes can change shape without an obvious fixture diff.
- A package test can pass while the standalone API app fails to serve
  `/api/health`, `/api/v1/calculators`, calculate or OpenAPI routes.
- Intentional API contract changes do not yet have a clear update workflow for
  snapshots, fixtures, docs and Changesets.

## Call graphs

```ts
Production: current HTTP API

apps/api Bun process
  -> WhatTaxServerLayer
    -> ApiRoutesLive
      -> WhatTaxApi
      -> HealthHandlerLive
      -> CalculatorApiHandlerLive
        -> @whattax/sdk/effect calculateRunRequest
          -> PublicCalculatorService.calculate
            -> CalculationEngine
      -> /api/docs/openapi.json returns OpenApi.fromApi(WhatTaxApi)
```

```ts
Tests: current

HTTP API tests
  -> WhatTaxApiInProcessClientLive
    -> CalculatorApiHandlerLive
      -> @whattax/sdk/effect calculateRunRequest
        -> PublicCalculatorServiceLive
          -> CalculationEngineLive
  -> selected calculate success assertion
  -> selected calculator input error assertion
```

```ts
Tests: target OpenAPI compatibility

OpenAPI compatibility test
  -> package-owned WhatTax OpenAPI spec builder
    -> OpenApi.fromApi(WhatTaxApi)
    -> deterministic OpenAPI normalizer
  -> committed OpenAPI snapshot
  -> route path, method, status envelope and schema-reference comparison

/api/docs/openapi.json
  -> same package-owned WhatTax OpenAPI spec builder
  -> HttpServerResponse.jsonUnsafe
```

```ts
Tests: target route fixtures

Route fixture tests
  -> WhatTaxApiInProcessClientLive or route web handler
    -> health route
    -> metadata routes
    -> calculate route
    -> expected calculator input error route
  -> canonical JSON fixtures or focused fixture assertions
  -> SDK full-run equivalence for calculate success
  -> SDK expected-error equivalence for calculator input errors
```

```ts
Local smoke: target API app

API app smoke command
  -> start apps/api with deterministic host and port
  -> GET /api/health
  -> GET /api/v1/calculators
  -> POST /api/v1/calculators/au.pay.take-home/calculate
  -> GET /api/docs/openapi.json
  -> stop apps/api through managed process cleanup
```

## Goals

- Add a deterministic OpenAPI snapshot for the implemented public HTTP API.
- Generate the snapshot from the same package-owned OpenAPI source used by
  `/api/docs/openapi.json`.
- Add compatibility tests that fail on public route, method, status envelope or
  schema-reference drift.
- Add route fixture coverage for:
  - `GET /api/health`
  - at least one public metadata route
  - one successful `POST /api/v1/calculators/:calculatorId/calculate`
  - one schema-guided calculator input error response
- Preserve the existing SDK equivalence check for calculate success and extend
  the compatibility evidence around expected error parity.
- Add a live API app smoke command for the standalone Bun process.
- Document the intentional contract-change workflow: update API contracts,
  refresh snapshots and fixtures, update docs, add a Changeset when
  package-facing behaviour changes, and rerun compatibility gates.

## Non-goals

- Do not redesign endpoint paths, route grouping, response envelopes or
  calculator behaviour.
- Do not add new public endpoints.
- Do not publish packages or remove `private: true`.
- Do not start generated docs inventory work.
- Do not move code out of `packages/api/http` or `apps/api`.
- Do not introduce a separate compatibility package.
- Do not replace package-owned Effect HTTP API contracts with handwritten
  OpenAPI JSON.

## Ownership and boundaries

`packages/api/http` owns HTTP API definitions, route groups, HTTP-only
schemas, OpenAPI generation, deterministic OpenAPI snapshots, route fixture
tests, typed clients and in-process client layers.

`apps/api` owns the standalone Bun process, process config, host/port defaults,
platform server startup, graceful shutdown and live app smoke command.

`@whattax/calculators` owns calculator catalog schemas, reusable run schemas,
metadata projections, graph responses and expected calculator service errors.

`@whattax/sdk` owns SDK calculation facades. The HTTP API package may use
`@whattax/sdk/effect` for calculate parity, but the SDK must not depend on
`@whattax/api-http`.

OpenAPI snapshots and route fixtures must consume owning schemas and API
contracts. They must not define local DTO mirrors, duplicate canonical IDs or
handwrite route response shapes.

## Proposed approach

1. Extract the current `OpenApi.fromApi(WhatTaxApi)` call into a package-owned
   OpenAPI module, such as `packages/api/http/src/openapi.ts`.
2. Make `/api/docs/openapi.json` import that same OpenAPI value or builder.
3. Add a deterministic OpenAPI normalizer for snapshot comparison. It should
   use structured JSON parsing and stable key ordering, not ad hoc string
   manipulation.
4. Commit the normalized OpenAPI snapshot under the API HTTP package, for
   example `packages/api/http/__snapshots__/openapi.json`.
5. Add a focused update workflow, either a package script such as
   `update-openapi-snapshot` or a documented environment flag such as
   `UPDATE_API_SNAPSHOTS=1`.
6. Add route fixture tests beside the package tests. Prefer canonical JSON
   fixtures for stable response contracts, with focused assertions where the
   full calculator trace would create noisy churn.
7. Keep the calculate fixture tied to the SDK full-run response so the HTTP
   route continues to prove SDK parity.
8. Add `apps/api` live smoke coverage through an app-owned command such as
   `bun run --filter=api smoke:public-routes`.
9. Implement the smoke command with Effect platform/runtime primitives where
   they fit, especially for command execution, timing, cleanup and expected
   errors. If a lower-level Bun API is necessary, document the reason in the
   implementation handoff.
10. Update `packages/api/http/README.md` and `apps/api/README.md` with the
    compatibility commands and intentional contract-change workflow.

## Tests and verification

Implementation must run focused package, app and repo gates:

- `bun run --filter=@whattax/api-http test`
- `bun run --filter=@whattax/api-http check-types`
- `bun run --filter=@whattax/api-http build`
- `bun run --filter=api check-types`
- `bun run --filter=api build`
- `bun run --filter=api smoke:public-routes`
- `bun run --filter=@whattax/sdk check-boundaries`
- `bun run docs:validate`
- `bun run test`
- `bun run build`
- `bun run verification`
- `bun run changeset status --verbose` when a Changeset exists, or explicit
  no-Changeset rationale when the slice only adds internal tests, scripts or
  docs with no package behaviour change

The implementation should also record:

- OpenAPI snapshot path and update command
- route fixture coverage matrix
- SDK parity evidence for calculate success and expected input errors
- live API app smoke output
- final call graph confirmation against the implementation

## Risks and tradeoffs

- Full OpenAPI snapshots can be noisy if generated object ordering is
  unstable. Normalize structured data before comparing snapshots.
- Full calculator response snapshots can be too large and brittle. Start with
  stable fixture coverage for public envelope fields, canonical tags, route
  paths, important money values, diagnostics and schema-guided issue paths.
- Smoke tests can become flaky if they reuse a fixed port or leave a child
  process running. The app smoke command must choose or accept a deterministic
  port, wait for health and always clean up.
- An OpenAPI test that generates from a duplicate path can give false
  confidence. The docs route and snapshot test must share the same
  package-owned OpenAPI source.
- Compatibility tests should not freeze bugs forever. Intentional contract
  changes are allowed when the snapshot, fixtures, docs and Changeset decision
  are updated together.

## Versioning and changelog impact

Drafting this spec is docs-only and does not require a Changeset.

Implementation may or may not require a Changeset:

- No Changeset is required for internal test-only fixtures, snapshot tests or
  app-internal smoke tooling that does not change package exports,
  installation or runtime behaviour.
- A patch Changeset is required for any package-facing API contract change,
  exported command meant for package consumers, public README promise that
  changes package usage, or intentional OpenAPI/route behaviour change.

Do not run `bun run version-repo` as part of this work unless the user
explicitly asks for release versioning.

## Acceptance criteria

- `@whattax/api-http` exposes or owns a single OpenAPI generation source used
  by both `/api/docs/openapi.json` and compatibility tests.
- A committed normalized OpenAPI snapshot exists under `packages/api/http`.
- Package tests fail on unapproved route, method, status envelope or schema
  reference drift.
- Route fixtures cover health, metadata, calculate success and
  schema-guided input error behaviour.
- Calculate success still compares HTTP output to the SDK full-run response.
- Expected calculator input error evidence remains aligned with SDK and
  calculator-owned errors.
- `apps/api` has a live smoke command that starts the process, calls public
  routes and cleans up.
- Package and app READMEs document compatibility commands and the intentional
  contract-change workflow.
- The task-list verification gates pass, including `bun run verification`.
- Changeset impact is either recorded with a Changeset or explicitly rejected
  with a no-Changeset rationale.

## References

- [API and SDK](../architecture/api-and-sdk.md)
- [Package ownership](../architecture/package-ownership.md)
- [Effect services](../architecture/effect-services.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [API HTTP package topology](./api-http-package-topology.md)
- [Public calculation API routes](./public-calculation-api-routes.md)
- [SDK-backed HTTP API thin wrapper](./sdk-backed-http-api-thin-wrapper.md)
