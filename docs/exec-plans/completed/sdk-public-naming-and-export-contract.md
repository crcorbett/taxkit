---
status: completed
last_reviewed: 2026-06-25
source_of_truth: execution-plan
confidence: medium
---

# SDK Public Naming And Export Contract Execution Plan

Spec:
[SDK public naming and export contract](../../product-specs/sdk-public-naming-and-export-contract.md)

Task list:
[`sdk-public-naming-and-export-contract.tasks.json`](../../product-specs/sdk-public-naming-and-export-contract.tasks.json)

Goal:
Implement the SDK public naming and export task list sequentially. Each task is
delegated to one subagent when available; the parent agent reviews, audits,
verifies and accepts the task before delegating the next one. Commit each
coherent package-facing slice only after required verification and Changeset
review pass.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| SDK-NAME-001 | complete | Added calculator-owned `CalculatorRun*` and `CalculatorServiceError` names; deprecated API-era aliases are transitional. |
| SDK-NAME-002 | complete | SDK and HTTP API now consume canonical calculator run names while preserving HTTP-only route/envelope names. |
| SDK-NAME-003 | complete | SDK export map is dist-only; schema entrypoint re-exports canonical run contracts; packed artifact smoke added. |
| SDK-NAME-004 | complete | Public docs and downstream validation now use final SDK public names/export contract. |

## Validation Log

### 2026-05-25 - Planning

- Read the public naming spec and task list.
- Read the implementation flow and relevant architecture docs for API/SDK,
  package ownership, Effect services and calculators.
- Created active goal for sequential subagent task execution with parent
  review, verification and acceptance between slices.
- Delegated `SDK-NAME-001` to one subagent with calculators-only ownership and
  package-facing Changeset requirements.

### 2026-05-25 - SDK-NAME-001 calculator-owned names

- Accepted commit `08ab855` after parent review.
- Added canonical calculator-owned run names:
  `CalculatorRunFacts`, `CalculatorRunRequest`,
  `CalculatorRunServiceRequest`, `CalculatorRunReport`,
  `CalculatorRunResponse`, `CalculatorRunResponseData` and
  `CalculatorServiceError`.
- Updated calculator package-local service, catalog and live layer typing to
  use the canonical names.
- Kept `PublicCalculation*`, `PublicApiError` and `PublicCalculatorError` as
  deprecated transitional aliases for later migration slices.
- Added Changeset `.changeset/kind-eggs-work.md` for
  `@taxkit/calculators` patch impact.
- Parent verification:
  - `bun run --filter=@taxkit/calculators test` passed.
  - `bun run --filter=@taxkit/calculators check-types` passed.
  - `bun run --filter=@taxkit/calculators build` passed.
  - `rg` audit confirmed canonical `CalculatorRun*` and
    `CalculatorServiceError` exports/usages in `@taxkit/calculators`.
  - `bun run verification` passed.
  - `bun run changeset status --verbose` passed and includes
    `.changeset/kind-eggs-work.md`.

### 2026-05-25 - SDK-NAME-002 SDK and HTTP API migration

- Accepted commit `765ea46` after parent review.
- Updated SDK descriptor, plain facade, Effect facade and SDK error detail
  typing to use `CalculatorRunFacts`, `CalculatorRunReport` and
  `CalculatorServiceError`.
- Updated HTTP calculate route schemas and handler response construction to
  use `CalculatorRunRequest`, `CalculatorRunResponse` and
  `CalculatorRunResponseData`.
- Preserved HTTP-owned route and envelope names such as
  `PublicCalculationMetadataGroup`, `PublicCalculationMetadataHandlerLive` and
  `PublicErrorEnvelope`.
- Added Changeset `.changeset/bright-run-names.md` for `@taxkit/sdk` and
  `@taxkit/http-api` patch impact.
- Parent verification:
  - `bun run --filter=@taxkit/sdk test` passed.
  - `bun run --filter=@taxkit/sdk test-types` passed.
  - `bun run --filter=@taxkit/sdk check-types` passed.
  - `bun run --filter=@taxkit/sdk build` passed.
  - `bun run --filter=@taxkit/http-api test` passed.
  - `bun run --filter=@taxkit/http-api check-types` passed.
  - `bun run --filter=@taxkit/http-api build` passed.
  - `bun run --filter=@taxkit/sdk check-boundaries` passed.
  - `rg` audit found no SDK source/README references to
    `PublicCalculation*`, `PublicApiError` or `PublicCalculatorError`.
  - `bun run verification` passed.
  - `bun run changeset status --verbose` passed and includes
    `.changeset/bright-run-names.md`.

### 2026-05-25 - SDK-NAME-003 export contract

- Accepted commit `793ad00` after parent review.
- Removed `source` conditions from `@taxkit/sdk` export map; public exports
  now resolve to `dist` files only.
- Updated `@taxkit/sdk/schemas` to re-export calculator-owned
  `CalculatorRun*` contracts and `CalculatorServiceError` plus SDK-owned safe
  result/error schemas.
- Added `bun run --filter=@taxkit/sdk check-packed-artifact` to audit the
  publish manifest and run import smoke checks against a copied packed package
  layout for root, Effect, AU, AU Effect, schemas and testing entrypoints.
- Updated SDK README and API/SDK architecture docs for the dist-only export
  map and schema export ownership.
- Added Changeset `.changeset/locked-sdk-exports.md` for `@taxkit/sdk`
  patch impact.
- Parent verification:
  - `bun run --filter=@taxkit/sdk test` passed.
  - `bun run --filter=@taxkit/sdk check-types` passed.
  - `bun run --filter=@taxkit/sdk build` passed.
  - `bun run --filter=@taxkit/sdk test-types` passed.
  - `bun run --filter=@taxkit/sdk check-boundaries` passed.
  - `bun run --filter=@taxkit/sdk check-packed-artifact` passed.
  - `npm pack --dry-run --json packages/sdk/typescript` reported 38 packed
    files: `README.md`, `package.json` and `dist/**` only.
  - `bun run verification` passed.
  - `bun run changeset status --verbose` passed and includes
    `.changeset/locked-sdk-exports.md`.

### 2026-05-25 - SDK-NAME-004 docs and downstream validation

- Accepted TaxKit commit `8bd7c21` and downstream commit `fb9c305` after
  parent review, then added parent follow-up docs cleanup for old historical
  spec wording.
- Updated public architecture docs, package READMEs and SDK publishing spec to
  advertise the final `CalculatorRun*`/`CalculatorServiceError` vocabulary and
  dist-only SDK export contract.
- Updated older product-spec wording so historical specs do not advertise
  `PublicCalculation*` as preferred calculator/SDK vocabulary.
- Kept HTTP-only names such as `PublicCalculationMetadataGroup` and
  `PublicErrorEnvelope` scoped to `@taxkit/http-api`; kept deprecated alias
  mentions scoped to `@taxkit/calculators` transitional compatibility docs
  and code.
- Added Changeset `.changeset/sdk-public-contract-docs.md` for
  `@taxkit/sdk`, `@taxkit/http-api` and `@taxkit/calculators` patch
  impact.
- Downstream validation advanced the vendored TaxKit dependency and added
  type-level coverage for `@taxkit/sdk/schemas` exports:
  `CalculatorRunRequest`, `CalculatorRunFacts` and `CalculatorServiceError`.
- Parent verification:
  - `bun run verification` passed in TaxKit.
  - `bun run changeset status --verbose` passed and includes
    `.changeset/sdk-public-contract-docs.md`.
  - `pnpm check-types` passed in the downstream workspace.
  - `pnpm build` passed in the downstream workspace.
  - `rg` audit found remaining old-name hits only in transitional calculators
    aliases/docs and HTTP-owned route group names, not preferred SDK/calculator
    docs.

## Completion

All tasks in the SDK public naming and export contract task list are complete.
The SDK publish contract is dist-only, schema exports reuse canonical owning
schemas, HTTP API remains a consumer of the SDK, and downstream validation
passes with the final names.
