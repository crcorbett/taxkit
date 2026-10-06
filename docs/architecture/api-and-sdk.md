---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-api-sdk-owner
last_reviewed: 2026-10-06
review_trigger: API or SDK contracts, exports, lifetime or caller composition change
---

# API and SDK

TaxKit should publish a reusable API app server and TypeScript SDK around the
open-source calculation engine.

The API and SDK are part of this repository because they expose reusable tax
calculation capabilities through stable, documented boundaries.

## Current API runtime

See [TypeScript SDK and publishing](../product-specs/typescript-sdk-and-publishing.md)
and [SDK public naming and export contract](../product-specs/sdk-public-naming-and-export-contract.md)
for the SDK facade, plain TypeScript entrypoint, Effect entrypoint and export
contract specs.

`apps/api` is the current API runtime owner. It is a standalone Bun process
that owns host/port config, process startup through
`@effect/platform-bun/BunRuntime.runMain`, Bun request serving and graceful
shutdown through Effect interruption and scoped layer finalizers. It delegates
API contracts, handlers, schemas and generated docs to `packages/api/http`.

API settings use the caller's native ConfigProvider and owning port/host
Schemas. Missing ports use `PORT` and then 4000; an invalid present `API_PORT`
fails with a bounded settings error. Hosts retain trimming and blank fallback.
The app's smoke command has named native HTTP operations, the public
`HealthResponse` Schema and existing calculator Schemas. Request deadlines
include headers and body decoding (health 15 seconds including retries, other
routes five seconds). It checks the OpenAPI calculate path and then runs a
plain JavaScript consumer outside the checkout. That command has a 30-second
limit, scoped lifetime, checked route evidence and bounded output/error
reporting. Failed cleanup remains a failure, including alongside failed work.
These checks establish local app/consumer behaviour only.

The current implemented API surface is:

```txt
GET /api/health
GET /api/docs
GET /api/docs/openapi.json
GET /api/v1/jurisdictions
GET /api/v1/tax-years
GET /api/v1/calculators
GET /api/v1/calculators/:calculatorId
GET /api/v1/calculators/:calculatorId/schema
POST /api/v1/calculators/:calculatorId/calculate
GET /api/v1/calculators/:calculatorId/graph
GET /api/v1/facts
GET /api/v1/rules
```

`apps/web` consumes the separate API through native RPC. It must not mount the canonical API or
import server-only `@taxkit/api-http` exports.

API process entrypoints should be Effect programs run with
`@effect/platform-bun/BunRuntime.runMain(...)`. The app owns process config,
platform server creation and root lifecycle. The HTTP API package owns
`HttpApi` definitions, `HttpApiBuilder.group(...)` handlers, generated docs
and reusable route layers. Apps should provide a platform `HttpServer` and
serve the package route layer. Packages must not call `Bun.serve`, read
process env or own process signal handling.

## Current API package

The current API package lives under:

```txt
packages/api/http
```

Package name:

```txt
@taxkit/api-http
```

It owns the current Effect HTTP API definitions, health endpoint schema,
server route layer, OpenAPI metadata, typed client helpers and reusable client
config schema.

`@taxkit/api-http` owns transport contracts, HTTP status annotations, OpenAPI
generation, typed HTTP clients, server route layers and thin handler adapters.
Reusable calculator catalog entries, metadata transformations, graph assembly
and schema-error shaping live in `@taxkit/calculators`. The calculate route
executes through the request-preserving `@taxkit/sdk/effect`
`calculateRunRequest` helper as a normal in-process consumer, proving the
public SDK boundary without making the SDK depend on HTTP transport code.

`@taxkit/api-http/config` exports the package-owned HTTP API client config
schema, type and keyed config fragment. Apps compose that fragment into their
own runtime config modules and provide runtime-specific values, such as server
process env or Vite client env, through `ConfigProvider` composition instead of
redefining API client config keys or env prefixes locally.

Runtime app modules should keep app-owned schemas in colocated `schemas.ts`
files and derive exported types from those schemas. Server startup files should
consume canonical schema values and compose config, layers and runtime lifecycle
only.

Every public HTTP request and response schema should live in the owning API
group or an owning package schema module. If downstream code needs the type,
export it from the same module as a schema-derived type. Do not hand-write DTO
interfaces or duplicate response shapes in handlers, clients or apps.

Route-only HTTP envelopes, query schemas and status annotations stay in
`@taxkit/api-http`. HTTP-facing names such as
`CalculatorApiErrorEnvelope` stay in the transport package because they
describe calculator API status encoding. Rule-owned calculator IDs and
supported context literals are composed by `@taxkit/calculators`; reusable
help modes, calculator run payloads and calculator service errors live in
`@taxkit/calculators`.

The final calculate-route production graph is:

```ts
Production: HTTP calculate

API host (retained Bun or native Worker candidate)
  -> TaxKitApiRoutesLayer
    -> CalculatorApiHandlerLive
      -> PublicCalculatorService.calculate({ calculatorId, payload, ...query })
        -> selected CalculatorCatalogEntry.inputSchema decode
        -> constructor-closed typed scenario continuation
        -> CalculationEngine and owning rule/scenario Layers
        -> CalculatorRunResponseData
      -> existing CalculatorApiErrorEnvelope on expected service failure
```

Metadata routes stay direct service adapters until a broader SDK catalog
facade exists:

```ts
Production: metadata routes

CalculatorApiHandlerLive
  -> PublicCalculatorService.listCalculators / getCalculator / getCalculatorGraph
  -> calculator-owned metadata response schemas
  -> CalculatorApiErrorEnvelope for expected lookup/context failures
```

The SDK Effect full-run graph is:

```ts
Production: SDK Effect full run

Effect consumer
  -> @taxkit/sdk/effect calculateRunRequest(descriptor, request)
    -> PublicCalculatorService.calculate({ calculatorId, ...request })
      -> CalculatorRunServiceRequest
      -> CalculatorRunResponse
    -> descriptor.decodeOutput(response.report)
    -> response with report narrowed to OutputSchema["Type"]

Report-only helpers
  -> calculateReportRequest(...)
    -> calculateRunRequest(...)
    -> response.report
  -> calculateReport(...)
    -> calculateReportRequest(...)
```

The matching test graph is:

```ts
Tests: HTTP compared with SDK

HTTP API tests
  -> TaxKitApiInProcessClientLive
    -> CalculatorApiHandlerLive
      -> PublicCalculatorServiceLive
        -> CalculationEngineLive
  -> success response equals SDK full-run response
  -> CalculatorInputDecodeError maps to CalculatorApiErrorEnvelope
```

## Current calculator package

The reusable calculator orchestration package lives under:

```txt
packages/calculators
```

Package name:

```txt
@taxkit/calculators
```

It owns:

- reusable calculator catalog schemas and service methods that compose
  rule-owned calculator id and context schemas
- catalog entries that compose canonical fact descriptors, rule descriptors,
  report schemas, scenario layers and rule-pack layers
- metadata transformations for calculator, fact, rule and graph responses
- schema-guided expected error shaping with descriptor-backed help
- calculation execution through `CalculationEngine`
- canonical reusable calculator execution schemas named `CalculatorRun*`
- canonical reusable calculator failure union named `CalculatorServiceError`
- typed propagation of expected domain failures such as `CalculationError`

HTTP, SDK, CLI and in-process callers should consume this service instead of
implementing calculator business logic locally.

## HTTP API package topology

The implemented HTTP API package lives at `packages/api/http` and is named
`@taxkit/api-http`. It owns Effect HTTP API definitions, calculation endpoint
schemas, thin server handlers that delegate to `@taxkit/calculators`, OpenAPI
generation, HTTP status annotations and generated HTTP client helpers.

## API app scope

The reusable API app server lives under:

```txt
apps/api
```

It is a reusable server for open-source and integration use. Applications may
run their own API servers that import TaxKit packages or call this API, but
the app remains a thin transport over the calculation engine.

## Endpoint shape

Calculation endpoints are calculator, fact, rule and graph oriented rather
than jurisdiction-route oriented. Jurisdiction, tax year, rule-pack options and
capability filters are request context and metadata, not top-level route
families.

The public calculation API uses stable generic resources:

```txt
GET  /api/v1/jurisdictions
GET  /api/v1/tax-years
GET  /api/v1/calculators
GET  /api/v1/calculators/:calculatorId
GET  /api/v1/calculators/:calculatorId/schema
POST /api/v1/calculators/:calculatorId/calculate
GET  /api/v1/calculators/:calculatorId/graph
GET  /api/v1/facts
GET  /api/v1/rules
```

Calculator IDs may include jurisdiction segments, such as
`au.pay.take-home`, but route structure must remain portable to future
jurisdictions. Do not add `/api/v1/au/*` as the primary public route shape.

Inputs and outputs must decode through Effect Schema. Schema decode failures
should return structured issue details, missing/invalid field paths and
descriptor-backed help so clients can guide users toward the facts required by
the selected calculator. Outputs should include reports, traces, ledgers and
diagnostics where relevant.

Calculator input-error egress preserves the public tagged shape, normalized
field paths and descriptor help, but replaces formatter text that can include
the rejected actual value with stable safe text. HTTP, Effect SDK and direct
calculator consumers must not receive secrets or machine-local paths copied
from invalid inputs.

The generic calculate route exposes request facts as a union of canonical
rule-owned calculator input schemas, not `Schema.Unknown`. OpenAPI should show
the supported fact shapes under `facts.anyOf`; current public shapes include
take-home/pay-withholdings input facts and annual-tax input facts. Because
Effect HTTP route schemas are not dependent on the `calculatorId` path
parameter, `@taxkit/calculators` must decode `payload.facts` again with the
selected catalog entry's canonical `inputSchema` before execution. A payload
that is valid for a different calculator must fail as
`CalculatorInputDecodeError` with descriptor-backed help for the selected
calculator.

The Effect `4.0.0-rc.117` upgrade changes generated OpenAPI component names
to encoded-side names ending in `Encoded` and adds a nested union around
supported tax years. The API package owns this document change and its
snapshot. Public route paths, status codes and JSON field names remain stable;
route tests and the standalone API smoke check cover those runtime claims.

Public JSON examples must use canonical schema values, including tagged values
such as `GrossPay` and `Money` where the owning schema requires those tags.

Calculation/domain failures that are part of the engine contract should remain
typed failures and be encoded through the public error envelope. They should
not be converted into Effect defects.

Metadata and calculation routes may accept a `help` query parameter for richer
client guidance. Help output should be generated from canonical schemas, fact
descriptors, rule descriptors, graph diagnostics and source references instead
of hand-written route-specific DTOs.

## Native API Worker candidate

The active DEV-74 change adds `apps/api/src/worker.ts`, a native Alchemy
Worker class and `.make` entry. Its instance initialisation constructs one
router and acquires one calculator service for both `TaxKitApiRoutesLayer`
and `TaxKitRpcHttpLayer`. `HttpRouter.toHttpEffect` returns the incoming
request Effect; it does not create a backend ManagedRuntime.

The host leaves resource addresses deferred during native planning and
decodes/caches their bound values through Config on first incoming use.
Absent or invalid origins return an empty 503; no address is invented. Native
`Worker.URL` supplies its own address; infrastructure composition must supply
the matching website Output before the app graph is accepted. Native CORS
uses its supported origin predicate: the selected version's single-element
array form emits a fixed allow-origin value even for unrelated origins.
The predicate omits that header for an unrelated request. Only `content-type`
is allowed for the current JSON client, with credentials disabled.

POST bodies are read through the native Effect stream with a 64-KiB limit
and a total five-second read deadline, before native JSON decoding. Oversized
and stalled requests return checked JSON 413/408 guidance with the same CORS policy.
The selected native web-request reader does not use `MaxBodySize`, so merely
providing that reference would not enforce this limit. Native request
conversion retains headers, method, path and remote address.

The root installs a closed logger and error reporter before router construction
and incoming dispatch. Console egress contains a fixed event, time and severity;
raw native messages, Causes and arbitrary annotations do not escape this
adapter. Full native trace/export proof remains pending. The native Worker
candidate does not establish deployed availability. The T003 acceptance review
qualifies the complete local connection; T009 retains safe native trace exports.
The retained Bun entry and public HTTP/OpenAPI contract remain available.

## TypeScript SDK facade

The current private SDK package lives under:

```txt
packages/sdk/typescript
```

Current package name:

```txt
@taxkit/sdk
```

Preferred public package name at release time:

```txt
taxkit
```

If the unscoped package name is unavailable at first publish, continue with
`@taxkit/sdk` and keep the same export contract.

It owns:

- direct in-process calculation facade
- plain TypeScript `TaxKit.createClient(...)` client factory and
  `TaxKit.{method}` generic helpers
- Effect-native `./effect` entrypoint
- jurisdiction-specific opt-in subpaths such as `./au`
- Layer-backed typed modules that preserve compile-time calculation, fact, rule and period capabilities
- typed declarations, provider Layers and bindings shared by plain and Effect entrypoints
- exported input and output schemas
- typed calculator request builders
- examples for Node and browser usage

The SDK must not import `@taxkit/api-http`, server handlers or Node-only
modules from browser-safe entrypoints. It also must not expose Effect runtime
types from the plain TypeScript entrypoint. HTTP clients and OpenAPI transport
helpers stay in `@taxkit/api-http`. The SDK is a test-only comparison
dependency of the HTTP package; the production HTTP adapter calls the owning
calculator service directly.

The plain facade maps typed calculator failures, output Schema failures and
unexpected defects into stable SDK-owned messages. It preserves a typed
`CalculatorServiceError` detail when present, but never projects raw
`Cause.pretty` text, rejected values or private paths into either safe results
or rejected Promises. Effect consumers continue to receive the typed error
channel directly.

Plain clients have caller-owned lifetimes. `createClient` creates one private,
lazy ManagedRuntime per client, and `dispose(): Promise<void>` interrupts pending
work/startup and awaits finalisation. An Effect Ref marks the client closed;
an Effect Deferred shares cleanup completion with repeated or overlapping
calls. Closing one client does not close another. Closed calculation calls have
checked `TaxKitClientDisposedError` detail; cleanup defects produce the safe
`TaxKitClientDisposeError`. The private `client.runtime.ts` is the exact Promise
and execution host. Actual work is interruptible inside its client scope; public
outcome conversion is protected so raw interruption errors do not escape.

One-shot generic and AU helpers provide the calculator Layer in a temporary
Effect scope and clean up before settling. They do not create a ManagedRuntime.
Both plain paths reuse `calculateReport`; dispatch and output decoding have one
owner. The Effect interface remains caller-composed and creates no runtime.
These lifetime changes fulfil part of the accepted fresh interface work; they
do not establish the later calculator UI, transport limits or whole-task acceptance.

## Native website RPC (T003 locally accepted)

`@taxkit/api-rpc` owns all nine named calculator-service procedures over canonical
calculator request/result/query/metadata Schemas. Its native server mounts POST
`/rpc` with JSON; handlers delegate to the corresponding
named `PublicCalculatorService` operation.
The protocol lives in the caller's Layer scope; each named operation acquires and
releases its native generated client's receive loop. Expected
calculator failures project to fixed reasons, while version disagreement,
unavailable transport, invalid replies and a complete-response deadline remain
separate checked failures. Independent adapter defects remain defects.

Native parser ingress checks procedure tags, bounded identities/batches/headers
and a 64-KiB UTF-8 input before dispatch. Native per-procedure and global defect
encoding use a fixed value. The client marks only the native exit reply decoder;
it does not classify every SchemaError as an invalid response. Installed Effect
4.0.0 source and actual wire tests qualify these hooks. RPC APIs remain unstable.

The [package README](../../packages/api/rpc/README.md) owns its explicit exports
and current proof limits. The native API/Website candidates now consume it.
The saved Website pair check exercises actual built artifacts, repeated private
binding calls, an idle browser form, exact browser CORS and no-JavaScript POST.
The saved native RPC failure check also runs malformed envelopes, procedure
decoding, expected/version errors and an injected fatal operation in actual
Workers. A damaged valid-JSON reply crosses the real private binding and
restores a checked error in Chromium without replay. Fixed host log events are
required as positive controls. The native cancellation test runs the real
calculation/encoder before controlled twelve-second header/body delays. The
generated client must hit its ten-second deadline; Chromium must abort on the
deadline, editing and browser Back leaving the form. This establishes caller
cancellation, with no upstream Worker cancellation claim. Native local development
is separately qualified; T009 safe exported tracing remains in progress.
Public HTTP/OpenAPI keeps its existing contract and shared application operation.

Calculator Schemas use narrow core/rule Schema entrypoints. Diagnostics and
report/input definitions have separate canonical modules; old entrypoints
re-export the same definitions. Browser transport imports therefore avoid live
engine/calculator/rule-pack modules. This changes export ownership, not tax
rules or retained report values. It does not change the SDK's deliberate local
calculation composition.

## Export boundaries

The SDK package should publish a dist-only export map. Workspace-local source
conditions are useful during early scaffolding, but they must not appear in the
publish manifest unless source files are also intentionally packed and
supported.

Release packages express the two views separately: workspace `exports` may
retain `source`, while `publishConfig.exports` owns built `types` and `default`
targets and `files` limits the tarball. Because Bun resolves workspace and
catalogue dependency protocols during packing but does not apply
`publishConfig.exports`, the SDK-owned strict validator stages that declared
publication view and Bun-packs it again. Acceptance is based on the final
tarball manifest, clean installation and public-entrypoint imports. The
validator decodes the staged manifest once through a Schema that preserves
uninterpreted metadata, then encodes the declared publication view. Optional
dependency keys remain absent when originally absent; staged JSON key order is
not an artifact-byte guarantee. Each process has a scope, bounded stdout and
safe operational failures. A failed cleanup also fails validation.

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

`.` should expose the plain, jurisdiction-neutral `TaxKit` facade. `./effect`
should expose the Effect-native `TaxKit` facade used by HTTP handlers.
Jurisdiction subpaths such as `./au` and `./au/effect` should expose local
typed modules, calculation descriptors and thin convenience clients. The current
plain root uses the default public calculator catalog, which includes the AU
rules through the calculator live Layer. The root does not directly import AU
descriptors; module selection limits client types rather than removing unselected
rules from that default catalog or proving a smaller bundle. `./schemas` must be
browser-safe and re-export calculator-owned `CalculatorRun*` schemas and
`CalculatorServiceError` without duplicating them. `./testing` may expose
test-only descriptors and helpers for consumers validating type behaviour.

## Fumadocs site

The public docs site lives under:

```txt
apps/docs
```

Reusable docs content and Fumadocs integration live under:

```txt
packages/docs-content
packages/docs-fumadocs
```

The docs app should document:

- rule package architecture
- supported Australian tax years
- calculator inputs and outputs
- API reference
- SDK usage
- contribution guide for official rule tables and golden tests


The private catalogue procedure delegates to
`PublicCalculatorService.listCalculators` with the canonical `MetadataQuery`
and `CalculatorCatalogResponse`. It carries no calculation facts. Native
envelope admission derives its allowed tags from the owning nine-procedure group;
each operation retains the same checked version, safe defect handling, body
limits, whole-response deadline, native client scope and fetch policy. The
private reply decoder marks only the group's owning native exit Schemas; an
unrelated adapter Schema error remains a defect. Public HTTP/OpenAPI and SDK
interfaces do not change. The Website consumes this catalogue through its existing server application.

The native body reader and RPC byte admission share
`CalculatorRequestBodyLimit` from `@taxkit/api-http/request-boundary`: 64 KiB.
The RPC export preserves its original four-symbol compatibility alias.
The API applies it to public HTTP and native RPC POST, and the Website applies
it before decoding any supported standard HTML calculator form. At exactly
the limit, valid JSON still reaches the same named calculation operation;
exceeding it releases the source before its remaining tail is consumed.
The retained standalone HTTP server mounts the same admission middleware.
Oversized/stalled bodies return fixed Schema-owned 413/408 JSON guidance; native
Website forms select fixed HTML guidance and a link back to the calculators.
The five-second total reader budget also rejects late synchronous completion.
Custom route/RPC-only hosts must supply request admission at their composition.
Per-client rate identity and limiting remain active T004 work.

The private RPC client owns one ten-second complete-response deadline and a
2 MiB byte cap for all nine closed JSON replies. Its concrete native HTTP adapter
scopes each request through status validation and bounded stream reading before
reusing native Response/Protocol/exit codecs. HTTP 408, 413 and 429 have distinct
checked errors with fixed codes, literal safe messages and manual retry guidance;
no rejected body or raw HTTP cause reaches the page. Both calculator containers
share safe guidance for current and restored checked failures without replay.
The public SDK and standalone HTTP server retain their separate contracts.

## Shared calculation work limits

The [calculator-owned policy](../../packages/calculators/README.md#shared-calculation-work-limits)
supplies one eight-calculation pool and five-second operation budget to the native HTTP/RPC
instance and one per standalone HTTP router. Calculation errors use separately
declared HTTP 503/504 envelopes; existing request failures keep 400 and metadata
methods declare checked 504 timeouts without using calculation places. RPC revision 3 preserves the canonical fixed capacity and
timeout errors. Website forms request manual retry. SDK Schemas re-export these
errors, while local SDK execution keeps its caller-owned lifetime and tax results.
The owning package records cleanup and CPU proof limits. Rate identity, per-client rate limits and future MCP operations remain T004/T006 work.


The [complete RPC contract](../../packages/api/rpc/README.md#complete-named-operation-contract)
keeps the nine application methods closed and named. The existing group is the
single source for native tag admission and owned reply-decoder identities.
Its private operation transformation owns native receive-loop cleanup and safe
transport policy over an already constructed Effect. It is not a client callback
escape. Public HTTP/OpenAPI and local SDK operations keep their existing owners.


SDK descriptor output narrowing checks `Schema.toType(outputSchema)` because
the calculator service already returns a domain report. Applying the transport
decoder again fails once trace fields are Options. HTTP/RPC representations
still encode/decode through their owning codecs. The packed consumer compares
22 saved metadata responses and the original trace/ledger bytes while its
declarations expose the new Core Option types and checked constructor inputs.
