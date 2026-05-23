---
status: draft
last_reviewed: 2026-05-23
source_of_truth: documentation-audit
confidence: medium
---

# Documentation Audit

## Current Docs Inventory

Current tracked documentation entrypoints:

- `README.md`
- `AGENTS.md`
- `docs/architecture/`
- `docs/design-docs/`
- `docs/exec-plans/`
- `docs/product-specs/`
- `docs/references/`
- `apps/web/README.md`
- `packages/core/README.md`
- `packages/http-api/README.md`
- `packages/scripts/README.md`
- `packages/tsconfig/README.md`
- `packages/ui/README.md`

Current architecture docs cover facts, rules, calculators, graph/trace/ledgers,
API/SDK, package boundaries, package ownership, Effect services, frontend,
content/posts, deployment and testing quality.

## Package README Coverage

Current app/package roots with package manifests:

- `apps/web`: covered by `apps/web/README.md`
- `packages/http-api`: covered by `packages/http-api/README.md`
- `packages/tsconfig`: covered by `packages/tsconfig/README.md`

Requested near-term package roots:

- `packages/core`: covered by `packages/core/README.md`
- `packages/scripts`: covered by `packages/scripts/README.md`
- `packages/ui`: covered by `packages/ui/README.md`

## Missing Or Stale Docs

- An active exec plan exists for the documentation improvement roadmap. No
  other active exec-plan examples exist yet.
- `docs/repo-status-outline.html` is a manual snapshot. It is linked from the
  root README, but it can drift and must be refreshed after material repo-shape
  or implemented-surface changes.
- Planned package roots `packages/core`, `packages/scripts` and `packages/ui`
  have README guidance only. They still need package manifests, source exports
  and verification before they become runtime packages.
- `apps/api`, `apps/docs`, `packages/api/*`, `packages/sdk/*`,
  `packages/domain/*` and `packages/rules/*` remain planned architecture, not
  implemented code.
- No generated documentation inventory exists yet; this audit is maintained by
  hand.

## Docs Maintenance Convention

The canonical maintenance convention lives in
`docs/design-docs/agent-first-documentation.md`.

At audit time, check that:

- new package or app roots have local READMEs when they gain manifests, exports
  or commands
- root routing only links to files and package roots that exist
- ownership, runtime boundary and public-surface changes update the owning
  architecture docs
- specs and sibling task lists stay aligned when sequencing or acceptance
  criteria change
- `docs/repo-status-outline.html` is refreshed or explicitly treated as a
  snapshot
- planned package families stay labelled as planned until manifests, source
  exports and verification exist

## Proposed Migration Priorities

1. Create the first engine package slice under `packages/core/*` and keep its
   README aligned as code appears.
2. Add `apps/docs` only when the public docs app is actually scaffolded.
3. Add `apps/api` only when calculation endpoints move beyond the health
   scaffold.
4. Add package-boundary tests once browser-safe and server-only export surfaces
   exist beyond the current health API.
5. Decide whether the status snapshot should stay manual or become generated
   once repo status changes frequently enough to justify automation.
6. Add a generated docs inventory only if manual audit drift becomes a recurring
   source of mistakes.
7. Keep this audit updated when new package roots or docs buckets are added.
