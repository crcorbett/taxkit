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
public calculator catalog. HTTP API integration, downstream validation and
publication release prep belong to later SDK tasks.

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

- `@whattax/sdk`
- `@whattax/sdk/effect`
- `@whattax/sdk/au`
- `@whattax/sdk/au/effect`
- `@whattax/sdk/schemas`
- `@whattax/sdk/testing`

The root, AU and schema entrypoints are intended to remain browser-safe. Effect
entrypoints may expose Effect-native types once the facade is implemented.

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
```

## Related Docs

- `docs/product-specs/typescript-sdk-and-publishing.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/testing-and-quality.md`
