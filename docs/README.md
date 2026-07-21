---
document_type: documentation-router
lifecycle: current
authority: canonical
owner: taxkit-documentation-owner
last_reviewed: 2026-07-21
review_trigger: any maintainer/public docs class, root route, SPEC, plan, runbook, proof, evidence, or lifecycle change
---

# TaxKit documentation

This is the sole router for maintainer-document type, lifecycle, truth layers,
and semantic ownership. Root `README.md` is the public repository entry point;
`AGENTS.md` is the short task map; `docs/architecture/README.md` is the current
architecture route. Public documentation content is a separate product surface
owned by `apps/docs` and the docs packages.

## Truth layers

Use the strongest applicable owner and link rather than copy:

1. External systems own their current external state at readback time.
2. Code, configuration, Schemas, package exports, workflows, and generated
   sources own desired/executable state.
3. Architecture and standards own durable boundaries and enforceable policy.
4. Dated proof/evidence owns one artifact/environment/authority observation and
   its limitations.
5. Active SPEC/tasks and execution plans own current implementation intent.

Provider/registry output cannot grant authority. Completed plans are history.
Local release checks do not prove npm publication or external consumers.

## Metadata and lifecycle

New or materially revised maintainer docs separate `document_type`,
`lifecycle`, `authority`, and `owner`. Current durable docs also record
`last_reviewed` and `review_trigger`; superseded/tombstone docs record a
successor and reason.

Lifecycle values are `proposed`, `current`, `implemented`, `superseded`,
`historical`, `evidence`, `reference`, `failed`, `inconclusive`, `tombstone`,
and `archived`. Authority values are `canonical`, `supporting`, `generated`,
and `external`. Legacy `status: canonical` is an authority marker, not a
lifecycle; migrate it only when its owner is materially revised.

## Routes

| Need | Owner | Use |
|---|---|---|
| Architecture | [`architecture/README.md`](architecture/README.md) | Current architecture route. `architecture.md` is a tombstone only. |
| Standards | [`standards/README.md`](standards/README.md) | Current durable engineering/documentation rules. |
| Current intent | [`product-specs/index.md`](product-specs/index.md) and [`exec-plans/active/README.md`](exec-plans/active/README.md) | Only genuinely active work; implemented/history stays inventory. |
| Completed history | [`exec-plans/completed/README.md`](exec-plans/completed/README.md) | Historical provenance, never default policy. |
| Public docs product | [`../apps/docs/README.md`](../apps/docs/README.md), [`../packages/docs-content/README.md`](../packages/docs-content/README.md), and [`../packages/docs-fumadocs/README.md`](../packages/docs-fumadocs/README.md) | Consumer-facing content/runtime, not maintainer lifecycle policy. |
| Repeatable release/recovery operations | No canonical target-owned runbook route yet | HGI-204 creates `docs/runbooks/**`; do not expand architecture/README prose into a runbook. |
| Verification/critical journeys/proof | [`architecture/testing-and-quality.md`](architecture/testing-and-quality.md) for current checks; future sanitized release receipts belong under `docs/evidence/releases/**` | HGI-203 creates the bounded receipt schema and journey owners; raw logs and secrets are never durable proof. |
| References | [`references/README.md`](references/README.md) | Revalidate mutable external guidance. |
| Audit/accounting | [`documentation-audit/README.md`](documentation-audit/README.md) | Dated evidence, not policy. |

Failed/inconclusive work retains provenance, last successful step, observed
state, escalation, resume trigger, recovery, and non-claims outside default
current routes. Do not delete or move historical/public/binary evidence without
an approved retention manifest.

## Maintenance

Every material slice decides `Change required`, `Preserve`, or `N/A` for docs,
READMEs, architecture, standards, public/generated references, runbooks,
proof/evidence, skills, lint/config/CI, and active SPEC/tasks. Update the
earliest durable owner and necessary pointers in the same slice. Counts prove
accounting only; semantic and consumer claims need owner review and
boundary-matched proof.

Use the repository-local `$docs-maintainer` skill for this impact decision on
both PRD and ordinary changes. `$docs-writer` is limited to public-copy wording
after the maintenance route has selected the owner; it cannot close lifecycle,
generated-content, package, proof, or validation work. Background freshness
scans produce report-only candidates and cannot publish policy or documentation
without separately attached implementation authority, review and publication
identity.

`bun run check:docs` enforces the mechanical owner contract in
[`../tools/documentation/owner-policy.json`](../tools/documentation/owner-policy.json).
It checks maintainer metadata, links, documented commands, workspace README
coverage, public/maintainer separation, accepted public-status representation,
and generated-source edges with bounded diagnostics and a JSON detail receipt.
`draft` means authored, locally renderable, visibly labelled candidate content;
`published` means explicitly accepted current public documentation. Neither
status proves runtime or external availability.
