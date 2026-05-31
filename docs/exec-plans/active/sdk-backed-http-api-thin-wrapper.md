---
status: active
last_reviewed: 2026-05-31
source_of_truth: execution-plan
confidence: medium
---

# SDK-Backed HTTP API Thin Wrapper Execution Plan

Spec:
[SDK-backed HTTP API thin wrapper](../../product-specs/sdk-backed-http-api-thin-wrapper.md)

Task list:
[`sdk-backed-http-api-thin-wrapper.tasks.json`](../../product-specs/sdk-backed-http-api-thin-wrapper.tasks.json)

Goal:
Implement the SDK-backed HTTP API thin-wrapper task list sequentially. Each
task is delegated to one subagent when available; the parent agent reviews,
audits, verifies call graphs and mandatory gates, accepts the task, updates
this plan and commits each package-facing slice before delegating the next
task.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| SDK-HTTP-001 | complete | Renamed API and SDK public symbols for clearer call graphs; verification passed. |
| SDK-HTTP-002 | complete | Added SDK Effect full-run helper with descriptor-narrowed response typing; verification passed. |
| SDK-HTTP-003 | complete | HTTP calculate delegates to SDK full-run helper; verification passed. |
| SDK-HTTP-004 | complete | Documented final call graph and downstream evidence; verification passed. |

## Validation Log

### 2026-05-31 - Planning

- Confirmed spec commit `003aad7` is present.
- Read the target spec, task list and implementation flow.
- Read relevant architecture docs for API/SDK, package ownership, Effect
  services and calculators.
- Created active implementation goal requiring sequential subagent execution,
  parent review, call-graph verification and commits between slices.

### 2026-05-31 - SDK-HTTP-001 Naming Slice

- Renamed HTTP calculator API group/handler/envelope symbols to
  `CalculatorApiGroup`, `CalculatorApiHandlerLive`,
  `CalculatorApiErrorEnvelope` and `CalculatorApiErrorEnvelopeData`.
- Renamed SDK Effect report-only helpers/types to `calculateReport`,
  `calculateReportRequest`, `createClient`, `SdkCalculatorRunPayload` and
  `SdkCalculatorRunServiceRequest`.
- Kept calculate behavior unchanged for this slice: HTTP calculate still calls
  the report-only SDK helper and still assembles `CalculatorRunResponseData`
  locally. The full-run SDK helper remains SDK-HTTP-002.
- Added package Changeset `.changeset/clear-api-sdk-names.md`.
- Verification passed:
  `bun run --filter=@whattax/sdk test`,
  `bun run --filter=@whattax/sdk test-types`,
  `bun run --filter=@whattax/sdk check-types`,
  `bun run --filter=@whattax/sdk build`,
  `bun run --filter=@whattax/http-api test`,
  `bun run --filter=@whattax/http-api check-types`,
  `bun run --filter=@whattax/http-api build`,
  `bun run --filter=@whattax/sdk check-boundaries`,
  `bun run format:check`, `bun run verification` and
  `bun run changeset status --verbose`.
- Naming audit passed for preferred source/docs:
  no `PublicCalculationMetadata`, `PublicErrorEnvelope`, `calculateRequest`,
  `createEffectClient`, `SdkCalculationPayload`,
  `SdkCalculationServiceRequest` or `publicCalculationMetadata` references
  remain in `packages/http-api`, `packages/sdk/typescript` or
  `docs/architecture/api-and-sdk.md`.
- `bun run changeset` was attempted after adding the explicit Changeset; the
  command is interactive and exited after failing to open `/dev/tty`.
  `bun run changeset status --verbose` confirms the release-train impact.

### 2026-05-31 - SDK-HTTP-002 SDK Full-Run Helper Slice

- Added `calculateRunRequest` to `@whattax/sdk/effect`. The helper calls
  `PublicCalculatorService.calculate`, decodes the descriptor output report and
  returns the canonical calculator run response shape with the report narrowed
  to `OutputSchema["Type"]`.
- Added `SdkCalculatorRunResponse<Report>` as a type-level projection over
  calculator-owned `CalculatorRunResponse`; no runtime DTO or schema mirror was
  introduced.
- Made `calculateReportRequest` delegate through `calculateRunRequest`, keeping
  `calculateReport` as the facts-only convenience over the request-preserving
  helper.
- Added SDK runtime coverage proving full-run helper parity with
  `PublicCalculatorService.calculate`, plus type-test coverage for
  descriptor-narrowed response typing and invalid facts rejection.
- Kept HTTP handler behavior unchanged for this slice; the calculate route
  still becomes thin in SDK-HTTP-003.
- Updated `.changeset/clear-api-sdk-names.md` to include the SDK Effect
  full-run helper in the existing patch release note.
- Verification passed:
  `bun run --filter=@whattax/sdk test`,
  `bun run --filter=@whattax/sdk test-types`,
  `bun run --filter=@whattax/sdk check-types`,
  `bun run --filter=@whattax/sdk build`,
  `bun run --filter=@whattax/sdk check-boundaries`,
  `rg -n 'calculateRunRequest|calculateReportRequest' packages/sdk/typescript/src packages/sdk/typescript/type-tests packages/sdk/typescript/README.md docs/product-specs/sdk-backed-http-api-thin-wrapper.md`,
  `bun run verification` and `bun run changeset status --verbose`.
- The implemented SDK call graph matches the spec:
  `calculateRunRequest -> PublicCalculatorService.calculate -> descriptor.decodeOutput(response.report) -> typed calculator response`;
  `calculateReportRequest -> calculateRunRequest -> response.report`;
  `calculateReport -> calculateReportRequest`.

### 2026-05-31 - SDK-HTTP-003 HTTP Thin Wrapper Slice

- Updated `CalculatorApiHandlerLive` calculate route to call
  `@whattax/sdk/effect` `calculateRunRequest` once and return the SDK
  full-run response directly.
- Removed calculate-route calls to `PublicCalculatorService.getCalculator`,
  `PublicCalculatorService.getCalculatorGraph` and local
  `CalculatorRunResponseData` construction. Metadata, schema and graph routes
  still use `PublicCalculatorService` directly.
- Updated HTTP API tests to compare calculate-route success and expected
  `CalculatorInputDecodeError` behavior against `calculateRunRequest`.
- Updated the HTTP API package README and
  `.changeset/clear-api-sdk-names.md` for the thin-wrapper behavior.
- Focused handler audit passed: the calculate route block contains no
  `getCalculator`, `getCalculatorGraph` or `CalculatorRunResponseData`
  references.
- SDK import-boundary evidence passed through
  `bun run --filter=@whattax/sdk check-boundaries`; `@whattax/sdk` still does
  not depend on `@whattax/http-api`.
- Verification passed:
  `bun run --filter=@whattax/http-api test`,
  `bun run --filter=@whattax/http-api check-types`,
  `bun run --filter=@whattax/http-api build`,
  `bun run --filter=@whattax/sdk test`,
  `bun run --filter=@whattax/sdk check-boundaries`,
  `bun run verification` and `bun run changeset status --verbose`.
- Implemented call graph:
  `CalculatorApiHandlerLive -> sdkCalculationFor(params.calculatorId) -> @whattax/sdk/effect calculateRunRequest -> PublicCalculatorService.calculate -> CalculatorRunResponseData -> descriptor output decode -> typed calculator response -> CalculatorApiErrorEnvelope on CalculatorServiceError`.

### 2026-05-31 - SDK-HTTP-004 Docs And Downstream Evidence Slice

- Updated durable architecture docs and package READMEs with final production
  and test call graphs for HTTP calculate over the SDK full-run helper.
- Updated package ownership guidance to make `@whattax/sdk/effect`
  `calculateRunRequest`, `calculateReportRequest` and `calculateReport`
  ownership explicit, while keeping `CalculatorRun*` schemas and
  `CalculatorServiceError` in `@whattax/calculators`.
- No additional Changeset was required for this slice because it is docs-only;
  the package-facing rename, SDK helper and HTTP thin-wrapper behavior are
  already covered by `.changeset/clear-api-sdk-names.md`.
- Downstream validation evidence:
  `/Users/cooper/Projects/adad/vendor/whattax` was checked out to the final
  committed WhatTax implementation for this spec, and
  `/Users/cooper/Projects/adad` passed `pnpm check-types` and `pnpm build`.
  The downstream app uses the SDK plain facade and HTTP client without
  adopting any deprecated names.
- Documentation audit target:
  `rg -n 'Production: HTTP calculate|Tests: HTTP over SDK|calculateRunRequest|CalculatorApiHandlerLive|CalculatorApiGroup' docs/architecture packages/*/README.md docs/exec-plans/active/sdk-backed-http-api-thin-wrapper.md`
  confirms the final public names and call graphs are present in durable docs.
