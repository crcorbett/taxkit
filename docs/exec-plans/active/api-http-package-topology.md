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
| API-HTTP-002 | accepted | Refreshed current docs and public references to `packages/api/http` and `@whattax/api-http`; no new Changeset required beyond the existing rename Changeset. |
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

### 2026-07-01 - API-HTTP-002 accepted

- Refreshed current docs and public references so root maps, architecture docs,
  app/package READMEs, public MDX pages, documentation standards, the
  documentation audit and the manual status snapshot describe the implemented
  HTTP API package as `packages/api/http` / `@whattax/api-http`.
- Updated `docs/product-specs/api-http-package-topology.md` so old
  `packages/http-api` / `@whattax/http-api` references describe the original
  pre-API-HTTP-001 state rather than current package guidance.
- Current-docs old-name audit over root docs, app/package READMEs, public MDX,
  architecture docs, documentation audit, standards and the status snapshot
  found no `@whattax/http-api` or `packages/http-api` matches.
- Current-docs target-name audit confirms those same surfaces use
  `@whattax/api-http` and `packages/api/http` for the implemented package.
- Broad old-name audit found remaining references only in historical
  Changeset/changelog text, active API-HTTP-001 history, completed execution
  plans, product specs/task lists and the SDK boundary-check script's
  intentional stale-import rejection list.
- `bun run docs:validate` passed with 0 issue(s).
- `bun run docs:build` passed.
- `bun run --filter=docs check-types` passed.
- `bun run verification` passed.
- `bun run changeset status --verbose` passed and reports the existing
  `.changeset/api-http-package-topology.md` patch release for
  `@whattax/api-http` plus the fixed release-train packages.
- No new Changeset was added because API-HTTP-002 changed docs/references only,
  did not change package metadata, exports, runtime behaviour or endpoint
  contracts, and the existing API-HTTP-001 Changeset already records the
  package-facing rename and relocation.
- Parent reran `bun run docs:validate`, `bun run docs:build`,
  `bun run --filter=docs check-types`, `bun run verification`,
  `bun run changeset status --verbose`, `git diff --check`, current-docs
  old-name and target-name audits, and broad old-name classification; all
  passed. Remaining old-name references are historical implemented specs/task
  lists, completed execution plans, changelog/Changeset history, active
  API-HTTP-001 history or the intentional SDK stale-import guardrail.

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

### API-HTTP-002

- Audit pass 1: current docs now describe ownership accurately and route deeper
  package/runtime detail to architecture docs or package READMEs instead of
  duplicating package manuals in public MDX.
- Audit pass 2: public docs stay focused on the open-source WhatTax API, SDK,
  calculator and docs surfaces. No private reference-repo details were added.
- Audit pass 3: historical `@whattax/http-api` references remain only in
  changelog/Changeset history, completed-plan history, spec/task-list context,
  active API-HTTP-001 history or the stale-import guardrail script; current
  guidance uses `@whattax/api-http`.
- Call-graph audit: the docs still match the spec's target graph:
  `apps/api` serves `@whattax/api-http/server`, public API docs describe the
  route contract as `@whattax/api-http`, and `apps/web` guidance stays on
  browser-safe `@whattax/api-http/client` exports.
