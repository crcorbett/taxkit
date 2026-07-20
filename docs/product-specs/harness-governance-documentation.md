---
document_type: product-spec
lifecycle: current
authority: canonical
owner: taxkit-documentation-owner
last_reviewed: 2026-07-20
review_trigger: acceptance or scope change in TaxKit HGI-200 through HGI-206
successor: null
tombstone: false
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
| HGI-200 — lifecycle router, architecture successor, current-intent route, and corpus receipts | Completed | S1/S2 receipts, integrated fresh-context acceptance, repository verification, and pushed Git identity |
| HGI-207 — documentation and release-semantics decisions | Next; HGI-200 satisfied | Product-owner decisions for public-doc lifecycle, archive/candidate retention, and publication/deployment non-claims |
| HGI-201 — PRD guides and local skills | Completed | Current architecture/standards/runbook routing, semantic contradiction fixtures, full verification, independent acceptance, and `HGI-201-validation.json` |
| HGI-202 — docs policy and public-maintainer separation | Pending; depends on HGI-200, HGI-201, HGI-207 | Machine-checkable public, maintainer, generated, and package-README ownership |
| HGI-208 — TaxKit docs-maintenance skill | Pending; depends on HGI-202 | Repo-local skill source and focused skill-policy proof |
| HGI-203 — critical journeys, release proof, and bounded receipts | Pending; depends on HGI-202, HGI-208 | `docs/verification/**` and journey-matched evidence with explicit non-claims |
| HGI-204 — release and recovery runbooks | Pending; depends on HGI-203 | `docs/runbooks/**`, authority, rollback, and escalation evidence |
| HGI-205 — CI, controls, and automation governance | Pending; depends on HGI-202, HGI-203, HGI-204 | Executable owner and focused negative/positive controls |
| HGI-206 — repository closeout | Pending | No unresolved critical owner drift; accepted receipts and pushed commit identity |

Task state changes in this table and the active execution plan occur in the
same slice. Completed historical plans cannot carry active work: retained
follow-ups route to the explicit successor tasks above. A task is not complete
because prose exists: its named acceptance owner must contain bounded evidence
and limitations.

## Non-goals and authority

This documentation campaign does not itself change or prove API/docs runtime,
npm publication, registry state, provider state, deployment, credentials, or
external consumer behavior. Those claims require the corresponding target
artifact, environment, authority, runbook, and readback evidence.
