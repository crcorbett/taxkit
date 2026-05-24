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
| CALC-SVC-003 | pending | Move calculation execution and expected error shaping into service methods. |
| CALC-SVC-004 | pending | Final docs, changelog and smoke evidence. |

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
