---
document_type: documentation-router
lifecycle: current
authority: canonical
owner: taxkit-documentation-owner
last_reviewed: 2026-10-17
review_trigger: any maintainer/public docs class, root route, SPEC, plan, runbook, proof, evidence, or lifecycle change
---

# TaxKit documentation

This is the sole router for maintainer-document type, lifecycle, truth layers,
and semantic ownership. Root `README.md` is the public repository entry point;
`AGENTS.md` is the short task map; `docs/architecture/README.md` is the current
architecture route. Public documentation content is a separate product surface
owned by the replacement `apps/web`, backend content contracts and docs
packages. The old `apps/docs` workspace is retired. Its tombstone routes to the verified
source bundle and dated provider recovery records; no provider operation is
authorised by that retained history.

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
| Public docs product | [`../apps/web/README.md`](../apps/web/README.md), [`../packages/docs-content/README.md`](../packages/docs-content/README.md), and [`../packages/docs-fumadocs/README.md`](../packages/docs-fumadocs/README.md) | Consumer-facing content/runtime, not maintainer lifecycle policy. |
| Versioning, packed SDK checks and deployment | [`runbooks/README.md`](runbooks/README.md) | Short repeatable steps. Git, pull requests, checks and Alchemy state are the ordinary record. |
| Checks and quality | [`architecture/testing-and-quality.md`](architecture/testing-and-quality.md) | What `bun run verification` covers and which focused checks to run. |
| References | [`references/README.md`](references/README.md) | Revalidate mutable external guidance. |
| Local release evidence | [`2026-10-17 strict-review release`](evidence/releases/2026-10-17-strict-review-local-release.md) | Dated production observation; not current provider state or policy. |
| Structure preview evidence | [`2026-10-17 structure preview`](evidence/releases/2026-10-17-structure-preview-release.md) | Dated preview deployment and verification of structure-review findings 5–11. |
| Audit/accounting | [`documentation-audit/README.md`](documentation-audit/README.md) | Dated evidence, not policy. |

Dated evidence and completed plans stay in Git as history. They are not inputs
to current checks or prerequisites for new work.

## Maintenance

Each material change decides which documents change: owner documents, READMEs,
runbooks, public content, skills, lint/config/CI and the active SPEC/plan. Update
the owner document and its pointers in the same change. Use the plugin
`development-workflows:docs-maintainer` skill for that decision. `$docs-writer`
is limited to public-copy wording after the owner has been chosen.

`bun run check:docs` checks maintainer metadata in `docs/`, relative links and
documented `bun run` commands in current documents and READMEs. Completed and
dated documents keep the links and commands of their time.

Public pages are published when their MDX frontmatter and
`packages/docs-content/navigation.json` say `status: published`. The
`@taxkit/docs-content` build compiles them into the public catalogue the API and
Website read; see [`../packages/docs-content/README.md`](../packages/docs-content/README.md).

Shared development workflows: [latest plugin and skill routing](skills.md).
