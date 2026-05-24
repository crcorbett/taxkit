---
status: active
last_reviewed: 2026-05-24
source_of_truth: docs
confidence: medium
---

# Extract Public Calculator Service Execution Plan

## Goal

Implement
[Extract Public Calculator Service](../../product-specs/extract-public-calculator-service.md)
through the ordered task list at
[extract-public-calculator-service.tasks.json](../../product-specs/extract-public-calculator-service.tasks.json).

The rollout MUST keep calculator behavior reusable outside HTTP. HTTP handlers
must become thin transport adapters over `@whattax/calculators` service methods.

## Operating Rules

- Implement one task-list slice at a time.
- Delegate exactly one bounded task to a subagent where useful.
- Parent-review each diff against the spec, task object and architecture docs
  before accepting the slice.
- Run `bun run verification` for each accepted slice.
- Add or update Changesets for package-facing slices.
- Commit only after the coherent slice passes verification and review.

## Task Status

| Task | Status | Notes |
| --- | --- | --- |
| CALC-SVC-001 | complete | Added `@whattax/calculators` package shell. Parent verification passed. Commit `0bb699b`. |
| CALC-SVC-002 | complete | Moved reusable schemas, catalog and metadata projections into `@whattax/calculators`. Parent verification passed. |
| CALC-SVC-003 | complete | Moved calculation execution and expected error shaping into `PublicCalculatorService`. Parent verification and API smoke passed. |
| CALC-SVC-004 | complete | Final docs, changelog and smoke evidence. |

## Validation Log

### CALC-SVC-001

- Commit: `0bb699b Add calculators package shell`
- Verification:
  - `bun run --filter=@whattax/calculators check-types` passed.
  - `bun run --filter=@whattax/calculators build` passed.
  - `bun changeset status --verbose` previews a patch bump for
    `@whattax/calculators`.
  - `bun run verification` passed.
- Parent review:
  - Package exports expose only `src/index.ts`.
  - Package README states calculator ownership and forbids HTTP/app runtime
    imports.
  - `knip.json` includes the new workspace package.
  - Architecture docs list `packages/calculators` as an implemented shell while
    clearly noting runtime behavior has not moved yet.
  - Import audit found no source imports from `@whattax/http-api`, `apps/api`,
    `apps/web`, `runtime.server` or `runtime.client`; matches were README
    guardrail text only.

### CALC-SVC-002

- Verification:
  - `bun run --filter=@whattax/calculators check-types` passed.
  - `bun run --filter=@whattax/calculators build` passed.
  - `bun run --filter=@whattax/http-api check-types` passed.
  - `bun changeset status --verbose` previews patch bumps for
    `@whattax/calculators` and `@whattax/http-api`.
  - `bun run verification` passed.
- Lint coverage:
  - Temporary `packages/calculators/src/__oxlint-scope-check.ts` intentionally
    failed with WhatTax scoped lint rules for raw `typeof`, `null`,
    `in`, thrown errors, native array methods, native `Map`, ad hoc JSON,
    hidden time and nested wrapper calls.
  - The temporary fixture was removed before verification.
- Parent review:
  - Reusable calculator schemas now live in
    `packages/calculators/src/schemas.ts`.
  - Reusable catalog entries now live in
    `packages/calculators/src/catalog.ts`.
  - Metadata projection helpers now live in
    `packages/calculators/src/metadata.ts`.
  - `packages/http-api/src/groups/calculators.ts` now owns route-only HTTP
    schemas, the bad-request envelope, OpenAPI annotations and compatibility
    exports.
  - `@whattax/http-api` now depends on `@whattax/calculators` instead of
    importing AU rule packages directly.
  - `@whattax/calculators` source has no imports from `@whattax/http-api`,
    `apps/api`, `apps/web`, `runtime.server` or `runtime.client`.
  - Audits found no `Object.entries`, `Object.values`, manual `_tag` object
    literals, unsafe casts or non-null assertions in changed source files.
  - `packages/http-api/src/groups/calculators.ts` no longer contains catalog
    entries or descriptor transformation logic.

### CALC-SVC-003

- Verification:
  - `bun run --filter=@whattax/calculators check-types` passed.
  - `bun run --filter=@whattax/http-api check-types` passed.
  - `bun run verification` passed.
  - `bun changeset status --verbose` previews patch bumps for
    `@whattax/calculators` and `@whattax/http-api`.
- API smoke:
  - Started `apps/api` with `API_HOST=127.0.0.1 API_PORT=4027`.
  - `/api/docs/openapi.json` includes all public `/api/v1` calculator,
    fact and rule routes, including
    `/api/v1/calculators/{calculatorId}/calculate`.
  - `/api/v1/calculators` returns `au.pay.take-home`,
    `au.pay.withholdings` and `au.income-tax.annual`.
  - `POST /api/v1/calculators/au.pay.take-home/calculate` returned
    `200 OK`, `calculatorId = au.pay.take-home`, `netPay.cents = 119600`
    `withholdingsTotal.cents = 30400` and no graph issues.
  - Missing `grossPay.period` with `help=errors` returned `400 Bad Request`
    with issue path `["grossPay", "period"]` and descriptor-backed help.
- Lint coverage:
  - Temporary `packages/calculators/src/__oxlint-scope-check.ts`
    intentionally failed with WhatTax scoped lint rules for raw `typeof`,
    `in`, undefined comparison, conditional object spread, context `??`
    defaulting, thrown errors, native array methods, native `Map`,
    ad hoc JSON and `await new Promise`.
  - The temporary fixture was removed before verification.
- Parent review:
  - `packages/calculators/src/service.ts` defines the
    `PublicCalculatorService` contract only.
  - `packages/calculators/src/live.layer.ts` owns catalog lookup, optional
    context validation through `Option`, graph validation, calculation
    execution and response construction.
  - `packages/calculators/src/errors.ts` owns schema decode issue formatting
    and descriptor-backed help construction.
  - `packages/http-api/src/handlers/calculators.ts` delegates route input to
    `PublicCalculatorService` and maps tagged service errors into the
    route-only `PublicErrorEnvelope`.
  - `packages/http-api/src/server/live.layer.ts` composes
    `PublicCalculatorServiceLive` with `CalculationEngineLive` through
    `HttpRouter.provideRequest(...)` so request handlers see the service at
    runtime.
  - Audits found no `@whattax/http-api` or app imports in
    `packages/calculators/src`.
  - Audits found no `validateRuleGraph`, `SchemaIssue`,
    `CalculationEngineLive`, rule-pack layer composition, raw undefined
    context branches, payload jurisdiction defaults, conditional help object
    spreads or inline schema issue path formatting in
    `packages/http-api/src/handlers/calculators.ts`.

### CALC-SVC-004

- Verification:
  - `bun run verification` passed.
  - `bun changeset status --verbose` passed and previews fixed release-train
    patch bumps, including `@whattax/calculators 0.0.2` and
    `@whattax/http-api 0.0.2`.
- API smoke:
  - Started `apps/api` with `API_HOST=127.0.0.1 API_PORT=4027`.
  - `/api/docs/openapi.json` includes all public `/api/v1` calculator,
    fact and rule routes, including
    `/api/v1/calculators/{calculatorId}/calculate`.
  - `/api/v1/calculators` returns `au.pay.take-home`,
    `au.pay.withholdings` and `au.income-tax.annual`.
  - `POST /api/v1/calculators/au.pay.take-home/calculate` returned
    `200 OK`, `calculatorId = au.pay.take-home`, `netPay.cents = 119600`,
    `withholdingsTotal.cents = 30400` and `graphIssueCount = 0`.
  - Missing `grossPay.period` with `help=errors` returned `400 Bad Request`
    with `_tag = CalculatorInputDecodeError`, issue path
    `["grossPay", "period"]` and two descriptor-backed help entries.
- Docs and release audit:
  - Root docs and package READMEs now describe `@whattax/calculators` as the
    reusable calculator orchestration package.
  - `@whattax/http-api` docs now describe thin transport handlers over
    `PublicCalculatorService`.
  - Package ownership docs describe `packages/calculators` as implemented, not
    a planned placeholder or package shell.
  - `CHANGELOG.md` and `.changeset/public-calculator-service.md` describe the
    release-train impact without running `bun run version-repo`.
  - Stale-doc audits found no nested API calculator package references and no
    claims that calculator business logic belongs in HTTP handlers.
