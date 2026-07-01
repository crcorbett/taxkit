---
status: implemented
last_reviewed: 2026-07-01
source_of_truth: docs
confidence: high
---

# API HTTP package topology

## Overview

Stabilize the implemented HTTP API package before more public API, SDK and app
work builds on the old flat package path.

At the start of this spec, the implemented package lived at
`packages/http-api` and was named `@whattax/http-api`. Existing architecture
docs already identified the long-term shape as `packages/api/http` with
package name `@whattax/api-http`. This spec moved that planned placeholder
into the implemented package without changing runtime behaviour, endpoint
paths, calculator semantics or the API app role.

The nearest reference implementation for this work is the API split used in
the local reference repos: runtime apps own deployment and process lifecycle,
while nested HTTP API packages own transport contracts, handlers, clients,
server adapters and explicit browser/server subpaths.

## Implementation status

Implemented on 2026-07-01. The HTTP API package now lives at
`packages/api/http` and is named `@whattax/api-http`; `apps/api` remains the
Bun runtime owner and `apps/web` remains an HTTP client.

## Problem

At spec start, the repo had two truths:

- original implementation: `packages/http-api` / `@whattax/http-api`
- planned architecture: `packages/api/http` / `@whattax/api-http`

That mismatch was still cheap to fix because `@whattax/http-api` is private and
the public API is not published. It will get more expensive after the docs,
SDK, app runtime and downstream consumers grow around the old package name.

This is foundation work. It should make the package map match the architecture
without using the relocation as an excuse to refactor handlers, add endpoints
or redesign API/client behaviour.

## Call graphs

```ts
Production: original before API-HTTP-001

apps/api Bun process
  -> @whattax/http-api/server
    -> WhatTaxServerLayer
      -> ApiRoutesLive
        -> WhatTaxApi
        -> HealthHandlerLive
        -> CalculatorApiHandlerLive
          -> @whattax/sdk/effect calculateRunRequest
          -> @whattax/calculators PublicCalculatorService

apps/web route runtime
  -> @whattax/http-api/client/live
    -> configured API base URL
    -> apps/api
```

```ts
Production: target

apps/api Bun process
  -> @whattax/api-http/server
    -> WhatTaxServerLayer
      -> ApiRoutesLive
        -> WhatTaxApi
        -> HealthHandlerLive
        -> CalculatorApiHandlerLive
          -> @whattax/sdk/effect calculateRunRequest
          -> @whattax/calculators PublicCalculatorService

apps/web route runtime
  -> @whattax/api-http/client/live
    -> configured API base URL
    -> apps/api
```

```ts
Tests: target

HTTP API tests
  -> @whattax/api-http/client/server WhatTaxApiInProcessClientLive
    -> @whattax/api-http/server WhatTaxServerLayer
      -> CalculatorApiHandlerLive
        -> @whattax/sdk/effect calculateRunRequest
        -> PublicCalculatorServiceLive
          -> CalculationEngineLive

Package boundary audits
  -> SDK source and package metadata
  -> no dependency on @whattax/api-http
  -> browser code imports only @whattax/api-http/client or browser-safe subpaths
```

## Goals

- Move the implemented HTTP API package to `packages/api/http`.
- Rename the package to `@whattax/api-http`.
- Preserve the current public HTTP route paths, generated OpenAPI shape,
  handler behaviour and in-process test path.
- Preserve explicit export subpaths for API definitions, clients, config,
  handlers and server-only route layers.
- Keep `apps/api` as the standalone Bun runtime owner.
- Keep `apps/web` as an HTTP client of `apps/api`, not an in-process API
  mount.
- Keep `@whattax/sdk` independent from the HTTP API package.
- Update package metadata, workspace globs, lockfile, Knip/Turbo wiring,
  imports, docs, package READMEs and public docs to the target name.
- Leave historical specs, completed execution plans and changelogs readable;
  when they mention `@whattax/http-api`, the historical context should be
  explicit.

## Non-goals

- Do not add, remove or rename HTTP endpoints.
- Do not change API response schemas, OpenAPI status annotations or calculator
  execution semantics.
- Do not move calculator orchestration, SDK facades or rule-pack logic.
- Do not remount the canonical API inside TanStack Start.
- Do not introduce compatibility aliases or pass-through packages for
  `@whattax/http-api` unless implementation discovers a concrete private
  consumer that cannot be updated in the same slice.
- Do not run `bun run version-repo`, publish packages or remove `private: true`
  as part of this topology stabilization.
- Do not start the generated docs inventory or broader package cleanup work in
  this spec.

## Ownership and boundaries

`apps/api` owns process config, Bun server startup, platform server creation,
root Effect lifecycle and graceful shutdown.

`packages/api/http` owns Effect HTTP API definitions, route groups, HTTP-only
schemas/envelopes, OpenAPI generation, thin handler adapters, reusable route
layers, typed HTTP clients, in-process client layers and server-only adapter
exports.

`@whattax/calculators` owns reusable calculator orchestration, metadata
projection, graph assembly, calculation dispatch and expected error shaping.

`@whattax/sdk` owns public SDK facades and remains independent of
`@whattax/api-http`. HTTP transport may import the SDK; the SDK must not import
HTTP transport.

Browser and app runtime code must consume browser-safe package exports. Server
exports such as `@whattax/api-http/server`, handler layers and in-process
client layers must stay out of browser bundles.

## Proposed approach

1. Audit the current code and docs references to `packages/http-api` and
   `@whattax/http-api`.
2. Move the package directory to `packages/api/http` and add the nested package
   workspace glob required for Bun/Turbo to discover it.
3. Rename package metadata, dependency declarations and source imports to
   `@whattax/api-http`.
4. Preserve the existing export map shape with the new package name:
   `@whattax/api-http`, `@whattax/api-http/api`,
   `@whattax/api-http/client`, `@whattax/api-http/client/live`,
   `@whattax/api-http/client/server`, `@whattax/api-http/config`,
   `@whattax/api-http/server`, `@whattax/api-http/handlers` and
   `@whattax/api-http/handlers/live`.
5. Update package-local docs, root docs, architecture docs, app docs, public
   MDX docs and validation config so current docs use the new package identity.
6. Add or update a Changeset for the package-facing rename and relocation.
7. Verify the final call graph against source imports, package metadata and
   runtime/client tests.

## Tests and verification

Implementation must run the focused package and app gates that prove both the
new package identity and the unchanged runtime behaviour:

- `bun run --filter=@whattax/api-http test`
- `bun run --filter=@whattax/api-http check-types`
- `bun run --filter=@whattax/api-http build`
- `bun run --filter=api check-types`
- `bun run --filter=api build`
- `bun run --filter=web check-types`
- `bun run --filter=@whattax/sdk check-boundaries`
- `bun run docs:validate`
- `bun run verification`
- `bun run changeset status --verbose`

If route behaviour changes unexpectedly during the move, broaden verification
to include API smoke checks against `GET /api/health`,
`GET /api/v1/calculators`, `POST /api/v1/calculators/:calculatorId/calculate`
and `GET /api/docs/openapi.json`.

## Risks and tradeoffs

- Bun workspace discovery needs an explicit nested glob such as
  `packages/api/*`; otherwise the package may disappear from filters and
  builds.
- A package rename changes dependency keys, Changeset package names, package
  changelog headers and generated lockfile entries.
- Search-and-replace can damage historical specs or changelog context. Current
  docs should use the target name; historical docs may retain the old name when
  the text clearly describes old work.
- Browser bundles can accidentally import server-only subpaths if import
  updates are broad. The implementation must audit browser/runtime imports
  after the rename.
- Compatibility aliases would reduce private migration risk but preserve the
  old public vocabulary. Because this is pre-publication work, update current
  consumers directly unless a concrete blocker appears.

## Versioning and changelog impact

This is package-facing work. Expected release-train impact:

- `@whattax/api-http`: patch Changeset describing the package rename from
  `@whattax/http-api` and move from `packages/http-api` to
  `packages/api/http`.

No `@whattax/http-api` Changeset is expected after the rename because that is
the old private package identity. If implementation tooling requires a
different Changeset shape, record the reason in the active execution plan.

Do not run `bun run version-repo` unless the user explicitly asks for release
versioning.

## Acceptance criteria

- `packages/api/http/package.json` exists and names the package
  `@whattax/api-http`.
- `packages/http-api` no longer contains the implemented package.
- Runtime source imports use `@whattax/api-http` and target call graphs still
  match the implementation.
- `apps/api` still owns process startup and serves the HTTP API package route
  layer.
- `apps/web` imports only browser-safe `@whattax/api-http` client exports.
- `@whattax/sdk` package metadata and source still have no dependency on
  `@whattax/api-http`.
- Current docs, READMEs, public MDX docs, root maps and architecture docs use
  the target package path/name.
- Historical docs that keep `@whattax/http-api` do so only as historical
  context.
- The task list verification gates pass and the Changeset decision is
  documented.

## References

- [API and SDK](../architecture/api-and-sdk.md)
- [Package ownership](../architecture/package-ownership.md)
- [Package boundaries](../architecture/package-boundaries.md)
- [Effect services](../architecture/effect-services.md)
- [Frontend](../architecture/frontend.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Extract API app](./extract-api-app.md)
- [SDK-backed HTTP API thin wrapper](./sdk-backed-http-api-thin-wrapper.md)
