---
document_type: package-guide
lifecycle: current
authority: canonical
owner: taxkit-sdk-owner
last_reviewed: 2026-10-30
review_trigger: SDK contracts, lifetime, exports, examples or consumer validation change
---

# TaxKit TypeScript SDK

Public TaxKit TypeScript SDK package.

Install `taxkit` from npm and use the `taxkit` and `taxkit/*` imports.

## Schema construction and compatibility

Public Schema classes have nominal brands. Construct domain values with their
owning Schema constructor or decode external data through that Schema; plain
object literals no longer substitute for checked class instances. This is a
TypeScript breaking change and does not change the encoded JSON contracts.

The `PayRules`, `IncomeTaxRules`, `StslRules`, and `CalculatorSchemas` namespaces
remain available, including their type members. The public entry points list
exports explicitly; internal compatibility modules preserve these namespaces.

## Scope

`packages/sdk/typescript` owns the TypeScript SDK facade for
in-process TaxKit calculations, schema exports and typed module composition.
It is the sole TaxKit package configured for public npm installation. Its
build assembles the private
modules into one archive, with Effect as its only external runtime dependency.
Install the SDK archive itself; no other TaxKit archive is required.

```sh
npm install taxkit
```

Use an ESM-capable TypeScript runtime or a browser bundler. Effect is installed
as a dependency. Use `taxkit/core` for checked money values and engine
contracts, and `taxkit/http` for typed HTTP client contracts.

The package currently exposes typed descriptor composition, an Effect-native
facade, a plain Promise facade and Australian module helpers for the current
public calculator catalog. The descriptor and facade generics consume
calculator-owned `CalculatorRunFacts`, `CalculatorRunReport` and
`CalculatorServiceError` contracts rather than HTTP transport aliases.
The HTTP API and SDK call the same owning calculator service independently.
The root, AU and Effect facades do not import HTTP. The separate `/http` entry
re-exports the canonical HTTP contracts without importing server handlers.

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
    -> construct context/help with their owning Schemas
    -> PublicCalculatorService.calculate({ calculatorId, ...checkedOptions, payload })
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
import { TaxKit } from "taxkit";
import { au } from "taxkit/au";

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
import { au } from "taxkit/au";

const payReport = await au.pay.takeHomePay({
  grossPay,
  taxFreeThresholdClaimed: true,
});

const client = au.createClient();
try {
  const annualTax = await client.calculations.calculate(
    au.calculations.annualIncomeTax,
    { taxableIncome }
  );
} finally {
  await client.dispose();
}
```

Each plain client owns an independent, lazily started lifetime. Await
`client.dispose()` when finished. Closing stops pending calculations and startup,
then waits for finalisers. Repeated and overlapping calls wait for the same
cleanup result. Calls after closing return `TaxKitClientDisposedError` inside
`TaxKitFailure`, or reject with `TaxKitCalculationError` in the normal method.
A cleanup defect rejects with the safe `TaxKitClientDisposeError`. None of these
errors include raw private failure details.

`TaxKit.calculate`, `TaxKit.safe.calculate` and direct AU helpers own a temporary
scope for each call and clean up before settling. They leave no package-global
runtime. The Effect interface continues to use its caller's services and scope.
The private `client.runtime.ts` owns the plain Promise bridge; no raw runtime,
provider client or arbitrary execution callback is exported. Module selection
still limits descriptor types; it does not construct a different runtime catalog.

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
  "./core": {
    "types": "./dist/core.d.ts",
    "default": "./dist/core.js"
  },
  "./http": {
    "types": "./dist/http.d.ts",
    "default": "./dist/http.js"
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
composition. The publish manifest is dist-only; `bun run --filter=taxkit check-packed-artifact` validates
that every public export resolves to packed files. The focused checker is an
Effect-native Bun runtime with typed command and validation failures and a
scope-managed temporary import workspace.

`taxkit/schemas` re-exports calculator-owned run contracts for consumer
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
`TaxKitSchemaDecodeError`, `TaxKitUnexpectedError`,
`TaxKitClientDisposedError` and `TaxKitClientDisposeError`.

## Publication

Only this SDK is configured for publication; all other workspace packages stay
private. Publishing still needs the maintainer's explicit request. Follow the
[local SDK publication procedure](../../../docs/runbooks/versioning.md#local-sdk-publication).

Packed artifacts include `dist`, `README.md`, `LICENSE` and package metadata.
Build and pack with the repository's pinned Bun so the packed Effect dependency
uses a concrete version. Publish that checked archive with npm; do not publish
the workspace directory or all workspaces recursively.

### Downstream validation

The SDK owns the first downstream consumer validation gate:

```sh
bun run --filter=taxkit validate:downstream
```

The command builds and packs the SDK only, installs that one archive into a
fresh temporary project outside the repository, and checks its declarations,
all public imports, calculation/report behaviour, rule parameters and browser
bundle. The runtime dependencies contain no `@taxkit/*` packages. Both the
normal packed-artifact check and this consumer use the assembled distribution.

`tsconfig.build.json` compiles the SDK and the private sources it includes in
one program; TypeScript does not emit files reached through `node_modules`, so
it lists each private source folder. `assemble-package.runtime.ts` moves each
owner's output to `dist/internal`, rewriting only import/export syntax through the TypeScript AST.
It relocates both JavaScript and declarations, preserving Schema and class
identity across entry points. Runtime service identifiers and data strings are
unchanged. Effect stays external. No deployment, provider SDK, repository test
runner or compiler becomes a runtime dependency.

`/core` exposes engine primitives and calculator composition; `/au` also exposes
Pay, IncomeTax and STSL rule namespaces and parameter contracts. `/http` exposes
`TaxKitApi` and checked request-body contracts for native Effect HTTP clients.
The existing `/au/effect`, `/schemas` and `/testing` descriptor entries remain
compatible. These are module paths inside one package, not extra npm packages.

## Guardrails

- Keep HTTP imports confined to `src/http.ts`; root, AU and Effect facades
  remain independent of the HTTP entry.
- Do not import AU rule packages from the root entrypoint.
- Reuse canonical schemas, branded ids, service contracts, tagged errors and
  constructors from owning packages when implementation starts.
- Use `@taxkit/calculators` as the calculator execution boundary instead of
  duplicating catalog lookup or calculation dispatch.
- Keep transport contracts owned by `@taxkit/api-http`; the SDK exposes them
  through its HTTP entry rather than copying their implementation.

## Commands

```sh
bun run --filter=taxkit test
bun run --filter=taxkit test:browser
bun run --filter=taxkit check-types
bun run --filter=taxkit build
bun run --filter=taxkit test-types
bun run --filter=taxkit check-boundaries
bun run --filter=taxkit check-packed-artifact
bun run --filter=taxkit validate:downstream
```

## Related Docs

- `docs/architecture/api-and-sdk.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/testing-and-quality.md`

`taxkit/schemas` also re-exports the canonical `CalculatorCapacityExceeded`
and `CalculatorOperationTimedOut` errors. They belong to the widened checked
service union and expose fixed manual-retry guidance for server consumers.
Local SDK calculation does not acquire the API server's pool or time budget.
The actual packed and downstream fixtures check these named exports and types.


SDK Schemas also re-export the canonical `CalculatorMetadataError` union. Server
hosts may apply the calculator-owned five-second policy to all nine methods;
local SDK execution retains its caller-owned lifetime and calculation results.

The downstream consumer also checks core's fallible money/date constructors,
their public error types, safe overflow failures and historical date bytes/key
presence. `aud` requires already checked `Cents`; `audFromCents` returns an
Effect. Public examples use the same owning primitive contracts.

The genuine packed consumer also imports the three public rule-parameter
entrypoints. It rejects incomplete tables at construction and typed/saved
representation decoding, and compares all five retained table, effective-period
and source-artifact encodings against 13 preserved historical SHA-256 values
and two approved 2025–26 Medicare table/source fingerprints. The original
fingerprints remain in the earlier source history; the dated Medicare correction
record keeps their exact legal-data delta as history. These are
local packed-package checks, not publication or provider proof.


Core trace formula/rounding and question help fields now expose nested Options;
descriptor question/artifact/permission fields expose Options and rule parameter
collections are total arrays. Their encoded forms remain unchanged. SDK
`decodeOutput` checks a report returned by the calculator service against the
selected Schema's Type; it does not decode transport JSON again. Transport
consumers use the owning report codec at their representation boundary.
The genuine packed consumer rejects incorrect trace constructor fields and
child records, preserves service tuple types, compares all 22 saved metadata
response hashes. Only complete Medicare-owned source/table/artifact fragments
and the named annual report edition and $90k Medicare trace are inverted for
that historical comparison. A neighbouring mismatch proves unrelated changed
dates, amounts and versions still fail. Direct corrected parameter fingerprints
and independent annual money tests qualify the real current values.


Calculator-owned context, help and filter fields use `Option<Option<A>>` in
checked TypeScript values: `None` means a missing key, `Some(None)` means a
present undefined key, and `Some(Some(value))` means a present value. Owning
constructors default omitted keys to `None`. JSON and HTTP query fields retain
their ordinary optional representation. Flatten the two absent forms only where
they mean the same thing; do not invent a jurisdiction or tax year.

SDK request aliases derive constructor input from the calculator field owners
and retain descriptor-specific facts. The SDK constructs context/help only; the
selected calculator owns fact decoding and safe error help. Output narrowing
checks the already decoded Schema Type.


The packed consumer also checks the Core diagnostic cause Option Type/default,
its four original encoded forms and removal of the unused catalogue `program`
field. Existing selected-report, input-help, trace/ledger, metadata and source
expectations remain fixed. Legacy diagnostic values are not safe telemetry.


The published schema facade also exposes canonical `CalculatorRateLimited` and
`CalculatorAdmissionUnavailable`. They belong to the expanded checked service
error union; rate guidance carries no connection key or provider cause.
Packed runtime and TypeScript consumers check these identities and reject
private cause/key properties. Direct local SDK calculations do not acquire the
[native host rate policy](../../calculators/README.md#native-calculation-rate-admission),
and their retained reports and caller-owned lifetime remain unchanged.
