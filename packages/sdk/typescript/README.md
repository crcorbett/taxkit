---
status: implemented
last_reviewed: 2026-05-24
source_of_truth: package-readme
confidence: medium
---

# TypeScript SDK

Public WhatTax TypeScript SDK package.

## Scope

`packages/sdk/typescript` owns the planned TypeScript SDK facade for
in-process WhatTax calculations, schema exports and typed module composition.
The package is private while the SDK surface is implemented and downstream
consumer validation is recorded.

The package currently exposes typed descriptor composition, an Effect-native
facade, a plain Promise facade and Australian module helpers for the current
public calculator catalog. The descriptor and facade generics consume
calculator-owned `CalculatorRunFacts`, `CalculatorRunReport` and
`CalculatorServiceError` contracts rather than HTTP transport aliases.
HTTP API integration, downstream validation and publication release prep belong
to later SDK tasks.

## Plain Facade

```ts
import { WhatTax } from "@whattax/sdk";
import { au } from "@whattax/sdk/au";

const report = await WhatTax.calculate(au.calculations.takeHomePay, {
  grossPay,
  taxFreeThresholdClaimed: true,
});

const safeResult = await WhatTax.safe.calculate(au.calculations.takeHomePay, {
  grossPay,
  taxFreeThresholdClaimed: true,
});
```

The plain facade returns Promises and does not expose Effect runtime types in
method signatures. `safe` methods return SDK-owned Data result values:
`WhatTaxSuccess` or `WhatTaxFailure`.

## AU Subpath

```ts
import { au } from "@whattax/sdk/au";

const payReport = await au.pay.takeHomePay({
  grossPay,
  taxFreeThresholdClaimed: true,
});

const client = au.createClient();
const annualTax = await client.calculations.calculate(
  au.calculations.annualIncomeTax,
  { taxableIncome }
);
```

AU helpers are thin wrappers over the same generic SDK descriptors. Type tests
prove wrong calculator/module pairings and incompatible facts fail at compile
time.

## Export Paths

```json
{
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
```

The root, AU and schema entrypoints are intended to remain browser-safe. Effect
entrypoints expose Effect-native types for consumers that want service/layer
composition. The publish manifest is dist-only and does not expose `source`
conditions.

`@whattax/sdk/schemas` re-exports calculator-owned run contracts for consumer
convenience:

- `CalculatorRunFacts`
- `CalculatorRunRequest`
- `CalculatorRunServiceRequest`
- `CalculatorRunReport`
- `CalculatorRunResponse`
- `CalculatorRunResponseData`
- `CalculatorServiceError`

It also exports SDK-owned safe-result and error schemas such as
`WhatTaxCalculationError`, `WhatTaxCalculationErrorDetail`,
`WhatTaxSchemaDecodeError` and `WhatTaxUnexpectedError`.

## Publication Readiness

The package remains `private: true` until an explicit release approval removes
that flag. The first release-prep pass verified on 2026-05-24 that both
`whattax` and `@whattax/sdk` returned npm registry 404 responses, so neither
name had a visible public package at that point. Recheck package-name
availability immediately before any publication decision.

Packed artifacts should include only `dist`, `README.md` and package metadata.
Do not run `bun run version-repo`, remove `private: true` or publish from this
package without an explicit release-prep approval.

## Guardrails

- Keep this package independent from `@whattax/http-api`.
- Do not import AU rule packages from the root entrypoint.
- Reuse canonical schemas, branded ids, service contracts, tagged errors and
  constructors from owning packages when implementation starts.
- Use `@whattax/calculators` as the calculator execution boundary instead of
  duplicating catalog lookup or calculation dispatch.
- Keep transport-owned HTTP clients and OpenAPI helpers in
  `@whattax/http-api` or future transport packages.

## Commands

```sh
bun run --filter=@whattax/sdk test
bun run --filter=@whattax/sdk check-types
bun run --filter=@whattax/sdk build
bun run --filter=@whattax/sdk test-types
bun run --filter=@whattax/sdk check-boundaries
bun run --filter=@whattax/sdk check-packed-artifact
```

## Related Docs

- `docs/product-specs/typescript-sdk-and-publishing.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/testing-and-quality.md`
