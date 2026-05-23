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

- The root `README.md` still reads as a minimal landing page. It is acceptable
  for now, but it should eventually route to the docs buckets and package
  READMEs more explicitly.
- An active exec plan exists for the documentation improvement roadmap. No
  other active exec-plan examples exist yet.
- The architecture docs describe package families that are not implemented yet;
  root routing should avoid presenting those planned packages as current code.

## Proposed Migration Priorities

1. Refresh the root `README.md` so it routes to current package docs, docs
   buckets and the status snapshot.
2. Create the first engine package slice under `packages/core/*` and keep its
   README aligned as code appears.
3. Add `apps/docs` only when the public docs app is actually scaffolded.
4. Add `apps/api` only when calculation endpoints move beyond the health
   scaffold.
5. Add package-boundary tests once browser-safe and server-only export surfaces
   exist beyond the current health API.
6. Keep this audit updated when new package roots or docs buckets are added.
