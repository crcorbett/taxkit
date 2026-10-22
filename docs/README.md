# TaxKit documentation

Root `README.md` is the public repository entry point and `AGENTS.md` is the
short task map. This file routes maintainer documentation. Public
documentation content is a separate product surface owned by `apps/web`, the
backend content contracts and the docs packages.

## Truth layers

Use the strongest applicable owner and link rather than copy:

1. External systems own their current state at readback time.
2. Code, configuration, Schemas, package exports, workflows and generated
   sources own desired and executable state.
3. Architecture and standards own durable boundaries and enforceable policy.
4. An active SPEC and execution plan own current implementation intent.

Provider or registry output cannot grant authority. Local release checks do
not prove npm publication or external consumers. Git, pull requests and
checks are the record of completed work; finished SPECs, plans and dated
receipts are removed rather than kept as documents.

## Routes

| Need | Owner |
| --- | --- |
| Architecture | [`architecture/README.md`](architecture/README.md) |
| Standards | [`standards/README.md`](standards/README.md) |
| Design principles | [`design-docs/index.md`](design-docs/index.md) |
| Current intent | [`product-specs/index.md`](product-specs/index.md) and [`exec-plans/active/README.md`](exec-plans/active/README.md) |
| Public docs product | [`../apps/web/README.md`](../apps/web/README.md), [`../packages/docs-content/README.md`](../packages/docs-content/README.md) and [`../packages/docs-fumadocs/README.md`](../packages/docs-fumadocs/README.md) |
| Versioning, packed SDK checks and deployment | [`runbooks/README.md`](runbooks/README.md) |
| Checks and quality | [`architecture/testing-and-quality.md`](architecture/testing-and-quality.md) |
| References | [`references/README.md`](references/README.md) |
| Development skills | [`skills.md`](skills.md) |

## Decisions

- [0001 Separate Website and API](adr/0001-separate-website-and-api.md) (superseded in part)
- [0002 Reuse shared telemetry datasets](adr/0002-reuse-shared-telemetry-datasets.md)
- [0003 Independent API hosts](adr/0003-support-independent-api-hosts.md)
- [0004 Limit operational observations](adr/0004-limit-operational-observations.md)
- [0005 Public API and Production publication links](adr/0005-public-api-and-production-publication-links.md)

## Maintenance

Each material change decides which documents change: owner documents,
READMEs, runbooks, public content, skills, lint/config/CI and any active
SPEC/plan. Update the owner document and its pointers in the same change.
`$docs-writer` is limited to public-copy wording after the owner has been
chosen.

`bun run check:docs` checks relative links and documented `bun run` commands
in `AGENTS.md`, `README.md`, every Markdown file under `docs/` and every
workspace README. Some documents still carry YAML front matter; it is
informational and not required or checked.

Public pages are published when their MDX frontmatter and
`packages/docs-content/navigation.json` say `status: published`. The
`@taxkit/docs-content` build compiles them into the public catalogue the API and
Website read; see [`../packages/docs-content/README.md`](../packages/docs-content/README.md).
