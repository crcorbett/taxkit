# Calculators

This private package owns the public calculator catalogue, correlated transport
Schemas, metadata projections and `PublicCalculatorService`. HTTP and MCP hosts
use the service. The SDK executes the same complete rule-owned definitions
directly; each is a closed program.

`CalculatorCatalogue` is the catalogue itself (`CalculatorCatalogueLive`):
metadata and owning-definition dispatch, without host policy. There is one
`PublicCalculatorService` implementation over it, which owns the shared work
budget, optional calculation admission and the `CalculatorUsage` observer.
Hosts choose a composition; no Layer rebuilds the service it requires.

## Contracts

`CalculatorRunRequest` is a discriminated union of exact calculator identities
and their owning scenario codecs. Its body contains `calculatorId` and `payload`;
the payload holds checked `facts` plus optional jurisdiction/year. Decoded
optional fields use one `Option`. Transport ingress decodes strictly once, then
the service dispatches the checked scenario to its owning definition.

`CalculatorRunResponse` correlates the identity, catalogue metadata and owning
report codec, with the definition's graph diagnostics. `CalculatorServiceError` composes
safe input, context, calculation and host-policy failures. Shared
`InputValidationError` projects bounded field paths and fixed messages without
rejected values or opaque diagnostic causes. Descriptor-backed field guidance
comes from the schema endpoint.

Catalogue registration takes a complete owning definition; it cannot override
its identity, input/output schemas, fact descriptors or rule graph. Metadata
contains publication information, without a second rule-pack execution Layer.
The definition validates its static graph and owns native execution.

## Browser calculator pages

- `./form` owns visible form Schemas, worked examples and `requestFromForm`.
  It converts text into the owning checked scenario and correlated request, or
  a `CalculatorInputError` naming the one field to correct.
- `./page` owns the `CalculatorPage` contract and `calculatorViewState`, the
  pure view derivation; the host declares the static Atom family.
- `./page-schemas` owns `CalculatorViewState` and `CalculatorToolFailure`.
- `./page-tools` owns page tools that use the same commands and state.

The host supplies the cancellable calculation command and safe failure text.
This package imports neither Website/API applications nor the HTTP package.

## Boundaries

Service contracts, live Layers, host admission/work policy and test fixtures
have separate owners. Native fact/parameter service requirements stay visible
until their Layers are supplied. Apps own runtime execution and disposal.
HTTP status mapping, OpenAPI annotations and request-body limits belong to HTTP.

This package exports TypeScript source. The single `taxkit` archive compiles its
public Schema dependencies; no second public npm package is published.

```sh
bun run --filter=@taxkit/calculators check-types
bun run --filter=@taxkit/calculators test
```

`check-types` includes source, tests and negative catalogue contract examples.
See [API and SDK](../../docs/architecture/api-and-sdk.md) and
[ADR 0011](../../docs/adr/0011-effect-native-sdk-contracts.md).

## Shared calculation work limits

`@taxkit/calculators/work` exports `PublicCalculatorServiceBounded` (no rate
admission) and `PublicCalculatorServiceRateLimited`, both over a supplied
`CalculatorCatalogue`; `PublicCalculatorServiceLive` is the bounded service over
`CalculatorCatalogueLive`. A host builds one of them once. It owns one pool of
eight active calculations; each calculation takes a separate place.
There is no waiting queue. A full pool returns `CalculatorCapacityExceeded`.
The native API instance supplies the same service to HTTP and MCP. The retained
standalone HTTP Layer builds its pool once when the router is constructed.
Metadata does not take a calculation place. Direct definition and local SDK
use remain outside this anonymous server policy. A successful calculation is
reported to `CalculatorUsage` after its place is released; the default observer
does nothing.

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
Website forms display the fixed guidance and never retry
a calculation automatically. Metadata lookup errors use the canonical
`CalculatorMetadataError` union; all eight metadata methods admit the checked
operation timeout. Their lazy invocation counts eager metadata construction
inside the operation budget. The native rate policy below is separate from
future MCP admission.


## Native calculation rate admission

`CalculatorAdmission` owns the closed `admitCalculation` operation and
`PublicCalculatorServiceRateLimited` checks it before catalogue work, inside the
shared work budget. The native API builds this Layer once over the catalogue.
HTTP and MCP therefore share one limit. Each
calculation consumes one unit; all metadata operations remain outside it.
Direct definitions, local SDK and the standalone Bun server keep their existing
contracts. Those hosts do not automatically acquire this native policy.

The limit is 60 calculations per minute for a checked connection address.
`CalculatorClientRateKey` owns IP decoding and canonical IPv6 aliases; its value
is redacted and its ordinary Schema encoder is disabled. It is carried in a
request Context reference, never a calculation fact, URL or analytics identity.
Public native requests need Cloudflare's connection header and must not be
forwarded Worker calls; hosts pass this Schema to the domain-free
`edgeCallerKey` in `@taxkit/observability/edge-identity`. Arbitrary forwarded headers cannot choose a key.

`CalculatorRateLimited` has fixed safe code/message/manual-retry fields. HTTP
uses 429 and `Retry-After: 60`.
Missing/invalid identity or a failed/invalid native limiter returns fixed
`CalculatorAdmissionUnavailable` (HTTP 503). These errors carry no address,
pay facts, provider message or cause. The browser forms ask the visitor to retry
manually. Rate checking is included in the five-second work budget.

The API's native Layer declares Cloudflare's 60/60 RateLimit binding and requires
checked `CALCULATOR_RATE_NAMESPACE`. Operators must choose an account-wide
unique stage value; this repository does not reserve a cloud namespace.
Cloudflare's [rate-limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
is approximate and local to a location, so this is not an exact global quota.
The guarded disposable local root explicitly selects `local-emulator`, one
shared loopback limit and a local namespace. This additionally requires an
HTTP loopback API origin; hosted composition defaults to `edge` and has no
unlimited or missing-identity fallback.

## Export paths

Every public subpath in the package export map:

- `@taxkit/calculators`
- `@taxkit/calculators/summaries`
- `@taxkit/calculators/service`
- `@taxkit/calculators/live`
- `@taxkit/calculators/schemas`
- `@taxkit/calculators/work`
- `@taxkit/calculators/admission.schemas`
- `@taxkit/calculators/admission.service`
- `@taxkit/calculators/admission.layer`
- `@taxkit/calculators/testing/fixtures`
- `@taxkit/calculators/form`
- `@taxkit/calculators/page`
- `@taxkit/calculators/page-schemas`
- `@taxkit/calculators/page-tools`
