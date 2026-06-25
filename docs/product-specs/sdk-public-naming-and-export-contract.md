---
status: implemented
last_reviewed: 2026-06-25
source_of_truth: docs
confidence: medium
---

# SDK public naming and export contract

## Overview

Stabilize the TypeScript SDK public naming and export contract before any npm
publication.

The current SDK implementation is functional, but several reusable calculator
execution schemas still carry API-era names such as `PublicCalculationRequest`
and `PublicCalculationResponse`. Those names are understandable inside an HTTP
API, but they are less appropriate as the shared contract for the calculator
service, SDK, HTTP adapter and downstream in-process consumers.

This spec defines the public naming direction, export-map contract and
verification expectations for a pre-publication cleanup slice.

## Implementation status

Implemented in the current repo:

- reusable calculator execution schemas use `CalculatorRun*` and
  `CalculatorServiceError`
- SDK and HTTP API import the canonical calculator-owned run contracts
- SDK schemas re-export canonical calculator-owned contracts without local
  schema mirrors
- SDK publish exports are dist-only and validated by packed-artifact smoke
  checks
- public docs and package READMEs use the final SDK/API names
- final validation evidence is tracked in
  [the completed execution plan](../exec-plans/completed/sdk-public-naming-and-export-contract.md)

This spec did not approve npm publication. `@whattax/sdk` remains private until
the release-prep gate explicitly removes `private: true`, runs the release
train and publishes.

## Problem

`PublicCalculation*` names describe exposure level rather than domain behaviour.
As the SDK becomes the primary developer entrypoint, names should describe what
the value does:

- run a calculator
- carry calculator facts and context
- return a calculator report and diagnostics
- represent calculator-service errors

If API-flavored names become the published SDK vocabulary, they will be hard to
change later without a breaking release. The current package export map also
contains a `source` condition that points to `src/**`, while release-prep
packing intentionally excludes source files. That is acceptable for local
workspace development but not for a clean public npm contract.

## Goals

- Replace reusable calculator execution names with stable domain/runtime names
  before publication.
- Keep HTTP-only transport names in `@whattax/http-api`.
- Preserve canonical schema ownership and avoid mirrored DTOs.
- Preserve compile-time safety for SDK descriptors, plain facade, Effect facade
  and downstream consumers.
- Keep runtime behaviour equivalent to the current calculator service, SDK and
  HTTP API behaviour.
- Lock the published SDK export map so every exported path resolves to packed
  files.
- Keep browser-safe entrypoints free from server-only modules.
- Validate the final names and exports through type tests, runtime parity tests,
  import-boundary checks, packed artifact smoke tests and downstream workspace
  validation.

## Non-goals

- Do not add new calculator behaviour or rule packs.
- Do not change public HTTP route paths.
- Do not make the SDK depend on `@whattax/http-api`.
- Do not publish, remove `private: true` or run `bun run version-repo` as part
  of this cleanup unless explicitly approved later.
- Do not preserve old public aliases indefinitely. Compatibility aliases may be
  useful during the repo migration, but final published docs should advertise
  the new names only.
- Do not rename lower-level `packages/core` engine types such as
  `CalculationRequest`; those are different internal engine concepts.

## Ownership and boundaries

`@whattax/calculators` owns reusable calculator execution schemas, request
context schemas, report unions, diagnostics-bearing response schemas,
calculator-service errors and `PublicCalculatorService`.

`@whattax/sdk` owns developer-facing descriptors, module composition, plain
Promise facade, Effect facade, SDK safe-result errors and SDK export paths. It
may re-export calculator-owned schemas from `@whattax/sdk/schemas` for
consumer convenience, but it must not duplicate those schemas.

`@whattax/http-api` owns HTTP route schemas, path/query/status annotations,
OpenAPI metadata, HTTP error envelopes and typed HTTP clients. It may import
calculator or SDK schemas, but transport-only names must remain in the HTTP API
package.

Downstream workspaces should consume the SDK through public package entrypoints
instead of direct rule-package or calculator-service internals for application
flows.

## Proposed approach

### Canonical calculator runtime names

Use `CalculatorRun*` for reusable calculator execution values owned by
`@whattax/calculators`:

| Current name | New canonical name | Notes |
| --- | --- | --- |
| `PublicCalculationFacts` | `CalculatorRunFacts` | Union of canonical rule-owned scenario input schemas. |
| `PublicCalculationRequest` | `CalculatorRunRequest` | Body payload: facts plus optional calculator context. |
| `PublicCalculationServiceRequest` | `CalculatorRunServiceRequest` | Service call shape: calculator id, query options and payload. |
| `PublicCalculationReport` | `CalculatorRunReport` | Union of canonical rule-owned reports/ledgers. |
| `PublicCalculationResponse` | `CalculatorRunResponse` | Calculator metadata, diagnostics and report. |
| `PublicCalculationResponseData` | `CalculatorRunResponseData` | Data constructor for the response schema. |
| `PublicApiError` / `PublicCalculatorError` | `CalculatorServiceError` | Reusable calculator-service error union. |

HTTP route groups may still use names such as `PublicErrorEnvelope` because
those names describe HTTP exposure and status encoding. The reusable
calculator package should not use `Public*` for values that SDK and in-process
consumers also use.

### Transitional aliases

During implementation, compatibility aliases may be kept inside
`@whattax/calculators` if they reduce migration risk across existing packages:

```ts
export const PublicCalculationRequest = CalculatorRunRequest;
export type PublicCalculationRequest = CalculatorRunRequest;
```

Those aliases must be marked as transitional in docs or comments and must not
be advertised in SDK README examples, architecture docs or future public docs.
If implementation can update all internal consumers in one slice without
churn, prefer removing the old aliases before publication.

### SDK export contract

The first publishable SDK package remains `@whattax/sdk` unless a later
release-prep decision switches to the unscoped `whattax` package name.

The public export map should be:

```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.js"
  },
  "./au": {
    "types": "./dist/au.d.ts",
    "default": "./dist/au.js"
  },
  "./au/effect": {
    "types": "./dist/au-effect.d.ts",
    "default": "./dist/au-effect.js"
  },
  "./effect": {
    "types": "./dist/effect.d.ts",
    "default": "./dist/effect.js"
  },
  "./schemas": {
    "types": "./dist/schemas/index.d.ts",
    "default": "./dist/schemas/index.js"
  },
  "./testing": {
    "types": "./dist/testing/index.d.ts",
    "default": "./dist/testing/index.js"
  }
}
```

Do not publish a `source` export condition unless source files are included in
the packed artifact and the team intentionally supports source-condition
consumers. The release-prep preference is a dist-only artifact.

### SDK schema exports

`@whattax/sdk/schemas` should re-export SDK-owned error/result schemas and the
canonical calculator-run schemas that SDK consumers reasonably need:

- `CalculatorRunFacts`
- `CalculatorRunRequest`
- `CalculatorRunResponse`
- `CalculatorRunReport`
- `CalculatorServiceError`
- `WhatTaxCalculationError`
- `WhatTaxCalculationErrorDetail`
- `WhatTaxSchemaDecodeError`
- `WhatTaxUnexpectedError`

These exports must be re-exports of owning schemas, not mirrored local
definitions.

### Descriptor and facade names

Keep SDK-specific descriptor names unless implementation uncovers a concrete
problem:

- `SdkCalculation`
- `SdkCalculationDefinition`
- `WhatTaxModule`
- `CalculationInput`
- `CalculationOutput`
- `ModuleCalculation`

These names describe SDK composition rather than HTTP/API exposure. Renaming
them is not required for publication.

### Runtime and type safety

The rename must not weaken:

- descriptor-to-input-schema inference
- descriptor-to-output-report inference
- module capability narrowing
- request-preserving Effect facade typing
- HTTP API runtime error parity with the SDK and calculator service
- downstream compile-time misuse checks

The generic HTTP route remains dynamically selected by path parameter, so it
cannot statically narrow facts by `calculatorId`. It must continue to validate
with the selected calculator's canonical `inputSchema` inside
`@whattax/calculators`.

## Risks and tradeoffs

- Renaming exported schemas is a package-facing change. It should happen before
  npm publication to avoid a public breaking change later.
- Transitional aliases reduce migration risk but can make the public surface
  look larger than intended. If aliases remain, they need an explicit removal
  decision before publish.
- Removing the `source` export condition may affect local tooling that relies
  on source-condition resolution. Verification must cover workspace builds and
  packed artifact imports.
- `CalculatorRun*` is more specific than `PublicCalculation*`, but it still
  leaves room for future non-run metadata names such as `CalculatorCatalogItem`
  and `CalculatorGraphResponse`.

## Versioning and changelog impact

This is package-facing work. Expected Changesets:

- `@whattax/calculators`: patch before publication, because the package is
  still private but exported names change.
- `@whattax/sdk`: patch for schema/export contract changes.
- `@whattax/http-api`: patch if imports, route docs or generated client types
  change.

Do not run `bun run version-repo` unless the user explicitly approves a
release-prep/versioning slice.

## Acceptance criteria

- Canonical reusable calculator execution names are `CalculatorRun*` and
  `CalculatorServiceError`, not `PublicCalculation*` or `PublicApiError`.
- HTTP-only public/transport names remain scoped to `@whattax/http-api`.
- SDK code and docs use canonical calculator-run names.
- SDK export map has no packed-missing `source` condition.
- `@whattax/sdk/schemas` re-exports canonical calculator-run schemas and
  SDK-owned error schemas without local duplication.
- Type tests prove SDK descriptor and request typing still reject mismatched
  facts and unsupported module capabilities.
- Runtime tests prove SDK, calculator service and HTTP API parity still holds.
- Packed artifact smoke tests prove all SDK export paths resolve from the
  packed package.
- Downstream workspace validation passes with the new names and export map.
- Package-facing changes include Changesets.
- `bun run verification` passes.

## References

- [API and SDK architecture](../architecture/api-and-sdk.md)
- [Package ownership](../architecture/package-ownership.md)
- [Package boundaries](../architecture/package-boundaries.md)
- [Effect services](../architecture/effect-services.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [TypeScript SDK and publishing](./typescript-sdk-and-publishing.md)
