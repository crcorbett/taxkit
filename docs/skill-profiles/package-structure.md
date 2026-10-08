---
document_type: repository-profile
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-05
review_trigger: repository paths, commands, or plugin routing change
---

# TaxKit package profile

- Repository root: current checkout resolved with `git rev-parse --show-toplevel`
- Package manager/workspaces: Bun with the root's nested workspace globs
- Namespace: `@taxkit/*`
- Source condition: `source`
- Default internal build: `tsc -p tsconfig.build.json`
- Exceptions: `@taxkit/docs-content` and private `@taxkit/infrastructure` are source-only; `@taxkit/docs-fumadocs` is private compiled; the TypeScript SDK is publishable/dist-only and requires clean publish exports, packed-artifact, and downstream-consumer proof
- Changesets and production Knip are part of release-facing package changes
- Verification: focused package commands, `bun run verification`; for release-facing work run `bun run release:check` (including SDK packed/downstream checks)
- Architecture routes: `docs/architecture/package-ownership.md`, `docs/architecture/package-boundaries.md`, `docs/architecture/effect-services.md`, and `docs/architecture/testing-and-quality.md`
- Preserve unrelated work; never overwrite it.

## Clean-slate compatibility and implementation

The local root manifest and lockfile select stable Effect 4.0.0 and TypeScript
7.0.2. Canonical skill templates may retain their upstream rc.117 qualification;
that reference snapshot does not downgrade TaxKit or prove an app/provider
migration. Check installed exports and the active clean-slate plan before use.

Shared workflow skills are selected through `docs/skills.md` from the latest
installed plugin. The removed local collection and its 0.6.1 receipt remain
historical evidence; they do not select today's plugin or qualify TaxKit's
stable dependency graph. Repository validators stay independent of a user's
plugin installation. Use the retained task receipts and direct source checks
for the implementation's current acceptance and limits. Use its task receipts for current acceptance; the
upstream skill receipt alone does not prove runtime behaviour.
