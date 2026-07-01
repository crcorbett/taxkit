---
status: active
last_reviewed: 2026-07-01
source_of_truth: execution-plan
confidence: medium
---

# API HTTP Package Topology Execution Plan

Spec:
[API HTTP package topology](../../product-specs/api-http-package-topology.md)

Task list:
[`api-http-package-topology.tasks.json`](../../product-specs/api-http-package-topology.tasks.json)

Goal:
Implement the API HTTP package topology task list sequentially. Each task is
delegated to one subagent when available; the parent agent reviews, audits,
verifies call graphs and mandatory gates, accepts the task, updates this plan
and commits each coherent slice before delegating the next task. After the
third failed parent correction turn for the same task, the rollout stops for
replan or user decision.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| API-HTTP-001 | accepted | Relocated `packages/http-api` to `packages/api/http`, renamed the package to `@whattax/api-http`, updated runtime imports/config and passed mandatory gates. |
| API-HTTP-002 | pending | Refresh current docs and public references after relocation. |
| API-HTTP-003 | pending | Complete compatibility, API smoke and release-train audit. |

## Validation Log

### 2026-07-01 - Planning

- Read `prd-implementer`, the target spec, sibling task list and
  `docs/exec-plans/implementing-specs.md`.
- Read relevant architecture docs:
  `docs/architecture/api-and-sdk.md`,
  `docs/architecture/package-ownership.md`,
  `docs/architecture/frontend.md` and
  `docs/architecture/testing-and-quality.md`.
- Created the active goal for sequential task-list implementation with one
  subagent per task, parent review/audit/verification before each next task,
  and a hard stop after the third failed parent correction turn for one task.
- Created this active execution plan before runtime/package metadata edits.

### 2026-07-01 - API-HTTP-001 accepted

- Moved the tracked HTTP API package from `packages/http-api` to
  `packages/api/http` without leaving a compatibility package at the old path.
- Renamed package metadata and current runtime/source/config imports from
  `@whattax/http-api` to `@whattax/api-http`.
- Added the root workspace glob `packages/api/*`, updated Knip workspace and
  ignore paths, updated `.changeset/config.json`, refreshed `bun.lock` and
  updated the SDK import-boundary script to read
  `packages/api/http/package.json`.
- Added `.changeset/api-http-package-topology.md` as a patch Changeset for the
  renamed package.
- `bun install --lockfile-only` passed and refreshed `bun.lock`.
- `bun run --filter=@whattax/api-http test` first exposed missing local package
  dev-dependency binaries in the install; after `bun install`, rerun passed
  with 1 file and 2 tests.
- `bun run --filter=@whattax/api-http check-types` passed.
- `bun run --filter=@whattax/api-http build` passed.
- `bun run --filter=api check-types` passed.
- `bun run --filter=api build` passed.
- `bun run --filter=web check-types` passed.
- `bun run --filter=@whattax/sdk check-boundaries` passed.
- Source/config import audit over current app/package runtime surfaces found no
  remaining `@whattax/http-api` or `packages/http-api` references.
- `bun run verification` passed after formatting the edited SDK boundary script.
- `bun run changeset status --verbose` passed and reports patch impact for
  `@whattax/api-http` plus the repo fixed group.
- Parent review hardened the SDK boundary check to reject both
  `@whattax/api-http` and stale `@whattax/http-api` imports or package
  metadata dependencies.
- Parent reran `bun install --lockfile-only`,
  `bun run --filter=@whattax/api-http test`,
  `bun run --filter=@whattax/api-http check-types`,
  `bun run --filter=@whattax/api-http build`,
  `bun run --filter=api check-types`, `bun run --filter=api build`,
  `bun run --filter=web check-types`,
  `bun run --filter=@whattax/sdk check-boundaries`,
  the narrowed stale-reference audit, `bun run verification`,
  `bun run changeset status --verbose` and `git diff --check`; all passed.

## Parent Audit Log

### API-HTTP-001

- Audit pass 1: production and test call graphs still match the target spec:
  `apps/api` imports `@whattax/api-http/server`, `apps/web` imports
  browser-safe `@whattax/api-http/client`, `@whattax/api-http/client/live` and
  `@whattax/api-http/config`, and HTTP API tests still use the in-process
  client over `WhatTaxServerLayer`.
- Audit pass 2: package boundaries remain intact. `apps/api` still owns Bun
  server startup and process lifecycle, `@whattax/api-http` owns HTTP transport
  contracts/layers, `@whattax/calculators` owns calculator orchestration and
  `@whattax/sdk` has no `@whattax/api-http` dependency.
- Audit pass 3: the slice did not redesign handlers, route schemas, calculator
  logic, SDK facades or endpoint paths. No new unsafe casts, local DTO mirrors,
  helper sprawl or browser/server import leaks were introduced.
