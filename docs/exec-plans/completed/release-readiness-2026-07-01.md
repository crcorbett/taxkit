---
status: completed
last_reviewed: 2026-07-01
source_of_truth: execution-plan
confidence: medium
---

# Release readiness 2026-07-01

Goal:
Validate and version the current TaxKit release train, record package and
documentation evidence, and identify the remaining publication gates without
publishing packages.

## Scope

This plan covered:

- pending Changeset impact
- root verification
- workspace tests and builds
- docs validation and docs app build
- SDK type tests, import-boundary checks and packed-artifact smoke checks
- Changesets versioning and generated changelogs
- publication gates that still need explicit approval

This plan did not approve npm publication, remove `private: true` or publish
any package.

## Status

| Area | Status | Notes |
| --- | --- | --- |
| Baseline repo state | complete | Started on `main` at `4496687`, matching `origin/main`; only this slice's edits were present. |
| Root verification | complete | `bun run verification` passed after the release-readiness fixes. |
| Workspace tests | complete | `bun run test` passed after setting an explicit docs-content test timeout. |
| Workspace builds | complete | `bun run build` passed. |
| Docs gates | complete | `bun run docs:validate`, `bun run docs:build` and `bun run --filter=@taxkit/docs-content test` passed. |
| SDK gates | complete | SDK tests, type tests, import-boundary checks, build and packed-artifact smoke checks passed. |
| Changeset audit | complete | Pending Changesets produce patch bumps only. |
| Versioning | complete | `bun run version-repo` consumed pending Changesets and generated `0.0.2` package versions and changelogs. |
| Publication gates | complete | Publication remains blocked on explicit release approval and package-name selection. |

## Validation log

### 2026-07-01 - Plan opened

- Created the active release-readiness plan.
- Confirmed this slice was validation and evidence only.
- No package-facing code or package README change was made when opening the
  plan, so no Changeset was required for the plan file.

### 2026-07-01 - Initial release validation

- `bun run changeset status --verbose` passed and reported patch bumps only.
- `bun run verification` passed.
- `bun run test` initially failed in `@taxkit/docs-content` because
  `serves pages through DocsContentServiceLive` exceeded Vitest's default
  5000 ms test timeout.
- Reran the docs-content policy test with a 20000 ms timeout; it passed in
  6.82 s.
- Updated `packages/docs-content/vitest.config.ts` with `testTimeout: 10_000`.
- `bun run --filter=@taxkit/docs-content test` passed after the timeout
  change.
- `bun run test` then passed for all workspace test tasks.

### 2026-07-01 - Build and docs validation

- `bun run build` passed.
- `bun run docs:validate` passed with 0 docs content issues.
- `bun run docs:build` passed.
- Build output still emits warning-level Rolldown `INVALID_ANNOTATION`
  messages from Effect's bundled HTTP router during web build and docs plugin
  timing warnings. These warnings did not fail the build.

### 2026-07-01 - SDK release checks

- `bun run --filter=@taxkit/sdk test` passed.
- `bun run --filter=@taxkit/sdk build` passed.
- `bun run --filter=@taxkit/sdk test-types` passed.
- `bun run --filter=@taxkit/sdk check-boundaries` passed.
- `bun run --filter=@taxkit/sdk check-packed-artifact` initially failed
  because the smoke script checked the stale `effect.calculate` export name.
- Audited current SDK exports and docs. The current Effect entrypoint exports
  `calculateRunRequest`, `calculateReportRequest`, `calculateReport` and
  `createClient`.
- Updated
  `packages/sdk/typescript/scripts/check-packed-artifact.ts` to smoke the
  current Effect API names.
- `bun run --filter=@taxkit/sdk check-packed-artifact` then passed with
  packed import smoke and packed artifact checks.

### 2026-07-01 - Package-name check

Fresh npm registry checks returned 404 for:

- `taxkit`
- `@taxkit/sdk`
- `@taxkit/core`

Treat this as availability evidence from 2026-07-01, not a reservation. Recheck
immediately before any publication action.

### 2026-07-01 - Final validation

- `bun run verification` passed.
- `bun run changeset status --verbose` passed.
- No package-facing runtime or README behaviour changed in this slice. No
  Changeset was added for test-budget and smoke-script maintenance.

### 2026-07-01 - Versioning

- `bun run version-repo` passed.
- Pending Changeset files were consumed.
- Package versions and package changelogs were updated for the `0.0.2` patch
  release train.
- Added explicit changelog notes for fixed-release-only `@taxkit/testing` and
  `@taxkit/tsconfig` version bumps.
- Post-version `bun run verification` passed.
- Post-version `bun run test` passed.
- Post-version `bun run build` passed.
- Post-version `bun run --filter=@taxkit/sdk check-packed-artifact` passed.
- Post-version `bun run changeset status --verbose` returned the expected
  release-commit failure because package files changed and the Changeset files
  had been consumed. Do not add a replacement Changeset for the version commit.

## Changeset impact

The versioned release train is patch-only:

- `@taxkit/sdk` -> `0.0.2`
- `@taxkit/http-api` -> `0.0.2`
- `@taxkit/calculators` -> `0.0.2`
- `@taxkit/core` -> `0.0.2`
- `@taxkit/rules-au-income-tax` -> `0.0.2`
- `@taxkit/rules-au-pay` -> `0.0.2`
- `@taxkit/docs-content` -> `0.0.2`
- `@taxkit/docs-fumadocs` -> `0.0.2`
- `@taxkit/rules-au-stsl` -> `0.0.2`
- `@taxkit/testing` -> `0.0.2`
- `@taxkit/tsconfig` -> `0.0.2`

The release contains no minor or major bumps.

## Findings

- The repo has been versioned for an internal/private patch release commit.
- Public npm publication is not approved by this plan.
- The docs-content rendered MDX service test needs more than Vitest's default
  timeout on this machine. The explicit 10000 ms timeout now matches observed
  runtime.
- The SDK packed-artifact smoke check had drifted behind the current Effect
  API names. It now checks the documented public Effect entrypoint surface.

## Residual risks

- Package names remain unreserved until publication. Recheck npm immediately
  before publishing.
- Publication still requires explicit approval to choose `taxkit` versus
  `@taxkit/sdk`, remove `private: true` and publish.
- Build warnings from upstream Effect/Rolldown pure annotations remain
  warning-level. They should be monitored, but they are not a release blocker
  for this validation pass.
- This pass prepared the version commit only. Npm publication and package-name
  reservation remain undone.
