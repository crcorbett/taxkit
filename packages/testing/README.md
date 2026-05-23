---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# Testing Helpers

Shared test helpers for WhatTax workspace packages.

## Scope

`@whattax/testing` owns reusable test-only helpers such as `expectAt` for
safe indexed assertions without non-null assertions.

## Guardrails

- Keep this package test-only.
- Do not add production runtime helpers here.
- Prefer helpers that remove unsafe TypeScript patterns while preserving
  explicit test assertions.
- Keep dependencies small and Bun/workspace friendly.

## Commands

```sh
bun run --filter=@whattax/testing check-types
bun run --filter=@whattax/testing build
```
