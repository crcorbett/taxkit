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
| SDK-003 | complete | Plain Promise facade, Data-owned safe results and AU module subpath implemented and verified. |
| SDK-004 | complete | HTTP API calculate handler consumes the SDK Effect facade and preserves HTTP envelopes. |
| SDK-005 | complete | Downstream workspace validates SDK consumption through the normal vendored package boundary. |
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

### 2026-05-24 - SDK-003 plain facade, safe results and AU subpath

- Added the browser-safe plain `WhatTax` facade in
  `packages/sdk/typescript/src/index.ts` with Promise-returning `calculate`,
  `safe.calculate` and module-scoped `createClient` methods over the existing
  generic SDK descriptor model.
- Added SDK-owned error and safe-result values in
  `packages/sdk/typescript/src/errors.ts`; safe methods return Data-owned
  `WhatTaxSuccess` or `WhatTaxFailure` values and failures wrap the canonical
  calculator/schema failure cause without mirroring calculator DTOs.
- Added `@whattax/sdk/au` typed current AU module exports and thin convenience
  helpers for take-home pay, PAYG withholdings and annual income tax.
- Added `@whattax/sdk/au/effect` AU Effect client wiring for the same module
  descriptors.
- Added plain facade and AU runtime tests plus type-level misuse coverage for
  wrong module/calculation pairings and incompatible fact inputs.
- Added Changeset `.changeset/sdk-plain-facade.md` for `@whattax/sdk` patch
  impact.
- Verification:
  - `bun run --filter=@whattax/sdk test` passed.
  - `bun run --filter=@whattax/sdk check-types` passed.
  - `bun run --filter=@whattax/sdk build` passed.
  - `bun run --filter=@whattax/sdk test-types` passed.
  - `bun run --filter=@whattax/sdk check-boundaries` passed.
  - `bun run verification` passed.
  - `bun run changeset status --verbose` passed and includes
    `@whattax/sdk` patch release impact from
    `.changeset/sdk-plain-facade.md`,
    `.changeset/sdk-effect-descriptors.md` and
    `.changeset/sdk-typescript-scaffold.md`.

### 2026-05-24 - SDK-004 HTTP API SDK consumer integration

- Added `@whattax/sdk` as a dependency of `@whattax/http-api`; the SDK package
  still has no dependency on `@whattax/http-api`.
- Updated the public calculate handler so HTTP remains the owner of route
  schemas, status annotations and error envelopes while calculation execution
  goes through request-preserving `@whattax/sdk/effect` descriptors.
- Preserved the existing HTTP calculation response shape by assembling
  calculator metadata and graph diagnostics from `PublicCalculatorService`
  around the SDK-produced typed report.
- Extended HTTP API tests to compare HTTP success reports and guided input
  errors against the same request context through the SDK Effect facade.
- Extended SDK type tests to prove the request-preserving Effect facade still
  binds facts to the selected descriptor.
- Extended the SDK import-boundary check so it proves SDK-to-HTTP isolation and
  the intended HTTP-API-to-SDK dependency direction.
- Added Changeset `.changeset/sdk-http-api-consumer.md` for
  `@whattax/http-api` and `@whattax/sdk` patch impact.
- Verification:
  - `bun run --filter=@whattax/sdk test` passed.
  - `bun run --filter=@whattax/http-api test` passed.
  - `bun run --filter=@whattax/sdk check-types` passed.
  - `bun run --filter=@whattax/http-api check-types` passed.
  - `bun run --filter=@whattax/sdk build` passed.
  - `bun run --filter=@whattax/sdk check-boundaries` passed.
  - `bun run verification` passed.
  - `bun run changeset status --verbose` passed and includes
    `.changeset/sdk-http-api-consumer.md`.

### 2026-05-24 - SDK-005 downstream consumer validation

- Advanced the downstream workspace's vendored WhatTax boundary to the accepted
  SDK-004 commit and included the current SDK workspace path in downstream
  package resolution.
- Added a real downstream browser-app flow that imports `@whattax/sdk/au` and
  calls the plain AU annual-income-tax helper while preserving the existing
  HTTP API health flow.
- Added a downstream type-only misuse assertion proving annual income tax
  rejects a raw numeric taxable income and requires canonical Money input.
- No WhatTax package-facing code changed in this slice, so no new Changeset was
  required. Existing pending SDK Changesets still cover SDK-001 through
  SDK-004 package changes.
- Verification:
  - Downstream `pnpm check-types` passed.
  - Downstream `pnpm --filter web build` passed.
  - `bun run verification` passed in WhatTax.
  - `bun run changeset status --verbose` passed in WhatTax.

## Open Risks

- Package name availability must be checked live only during release prep.
- Publication release prep remains in SDK-006.
