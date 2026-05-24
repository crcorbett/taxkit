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
| CALC-SVC-002 | pending | Move reusable schemas, catalog and metadata projections. |
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
