---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Testing And Quality

WhatTax quality depends on deterministic calculation tests, package boundary
tests, graph validation, trace snapshots, API/SDK parity and build/type health.

## Scope

This doc owns cross-cutting quality expectations. Detailed rule-package test
requirements live in [Testing and validation](./testing-and-validation.md).

## Main Areas

- rule-builder unit tests
- ATO golden tests and known scenarios
- property tests for thresholds and monotonicity
- date-boundary tests
- graph validation in CI
- trace snapshots
- package export and browser-safety tests
- API and SDK parity tests

## Current Baseline

The current repo baseline is scaffold-level verification:

```bash
pnpm check-types
pnpm build
```

## Guardrails

- A rule pack is incomplete without source references and golden tests.
- Graph validation failures should fail the build.
- API responses must stay schema-backed.
- Browser-safe exports must not import Node-only modules.
- Verification evidence should be recorded in specs, task lists or exec plans
  when work spans multiple packages.

## Related Docs

- [Testing and validation](./testing-and-validation.md)
- [Graph, trace and ledgers](./graph-trace-ledgers.md)
- [API and SDK](./api-and-sdk.md)
