---
document_type: runbook-index
lifecycle: current
authority: canonical
owner: taxkit-runbook-contract-owner
last_reviewed: 2026-07-22
review_trigger: release command, Changesets, package graph, evidence, recovery, or authority-boundary change
---

# TaxKit runbooks

This index routes repeatable operational work. Runbooks own steps; architecture
and skills teach boundaries and judgment without copying these procedures.

| ID | Canonical path | Operation owner |
| --- | --- | --- |
| `release-readiness` | `docs/runbooks/release-readiness.md` | `taxkit-release-readiness-operation-owner` |
| `versioning` | `docs/runbooks/versioning.md` | `taxkit-versioning-operation-owner` |
| `packed-consumer-proof` | `docs/runbooks/packed-consumer-proof.md` | `taxkit-packed-consumer-operation-owner` |
| `recovery` | `docs/runbooks/recovery.md` | `taxkit-recovery-operation-owner` |

These are exactly the four canonical TaxKit runbooks. Before any consequential
operation, apply the [authority model](../operations/authority-model.md). Run
`bun run check:runbooks` to inspect their structural and semantic contract. The
validator executes no documented command and writes only the ignored bounded
receipt `tmp/runbook-validation-report.json`.
