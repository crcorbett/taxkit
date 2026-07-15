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
| TAXKIT-002 | blocked by TAXKIT-001 | Not started. |
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
