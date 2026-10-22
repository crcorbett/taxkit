---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: docs
confidence: high
---

# Agent-First Documentation

TaxKit docs should help humans and agents route quickly to the current source
of truth.

## Principles

- Root `AGENTS.md` is a short atlas, not the manual.
- Architecture docs own durable boundaries and invariants.
- Product specs own current implementation intent while the work is active.
- Exec plans own live implementation progress while the work is active.
- Package and app READMEs own local runtime shape and guardrails.
- Finished specs, plans and dated receipts are deleted; Git keeps history.

## Guardrails

- Prefer one canonical doc per topic.
- Link to the owning doc instead of duplicating content.
- Keep public TaxKit docs focused on the open-source engine, API, SDK and docs
  site.
- Include compact call-graph diagrams in docs that describe runtime behavior,
  service/package boundaries, API/SDK flows, frontend data flow or test layer
  wiring.

## Maintenance Triggers

Update documentation when a change adds or moves ownership, runtime boundaries,
public surfaces, implementation intent or development workflow.

- Ownership change: update the owning package/app `README.md` and the
  relevant architecture doc when ownership moves between roots.
- New app or package root: add or update its root `README.md`, then update
  `README.md` and `AGENTS.md` only when the root should be discoverable from
  the repo root.
- Runtime boundary change: update the local README and architecture doc in the
  same slice, especially for server-only exports, browser-safe exports and
  Effect layer composition. Include current and final call graphs when an
  existing flow changes.
- New architecture boundary: update the owning `docs/architecture/*` page and
  link it from `docs/architecture/README.md` only after the file exists.
- Public API, SDK or browser/runtime change: update package READMEs and the
  relevant architecture page in the same slice.
- Spec change: update the product spec and its sibling task list together when
  sequencing, verification gates, call graphs or acceptance criteria change.
- Multi-slice implementation: add or update the active exec plan before work
  begins, record progress as slices land and delete it when the work merges.

Do not add atlas links, package routes or status claims for missing
implementation. Planned ownership areas should say they are planned until a
package manifest, source exports and verification exist.

Add a generated documentation inventory only after repeated manual drift
demonstrates the need and the proposal identifies an owner, canonical input
model, deterministic output, focused tests and a simpler maintenance graph. Do not create a package or
generator merely because a future repository may be larger.
