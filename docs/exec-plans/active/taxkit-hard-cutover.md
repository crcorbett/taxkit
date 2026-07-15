---
status: active
last_reviewed: 2026-07-15
source_of_truth: docs
confidence: high
---

# TaxKit hard cutover execution plan

## Objective

Execute `docs/product-specs/taxkit-hard-cutover.md` one task at a time. One
subagent owns each delegated implementation task; the parent owns local review,
three-pass audits, verification, task acceptance, commits and the final
external GitHub/local-directory cutover. A task with three failed correction
turns stops for replan or user decision.

## Status

| Task | Status | Evidence |
| --- | --- | --- |
| TAXKIT-001 | accepted | Workspace, source, configuration, lint namespace and local domains migrated; parent review and verification accepted. |
| TAXKIT-002 | accepted | Documentation, release metadata and full release-readiness evidence accepted by parent review. |
| TAXKIT-003 | blocked by TAXKIT-002 | Not started. |

## Preflight inventory

- 326 tracked files contain the retired identity before migration.
- 246 files contain the retired package scope.
- 11 files contain the retired environment prefix.
- 10 files contain retired local domains.
- The active GitHub account can access the existing public repository; the
  target repository name is currently available.
- The target npm package is absent. `npm whoami` requires authentication, so
  ownership is unproven and publication is out of scope.

## Decisions

- Current mutable project surfaces must contain only TaxKit identity; no alias
  or compatibility fallback is acceptable.
- Existing Git history, registry records and server redirects are immutable
  history, not current project surfaces.
- Preserve architecture and public behaviour apart from intentional identity
  changes.

## Validation log

### TAXKIT-001

- `bun install --frozen-lockfile` passed.
- `bun run verification` passed.
- `bun test tools/oxlint` passed with 32 tests.
- Focused API, web, docs and SDK type checks passed.
- Live local-domain proof passed for API health and OpenAPI, web root and docs
  root on their TaxKit domains.
- Parent audit pass 1: the app to API/SDK/calculator call graph and package
  ownership remain unchanged apart from owning identity names.
- Parent audit pass 2: schema brands, service IDs and tagged errors were
  renamed in their owners. No decoding exemption, unsafe cast, DTO mirror,
  compatibility alias or fallback config was added.
- Parent audit pass 3: route consumers remain leaf restorers; the renamed
  Oxlint plugin preserves exact decoder-boundary enforcement and its tests.

### TAXKIT-002

- `bun run verification` passed after canonical formatting.
- `bun run docs:validate` passed with 0 documentation-content issues.
- `bun run release:check` passed all nine ordered checks: repository
  verification, workspace tests and builds, docs validation, packed SDK
  artifact proof, strict downstream consumer proof, API smoke, docs browser
  evidence and Changeset status.
- `bun run changeset status --verbose` reports one pending major cutover
  Changeset for `@taxkit/api-http`, `@taxkit/calculators`, `@taxkit/core`,
  `@taxkit/rules-au-income-tax`, `@taxkit/rules-au-pay`,
  `@taxkit/rules-au-stsl`, `@taxkit/sdk`, `@taxkit/testing` and
  `@taxkit/tsconfig`.
- Tracked-tree identity audit passed with no retired identity token in tracked
  file contents or paths.
- Improvement audit pass 1: documentation and release command graphs retain
  the existing app and package owners. The release orchestration remains in
  `@taxkit/scripts`; no validator wrapper or package-ownership change was
  introduced.
- Improvement audit pass 2: packed-artifact and downstream validation prove
  the canonical nine-package closure from tarballs and a clean consumer, with
  no workspace/source leakage or stale package identity.
- Improvement audit pass 3: the Changeset, curated changelogs, package
  changelogs, architecture docs, product specs, completed plans, docs app
  content and local-domain guidance use only the TaxKit identity. No alias,
  redirect or fallback language remains.
- The target npm scope remains unauthenticated on this machine. No versioning
  or publication was attempted; scope ownership must be proven during the
  separately approved release operation.
