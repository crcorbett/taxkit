---
document_type: repository-profile
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-13
review_trigger: repository paths, commands, or plugin routing change
---

# TaxKit documentation profile

Read this profile after `AGENTS.md` and `docs/README.md`. Paths and commands
below are repository-local.

## Owner map

| Change class | Owner and required pointers |
| --- | --- |
| Maintainer lifecycle and routing | `docs/README.md`; architecture, standards and active intent only when affected. |
| Calculator rules, facts and Schemas | The owning `packages/calculators` or `packages/rules/**` source and README; `docs/architecture/**`, SDK/API and public docs only when consumers change. |
| SDK exports and examples | `packages/sdk/typescript` source, export map and README; [packed consumer check](../runbooks/packed-consumer-proof.md); `docs/architecture/api-and-sdk.md`. |
| HTTP/OpenAPI | `packages/api/http/src/**` Schemas and `src/openapi.ts`; the snapshot `packages/api/http/__snapshots__/openapi.json`; `packages/api/http/README.md`, `apps/api/README.md` and API/SDK architecture when contracts change. |
| Public MDX and navigation | `packages/docs-content/content/**` and `packages/docs-content/navigation.json`. Frontmatter `status: published` publishes a page. |
| Website/API runtime and deployment | `apps/web/README.md`, `apps/api/README.md`, `docs/architecture/frontend.md`, `docs/architecture/deployment.md` and the [deployment runbook](../runbooks/deployment.md). |
| Package/app roots | The owning README, package ownership architecture and root routes when discoverability changes. |
| Commands, CI and versioning | `package.json`, `.github/workflows/checks.yml`, `docs/standards/versioning.md`, `docs/runbooks/README.md` and the testing architecture. |
| PRD and implementation | The target SPEC and active plan. |

Generated sources are authoritative over checked-in output; regenerate them with
their owning command and never hand-edit them.

## Commands

- `bun run check:docs` and `bun run check:repository-paths` for documentation
  changes; `bun run verification` before merging.
- `bun run --filter=@taxkit/docs-content build` rebuilds the public catalogue;
  `bun run docs:validate` checks MDX components and snippets.
- `bun run test:native` runs the native Website/API pair, including the docs
  browser journey.
- SDK package changes: `bun run sdk:check-packed-artifact` and
  `bun run sdk:validate-downstream`.

State what each check shows and what it does not: local checks do not show
publication, deployment or the behaviour of a hosted site.
