---
status: draft
last_reviewed: 2026-07-01
source_of_truth: docs
confidence: high
---

# Downstream consumer validation

## Overview

Build a deterministic downstream-consumer validation gate before any public npm
publication.

The current repo already verifies package builds, SDK import boundaries, SDK
packed export targets, API route fixtures, OpenAPI snapshots and live
`apps/api` public-route smoke coverage. The remaining release-readiness gap is
a disposable workspace outside the monorepo that consumes WhatTax through
package entrypoints and HTTP boundaries the way an external application would.

This work does not publish packages, remove `private: true`, claim an npm name
or move package directories. It creates repeatable evidence that the current
SDK, API HTTP contracts and docs examples are usable outside workspace-local
source resolution before a later publication decision.

## Problem

In-repo validation can miss assumptions that only appear in a consumer
workspace:

- workspace-only dependency protocols in packed manifests
- export paths that resolve in the monorepo but not after install
- SDK examples that depend on source-condition or tsconfig aliases
- browser-safe entrypoints that accidentally import server-only modules
- HTTP client examples that rely on app internals instead of public routes
- docs quickstarts that typecheck in isolation but fail in a real project

The existing SDK packed-artifact check proves that exported files are present
and importable from a copied package directory. It does not yet prove package
manager install, dependency resolution, browser build compatibility or
end-to-end HTTP consumption from a clean external project.

## Call graphs

```ts
Tests: current SDK packed-artifact check

bun run --filter=@whattax/sdk check-packed-artifact
  -> npm pack --dry-run --json packages/sdk/typescript
  -> compare package exports with dry-run packed files
  -> copy packed files into packages/sdk/typescript/.pack-smoke/node_modules
  -> bun smoke.mjs imports SDK entrypoints from the copied package
```

```ts
Tests: current API compatibility checks

bun run --filter=@whattax/api-http test
  -> OpenAPI snapshot from WhatTaxApi
  -> in-process route fixtures
  -> SDK parity assertions for calculate success and input errors

bun run --filter=api smoke:public-routes
  -> start apps/api as a local Bun process
  -> GET /api/health
  -> GET /api/v1/calculators
  -> POST /api/v1/calculators/au.pay.take-home/calculate
  -> GET /api/docs/openapi.json
  -> stop apps/api cleanly
```

```ts
Tests: target downstream SDK validation

downstream validation command
  -> build required WhatTax packages
  -> pack SDK and required package dependency closure
  -> create a temp workspace outside the repo
  -> install packed artifacts or fail with release-blocker diagnostics
  -> run TypeScript typecheck over valid imports and @ts-expect-error misuse
  -> run a plain SDK calculation through public entrypoints
  -> run an Effect SDK calculation through public entrypoints
  -> run a browser-safe bundling check for root, AU and schemas entrypoints
  -> write validation evidence and clean up
```

```ts
Tests: target downstream HTTP/API validation

downstream validation command
  -> start apps/api with deterministic local config
  -> external consumer fetches public health, metadata and calculate routes
  -> optional @whattax/api-http client/live consumer uses public client exports
  -> compare response shape with canonical SDK/API expectations
  -> stop apps/api cleanly and record smoke evidence
```

## Goals

- Add a repeatable downstream consumer validation command that creates a fresh
  temp workspace outside the repo.
- Validate SDK package consumption through public package entrypoints rather
  than workspace source imports.
- Validate package-manager install or produce explicit release-blocker
  diagnostics for unresolved `workspace:*` dependencies in packed manifests.
- Prove root SDK, Effect SDK, AU, AU Effect, schemas and testing entrypoints
  resolve from the downstream workspace.
- Prove downstream typechecking catches at least one intentional misuse with
  `@ts-expect-error`.
- Prove at least one successful runtime calculation through the plain SDK and
  one through the Effect SDK.
- Prove browser-safe SDK entrypoints can be bundled from the downstream
  workspace without server-only imports.
- Prove HTTP consumption against a real local `apps/api` process using public
  routes, not app internals.
- Keep validation evidence neutral and public. Do not name private downstream
  products or repos in committed WhatTax docs.

## Non-goals

- Do not publish to npm.
- Do not remove `private: true`.
- Do not run `bun run version-repo` as part of implementation unless a later
  release-prep request explicitly asks for versioning.
- Do not move `packages/api/http`, `packages/sdk/typescript` or app packages.
- Do not introduce `packages/scripts` runtime ownership while that package is a
  planned placeholder without a manifest and source exports.
- Do not build generated docs inventory or a broader docs lifecycle system in
  this slice.
- Do not make the SDK depend on `@whattax/api-http`.
- Do not require live external network calls for deterministic validation.

## Ownership and boundaries

`packages/sdk/typescript` owns the downstream SDK validation harness because it
already owns SDK examples, import-boundary checks and packed-artifact checks.
The harness may orchestrate package builds and temp workspace setup, but it
must not become a generic repo automation package while `packages/scripts` is
only planned.

`apps/api` owns process startup, host/port config and live public-route smoke
coverage. Downstream HTTP validation may start `apps/api`, but reusable route
contracts and typed HTTP client exports remain owned by `@whattax/api-http`.

`@whattax/api-http` owns HTTP API contracts, OpenAPI generation, route
fixtures, HTTP status envelopes and reusable client exports. It may be packed
for downstream validation, but the SDK must not import it.

`@whattax/calculators` owns calculator run schemas, calculator service errors,
catalog metadata and runtime execution through `PublicCalculatorService`.
Downstream tests should import calculator contracts only through published SDK
or API package entrypoints unless a task explicitly validates a lower-level
package.

Docs remain source-of-truth for public examples and release gate explanations.
Package READMEs may describe local validation commands, but private downstream
product names must stay out of public WhatTax docs.

## Proposed approach

### External workspace harness

Add a focused SDK-owned command, for example:

```bash
bun run --filter=@whattax/sdk validate:downstream
```

The command should create a temp directory outside the current repo root and
outside any workspace package path. It should write a minimal consumer package
with `package.json`, `tsconfig.json`, valid SDK examples, type-level misuse
examples and a browser bundle entry.

The implementation should use Effect and platform primitives where they fit:
`Effect.gen`, `Command`, `Bun`, `Config`, `Schema`, `Data`, `Array`, `Option`,
`Match` and tagged expected errors. One-off error handling should stay inline
at the callsite.

### Packed dependency strategy

The first implementation must audit packed manifests for unresolved
`workspace:*` dependencies. If a clean install cannot work because package
manifests still contain workspace protocols, the validation command should fail
with explicit release-blocker diagnostics or install a packed dependency
closure through local `file:` references while recording the manifest blocker.

This is intentionally stricter than the current packed-artifact smoke. A copied
`node_modules/@whattax/sdk` directory is useful, but it is not enough proof for
publication readiness.

### SDK examples

The downstream workspace should include:

- root SDK plain calculation import from `@whattax/sdk`
- AU convenience import from `@whattax/sdk/au`
- Effect SDK calculation import from `@whattax/sdk/effect`
- schema import from `@whattax/sdk/schemas`
- testing import from `@whattax/sdk/testing` when useful for type tests
- at least one `@ts-expect-error` misuse that proves unsupported facts or
  calculations fail during downstream typecheck

Examples must use canonical constructors, schemas and calculator descriptors
from owning package exports. They must not mirror DTOs locally.

### Browser-safe build proof

Add a small downstream browser build check for browser-safe SDK entrypoints.
The check may use a minimal bundler already in the repo dependency graph or a
TypeScript/bundler command chosen during implementation. The point is to prove
the root, AU and schemas entrypoints do not pull server-only code when consumed
by browser code.

### HTTP/API proof

Extend the downstream command or add a focused companion command that starts
`apps/api` with deterministic local config, waits for `/api/health`, then calls
public metadata and calculate routes from the external consumer workspace.

If the task validates `@whattax/api-http` client exports from the downstream
workspace, it must use client/browser-safe exports only and keep server route
layers out of browser/runtime examples.

### Evidence and cleanup

The command should print and, when useful, write a compact evidence summary:

- temp workspace path
- package artifacts used
- install strategy and unresolved workspace-protocol findings
- typecheck command and result
- runtime SDK command and result
- browser build command and result
- API smoke command and routes called
- cleanup result

The default command should clean up temp workspaces on success. Failed runs may
retain the workspace only when the command prints the path and an explicit
debug flag or failure policy owns that behaviour.

## Tests and verification

Implementation should add the narrowest useful command first, then broaden:

```bash
bun run --filter=@whattax/sdk check-packed-artifact
bun run --filter=@whattax/sdk validate:downstream
bun run --filter=@whattax/sdk check-boundaries
bun run --filter=@whattax/sdk test-types
bun run --filter=@whattax/sdk test
bun run --filter=@whattax/sdk build
bun run --filter=@whattax/api-http test
bun run --filter=api smoke:public-routes
bun run docs:validate
bun run test
bun run build
bun run verification
```

Use `bun run changeset` for package-facing command, export, README or runtime
changes. Spec-only edits do not need a Changeset.

## Risks and tradeoffs

- A true external install may fail while packages still use `workspace:*`
  dependency ranges. That is useful release-blocker evidence, not a reason to
  weaken the validation.
- Packing a dependency closure can make the harness more complex. Keep the
  first version focused on the SDK and the minimum packages required to prove a
  real consumer path.
- Browser bundling proof should stay minimal. It should catch server-only
  import leaks without turning into a full app scaffold.
- HTTP proof should use the existing `apps/api` runtime. Do not move runtime
  lifecycle ownership into packages to make the harness easier.
- Live package-name availability is time-sensitive and belongs only in a later
  publication slice.

## Versioning and changelog impact

This spec is docs-only and requires no Changeset.

Implementation is likely package-facing if it adds SDK package scripts, changes
packed artifact behaviour, updates package READMEs, changes export metadata or
adds public validation commands. Those slices should add a patch Changeset for
`@whattax/sdk`, and for `@whattax/api-http` only if HTTP client/package
behaviour changes.

App-internal `apps/api` smoke wiring and public docs-only notes may use an
explicit no-Changeset rationale when no package installation, export or runtime
package behaviour changes.

Do not run `bun run version-repo`, publish or remove `private: true` unless a
later release-prep request explicitly asks for that action.

## Acceptance criteria

- A downstream validation command creates a temp workspace outside the monorepo.
- The command validates SDK entrypoints through public package imports, not
  workspace source aliases.
- The command either installs packed artifacts successfully or reports
  unresolved `workspace:*` dependency protocols as explicit release blockers.
- Downstream typecheck passes valid examples and enforces at least one
  intentional misuse with `@ts-expect-error`.
- Downstream runtime examples prove plain SDK and Effect SDK calculations.
- Browser-safe SDK entrypoints pass a downstream browser build or equivalent
  bundling check.
- Downstream HTTP validation calls a real local `apps/api` process through
  public health, metadata, calculate and OpenAPI routes.
- Validation output records artifacts, commands, route coverage, cleanup and
  residual release blockers.
- Public WhatTax docs and evidence do not name private downstream products.
- Package-facing implementation slices include Changesets or explicit
  no-Changeset rationale.
- `bun run verification` passes before final acceptance.

## References

- [TypeScript SDK and publishing](./typescript-sdk-and-publishing.md)
- [SDK public naming and export contract](./sdk-public-naming-and-export-contract.md)
- [API compatibility harness](./api-compatibility-harness.md)
- [API and SDK architecture](../architecture/api-and-sdk.md)
- [Package ownership](../architecture/package-ownership.md)
- [Effect services](../architecture/effect-services.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Writing spec task lists](./writing-task-lists.md)
