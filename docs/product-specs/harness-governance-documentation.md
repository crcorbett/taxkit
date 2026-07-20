---
document_type: product-spec
lifecycle: current
authority: canonical
owner: taxkit-documentation-owner
last_reviewed: 2026-07-20
review_trigger: acceptance or scope change in TaxKit HGI-200 through HGI-206
---

# Harness-governance documentation

## Outcome

TaxKit maintainers can retrieve the current semantic owner for documentation,
architecture, implementation intent, operations, verification, skills, and
historical evidence without treating copied prose or a completed artifact as
current truth. Material implementation slices update the earliest durable
owner and leave bounded proof of the claim they make.

The cross-repository campaign ledger owns dependency order and aggregate
status. This repository-local SPEC owns TaxKit outcomes, acceptance, and task
state. The active execution plan owns the current bounded sequence.

## Invariants

- `docs/README.md` is the sole maintainer-document lifecycle and truth-layer
  router; root entry points only point to it.
- Current intent requires both this active SPEC/task owner and an entry under
  `docs/exec-plans/active/`.
- Durable policy lives in architecture, standards, lint/config/CI, tests, or
  skills according to semantic ownership; evidence never silently becomes
  policy.
- Encoding and decoding occur only at boundaries. Effect programs remain
  typed, flat, linear, sequential, and composable; domain/provider outputs are
  validated; helper sprawl, generic callback wrappers, primitive identities,
  `instanceof`, and unchecked SDK output are rejected.
- Repeatable consequential operations become target-owned runbooks with
  preconditions, authority, steps, evidence, rollback, and escalation.
- Verification names critical consumer journeys, the artifact and environment
  observed, exact evidence, limitations, and non-claims.
- Public docs, completed history, failed/inconclusive evidence, and binary
  artifacts remain separately routed and retained until an approved manifest
  authorizes movement or deletion.

## Tasks

| Task | State | Acceptance owner |
| --- | --- | --- |
| HGI-200 — lifecycle router, architecture successor, current-intent route, and corpus receipts | In progress | This SPEC, active plan, accepted audit receipts, fresh-context retrieval, repository verification, and scoped Git receipt |
| HGI-201 — architecture and semantic-owner reconciliation | Pending | Architecture owners and changed-boundary proof |
| HGI-202 — critical journeys and proof model | Pending | `docs/verification/**` and journey-matched evidence |
| HGI-207 — lint/config/CI enforcement review | Pending | Executable owner and focused negative/positive tests |
| HGI-208 — local skill reconciliation | Pending | Repo-local skill source, generated copies if any, and skill-policy tests |
| HGI-203 — release evidence and artifact identity | Pending | Bounded release-proof owner with explicit non-claims |
| HGI-204 — target-owned release/recovery runbooks | Pending | `docs/runbooks/**`, authority, rollback, and escalation evidence |
| HGI-205 — docs-maintenance embedding | Pending | Change-impact contract in PRD and docs-maintainer workflows |
| HGI-206 — repository closeout | Pending | No unresolved critical owner drift; accepted receipts and pushed commit identity |

Task state changes in this table and the active execution plan occur in the
same slice. A task is not complete because prose exists: its named acceptance
owner must contain bounded evidence and limitations.

## Non-goals and authority

This documentation campaign does not itself change or prove API/docs runtime,
npm publication, registry state, provider state, deployment, credentials, or
external consumer behavior. Those claims require the corresponding target
artifact, environment, authority, runbook, and readback evidence.
