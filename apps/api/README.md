---
document_type: app-readme
lifecycle: current
authority: canonical
owner: taxkit-api-app-owner
last_reviewed: 2026-10-07
review_trigger: API app settings, startup, smoke command or shutdown change
---

# API App

API application with the retained standalone Bun process and a native Alchemy
Worker candidate for the active DEV-74 work.

## Scope

`apps/api` owns process config, Bun server startup, request dispatch to
`@taxkit/api-http/server` and graceful shutdown. API contracts, handlers,
schemas, generated OpenAPI and docs routes stay in `packages/api/http`.

Both API hosts provide `ContentService` from the accepted generated catalogue.
`src/content.boundary.ts` imports only `@taxkit/docs-content/public-catalogue`
JSON, checks it once when the host is built and reports a fixed configuration
failure if it is invalid. Incoming requests do not load authored MDX or run
the compiler. Public HTTP and native RPC documentation operations serve
navigation, checked page values, bounded search and exact processed Markdown
from that same service. Documentation calls consume no calculator allowance.
See the [HTTP package](../../packages/api/http/README.md) for paths/response rules
and the [RPC owner](../../packages/api/rpc/README.md#documentation-connection)
for the separate documentation revision and client.

The native instance also builds `ContentDiscovery` from that same checked
catalogue. It receives the already cached, checked API/Website settings as a
lazy Effect, so deferred native addresses are resolved on incoming use. The
revision-two native discovery call returns one of four bounded documents with
its matching media type; internal projection/configuration failures become
fixed unavailable guidance. The Website serves them at their ordinary file
addresses. Existing public HTTP routes and the standalone Bun host retain
their content contract. Discovery takes no calculator allowance.

The API dependency build generates the accepted catalogue before TypeScript
or native bundling consumes it. Its ESNext module profile preserves the JSON
import attribute for ordinary Node loading of emitted modules. The Website,
infrastructure and Alchemy source-checking profiles also admit that attribute
when they inspect the API Worker source. Compiled public packages retain their
existing module profiles.

The retained standalone smoke check reads page JSON, navigation, search and
Markdown through the real HTTP process. It checks their common page address,
title and processed body within one five-second operation deadline, in addition
to the existing calculator and OpenAPI checks.

## Native Worker candidate

`src/worker.ts` declares native `TaxKitApiWorker` with the standard Alchemy
class and `.make` entry. `src/worker.application.ts` constructs one router and
shared `PublicCalculatorService` in the native instance scope. HTTP and
POST `/rpc` delegate to the same calculator service. Its named RPC operations
match all nine existing calculator-service calls using the canonical request/result contracts. Native requests keep their own
fibre and cleanup scope; the app constructs no backend ManagedRuntime.

The Worker checks `API_PUBLIC_ORIGIN` and `WEBSITE_PUBLIC_ORIGIN` with the
canonical RPC origin policy. Its own origin comes from native `Worker.URL`;
the apps stack supplies the matching website resource Output.
Absent or invalid settings return a fixed native Config error without the
rejected value. CORS allows the checked website origin and `content-type`,
with credentials disabled. Other origins receive no allow-origin header.
Planning leaves those resource addresses deferred. On first incoming use, the
app decodes and caches the bound runtime values; missing or invalid values
produce an empty 503 response, without a guessed address.

Every native POST body is limited to 64 KiB before JSON parsing, with a total
five-second read deadline. The native stream stops at the limit and its reader
is closed on rejection, timeout or cancellation. Oversized requests return an
checked JSON 413 guidance; stalled bodies return checked JSON 408 guidance. CORS applies to those responses.

The app's native logger and error reporter emit only a fixed event name, time
and severity. Arbitrary messages, Causes, annotations and span labels are
discarded before console output. This is bounded containment; T009 still owns
safe native tracing and exporter qualification.

The apps infrastructure root now declares the native API and Website candidate
and their matching resource bindings. Local plans and transport tests do not
prove deployment. DEV-74's local acceptance review owns the complete connection
qualification; T009 retains safe exported tracing. The Bun commands and public contract
stay available during this work.

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
- Keep `apps/web` as a native RPC client of this app, with no in-process API mount.

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

The shared `@taxkit/api-rpc/request-boundary` now owns the native streamed POST
limit; the app keeps its compatibility alias. `@taxkit/api-rpc/host-telemetry`
owns the same fixed logging/reporting policy used by the Website. Existing API
proof remains applicable through its focused regression tests; this reuse does
not qualify native trace export or every framework logging path.

The Website's native cancellation fixture uses the real API calculation and
reply encoder before delaying headers or the remainder of the encoded body.
This qualifies the client's complete ten-second wait and browser request abort,
not cancellation of upstream Worker work. The [Website README](../web/README.md)
owns its local commands and [dated receipt](../../docs/documentation-audit/clean-slate-foundation/2026-10-05-native-cancellation.json)
records the bounded observations.

The private `api/worker` export also owns `ApiWorkerObservability`. Both its
default Worker and the native apps graph explicitly disable platform invocation
logs, stored logs and traces, with zero sampling. Those automatic records can
contain caller URLs even when the application reporter emits only fixed fields.
Local graph/state checks establish the declared settings; they do not establish
uploaded Cloudflare settings or safe exported rows. T009 owns that remaining
requirement. The fixed application reporter remains in use.

The [shared work policy](../../packages/calculators/README.md#shared-calculation-work-limits) gives the API instance one eight-calculation pool
across HTTP and RPC, including individual batch messages, with a five-second
operation budget for all nine methods. Checked capacity and operation-timeout errors become HTTP
503/504 envelopes or canonical RPC revision `4` errors. Website guidance requests
manual retry only. This is separate from the body-read and ten-second client
budgets. Metadata does not use a calculation place. Native built proof covers a
seven-calculation RPC batch plus one HTTP calculation, rejected extra HTTP/SSR/
browser calls, HTTP 504/RPC timeouts and reached cleanup. Synchronous CPU work
cannot be stopped by a JavaScript timer; a late-result check rejects it after
control returns. The native rate policy below is implemented separately; MCP and whole T004
qualification remain unfinished.


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


## Native remote calculator tools candidate

The native Worker candidate serves `/mcp` through installed Effect's
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
native JSON/SSE replies are read within ten seconds and 2 MiB. The exact Website
Origin is accepted; other supplied Origins fail, while origin-less clients work.
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
No flag-only workaround is accepted, and prompt modern remote cleanup is still
a T006 gap.

`@modelcontextprotocol/client` 2.3.1 is test-only. The full native-pair command
runs actual official clients over loopback TCP against the source-built API.
Reports and accepted processed Markdown equal HTTP, two conversations remain
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
See the [session candidate record](../../docs/documentation-audit/clean-slate-foundation/2026-10-07-native-mcp-sessions.json),
[earlier modern record](../../docs/documentation-audit/clean-slate-foundation/2026-10-07-native-mcp.json)
and [browser caller owner](../web/README.md#visible-calculator-browser-tools).
Public setup and prompt modern remote cancellation remain T006 work. This
candidate establishes no deployment, hosted support or public availability.
