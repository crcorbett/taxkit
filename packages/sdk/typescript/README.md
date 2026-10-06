---
document_type: package-guide
lifecycle: current
authority: canonical
owner: taxkit-sdk-owner
last_reviewed: 2026-10-06
review_trigger: SDK contracts, lifetime, exports, examples or consumer validation change
---

# TypeScript SDK

Public TaxKit TypeScript SDK package.

## Scope

`packages/sdk/typescript` owns the TypeScript SDK facade for
in-process TaxKit calculations, schema exports and typed module composition.
The package is private while the SDK surface is implemented and downstream
consumer validation is recorded.

The package currently exposes typed descriptor composition, an Effect-native
facade, a plain Promise facade and Australian module helpers for the current
public calculator catalog. The descriptor and facade generics consume
calculator-owned `CalculatorRunFacts`, `CalculatorRunReport` and
`CalculatorServiceError` contracts rather than HTTP transport aliases.
The HTTP API and SDK call the same owning calculator service independently.
The SDK remains independent from `@taxkit/api-http`.

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
`TaxKitSchemaDecodeError`, `TaxKitUnexpectedError`,
`TaxKitClientDisposedError` and `TaxKitClientDisposeError`.

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

All three SDK checking scripts use Effect FileSystem and scoped child
processes. Manifests are decoded once with the shared script Schemas; staged
publication manifests keep unrelated package metadata and missing dependency
keys. JSON field order may change when the staged manifest is encoded, but
package fields and declared publication targets are preserved. Each command
closes its process before continuing. Collected stdout is limited to 1 MiB;
stderr is drained without retaining or printing its contents. Failure reports
name the step and retain an available exit code, without copying native errors
or captured command output. A cleanup failure fails the check; if work has
already failed, both failures remain available.

`check-boundaries` checks package dependency direction and direct source
references. Only ripgrep exit 1 means no match; a failed search fails the check.
It does not prove the full browser dependency graph. Packed installation,
browser bundling and the Chromium suite provide their own separate evidence.
`check-types` checks both SDK source and the scripts' TypeScript project. The
native `test` suite includes controlled script failures; `test:browser` keeps
these Bun-only command fixtures out of the browser suite.

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
bun run --filter=@taxkit/sdk test:browser
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
bun run --filter=@taxkit/sdk test:browser
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

`@taxkit/sdk/schemas` also re-exports the canonical `CalculatorCapacityExceeded`
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
and source-artifact encodings against 15 historical SHA-256 values. These are
local packed-package checks, not publication or provider proof.


Core trace formula/rounding and question help fields now expose nested Options;
descriptor question/artifact/permission fields expose Options and rule parameter
collections are total arrays. Their encoded forms remain unchanged. SDK
`decodeOutput` checks a report returned by the calculator service against the
selected Schema's Type; it does not decode transport JSON again. Transport
consumers use the owning report codec at their representation boundary.
The genuine packed consumer rejects incorrect trace constructor fields and
child records, preserves service tuple types, compares all 22 saved metadata
response hashes and retains existing trace/ledger and table/source expectations.


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
