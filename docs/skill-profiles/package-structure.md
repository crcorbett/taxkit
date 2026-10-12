---
document_type: repository-profile
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-13
review_trigger: repository paths, commands, or plugin routing change
---

# TaxKit package profile

- Package manager and workspaces: Bun with the root's nested workspace globs.
- Namespace: `@taxkit/*`. Source export condition: `source`.
- Default internal build: `tsc -p tsconfig.build.json`.
- Exceptions: `@taxkit/docs-content` and private `@taxkit/infrastructure` are
  source-only; `@taxkit/docs-fumadocs` is private and compiled; the TypeScript
  SDK is publishable and dist-only, and needs the
  [packed consumer check](../runbooks/packed-consumer-proof.md).
- Public package contract changes need a Changeset.
- Architecture routes: `docs/architecture/package-ownership.md`,
  `docs/architecture/package-boundaries.md`, `docs/architecture/effect-services.md`
  and `docs/architecture/testing-and-quality.md`.
- Verification: focused package commands, then `bun run verification`; before a
  package release, `bun run release:check`.

The root manifest and lockfile select the installed Effect and Alchemy versions.
Check installed exports before using an API from a newer upstream template.
