# TaxKit package profile

- Repository root: current checkout resolved with `git rev-parse --show-toplevel`
- Package manager/workspaces: Bun with the root's nested workspace globs
- Namespace: `@taxkit/*`
- Source condition: `source`
- Default internal build: `tsc -p tsconfig.build.json`
- Exceptions: `@taxkit/docs-content` is source-only; `@taxkit/docs-fumadocs` is private compiled; the TypeScript SDK is publishable/dist-only and requires clean publish exports, packed-artifact, and downstream-consumer proof
- Changesets and production Knip are part of release-facing package changes
- Verification: focused package commands, `bun run test:skills`, and `bun run verification`; for release-facing work run `bun run release:check` (including SDK packed/downstream checks)
- Architecture routes: `docs/architecture/package-ownership.md`, `docs/architecture/package-boundaries.md`, `docs/architecture/effect-services.md`, and `docs/architecture/testing-and-quality.md`
- Preserve unrelated work; never overwrite it.
