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
safe indexed assertions without non-null assertions. It uses checked Effect
Array/Option lookup, preserves present values including null, and reports
missing or undefined entries through the test framework assertion.

## Guardrails

- Keep this package test-only.
- Do not add production runtime helpers here.
- Prefer helpers that remove unsafe TypeScript patterns while preserving
  explicit test assertions.
- Keep dependencies small and Bun/workspace friendly.

## Commands

```sh
bun run --filter=@taxkit/testing test
bun run --filter=@taxkit/testing check-types
```

## Packaging

This private package exports its TypeScript source and has no build.
`@effect/vitest`, `effect` and `vitest` are dependencies because the exported
`expectAt` helper loads the Effect Vitest assertion adapter.
