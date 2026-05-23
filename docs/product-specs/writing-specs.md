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
3. Goals
4. Non-goals
5. Ownership and boundaries
6. Proposed approach
7. Risks and tradeoffs
8. Acceptance criteria
9. References

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
- Make acceptance criteria concrete enough to verify.
- Use `bun run verification` as the default repo-level acceptance gate when a
  spec changes code, docs wiring, package metadata or task plans.
