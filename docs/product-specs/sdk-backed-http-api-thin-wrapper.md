---
status: draft
last_reviewed: 2026-05-31
source_of_truth: docs
confidence: medium
---

# SDK-Backed HTTP API Thin Wrapper

## Overview

Make `@whattax/http-api` a thinner transport wrapper around the TypeScript SDK
for calculation execution.

The HTTP API already consumes `@whattax/sdk/effect` for the calculator report,
but the calculate handler still re-enters `PublicCalculatorService` to fetch
calculator metadata and graph diagnostics before constructing
`CalculatorRunResponseData`. That means the HTTP handler still knows too much
about reusable calculation response assembly.

This spec moves full calculator-run response assembly behind the SDK Effect
facade while keeping HTTP route schemas, status annotations, OpenAPI metadata
and HTTP error envelopes in `@whattax/http-api`.

## Problem

The current calculate call graph is split:

```ts
Production: current HTTP calculate

apps/api Bun process
  -> WhatTaxServerLayer
    -> PublicCalculationMetadataHandlerLive
      -> sdkCalculationFor(params.calculatorId)
      -> @whattax/sdk/effect calculateRequest
        -> PublicCalculatorService.calculate
          -> CalculatorCatalogEntry.inputSchema decode
          -> CalculationEngine
          -> CalculatorRunResponse
          -> descriptor output decode
        -> typed report
      -> PublicCalculatorService.getCalculator
      -> PublicCalculatorService.getCalculatorGraph
      -> new CalculatorRunResponseData({ calculator, diagnostics, report })
      -> PublicErrorEnvelope on CalculatorServiceError
```

This proves the SDK boundary but leaves two issues:

- the HTTP handler duplicates response assembly policy that belongs below the
  transport boundary
- success parity between HTTP and SDK relies on the handler stitching together
  service calls instead of delegating one complete run operation

## Goals

- Add SDK Effect helpers that return a full calculator-run response with the
  descriptor-specific report type preserved.
- Make the HTTP calculate handler call one SDK full-run helper and map only
  HTTP transport errors/envelopes.
- Keep `@whattax/sdk` independent of `@whattax/http-api`.
- Keep `@whattax/http-api` as the owner of route paths, params, query schemas,
  status annotations, OpenAPI metadata and HTTP error envelopes.
- Keep `@whattax/calculators` as the owner of `CalculatorRun*`,
  `CalculatorServiceError`, catalog lookup, selected input-schema decode,
  graph diagnostics and calculation execution.
- Preserve strict compile-time descriptor safety for SDK consumers.
- Preserve HTTP runtime behavior, response shape and typed error semantics.

## Non-Goals

- Do not make the SDK depend on HTTP routes, statuses, clients or envelopes.
- Do not move route schemas or OpenAPI annotations into the SDK.
- Do not hand-write mirrored HTTP DTOs for calculator-run responses.
- Do not change public HTTP route paths.
- Do not publish the SDK or remove `private: true`.
- Do not redesign metadata/list/schema/graph routes in this slice unless a
  verification failure requires a narrow fix.

## Ownership And Boundaries

`@whattax/sdk/effect` should own reusable in-process calculation facades:

- typed report-only helpers for app consumers
- typed full-run helpers for transport adapters and advanced consumers
- descriptor-to-input/output compile-time narrowing

`@whattax/http-api` should own only transport concerns:

- `HttpApiGroup` and `HttpApiEndpoint` definitions
- path params, query schemas and payload/status annotations
- OpenAPI descriptions
- `PublicErrorEnvelope`
- mapping typed SDK/calculator failures to HTTP error envelopes

`@whattax/calculators` remains the reusable calculation service owner:

- `PublicCalculatorService`
- `CalculatorRunRequest`, `CalculatorRunServiceRequest`,
  `CalculatorRunResponse`, `CalculatorRunReport`
- `CalculatorServiceError`
- graph diagnostics and selected calculator input-schema decode

## Proposed Approach

### Target Production Call Graph

```ts
Production: target HTTP calculate

apps/api Bun process
  -> WhatTaxServerLayer
    -> PublicCalculationMetadataHandlerLive
      -> sdkCalculationFor(params.calculatorId)
      -> @whattax/sdk/effect calculateRunRequest
        -> PublicCalculatorService.calculate
          -> CalculatorCatalogEntry.inputSchema decode
          -> CalculationEngine
            -> rule package scenario layer
            -> official rule pack layer
            -> calculator program
          -> CalculatorRunResponseData
        -> descriptor output decode for response.report
        -> typed CalculatorRunResponse with narrowed report
      -> PublicErrorEnvelope on CalculatorServiceError
```

The HTTP handler should not call `getCalculator`, `getCalculatorGraph` or
construct `CalculatorRunResponseData` inside the calculate route. Those details
are below the transport boundary once the SDK exposes a full-run helper.

### Target SDK Call Graph

```ts
Production: SDK Effect full run

Effect consumer
  -> @whattax/sdk/effect calculateRunRequest(descriptor, request)
    -> PublicCalculatorService.calculate({ calculatorId, ...request })
      -> CalculatorRunServiceRequest
      -> CalculatorRunResponse
    -> descriptor.decodeOutput(response.report)
    -> response with report narrowed to OutputSchema["Type"]

Report-only helpers
  -> calculateRequest(...)
    -> calculateRunRequest(...)
    -> response.report
  -> calculate(...)
    -> calculateRequest(...)
```

The full-run return type may be an SDK-owned type-level projection over
`CalculatorRunResponse`, for example:

```ts
export type SdkCalculatorRunResponse<Report> = Omit<
  CalculatorRunResponse,
  "report"
> & {
  readonly report: Report;
};
```

This is not a new runtime DTO or schema. It is a compile-time specialization
of the canonical calculator-owned response shape. Runtime construction should
reuse the `CalculatorRunResponse` value returned by `PublicCalculatorService`
and replace only the statically narrowed `report` value after descriptor
output decode.

### Plain SDK Follow-Up

The plain SDK can optionally expose a safe full-run helper after the Effect
helper exists:

```ts
Production: optional plain full run

consumer app
  -> WhatTax.calculateRun(...)
    -> ManagedRuntime over PublicCalculatorServiceLive
      -> @whattax/sdk/effect calculateRunRequest policy
    -> Promise<SdkCalculatorRunResponse<TypedReport>>
```

This is not required before making HTTP thinner. The critical path is the
Effect facade because HTTP handlers should stay in the typed Effect error
channel.

### Error Handling

`calculateRunRequest` should fail with:

```ts
CalculatorServiceError | Schema.SchemaError
```

`CalculatorServiceError` should map to `PublicErrorEnvelope` in
`@whattax/http-api`.

`Schema.SchemaError` from descriptor output decode is outside the declared
HTTP calculator-service failure contract. The current handler dies on this
case. The implementation may preserve that behavior or, if a canonical SDK
schema-decode error is already suitable, document the change explicitly and
cover it with tests before routing it through the HTTP envelope.

### Metadata Routes

Metadata/list/schema/graph routes may continue to call `PublicCalculatorService`
directly in this slice:

```ts
Production: metadata routes

HTTP handlers
  -> PublicCalculatorService.listCalculators / getCalculator / getCalculatorGraph
  -> PublicErrorEnvelope for expected lookup/context failures
```

A later uniform SDK catalog facade can move those routes through the SDK too.
Do not block the calculate-route cleanup on that broader catalog facade.

## Tests And Verification

```ts
Tests: SDK full-run helper

SDK Effect tests
  -> calculateRunRequest(...)
    -> PublicCalculatorServiceLive
      -> CalculationEngineLive
    -> response.report is descriptor-narrowed
    -> response.calculator and diagnostics match PublicCalculatorService
```

```ts
Tests: HTTP calculate thin wrapper

HTTP API tests
  -> WhatTaxServerLayer
    -> PublicCalculationMetadataHandlerLive
      -> @whattax/sdk/effect calculateRunRequest
        -> PublicCalculatorServiceLive
  -> success response matches SDK full-run response
  -> CalculatorInputDecodeError still maps to PublicErrorEnvelope
```

```ts
Tests: import boundaries

SDK boundary check
  -> @whattax/sdk has no @whattax/http-api dependency
  -> browser-safe entrypoints still avoid server-only modules

HTTP handler audit
  -> calculate route does not call getCalculator/getCalculatorGraph
  -> calculate route does not construct CalculatorRunResponseData
```

Required verification:

- `bun run --filter=@whattax/sdk test`
- `bun run --filter=@whattax/sdk test-types`
- `bun run --filter=@whattax/sdk check-types`
- `bun run --filter=@whattax/sdk build`
- `bun run --filter=@whattax/http-api test`
- `bun run --filter=@whattax/http-api check-types`
- `bun run --filter=@whattax/http-api build`
- `bun run --filter=@whattax/sdk check-boundaries`
- `bun run verification`
- `bun run changeset`
- `bun run changeset status --verbose`

## Risks And Tradeoffs

- A full-run SDK helper adds another public SDK function. It is worth doing
  before publication because it prevents HTTP-only response assembly from
  becoming the de facto reusable contract.
- The SDK full-run helper needs a type-level response projection. That is a
  narrow SDK-owned type convenience, not a duplicated runtime schema.
- Metadata routes will still call `PublicCalculatorService` directly until a
  later catalog facade exists. That keeps this slice focused and avoids
  designing a larger SDK catalog API prematurely.

## Versioning And Changelog Impact

Package-facing impact:

- `@whattax/sdk`: patch for new Effect full-run helper and exported type.
- `@whattax/http-api`: patch for handler behavior moving behind the SDK
  facade while preserving route behavior.

No `@whattax/calculators` Changeset is expected unless implementation changes
calculator-owned schemas, service contracts or runtime behavior.

## Acceptance Criteria

- `@whattax/sdk/effect` exports a full-run helper that returns the canonical
  calculator response shape with descriptor-narrowed `report` typing.
- Existing SDK report-only helpers delegate through the full-run helper instead
  of reimplementing service calls.
- The HTTP calculate handler calls one SDK full-run helper for successful
  calculation execution.
- The HTTP calculate handler no longer calls `getCalculator`,
  `getCalculatorGraph` or constructs `CalculatorRunResponseData`.
- HTTP route schemas, status annotations, OpenAPI metadata and
  `PublicErrorEnvelope` remain in `@whattax/http-api`.
- SDK import-boundary checks still prove no dependency on `@whattax/http-api`.
- Runtime parity tests prove HTTP success/error behavior still matches the SDK
  and calculator service.
- Type tests prove descriptor input/output narrowing is preserved.
- The spec, task list and relevant docs include current and target call graphs.

## References

- [API and SDK architecture](../architecture/api-and-sdk.md)
- [Package ownership](../architecture/package-ownership.md)
- [Effect services](../architecture/effect-services.md)
- [SDK public naming and export contract](./sdk-public-naming-and-export-contract.md)
