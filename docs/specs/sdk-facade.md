# SDK Facade Export Spec

The SDK facade is the public TypeScript entrypoint for WhatTax calculations. It should let consumers import one stable `WhatTax` object for plain TypeScript usage, or import the Effect-native variant from an explicit `/effect` export path when they want to compose the calculation engine with Layers, services, managed runtimes, traces and typed failures.

This facade is the boundary that HTTP handlers, examples and external projects should use. It must expose the calculation engine without forcing consumers to understand the internal package graph.

## Goals

- Provide a clean public package surface for direct, in-process WhatTax calculations.
- Support both plain TypeScript consumers and Effect-native consumers without mixing the two contracts.
- Make common workflows discoverable through `WhatTax.{method}` calls.
- Keep all public input and output types derived from Effect Schema.
- Preserve branded domain types and Effect services internally so engine composition remains type-safe.
- Make the HTTP API handlers consume the same facade that published SDK users consume.
- Keep bundle boundaries explicit so direct calculations, HTTP clients, test helpers and server-only adapters can be code-split independently.

## Non-Goals

- Do not make the default SDK entrypoint an HTTP-only client.
- Do not leak Effect runtime types from the plain TypeScript export path.
- Do not import HTTP server handlers from the SDK package.
- Do not introduce global mutable tax configuration.
- Do not collapse rule packs, facts, parameters and calculators into one untyped registry.
- Do not make UI or application-layer concerns part of the SDK facade.

## Package Shape

The SDK package should live at:

```txt
packages/sdk/typescript
```

The preferred published package name is:

```txt
whattax
```

If the unscoped package name is unavailable at first publish, use `@whattax/sdk` as the public package name and keep the same export contract. Avoid publishing the primary facade as `@whattax/sdk-typescript`; that name describes an implementation detail rather than the user-facing product.

## Export Map

The package should expose explicit entrypoints:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./effect": {
      "types": "./dist/effect.d.ts",
      "default": "./dist/effect.js"
    },
    "./schemas": {
      "types": "./dist/schemas.d.ts",
      "default": "./dist/schemas.js"
    },
    "./testing": {
      "types": "./dist/testing.d.ts",
      "default": "./dist/testing.js"
    }
  },
  "sideEffects": false
}
```

`"."` must be browser-safe and plain TypeScript friendly. It may use Effect internally, but must not expose `Effect.Effect`, `Layer`, `Context.Tag`, `Cause` or service types in exported method signatures.

`"./effect"` is the Effect-native facade. It may expose `Effect`, `Layer`, services, branded Schema classes, typed errors, graph validation and trace controls.

`"./schemas"` exports browser-safe public schemas and derived DTO types. It should not export server-only handlers, filesystem fixtures or package-internal rule implementation details.

`"./testing"` exports compatibility fixtures, golden test helpers and deterministic test Layers. It should stay out of production bundles unless explicitly imported.

## Plain TypeScript Usage

Plain consumers should be able to import the default facade and call top-level methods:

```ts
import { WhatTax } from "whattax";

const result = await WhatTax.calculateTakeHomePay({
  country: "AU",
  grossPay: { cents: 250_000, currency: "AUD" },
  payPeriod: "fortnightly",
  taxYear: "2025-26",
  taxFreeThresholdClaimed: true,
});
```

The default methods should return `Promise` values and throw only documented `WhatTaxError` subclasses. For integration code that prefers explicit error values, expose a `safe` namespace:

```ts
const result = await WhatTax.safe.calculateTakeHomePay(input);

if (result.ok) {
  console.log(result.value.netPay);
} else {
  console.error(result.error);
}
```

The plain facade should expose common calculation workflows first:

```ts
export const WhatTax = {
  calculateAnnualIncomeTax,
  calculatePaygWithholding,
  calculateTakeHomePay,
  describeCalculator,
  getRuleGraph,
  listCalculators,
  safe,
  schemas,
  version,
} as const;
```

Inputs and outputs from the plain facade should be JSON-safe DTOs. Internal branded Schema classes, BigDecimal values, HashMaps, Chunks and graph nodes may be used by the engine, but plain facade return values should be stable values that can cross HTTP, worker and persistence boundaries.

## Effect-Native Usage

Effect consumers should be able to import the same facade name from `/effect`:

```ts
import { Effect } from "effect";
import { WhatTax } from "whattax/effect";

const program = WhatTax.calculateTakeHomePay(input);

const result = await Effect.runPromise(
  program.pipe(Effect.provide(WhatTax.layers.au.default))
);
```

The `/effect` methods should return typed Effect programs:

```ts
declare const calculateTakeHomePay: (
  input: TakeHomePayInput
) => Effect.Effect<
  TakeHomePayReport,
  WhatTaxError,
  CalculatorEngine | RulePackRegistry | ParameterTableRegistry
>;
```

The exact service requirements should be specific rather than collapsed to `never` unless the facade provides a documented default Layer. This preserves compile-time composition and makes tax-year or rule-pack substitution explicit.

The Effect facade should expose:

```ts
export const WhatTax = {
  calculateAnnualIncomeTax,
  calculatePaygWithholding,
  calculateTakeHomePay,
  descriptors,
  layers,
  services,
  schemas,
  testing,
  validateRuleGraph,
  version,
} as const;
```

`layers` should provide supported production compositions such as `layers.au.default`, `layers.au.withPayg2025_26`, and test-only compositions under the testing export path. Runtime construction belongs at the edge; reusable Layers belong in the SDK and rule packages.

## Method Contract

Every public method should have three artifacts:

- a public input Schema
- a public output Schema
- a method implementation whose input and output types are derived from those Schemas

Example:

```ts
export class TakeHomePayInput extends Schema.Class<TakeHomePayInput>(
  "TakeHomePayInput"
)({
  country: CountryCode,
  grossPay: MoneyDto,
  payPeriod: PayPeriod,
  taxFreeThresholdClaimed: Schema.Boolean,
  taxYear: AustralianIncomeTaxYear,
}) {}

export type TakeHomePayInputEncoded = Schema.Schema.Encoded<
  typeof TakeHomePayInput
>;
export type TakeHomePayInputType = Schema.Schema.Type<typeof TakeHomePayInput>;
```

The plain facade should accept encoded DTO input when that is friendlier for application callers, decode it through Schema, call the Effect facade, and encode the output DTO before returning.

The Effect facade should accept decoded domain values where that improves type safety, but it should also provide explicit decoder helpers for edge code:

```ts
WhatTax.schemas.TakeHomePayInput.decodeUnknown(input);
WhatTax.schemas.TakeHomePayReport.encode(report);
```

## Error Contract

Public errors should be tagged, serializable and Schema-derived:

```ts
type WhatTaxError =
  | CalculationInputError
  | UnsupportedTaxYearError
  | MissingRuleProviderError
  | DuplicateRuleProviderError
  | RuleGraphCycleError
  | ParameterTableError;
```

The plain facade may throw these documented errors from direct methods. Safe methods must return:

```ts
type WhatTaxResult<A> =
  | { readonly ok: true; readonly value: A }
  | { readonly ok: false; readonly error: WhatTaxErrorDto };
```

The Effect facade should preserve the richer typed error channel and should not convert failures to exceptions except at explicit runtime boundaries.

## Layering And Dependencies

The SDK facade depends on calculation packages, not the other way around:

```txt
packages/core/**
  <- packages/domain/**
  <- packages/rules/**
  <- packages/sdk/typescript
  <- packages/api/http
  <- apps/api
```

`packages/api/http` should import from `whattax/effect` for handlers. This keeps HTTP handlers aligned with published calculation behavior and avoids a second API-specific calculation composition.

The SDK package must not import from:

- `packages/api/**`
- `apps/**`
- docs packages
- server-only adapters from browser-safe entrypoints

## Export Management

The facade should use explicit named exports rather than broad barrels. Each entrypoint should export only its public contract:

```ts
export { WhatTax } from "./facade/plain.js";
export type {
  PaygWithholdingInput,
  PaygWithholdingReport,
  TakeHomePayInput,
  TakeHomePayReport,
  WhatTaxResult,
} from "./facade/types.js";
```

Internal files should be sorted by Ultracite/Oxlint export rules. Do not disable export sorting or key sorting to make manual grouping easier. Stable export order is part of the package's bundling and review hygiene.

## HTTP API Handler Usage

HTTP handlers should use the Effect facade:

```ts
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { WhatTax } from "whattax/effect";

export const TakeHomePayHandler = HttpApiBuilder.handler(
  "calculateTakeHomePay",
  ({ payload }) =>
    WhatTax.calculateTakeHomePay(payload).pipe(
      Effect.provide(WhatTax.layers.au.default),
      Effect.map(WhatTax.schemas.TakeHomePayReport.encodeSync)
    )
);
```

This makes the HTTP API a transport over the SDK facade. It should not reimplement rule composition, validation, calculator lookup or result encoding.

## Testing Requirements

The SDK facade implementation should include:

- export map tests that import `"whattax"`, `"whattax/effect"`, `"whattax/schemas"` and `"whattax/testing"`
- plain facade tests for success and documented error cases
- `safe` facade tests for discriminated result behavior
- Effect facade tests proving Layer substitution changes calculation behavior intentionally
- schema round-trip tests for all public input and output DTOs
- handler parity tests proving HTTP handlers return the same encoded result as `whattax/effect`
- bundle/import tests proving the plain and schemas entrypoints do not import server-only modules

## Documentation Requirements

The first implementation should add:

- a quickstart for `import { WhatTax } from "whattax"`
- an Effect-native guide for `import { WhatTax } from "whattax/effect"`
- an HTTP handler guide that shows API handlers consuming the Effect facade
- public method reference pages generated or kept in sync with docstrings
- examples for Node, Bun and browser-safe schema validation

Docstrings on public SDK methods should follow `docs/standards/docstrings.md`: clear summary, `@example` where useful, documented return contract and lint-approved tags only.

## Implementation Plan

1. Create `packages/sdk/typescript` with `bun`, TypeScript 6, Ultracite, Oxfmt, Oxlint and Knip wired through workspace scripts.
2. Add public schemas for the initial calculation workflows and derive encoded/type aliases from Schema.
3. Implement the `/effect` facade over the existing calculator engine, rule descriptors and production Layers.
4. Implement the plain facade by decoding input, running the Effect facade with the documented default Layer, encoding output and mapping typed errors to public DTOs.
5. Move HTTP API handlers to `whattax/effect` so handlers and SDK users share one calculation contract.
6. Add export-map, schema, Layer-substitution, safe-result and handler-parity tests.
7. Add SDK quickstart documentation and public docstrings.
8. Add a changeset for the new package and any public package exports changed by the integration.

## Open Decisions

- Confirm whether the first public package name will be `whattax` or `@whattax/sdk`.
- Confirm whether direct plain methods should throw documented errors by default, or whether `safe` result methods should be the primary examples.
- Confirm the first supported top-level workflows. The proposed initial set is annual income tax, PAYG withholding and take-home pay.
- Confirm whether the default plain facade should include one Australian production Layer or require consumers to pass an explicit country/tax-year configuration object.
