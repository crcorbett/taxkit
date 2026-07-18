---
status: implemented
last_reviewed: 2026-05-24
source_of_truth: package-readme
confidence: medium
---

# TypeScript SDK

Public TaxKit TypeScript SDK package.

## Scope

`packages/sdk/typescript` owns the planned TypeScript SDK facade for
in-process TaxKit calculations, schema exports and typed module composition.
The package is private while the SDK surface is implemented and downstream
consumer validation is recorded.

The package currently exposes typed descriptor composition, an Effect-native
facade, a plain Promise facade and Australian module helpers for the current
public calculator catalog. The descriptor and facade generics consume
calculator-owned `CalculatorRunFacts`, `CalculatorRunReport` and
`CalculatorServiceError` contracts rather than HTTP transport aliases.
The HTTP API consumes the SDK like an in-process downstream consumer, while the
SDK remains independent from `@taxkit/api-http`.

Effect-native report helpers are named for the report-only boundary:
`calculateReport` accepts descriptor-typed facts and `calculateReportRequest`
accepts a request payload while preserving descriptor-specific input and output
typing. `calculateRunRequest` returns the canonical calculator run response
with the descriptor-decoded report type preserved for transports and advanced
Effect consumers. `createClient` builds an Effect client for selected SDK
modules.

```ts
Production: SDK Effect full run

Effect consumer
  -> calculateRunRequest(descriptor, request)
    -> PublicCalculatorService.calculate({ calculatorId, ...request })
      -> CalculatorRunResponse
    -> descriptor output decode for response.report
    -> typed CalculatorRunResponse with narrowed report

Report-only helpers
  -> calculateReportRequest(...)
    -> calculateRunRequest(...)
    -> response.report
  -> calculateReport(...)
    -> calculateReportRequest(...)
```

## Plain Facade

```ts
import { TaxKit } from "@taxkit/sdk";
import { au } from "@taxkit/sdk/au";

const report = await TaxKit.calculate(au.calculations.takeHomePay, {
  grossPay,
  taxFreeThresholdClaimed: true,
});

const safeResult = await TaxKit.safe.calculate(au.calculations.takeHomePay, {
  grossPay,
  taxFreeThresholdClaimed: true,
});
```

The plain facade returns Promises and does not expose Effect runtime types in
method signatures. `safe` methods return SDK-owned Data result values:
`TaxKitSuccess` or `TaxKitFailure`.

Plain failures use stable SDK-owned outer, schema-validation and unexpected
messages. Typed `CalculatorServiceError` detail remains available, while raw
Effect causes, rejected input values and private paths are not rendered into
safe results or rejected Promises.

## AU Subpath

```ts
import { au } from "@taxkit/sdk/au";

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
conditions; `bun run --filter=@taxkit/sdk check-packed-artifact` validates
that every public export resolves to packed files. The focused checker is an
Effect-native Bun runtime with typed command and validation failures and a
scope-managed temporary import workspace.

`@taxkit/sdk/schemas` re-exports calculator-owned run contracts for consumer
convenience:

- `CalculatorRunFacts`
- `CalculatorRunRequest`
- `CalculatorRunServiceRequest`
- `CalculatorRunReport`
- `CalculatorRunResponse`
- `CalculatorRunResponseData`
- `CalculatorServiceError`

It also exports SDK-owned safe-result and error schemas such as
`TaxKitCalculationError`, `TaxKitCalculationErrorDetail`,
`TaxKitSchemaDecodeError` and `TaxKitUnexpectedError`.

## Publication Readiness

The package remains `private: true` until an explicit release approval removes
that flag. Package-name availability is time-sensitive; recheck it live during
a future release-prep slice instead of treating earlier registry results as
current truth.

Packed artifacts should include only `dist`, `README.md` and package metadata.
Do not run `bun run version-repo`, remove `private: true` or publish from this
package without an explicit release-prep approval.

### Downstream validation

The SDK owns the first downstream consumer validation gate:

```sh
bun run --filter=@taxkit/sdk validate:downstream
```

The command builds and Bun-packs the nine-package release closure, materializes
each package's dist-only `publishConfig.exports` in a staged tarball, and
rejects source files, missing export targets or unresolved `workspace:*` and
`catalog:` ranges. It installs all unpublished tarballs into a temporary
consumer outside the repo, typechecks and runs SDK examples, imports every
JavaScript public entrypoint and bundles the browser-safe SDK surface.

The command is always strict. Consumer-only file overrides connect unpublished
internal tarballs without changing their concrete registry-ready dependency
ranges. Any manifest or consumer regression prints evidence and exits nonzero;
there is no audit-only success mode.

Use this SDK release-gate order before any future publication work:

```sh
bun run --filter=@taxkit/sdk check-packed-artifact
bun run --filter=@taxkit/sdk validate:downstream
bun run --filter=@taxkit/sdk check-boundaries
bun run --filter=@taxkit/sdk test-types
bun run --filter=@taxkit/sdk test
bun run --filter=@taxkit/sdk build
```

`validate:downstream` is the strict final package-installation gate. Supporting
workspace tests and the focused SDK tarball check do not replace it.

## Guardrails

- Keep this package independent from `@taxkit/api-http`.
- Do not import AU rule packages from the root entrypoint.
- Reuse canonical schemas, branded ids, service contracts, tagged errors and
  constructors from owning packages when implementation starts.
- Use `@taxkit/calculators` as the calculator execution boundary instead of
  duplicating catalog lookup or calculation dispatch.
- Keep transport-owned HTTP clients and OpenAPI helpers in
  `@taxkit/api-http`.

## Commands

```sh
bun run --filter=@taxkit/sdk test
bun run --filter=@taxkit/sdk check-types
bun run --filter=@taxkit/sdk build
bun run --filter=@taxkit/sdk test-types
bun run --filter=@taxkit/sdk check-boundaries
bun run --filter=@taxkit/sdk check-packed-artifact
bun run --filter=@taxkit/sdk validate:downstream
```

## Related Docs

- `docs/product-specs/typescript-sdk-and-publishing.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/testing-and-quality.md`
