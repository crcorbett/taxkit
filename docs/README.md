# Documentation

| Owner | Purpose |
| --- | --- |
| [Product](../PRODUCT.md) | Users, purpose, positioning, product constraints and brand commitments |
| [Architecture](../ARCHITECTURE.md) | Apps, packages, requests, runtimes, caching and deployment |
| [Domain language](../CONTEXT.md) | Money, facts, scenarios, rules, rule packs and calculation outcomes |
| [Engine](architecture/facts.md) | [Facts](architecture/facts.md), [rules and parameters](architecture/rules-and-parameters.md), [calculators](architecture/calculators.md) and [graph, trace and ledgers](architecture/graph-trace-ledgers.md) |
| [API and SDK](architecture/api-and-sdk.md) | Public HTTP contract, MCP, admission and the SDK |
| [Website](architecture/frontend.md) | Routes, loaders, calculator pages and documentation |
| [Content](architecture/content-and-posts.md) | Authored pages, the docs catalogue, discovery files and share images |
| [Packages](architecture/package-ownership.md) | Package ownership and [boundaries](architecture/package-boundaries.md) |
| [Effect services](architecture/effect-services.md) | Services, Layers, boundaries and [configuration](architecture/configuration.md) |
| [Testing](architecture/testing-and-quality.md) | The five checks and [rule and calculation tests](architecture/testing-and-validation.md) |
| [Deployment](architecture/deployment.md) | Resources, stages and secrets |
| [Standards](standards/code-patterns.md) | [Code patterns](standards/code-patterns.md), [docstrings](standards/docstrings.md), [tooling](standards/tooling.md) and [versioning](standards/versioning.md) |
| [Runbooks](runbooks/README.md) | Deployment, versioning and packed SDK checks |
| [Development skills](skills.md) | Shared implementation guidance |

Public documentation is a separate product: authored pages live in
[`content/docs`](../content/docs/README.md) and are published when their
frontmatter and navigation say `status: published`.

## Decisions

Each record starts with `Status: accepted`, `Status: proposed` or
`Status: superseded by ADR-NNNN`; an accepted record that a later one replaces
in part adds `; partly superseded by ADR-NNNN (what changed)`.

- [0001 Separate Website and API](adr/0001-separate-website-and-api.md)
- [0002 Reuse shared telemetry datasets](adr/0002-reuse-shared-telemetry-datasets.md)
- [0003 Independent API hosts](adr/0003-support-independent-api-hosts.md)
- [0004 Limit operational observations](adr/0004-limit-operational-observations.md)
- [0005 Public API and Production publication links](adr/0005-public-api-and-production-publication-links.md)
- [0006 Follow Common Practice's structure](adr/0006-follow-common-practice.md)
- [0007 Content-neutral MDX compilation and rendering](adr/0007-content-neutral-mdx.md)
- [0008 Effect-owned rendering providers](adr/0008-effect-rendering-providers.md)
- [0009 Paired MDX themes as checked render data](adr/0009-mdx-themes.md)
- [0010 Agnostic MDX reading contracts and React presentation](adr/0010-agnostic-mdx-presentation.md)
- [0011 Effect-native SDK contracts and checked money](adr/0011-effect-native-sdk-contracts.md)
- [0012 Closed calculator programs without an engine service](adr/0012-closed-calculator-programs.md)

## Keeping this useful

Update the owning document when behaviour changes. Keep architecture decisions
that explain a lasting choice. Use Git history for completed plans and old
reports. Report checks and release results in the existing chat or pull
request; do not create dated receipts or a documentation-only release PR.

`bun run lint` runs `check:docs` over every tracked or new Markdown file except
Changesets and generated changelogs. It checks relative links, heading anchors
(GitHub slug rules) and documented `bun run` commands, including the workspace
named by `--filter`.
