---
status: canonical
last_reviewed: 2026-06-25
source_of_truth: docs
confidence: medium
---

# Documentation structure and development docs

## Overview

TaxKit needs a Mobius-style documentation structure before deeper engine work
accelerates. The repo currently has useful architecture docs, but no product
spec surface, design-doc bucket, exec-plan bucket, references bucket, package
README coverage or short root atlas.

This spec defines the first documentation migration slice.

## Implementation status

Implemented in the current repo. The sibling task list is marked implemented,
and the resulting docs buckets, local skills, metadata, README coverage and
documentation audit remain the baseline structure for future specs.

## Problem

The current architecture docs describe a broad target system, but the repo does
not yet distinguish durable architecture, active specs, execution plans,
external references and package-local docs. That makes it hard to tell whether
future work is implementation debt, spec debt or stale planning.

## Goals

- Add the canonical docs buckets: `docs/architecture/`, `docs/design-docs/`,
  `docs/exec-plans/`, `docs/product-specs/` and `docs/references/`.
- Add TaxKit-adapted `prd-writer` and `prd-implementer` skills.
- Add freshness metadata to canonical docs.
- Split deeper architecture topics into focused docs for Effect services,
  package ownership, frontend, content/posts, deployment and testing quality.
- Normalize app/package README coverage for the current and near-term package
  roots.
- Keep root `AGENTS.md` as a short atlas with task-type routing.
- Add a documentation audit that records current inventory, README coverage,
  stale or missing docs and migration priorities.

## Non-goals

- Implement tax engine packages.
- Create a full public docs site.
- Add private downstream product content.
- Bulk-copy Mobius docs that mention Mobius-specific package families.

## Ownership and boundaries

- Root `AGENTS.md` owns agent routing only.
- `docs/architecture/*` owns durable architecture and package boundaries.
- `docs/design-docs/*` owns durable documentation philosophy and engineering
  beliefs.
- `docs/product-specs/*` owns current implementation intent.
- `docs/exec-plans/*` owns active implementation progress.
- App and package root `README.md` files own local scope, runtime shape,
  guardrails and related docs.

## Proposed approach

1. Copy the Mobius PRD skills into `.agents/skills/` and adapt their references
   to TaxKit.
2. Create the docs buckets and authoring guides needed by those skills.
3. Add metadata to existing architecture docs.
4. Add focused architecture docs for the deeper topics now visible in the
   architecture overview.
5. Add README coverage for `apps/web`, `packages/core`, `packages/scripts` and
   `packages/ui`.
6. Add a short root `AGENTS.md` atlas that routes by task type and only points
   at files that exist.
7. Add a documentation audit as the reviewable baseline for follow-up work.

## Risks and tradeoffs

- New docs can become aspirational if they point at packages that do not exist.
  The root atlas should only link to existing files.
- Copying Mobius wording too directly can leak unrelated product assumptions.
  TaxKit docs should stay focused on open-source tax rules, calculators, API,
  SDK and docs.
- Creating too many docs at once can reduce navigability. Each new doc should
  have a narrow role and link back to the index.

## Acceptance criteria

- `.agents/skills/prd-writer` and `.agents/skills/prd-implementer` exist and
  route to TaxKit docs.
- `docs/design-docs/`, `docs/exec-plans/`, `docs/product-specs/` and
  `docs/references/` have canonical entrypoints.
- Existing canonical architecture docs include freshness metadata.
- Architecture topics for Effect services, package ownership, frontend,
  content/posts, deployment and testing quality exist.
- `AGENTS.md` is a short atlas and does not link to missing docs.
- `apps/web/README.md`, `packages/core/README.md`,
  `packages/scripts/README.md` and `packages/ui/README.md` exist.
- `docs/documentation-audit/README.md` records inventory, package README
  coverage, missing/stale docs and migration priorities.
- `bun run verification` still passes.

## References

- [Architecture overview](../architecture/README.md)
- [Package ownership](../architecture/package-ownership.md)
- [Agent-first documentation](../design-docs/agent-first-documentation.md)
- [Writing specs](./writing-specs.md)
- [Documentation audit](../documentation-audit/README.md)
