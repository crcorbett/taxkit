---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: high
---

# Writing Specs

Use this guide when creating a new SPEC, PRD or design brief for WhatTax.

## Choose The Right Home

| Need | Canonical Home |
| --- | --- |
| current product intent, behavior, scope | `docs/product-specs/` |
| ordered implementation spikes and verification gates | `docs/product-specs/<topic>.tasks.json` |
| durable architecture, boundaries, invariants | `docs/architecture/` |
| design principles and engineering beliefs | `docs/design-docs/` |
| active implementation sequencing and validation log | `docs/exec-plans/active/` |
| external or vendor references | `docs/references/` |

## Recommended Spec Shape

1. Overview
2. Problem
3. Call graphs
4. Goals
5. Non-goals
6. Ownership and boundaries
7. Proposed approach
8. Tests and verification
9. Risks and tradeoffs
10. Versioning and changelog impact
11. Acceptance criteria
12. References

## Call Graphs

Specs that describe runtime behavior, service boundaries, package boundaries,
public APIs, SDK flows, frontend data loading or test/runtime wiring MUST
include compact call-graph diagrams. Use fenced `ts` blocks with indentation
and `->` arrows so the graph can be copied into code review, task prompts and
implementation plans.

Include the current graph and target graph when a spec changes an existing
flow:

```ts
Production: current

caller
  -> current boundary
    -> current service
```

```ts
Production: target

caller
  -> target boundary
    -> target service
```

Add a `Tests:` graph when implementation requires mocks, alternate layers,
browser-safe entrypoints, packed artifact checks or downstream validation:

```ts
Tests: target

test harness
  -> public entrypoint
    -> test layer or production layer
    -> assertion surface
```

Keep diagrams factual and package-owned. Do not invent planned package names,
routes, layers or services unless the spec explicitly creates them. Link to
the owning architecture doc for durable boundary rules instead of expanding
the diagram into a tutorial.

## Freshness Metadata

Canonical specs should include:

```yaml
status: canonical | draft | historical
last_reviewed: YYYY-MM-DD
source_of_truth: docs
confidence: high | medium | low
```

## Quality Bar

- Verify package names and paths against current code.
- Link to architecture docs instead of restating them.
- Keep specs compact enough to scan quickly.
- Include call-graph diagrams for runtime, API, SDK, frontend, package-boundary
  or test-harness changes.
- Make acceptance criteria concrete enough to verify.
- For multi-slice delegated work, acceptance criteria must require parent
  review of each subagent diff against the spec, task list and architecture
  docs before the next task begins.
- Use `bun run verification` as the default repo-level acceptance gate when a
  spec changes code, docs wiring, package metadata or task plans.
- Package-facing specs must define the expected Changeset impact: affected
  release-train packages, semver bump level, and user-facing changelog theme.
  Specs that do not affect package installation, package exports or package
  behavior must say that no Changeset is required and why.
