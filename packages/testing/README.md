---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# Testing Helpers

Shared test helpers for TaxKit workspace packages.

## Scope

`@taxkit/testing` owns reusable test-only helpers such as `expectAt` for
safe indexed assertions without non-null assertions.

## Guardrails

- Keep this package test-only.
- Do not add production runtime helpers here.
- Prefer helpers that remove unsafe TypeScript patterns while preserving
  explicit test assertions.
- Keep dependencies small and Bun/workspace friendly.

## Commands

```sh
bun run --filter=@taxkit/testing check-types
bun run --filter=@taxkit/testing build
```

## Packaging

The build removes `dist` before compiling, and the tarball contains only
`dist`, this README and package metadata. `@effect/vitest`, `effect` and
`vitest` are runtime dependencies because the exported `expectAt` helper loads
the Effect Vitest assertion adapter. The strict downstream gate imports the
packed entrypoint without relying on monorepo hoisting.
