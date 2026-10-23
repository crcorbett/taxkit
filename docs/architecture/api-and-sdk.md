---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-api-sdk-owner
last_reviewed: 2026-10-18
review_trigger: API or SDK contracts, exports, lifetime or caller composition change
---

# API and SDK

The active T008 candidate adds minimal analytics only in the native API app.
The Website supplies fresh browser or original HTML preferences through the
shared private header boundary. Its checked flag carries allow/deny without browser identity and
cannot bypass normal calculator admission. One app decorator collects catalogue
ID/name after success. Pure calculators and SDK package calls remain free of
analytics. The [API README](../../apps/api/README.md#analytics-candidate) owns
the current bounded collector, background delivery design and remaining proof.

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
GET /api/v1/jurisdictions
GET /api/v1/tax-years
GET /api/v1/calculators
GET /api/v1/calculators/:calculatorId
GET /api/v1/calculators/:calculatorId/schema
POST /api/v1/calculators/:calculatorId/calculate
GET /api/v1/calculators/:calculatorId/graph
GET /api/v1/facts
GET /api/v1/rules
GET /api/v1/docs/navigation
GET /api/v1/docs/page?path=/start/quickstart
GET /api/v1/docs/search?term=Quickstart
GET /api/v1/docs/markdown?path=/start/quickstart
```

The native API Worker also serves GET/HEAD `/api/v1/docs/discovery/*`
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

The final calculate-route production graph is:

```ts
Production: HTTP calculate

API host (standalone Bun or native Worker)
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
  -> taxkit/effect calculateRunRequest(descriptor, request)
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

SDK HTTP comparison tests
  -> HttpApiClient.make(TaxKitApi) over TaxKitApiInProcessLive
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
as public HTTP and MCP. Website canonical calculation POSTs carry a checked
original IP and a stage-owned native Alchemy secret in private headers.
`ApiWebsiteForwarding` authenticates them before installing the request-local
rate key and strips them before router dispatch. Partial, malformed or wrong
metadata fails closed; other methods/paths gain no authority from those fields.
The same native limiter and work pool serve every transport. Direct edge
callers retain `@taxkit/observability/edge-identity`; public clients require no
forwarding credential.

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
  `ManagedRuntime`. Reads and canonical calculation POSTs use native HTTP;
  only the latter receive authenticated original-IP metadata. A narrow native
  binding adapter enforces `redirect: "manual"`, retaining the original
  receiver and abort signal. The visitor's
  collection-policy header is forwarded. Discovery files are forwarded once to
  the API's discovery routes.
- Browser: `ApiClient`, an `AtomHttpApi.Service` over `FetchHttpClient` with
  `credentials: "omit"` and `redirect: "error"`, calling the public API origin
  directly.

Both read replies with a 2 MiB cap and give each call one ten-second deadline.
The Website has no server functions or API proxy. The
[frontend owner](frontend.md) describes its loaders and failure handling.

## TypeScript SDK facade

The public SDK package lives under:

```txt
packages/sdk/typescript
```

Package name:

```txt
taxkit
```

The sole public npm package is `taxkit`, with eight entry points.

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

The SDK root, AU and Effect entry points stay independent from HTTP; `/http`
re-exports the canonical HTTP contracts from `@taxkit/api-http` without server
handlers or Node-only modules. The plain facade keeps its Promise-facing
signatures. SDK-owned integration tests compare HTTP and SDK results; the HTTP
package never depends on the SDK. The single SDK archive includes the private
modules and their declarations, while Effect remains external. Its fresh
consumer installs no other TaxKit package.

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

The current local documentation reader lives under:

```txt
apps/web
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
interfaces do not change.

The native body reader uses `CalculatorRequestBodyLimit` from
`@taxkit/api-http/request-boundary`: 64 KiB.
The API applies it to public HTTP POST, and the Website applies
it before decoding any supported standard HTML calculator form. At exactly
the limit, valid JSON still reaches the same named calculation operation;
exceeding it releases the source before its remaining tail is consumed.
The retained standalone HTTP server mounts the same admission middleware.
Oversized/stalled bodies return fixed Schema-owned 413/408 JSON guidance; native
Website forms select fixed HTML guidance and a link back to the calculators.
The five-second total reader budget also rejects late synchronous completion.
Custom route hosts must supply request admission at their composition.
The native rate policy is described below; whole T004 qualification remains active.

## Shared calculation work limits

The [calculator-owned policy](../../packages/calculators/README.md#shared-calculation-work-limits)
supplies one eight-calculation pool and five-second operation budget to the native API
instance and one per standalone HTTP router. Calculation errors use separately
declared HTTP 503/504 envelopes; existing request failures keep 400 and metadata
methods declare checked 504 timeouts without using calculation places. Website forms request manual retry. SDK Schemas re-export these
errors, while local SDK execution keeps its caller-owned lifetime and tax results.
The owning package records cleanup and CPU proof limits. The native rate policy
and qualified MCP operations are described below; T006 retains the observed
modern five-second remote cleanup limit.


SDK descriptor output narrowing checks `Schema.toType(outputSchema)` because
the calculator service already returns a domain report. Applying the transport
decoder again fails once trace fields are Options. HTTP representations
still encode/decode through their owning codecs. The packed consumer compares
22 saved metadata responses and the original trace/ledger bytes while its
declarations expose the new Core Option types and checked constructor inputs.


Calculator-owned context, help and filter fields use `Option<Option<A>>` in
checked TypeScript values: `None` means a missing key, `Some(None)` means a
present undefined key, and `Some(Some(value))` means a present value. Owning
constructors default omitted keys to `None`. JSON and HTTP query fields retain
their ordinary optional representation. Flatten the two absent forms only where
they mean the same thing; do not invent a jurisdiction or tax year.

SDK constructor-input aliases retain the selected descriptor facts relation.
The SDK checks context/help through their owning Schemas and leaves facts to
the selected calculator decoder. HTTP uses canonical Types internally and
representation codecs at serialisation. Their existing wire/OpenAPI fields and
values remain the compatibility contract.


Core calculation errors now retain diagnostic-key identity through nested
Options. Current rule errors omit diagnostics; historical opaque/null values
remain codec values and are not safe telemetry. Catalogue entries use their
checked selected continuation without the unused generic `program` field.
The fresh package declarations change deliberately; retained HTTP, report,
metadata and table/source values stay fixed. The HTTP OpenAPI snapshot and the
HTTP package tests check that they do.


## Native calculation rate admission

The [calculator rate owner](../../packages/calculators/README.md#native-calculation-rate-admission) defines canonical errors and a redacted IP key. The [native API](../../apps/api/README.md#native-calculation-rate-admission) composes admission once below bounded work, so HTTP, MCP and private Website calls share an allowance and each calculation takes one unit. Metadata remains independent. HTTP uses 429 with `Retry-After: 60` or fixed 503 guidance. The standalone Bun host and local engine/SDK keep their existing behaviour. Packed declarations must expose the expanded checked error union without adding private host identity capabilities.

### Documentation over HTTP

The Website reads documentation through the public HTTP content routes
(`/api/v1/docs/navigation`, `page`, `search` and `markdown`) and serves
`.md`/`Accept` Markdown from `getMarkdown`; see
[frontend architecture](frontend.md#documentation). The API's discovery routes
build each document from the public catalogue and the checked API and
publication origins through the static `ContentDiscoveryLive`.

## Native remote MCP

The native API mounts `@taxkit/api-mcp` at `/mcp` with Effect 4.0.4's native
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
browser origins are refused. The public [agent guide](../../packages/docs-content/content/api/agent-tools.mdx)
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
