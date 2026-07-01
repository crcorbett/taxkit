---
status: active
last_reviewed: 2026-07-01
source_of_truth: execution-plan
confidence: high
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

## Status

| Task | Status | Notes |
| --- | --- | --- |
| API-COMPAT-001 | completed | Package-owned OpenAPI source, normalized snapshot, focused test/scripts, README workflow and Changeset are in place. |
| API-COMPAT-002 | pending | Add route fixtures and SDK parity coverage after API-COMPAT-001 is accepted. |
| API-COMPAT-003 | pending | Add live API app smoke and documentation after API-COMPAT-001 and API-COMPAT-002 are accepted. |

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
  `/api/docs/openapi.json` from a local `OpenApi.fromApi(WhatTaxApi)` value;
  the package test surface was
  `packages/api/http/__tests__/public-calculation-api.test.ts`; live
  `apps/api` smoke coverage remains API-COMPAT-003 scope.
- Added `packages/api/http/src/openapi.ts` as the package-owned OpenAPI source.
  It calls `OpenApi.fromApi(WhatTaxApi)` once, decodes to `Schema.Json`,
  recursively normalizes structured JSON through `Schema`, `Option`,
  `Array`, `Record` and `Order`, and formats the normalized snapshot.
- Updated `packages/api/http/src/server/live.layer.ts` so
  `/api/docs/openapi.json` serves `whatTaxOpenApiSpec` from the shared
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
  `bun run --filter=@whattax/api-http update-openapi-snapshot`.
- Targeted package verification passed:
  `bun run --filter=@whattax/api-http test` (2 files, 3 tests),
  `bun run --filter=@whattax/api-http check-types`,
  `bun run --filter=@whattax/api-http build` and
  `bun run --filter=@whattax/api-http test:openapi`.
- Drift audit passed with an in-memory mutation script: route rename, method
  rename and calculate 400 response schema-reference changes all differed from
  the committed normalized snapshot.
- Shared-source rg audit passed:
  `rg -n "OpenApi\\.fromApi" packages/api/http/src packages/api/http/__tests__`
  reports the only generation call in `packages/api/http/src/openapi.ts`, and
  rg over `whatTaxOpenApiSpec` shows only the docs route and snapshot test
  consuming the package-owned source.
- Boundary/leak audit passed: rg over apps/packages shows no browser app
  imports of the OpenAPI module; only `packages/api/http/src/server/live.layer.ts`
  and the snapshot test consume it.
- Guardrail audit passed: the new OpenAPI path has no `Object.keys`,
  `Object.values`, `Object.entries`, `JSON.parse`, switches, manual `_tag`,
  undefined branching or spread response shaping.
- Changeset evidence passed:
  `.changeset/openapi-snapshot-harness.md` records a patch for
  `@whattax/api-http`; `bun run changeset status --verbose` reports the fixed
  release group would patch to `0.0.4` when applied.
- Parent reran `bun run --filter=@whattax/api-http test`,
  `bun run --filter=@whattax/api-http check-types`,
  `bun run --filter=@whattax/api-http build`,
  `bun run --filter=@whattax/api-http test:openapi`, the in-memory OpenAPI
  drift audit, shared-source rg audits, browser/server import leak audits,
  `bun run verification` and `bun run changeset status --verbose`; all passed.

## Parent Audit Log

### API-COMPAT-001

- Accepted after local review. Correction turns: 0.
- Audit pass 1: final call graph matches the spec target:
  `/api/docs/openapi.json -> whatTaxOpenApiSpec -> OpenApi.fromApi(WhatTaxApi)`;
  snapshot test -> `normalizedWhatTaxOpenApiSpec` from the same module ->
  committed normalized snapshot.
- Audit pass 2: normalization is structured and deterministic. It decodes the
  generated spec to `Schema.Json`, orders JSON object keys with Effect
  `Record`/`Array`/`Order`, recurses over arrays and objects, and does not
  mirror route DTOs or handwrite OpenAPI route shapes.
- Audit pass 3: Effect/schema conventions and package boundaries hold. The
  slice reuses `WhatTaxApi` and Effect OpenAPI types, keeps the docs route in
  the server layer, avoids unsafe casts and helper sprawl, and introduces no
  browser/server import leak.

### API-COMPAT-002

- Pending.

### API-COMPAT-003

- Pending.

## Residual Risks

- None for API-COMPAT-001. API-COMPAT-002 route fixtures and API-COMPAT-003
  live app smoke remain pending and were not started.
