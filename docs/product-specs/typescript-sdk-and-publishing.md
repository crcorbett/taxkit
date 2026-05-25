---
status: draft
last_reviewed: 2026-05-24
source_of_truth: docs
confidence: medium
---

# TypeScript SDK And Publishing

## Overview

Build the public TypeScript SDK as the main developer entrypoint for in-process
WhatTax calculations, schema validation and typed calculation facades.

Target package:

```txt
packages/sdk/typescript
```

Preferred public package name:

```txt
whattax
```

If the unscoped package name is unavailable or not ready to claim for the first
public release, use `@whattax/sdk` with the same export contract. Do not publish
the primary facade as `@whattax/sdk-typescript`.

The first downstream consumer should validate the SDK through a real external
workspace before npm publication. Public WhatTax docs should describe this as
downstream consumer validation and must not name private products or repos.

## Problem

WhatTax now has an implemented public API app, HTTP API package and reusable
`@whattax/calculators` service boundary. Direct TypeScript consumers still need
a coherent SDK that is easier and safer than importing individual rule packages,
calculator services and Effect layers by hand.

The SDK must not become a second calculator runtime. It should reuse
`@whattax/calculators` for catalog lookup, metadata, graph validation,
calculation dispatch and schema-guided public errors. Its job is to add a
product-shaped facade with extremely strict compile-time relationships between
modules, calculator ids, input schemas, output reports, jurisdictions, tax years
and runtime capabilities.

## Goals

- Create a publishable TypeScript SDK package under `packages/sdk/typescript`.
- Provide a plain TypeScript facade with `WhatTax.create(...)`, resource
  namespaces and Promise-based methods that do not expose Effect runtime types.
- Provide an Effect-native facade through `whattax/effect` for service/layer
  composition, tests and advanced consumers.
- Expose jurisdiction-specific opt-in subpaths such as `whattax/au` and
  `whattax/au/effect` without importing AU rule packages from the root entry.
- Preserve compile-time safety across calculator id, module capability, input
  schema, output report, jurisdiction and tax year.
- Reuse canonical schemas, branded ids, scenario input schemas, report schemas,
  tagged errors, services and constructors from owning packages.
- Reuse `@whattax/calculators` as the runtime execution boundary instead of
  duplicating catalog maps, graph validation or calculation dispatch.
- Add browser-safe schemas and typed calculation helpers for application
  consumers.
- Add type-level tests that prove unsupported calculations, mismatched inputs,
  incompatible tax years and missing capabilities fail at compile time.
- Validate the first SDK surface in a downstream workspace before npm
  publication.
- Prepare Changesets, package metadata and release docs for eventual public
  npm publication.

## Non-Goals

- Do not build a second calculator catalog or execution engine in the SDK.
- Do not expose `Effect.Effect`, `Layer`, `Context.Tag`, `Cause` or service
  types from the plain `whattax` entrypoint.
- Do not make the default SDK entrypoint an HTTP-only client.
- Do not make the SDK depend on `@whattax/http-api`. The HTTP API package should
  consume the SDK facade like any other transport adapter.
- Do not import HTTP server handlers, app runtime modules or Node-only helpers
  from browser-safe SDK entrypoints.
- Do not mirror fact DTOs, request DTOs or report DTOs already owned by rule
  packages, `@whattax/calculators` or `@whattax/http-api`.
- Do not add private downstream product details to public WhatTax docs.
- Do not run `bun run version-repo` or remove `private: true` during ordinary
  implementation slices. Publishing readiness is a deliberate release-prep
  slice.

## Ownership And Boundaries

`packages/core` owns branded primitives, fact descriptors, rule descriptors,
graph metadata, trace, ledgers, common tagged errors and `CalculationEngine`.

Rule packages own canonical facts, scenario input schemas, report schemas,
calculator ids, supported context literals, rule-pack layers, parameter layers
and golden tests.

`@whattax/calculators` owns reusable calculator orchestration: catalog entries,
metadata responses, graph responses, `PublicCalculatorService`, canonical
`CalculatorRun*` schemas, `CalculatorServiceError`, selected-calculator
`inputSchema` decode, calculation dispatch and schema-guided calculator
service errors.

`@whattax/http-api` owns HTTP transport contracts, OpenAPI annotations, HTTP
status envelopes, typed HTTP clients and route handlers. It should import SDK
facades and schemas for calculation behavior rather than being imported by the
SDK.

The SDK owns:

- the public `WhatTax` facade and configured client types
- typed calculation descriptors that bind a calculator id to input and output
  schemas
- typed module descriptors that carry jurisdiction, tax year, provided
  calculations and required capabilities
- plain TypeScript resource namespaces and safe result helpers
- Effect-native wrappers around `PublicCalculatorService` and calculator
  layers
- jurisdiction subpath exports and thin local convenience clients
- browser-safe schemas, typed calculation helpers and examples
- SDK compatibility, export-map, browser-safety and type-level tests

The dependency direction for the first implementation should be:

```txt
packages/core
  <- packages/rules/au/*
  <- packages/calculators
  <- packages/sdk/typescript
  <- packages/http-api
  <- apps and downstream workspaces
```

The SDK must not depend on `@whattax/http-api`, app packages or transport
runtime modules from any export path. HTTP clients and OpenAPI transport helpers
stay in `@whattax/http-api` or a future transport package that depends on the
SDK, not the other way around.

## Proposed Approach

### Package Shape

Create:

```txt
packages/sdk/typescript/
  README.md
  package.json
  tsconfig.json
  tsconfig.build.json
  src/
    index.ts
    effect.ts
    au.ts
    au-effect.ts
    errors.ts
    internal/
    schemas/
    testing/
    types.ts
```

Use explicit publish export paths:

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
      "types": "./dist/schemas/index.d.ts",
      "default": "./dist/schemas/index.js"
    },
    "./testing": {
      "types": "./dist/testing/index.d.ts",
      "default": "./dist/testing/index.js"
    }
  }
}
```

`"."`, `"./au"` and `"./schemas"` must be browser-safe. `"./effect"` and
`"./au/effect"` may expose Effect-native types and layers. If a future SDK
server-only export is needed, it must still not import `@whattax/http-api`;
transport-owned helpers belong in transport packages.

The publish manifest must be dist-only unless source files are intentionally
packed and source-condition consumers are explicitly supported. The current SDK
contract excludes `source` conditions and validates packed entrypoints with the
package artifact smoke check.

### Strict Typed Descriptor Model

The SDK should define typed descriptors rather than loose runtime registries.
The minimal public type model should preserve:

- calculator id literal
- jurisdiction literal
- tax year literal
- canonical input schema type
- canonical output report type
- runtime service boundary used for execution
- module capabilities that decide which calculations a client can call

Illustrative shape:

```ts
export interface SdkCalculation<
  Id extends string,
  Jurisdiction extends string,
  TaxYear extends string,
  Input,
  Output,
> {
  readonly calculatorId: Id;
  readonly jurisdiction: Jurisdiction;
  readonly taxYear: TaxYear;
  readonly inputSchema: Schema.Schema<Input>;
  readonly outputSchema: Schema.Schema<Output>;
}

export interface WhatTaxModule<
  Id extends string,
  Jurisdiction extends string,
  TaxYear extends string,
  Calculations,
> {
  readonly id: Id;
  readonly jurisdiction: Jurisdiction;
  readonly taxYear: TaxYear;
  readonly calculations: Calculations;
}
```

The implementation can use richer Effect `Layer` and service generics behind
these public descriptors, but the plain TypeScript facade must not leak Effect
runtime types in method signatures.

`WhatTax.create(...)` should preserve the exact module tuple and return a client
narrowed to the calculations those modules provide. Calling an unsupported
calculation, passing facts for another calculation, or mixing incompatible tax
years should fail through TypeScript before runtime.

### Runtime Execution

The SDK runtime should execute through `PublicCalculatorService`:

```txt
typed SDK descriptor
  -> canonical input schema decode
  -> PublicCalculatorService.calculate(...)
  -> selected catalog entry inputSchema decode
  -> CalculationEngine
  -> canonical report schema decode/encode
  -> typed SDK result
```

The SDK should not manually traverse calculator catalog maps or run rule-pack
layers directly when a `PublicCalculatorService` method already owns the
behavior. Direct Effect-layer helpers are allowed in `./effect` and
`./au/effect` only when they preserve the same service-owned semantics and are
covered by parity tests.

### Plain TypeScript Facade

Root usage should prefer:

```ts
import { WhatTax } from "whattax";
import { au } from "whattax/au";

const whattax = WhatTax.create(au.modules.pay({ taxYear: "2025-26" }));

const result = await whattax.calculations.calculate(
  au.calculations.pay.takeHome,
  {
    grossPay: au.money.aud(2500),
    payPeriod: "fortnightly",
    taxFreeThresholdClaimed: true,
  }
);
```

The plain facade should return `Promise` values and throw documented SDK error
classes only. It should also expose `safe` methods for callers that prefer
explicit result values:

```ts
const result = await whattax.safe.calculations.calculate(
  au.calculations.pay.takeHome,
  input
);

if (result.ok) {
  result.value;
} else {
  result.error;
}
```

The `safe` result shape must be schema-owned or Data-owned and must not be a
hand-rolled ad hoc object union.

### Effect-Native Facade

`whattax/effect` should expose Effect-native calculation methods and layer
composition for package consumers that want typed failures, interruption,
test-layer substitution and runtime ownership.

Effect-native methods should return `Effect.Effect<Success, Failure, Requires>`
and should keep expected SDK, calculator and domain failures in the typed error
channel. One-off error mapping should stay inline at callsites.

### AU Subpath

`whattax/au` should provide the first jurisdiction-specific module surface:

- `au.modules.pay({ taxYear: "2025-26" })`
- `au.modules.incomeTax({ taxYear: "2025-26" })`
- `au.calculations.pay.takeHome`
- `au.calculations.pay.withholdings`
- `au.calculations.incomeTax.annual`
- thin local convenience clients where they do not weaken the generic model

The root `whattax` entrypoint must not import AU rule packages unless a caller
imports `whattax/au`.

### Type-Level Test Contract

The first implementation must include type tests as the primary proof of SDK
value. They must prove these fail:

- annual income tax calculation against a pay-only module
- take-home facts passed to annual-tax calculation
- annual-tax facts passed to take-home calculation
- unsupported tax year literals
- incompatible module tuple where a calculation requires capabilities not
  provided by the configured client
- importing server-only helpers or `@whattax/http-api` from browser-safe
  entrypoints

Use `@ts-expect-error` tests or a focused type-test package/script wired into
`bun run verification`.

### Runtime Parity Test Contract

The SDK must prove that its runtime behavior is the same calculation behavior
owned by `@whattax/calculators`. For each supported v1 calculator, tests should
compare:

- plain SDK facade result
- `whattax/effect` result
- `PublicCalculatorService.calculate(...)` result using `CalculatorRun*`
  request and response schemas
- HTTP API result after `@whattax/http-api` consumes the SDK facade

Coverage must include:

- `au.pay.take-home`
- `au.pay.withholdings`
- `au.income-tax.annual`
- at least one schema-guided error where facts valid for one calculator are
  submitted to another calculator and return `CalculatorInputDecodeError`

Runtime parity tests may compare full encoded report values where stable. When
diagnostics or transport envelopes differ by boundary, tests should compare the
canonical report, calculator id and tagged public error payload.

### Import Boundary Test Contract

The SDK package must have automated import-boundary checks. They must fail if:

- `packages/sdk/typescript/package.json` depends on `@whattax/http-api`
- any SDK source file imports `@whattax/http-api`
- root `whattax` imports AU rule packages
- browser-safe SDK entrypoints import Node/server-only modules
- typed HTTP clients move out of `@whattax/http-api` into the SDK package

These checks can be implemented as focused tests, package-boundary scripts,
Oxlint rules or a combination. They must run during `bun run verification`
before the SDK is accepted.

### Downstream Consumer Validation

Before npm publication, validate the SDK from a downstream workspace that
imports WhatTax through its normal package/submodule boundary. The validation
must prove:

- plain SDK imports resolve without private workspace aliases
- browser-safe imports do not pull server-only modules
- at least one UI/application-facing calculation flow uses the SDK instead of
  direct rule-package or calculator-service imports
- downstream typecheck catches at least one intentional misuse through
  `@ts-expect-error`
- a downstream browser build or equivalent app build passes when the SDK is
  consumed by browser code

Keep this evidence in the active exec plan or release-prep notes. Do not name
private downstream products in public WhatTax docs.

### Publishing Readiness

Publishing should be a final release-prep slice after implementation and
downstream validation pass.

Release-prep must:

- confirm the public package name immediately before publication
- decide whether to publish as `whattax` or `@whattax/sdk`
- add the SDK package to Changesets fixed release-train policy if it is scoped
  as `@whattax/sdk`
- keep `private: true` until the publication slice
- run `bun run changeset status --verbose`
- run `bun run version-repo` only when intentionally applying release-train
  versions and changelogs
- update package READMEs and root release notes
- verify installed package behavior from a packed artifact or clean downstream
  install path before `npm publish`

## Risks And Tradeoffs

- Route-level calculator schemas cannot be dependent on path params, so the SDK
  must preserve calculator/input/output relationships above the generic
  `PublicCalculatorService` contract.
- Over-ergonomic AU convenience helpers could hide module capabilities. Keep
  them as thin wrappers over typed descriptors and prove parity with the generic
  facade.
- Root imports can accidentally pull AU rule packages into generic bundles.
  Export-map and browser-safety tests must guard this.
- The public package name decision is time-sensitive. Confirm availability only
  during release prep.
- Downstream validation is required, but public WhatTax docs must stay neutral
  about private downstream product details.

## Versioning And Changelog Impact

Implementation is package-facing.

Expected Changeset impact:

- `packages/sdk/typescript`: first package release, likely minor for the first
  public SDK surface
- `@whattax/calculators`: patch or minor if public descriptor/schema exports
  are added for the SDK
- `@whattax/http-api`: patch or minor if handlers shift to consume SDK-owned
  facades
- rule packages: patch or minor if they add public SDK-oriented exports without
  changing calculation behavior

Each coherent package-facing slice should add or update a Changeset with
`bun run changeset`. Do not batch all Changesets into the final publishing
slice unless explicitly requested.

## Acceptance Criteria

- `docs/specs/sdk-facade.md` and architecture docs agree with the implemented
  SDK boundary over `@whattax/calculators`.
- `packages/sdk/typescript` exists with explicit browser-safe and Effect-native
  export paths.
- The root SDK facade exposes `WhatTax.create(...)`, calculation resource
  methods, schemas, documented errors and `safe` result methods.
- `whattax/effect` exposes Effect-native service/layer composition without
  weakening typed failures.
- `whattax/au` provides typed modules and calculations for take-home pay, pay
  withholdings and annual income tax.
- Type tests prove unsupported calculations, mismatched facts, incompatible tax
  years and missing capabilities fail at compile time.
- Runtime tests prove SDK results match `PublicCalculatorService` and the HTTP
  API for success and guided error cases.
- Export-map and browser-safety tests prove plain/browser entrypoints do not
  import server-only modules or `@whattax/http-api`.
- `@whattax/sdk/schemas` re-exports canonical calculator-owned
  `CalculatorRun*` and `CalculatorServiceError` contracts without local schema
  mirrors.
- Import-boundary tests prove the SDK has no package metadata or source import
  dependency on `@whattax/http-api`.
- Downstream workspace validation passes before publication.
- Package README, quickstart examples and public docstrings describe the stable
  SDK surface.
- `bun run verification` passes.
- `bun run changeset status --verbose` previews the intended release impact.
- Publishing remains gated behind a deliberate release-prep slice.

## References

- [SDK facade export](../specs/sdk-facade.md)
- [API and SDK](../architecture/api-and-sdk.md)
- [Calculators](../architecture/calculators.md)
- [Package ownership](../architecture/package-ownership.md)
- [Package boundaries](../architecture/package-boundaries.md)
- [Effect services](../architecture/effect-services.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Versioning and Changesets](../standards/versioning.md)
