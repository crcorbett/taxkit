---
status: implemented-incomplete-gate
last_reviewed: 2026-07-02
source_of_truth: docs
confidence: high
---

# Downstream consumer validation

## Overview

Downstream-consumer validation now exists as a diagnostic and API foundation
for future publication readiness, but the strict final SDK downstream release
gate is still incomplete.

The implemented commands verify package builds, SDK import boundaries, SDK
packed export targets, exact packed manifest blockers, API route fixtures,
OpenAPI snapshots and live `apps/api` public-route smoke coverage from a temp
consumer workspace. The strict SDK downstream command still exits nonzero
because packed runtime manifests contain 13 unresolved `workspace:*` or
`catalog:` protocol ranges. That is a release blocker, not a completed
downstream install proof.

This work does not publish packages, remove `private: true`, claim an npm name
or move package directories. It creates repeatable evidence that the current
SDK package metadata is not yet ready for clean external install, while the
API app can be consumed through public HTTP routes from outside the workspace.
Final downstream consumer validation must not be claimed complete until
`bun run --filter=@whattax/sdk validate:downstream` exits zero.

## Problem

In-repo validation can miss assumptions that only appear in a consumer
workspace:

- workspace-only dependency protocols in packed manifests
- export paths that resolve in the monorepo but not after install
- SDK examples that depend on source-condition or tsconfig aliases
- browser-safe entrypoints that accidentally import server-only modules
- HTTP client examples that rely on app internals instead of public routes
- docs quickstarts that typecheck in isolation but fail in a real project

The SDK packed-artifact check proves that exported files are present and
importable from a copied package directory. The strict downstream validator now
proves the next blocker: clean package-manager install cannot begin while
packed manifests retain unresolved runtime dependency protocols. API smoke now
proves end-to-end HTTP consumption from a generated temp workspace, but SDK
typecheck, runtime and browser-bundle execution remain skipped by the strict
manifest blockers.

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
Tests: implemented downstream SDK validation

bun run --filter=@whattax/sdk validate:downstream
  -> build required WhatTax packages
  -> pack SDK and required package dependency closure
  -> create a temp workspace outside the repo
  -> write TypeScript typecheck, runtime and browser bundle fixtures
  -> extract exact packed package.json manifests
  -> fail with release-blocker diagnostics while packed runtime manifests
     contain workspace:* or catalog: ranges
  -> skip install, typecheck, runtime and browser checks while blockers remain
  -> write evidence and clean up
  -> after blockers are resolved, install packed artifacts and run typecheck,
     runtime SDK and browser-safe bundle checks

bun run --filter=@whattax/sdk validate:downstream:audit
  -> run the same graph
  -> allow the current release-blocker result for diagnostic evidence
  -> exit zero only because diagnostic mode was requested
```

```ts
Tests: implemented downstream HTTP/API validation

bun run --filter=api smoke:public-routes
  -> start apps/api with deterministic local config
  -> repo-side smoke validates public routes with API-owned schemas
  -> create a temp workspace outside the repo
  -> dependency-free external consumer fetches health, metadata, calculate
     and OpenAPI routes
  -> external consumer checks minimal public JSON evidence
  -> stop apps/api cleanly and record smoke evidence
```

## Implemented outcomes and remaining gate

Implemented:

- `@whattax/sdk` owns a strict downstream command that creates a temp workspace
  outside the repo, builds and packs the runtime package closure, writes
  downstream fixtures, audits exact packed manifests and cleans up.
- `@whattax/sdk` owns `validate:downstream:audit`, a diagnostic command that
  runs the same graph and exits zero while preserving the current blocker
  evidence.
- `apps/api` owns live public-route smoke that starts the standalone API
  process, creates an external temp workspace and proves dependency-free HTTP
  consumption of health, metadata, calculate and OpenAPI routes.
- `@whattax/api-http` tests still own route fixtures, OpenAPI snapshots,
  schema-backed response validation and SDK/API parity assertions.
- Evidence stays neutral and does not name private downstream products.

Still blocked:

- `bun run --filter=@whattax/sdk validate:downstream` exits nonzero with 13
  packed runtime manifest blockers.
- Clean downstream SDK package-manager install has not run.
- Downstream SDK typecheck, plain runtime, Effect runtime and browser-safe
  bundle checks are written but currently skipped by the strict manifest
  blockers.
- Live package-name availability remains a future release-prep check.

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

## Implemented approach

### External workspace harness

The focused SDK-owned commands are:

```bash
bun run --filter=@whattax/sdk validate:downstream
bun run --filter=@whattax/sdk validate:downstream:audit
```

The command creates a temp directory outside the current repo root and outside
workspace package paths. It writes a consumer package with `package.json`,
`tsconfig.json`, valid SDK examples, type-level misuse examples and a browser
bundle entry. The runtime is an Effect/Bun script under
`packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts`.

### Packed dependency strategy

The implemented validator audits exact packed manifests before attempting
external install. If a runtime dependency range remains `workspace:*` or
`catalog:`, strict validation fails with release-blocker diagnostics that name
the package, dependency section, dependency name and unresolved protocol.

This is intentionally stricter than the current packed-artifact smoke. A copied
`node_modules/@whattax/sdk` directory is useful, but it is not enough proof for
publication readiness.

### SDK examples

The downstream workspace currently writes fixtures for:

- root SDK plain calculation import from `@whattax/sdk`
- AU convenience import from `@whattax/sdk/au`
- Effect SDK calculation import from `@whattax/sdk/effect`
- schema import from `@whattax/sdk/schemas`
- testing import from `@whattax/sdk/testing` when useful for type tests
- at least one `@ts-expect-error` misuse that proves unsupported facts or
  calculations fail during downstream typecheck

These fixtures do not run while strict packed manifest blockers remain. Their
presence records the intended clean-install proof without hiding the current
release blocker.

### Browser-safe build proof

The SDK validator writes a downstream browser-safe bundle check for root, AU
and schemas entrypoints. It is skipped while strict manifest diagnostics stop
before install. No final browser bundle proof should be claimed until strict
validation exits zero and that step runs.

### HTTP/API proof

`apps/api` now owns this proof through:

```bash
bun run --filter=api smoke:public-routes
```

The smoke starts `apps/api` with deterministic local config, waits for
`/api/health`, validates public routes repo-side with API-owned schemas, then
runs a dependency-free external consumer from a temp workspace against the same
public HTTP routes. It does not install or import `@whattax/api-http` from the
temp workspace.

### Evidence and cleanup

The commands print compact evidence for:

- temp workspace path
- package artifacts used
- install strategy and unresolved workspace-protocol findings
- typecheck command and result
- runtime SDK command and result
- browser build command and result
- API smoke command and routes called
- cleanup result

The default behaviour cleans up temp workspaces on success and expected
release-blocker failure. Retained debug workspaces must be owned by an explicit
debug flag or future failure policy.

## Tests and verification

Use this release-gate order before future publication work:

```bash
bun run --filter=@whattax/sdk check-packed-artifact
bun run --filter=@whattax/sdk validate:downstream # strict final gate only after blockers are resolved
bun run --filter=@whattax/sdk validate:downstream:audit # diagnostic evidence while blockers remain
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
bun run changeset status --verbose
```

While the 13 packed runtime manifest blockers remain, record
`validate:downstream` as the expected nonzero strict release-gate failure and
use `validate:downstream:audit` as passing diagnostic evidence only.
`check-packed-artifact`, SDK package gates, `@whattax/api-http` tests and
`apps/api` smoke remain supporting evidence. They do not replace the strict
SDK downstream install gate.

Use `bun run changeset` for package-facing command, export, README or runtime
changes. Spec-only and execution-plan evidence updates do not need a Changeset.

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

This DOWNSTREAM-004 finalisation is docs and evidence work. It does not change
package exports, package manifests or package runtime behaviour. The existing
SDK patch Changeset from the command implementation remains sufficient for the
package-facing SDK validation commands and SDK README semantics.

Future package-facing slices that resolve packed manifest blockers, change SDK
commands, change export metadata or change documented package behaviour should
add or update a Changeset for the owning package. Add one for
`@whattax/api-http` only if HTTP client or package behaviour changes.

App-internal `apps/api` smoke wiring and public docs-only notes may use an
explicit no-Changeset rationale when no package installation, export or runtime
package behaviour changes.

Do not run `bun run version-repo`, publish or remove `private: true` unless a
later release-prep request explicitly asks for that action.

## Current release-gate state

Complete for this diagnostic/API foundation:

- The SDK downstream validator creates a temp workspace outside the monorepo.
- The SDK validator records exact packed manifest blockers before external
  install.
- The diagnostic SDK audit command exits zero while preserving strict blocker
  evidence.
- The API smoke starts a real local `apps/api` process and calls public health,
  metadata, calculate and OpenAPI routes from an external temp workspace.
- Validation output records artifacts, route coverage, cleanup and residual
  release blockers.
- Public WhatTax docs and evidence do not name private downstream products.
- The existing SDK Changeset covers the package-facing SDK command slice.

Incomplete strict release gate:

- `bun run --filter=@whattax/sdk validate:downstream` still exits nonzero with
  13 packed runtime manifest blockers.
- Clean downstream SDK install, downstream typecheck, plain SDK runtime, Effect
  SDK runtime and browser-safe bundle execution are not complete until the
  strict command exits zero.
- Package-name availability must be rechecked live during a later release-prep
  slice.

## References

- [TypeScript SDK and publishing](./typescript-sdk-and-publishing.md)
- [SDK public naming and export contract](./sdk-public-naming-and-export-contract.md)
- [API compatibility harness](./api-compatibility-harness.md)
- [API and SDK architecture](../architecture/api-and-sdk.md)
- [Package ownership](../architecture/package-ownership.md)
- [Effect services](../architecture/effect-services.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Writing spec task lists](./writing-task-lists.md)
