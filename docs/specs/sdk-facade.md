# SDK Facade Export Spec

The SDK facade is the public TypeScript entrypoint for WhatTax calculations. It should let consumers import one stable `WhatTax` object for plain TypeScript usage, or import the Effect-native variant from an explicit `/effect` export path when they want to compose the calculation engine with Layers, services, managed runtimes, traces and typed failures.

This facade is the boundary that HTTP handlers, examples and external projects should use. It must expose the calculation engine without forcing consumers to understand the internal package graph.

The root SDK must be coherent as an SDK, not as a mirror of the current Australian rule packages. It should feel like Stripe or Vercel: one obvious client factory, explicit configuration, resource namespaces, typed method calls and stable subpath exports for advanced capabilities.

## Goals

- Provide a clean public package surface for direct, in-process WhatTax calculations.
- Support both plain TypeScript consumers and Effect-native consumers without mixing the two contracts.
- Make common workflows discoverable through a `WhatTax` factory, client methods and resource namespaces.
- Keep all public input and output types derived from Effect Schema.
- Preserve branded domain types and Effect services internally so engine composition remains type-safe.
- Make the HTTP API handlers consume the same facade that published SDK users consume.
- Keep bundle boundaries explicit so direct calculations, HTTP clients, test helpers and server-only adapters can be code-split independently.
- Keep the root SDK jurisdiction-neutral so future countries, facts, rule packs and calculators do not require a breaking redesign.

## Non-Goals

- Do not make the default SDK entrypoint an HTTP-only client.
- Do not leak Effect runtime types from the plain TypeScript export path.
- Do not import HTTP server handlers from the SDK package.
- Do not introduce global mutable tax configuration.
- Do not collapse rule packs, facts, parameters and calculators into one untyped registry.
- Do not make UI or application-layer concerns part of the SDK facade.
- Do not put Australian tax-year or PAYG concepts directly at the root of the SDK.

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

## SDK Shape Principles

The SDK should follow the strongest ergonomics from mature TypeScript SDKs:

- `WhatTax` is the exported product object and factory.
- `WhatTax.create(config)` returns an isolated client instance.
- Client instances are immutable from the caller's perspective.
- Capabilities are grouped by resources such as `calculations`, `facts`, `rules`, `parameters` and `graphs`.
- Jurisdiction-specific rules are opt-in subpath imports, not always-loaded root imports.
- Configuration is explicit and serializable where possible.
- Static convenience helpers may exist, but they should delegate to a configured client rather than becoming hidden global state.
- Every public method is documented, typed from Schema and stable across runtimes.

Reference SDK patterns:

- [Stripe server-side SDKs](https://docs.stripe.com/sdks/server-side) document `StripeClient` as the entry point for resource discovery, multiple independently configured clients and testability without static methods.
- [Vercel SDK](https://vercel.com/docs/sdk) documents a type-safe TypeScript SDK initialized with a `Vercel` client object that exposes platform resources and methods.

The plain TypeScript facade should prefer this shape:

```ts
import { WhatTax } from "whattax";
import { au } from "whattax/au";

const whattax = WhatTax.create({
  rulePacks: [au.rulePacks.payg({ taxYear: "2025-26" })],
});

const result = await whattax.calculations.calculate(
  au.calculations.payg.withholding,
  {
    grossPay: { cents: 250_000, currency: "AUD" },
    payPeriod: "fortnightly",
    taxFreeThresholdClaimed: true,
  }
);
```

Jurisdiction packages may expose narrower ergonomic clients for common local workflows:

```ts
import { au } from "whattax/au";

const auTax = au.create({ taxYear: "2025-26" });

const result = await auTax.payg.calculateWithholding({
  grossPay: { cents: 250_000, currency: "AUD" },
  payPeriod: "fortnightly",
  taxFreeThresholdClaimed: true,
});
```

The first example is the canonical architecture because it keeps calculations and rule packs explicit. The second example is allowed as a thin jurisdiction-specific convenience layer over the same descriptors and client runtime.

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
    "./au": {
      "types": "./dist/au.d.ts",
      "default": "./dist/au.js"
    },
    "./au/effect": {
      "types": "./dist/au-effect.d.ts",
      "default": "./dist/au-effect.js"
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

`"./au"` is the Australian jurisdiction module. It may expose AU rule packs, calculation descriptors, local presets and local convenience clients. `./au/effect` exposes the same jurisdiction-specific capabilities as Effect-native descriptors and Layers. Neither entrypoint may be required by the root SDK unless a consumer imports it.

`"./schemas"` exports browser-safe public schemas and derived DTO types. It should not export server-only handlers, filesystem fixtures or package-internal rule implementation details.

`"./testing"` exports compatibility fixtures, golden test helpers and deterministic test Layers. It should stay out of production bundles unless explicitly imported.

## Plain TypeScript Usage

Plain consumers should be able to import the default facade and create a client:

```ts
import { WhatTax } from "whattax";
import { au } from "whattax/au";

const whattax = WhatTax.create({
  rulePacks: [au.rulePacks.payg({ taxYear: "2025-26" })],
});

const result = await whattax.calculations.calculate(
  au.calculations.payg.withholding,
  {
    grossPay: { cents: 250_000, currency: "AUD" },
    payPeriod: "fortnightly",
    taxFreeThresholdClaimed: true,
  }
);
```

Top-level convenience methods are allowed only when they stay generic:

```ts
const result = await WhatTax.calculate({
  calculation: au.calculations.payg.withholding,
  input: {
    grossPay: { cents: 250_000, currency: "AUD" },
    payPeriod: "fortnightly",
    taxFreeThresholdClaimed: true,
  },
  rulePacks: [au.rulePacks.payg({ taxYear: "2025-26" })],
});
```

Default methods should return `Promise` values and throw only documented `WhatTaxError` subclasses. For integration code that prefers explicit error values, expose a `safe` namespace on the client and root facade:

```ts
const result = await whattax.safe.calculations.calculate(
  au.calculations.payg.withholding,
  input
);

if (result.ok) {
  console.log(result.value.netPay);
} else {
  console.error(result.error);
}
```

The plain root facade should expose SDK construction and generic resources first:

```ts
export const WhatTax = {
  calculate,
  create,
  describe,
  errors,
  facts,
  rules,
  safe,
  schemas,
  version,
} as const;
```

The configured client should expose resource namespaces:

```ts
export interface WhatTaxClient {
  readonly calculations: {
    readonly calculate: CalculateMethod;
    readonly describe: DescribeCalculationMethod;
    readonly list: ListCalculationsMethod;
  };
  readonly facts: {
    readonly decode: DecodeFactMethod;
    readonly describe: DescribeFactMethod;
    readonly list: ListFactsMethod;
  };
  readonly graphs: {
    readonly describe: DescribeGraphMethod;
    readonly validate: ValidateGraphMethod;
  };
  readonly parameters: {
    readonly describe: DescribeParameterSetMethod;
    readonly list: ListParameterSetsMethod;
  };
  readonly rules: {
    readonly describe: DescribeRuleMethod;
    readonly list: ListRulesMethod;
    readonly validate: ValidateRulesMethod;
  };
  readonly safe: WhatTaxSafeClient;
}
```

Inputs and outputs from the plain facade should be JSON-safe DTOs. Internal branded Schema classes, BigDecimal values, HashMaps, Chunks and graph nodes may be used by the engine, but plain facade return values should be stable values that can cross HTTP, worker and persistence boundaries.

## Effect-Native Usage

Effect consumers should be able to import the same facade name from `/effect`:

```ts
import { Effect } from "effect";
import { WhatTax } from "whattax/effect";
import { au } from "whattax/au/effect";

const program = WhatTax.make({
  rulePacks: [au.rulePacks.payg({ taxYear: "2025-26" })],
}).pipe(
  Effect.flatMap((whattax) =>
    whattax.calculations.calculate(au.calculations.payg.withholding, input)
  )
);

const result = await Effect.runPromise(program);
```

The `/effect` methods should return typed Effect programs:

```ts
declare const calculate: <I, O, R>(
  calculation: CalculationDescriptor<I, O, R>,
  input: I
) => Effect.Effect<
  O,
  WhatTaxError,
  CalculatorEngine | RulePackRegistry | ParameterTableRegistry
>;
```

The exact service requirements should be specific rather than collapsed to `never` unless the facade provides a documented default Layer. This preserves compile-time composition and makes tax-year or rule-pack substitution explicit.

The Effect facade should expose:

```ts
export const WhatTax = {
  calculate,
  createLayer,
  descriptors,
  facts,
  layers,
  make,
  rules,
  services,
  schemas,
  testing,
  validateRuleGraph,
  version,
} as const;
```

`layers` should provide generic SDK services. Jurisdiction-specific production compositions such as AU rule packs belong in jurisdiction subpaths like `whattax/au/effect`. Runtime construction belongs at the edge; reusable Layers belong in the SDK and rule packages.

## Method Contract

Every public method should have three artifacts:

- a public input Schema
- a public output Schema
- a method implementation whose input and output types are derived from those Schemas

Example:

```ts
export class CalculationRequest<
  CalculationId extends string,
  Input,
> extends Schema.Class<CalculationRequest<CalculationId, Input>>(
  "CalculationRequest"
)({
  calculation: CalculationId,
  facts: Schema.Record({ key: FactId, value: Schema.Unknown }),
  options: Schema.optional(CalculationOptions),
}) {}

export type CalculationRequestEncoded = Schema.Schema.Encoded<
  typeof CalculationRequest
>;
export type CalculationRequestType = Schema.Schema.Type<
  typeof CalculationRequest
>;
```

The plain facade should accept encoded DTO input when that is friendlier for application callers, decode it through Schema, call the Effect facade, and encode the output DTO before returning.

The Effect facade should accept decoded domain values where that improves type safety, but it should also provide explicit decoder helpers for edge code:

```ts
WhatTax.schemas.CalculationRequest.decodeUnknown(input);
WhatTax.schemas.CalculationReport.encode(report);
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

Jurisdiction modules such as `whattax/au` may depend on AU domain and rule packages, but the root SDK entrypoint must stay jurisdiction-neutral.

## Export Management

The facade should use explicit named exports rather than broad barrels. Each entrypoint should export only its public contract:

```ts
export { WhatTax } from "./facade/plain.js";
export type {
  CalculationDescriptor,
  CalculationReport,
  FactDescriptor,
  RuleDescriptor,
  WhatTaxClient,
  WhatTaxResult,
} from "./facade/types.js";
```

Internal files should be sorted by Ultracite/Oxlint export rules. Do not disable export sorting or key sorting to make manual grouping easier. Stable export order is part of the package's bundling and review hygiene.

## HTTP API Handler Usage

HTTP handlers should use the Effect facade:

```ts
import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { au } from "whattax/au/effect";
import { WhatTax } from "whattax/effect";

export const TakeHomePayHandler = HttpApiBuilder.handler(
  "calculateTakeHomePay",
  ({ payload }) =>
    WhatTax.make({
      rulePacks: [au.rulePacks.payg({ taxYear: payload.taxYear })],
    }).pipe(
      Effect.flatMap((whattax) =>
        whattax.calculations.calculate(
          au.calculations.payg.withholding,
          payload
        )
      ),
      Effect.map(WhatTax.schemas.CalculationReport.encodeSync)
    )
);
```

This makes the HTTP API a transport over the SDK facade. It should not reimplement rule composition, validation, calculator lookup or result encoding.

## Testing Requirements

The SDK facade implementation should include:

- export map tests that import `"whattax"`, `"whattax/effect"`, `"whattax/schemas"` and `"whattax/testing"`
- jurisdiction subpath tests that import `"whattax/au"` and `"whattax/au/effect"` without importing them from the root path
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
- a jurisdiction module guide for `import { au } from "whattax/au"`
- an HTTP handler guide that shows API handlers consuming the Effect facade
- public method reference pages generated or kept in sync with docstrings
- examples for Node, Bun and browser-safe schema validation

Docstrings on public SDK methods should follow `docs/standards/docstrings.md`: clear summary, `@example` where useful, documented return contract and lint-approved tags only.

## Implementation Plan

1. Create `packages/sdk/typescript` with `bun`, TypeScript 6, Ultracite, Oxfmt, Oxlint and Knip wired through workspace scripts.
2. Add generic public descriptors for calculations, facts, rules, parameters, graphs and reports.
3. Add public schemas for the generic SDK contracts and derive encoded/type aliases from Schema.
4. Implement the Effect-native client factory, resource namespaces and calculation execution over the existing engine.
5. Implement the plain client factory by decoding input, running the Effect facade with configured Layers, encoding output and mapping typed errors to public DTOs.
6. Add an AU subpath module that exports AU rule packs, calculation descriptors and thin local convenience clients.
7. Move HTTP API handlers to `whattax/effect` plus explicit jurisdiction modules so handlers and SDK users share one calculation contract.
8. Add export-map, subpath, schema, Layer-substitution, safe-result and handler-parity tests.
9. Add SDK quickstart documentation and public docstrings.
10. Add a changeset for the new package and any public package exports changed by the integration.

## Open Decisions

- Confirm whether the first public package name will be `whattax` or `@whattax/sdk`.
- Confirm whether direct plain methods should throw documented errors by default, or whether `safe` result methods should be the primary examples.
- Confirm the first supported AU convenience workflows. The proposed initial set is annual income tax, PAYG withholding and take-home pay.
- Confirm whether jurisdiction convenience clients should be generated from descriptors or handwritten as thin wrappers.
