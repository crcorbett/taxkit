# Testing Helpers

Shared test helpers for TaxKit workspace packages.

## Scope

`@taxkit/testing` owns reusable test-only helpers such as `expectAt` for
safe indexed assertions without non-null assertions. It uses checked Effect
Array/Option lookup, preserves present values including null, and reports
missing or undefined entries through the test framework assertion.

## Exports

- `.`: `expectAt(items, index)`, the checked indexed assertion described above.

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

## Documentation impact

Change this README and the [testing and quality owner](../../docs/architecture/testing-and-quality.md)
when a shared helper is added or its assertion behaviour changes.

## Runbook applicability

No runbook is needed: the package is test-only and performs no operation.

## Non-claims

The helper only reports a missing entry. It proves nothing about the code under
test beyond each test's own assertions.
