---
document_type: documentation-router
lifecycle: current
authority: canonical
owner: taxkit-documentation-owner
last_reviewed: 2026-07-24
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
| Repeatable release/deployment/recovery operations | [`runbooks/README.md`](runbooks/README.md) and [`operations/authority-model.md`](operations/authority-model.md) | Exactly five target-owned procedures; stop consequential operations when principal, candidate, target or receipt is unknown. |
| CI controls and recurring automation | [`standards/controls.md`](standards/controls.md) and [`operations/automation-register.md`](operations/automation-register.md) | Quality workflow admission, release-graph controls, and report-only candidate boundaries; neither route grants external authority. |
| Verification/critical journeys/proof | [`architecture/testing-and-quality.md`](architecture/testing-and-quality.md), [`verification/critical-journeys.json`](verification/critical-journeys.json), [`evidence/releases/HGI-203-critical-journeys.json`](evidence/releases/HGI-203-critical-journeys.json), [`evidence/releases/HGI-203-local.json`](evidence/releases/HGI-203-local.json), and [`documentation-audit/HGI-203-validation.json`](documentation-audit/HGI-203-validation.json) | The current inventory owns evolving journeys. Accepted HGI-203 retains the exact historical five-journey snapshot and bounded local proof that its immutable packet observed; HGI-204 validates both epochs without attributing current changes to the old attempt. Raw logs and secrets are never durable proof. |
| Harness foundation and requalification | [`verification/repository-harness-profile.json`](verification/repository-harness-profile.json), [`documentation-audit/harness-foundation/accepted-findings.json`](documentation-audit/harness-foundation/accepted-findings.json), [`verification/harness-epochs.md`](verification/harness-epochs.md), and [`verification/effectiveness.md`](verification/effectiveness.md) | The TaxKit profile, accepted HE crosswalk, content-addressed skill receipt and focused gate own the implemented baseline. Last accepted epoch `HFI-004-2026-07-24` qualifies saved candidate `7c8a96e`; HGI-206 remains previous history. The active clean-slate plan owns pending qualification of today's graph. Neither saved epoch establishes current-checkout or external state. |
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
The command accepts `--json`; failed checks return a nonzero exit after the
report is saved. Effect CLI owns option parsing.
`draft` means authored, locally renderable, visibly labelled candidate content;
`published` means explicitly accepted current public documentation. Neither
status proves runtime or external availability.

`bun run check:runbooks` Schema-decodes the canonical runbook contract, the
current journey inventory and the exact historical HGI-203 journey snapshot,
then reconciles the immutable packet digest, four Markdown owners, commands,
evidence paths, stop operations, index rows and authority rows. It writes only
the ignored bounded receipt `tmp/runbook-validation-report.json`, executes none
of the documented procedures and establishes no consequential state.
