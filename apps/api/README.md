---
document_type: app-readme
lifecycle: current
authority: canonical
owner: taxkit-api-app-owner
last_reviewed: 2026-10-13
review_trigger: API app settings, startup, routes, CORS, cache, smoke command or shutdown change
---

# API App

API application with a standalone Bun process and the native Alchemy Worker
that the Website and deployed stages use.

## Scope

`apps/api` owns process config, Bun server startup, request dispatch to
`@taxkit/api-http/server` and graceful shutdown. API contracts, handlers,
schemas, generated OpenAPI and docs routes stay in `packages/api/http`.

Both API hosts provide `ContentService` from the generated public catalogue.
`src/content.boundary.ts` imports only `@taxkit/docs-content/public-catalogue`
JSON, checks it once when the host is built and reports a fixed configuration
failure if it is invalid. Incoming requests do not load authored MDX or run
the compiler. Public HTTP and native RPC documentation operations serve
navigation, checked page values, bounded search and exact processed Markdown
from that same service. Documentation calls consume no calculator allowance.
See the [HTTP package](../../packages/api/http/README.md) for paths/response rules
and the [RPC owner](../../packages/api/rpc/README.md#documentation-connection)
for the separate documentation revision and client.

The native Worker also serves the four discovery documents at GET (and HEAD)
`/api/v1/docs/discovery/sitemap.xml`, `/robots.txt`, `/llms.txt` and
`/llms-full.txt`. It builds the static `ContentDiscoveryLive` once from that
same catalogue, supplying `ContentDiscoverySettings` from its cached checked
API and publication origins, so deferred native addresses are read on first
use. A document is plain text or XML with `nosniff`; settings or projection
failure is an empty 503. The Website forwards its own `/sitemap.xml`,
`/robots.txt` and `/llms*.txt` requests here once. The standalone Bun host does
not serve these routes. Discovery takes no calculator allowance.

The API dependency build generates the public catalogue before TypeScript
or native bundling consumes it. Its ESNext module profile preserves the JSON
import attribute for ordinary Node loading of emitted modules. The Website,
infrastructure and Alchemy source-checking profiles also admit that attribute
when they inspect the API Worker source. Compiled public packages retain their
existing module profiles.

The retained standalone smoke check reads page JSON, navigation, search and
Markdown through the real HTTP process. It checks their common page address,
title and processed body within one five-second operation deadline, in addition
to the existing calculator and OpenAPI checks.

## Native Worker

`src/worker.ts` declares native `TaxKitApiWorker` with the standard Alchemy
class and `.make` entry. `src/worker.application.ts` constructs one router and
shared `PublicCalculatorService` in the native instance scope. HTTP and
POST `/rpc` delegate to the same calculator service. Its named RPC operations
match all nine existing calculator-service calls using the canonical request/result contracts. Native requests keep their own
fibre and cleanup scope; the app constructs no backend ManagedRuntime.

The Worker exposes two entry points. `fetch` serves public HTTP, RPC and MCP.
`calculatorRequest(request, key)` is a service-binding method with no HTTP
route: the Website uses it for calculations so the original caller's checked
rate key travels outside JSON and headers. It admits only POST `/rpc` and POST
`/api/v1/calculators/:calculatorId/calculate` (404 otherwise), and buffers the
reply within 2 MiB and ten seconds (503 otherwise).

The native init declares Cloudflare Workers Cache with
`cache({ crossVersionCache: false })`, so each deployed version starts its own
cache. Every reply, including error responses, gets one decision from
`applyCachePolicy` in `@taxkit/api-http/response-policy`. A successful GET or
HEAD on a public read path (documentation, discovery, calculator metadata and
the OpenAPI documents) without `Set-Cookie` gets
`Cache-Control: public, max-age=0` and
`Cloudflare-CDN-Cache-Control: public, max-age=604800, stale-if-error=0`.
Health, calculation, RPC, MCP and every error reply get `no-store`.

`src/edge-identity.boundary.ts` (export `api/edge-identity`) owns
`CalculatorHostMode` and `calculatorEdgeRateKey`, which reads the checked
`cf-connecting-ip` and refuses Worker subrequests. The Website's no-JavaScript
form host uses the same function.

The Worker checks `API_PUBLIC_ORIGIN` and `TAXKIT_PUBLICATION_ORIGIN` with the
canonical origin policy. Its own origin comes from native `Worker.URL`; the
publication origin is the fixed Production site `https://taxkit.dev`. The API
does not read the Website's address. Absent or invalid settings return a fixed
native Config error without the rejected value. HTTP and RPC CORS admit any
exact HTTP(S) browser origin with credentials disabled (`publicCors` and
`isBrowserOrigin` in `@taxkit/api-http/response-policy`, also used by the Bun
host routes), and allow `content-type`, the optional
`x-taxkit-collection-policy` header and the native `b3`/`traceparent` tracing
headers. Remote MCP admits Origin-less clients and browser pages served from
the publication origin only: `TaxKitMcpHost` supplies that origin to the static
`TaxKitMcpHttpLayer`, whose `allowedOrigins` holds just it.
Planning leaves those resource addresses deferred. On first incoming use, the
app decodes and caches the bound runtime values; missing or invalid values
produce an empty 503 response, without a guessed address.

Every native POST body is limited to 64 KiB before JSON parsing, with a total
five-second read deadline. The native stream stops at the limit and its reader
is closed on rejection, timeout or cancellation. Oversized requests return an
checked JSON 413 guidance; stalled bodies return checked JSON 408 guidance. CORS applies to those responses.

The app's native logger and error reporter emit only a fixed event name, time
and severity. Arbitrary messages, Causes, annotations and span labels are
discarded before console output. This is bounded containment; it provides no
native tracing or trace exporter.

The infrastructure apps stack declares the API and Website and the Website's
binding to the API; see [deployment](../../docs/architecture/deployment.md).
Local plans and transport tests do not show a deployment works.

## Analytics candidate

`src/calculator-analytics.layer.ts` adds one application owner after a native
hosted calculation succeeds. It collects only the catalogue calculator ID and
name. HTTP, native RPC and the two MCP protocols use this same decorator;
pure tax packages and local SDK calls have no analytics dependency. Metadata,
failed or interrupted calculations add no successful-use event. A request can
collect at most 64 successes; excess analytics are dropped without changing
the calculation. This bounded loss does not promise an exact count under loss.

`src/analytics-request.boundary.ts` uses the private analytics package’s shared
header boundary to read the optional collection choice once.
Missing means allow; deny, malformed values or `DNT: 1` mean no collection.
The policy carries no browser identity and changes neither admission nor the
existing rate key. The native MCP registration omits the request collector;
the older session host makes a fresh collector for each incoming request.

The native application composes the private
[analytics backend](../../packages/analytics/README.md). After a completed
bounded response, native Worker or session `waitUntil` schedules the one-attempt
send. The send owns its HTTP scope and deadline. Expected capture errors have
fixed safe diagnostics and do not change the response. Off is the default;
invalid enabled settings become a fixed native Config error. An in-process
host has no background delivery. The retained standalone Bun host remains
local and does not acquire analytics.

Focused tests cover the event owner, request isolation, policies and controlled
transport. The built native API additionally checks real Fetch sends after HTTP
and RPC calculations and both official MCP client protocols. Each MCP
conversation changes deny → allow → deny without retaining its first choice.
Rejected or redirected capture keeps the tax reply successful; a stalled capture
reply reaches the native five-second drop while the tax reply returns within two
seconds. The controlled Node response bridge does not expose upstream body
cancellation; that is not claimed.

The Website sends the choice to this same boundary in the
`x-taxkit-collection-policy` header. Browser calls read `navigator.doNotTrack`
at each dispatch: `1`, an unreadable value or an unexpected value means deny.
Server-rendered calls forward the incoming page request's choice, and a server
call with no incoming request sends deny. The API's CORS policy admits that
header. Tests cover this request boundary only; provider-side storage is not
checked here.

## Local native pair

Run `bun run dev` from the repository root for the native API and Website
pair. Alchemy owns both local addresses and the private binding; no cloud login
is required. The root builds the API dependency graph first and passes Bun's
source selection through the native launcher. API app source edits reload in
the current local Worker. Shared-package edits need that package's build because
native API bundling selects compiled package exports. Ctrl-C releases the pair.
See the [Website setup](../web/README.md) for the saved browser and shutdown checks.

## Runtime Shape

The process entrypoint is an Effect program run with
`@effect/platform-bun/BunRuntime.runMain`. Startup reads `ApiServerConfig` from
`ApiAppLayer`, requests are served by the Bun-backed `HttpServer` layer, and
`SIGINT` or `SIGTERM` interrupts the root Effect fiber so scoped finalizers stop
the Bun server.

Local defaults:

- host: `127.0.0.1`
- port: `4000`

Environment overrides:

- `API_HOST`
- `API_PORT`
- `PORT` as the fallback port supplied by portless

`API_PORT` takes priority. A present, invalid value fails startup rather than
using `PORT`; missing values use the fallback and then port 4000. Ports must
be whole numbers from 1 to 65535. Host names are trimmed and blank host values
use the default. Settings use the caller's Effect ConfigProvider; the live app
uses the environment and tests supply isolated providers. The safe
`ApiServerConfigError` does not include the rejected value.

## Routes

- `GET /api/health`
- `GET /api/docs`
- `GET /api/docs/openapi.json`
- `GET /api/v1/jurisdictions`
- `GET /api/v1/tax-years`
- `GET /api/v1/calculators`
- `GET /api/v1/calculators/:calculatorId`
- `GET /api/v1/calculators/:calculatorId/schema`
- `POST /api/v1/calculators/:calculatorId/calculate`
- `GET /api/v1/calculators/:calculatorId/graph`
- `GET /api/v1/facts`
- `GET /api/v1/rules`

Public calculation routes are calculator, fact, rule and graph driven.
Jurisdiction and tax year are calculator context, not top-level route families.
The initial calculator IDs are `au.pay.take-home`, `au.pay.withholdings` and
`au.income-tax.annual`.

Calculate payloads use canonical schema values from the rule packages. The
generated OpenAPI request body shows supported fact shapes under `facts.anyOf`;
for example, take-home-pay JSON includes tagged `GrossPay` and `Money` values.
The calculator service validates facts again against the selected calculator,
so annual-tax facts sent to `au.pay.take-home` return pay-calculator input help
instead of being treated as a valid take-home request.

## Changelog

Public API contract and deployment-facing changes are tracked in
[CHANGELOG.md](./CHANGELOG.md). Package-level API contract changes are also
tracked in [`@taxkit/api-http`](../../packages/api/http/CHANGELOG.md) through
Changesets.

## Commands

```sh
bun run --filter=api dev
bun run --filter=api start
bun run --filter=api smoke:public-routes
bun run --filter=api check-types
bun run --filter=api test
bun run --filter=api build
bun run --filter=api clean
```

The retained standalone public API can be run separately:

```sh
bun run --filter=api dev
```

This command serves the public API through portless at
`https://api.taxkit.localhost`. The native Website needs a matching native API
service for its private binding; this Bun process alone cannot provide it. The
root `bun run dev` supplies the matching native pair. The Website README owns
its local setup, build and test commands.

## Public-route smoke

Use the app-owned smoke command when you need proof that the standalone Bun
process serves the current public API contract:

```sh
bun run --filter=api smoke:public-routes
```

The command starts `apps/api` at `http://127.0.0.1:4173` by default, waits for
`GET /api/health`, calls the public calculator metadata route, posts a
take-home-pay calculation and checks the generated OpenAPI document. It then
creates a temp consumer workspace outside the repo, writes a dependency-free
`fetch` consumer and runs that consumer from the temp workspace against the
same public HTTP routes:

- `GET /api/health`
- `GET /api/v1/calculators`
- `POST /api/v1/calculators/au.pay.take-home/calculate`
- `POST /api/v1/calculators/au.income-tax.annual/calculate`
- `GET /api/docs/openapi.json`

The smoke script owns process lifecycle only. It validates response bodies with
schemas exported by `@taxkit/api-http` where those schemas are public, and it
lets the app process stop through Effect-scoped child process cleanup on
success or failure. The external consumer checks minimal public JSON evidence;
canonical route schema validation stays in this repo-owned smoke script. The
temp workspace is removed on success and failure. Failed cleanup also fails
the command and remains alongside an earlier command failure.

When the default loopback port is occupied, set `TAXKIT_API_SMOKE_PORT` to an
available port. The isolated release-boundary harness uses this override so a
neighbouring local development server cannot change its failure oracle.

The smoke command uses checked Config settings and arguments, named HTTP
operations and the exported `HealthResponse`, catalog and calculation Schemas.
The OpenAPI check requires its calculate path before running the plain external
consumer. Health readiness has a 15-second total limit, including retries and
response-body reading; other requests have a five-second limit. The external
consumer has a 30-second limit and a 1 MiB stdout limit. Its stderr is drained
without retention. Successful stdout is decoded into the exact expected route
coverage; failures report their bounded reason and available exit code.
Cancellation stops both child processes and removes the workspace. The external
consumer deliberately uses ordinary JavaScript `fetch` and JSON to check a
caller outside the repository.

`check-types` covers source, scripts, test fixtures and test configuration.
`test` runs native Effect fixtures for settings, stalled headers/bodies,
invalid responses, child-process faults, cancellation and cleanup. All API
source and test paths receive the canonical strict rules, with execution
admitted only at the two existing app/command entrypoints.

Use the failure simulation when you need deterministic cleanup evidence for a
downstream consumer failure:

```sh
bun run --filter=api smoke:public-routes -- --simulate-downstream-failure
```

The simulation exits nonzero after the external consumer has covered the
public routes, then removes the temp workspace and stops the API process.

Use the portless URL for local API smoke checks:

```sh
curl https://api.taxkit.localhost/api/health
curl https://api.taxkit.localhost/api/v1/calculators
curl -X POST https://api.taxkit.localhost/api/v1/calculators/au.pay.take-home/calculate \
  -H 'content-type: application/json' \
  -d '{"facts":{"grossPay":{"_tag":"GrossPay","amount":{"_tag":"Money","cents":150000,"currency":"AUD"},"period":"weekly"},"taxFreeThresholdClaimed":true}}'
```

## Guardrails

- Do not define API contracts in this app.
- Keep app-owned schemas in `schemas.ts` and derive exported types from those
  schemas. Runtime files should consume canonical schema values and compose
  layers/startup logic, not redefine reusable shapes inline.
- Do not manually wire process signal handlers, `process.exit`, mutable
  shutdown flags or `try/catch` around Effect startup. The process entrypoint
  should be an Effect program run through `BunRuntime.runMain`.
- Do not create a runtime inside request handling.
- Keep process-owned resources in `ApiAppLayer` so root fiber interruption
  releases them through scoped finalizers.
- Keep `apps/web` a client of this app through the generated HTTP client, with no in-process API mount.

## Related Docs

- `docs/architecture/api-and-sdk.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/package-ownership.md`
- `docs/product-specs/extract-api-app.md`


The private `api/worker` app export supplies the native Worker class and instance
composition to `@taxkit/infrastructure/apps-stack`. Its source, compiled runtime
and declaration paths are explicit. The graph owns peer binding and addresses;
the API app owns request handling and checked runtime configuration. This export
does not make a public package or change the existing HTTP/OpenAPI contract.

`@taxkit/api-http/request-boundary` owns the native streamed POST limit
(`@taxkit/api-rpc/request-boundary` re-exports it). `@taxkit/api-rpc/host-telemetry`
owns the same fixed logging/reporting policy used by the Website, and the one
`taxkit.request` record each host writes per request. The API maps its paths to
a closed route family (`health`, `calculate`, `catalogue`, `docs`,
`discovery`, `reference`, `rpc`, `mcp` or `other`); calls through the private
binding are recorded too. The record never reads the URL, headers or either
body. This reuse does not qualify native trace export or every framework
logging path.

The private `api/worker` export also owns `ApiWorkerObservability`, which
disables platform invocation logs, stored logs and traces with zero sampling.
Its default Worker and every non-Production stage of the native apps graph use
it. Production exports console logs only, through the retained
`taxkit-axiom-logs` destination; the
[deployment owner](../../docs/architecture/deployment.md#observability) explains
why invocation logs and traces stay off. Local graph/state checks establish the
declared settings, not uploaded Cloudflare settings or safe stored rows.

The [shared work policy](../../packages/calculators/README.md#shared-calculation-work-limits) gives the API instance one eight-calculation pool
across HTTP and RPC, including individual batch messages, with a five-second
operation budget for all nine methods. Checked capacity and operation-timeout errors become HTTP
503/504 envelopes or canonical RPC revision `4` errors. Website guidance requests
manual retry only. This is separate from the body-read and ten-second client
budgets. Metadata does not use a calculation place. Native built proof covers a
seven-calculation RPC batch plus one HTTP calculation, rejected extra HTTP/SSR/
browser calls, HTTP 504/RPC timeouts and reached cleanup. Synchronous CPU work
cannot be stopped by a JavaScript timer; a late-result check rejects it after
control returns. The native rate policy below is separate.


Scripted typed HTTP requests construct the calculator-owned context/help
Options. Raw public HTTP JSON still uses ordinary optional fields. The
[calculator owner](../../packages/calculators/README.md) describes both forms.


Known requests in work-pool, exact body-limit and defect fixtures encode through
their owning HTTP/RPC Schemas before JSON framing. Bad tag/id tests mutate the
encoded frame, so another request-shape error cannot mask the intended fault.
The original capacity, body size, cleanup and safe-reporter assertions remain.


## Native calculation rate admission

The native API builds `PublicCalculatorServiceRateLimited` once underneath its bounded service. HTTP/RPC and the binding-only `calculatorRequest` operation share the [calculator-owned rate contract](../../packages/calculators/README.md#native-calculation-rate-admission). Public requests need a checked original Cloudflare connection address; forwarded Worker calls and arbitrary forwarded headers cannot select a key. The Website private call supplies its checked key separately from JSON; no HTTP route admits that argument. The closed reply is buffered inside the native event scope, bounded to 2 MiB and ten seconds.

`ApiWorkerNativeInit` supplies the installed native RateLimit Layer to `ApiCalculatorAdmission`, which decodes each provider reply and returns fixed unavailable guidance for provider failures or invalid replies. It requires `CALCULATOR_RATE_NAMESPACE` as a positive decimal string. The operator must select an account-wide unique stage value before a cloud plan/apply; no provider value is invented. The [infrastructure owner](../../packages/infrastructure/README.md#native-calculation-limiter-configuration) owns graph and local-root selection. Hosted mode defaults to `edge`. The guarded local root selects `local-emulator`; a shared local allowance additionally requires an HTTP loopback API origin.

Cloudflare's [rate limiter](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) is approximate and local to a location, not an exact global quota. Real edge identity, namespace uniqueness and uploaded provider settings need separate authorised readback. Direct engine/local SDK and standalone Bun execution keep their existing contracts.


## Native remote calculator tools

The native Worker serves `/mcp` through installed Effect's
`McpServer` and `Toolkit`. It composes modern protocol `2026-07-28` in the
Worker and older protocol `2025-11-25` in an app-owned native Durable Object.
The six tools list calculators, read an input Schema, calculate, read docs
navigation, search docs and read a processed Markdown page. Both adapters use
canonical calculator/content Schemas and the same service implementations as
HTTP/RPC. There is no separate tax engine or saved personal report.

Modern calls carry their protocol/routing headers and per-request metadata.
An older client's first initialise has no version header; subsequent requests
carry its native session ID and `2025-11-25` header. The installed adapter owns
parsing, IDs, version agreement and cancellation matching. The native API selects
the app-owned host; no copied parser or private session Map is added. The plain
in-process composition remains modern-only.

The older host uses one fixed-name object per stage and keeps at most 32
initialisation attempts within a ten-minute host lifetime, plus 32 simultaneous
requests without waiting for a place. These are shared host limits, not limits
per client. The lifetime begins when that host starts; a later conversation has
only its remaining time. Runtime eviction may end it earlier; conversations do
not resume across eviction. The native alarm and an incoming time check close the
whole protocol scope at expiry. All affected clients receive 404 and need a
fresh initialise. Reinitialising an existing conversation is already refused
by the installed HTTP adapter and cannot bypass the allocation limit. Client
metadata stays in memory; only native alarm bookkeeping uses storage. GET/DELETE
streams, subscriptions, termination and resumption are not advertised.

The host captures the existing calculator/content services without its first
caller's request, rate identity or stop signal. Its calculation pool belongs to
that native application instance. It is not a global pool shared with the outer
Worker's separate isolate. Both use the same native anonymous rate binding and
five-second operation budget. The API replaces any caller-supplied private key
header with its current checked original key before the private object call;
that capability stays outside request JSON and is never logged. Actual local
HTTP/modern/older calls exhaust one allowance even with a forged private header.
Cloud location/approximation limits still apply.

The existing 64 KiB streamed POST limit applies before delegation. Complete
native JSON/SSE replies are read within ten seconds and 2 MiB. Only the
publication origin is accepted; other supplied Origins fail, while origin-less
clients work.
Only `/mcp` permits protocol/routing/session headers in CORS. Expected failures
have fixed codes and manual-retry guidance; native internal failures use the
existing safe reply and fixed reporter.

Cancellation has two separately tested boundaries. An older conversation's
native cancellation notification immediately stops its actual network call,
releases a calculation place and admits a replacement. Another conversation's
notification cannot cancel it. Modern in-process AbortSignal cancellation also
works. On the pinned real Worker, an outgoing modern TCP abort stops the caller
but pre-response calculation work remains until its five-second budget. The
native modern HTTP adapter has no conversation binding for that notification.
No flag-only workaround is accepted. The current contract preserves this
five-second bound and does not promise prompt modern remote cleanup.

The [agent connection guide](../../packages/docs-content/content/api/agent-tools.mdx)
documents both versions, all six remote tools, anonymous limits, exact browser
Origin admission, older expiry and the modern five-second cancellation limit.
The Website's `/agents` page derives its MCP address from the checked API
settings, including in Preview. `bun run test:native` runs the official clients
against the locally built pair; check the deployed API directly before claiming
a stage serves them. Neither proves prompt modern pre-response cleanup.
History: [7 October agent setup record](../../docs/documentation-audit/clean-slate-foundation/2026-10-07-agent-setup-and-cancellation-bounds.json).

`@modelcontextprotocol/client` 2.3.1 is test-only. The full native-pair command
runs actual official clients over loopback TCP against the source-built API.
Reports and published processed Markdown equal HTTP, two conversations remain
distinct, admission is bounded and stale IDs fail. A scoped source fixture
shortens only the actual host lifetime to 1.5 seconds: its real platform alarm
must release 32 held metadata calls without another HTTP request, then a fresh
client must initialise and list tools. After real calculations, docs reads and
32 conversations, local SQL inspection observes only native bookkeeping and the
emulator's name table, with no application or key-value table.

The native source builder discovers the SDK-generated class export inventory
by memory-only compilation of the actual API declaration. All provider,
credential and network methods refuse; it runs no provider plan/apply. Local
fixtures bind the genuine generated class in disposable namespaces. Merely
adding an emulator binding is insufficient and previously returned 503.
The [browser caller owner](../web/README.md#browser-tools) covers browser
tools. Source-built setup, actual browser callers and deployed ordinary remote
calls do not establish prompt modern cleanup or an autonomous model session.
History: [7 October session record](../../docs/documentation-audit/clean-slate-foundation/2026-10-07-native-mcp-sessions.json)
and [earlier modern record](../../docs/documentation-audit/clean-slate-foundation/2026-10-07-native-mcp.json).
