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
| SDK-HTTP-002 | pending | Add SDK Effect full-run helper. |
| SDK-HTTP-003 | pending | Make HTTP calculate delegate to SDK full-run helper. |
| SDK-HTTP-004 | pending | Document final call graph and downstream evidence. |

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
