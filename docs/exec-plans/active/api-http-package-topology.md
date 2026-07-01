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
| API-HTTP-003 | accepted | Final package, app, docs, SDK-boundary, API smoke and release-train validation passed. |

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

### 2026-07-01 - API-HTTP-003 accepted

- Re-read `AGENTS.md`, the target spec, API-HTTP-003, this active plan,
  `docs/exec-plans/implementing-specs.md`, the relevant architecture docs and
  documentation evidence standards before validation.
- Verified `packages/api/http/package.json` names `@whattax/api-http`, keeps
  `private: true`, and exposes the target subpaths:
  `.`, `./api`, `./client`, `./client/live`, `./client/server`, `./config`,
  `./server`, `./handlers` and `./handlers/live`.
- Verified root workspace metadata includes `packages/api/*`, `bun.lock`
  resolves `@whattax/api-http` to `workspace:packages/api/http`, Knip points
  at `packages/api/http`, and `.changeset/config.json` names
  `@whattax/api-http`.
- Verified no implemented package remains at `packages/http-api`.
- Verified current app/package source imports:
  `apps/api/src/server.ts` imports `@whattax/api-http/server`; `apps/web`
  source imports only `@whattax/api-http/client`,
  `@whattax/api-http/client/live` and `@whattax/api-http/config`; SDK source
  and package metadata have no `@whattax/api-http` or `@whattax/http-api`
  dependency.
- Verified the SDK boundary guard still rejects both `@whattax/api-http` and
  stale `@whattax/http-api` SDK imports while requiring the HTTP API package
  to depend on `@whattax/sdk`.
- `bun run --filter=@whattax/api-http test` passed with 1 file and 2 tests.
- `bun run --filter=@whattax/api-http check-types` passed.
- `bun run --filter=@whattax/api-http build` passed.
- `bun run --filter=api check-types` passed.
- `bun run --filter=api build` passed.
- `bun run --filter=web check-types` passed.
- `bun run --filter=@whattax/sdk check-boundaries` passed with
  `SDK import boundaries passed.`
- `bun run docs:validate` passed with 0 issue(s).
- `bun run test` passed with 17 successful Turbo tasks across the workspace.
- `bun run build` passed with 13 successful Turbo tasks. The build still emits
  a non-fatal Rolldown `INVALID_ANNOTATION` warning from Effect's bundled
  `HttpRouter.js`; this did not fail the build.
- `bun run verification` passed: lint, format check, Knip and workspace
  typecheck completed successfully.
- `bun run changeset status --verbose` passed. It reports
  `.changeset/api-http-package-topology.md` as the patch Changeset for
  `@whattax/api-http` to `0.0.3`; because this repo uses a fixed release
  group, the status also reports patch bumps for `@whattax/core`,
  `@whattax/rules-au-income-tax`, `@whattax/rules-au-pay`,
  `@whattax/rules-au-stsl`, `@whattax/sdk`, `@whattax/testing`,
  `@whattax/tsconfig` and `@whattax/calculators`. No minor or major release
  impact is reported.
- Started the local API app with
  `API_HOST=127.0.0.1 API_PORT=4027 bun run --filter=api start`.
- API smoke: `GET /api/health` returned `200` with
  `{ "service": "whattax", "status": "ok" }`.
- API smoke: `GET /api/v1/calculators` returned `200` with 3 calculator ids:
  `au.pay.take-home`, `au.pay.withholdings` and `au.income-tax.annual`.
- API smoke:
  `POST /api/v1/calculators/au.pay.take-home/calculate` with canonical tagged
  `GrossPay` and `Money` values returned `200`,
  `calculator.calculatorId = "au.pay.take-home"`,
  `report._tag = "TakeHomePayReport"`,
  `report.withholdingsTotal.cents = 30400`,
  `report.netPay.cents = 119600` and 0 graph issues.
- API smoke: `GET /api/docs/openapi.json` returned `200`,
  `info.title = "WhatTax API"`, 10 paths and confirmed entries for
  `/api/health`, `/api/v1/calculators` and
  `/api/v1/calculators/{calculatorId}/calculate`.
- Broad old-name source/package audit found no current implemented app or
  package source, package metadata, workspace metadata, lockfile, Knip or
  Turbo references to the old package, except intentional historical changelog
  text and the SDK boundary-check stale-import rejection list.
- Remaining old-name documentation references are classified as historical
  implemented specs/task lists, completed execution plans, changelog/Changeset
  history, active API-HTTP-001/API-HTTP-002 history, the target spec's
  pre-rename context or the SDK stale-import guardrail.
- No package metadata, source, Changeset or docs corrections were required
  beyond this final evidence update.
- Parent acceptance reran `bun run --filter=@whattax/api-http test`,
  `bun run --filter=@whattax/sdk check-boundaries`, `bun run docs:validate`,
  `bun run verification`, `bun run changeset status --verbose`,
  `git diff --check` and a fresh local API smoke on `127.0.0.1:4028`; all
  passed. The parent smoke confirmed the calculate response values recorded
  above.
- The validation worker left final evidence unstaged per the delegated handoff;
  the parent agent accepted and commits this slice after review.

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

### API-HTTP-003

- Audit pass 1: full source/import graph matches the target production and
  test call graphs. `apps/api` owns Bun startup and serves
  `@whattax/api-http/server`; `ApiRoutesLive` owns API routes, generated docs
  and OpenAPI JSON; `CalculatorApiHandlerLive` calls
  `@whattax/sdk/effect` `calculateRunRequest`; HTTP API tests use
  `@whattax/api-http/client/server` over `WhatTaxServerLayer`; `apps/web`
  stays on browser-safe client/config exports.
- Audit pass 2: package metadata, workspaces, lockfile, filters, Changeset and
  changelog naming are coherent. The implemented package is
  `packages/api/http` / `@whattax/api-http`; `packages/http-api` is absent;
  `.changeset/api-http-package-topology.md` targets `@whattax/api-http` only;
  fixed release-train patch bumps are reported by Changesets but no
  `@whattax/http-api` package bump exists.
- Audit pass 3: no residual old-name current guidance, browser/server import
  leaks, SDK HTTP API dependency, unsafe casts, DTO mirrors or new helper
  sprawl were introduced. Existing generated route-tree casts and `as const`
  literals are outside this final validation correction scope.

## Residual risks

- Product specs and task lists with `status: implemented` still contain
  historical `@whattax/http-api` and `packages/http-api` wording from their
  original implementation context. API-HTTP-002 deliberately left these as
  historical source material rather than rewriting old specs as current
  guidance.
- Changelog and Changeset history still mention `@whattax/http-api` to explain
  earlier package ownership and the rename. This is expected release history.
- The build continues to print a non-fatal Rolldown
  `INVALID_ANNOTATION` warning from Effect's bundled `HttpRouter.js`. The
  warning did not fail `bun run build`.
- Final plan evidence is committed as the API-HTTP-003 validation slice after
  parent review.
