---
status: active
last_reviewed: 2026-07-02
source_of_truth: execution-plan
confidence: medium
---

# Downstream consumer validation

Spec:
[Downstream consumer validation](../../product-specs/downstream-consumer-validation.md)

Task list:
[`downstream-consumer-validation.tasks.json`](../../product-specs/downstream-consumer-validation.tasks.json)

Current task:
`DOWNSTREAM-002` - add SDK external workspace validation.

Goal:
Confirm the current packed-artifact, package manifest and API smoke behaviour
before adding a consumer workspace harness. This task is audit and planning
only. It does not publish packages, remove `private: true`, run package-name
availability checks, name private downstream products or move runtime ownership
to `packages/scripts`.

## Status

| Area | Status | Notes |
| --- | --- | --- |
| Spec and task read | complete | Reviewed the downstream validation spec, `DOWNSTREAM-001`, and the implementation flow. |
| Architecture read | complete | Reviewed API/SDK, package ownership, package boundaries, Effect services and testing/quality docs. |
| Current SDK validation audit | complete | Current checks cover dist-only SDK export targets and copied-package import smoke, but not package-manager install, transitive dependency resolution or browser bundling. |
| Current API validation audit | complete | Current checks cover OpenAPI snapshot, in-process route fixtures, SDK parity and a live `apps/api` public-route smoke. |
| Manifest audit | complete | Runtime package manifests still contain unresolved `workspace:*`; packed manifests also retain `catalog:` ranges for external packages. |
| Harness design | complete | First implementation should fail fast with explicit manifest blocker diagnostics before attempting clean external install. |
| Verification | complete | Required SDK packed-artifact, API smoke, docs validation and repo verification commands passed. |
| Changeset decision | complete | No Changeset because this task only adds docs/exec-plan evidence and the active-plan index. |

## Task status

| Task | Status | Notes |
| --- | --- | --- |
| DOWNSTREAM-001 | completed | Current validation, manifest blockers and strict downstream install strategy are recorded. |
| DOWNSTREAM-002 | pending | Add the SDK-owned external workspace validation command. |
| DOWNSTREAM-003 | pending | Extend downstream proof to HTTP/API validation against `apps/api`. |
| DOWNSTREAM-004 | pending | Finalize release-gate docs and completed execution evidence. |

## Current validation surfaces

### SDK package

`@whattax/sdk` currently owns package-consumer validation under
`packages/sdk/typescript`.

Current package scripts:

- `build`: TypeScript build into `dist`.
- `check-boundaries`: source and manifest import-boundary audit.
- `check-packed-artifact`: packed export target and copied-package import
  smoke.
- `check-types`, `test` and `test-types`: package type, runtime and type-level
  safety checks.

Current packed-artifact call graph:

```ts
bun run --filter=@whattax/sdk check-packed-artifact
  -> npm pack --dry-run --json .
  -> compare package exports with dry-run packed files
  -> reject source export conditions and missing types/default targets
  -> reject source and test files in the packed file list
  -> copy packed files into packages/sdk/typescript/.pack-smoke/node_modules
  -> bun smoke.mjs imports @whattax/sdk, /effect, /au, /au/effect, /schemas and /testing
  -> remove .pack-smoke
```

That graph still matches the spec's current SDK packed-artifact diagram. The
important limit is that it copies package files into a fake `node_modules`
layout, so it does not prove external package-manager install, transitive
dependency resolution, `workspace:*` or `catalog:` protocol handling, or
browser bundling.

Current SDK tests prove:

- the plain `WhatTax` facade runs current AU calculations and returns SDK-owned
  `WhatTaxSuccess` and `WhatTaxFailure` result values for safe calls
- the Effect facade matches `PublicCalculatorService` for successful runs and
  preserves calculator-owned guided input errors
- AU subpath helpers stay thin over generic descriptors
- type tests reject wrong module/calculation pairings and wrong fact shapes

These tests are still in-repo tests over workspace source and built package
surfaces. They are not downstream install tests.

### HTTP API package

`@whattax/api-http` currently owns HTTP API contracts, generated OpenAPI,
route fixtures, typed clients, server route layers and HTTP status envelopes.

Current package tests:

```ts
bun run --filter=@whattax/api-http test
  -> OpenAPI snapshot from WhatTaxApi
  -> in-process health, metadata, calculate and input-error fixtures
  -> calculate success equals @whattax/sdk/effect calculateRunRequest
  -> CalculatorInputDecodeError maps to CalculatorApiErrorEnvelope
```

That graph still matches the spec's current API compatibility diagram.

`@whattax/api-http` has public client export paths, but its package export map
still includes workspace-local `source` conditions. The downstream SDK harness
should not import API server handlers or route layers. If a later slice packs
and installs `@whattax/api-http` for public client validation, it should audit
the API package's packed manifest and export conditions separately instead of
making the SDK package depend on HTTP transport code.

### API app

`apps/api` owns the standalone Bun process and live route smoke.

Current app smoke call graph:

```ts
bun run --filter=api smoke:public-routes
  -> start apps/api with API_HOST=127.0.0.1 and API_PORT=4173
  -> wait for GET /api/health
  -> GET /api/v1/calculators and require au.pay.take-home
  -> POST /api/v1/calculators/au.pay.take-home/calculate with canonical facts
  -> GET /api/docs/openapi.json
  -> stop apps/api through Effect scoped child-process cleanup
```

That graph still matches the spec's current API smoke diagram. It proves a live
local app process, but the consumer code still runs inside the repo script
with workspace dependencies.

## Ownership audit

No schemas, types, ids, services, layers or tagged errors were changed in this
task. The plan relies on these existing owners:

| Contract | Owner | Notes |
| --- | --- | --- |
| `CalculatorRun*` schemas and `CalculatorServiceError` | `@whattax/calculators` | SDK schema exports and API route schemas must reuse these contracts. |
| `PublicCalculatorService`, `PublicCalculatorServiceLive` | `@whattax/calculators` | SDK and API tests consume the service instead of duplicating calculation dispatch. |
| `CalculationEngineLive`, `aud`, `Money` and core tagged primitives | `@whattax/core` | Rule packages and smoke fixtures use core primitives. |
| `GrossPay`, `AuPayCalculatorId`, AU pay jurisdiction/tax year ids, pay descriptors and pay report schemas | `@whattax/rules-au-pay` | Current downstream examples should use these through SDK exports where possible, not local DTO mirrors. |
| Annual income tax calculator ids, input schema and report schema | `@whattax/rules-au-income-tax` | AU SDK descriptors compose these rule-owned contracts. |
| `WhatTax`, SDK calculation/module types, `calculateRunRequest`, `WhatTaxCalculationError`, `WhatTaxSuccess`, `WhatTaxFailure` | `@whattax/sdk` | The downstream SDK harness belongs here. |
| `WhatTaxApi`, health/calculator HTTP schemas, `CalculatorApiErrorEnvelope`, API client exports and config schema | `@whattax/api-http` | HTTP client validation should use browser/client-safe exports only. |
| API host/port config, Bun process lifecycle and public-route smoke | `apps/api` | The harness may start the app, but runtime lifecycle stays app-owned. |
| Generic repo automation package | `packages/scripts` | Planned placeholder only. It must not own this runtime harness yet. |

## Manifest audit

The external install blocker is current package metadata, not missing source
files. The SDK pack smoke already verifies SDK packed files exist, but a clean
consumer install will still see unresolved protocols in package manifests.

Runtime `workspace:*` dependencies in the downstream SDK closure:

| Package | Runtime unresolved workspace dependencies |
| --- | --- |
| `@whattax/sdk` | `@whattax/calculators`, `@whattax/rules-au-income-tax`, `@whattax/rules-au-pay` |
| `@whattax/calculators` | `@whattax/core`, `@whattax/rules-au-income-tax`, `@whattax/rules-au-pay` |
| `@whattax/rules-au-income-tax` | `@whattax/core` |
| `@whattax/rules-au-pay` | `@whattax/core` |

Runtime `workspace:*` dependencies for optional downstream HTTP client/app
coverage:

| Package | Runtime unresolved workspace dependencies |
| --- | --- |
| `@whattax/api-http` | `@whattax/calculators`, `@whattax/core`, `@whattax/sdk` |
| `api` app | `@whattax/api-http` |

Dev-only `workspace:*` dependencies seen during the audit:

| Package | Dev-only unresolved workspace dependencies |
| --- | --- |
| `@whattax/sdk` | `@whattax/core`, `@whattax/testing` |
| `@whattax/api-http` | `@whattax/rules-au-pay`, `@whattax/testing` |
| `@whattax/calculators` | `@whattax/testing` |
| `@whattax/rules-au-income-tax` | `@whattax/testing` |
| `@whattax/rules-au-pay` | `@whattax/testing` |
| `api` app | `@whattax/core`, `@whattax/rules-au-pay`, `@whattax/tsconfig` |

Additional external install blocker:

- The same closure uses `catalog:` ranges for external packages such as
  `effect`, `typescript`, `vitest`, `@effect/platform-bun` and `@effect/vitest`.
  A downstream temp workspace will not inherit the root workspace catalog, so
  the harness must diagnose `catalog:` ranges along with `workspace:*` ranges
  before claiming clean install readiness.

Minimum packed runtime dependency closure for SDK validation:

- `@whattax/sdk`
- `@whattax/calculators`
- `@whattax/core`
- `@whattax/rules-au-income-tax`
- `@whattax/rules-au-pay`

Optional packed dependency for downstream HTTP client validation:

- `@whattax/api-http`

`apps/api` should be started from the repo for live HTTP smoke. It is an app,
not a package intended for downstream install.

## Chosen downstream install strategy

The first implementation should use strict manifest-diagnostic mode as the
default:

1. Build the required package closure.
2. Run dry-run packing for the SDK and required package closure.
3. Read the exact packed manifests.
4. If any runtime dependency range remains `workspace:*` or `catalog:`, fail
   before external install with release-blocker diagnostics that name the
   package, dependency section, dependency name and unresolved protocol.
5. Write compact evidence explaining that copied-package smoke still passes
   but clean external install is blocked by manifest protocols.

This is intentionally stricter than a patched local install. A local closure
mode can be added later if a subsequent task explicitly needs functional
typecheck, runtime or browser-bundle evidence before package metadata is made
publication-ready, but that mode must not hide the release blocker. It should
be clearly labelled as a compatibility mode and should still report the
original manifest findings.

## Target harness shape

The SDK-owned command should eventually be:

```sh
bun run --filter=@whattax/sdk validate:downstream
```

The planned command remains SDK-owned because `@whattax/sdk` owns downstream
SDK examples, package import boundaries and packed-artifact checks. It may
orchestrate package builds, package packing and a temp workspace, but it must
not become a generic repo automation runtime while `packages/scripts` is only a
planned placeholder.

Planned target call graph:

```ts
bun run --filter=@whattax/sdk validate:downstream
  -> build required WhatTax packages
  -> pack @whattax/sdk and the minimum runtime dependency closure
  -> audit packed manifests for workspace:* and catalog: blockers
  -> fail with release-blocker diagnostics while blockers remain
  -> otherwise create a temp workspace outside the repo
  -> install packed artifacts through package-manager install
  -> run downstream typecheck over valid imports and @ts-expect-error misuse
  -> run plain SDK calculation through public entrypoints
  -> run Effect SDK calculation through public entrypoints
  -> run browser-safe bundle check for root, AU and schemas entrypoints
  -> write evidence and clean up
```

Planned HTTP proof should remain app/API owned at the runtime boundary:

```ts
downstream HTTP validation
  -> start apps/api with deterministic local config
  -> external consumer fetches health, metadata, calculate and OpenAPI routes
  -> optional @whattax/api-http client validation uses client-safe exports
  -> compare response shape with canonical API/SDK expectations
  -> stop apps/api cleanly and record route evidence
```

These target graphs still match the spec. No spec or task-list update is
needed from this audit.

## Verification gates for implementation slices

For this audit task:

```sh
bun run --filter=@whattax/sdk check-packed-artifact
bun run --filter=api smoke:public-routes
bun run docs:validate
bun run verification
```

For the later harness implementation slice, add the narrowest new command first
and then broaden:

```sh
bun run --filter=@whattax/sdk validate:downstream
bun run --filter=@whattax/sdk check-boundaries
bun run --filter=@whattax/sdk test-types
bun run --filter=@whattax/sdk test
bun run --filter=@whattax/sdk build
bun run --filter=@whattax/api-http test
```

`bun run verification` remains the broad repo gate.

## Improvement audit passes

Audit pass 1 - current call graphs:

- The SDK packed-artifact graph in the spec still matches
  `scripts/check-packed-artifact.ts`.
- The API compatibility graph still matches `@whattax/api-http` tests.
- The live API smoke graph still matches
  `apps/api/scripts/smoke-public-routes.runtime.ts`.
- Improvement recorded: the plan distinguishes copied-package import smoke
  from true package-manager install.

Audit pass 2 - package ownership:

- SDK package owns the downstream SDK harness.
- `apps/api` keeps Bun process lifecycle and smoke process ownership.
- `@whattax/api-http` keeps HTTP contracts, client exports, route schemas and
  server route layers.
- `packages/scripts` remains out of runtime ownership because it has no package
  manifest or source exports.
- Improvement recorded: optional HTTP client validation is separated from SDK
  package validation so the SDK does not gain an API transport dependency.

Audit pass 3 - verification and install strategy:

- The planned command checks packed manifests before claiming downstream
  install readiness.
- The plan records runtime and dev-only unresolved `workspace:*` dependencies.
- The plan records `catalog:` ranges as an additional external-install blocker.
- Browser proof is scoped to root, AU and schemas SDK entrypoints.
- Evidence must stay neutral and avoid private downstream product names.
- Improvement recorded: defaulting to strict blocker diagnostics avoids a
  patched local install that could be mistaken for publication readiness.

## Changeset decision

No Changeset is expected for `DOWNSTREAM-001` because this task adds an active
exec plan and updates the active-plan index only. It does not change package
code, package manifests, package README promises, package exports, runtime
behaviour or public package documentation. A later package-facing command,
README or manifest change should add a patch Changeset for the owning package.

## Validation log

### 2026-07-02 - Audit plan opened

- Read required spec, task object, implementation flow, architecture docs and
  current validation files.
- Audited SDK packed-artifact checks, SDK runtime tests, SDK type tests, API
  package tests, API package README, app smoke script, app package manifest and
  app README.
- Audited package manifests for unresolved dependency protocols.
- Created this active execution plan for parent review.

### 2026-07-02 - Required verification

- `bun run --filter=@whattax/sdk check-packed-artifact`
  - Passed.
  - Confirmed packed SDK import smoke and packed artifact checks.
- `bun run --filter=api smoke:public-routes`
  - Passed.
  - Started `apps/api` at `http://127.0.0.1:4173`.
  - Covered `GET /api/health`, `GET /api/v1/calculators`,
    `POST /api/v1/calculators/au.pay.take-home/calculate` and
    `GET /api/docs/openapi.json`.
  - Stopped the API process cleanly.
- `bun run docs:validate`
  - Passed with 0 docs content issues.
- `bun run verification`
  - Passed.
  - Ran lint, format check, Knip and workspace type checks.
  - Turbo reported 22 successful check/build tasks.

No Changeset was added because this task changed only
`docs/exec-plans/active/downstream-consumer-validation.md` and the active-plan
index. No package code, manifests, package READMEs, package exports or runtime
behaviour changed.

### 2026-07-02 - Parent review and acceptance

- Parent reviewed the subagent diff against the spec, task list,
  implementation protocol and architecture docs.
- Parent accepted the strict manifest-diagnostic strategy for `DOWNSTREAM-002`:
  the SDK-owned command should build and pack the runtime closure, inspect
  exact packed manifests, and fail with release-blocker diagnostics while
  runtime `workspace:*` or `catalog:` protocols remain.
- Parent confirmed no spec or task-list call graph update was needed. The
  current SDK packed-artifact, API compatibility and live app smoke graphs
  still match the target spec's current-state diagrams.
- Parent updated
  `docs/product-specs/downstream-consumer-validation.tasks.json` to mark
  `DOWNSTREAM-001` as completed and advanced this active plan's current task
  marker to `DOWNSTREAM-002`.
- Parent reran `bun run --filter=@whattax/sdk check-packed-artifact`; it
  passed with packed SDK import smoke and packed artifact checks.
- Parent reran `bun run --filter=api smoke:public-routes`; it passed and
  covered `GET /api/health`, `GET /api/v1/calculators`,
  `POST /api/v1/calculators/au.pay.take-home/calculate` and
  `GET /api/docs/openapi.json`, then stopped the API process cleanly.
- Parent reran `bun run docs:validate`; it passed with 0 docs content issues.
- Parent reran `bun run verification`; it passed lint, format check, Knip and
  workspace type checks with 22 successful Turbo tasks.
- Parent accepted the no-Changeset rationale because this slice changed only
  docs/exec-plan and task-status artifacts.
- Parent accepted `DOWNSTREAM-001` and will not delegate `DOWNSTREAM-002`
  until this coherent slice is committed.

## Residual risks

- Clean external package-manager install is currently expected to fail until
  `workspace:*` and `catalog:` dependency ranges are replaced or otherwise
  made publication-ready in packed manifests.
- `@whattax/api-http` still has source export conditions. That does not block
  this SDK harness audit, but optional downstream API client package validation
  should audit API HTTP packed exports separately.
- The first strict downstream command may fail before running typecheck,
  runtime SDK examples or browser bundling while manifest blockers remain. That
  failure is useful release evidence, but it is not complete consumer
  compatibility proof.
- Package names remain unreserved until an explicit publication decision. This
  task did not run live package-name checks.
