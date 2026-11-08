# API and SDK

[ADR 0011](../adr/0011-effect-native-sdk-contracts.md) records the SDK 5
contract: shared Effect-native Schemas and execution, checked money, inferred
rule requirements and a hard cutover that removed every superseded
implementation and interface. The current contracts are described below.

The native API app collects minimal calculator usage analytics.
Direct callers may supply a collection preference through the shared private
header boundary. Its checked flag carries allow/deny without browser identity and
cannot bypass normal calculator admission. The Website sends no such header. One app decorator collects catalogue
ID/name after success. Pure calculators and SDK package calls remain free of
analytics. The [API README](../../apps/api/README.md#analytics-candidate) owns
the bounded collector, background delivery and what is not yet checked.

TaxKit should publish a reusable API app server and TypeScript SDK around the
open-source calculation engine.

The API and SDK are part of this repository because they expose reusable tax
calculation capabilities through stable, documented boundaries.

## Current API runtime

See [TypeScript SDK facade](#typescript-sdk-facade) and
[Export boundaries](#export-boundaries) for the SDK entrypoints and export
contract.

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
GET /api/v2/jurisdictions
GET /api/v2/tax-years
GET /api/v2/calculators
GET /api/v2/calculators/:calculatorId
GET /api/v2/calculators/:calculatorId/schema
POST /api/v2/calculators/:calculatorId/calculate
GET /api/v2/calculators/:calculatorId/graph
GET /api/v2/facts
GET /api/v2/rules
GET /api/v2/docs/navigation
GET /api/v2/docs/page?path=/start/quickstart
GET /api/v2/docs/search?term=Quickstart
GET /api/v2/docs/markdown?path=/start/quickstart
```

The native API Worker also serves GET/HEAD `/api/v2/docs/discovery/*`
(`sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`) and `/mcp`.

`apps/web` reads the separate API with Effect's generated
`HttpApiClient` for `TaxKitApi`, over the private service binding on the server
and the public origin in the browser. It must not mount the canonical API or
import server-only `@taxkit/api-http` exports. The
[Website client](#website-client) section describes it.

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
server route layer, OpenAPI metadata, the shared CORS/cache response policy and
reusable client config schema.

`@taxkit/api-http` owns transport contracts, HTTP status annotations, OpenAPI
generation, server route layers and thin handler adapters. Callers use the
generated client directly: `HttpApiClient.make(TaxKitApi, { baseUrl })` from
`effect/http-api`. The package has no client constructors or client service of
its own.
Reusable calculator catalog entries, metadata transformations, graph assembly
and schema-error shaping live in `@taxkit/calculators`. The calculate route
calls the supplied `PublicCalculatorService` directly and maps its checked
result to the HTTP response. SDK parity is proved by the package tests and
packed-consumer checks; the production HTTP handler does not execute through
the SDK.

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

The public documentation group uses canonical `@taxkit/content` page,
navigation and search Schemas. Its thin handlers call `ContentService` and
return the same processed page body for Markdown. Both API hosts inject a
checked build-time JSON catalogue, without importing the MDX compiler into
requests. Page queries are bounded public addresses; search terms and result
sizes retain the content owner's limits. Missing-page and source-search
failures have fixed typed 404/503 replies; native invalid queries return empty
400 replies. These routes contain public documentation, never personal reports.
The HTTP server Layers and `TaxKitApiInProcessLive` (`./in-process`, an
in-process `HttpClient` over the same routes for tests and examples) require
supplied content. The in-process client runs native request Effects in
caller-owned scopes and does not create an additional web-handler runner.

Route-only HTTP envelopes, query schemas and status annotations stay in
`@taxkit/api-http`. HTTP-facing names such as
`CalculatorApiErrorEnvelope` stay in the transport package because they
describe calculator API status encoding. Rule-owned calculator IDs and
supported context literals are composed by `@taxkit/calculators`; reusable
help modes, calculator run payloads and calculator service errors live in
`@taxkit/calculators`.

The calculate-route production graph is:

```txt
Native HttpApi strict correlated payload decode
  -> CalculatorApiHandlerLive checks path/body identity
    -> PublicCalculatorService.calculate(checked request)
      -> selected complete calculator definition
        -> CalculationEngine and owning rule/scenario Layers
      -> correlated CalculatorRunResponse
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

```txt
Effect consumer
  -> calculateRun(complete definition, checked scenario)
    -> definition.calculate(scenario)
      -> owning native program and rule-pack Layer
        -> CalculationEngine
    -> checked report, diagnostics and exact calculator identity/context

calculateReport(definition, scenario)
  -> calculateRun(definition, scenario)
    -> run.report
```

Explicit `decodeInput` checks untrusted representation once before execution.
The plain Promise/Result interface uses those same Effects at its private host.

The matching test graph is:

```ts
Tests: HTTP compared with SDK

SDK HTTP comparison tests
  -> HttpApiClient.make(TaxKitApi) over TaxKitApiInProcessLive
    -> CalculatorApiHandlerLive
      -> PublicCalculatorServiceLive
        -> CalculationEngineLive
  -> success response equals SDK full-run response
  -> InputValidationError maps to CalculatorApiErrorEnvelope
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
- schema-guided expected error shaping with bounded safe field issues
- calculation execution through `CalculationEngine`
- canonical reusable calculator execution schemas named `CalculatorRun*`
- canonical reusable calculator failure union named `CalculatorServiceError`
- typed propagation of expected domain failures such as `CalculationError`

HTTP and MCP hosts consume this service. The SDK executes the complete owning
definitions through the same engine. Callers do not duplicate calculator logic.

## HTTP API package topology

The implemented HTTP API package lives at `packages/api/http` and is named
`@taxkit/api-http`. It owns Effect HTTP API definitions, calculation endpoint
schemas, thin server handlers that delegate to `@taxkit/calculators`, OpenAPI
generation, HTTP status annotations and the `TaxKitApi` definition that
generated clients use.

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
GET  /api/v2/jurisdictions
GET  /api/v2/tax-years
GET  /api/v2/calculators
GET  /api/v2/calculators/:calculatorId
GET  /api/v2/calculators/:calculatorId/schema
POST /api/v2/calculators/:calculatorId/calculate
GET  /api/v2/calculators/:calculatorId/graph
GET  /api/v2/facts
GET  /api/v2/rules
```

Calculator IDs may include jurisdiction segments, such as
`au.pay.take-home`, but route structure must remain portable to future
jurisdictions through the shared calculator routes.

Inputs and outputs decode through Effect Schema. Schema decode failures return
bounded, safe issue paths and fixed messages through `InputValidationError`.
Clients use catalogue metadata for help with the selected calculator. Outputs
include the owning checked reports, traces and ledgers.

Calculator input-error egress preserves the public tagged shape and safe
field paths. Fixed text replaces formatter messages that can include
the rejected actual value. HTTP, Effect SDK and direct
calculator consumers must not receive secrets or machine-local paths copied
from invalid inputs.

The calculation body is a correlated native Schema union, with `calculatorId`
and `payload.facts` tied to the owning scenario codec. Strict native payload
parse options reject unknown fields before execution. Path and body IDs agree;
wrong-calculator facts fail at that single boundary. Responses correlate the ID,
catalogue metadata and checked owning report.

Effect generates OpenAPI component names from encoded-side names ending in
`Encoded`. Effect 4.0.7 flattens redundant nested `anyOf` groups without changing
their accepted values. Optional query parameters are omitted when absent;
the generated parameter schema no longer advertises JSON `null` for them.
The API package owns this document and its snapshot.
Calculator routes move together to HTTP v2; superseded routes are removed.
Route tests, the OpenAPI snapshot and standalone API smoke check cover this
versioned contract. The docs API keeps its independently owned version.

Public JSON examples must use canonical schema values, including tagged values
such as `GrossPay` and `Money` where the owning schema requires those tags.

Calculation/domain failures that are part of the engine contract should remain
typed failures and be encoded through the public error envelope. They should
not be converted into Effect defects.

Metadata routes may accept a `help` query parameter for richer
client guidance. Help output should be generated from canonical schemas, fact
descriptors, rule descriptors, graph diagnostics and source references instead
of hand-written route-specific DTOs.

## Native API Worker

`apps/api/src/worker.ts` declares a native Alchemy Worker class and `.make`
entry. Its instance initialisation constructs one router and acquires one
calculator service for `TaxKitApiRoutesLayer`, `TaxKitRpcHttpLayer` and the
discovery routes. `HttpRouter.toHttpEffect` returns the incoming request
Effect; it does not create a backend ManagedRuntime.

The host leaves resource addresses deferred during native planning and
decodes/caches `API_PUBLIC_ORIGIN` and `TAXKIT_PUBLICATION_ORIGIN` through
Config on first incoming use. Absent or invalid origins return an empty 503; no
address is invented. The API reads no Website address.

HTTP uses public credential-free CORS for any exact HTTP(S) origin
(`publicCors`/`isBrowserOrigin` in `@taxkit/api-http/response-policy`, shared
with the Bun host routes). MCP admits Origin-less clients and the publication
origin only. The native init declares Cloudflare Workers Cache with
`cache({ crossVersionCache: false })`; `applyCachePolicy` defaults successful
public reads to `Cache-Control: public, max-age=0` and
`Cloudflare-CDN-Cache-Control: public, max-age=604800, stale-if-error=0`.
Explicit handler lifetimes and revalidation directives take precedence over
these defaults. Storage restrictions from any cache-control header, a
`Set-Cookie` header or Effect response cookies prevent sharing; non-public
replies are `no-store`. Accept-only negotiation answers remain separate public
variants. The package README owns the detailed response policy.

The native default `fetch` serves the Website's private HTTP binding as well
as public HTTP and MCP. The Website uses that binding only to read; it never
calculates through it. The same native limiter and work pool serve every
transport. A calculation's rate key comes only from the direct edge identity in
`@taxkit/observability/edge-identity` or the explicit local-emulator loopback
fallback; public clients require no credential.

POST bodies are read through the native Effect stream with a 64-KiB limit
and a total five-second read deadline, before native JSON decoding. Oversized
and stalled requests return checked JSON 413/408 guidance with the same CORS policy.
Native request conversion retains headers, method, path and remote address.

The root installs a closed logger and error reporter before router construction
and incoming dispatch. Console egress contains a fixed event, time and severity;
raw native messages, Causes and arbitrary annotations do not escape this
adapter. The retained Bun entry and public HTTP/OpenAPI contract remain
available.

## Website client

The Website calls the API only through the generated client for `TaxKitApi`:

- Server: `HttpApiClient.makeWith(TaxKitApi, ...)` over
  `toHttpClient(fromCloudflareFetcher(TAXKIT_API))`, inside the Website's one
  `ManagedRuntime`. The server only reads (documentation, catalogue and
  discovery); it never calculates. A narrow native binding adapter enforces
  `redirect: "manual"`, retaining the original receiver and abort signal.
  Discovery files are forwarded once to the API's discovery routes.
- Browser: `ApiClient`, an `AtomHttpApi.Service` over `FetchHttpClient` with
  `credentials: "omit"` and `redirect: "error"`, calling the public API origin
  directly.

Both read replies with a 2 MiB cap and give each call one ten-second deadline.
The Website has no server functions or API proxy. The
[frontend owner](frontend.md) describes its loaders and failure handling.

## TypeScript SDK facade

[ADR 0011](../adr/0011-effect-native-sdk-contracts.md) owns the SDK 5 hard
cutover. Rule packages define each calculator's ID, context, input/output
Schemas, error Schema, rule graph and native execution together. Catalogue
registrations derive these fields from the complete definition. Context lookup
checks ID, jurisdiction and year; duplicate identities fail registration.

The Effect interface exposes `calculateReport`, `calculateRun`, `decodeInput`,
the actual engine service tag and static `TaxKitLive`. Strict unknown ingress
uses the selected owning codec once; checked scenarios flow directly into the
native program. Graph validation and report invariants belong to their domain
owners. The SDK does not re-decode typed service output. Full runs include the
selected identity/context, diagnostics and inferred report.

The plain interface exposes named `calculate`, `calculateSafe`, `run` and
`createClient` operations. Its private host owns one lazy ManagedRuntime per
client using native acquisition, disposal and fibre tracking. Safe outcomes use
native Result and Schema.Result, with expected errors directly in the failure
payload. Schema-tagged host errors contain defects and disposal failures. Async
disposal and repeated disposal share a cached cleanup outcome. One-shot calls
own bounded lifetimes. No package-global runtime is retained.

The [SDK README](../../packages/sdk/typescript/README.md) owns usage and upgrade
examples. SDK 5 deletes selector-only modules, object facades, custom result
classes, independent SDK descriptor factories, blanket errors, opaque causes,
transport-shaped SDK request helpers and old money aliases. All owned callers
move together; compatibility adapters and old calculator routes are absent.
Supported historical tax packs use current contracts and retain their statutory
parameters and independent result evidence.

## Export boundaries

The sole published package is `taxkit`. Root, `money`, `money/effect`, `effect`,
`au`, `au/schemas`, `au/effect`, `schemas`, `core`, `http` and `testing` are
focused paths inside its assembled archive. Effect is the external runtime
dependency. Schema identities are shared across those paths; private packages
are not additional installation dependencies.

Root does not import HTTP or AU rule implementations. The schema and HTTP
paths remain independent of live calculation Layers. The HTTP path exports the
native HttpApi contracts directly. Core owns engine and fact/rule definition
contracts; API admission policy remains with the API host. AU Effect exports
actual facts, services, rules, parameters and pack Layers. Testing owns a checked
fixture and engine substitution support.

Normal SDK type checking includes negative compiler examples. The export,
packed-consumer and downstream gates check actual archive imports, declarations,
both interfaces, browser bundling, removed exports and statutory source/table
fingerprints. Runtime tests exercise strict inputs, signed money codec laws,
accounting invariants, client interruption, startup/disposal races and cleanup
failure replay. Local checks do not establish publication or deployment.

## Documentation site

The current local documentation reader lives under:

```txt
apps/web
```

Authored docs pages and the packages that read and check them live under:

```txt
content/docs
packages/content
packages/mdx
packages/diagrams
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
interfaces do not change.

The native body reader uses `CalculatorRequestBodyLimit` from
`@taxkit/api-http/request-boundary`: 64 KiB.
The API applies it to public HTTP POST. At exactly
the limit, valid JSON still reaches the same named calculation operation;
exceeding it releases the source before its remaining tail is consumed.
The retained standalone HTTP server mounts the same admission middleware.
Oversized/stalled bodies return fixed Schema-owned 413/408 JSON guidance.
The five-second total reader budget also rejects late synchronous completion.
Custom route hosts must supply request admission at their composition.
The native rate policy is described below.

## Shared calculation work limits

The [calculator-owned policy](../../packages/calculators/README.md#shared-calculation-work-limits)
supplies one eight-calculation pool and five-second operation budget to the native API
instance and one per standalone HTTP router. Calculation errors use separately
declared HTTP 503/504 envelopes; existing request failures keep 400 and metadata
methods declare checked 504 timeouts without using calculation places. Website forms request manual retry. SDK Schemas re-export these
errors, while local SDK execution keeps its caller-owned lifetime and tax results.
The owning package records cleanup and CPU limits. The native rate policy
and MCP operations are described below.


SDK execution accepts the checked scenario Type and returns a checked report
from the complete definition. External restoration uses the owning codec;
explicit `*Encoded` schemas retain aggregate checks for representation-only
validation. The installed archive proves Money/Result codec laws, native service
requirements, calculation parity, browser boundaries and unchanged statutory
parameter/source fingerprints.

Request context uses one semantic Option. Public input failures expose bounded
safe paths and messages; calculation failures expose closed reasons without
opaque causes. The plain interface projects unexpected host defects only at its
private Promise runtime boundary.

## Native calculation rate admission

The [calculator rate owner](../../packages/calculators/README.md#native-calculation-rate-admission) defines canonical errors and a redacted IP key. The [native API](../../apps/api/README.md#native-calculation-rate-admission) composes admission once below bounded work, so HTTP and MCP share an allowance and each calculation takes one unit. Metadata remains independent. HTTP uses 429 with `Retry-After: 60` or fixed 503 guidance. The standalone Bun host and local engine/SDK keep their existing behaviour. Packed declarations must expose the expanded checked error union without adding private host identity capabilities.

### Documentation over HTTP

The Website reads documentation through the public HTTP content routes
(`/api/v2/docs/navigation`, `page`, `search` and `markdown`) and serves
`.md`/`Accept` Markdown from `getMarkdown`; see
[frontend architecture](frontend.md#documentation). The API's discovery routes
build each document from the public catalogue and the checked API and
publication origins through the static `ContentDiscoveryLive`.

## Native remote MCP

The native API mounts `@taxkit/api-mcp` at `/mcp` with Effect 4.0.7's native
`McpServer.layerHttpRequestScoped`, `Tool` and `Toolkit`. Only modern
`2026-07-28` is supported. The six tools reuse canonical calculator/content
Schemas and the captured shared services, work pool and native rate limiter.
Effect owns protocol parsing, discovery and JSON/SSE framing; Alchemy owns the
Worker, event runner and native finalization. No application MCP runtime or
AsyncLocalStorage shim is installed.

Shared registration excludes the first caller's request, rate key, analytics
and abort capabilities. Each POST owns its protocol server and notification
consumer through response-body completion; no request-owned consumer is retained
for later invocations. Request input remains bounded to 64 KiB/five seconds,
complete replies to 2 MiB/ten seconds, and calculation work to the existing
five-second/eight-place policy. Outbound interruption does not prove immediate
remote cleanup; modern network cancellation retains its bounded work anchor.

Discovery advertises `tools.listChanged: false`. Legacy sessions, subscriptions,
GET streams, DELETE termination and resumption are unsupported. The modern-only
release removes `TaxKitMcpSessions` from the native class/export/binding graph
and deletes its namespace through Alchemy's native migration. Its data and
former sessions cannot be recovered by redeploying old code. The
[deployment runbook](../runbooks/deployment.md) owns plan/readback and rollback.

Origin-less clients and the checked same-stage Website origin remain admitted; foreign
browser origins are refused. The public [agent guide](../../content/docs/api/agent-tools.mdx)
owns client compatibility and connection steps. The Website agents page uses
checked same-stage API settings; public documentation/discovery keeps its
existing catalogue owner.

Native qualification uses the actual generated Worker and official client for
all six tools, separate completed requests and concurrent cold starts. Its
record-and-rethrow test observer checks native async-resource resumption and
progress; HTTP 200 or a generic log hook alone cannot establish correct
lifetimes. A retained-model negative control must fail before the fixed model
is accepted. Cancellation, work-slot recovery, browser admission, shared quota
and response cleanup have their own direct assertions. See the
[API owner](../../apps/api/README.md#native-remote-calculator-tools) and
[testing owner](testing-and-quality.md). Source design and local proof do not
establish a deployed migration or hosted behavior.
