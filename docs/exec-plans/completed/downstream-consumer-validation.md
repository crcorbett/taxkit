---
status: completed
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
Complete - all downstream consumer validation foundation tasks are accepted.

Goal:
Finalize the downstream consumer validation release-gate documentation and
execution evidence. The final docs must state that strict downstream validation
is incomplete while packed manifest blockers remain, and preserve the passing
diagnostic evidence for SDK and HTTP/API downstream checks. This task does not
publish packages, remove `private: true`, run package-name availability checks,
name private downstream products or move runtime ownership to `packages/scripts`.

## Status

| Area | Status | Notes |
| --- | --- | --- |
| Spec and task read | complete | Reviewed the downstream validation spec, `DOWNSTREAM-001`, and the implementation flow. |
| Architecture read | complete | Reviewed API/SDK, package ownership, package boundaries, Effect services and testing/quality docs. |
| Current SDK validation audit | complete | Current checks cover dist-only SDK export targets and copied-package import smoke, but not package-manager install, transitive dependency resolution or browser bundling. |
| Current API validation audit | complete | Current checks cover OpenAPI snapshot, in-process route fixtures, SDK parity and a live `apps/api` public-route smoke. |
| Manifest audit | complete | Runtime package manifests still contain unresolved `workspace:*`; packed manifests also retain `catalog:` ranges for external packages. |
| Harness design | complete | First implementation should fail fast with explicit manifest blocker diagnostics before attempting clean external install. |
| SDK downstream command | complete | Added `packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts` and package commands `validate:downstream` and `validate:downstream:audit`. |
| Command semantics | complete | `validate:downstream` is the strict release gate and currently exits nonzero with release-blocker diagnostics; `validate:downstream:audit` runs the same diagnostics and exits zero for implementation evidence. |
| Verification | complete | Required SDK gates and repo verification passed; strict downstream validation produced the expected blocker failure and diagnostic mode passed. |
| Changeset decision | complete | Added a patch Changeset for `@taxkit/sdk` because this task adds package-facing commands, script behaviour and README semantics. |
| HTTP downstream smoke | implemented | `apps/api` smoke now writes and runs a dependency-free temp-workspace HTTP consumer against the live app process. |
| HTTP cleanup proof | implemented | Normal smoke and the expected-failure simulation both remove the temp workspace and stop the API process. |
| DOWNSTREAM-003 verification | complete | Mandatory app, API, SDK diagnostic, docs, repo and diff gates were run; strict SDK downstream validation remains the expected nonzero blocker result. |
| DOWNSTREAM-003 Changeset decision | complete | No Changeset because this slice changes app-owned smoke tooling and docs only, with no package exports, package manifests or package runtime behaviour changed. |
| DOWNSTREAM-004 docs finalisation | complete | Spec, product-spec index, SDK README and this plan now record the implemented diagnostic/API foundation and the incomplete strict SDK downstream gate. |
| DOWNSTREAM-004 verification | complete with blocker | Required gates were run. `validate:downstream` remains the expected nonzero strict release blocker; diagnostic/API/supporting gates passed. |
| DOWNSTREAM-004 no-publish audit | complete | Package manifests still have `private: true`; no package manifest, changelog or Changeset diff was introduced; no `version-repo`, npm publish or package-name availability check was run. |
| DOWNSTREAM-004 Changeset decision | complete | No new Changeset. The existing SDK Changeset remains sufficient for the SDK commands and SDK README semantics added in `DOWNSTREAM-002`; this slice is docs/evidence finalisation. |

## Task status

| Task | Status | Notes |
| --- | --- | --- |
| DOWNSTREAM-001 | completed | Current validation, manifest blockers and strict downstream install strategy are recorded. |
| DOWNSTREAM-002 | completed | SDK-owned external workspace validation command added with strict blocker diagnostics and audit mode. |
| DOWNSTREAM-003 | completed | App-owned smoke now proves public HTTP/API consumption from an external temp workspace. |
| DOWNSTREAM-004 | completed | Release-gate docs and evidence are accepted; strict SDK downstream install remains an explicit release blocker until packed manifest protocols are resolved. |

## Current validation surfaces

### SDK package

`@taxkit/sdk` currently owns package-consumer validation under
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
bun run --filter=@taxkit/sdk check-packed-artifact
  -> npm pack --dry-run --json .
  -> compare package exports with dry-run packed files
  -> reject source export conditions and missing types/default targets
  -> reject source and test files in the packed file list
  -> copy packed files into packages/sdk/typescript/.pack-smoke/node_modules
  -> bun smoke.mjs imports @taxkit/sdk, /effect, /au, /au/effect, /schemas and /testing
  -> remove .pack-smoke
```

That graph still matches the spec's current SDK packed-artifact diagram. The
important limit is that it copies package files into a fake `node_modules`
layout, so it does not prove external package-manager install, transitive
dependency resolution, `workspace:*` or `catalog:` protocol handling, or
browser bundling.

Current SDK tests prove:

- the plain `TaxKit` facade runs current AU calculations and returns SDK-owned
  `TaxKitSuccess` and `TaxKitFailure` result values for safe calls
- the Effect facade matches `PublicCalculatorService` for successful runs and
  preserves calculator-owned guided input errors
- AU subpath helpers stay thin over generic descriptors
- type tests reject wrong module/calculation pairings and wrong fact shapes

These tests are still in-repo tests over workspace source and built package
surfaces. They are not downstream install tests.

### HTTP API package

`@taxkit/api-http` currently owns HTTP API contracts, generated OpenAPI,
route fixtures, typed clients, server route layers and HTTP status envelopes.

Current package tests:

```ts
bun run --filter=@taxkit/api-http test
  -> OpenAPI snapshot from TaxKitApi
  -> in-process health, metadata, calculate and input-error fixtures
  -> calculate success equals @taxkit/sdk/effect calculateRunRequest
  -> CalculatorInputDecodeError maps to CalculatorApiErrorEnvelope
```

That graph still matches the spec's current API compatibility diagram.

`@taxkit/api-http` has public client export paths, but its package export map
still includes workspace-local `source` conditions. The downstream SDK harness
should not import API server handlers or route layers. If a later slice packs
and installs `@taxkit/api-http` for public client validation, it should audit
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
  -> create a temp workspace outside the repo
  -> write dependency-free package.json and consumer.mjs
  -> run bun run smoke from the temp workspace
  -> external consumer fetches health, metadata, calculate and OpenAPI routes
  -> external consumer checks minimal public JSON evidence
  -> remove the temp workspace through Effect scoped cleanup
  -> stop apps/api through Effect scoped child-process cleanup
```

That graph now matches the spec's implemented downstream HTTP/API validation
diagram for this slice. The repo-side smoke still owns canonical
`@taxkit/api-http` schema validation. The generated external consumer stays
dependency-free and uses public HTTP JSON only.

## Ownership audit

No schemas, types, ids, services, layers or tagged errors were changed in this
task. The plan relies on these existing owners:

| Contract | Owner | Notes |
| --- | --- | --- |
| `CalculatorRun*` schemas and `CalculatorServiceError` | `@taxkit/calculators` | SDK schema exports and API route schemas must reuse these contracts. |
| `PublicCalculatorService`, `PublicCalculatorServiceLive` | `@taxkit/calculators` | SDK and API tests consume the service instead of duplicating calculation dispatch. |
| `CalculationEngineLive`, `aud`, `Money` and core tagged primitives | `@taxkit/core` | Rule packages and smoke fixtures use core primitives. |
| `GrossPay`, `AuPayCalculatorId`, AU pay jurisdiction/tax year ids, pay descriptors and pay report schemas | `@taxkit/rules-au-pay` | Current downstream examples should use these through SDK exports where possible, not local DTO mirrors. |
| Annual income tax calculator ids, input schema and report schema | `@taxkit/rules-au-income-tax` | AU SDK descriptors compose these rule-owned contracts. |
| `TaxKit`, SDK calculation/module types, `calculateRunRequest`, `TaxKitCalculationError`, `TaxKitSuccess`, `TaxKitFailure` | `@taxkit/sdk` | The downstream SDK harness belongs here. |
| `TaxKitApi`, health/calculator HTTP schemas, `CalculatorApiErrorEnvelope`, API client exports and config schema | `@taxkit/api-http` | HTTP client validation should use browser/client-safe exports only. |
| API host/port config, Bun process lifecycle and public-route smoke | `apps/api` | The harness may start the app, but runtime lifecycle stays app-owned. |
| Generic repo automation package | `packages/scripts` | Planned placeholder only. It must not own this runtime harness yet. |

## Manifest audit

The external install blocker is current package metadata, not missing source
files. The SDK pack smoke already verifies SDK packed files exist, but a clean
consumer install will still see unresolved protocols in package manifests.

Runtime `workspace:*` dependencies in the downstream SDK closure:

| Package | Runtime unresolved workspace dependencies |
| --- | --- |
| `@taxkit/sdk` | `@taxkit/calculators`, `@taxkit/rules-au-income-tax`, `@taxkit/rules-au-pay` |
| `@taxkit/calculators` | `@taxkit/core`, `@taxkit/rules-au-income-tax`, `@taxkit/rules-au-pay` |
| `@taxkit/rules-au-income-tax` | `@taxkit/core` |
| `@taxkit/rules-au-pay` | `@taxkit/core` |

Runtime `workspace:*` dependencies for optional downstream HTTP client/app
coverage:

| Package | Runtime unresolved workspace dependencies |
| --- | --- |
| `@taxkit/api-http` | `@taxkit/calculators`, `@taxkit/core`, `@taxkit/sdk` |
| `api` app | `@taxkit/api-http` |

Dev-only `workspace:*` dependencies seen during the audit:

| Package | Dev-only unresolved workspace dependencies |
| --- | --- |
| `@taxkit/sdk` | `@taxkit/core`, `@taxkit/testing` |
| `@taxkit/api-http` | `@taxkit/rules-au-pay`, `@taxkit/testing` |
| `@taxkit/calculators` | `@taxkit/testing` |
| `@taxkit/rules-au-income-tax` | `@taxkit/testing` |
| `@taxkit/rules-au-pay` | `@taxkit/testing` |
| `api` app | `@taxkit/core`, `@taxkit/rules-au-pay`, `@taxkit/tsconfig` |

Additional external install blocker:

- The same closure uses `catalog:` ranges for external packages such as
  `effect`, `typescript`, `vitest`, `@effect/platform-bun` and `@effect/vitest`.
  A downstream temp workspace will not inherit the root workspace catalog, so
  the harness must diagnose `catalog:` ranges along with `workspace:*` ranges
  before claiming clean install readiness.

Minimum packed runtime dependency closure for SDK validation:

- `@taxkit/sdk`
- `@taxkit/calculators`
- `@taxkit/core`
- `@taxkit/rules-au-income-tax`
- `@taxkit/rules-au-pay`

Optional packed dependency for downstream HTTP client validation:

- `@taxkit/api-http`

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

The SDK-owned commands are:

```sh
bun run --filter=@taxkit/sdk validate:downstream
bun run --filter=@taxkit/sdk validate:downstream:audit
```

The runtime entrypoint lives at
`packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts`. The
`.runtime.ts` suffix is intentional: repo lint rules require scripts that run
Effects through `BunRuntime.runMain` to be runtime entrypoints. The command
remains SDK-owned because `@taxkit/sdk` owns downstream SDK examples, package
import boundaries and packed-artifact checks. It may orchestrate package
builds, package packing and a temp workspace, but it must not become a generic
repo automation runtime while `packages/scripts` is only a planned placeholder.

Implemented target call graph:

```ts
bun run --filter=@taxkit/sdk validate:downstream
  -> build required TaxKit packages
  -> pack @taxkit/sdk and the minimum runtime dependency closure
  -> create a temp workspace outside the repo
  -> write downstream package.json, tsconfig, typecheck, runtime and browser files
  -> extract exact package.json manifests from packed tarballs
  -> audit packed manifests for workspace:* and catalog: blockers
  -> write evidence and clean up
  -> fail with release-blocker diagnostics while blockers remain
  -> otherwise install packed artifacts through package-manager install
  -> run downstream typecheck over valid imports and @ts-expect-error misuse
  -> run plain SDK calculation through public entrypoints
  -> run Effect SDK calculation through public entrypoints
  -> run browser-safe bundle check for root, AU and schemas entrypoints
  -> write success evidence and clean up
```

`validate:downstream:audit` follows the same graph, but allows the
release-blocker result and exits zero after printing the original blocker
diagnostics. It is diagnostic-only and does not claim clean external install
readiness.

Remaining rollout command semantics:

- `validate:downstream` is the strict release gate. It is expected to exit
  nonzero while packed runtime manifests contain `workspace:*` or `catalog:`
  blockers.
- `validate:downstream:audit` is the passing diagnostic command for
  implementation evidence while those blockers remain. It must still report
  the original blockers.
- Later tasks must either resolve the packed manifest blockers before requiring
  `validate:downstream` to pass, or record the expected strict failure plus
  `validate:downstream:audit` as the passing diagnostic evidence.
- Final downstream consumer validation must not be claimed complete while the
  strict release gate still exits nonzero.

Implemented HTTP proof remains app/API owned at the runtime boundary:

```ts
bun run --filter=api smoke:public-routes
  -> start apps/api with deterministic local config
  -> repo-side smoke validates public routes with API-owned schemas
  -> create a temp workspace outside the repo
  -> external consumer fetches health, metadata, calculate and OpenAPI routes
  -> external consumer checks minimal public JSON evidence
  -> stop apps/api cleanly and record route evidence
```

These graphs now match the spec's implemented diagnostic/API foundation. The
strict SDK graph remains incomplete until packed runtime manifest blockers are
resolved and `validate:downstream` exits zero.

## Verification gates for implementation slices

For this audit task:

```sh
bun run --filter=@taxkit/sdk check-packed-artifact
bun run --filter=api smoke:public-routes
bun run docs:validate
bun run verification
```

For the later harness implementation slice, add the narrowest new command first
and then broaden:

```sh
bun run --filter=@taxkit/sdk validate:downstream # expected nonzero while blockers remain
bun run --filter=@taxkit/sdk validate:downstream:audit
bun run --filter=@taxkit/sdk check-boundaries
bun run --filter=@taxkit/sdk test-types
bun run --filter=@taxkit/sdk test
bun run --filter=@taxkit/sdk build
bun run --filter=@taxkit/api-http test
```

`bun run verification` remains the broad repo gate.

## Improvement audit passes

Audit pass 1 - current call graphs:

- The SDK packed-artifact graph in the spec still matches
  `scripts/check-packed-artifact.ts`.
- The API compatibility graph still matches `@taxkit/api-http` tests.
- The live API smoke graph still matches
  `apps/api/scripts/smoke-public-routes.runtime.ts`.
- Improvement recorded: the plan distinguishes copied-package import smoke
  from true package-manager install.

Audit pass 2 - package ownership:

- SDK package owns the downstream SDK harness.
- `apps/api` keeps Bun process lifecycle and smoke process ownership.
- `@taxkit/api-http` keeps HTTP contracts, client exports, route schemas and
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

### DOWNSTREAM-002 improvement audit passes

Audit pass 1 - runtime boundary and cleanup:

- Initial implementation ran as a package script with
  `BunRuntime.runMain(...)`; repo lint requires runtime-executing scripts to be
  runtime entrypoints.
- Improvement made: renamed the script to
  `validate-downstream-consumer.runtime.ts` and updated package/task
  references.
- Initial cleanup only printed cleanup intent.
- Improvement made: changed temp workspace lifecycle to
  `Effect.acquireRelease(...)` with `FileSystem.remove(..., { recursive: true,
  force: true })`, so both strict blocker failures and successful diagnostic
  runs remove the temp workspace.

Audit pass 2 - Effect API compatibility and command evidence:

- Initial implementation used unavailable Effect APIs for this repo version:
  `Option.fromNullable` and `Effect.catchAll`.
- Improvement made: replaced them with `Option.fromNullishOr` and
  `Effect.catchCause`, then reran the downstream audit command successfully.
- Initial command-error mapping risked losing command stdout/stderr for nonzero
  child commands.
- Improvement made: command execution now maps platform failures separately
  and preserves captured command output when a command exits nonzero.

Audit pass 3 - honest release-gate semantics and import boundaries:

- The task wording implied `validate:downstream` must complete install,
  typecheck, runtime and browser checks even while manifest blockers remain.
- Improvement made: updated `DOWNSTREAM-002` task wording to record that the
  strict command currently exits nonzero and that
  `validate:downstream:audit` is the passing diagnostic mode.
- The downstream browser entry generated by the script imports only
  `@taxkit/sdk`, `@taxkit/sdk/au` and `@taxkit/sdk/schemas`.
- `rg` found no `@taxkit/api-http`, app-module, server-only, `node:` or
  `bun:` imports in the downstream validator script.

## Changeset decision

No Changeset is expected for `DOWNSTREAM-001` because this task adds an active
exec plan and updates the active-plan index only. It does not change package
code, package manifests, package README promises, package exports, runtime
behaviour or public package documentation. A later package-facing command,
README or manifest change should add a patch Changeset for the owning package.

`DOWNSTREAM-002` is package-facing. It adds SDK package commands, SDK-owned
runtime script behaviour, a package README release-gate explanation and an SDK
dev dependency for the runtime script. Changeset:
`.changeset/sdk-downstream-validation.md`.

Changeset status reports a patch bump for `@taxkit/sdk` and dependent patch
release impacts for workspace packages that depend on the SDK release train.

`DOWNSTREAM-004` does not need a new Changeset. This slice updates specs,
execution evidence and the SDK README release-gate wording only. It does not
change package exports, package manifests, runtime code or package behaviour.
The existing SDK Changeset remains sufficient because it already records the
package-facing downstream validation commands and SDK README semantics from
`DOWNSTREAM-002`.

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

- `bun run --filter=@taxkit/sdk check-packed-artifact`
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
- Parent reran `bun run --filter=@taxkit/sdk check-packed-artifact`; it
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

### 2026-07-02 - DOWNSTREAM-002 implementation

- Added SDK-owned runtime script
  `packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts`.
- Added package commands:
  - `bun run --filter=@taxkit/sdk validate:downstream`
  - `bun run --filter=@taxkit/sdk validate:downstream:audit`
- Added `@effect/platform-bun` as an SDK dev dependency because the validator
  is an Effect/Bun runtime script.
- Updated the SDK README with strict release-blocker semantics and the
  diagnostic command.
- Updated `DOWNSTREAM-002` task wording because the default release gate is
  expected to fail while packed runtime manifests still contain
  `workspace:*` or `catalog:` protocols.
- Added patch Changeset `.changeset/sdk-downstream-validation.md`.

Owning package audit:

| Contract touched | Owner | Notes |
| --- | --- | --- |
| Downstream validator schemas for npm pack output, packed manifests and root catalog shape | `@taxkit/sdk` script-local validation boundary | New schemas describe script input/output formats, not reusable tax-domain DTOs. |
| `DownstreamCommandError`, `DownstreamReleaseBlockerError`, `DownstreamValidationError` | `@taxkit/sdk` script-local validation boundary | Tagged errors are `Data.TaggedError` values local to the command boundary. |
| SDK public entrypoints and typed clients | `@taxkit/sdk` | Downstream type/runtime/browser examples import package entrypoints, not workspace source aliases. |
| `CalculatorRun*` schemas and `CalculatorServiceError` re-exported through SDK schemas | `@taxkit/calculators`, re-exported by `@taxkit/sdk/schemas` | Examples consume the SDK schema subpath. |
| `PublicCalculatorServiceLive` | `@taxkit/calculators` | Used only in the downstream Effect runtime example to provide the SDK Effect facade. |
| `GrossPay` and AU pay facts | `@taxkit/rules-au-pay` | Used as canonical fact constructors because the current SDK does not own fact constructors. |
| `aud` and `CalculationEngineLive` | `@taxkit/core` | Used as canonical money constructor and engine layer in downstream runtime example. |

Call-graph audit:

- The implementation still matches the spec's implemented downstream SDK
  graph, with the strict blocker branch made explicit.
- The command builds the runtime closure, packs the SDK and required packages,
  creates a temp workspace outside the repo, writes downstream consumer files,
  extracts exact packed manifests, audits unresolved protocols, records
  evidence and cleans up.
- While blockers remain, install, typecheck, runtime SDK and browser bundle
  checks are skipped and recorded as blocker-skipped. The audit command follows
  the same graph but exits zero for implementation evidence.
- The SDK still does not import or depend on `@taxkit/api-http`.

### 2026-07-02 - DOWNSTREAM-002 verification

- `bun run --filter=@taxkit/sdk validate:downstream`
  - Expected failure, exit code 1.
  - Parent correction turn 2 rerun confirmed the strict blocker path prints the
    packed-manifest evidence and concise release-blocker message without an
    Effect stack trace.
  - Built `@taxkit/core`, `@taxkit/rules-au-income-tax`,
    `@taxkit/rules-au-pay`, `@taxkit/calculators` and `@taxkit/sdk`.
  - Created temp workspace under `/var/folders/.../T/taxkit-sdk-downstream-*`,
    outside the repo.
  - Packed and inspected exact manifests for the SDK runtime closure.
  - Skipped install, typecheck, runtime SDK and browser bundle checks because
    release blockers remain.
  - Removed the temp workspace through the scoped cleanup finalizer.
- `bun run --filter=@taxkit/sdk validate:downstream:audit`
  - Passed.
  - Parent correction turn 2 rerun confirmed the audit path still exits zero
    after printing the same blocker evidence and diagnostic-mode message.
  - Ran the same build, pack, manifest extraction, blocker diagnostics and
    cleanup path, then allowed the release-blocker result for diagnostic
    evidence.
- Runtime release blockers found in packed manifests:
  - `@taxkit/core dependencies.effect = catalog:`
  - `@taxkit/rules-au-income-tax dependencies.@taxkit/core = workspace:*`
  - `@taxkit/rules-au-income-tax dependencies.effect = catalog:`
  - `@taxkit/rules-au-pay dependencies.@taxkit/core = workspace:*`
  - `@taxkit/rules-au-pay dependencies.effect = catalog:`
  - `@taxkit/calculators dependencies.@taxkit/core = workspace:*`
  - `@taxkit/calculators dependencies.@taxkit/rules-au-income-tax = workspace:*`
  - `@taxkit/calculators dependencies.@taxkit/rules-au-pay = workspace:*`
  - `@taxkit/calculators dependencies.effect = catalog:`
  - `@taxkit/sdk dependencies.@taxkit/calculators = workspace:*`
  - `@taxkit/sdk dependencies.@taxkit/rules-au-income-tax = workspace:*`
  - `@taxkit/sdk dependencies.@taxkit/rules-au-pay = workspace:*`
  - `@taxkit/sdk dependencies.effect = catalog:`
- `bun run --filter=@taxkit/sdk check-packed-artifact`
  - Passed.
- `bun run --filter=@taxkit/sdk check-boundaries`
  - Passed.
- `bun run --filter=@taxkit/sdk test-types`
  - Passed.
- `bun run --filter=@taxkit/sdk test`
  - Passed: 3 files, 11 tests.
- `bun run --filter=@taxkit/sdk build`
  - Passed.
- Browser-safe downstream import audit:
  - `rg -n "@taxkit/api-http|apps/|server-only|@taxkit/.*/server|from ['\"]node:|from ['\"]bun:|\\.\\.\\/src" packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts`
  - Passed with no matches.
- `bun run verification`
  - Passed.
  - Ran lint, format check, Knip and workspace type checks.
  - Turbo reported 22 successful check/build tasks.
- `bun run changeset status --verbose`
  - Passed.
  - Reports patch bump for `@taxkit/sdk` from
    `.changeset/sdk-downstream-validation.md` and dependent patch release
    impacts across the current private workspace release train.

### 2026-07-02 - DOWNSTREAM-002 parent review and acceptance

- Parent reviewed the validator script, SDK package manifest, SDK README,
  task-list semantics, active-plan evidence and Changeset.
- Parent accepted the strict/audit split after two correction turns:
  - Correction turn 1 made the task list and global gates explicit that the
    strict release gate is expected to fail while packed runtime manifest
    blockers remain, and added `validate:downstream:audit` as the passing
    diagnostic command.
  - Correction turn 2 removed the Effect stack trace from the expected strict
    release-blocker result.
- Parent reran `bun run --filter=@taxkit/sdk validate:downstream`.
  - Expected nonzero result: exit code 1.
  - Evidence reported 13 packed runtime manifest blockers and removed the temp
    workspace.
  - Output ended with the concise release-blocker message and no stack trace.
- Parent reran `bun run --filter=@taxkit/sdk validate:downstream:audit`.
  - Passed.
  - Reported the same blocker evidence and diagnostic-mode allowance.
- Parent reran SDK gates:
  - `bun run --filter=@taxkit/sdk check-packed-artifact` passed.
  - `bun run --filter=@taxkit/sdk check-boundaries` passed.
  - `bun run --filter=@taxkit/sdk test-types` passed.
  - `bun run --filter=@taxkit/sdk test` passed: 3 files, 11 tests.
  - `bun run --filter=@taxkit/sdk build` passed.
- Parent reran repo and metadata gates:
  - `jq empty docs/product-specs/downstream-consumer-validation.tasks.json`
    passed.
  - `git diff --check` passed.
  - `bun run docs:validate` passed.
  - `bun run verification` passed.
  - `bun run changeset status --verbose` passed and reports the SDK patch
    Changeset.
- Parent reran the browser-safe import audit:
  - `rg -n "@taxkit/api-http|apps/|server-only|@taxkit/.*/server|from ['\"]node:|from ['\"]bun:|\\.\\.\\/src" packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts`
    produced no matches.
- Parent accepted the residual risk that clean downstream install, downstream
  typecheck, runtime SDK execution and browser bundle execution remain blocked
  until packed `workspace:*` and `catalog:` runtime dependency ranges are made
  publication-ready.
- Parent accepted `DOWNSTREAM-002` and will not delegate `DOWNSTREAM-003`
  until this coherent slice is committed.

### 2026-07-02 - DOWNSTREAM-003 implementation

- Extended `apps/api/scripts/smoke-public-routes.runtime.ts`, keeping
  `apps/api` as the process and smoke lifecycle owner.
- The app-owned smoke now creates a temp workspace under the operating-system
  temp directory with the `taxkit-api-downstream-*` prefix.
- The temp workspace is validated to be outside the repo before consumer files
  are written.
- The generated workspace contains a dependency-free `package.json` and
  `consumer.mjs`.
- The generated consumer uses `fetch` against `http://127.0.0.1:4173` and does
  not import app modules, server handlers, `@taxkit/api-http` or
  `@taxkit/sdk`.
- Repo-side canonical validation remains in the smoke script through
  `@taxkit/api-http` schemas for calculator catalog and calculate responses.
  The generated consumer checks only minimal public JSON evidence.
- Added `--simulate-downstream-failure` for deterministic cleanup proof after
  the external consumer has covered the public routes.
- Updated `apps/api/README.md` to document the external temp-workspace
  consumer, cleanup policy and expected-failure cleanup command.

Implemented HTTP smoke call graph:

```ts
bun run --filter=api smoke:public-routes
  -> start apps/api with API_HOST=127.0.0.1 and API_PORT=4173
  -> repo-side smoke validates health, metadata, calculate and OpenAPI routes
  -> create a temp workspace outside the repo
  -> write dependency-free package.json and consumer.mjs
  -> bun run smoke from the temp workspace
  -> generated consumer fetches public health, metadata, calculate and OpenAPI routes
  -> generated consumer checks minimal public JSON evidence
  -> remove the temp workspace on success or failure
  -> stop apps/api on success or failure
```

Route coverage from the external consumer:

- `GET /api/health`
- `GET /api/v1/calculators`
- `POST /api/v1/calculators/au.pay.take-home/calculate`
- `GET /api/docs/openapi.json`

Response checks from the external consumer:

- health response has `status: "ok"`
- calculator catalog includes `au.pay.take-home`
- calculate response returns calculator id `au.pay.take-home`
- calculate response report tag is `TakeHomePayReport`
- OpenAPI JSON includes the calculate route path
  `/api/v1/calculators/{calculatorId}/calculate`

Cleanup evidence gathered during implementation:

- Normal smoke passed and logged temp workspace removal for
  `/var/folders/.../T/taxkit-api-downstream-cYFA2F`.
- Normal smoke logged `TaxKit API stopped` and
  `apps/api smoke process stopped`.
- Expected-failure cleanup proof:
  `bun run --filter=api smoke:public-routes -- --simulate-downstream-failure`
  exited 1 after the external consumer covered all four public routes.
- The expected-failure run logged temp workspace removal for
  `/var/folders/.../T/taxkit-api-downstream-e0DPL3`.
- The expected-failure run logged `TaxKit API stopped` and
  `apps/api smoke process stopped`.

DOWNSTREAM-003 improvement audit passes:

- Audit pass 1 - ownership and call graph:
  - `apps/api` still owns API process startup, port selection, child-process
    lifecycle and smoke orchestration.
  - `@taxkit/api-http` still owns canonical route schemas and repo-side
    response validation.
  - The SDK still does not import or depend on `@taxkit/api-http`.
  - Improvement made: API client package validation was not added in this
    slice because dependency-free public HTTP JSON satisfies the task without
    introducing API package install blockers.
- Audit pass 2 - lifecycle and failure cleanup:
  - Temp workspace creation and removal use Effect platform `FileSystem` and
    `Path`.
  - The external consumer runs through Effect `ChildProcess` with stdout,
    stderr and exit-code capture through `Stream`.
  - The API process and temp workspace are both scoped resources.
  - Improvement made: changed the smoke completion log to run with
    `Effect.ensuring(...)`, so failure simulations report API shutdown rather
    than only success shutdown.
- Audit pass 3 - public consumer boundary:
  - The generated consumer imports no server handlers, app modules or TaxKit
    packages.
  - The generated consumer checks minimal public evidence instead of declaring
    local DTOs or reusable schemas.
  - Public JSON payload tags are limited to the request body required by the
    HTTP API; canonical schema validation remains repo-side.
  - Improvement made: the deterministic failure simulation now exits nonzero
    with a clear stderr message instead of throwing an expected stack trace.

Changeset decision:

- No Changeset for `DOWNSTREAM-003`.
- This slice changes app-owned smoke tooling, app README guidance and active
  execution evidence only.
- It does not change package exports, package manifests, package install
  behaviour, `@taxkit/api-http` client behaviour or `@taxkit/sdk` package
  behaviour.

Call-graph status:

- The final implementation still matches the spec's implemented downstream
  HTTP/API validation graph.
- Runtime ownership did not move out of `apps/api`.
- Contract ownership did not move out of `@taxkit/api-http`.
- `@taxkit/sdk` still has no dependency on `@taxkit/api-http`.

### 2026-07-02 - DOWNSTREAM-003 verification

- `bun run --filter=api smoke:public-routes`
  - Passed after final formatting.
  - Started `apps/api` at `http://127.0.0.1:4173`.
  - Repo-side smoke covered and schema-validated `GET /api/health`,
    `GET /api/v1/calculators`,
    `POST /api/v1/calculators/au.pay.take-home/calculate` and
    `GET /api/docs/openapi.json`.
  - External temp-workspace consumer covered the same four public routes.
  - Final temp workspace path:
    `/var/folders/.../T/taxkit-api-downstream-JJpROH`.
  - Removed the temp workspace and stopped the API process.
- `bun run --filter=api smoke:public-routes -- --simulate-downstream-failure`
  - Expected failure, exit code 1.
  - External temp-workspace consumer covered all four public routes before the
    deterministic failure.
  - Final temp workspace path:
    `/var/folders/.../T/taxkit-api-downstream-XX7QlD`.
  - Removed the temp workspace and stopped the API process after the failure.
- `bun run --filter=api check-types`
  - Passed.
- `bun run --filter=api build`
  - Passed.
- `bun run --filter=@taxkit/api-http test`
  - Passed: 2 test files, 5 tests.
- `bun run --filter=@taxkit/api-http check-types`
  - Passed.
- `bun run --filter=@taxkit/api-http build`
  - Passed.
- `bun run --filter=@taxkit/sdk validate:downstream`
  - Expected failure, exit code 1.
  - Reported the same 13 packed runtime manifest protocol blockers from
    `DOWNSTREAM-002`.
  - Skipped install, typecheck, runtime SDK and browser bundle checks because
    packed manifest blockers remain.
  - Removed the temp workspace
    `/var/folders/.../T/taxkit-sdk-downstream-boVLBz`.
- `bun run --filter=@taxkit/sdk validate:downstream:audit`
  - Passed.
  - Reported the same 13 packed runtime manifest protocol blockers and allowed
    them for diagnostic evidence.
  - Removed the temp workspace
    `/var/folders/.../T/taxkit-sdk-downstream-9WpzAU`.
- `bun run --filter=@taxkit/sdk check-boundaries`
  - Passed.
  - Confirmed SDK import boundaries still pass.
- `bun run docs:validate`
  - Passed with 0 docs content issues.
- `bun run test`
  - Passed: Turbo reported 17 successful tasks.
- `bun run build`
  - Passed: Turbo reported 13 successful tasks.
  - The build emitted the existing Rolldown `INVALID_ANNOTATION` warning from
    Effect's `HttpRouter.js`; it did not fail the build.
- `bun run verification`
  - First run stopped at `format:check` for
    `apps/api/scripts/smoke-public-routes.runtime.ts`.
  - Ran
    `bunx oxfmt -c oxfmt.config.ts --write apps/api/scripts/smoke-public-routes.runtime.ts --no-error-on-unmatched-pattern`.
  - Final rerun passed lint, format check, Knip and workspace type checks.
  - Turbo reported 22 successful check-type tasks.
- `git diff --check`
  - Passed after final formatting.

### 2026-07-02 - DOWNSTREAM-003 parent review and acceptance

- Parent reviewed the API smoke script, generated external-consumer boundary,
  app README update, active-plan evidence and no-Changeset rationale.
- Parent accepted the implementation shape:
  - `apps/api` remains the process lifecycle and smoke orchestration owner.
  - `@taxkit/api-http` remains the repo-side contract/schema validation owner.
  - The generated external consumer imports no app modules, server handlers,
    `@taxkit/api-http` or `@taxkit/sdk`.
  - The SDK still has no dependency on `@taxkit/api-http`.
- Parent reran `bun run --filter=api smoke:public-routes`.
  - Passed.
  - Repo-side smoke schema-validated health, metadata, calculate and OpenAPI
    routes.
  - External temp-workspace consumer covered the same four public routes.
  - Temp workspace was removed and the API process stopped.
- Parent reran
  `bun run --filter=api smoke:public-routes -- --simulate-downstream-failure`.
  - Expected nonzero result: exit code 1.
  - External temp-workspace consumer covered all four public routes before the
    deliberate failure.
  - Temp workspace was removed and the API process stopped.
- Parent ran `lsof -nP -iTCP:4173 -sTCP:LISTEN` after the failure simulation.
  - Expected nonzero result with no output, proving no listener remained on
    the smoke port.
- Parent reran app and API package gates:
  - `bun run --filter=api check-types` passed.
  - `bun run --filter=api build` passed.
  - `bun run --filter=@taxkit/api-http test` passed: 2 files, 5 tests.
  - `bun run --filter=@taxkit/api-http check-types` passed.
  - `bun run --filter=@taxkit/api-http build` passed.
- Parent reran SDK downstream gates:
  - `bun run --filter=@taxkit/sdk validate:downstream` produced the expected
    nonzero strict release-blocker result with the same 13 packed runtime
    manifest blockers.
  - `bun run --filter=@taxkit/sdk validate:downstream:audit` passed with the
    same blocker evidence in diagnostic mode.
  - `bun run --filter=@taxkit/sdk check-boundaries` passed.
- Parent reran repo gates:
  - `git diff --check` passed.
  - `bun run docs:validate` passed.
  - `bun run test` passed.
  - `bun run build` passed, with the existing Rolldown `INVALID_ANNOTATION`
    warning from Effect's `HttpRouter.js`.
  - `bun run verification` passed.
  - `bun run changeset status --verbose` passed and still reports only the SDK
    patch Changeset from `DOWNSTREAM-002`.
- Parent accepted the no-Changeset rationale because `DOWNSTREAM-003` changes
  app-owned smoke tooling, app README guidance and active execution evidence,
  not package exports, package manifests or package-facing API behaviour.
- Parent accepted `DOWNSTREAM-003` and will not delegate `DOWNSTREAM-004`
  until this coherent slice is committed.

### 2026-07-02 - DOWNSTREAM-004 implementation

- Updated
  `docs/product-specs/downstream-consumer-validation.md` from draft/spec
  language to implemented diagnostic/API foundation language.
- The spec now states that final downstream consumer validation remains
  incomplete while
  `bun run --filter=@taxkit/sdk validate:downstream` exits nonzero.
- The spec records the implemented command split:
  - `check-packed-artifact` proves packed SDK export targets and copied-package
    import smoke.
  - `validate:downstream` is the strict final SDK downstream gate after packed
    manifest blockers are resolved.
  - `validate:downstream:audit` is passing diagnostic evidence while blockers
    remain.
  - SDK boundaries, types, tests and build are supporting package evidence.
  - `@taxkit/api-http` tests and `apps/api` public-route smoke are HTTP/API
    downstream evidence.
- Updated `docs/product-specs/index.md` to describe the spec as an implemented
  foundation with the strict SDK downstream install still blocked by packed
  manifest protocols.
- Updated `packages/sdk/typescript/README.md` to:
  - record package-name availability as a future live release-prep check
  - document the SDK release-gate order
  - keep `validate:downstream` as the strict gate and
    `validate:downstream:audit` as diagnostic-only evidence.
- Reviewed `apps/api/README.md` and `packages/api/http/README.md`.
  - No update was needed; the app README already documents the external
    temp-workspace HTTP consumer and cleanup policy.
  - The API HTTP README already documents package tests and the app-owned live
    smoke relationship without moving process lifecycle into the package.
- Did not update
  `docs/product-specs/downstream-consumer-validation.tasks.json`; `DOWNSTREAM-004`
  remains pending for parent review.
- Did not move this plan to completed and did not update active/completed plan
  indexes.

DOWNSTREAM-004 release-gate order recorded:

```sh
bun run --filter=@taxkit/sdk check-packed-artifact
bun run --filter=@taxkit/sdk validate:downstream # strict final gate after blockers are resolved; currently expected nonzero
bun run --filter=@taxkit/sdk validate:downstream:audit # diagnostic evidence while blockers remain
bun run --filter=@taxkit/sdk check-boundaries
bun run --filter=@taxkit/sdk test-types
bun run --filter=@taxkit/sdk test
bun run --filter=@taxkit/sdk build
bun run --filter=@taxkit/api-http test
bun run --filter=api smoke:public-routes
bun run docs:validate
bun run test
bun run build
bun run verification
bun run changeset status --verbose
```

DOWNSTREAM-004 improvement audit passes:

- Audit pass 1 - docs and command agreement:
  - The final spec, task-list global verification semantics, SDK README and
    this execution plan agree that `check-packed-artifact` comes before strict
    downstream validation.
  - They agree that `validate:downstream` is not a passing final gate while
    packed runtime manifest blockers remain.
  - They agree that `validate:downstream:audit` is diagnostic-only passing
    evidence.
  - They agree that API downstream evidence is app/API-owned through
    `@taxkit/api-http` tests and `apps/api` public-route smoke.
  - Improvement made: the product-spec index no longer lists this spec as a
    draft, but its status still names the blocked strict SDK install.
- Audit pass 2 - evidence completeness:
  - Final evidence covers packed install blockers: the strict SDK validator
    reports 13 packed runtime manifest protocol blockers.
  - Final evidence records skipped SDK typecheck, plain runtime, Effect
    runtime and browser bundle checks because strict diagnostics stop before
    install.
  - Final evidence covers live API smoke and the external temp-workspace HTTP
    consumer across health, metadata, calculate and OpenAPI routes.
  - Final evidence records cleanup for SDK and API temp workspaces.
  - Improvement made: the spec's current release-gate state separates
    diagnostic/API foundation completion from incomplete clean SDK install
    proof.
- Audit pass 3 - boundaries, neutrality and release safety:
  - Public docs remain neutral and do not name private downstream products.
  - SDK ownership remains in `packages/sdk/typescript`.
  - API process lifecycle remains in `apps/api`.
  - HTTP contracts remain in `@taxkit/api-http`.
  - `@taxkit/sdk` still does not depend on `@taxkit/api-http`.
  - No package manifest, package version, changelog or publish-state file was
    changed.
  - Improvement made: the SDK README now treats package-name availability as a
    future live release-prep check instead of current static truth.

Changeset decision:

- No new Changeset for `DOWNSTREAM-004`.
- The existing `.changeset/sdk-downstream-validation.md` remains sufficient
  for the SDK-owned package commands and SDK README semantics added in
  `DOWNSTREAM-002`.
- This slice changes specs, active execution evidence, the product-spec index
  and SDK README release-gate wording only. It does not change package
  manifests, package exports, runtime code or package behaviour.

No-publish/private flag audit:

- All package manifests with a `private` field still report `private=true`:
  root, `apps/api`, `apps/docs`, `apps/web`, `@taxkit/api-http`,
  `@taxkit/calculators`, `@taxkit/core`, `@taxkit/docs-content`,
  `@taxkit/docs-fumadocs`, `@taxkit/rules-au-income-tax`,
  `@taxkit/rules-au-pay`, `@taxkit/rules-au-stsl`, `@taxkit/sdk`,
  `@taxkit/testing` and `@taxkit/tsconfig`.
- `git diff -- package.json '**/package.json' '**/CHANGELOG.md' '.changeset/*'`
  produced no output.
- `git diff --name-only` before this plan update listed only:
  - `docs/product-specs/downstream-consumer-validation.md`
  - `docs/product-specs/index.md`
  - `packages/sdk/typescript/README.md`
- This task did not run `bun run version-repo`, npm publish, package-name
  availability checks or any command that removes `private: true`.

Call-graph status:

- The final implementation still matches the spec's implemented downstream SDK
  call graph, including the strict blocker branch and diagnostic audit branch.
- The final implementation still matches the spec's implemented downstream
  HTTP/API call graph.
- The final release-gate call graph is intentionally incomplete at the strict
  SDK external install boundary until packed runtime manifest protocols are
  publication-ready.

### 2026-07-02 - DOWNSTREAM-004 verification

- `bun run --filter=@taxkit/sdk check-packed-artifact`
  - Passed.
  - Confirmed packed SDK import smoke and packed SDK artifact checks.
- `bun run --filter=@taxkit/sdk validate:downstream`
  - Expected failure, exit code 1.
  - Created temp workspace
    `/var/folders/.../T/taxkit-sdk-downstream-NlS6cF`.
  - Built the SDK runtime package closure.
  - Packed and inspected exact manifests for `@taxkit/core`,
    `@taxkit/rules-au-income-tax`, `@taxkit/rules-au-pay`,
    `@taxkit/calculators` and `@taxkit/sdk`.
  - Reported 13 packed runtime manifest protocol blockers:
    - `@taxkit/core dependencies.effect = catalog:`
    - `@taxkit/rules-au-income-tax dependencies.@taxkit/core = workspace:*`
    - `@taxkit/rules-au-income-tax dependencies.effect = catalog:`
    - `@taxkit/rules-au-pay dependencies.@taxkit/core = workspace:*`
    - `@taxkit/rules-au-pay dependencies.effect = catalog:`
    - `@taxkit/calculators dependencies.@taxkit/core = workspace:*`
    - `@taxkit/calculators dependencies.@taxkit/rules-au-income-tax = workspace:*`
    - `@taxkit/calculators dependencies.@taxkit/rules-au-pay = workspace:*`
    - `@taxkit/calculators dependencies.effect = catalog:`
    - `@taxkit/sdk dependencies.@taxkit/calculators = workspace:*`
    - `@taxkit/sdk dependencies.@taxkit/rules-au-income-tax = workspace:*`
    - `@taxkit/sdk dependencies.@taxkit/rules-au-pay = workspace:*`
    - `@taxkit/sdk dependencies.effect = catalog:`
  - Skipped install, typecheck, runtime SDK and browser bundle checks because
    release blockers were found before install.
  - Removed the temp workspace.
- `bun run --filter=@taxkit/sdk validate:downstream:audit`
  - Passed.
  - Created temp workspace
    `/var/folders/.../T/taxkit-sdk-downstream-azFCtm`.
  - Reported the same 13 packed runtime manifest blockers.
  - Skipped install, typecheck, runtime SDK and browser bundle checks for the
    same blocker reason.
  - Removed the temp workspace and exited zero in diagnostic mode.
- `bun run --filter=@taxkit/sdk check-boundaries`
  - Passed.
- `bun run --filter=@taxkit/sdk test-types`
  - Passed.
- `bun run --filter=@taxkit/sdk test`
  - Passed: 3 files, 11 tests.
- `bun run --filter=@taxkit/sdk build`
  - Passed.
- `bun run --filter=@taxkit/api-http test`
  - Passed: 2 files, 5 tests.
- `bun run --filter=api smoke:public-routes`
  - Passed.
  - Started `apps/api` at `http://127.0.0.1:4173`.
  - Repo-side smoke covered and schema-validated `GET /api/health`,
    `GET /api/v1/calculators`,
    `POST /api/v1/calculators/au.pay.take-home/calculate` and
    `GET /api/docs/openapi.json`.
  - External temp-workspace HTTP consumer covered the same four routes.
  - Temp workspace:
    `/var/folders/.../T/taxkit-api-downstream-ba35Zq`.
  - Removed the temp workspace and stopped the API process.
- `bun run docs:validate`
  - Passed with 0 docs content issues.
- `bun run test`
  - Passed: Turbo reported 17 successful tasks.
- `bun run build`
  - Passed: Turbo reported 13 successful tasks.
  - Build emitted the existing Rolldown `INVALID_ANNOTATION` warning from
    Effect's `HttpRouter.js`; it did not fail the build.
- `bun run changeset status --verbose`
  - Passed.
  - Reports the direct patch Changeset
    `.changeset/sdk-downstream-validation.md` for `@taxkit/sdk`.
  - Reports dependent patch release-train impacts for the current private
    workspace packages.
- `bun run verification`
  - Passed after this evidence update.
  - Ran lint, format check, Knip and workspace type checks.
- `git diff --check`
  - Passed after this evidence update.

### 2026-07-02 - DOWNSTREAM-004 parent review and acceptance

- Parent reviewed the final spec, product-spec index, SDK README release-gate
  wording, active execution evidence, no-Changeset rationale and release-safety
  audit.
- Parent accepted the final documentation shape:
  - downstream consumer validation is implemented as a diagnostic/API
    foundation
  - final strict SDK downstream validation is not complete while
    `validate:downstream` exits nonzero
  - `validate:downstream:audit` is passing diagnostic evidence only
  - `apps/api` public-route smoke is the accepted HTTP/API downstream proof
  - package-name availability remains a future live release-prep check
- Parent reran the SDK release-gate sequence:
  - `bun run --filter=@taxkit/sdk check-packed-artifact` passed.
  - `bun run --filter=@taxkit/sdk validate:downstream` produced the expected
    nonzero strict result with 13 packed runtime manifest blockers and removed
    the temp workspace.
  - `bun run --filter=@taxkit/sdk validate:downstream:audit` passed with the
    same blocker evidence and removed the temp workspace.
  - `bun run --filter=@taxkit/sdk check-boundaries` passed.
  - `bun run --filter=@taxkit/sdk test-types` passed.
  - `bun run --filter=@taxkit/sdk test` passed: 3 files, 11 tests.
  - `bun run --filter=@taxkit/sdk build` passed.
- Parent reran API and repo gates:
  - `bun run --filter=@taxkit/api-http test` passed: 2 files, 5 tests.
  - `bun run --filter=api smoke:public-routes` passed, including the external
    temp-workspace HTTP consumer and cleanup.
  - `bun run docs:validate` passed.
  - `bun run test` passed: 17 Turbo tasks.
  - `bun run build` passed: 13 Turbo tasks, with the existing Rolldown
    `INVALID_ANNOTATION` warning from Effect's `HttpRouter.js`.
  - `bun run verification` passed.
  - `bun run changeset status --verbose` passed and still reports the SDK
    patch Changeset.
  - `jq empty docs/product-specs/downstream-consumer-validation.tasks.json`
    passed.
  - `git diff --check` passed.
- Parent reran the release-safety audit:
  - every package manifest with a `private` field still reports
    `private=true`
  - package manifests, changelogs and Changesets have no new diff from this
    final docs/evidence slice
  - no `bun run version-repo`, npm publish, package-name availability check or
    private-flag removal was run
- Parent accepted the no-new-Changeset decision. The existing SDK Changeset
  covers the package-facing command and README semantics; this final slice is
  documentation, release-gate evidence and plan finalisation.
- Parent marked `DOWNSTREAM-004` completed and moved this execution plan from
  active to completed.

## Residual risks

- Clean external package-manager install is currently blocked until
  `workspace:*` and `catalog:` dependency ranges are replaced or otherwise
  made publication-ready in packed manifests. The strict release gate now exits
  nonzero before install and records typecheck/runtime/browser checks as
  skipped by release blockers.
- The generated downstream type/runtime examples currently include lower-level
  package imports for canonical constructors and service layers, including
  `@taxkit/core`, `@taxkit/rules-au-pay` and
  `@taxkit/calculators/live`. The browser-safe SDK entrypoint proof is
  narrower: it covers only `@taxkit/sdk`, `@taxkit/sdk/au` and
  `@taxkit/sdk/schemas`. Full SDK-only application proof remains blocked
  until package metadata is publication-ready and SDK constructor/facade gaps
  are resolved.
- `@taxkit/api-http` still has source export conditions. That does not block
  this SDK harness audit, but optional downstream API client package validation
  should audit API HTTP packed exports separately.
- The first strict downstream command may fail before running typecheck,
  runtime SDK examples or browser bundling while manifest blockers remain. That
  failure is useful release evidence, but it is not complete consumer
  compatibility proof.
- Package names remain unreserved until an explicit publication decision. This
  task did not run live package-name checks.
