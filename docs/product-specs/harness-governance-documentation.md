---
document_type: product-spec
lifecycle: implemented
authority: supporting
owner: taxkit-documentation-owner
last_reviewed: 2026-07-22
review_trigger: retained HGI-200 through HGI-206 proof, limitation, or successor correction
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
status. This implemented repository-local SPEC retains TaxKit outcomes,
acceptance, and task state. The completed execution plan retains the accepted
bounded sequence without remaining on the active route.

## Invariants

- `docs/README.md` is the sole maintainer-document lifecycle and truth-layer
  router; root entry points only point to it.
- During implementation, current intent required both this SPEC/task owner and
  an entry under `docs/exec-plans/active/`; accepted work now routes through
  this implemented SPEC and `docs/exec-plans/completed/`.
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
| HGI-207 — documentation and release-semantics decisions | Completed | Accepted public lifecycle semantics, transient tarball handling, sanitized release-receipt retention, strict lifecycle routing, and publication/deployment non-claims in [`../documentation-audit/hgi-207/README.md`](../documentation-audit/hgi-207/README.md) |
| HGI-201 — PRD guides and local skills | Completed | Current architecture/standards/runbook routing, semantic contradiction fixtures, full verification, independent acceptance, and `HGI-201-validation.json` |
| HGI-202 — docs policy and public-maintainer separation | Completed and published | Machine-checkable public, maintainer, generated, package-README, and accepted public-status/navigation ownership; see [`../documentation-audit/HGI-202-validation.json`](../documentation-audit/HGI-202-validation.json) |
| HGI-208 — TaxKit docs-maintenance skill | Completed | Repo-local skill source and focused skill-policy proof |
| HGI-203 — critical journeys, release proof, and bounded receipts | Completed and published | Accepted five-journey inventory, strict release packet, immutable attempt receipt, bounded summary, cross-platform redaction, independent acceptance and `HGI-203-validation.json` |
| HGI-204 — release and recovery runbooks | Completed and published | Exactly four runbooks, authority model, strict HGI-203 handoff, non-executing bounded validator, adversarial fixtures, fresh-context acceptance and `HGI-204-validation.json` |
| HGI-205 — CI, controls, and automation governance | Completed and published | Canonical CI graph, controls, automation registers, independent acceptance and `HGI-205-validation.json` |
| HGI-206 — repository closeout | Completed and published | Accepted target-specific epoch, five journey receipts, complete impact ledger, independent portable-path re-audit, full verification, sequential local release graph, semantic commit `c2f41c10dca141c7cb7e066b3a2bff48048101fc`, and validation closeout `8c983d992f0b5eca46eb2777debded7dbccf0e7a` |

Task state changes in this table and the execution plan occurred in the same
accepted campaign. The completed plan now lives under `docs/exec-plans/completed/`;
completed historical plans cannot carry active work. A task is not complete
because prose exists: its named acceptance owner must contain bounded evidence
and limitations.

## Non-goals and authority

This documentation campaign does not itself change or prove API/docs runtime,
npm publication, registry state, provider state, deployment, credentials, or
external consumer behavior. Those claims require the corresponding target
artifact, environment, authority, runbook, and readback evidence.
