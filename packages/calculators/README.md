---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-calculators-owner
last_reviewed: 2026-10-06
review_trigger: schemas, exports, calculator contract or runtime ownership change
---

# Calculators

Reusable public calculator orchestration package.

## Scope

`packages/calculators` owns the package boundary for reusable calculator
catalog, metadata, graph, calculation and expected-error behavior used by HTTP,
SDK, CLI and direct in-process callers.

The package currently owns reusable calculator schemas, catalog entries and
metadata projections, the `PublicCalculatorService` contract, production live
layer, calculator graph construction, calculation dispatch and schema-guided
expected error shaping. HTTP handlers own transport wiring only.

## Ownership

This package owns:

- calculator catalog composition schemas and entries
- metadata projections for calculator, fact, rule and graph discovery
- calculator service tags and layers
- schema-guided expected error shaping for calculation inputs
- composition of canonical scenario layers, rule-pack layers and
  `CalculationEngine`
- the `CalculatorRunFacts` union that composes canonical rule-owned
  calculator input schemas for generated API docs and typed clients
- `CalculatorRunRequest`, `CalculatorRunServiceRequest`,
  `CalculatorRunReport`, `CalculatorRunResponse` and
  `CalculatorRunResponseData` as the canonical reusable calculator execution
  contract for SDK, HTTP, CLI and in-process callers
- `CalculatorServiceError` as the canonical reusable calculator service error
  union
- selected-calculator input decoding through each catalog entry's canonical
  `inputSchema`

The public issue projection preserves the schema issue tag, normalized field
path and descriptor-backed help, but uses stable message text. Rejected values
are never copied into calculator errors, so secrets and machine-local paths do
not escape through direct, SDK or HTTP consumers.

`PublicCalculation*`, `PublicApiError` and `PublicCalculatorError` exports are
deprecated transitional API-era aliases. New SDK, HTTP and in-process code
should use the canonical `CalculatorRun*` and `CalculatorServiceError` names.

This package must not own:

- HTTP endpoints, OpenAPI annotations or HTTP status mapping
- Bun serving, app runtime lifecycle or process config
- SDK client transport or CLI command parsing
- imports from `@taxkit/api-http`, `apps/api`, `apps/web` or runtime modules

## Guardrails

- Reuse canonical schemas, descriptors, service tags, tagged errors and
  constructors from owning packages.
- `CalculatorRunFacts` must compose rule-owned scenario input schemas; do not
  use `Schema.Unknown`, mirrored fact DTOs or loose arbitrary records for the
  calculate contract.
- Decode calculate payload facts with the selected catalog entry's
  `inputSchema` before execution so valid facts for the wrong calculator return
  `CalculatorInputDecodeError` with descriptor-backed help.
- Compose rule-owned calculator ids, jurisdictions and tax years. Do not
  redeclare supported calculator context literals in this package.
- Use Effect-native primitives where they fit: `Schema`, `Option`, `Match`,
  `Array`, `Chunk`, `HashMap`, `HashSet`, `Context`, `Layer`, `Result` and
  `Exit`.
- Keep schema and tagged value shapes in owning schema modules.
- Keep expected domain failures in the typed error channel. Use `Effect.die`
  only for defects outside the service contract.
- Use schema-owned optional fields instead of conditional response-shaping
  object spreads.
- Keep runtime execution outside this package. Calculator code returns Effect
  programs and layers; apps own `BunRuntime.runMain` and `ManagedRuntime`
  lifecycle.
- Catalogue entries expose their selected, checked `calculate` continuation.
  The unused generic `program` field is removed from the fresh interface;
  rule-owned calculator programs remain available from their rule packages.
- Keep service contracts separate from layer wiring. Do not export `Live`,
  `Mock` or `Test` layers from service contract files.

## Commands

```sh
bun run --filter=@taxkit/calculators check-types
bun run --filter=@taxkit/calculators build
```

## Packaging

The build removes `dist` before compiling. Workspace exports retain `source`
conditions, while `publishConfig.exports` and `files` define a dist-only
tarball. The SDK-owned strict downstream gate validates the actual Bun-packed
artifact, public entrypoints and concrete dependency ranges.

## Public Exports

- `@taxkit/calculators`
- `@taxkit/calculators/catalog`
- `@taxkit/calculators/errors`
- `@taxkit/calculators/live`
- `@taxkit/calculators/metadata`
- `@taxkit/calculators/service`
- `@taxkit/calculators/schemas`
- `@taxkit/calculators/work`

## Related Docs

- `docs/architecture/package-ownership.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/api-and-sdk.md`

## Browser Schema entrypoints

`@taxkit/calculators/schemas` consumes narrow core/rule Schema entrypoints and owns no live runtime or rule pack. The RPC contract reuses its existing request and report Schemas; calculation remains with `PublicCalculatorService.calculate`.

The [transport architecture](../../docs/architecture/api-and-sdk.md) and active clean-slate plan own application use and proof limits.

## Shared calculation work limits

`@taxkit/calculators/work` exports `PublicCalculatorServiceBounded`. A host builds
this Layer once over its calculator implementation. It owns one pool of eight
active calculations; each calculation in an RPC batch takes a separate place.
There is no waiting queue. A full pool returns `CalculatorCapacityExceeded`.
The native API instance supplies the same service to HTTP and RPC. The retained
standalone HTTP Layer builds its pool once when the router is constructed.
Metadata does not take a calculation place. Direct engine and local SDK use
remain outside this anonymous server policy; their retained results are unchanged.

All nine server service methods have a five-second budget, including scoped
cleanup. A timeout returns `CalculatorOperationTimedOut`; expected engine
failures and unrelated defects retain their identity. Success, failure, timeout
and caller interruption release the place after cleanup. A monotonic elapsed-time
check also rejects a result returned after the budget. JavaScript timers cannot
pre-empt synchronous CPU work, and uninterruptible work/finalisers can postpone
the response; this is not a claim of forced CPU or remote Worker cancellation.

Both new errors contain only fixed code, message and manual-retry fields, with
no request values. HTTP maps capacity to 503 and operation timeout to 504, using
the existing `error` envelope. Existing calculator request errors keep 400.
The current [native RPC contract](../api/rpc/README.md) preserves the canonical errors; older clients get
an explicit mismatch. Website forms display the fixed guidance and never retry
a calculation automatically. Metadata lookup errors use the canonical
`CalculatorMetadataError` union; all eight metadata methods admit the checked
operation timeout. Their lazy invocation counts eager metadata construction
inside the operation budget. The native rate policy below is separate from
future MCP admission.


Core descriptor questions, source artifacts and duplicate-provider permissions
are Options; rule parameter collections are total arrays. Metadata and error-help
builders reuse those checked values directly. Public metadata codecs keep the
same JSON fields, missing keys and values.

Calculator-owned context, help and filter fields use `Option<Option<A>>` in
checked TypeScript values: `None` means a missing key, `Some(None)` means a
present undefined key, and `Some(Some(value))` means a present value. Owning
constructors default omitted keys to `None`. JSON and HTTP query fields retain
their ordinary optional representation. Flatten the two absent forms only where
they mean the same thing; do not invent a jurisdiction or tax year.

Optional error calculator identity/help, fact question and rule permission
fields use the same representation-preserving owners. Explicit false permission
remains a present value. Facts still decode once through the selected calculator
so rejected input gets safe field guidance.

`check-types` checks source and `tsconfig.test.json`; service/work test fixtures
must use the canonical request Type, even when runtime tests could accept a raw
object. The package test command retains the original tax and cleanup assertions.


## Native calculation rate admission

`CalculatorAdmission` owns the closed `admitCalculation` operation and
`PublicCalculatorServiceRateLimited` places it before calculation work. The
native API builds this Layer once, underneath its existing bounded service.
HTTP, RPC and the Website private binding therefore share one allowance. Each
batch calculation consumes one unit; all metadata operations remain outside it.
Direct engine, local SDK and the standalone Bun server keep their existing
contracts. Those hosts do not automatically acquire this native policy.

The allowance is 60 calculations per minute for a checked connection address.
`CalculatorClientRateKey` owns IP decoding and canonical IPv6 aliases; its value
is redacted and its ordinary Schema encoder is disabled. It is carried in a
request Context reference, never a calculation fact, URL or analytics identity.
Public native requests need Cloudflare's connection header and must not be
forwarded Worker calls. Arbitrary forwarded headers cannot choose a key.
The Website's binding-only operation carries its original checked key separately
from the request JSON; no public route admits that argument.

`CalculatorRateLimited` has fixed safe code/message/manual-retry fields. HTTP
uses 429 and `Retry-After: 60`; native RPC revision 4 carries the same error.
Missing/invalid identity or a failed/invalid native limiter returns fixed
`CalculatorAdmissionUnavailable` (HTTP 503). These errors carry no address,
pay facts, provider message or cause. Both browser and HTML forms ask the visitor
to retry manually. Rate checking is included in the five-second work budget.

The API's native Layer declares Cloudflare's 60/60 RateLimit binding and requires
checked `CALCULATOR_RATE_NAMESPACE`. Operators must choose an account-wide
unique stage value; this repository does not reserve a cloud namespace.
Cloudflare's [rate-limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
is approximate and local to a location, so this is not an exact global quota.
The guarded disposable local root explicitly selects `local-emulator`, one
shared loopback allowance and a local namespace. This additionally requires an
HTTP loopback API origin; hosted composition defaults to `edge` and has no
unlimited or missing-identity fallback.
