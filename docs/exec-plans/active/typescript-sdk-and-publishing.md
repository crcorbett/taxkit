---
status: active
last_reviewed: 2026-05-24
source_of_truth: execution-plan
confidence: medium
---

# TypeScript SDK And Publishing Execution Plan

Spec:
[TypeScript SDK and publishing](../../product-specs/typescript-sdk-and-publishing.md)

Task list:
[`typescript-sdk-and-publishing.tasks.json`](../../product-specs/typescript-sdk-and-publishing.tasks.json)

Goal:
Implement the SDK task list sequentially. Each task is delegated to one
subagent when available; the parent agent reviews, audits, verifies and accepts
the task before the next task begins. Commit only after the coherent slice
passes its required gates and Changeset decision.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| SDK-001 | complete | Scaffolded `@whattax/sdk` package, export map and import-boundary check. |
| SDK-002 | complete | Strict typed descriptors and Effect facade over calculators implemented and verified. |
| SDK-003 | pending | Plain facade, safe results and AU module subpath. |
| SDK-004 | pending | HTTP API consumes SDK facade. |
| SDK-005 | pending | Downstream consumer validation. |
| SDK-006 | pending | Publication release-prep slice. |

## Validation Log

### 2026-05-24 - Planning

- Added `docs/product-specs/typescript-sdk-and-publishing.md`.
- Added
  `docs/product-specs/typescript-sdk-and-publishing.tasks.json`.
- Updated `docs/product-specs/index.md`.
- Confirmed task-list JSON parses with Bun.
- Confirmed docs/task-list formatting with `bun run format:check`.

### 2026-05-24 - SDK-001 scaffold

- Added `packages/sdk/typescript` as private package `@whattax/sdk`; the
  preferred unscoped `whattax` package name remains a release-prep decision
  because the monorepo root package currently uses `whattax`.
- Added explicit export paths for `.`, `./effect`, `./au`, `./au/effect`,
  `./schemas` and `./testing` with placeholder source entrypoints only.
- Added `packages/sdk/*` to Bun workspace globs and a Knip workspace entry for
  the SDK package.
- Added `packages/sdk/typescript/scripts/check-import-boundaries.ts` proving
  SDK package metadata and source do not import `@whattax/http-api`, the root
  entrypoint does not import AU rule packages and browser-safe entrypoints do
  not import `node:` or `bun:` modules.
- Added Changeset `.changeset/sdk-typescript-scaffold.md` for
  `@whattax/sdk`.
- Verification:
  - `bun run --filter=@whattax/sdk check-types` passed.
  - `bun run --filter=@whattax/sdk build` passed.
  - `bun run --filter=@whattax/sdk check-boundaries` passed.
  - `bun run changeset status --verbose` passed and includes
    `@whattax/sdk` patch release impact from
    `.changeset/sdk-typescript-scaffold.md`.
  - `bun run verification` passed.
- Parent review accepted SDK-001 after aligning the SDK tsconfig with existing
  package patterns and rerunning the targeted SDK gates plus repo verification
  locally.
- Parent review also aligned the new private `@whattax/sdk` package with the
  Changesets fixed group and current package-state docs in `README.md`,
  `AGENTS.md`, `docs/architecture/*` and `docs/standards/versioning.md`.

### 2026-05-24 - SDK-002 typed descriptors and Effect facade

- Added schema-backed typed SDK calculation and module descriptors in
  `packages/sdk/typescript/src/types.ts`.
- Added `@whattax/sdk/effect` calculation execution through
  `PublicCalculatorService`; the facade preserves descriptor-specific input and
  output types while keeping calculator/domain failures in the Effect error
  channel.
- Added internal AU descriptor instances for current calculator catalog entries:
  `au.pay.take-home`, `au.pay.withholdings` and `au.income-tax.annual`.
  The root SDK entrypoint exports only generic types and does not import AU rule
  packages.
- Added focused type-level coverage for unsupported calculations, mismatched
  input facts and unsupported tax-year literals through
  `bun run --filter=@whattax/sdk test-types`.
- Added runtime parity coverage proving SDK Effect facade success parity with
  `PublicCalculatorService`, guided input error parity and annual-tax descriptor
  executability.
- Added Changeset `.changeset/sdk-effect-descriptors.md` for `@whattax/sdk`
  patch impact.
- Verification:
  - `bun run --filter=@whattax/sdk check-types` passed.
  - `bun run --filter=@whattax/sdk test-types` passed.
  - `bun run --filter=@whattax/sdk test` passed.
  - `bun run --filter=@whattax/sdk build` passed.
  - `bun run --filter=@whattax/sdk check-boundaries` passed.
  - `bun run verification` passed.
  - `bun run changeset status --verbose` passed and includes
    `@whattax/sdk` patch release impact from
    `.changeset/sdk-effect-descriptors.md` and
    `.changeset/sdk-typescript-scaffold.md`.

## Open Risks

- Package name availability must be checked live only during release prep.
- `@whattax/http-api` must consume the SDK; the SDK must not depend on
  `@whattax/http-api`.
- Downstream validation must be recorded without naming private downstream
  products in public WhatTax docs.
- SDK-001 uses placeholder entrypoints only; typed descriptors, facade
  behavior, runtime parity tests and downstream validation remain in later SDK
  tasks.
