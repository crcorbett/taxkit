---
document_type: execution-plan
lifecycle: historical
authority: supporting
owner: taxkit-execution-history-owner
last_reviewed: 2026-07-20
review_trigger: historical rollout, proof, or successor correction
successor: null
tombstone: false
---

# API compatibility harness execution plan

Spec:
[API compatibility harness](../../product-specs/api-compatibility-harness.md)

Task list:
[`api-compatibility-harness.tasks.json`](../../product-specs/api-compatibility-harness.tasks.json)

Goal:
Implement the API compatibility harness task list sequentially. Each task is
delegated to one subagent when available; the parent agent reviews, audits,
verifies call graphs and mandatory gates, accepts the task, updates this plan
and commits each coherent slice before delegating the next task. After the
third failed parent correction turn for the same task, the rollout stops for
replan or user decision.

Completed on 2026-07-01.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| API-COMPAT-001 | completed | Package-owned OpenAPI source, normalized snapshot, focused test/scripts, README workflow and Changeset are in place. |
| API-COMPAT-002 | completed | Route fixtures and SDK/error parity coverage added in the in-process API HTTP test. |
| API-COMPAT-003 | completed | Live API app smoke, README workflow docs and cleanup audits are in place. |

## Validation Log

### 2026-07-01 - Planning

- Read `prd-implementer`, the target spec, sibling task list and
  `docs/exec-plans/implementing-specs.md`.
- Read relevant architecture docs:
  `docs/architecture/api-and-sdk.md`,
  `docs/architecture/package-ownership.md`,
  `docs/architecture/effect-services.md` and
  `docs/architecture/testing-and-quality.md`.
- Created the active goal for sequential task-list implementation with one
  subagent per task, parent review/audit/verification before each next task,
  and a hard stop after the third failed parent correction turn for one task.
- Created this active execution plan before runtime, package script or package
  docs edits.
- Current uncommitted baseline before implementation contains the draft spec,
  sibling task list and product-spec index entry for this rollout.
- Delegated API-COMPAT-001 to subagent
  `019f1e42-d9bf-71d2-b14d-da265358f961`. The subagent landed a partial diff
  and validation-log proposal but did not return a final handoff after repeated
  waits and a status request, so the parent closed it and completed the review,
  verification and acceptance locally from the landed diff.

### 2026-07-01 - API-COMPAT-001 validation

- Baseline before edits: `packages/api/http/src/server/live.layer.ts` built
  `/api/docs/openapi.json` from a local `OpenApi.fromApi(TaxKitApi)` value;
  the package test surface was
  `packages/api/http/__tests__/public-calculation-api.test.ts`; live
  `apps/api` smoke coverage remains API-COMPAT-003 scope.
- Added `packages/api/http/src/openapi.ts` as the package-owned OpenAPI source.
  It calls `OpenApi.fromApi(TaxKitApi)` once, decodes to `Schema.Json`,
  recursively normalizes structured JSON through `Schema`, `Option`,
  `Array`, `Record` and `Order`, and formats the normalized snapshot.
- Updated `packages/api/http/src/server/live.layer.ts` so
  `/api/docs/openapi.json` serves `taxKitOpenApiSpec` from the shared
  OpenAPI module.
- Added `packages/api/http/__tests__/openapi-snapshot.test.ts`,
  `packages/api/http/__snapshots__/openapi.json`,
  `test:openapi` and `update-openapi-snapshot`.
- Documented the intentional OpenAPI snapshot update workflow in
  `packages/api/http/README.md`.
- Snapshot path:
  `packages/api/http/__snapshots__/openapi.json` with 2,906 lines after
  formatting.
- Update command:
  `bun run --filter=@taxkit/api-http update-openapi-snapshot`.
- Targeted package verification passed:
  `bun run --filter=@taxkit/api-http test` (2 files, 3 tests),
  `bun run --filter=@taxkit/api-http check-types`,
  `bun run --filter=@taxkit/api-http build` and
  `bun run --filter=@taxkit/api-http test:openapi`.
- Drift audit passed with an in-memory mutation script: route rename, method
  rename and calculate 400 response schema-reference changes all differed from
  the committed normalized snapshot.
- Shared-source rg audit passed:
  `rg -n "OpenApi\\.fromApi" packages/api/http/src packages/api/http/__tests__`
  reports the only generation call in `packages/api/http/src/openapi.ts`, and
  rg over `taxKitOpenApiSpec` shows only the docs route and snapshot test
  consuming the package-owned source.
- Boundary/leak audit passed: rg over apps/packages shows no browser app
  imports of the OpenAPI module; only `packages/api/http/src/server/live.layer.ts`
  and the snapshot test consume it.
- Guardrail audit passed: the new OpenAPI path has no `Object.keys`,
  `Object.values`, `Object.entries`, `JSON.parse`, switches, manual `_tag`,
  undefined branching or spread response shaping.
- Changeset evidence passed:
  `.changeset/openapi-snapshot-harness.md` records a patch for
  `@taxkit/api-http`; `bun run changeset status --verbose` reports the fixed
  release group would patch to `0.0.4` when applied.
- Parent reran `bun run --filter=@taxkit/api-http test`,
  `bun run --filter=@taxkit/api-http check-types`,
  `bun run --filter=@taxkit/api-http build`,
  `bun run --filter=@taxkit/api-http test:openapi`, the in-memory OpenAPI
  drift audit, shared-source rg audits, browser/server import leak audits,
  `bun run verification` and `bun run changeset status --verbose`; all passed.

### 2026-07-01 - API-COMPAT-002 validation

- Baseline before edits:
  `packages/api/http/__tests__/public-calculation-api.test.ts` covered one
  calculate success path and one typed input-error path through
  `TaxKitApiInProcessClientLive`; it did not cover `GET /api/health` or a
  metadata route fixture.
- Added focused route fixture assertions in
  `packages/api/http/__tests__/public-calculation-api.test.ts`:
  `GET /api/health` now calls `client.health.getHealth()` and decodes with
  `HealthResponse`; `GET /api/v1/calculators` now calls
  `client.calculatorApi.listCalculators`, decodes with
  `CalculatorCatalogResponse`, compares to
  `PublicCalculatorService.listCalculators` and asserts the take-home catalog
  item with `AuPayCalculatorId`, `GrossPayDescriptor` and
  `TaxFreeThresholdClaimedDescriptor`.
- Calculate success fixture coverage now decodes the HTTP result with
  `CalculatorRunResponse`, asserts the route output equals
  `@taxkit/sdk/effect` `calculateRunRequest(AuPayTakeHomeCalculation, ...)`,
  and keeps the stable take-home report assertions for withholdings, net pay
  and graph diagnostics.
- Schema-guided input-error fixture coverage uses annual-tax-shaped
  `taxableIncome` facts against `au.pay.take-home`. The HTTP failure decodes
  through `CalculatorApiErrorEnvelope`, the inner error decodes through
  `CalculatorServiceError`, and that canonical tagged error equals both the SDK
  failure and the `PublicCalculatorService.calculate` failure. The fixture also
  asserts the `grossPay` issue path and descriptor-backed
  `GrossPayDescriptor.id` help evidence.
- Route fixture coverage matrix:
  health route covered by `getHealth`; metadata route covered by
  `listCalculators`; calculate success covered by
  `calculate` for `au.pay.take-home`; schema-guided input error covered by the
  mismatched annual-tax facts fixture for the take-home route.
- SDK parity audit:
  calculate success still proves
  `HTTP -> TaxKitApiInProcessClientLive -> CalculatorApiHandlerLive ->
  calculateRunRequest -> PublicCalculatorService -> CalculationEngine` by
  comparing the full HTTP response to the SDK full-run response; expected
  input errors now compare the HTTP error envelope to SDK and calculator
  service failures without local error DTOs.
- No Changeset rationale:
  API-COMPAT-002 changed internal tests plus this execution plan and task-list
  status only. It did not change exported package API, route behaviour,
  OpenAPI contracts, runtime behaviour or documented package usage. The
  existing API-COMPAT-001 Changeset remains unchanged.
- Verification passed after a lint/format correction on the edited test file:
  `bun run --filter=@taxkit/api-http test` (2 files, 5 tests),
  `bun run --filter=@taxkit/api-http check-types`,
  `bun run --filter=@taxkit/api-http build`,
  `bun run --filter=@taxkit/sdk check-boundaries` and
  `bun run verification`.

### 2026-07-01 - API-COMPAT-003 validation

- Added app-owned live smoke runtime
  `apps/api/scripts/smoke-public-routes.runtime.ts` and command
  `bun run --filter=api smoke:public-routes`.
- Smoke call graph:
  `ChildProcess.make("bun", ["src/index.ts"])` from `apps/api` with
  deterministic `API_HOST=127.0.0.1` and `API_PORT=4173` ->
  `apps/api/src/index.ts` -> `ApiAppLayer` -> `TaxKitServerLayer` ->
  public routes owned by `@taxkit/api-http`.
- Smoke route coverage:
  `GET /api/health`, `GET /api/v1/calculators`,
  `POST /api/v1/calculators/au.pay.take-home/calculate` and
  `GET /api/docs/openapi.json`.
- The smoke payload uses rule/core-owned constructors
  `new GrossPay({ amount: aud(346_200), period: "fortnightly" })`, decodes and
  encodes through `CalculatorRunRequest`, decodes catalog and calculate
  responses through `CalculatorCatalogResponse` and `CalculatorRunResponse`,
  and treats OpenAPI JSON as `Schema.Json`.
- Process lifecycle is Effect-owned: the smoke entrypoint runs with
  `BunRuntime.runMain`, starts the child through `effect/unstable/process`
  `ChildProcess` with `BunServices.layer`, uses `BunHttpClient.layer` for
  route calls, retries health with `Schedule`, and lets `Effect.scoped` kill
  the child with `SIGTERM` and `forceKillAfter: "2 seconds"` on success or
  failure.
- Success cleanup audit passed:
  `bun run --filter=api smoke:public-routes` printed all four route pass lines,
  `TaxKit API stopped` and `apps/api smoke process stopped`; follow-up
  `ps -axo pid,command | rg 'bun .*src/index\\.ts|apps/api/src/index\\.ts' | rg -v 'rg|smoke-public-routes'`
  and `lsof -nP -iTCP:4173 -sTCP:LISTEN` returned no matches.
- Failure cleanup audit passed by occupying `127.0.0.1:4173` with a temporary
  local Bun server and rerunning `bun run --filter=api smoke:public-routes`.
  The API child failed to bind, the smoke failed with typed `SmokeRouteError:
  Timed out waiting for http://127.0.0.1:4173/api/health`, and follow-up `ps`
  plus `lsof` checks returned no `apps/api` process or listener after the
  temporary occupier was stopped.
- Updated `apps/api/README.md` with the smoke command, deterministic local
  address, public route coverage and process-lifecycle ownership.
- Updated `packages/api/http/README.md` with the OpenAPI snapshot command,
  route fixture coverage, live smoke handoff to `apps/api` and intentional
  contract-change workflow.
- Updated `.changeset/openapi-snapshot-harness.md` to cover OpenAPI snapshot
  checks, route fixture coverage and live API smoke workflow docs for the
  existing `@taxkit/api-http` patch entry. No separate Changeset was added for
  the app-owned smoke command because `apps/api` is private app-internal
  tooling and this slice did not change public route behaviour.
- Changeset status evidence:
  `bun run changeset status --verbose` reports the fixed release group would
  patch `@taxkit/api-http` to `0.0.4` when applied, along with the existing
  fixed-group workspace package patches.
- Mandatory verification passed:
  `bun run --filter=api smoke:public-routes`,
  `bun run --filter=api check-types`,
  `bun run --filter=api build`,
  `bun run --filter=@taxkit/api-http test` (2 files, 5 tests),
  `bun run --filter=@taxkit/api-http check-types`,
  `bun run --filter=@taxkit/api-http build`, `bun run docs:validate`,
  `bun run test`, `bun run build` and `bun run verification`.
- `bun run build` passed with the existing Rolldown
  `INVALID_ANNOTATION` warning from Effect's generated
  `HttpRouter.js`; Turbo completed successfully.
- Parent reran `bun run --filter=api smoke:public-routes`,
  `bun run --filter=api check-types`, `bun run --filter=api build`,
  `bun run --filter=@taxkit/api-http test`,
  `bun run --filter=@taxkit/api-http check-types`,
  `bun run --filter=@taxkit/api-http build`, `bun run docs:validate`,
  `bun run test`, `bun run build`, `bun run verification`,
  `bun run changeset status --verbose`, `git diff --check`, success cleanup
  checks and the occupied-port failure cleanup audit; all passed.

## Parent Audit Log

### API-COMPAT-001

- Accepted after local review. Correction turns: 0.
- Audit pass 1: final call graph matches the spec target:
  `/api/docs/openapi.json -> taxKitOpenApiSpec -> OpenApi.fromApi(TaxKitApi)`;
  snapshot test -> `normalizedTaxKitOpenApiSpec` from the same module ->
  committed normalized snapshot.
- Audit pass 2: normalization is structured and deterministic. It decodes the
  generated spec to `Schema.Json`, orders JSON object keys with Effect
  `Record`/`Array`/`Order`, recurses over arrays and objects, and does not
  mirror route DTOs or handwrite OpenAPI route shapes.
- Audit pass 3: Effect/schema conventions and package boundaries hold. The
  slice reuses `TaxKitApi` and Effect OpenAPI types, keeps the docs route in
  the server layer, avoids unsafe casts and helper sprawl, and introduces no
  browser/server import leak.

### API-COMPAT-002

- Accepted after local review. Correction turns: 0.
- Audit pass 1: final fixture call graph still matches the spec target:
  route fixtures use `TaxKitApiInProcessClientLive`; calculate success reaches
  `CalculatorApiHandlerLive -> @taxkit/sdk/effect calculateRunRequest ->
  PublicCalculatorServiceLive -> CalculationEngineLive`; the input-error
  fixture proves the route envelope wraps the same calculator-owned tagged
  error returned by the SDK and service.
- Audit pass 2: fixtures reuse canonical schemas, branded ids, tagged
  constructors and service errors. Health decodes through `HealthResponse`;
  metadata decodes through `CalculatorCatalogResponse`; calculate decodes
  through `CalculatorRunResponse`; errors decode through
  `CalculatorApiErrorEnvelope` and `CalculatorServiceError`; facts and catalog
  assertions use `GrossPay`, `aud`, `AuPayCalculatorId` and rule-owned
  descriptors. No local DTO mirrors or JSON fixtures were added.
- Audit pass 3: the test flow stays Effect-native and inline. It uses
  `Effect.gen`, `Schema.decodeUnknownEffect`, `Array.filter`,
  `Option.match` and `Exit.match`; the only unsafe typed-boundary bypass is
  the documented `@ts-expect-error` external-input parity fixture; no helper
  sprawl, browser/server import leak or public route behaviour change was
  introduced.

### API-COMPAT-003

- Accepted after local review. Correction turns: 0.
- Audit pass 1: final call graph matches the spec target and keeps runtime
  ownership split correctly. `apps/api` starts and stops the Bun process; the
  live smoke only calls public HTTP routes; `@taxkit/api-http` remains the
  route contract, OpenAPI, schema and fixture owner.
- Audit pass 2: smoke lifecycle uses Effect platform/runtime primitives where
  they fit. Command execution uses `ChildProcess` with `BunServices.layer`,
  route calls use `BunHttpClient.layer`, health polling uses `Schedule`,
  expected smoke failures use `Data.TaggedError`, and `Effect.scoped` performs
  cleanup on success and failure.
- Audit pass 3: docs and boundaries are compact and current. The app README
  owns live smoke usage; the API HTTP README owns snapshot, route fixture and
  intentional contract-change workflow; the smoke script reuses canonical
  schemas and constructors with no local DTO mirrors, unsafe casts, manual
  `_tag` literals, browser/server import leaks or helper sprawl.

## Residual Risks

- None known for API-COMPAT-001, API-COMPAT-002 or API-COMPAT-003.
