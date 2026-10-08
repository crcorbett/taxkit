---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-http-api-owner
last_reviewed: 2026-10-07
review_trigger: HTTP schemas, exports, routes, handlers or client composition change
---

# HTTP API

Effect HTTP API package for the current TaxKit health endpoint, public
calculation endpoints, generated docs and API server route wiring.

## Scope

`@taxkit/api-http` owns the current HTTP API contract, generated OpenAPI
metadata, health and public calculation routes, HTTP status envelopes, thin
handler adapters and typed client helpers used by TaxKit apps. Reusable
calculator schemas, catalog entries, metadata projections, graph construction,
calculation dispatch and schema-guided expected error shaping live in
`@taxkit/calculators`.

The root export includes `HealthResponse`, the same Schema used by the health
endpoint. The API app's smoke check uses this owner to validate the real health
response without copying its shape. This addition preserves the health wire
format and all existing routes.

The implemented API surface is:

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
- `GET /api/v1/docs/navigation`
- `GET /api/v1/docs/page?path=/start/quickstart`
- `GET /api/v1/docs/search?term=Quickstart`
- `GET /api/v1/docs/markdown?path=/start/quickstart`

The public calculation API routes use the reusable calculator catalogue,
fact and rule descriptors and graph diagnostics from `@taxkit/calculators`.
Every handler, including Calculate, calls `PublicCalculatorService` directly.
The HTTP Calculate route supplies its checked route ID, body and query to the
same named `calculate` operation used by native RPC. Expected service failures
keep the existing HTTP envelope. The status declarations below describe the
additional request and operation protections.
The SDK is a test-only comparison dependency, rather than a server dependency.

`@taxkit/api-http/server` exports `TaxKitApiRoutesLayer` for application-owned
service and CORS composition. It also retains `TaxKitServerLayer` with the
existing calculator engine and CORS defaults for Bun and in-process consumers.
Both server Layers require the caller's `ContentService`. API hosts supply the
accepted build output; the HTTP package imports only the compiled content
contracts. The native API host supplies its shared calculator service to HTTP
and RPC.

The `content` group delegates navigation, page lookup and search to that same
content service. Markdown returns the owning processed page body as
`text/markdown`. Page queries use checked, bounded public addresses; search
terms have the owning 100-character limit. Missing pages return fixed typed
JSON 404 guidance and a search-source failure returns fixed typed JSON 503
guidance, without reflecting paths or source-error messages. Native invalid
query responses are empty 400 replies. This surface returns accepted public
documentation only, not personal calculation reports.

`TaxKitApiInProcessClientLive` also requires supplied content. It now uses the
native Effect HTTP client and router in the caller's Layer scope; each request
closes its own scope. It creates no web-handler runner or Promise bridge.
Its generated client checks the same response Schemas as remote consumers.

```ts
HTTP calculate

API host
  -> TaxKitApiRoutesLayer
    -> CalculatorApiHandlerLive
      -> PublicCalculatorService.calculate({ calculatorId, payload, ...query })
        -> selected calculator input decode and CalculationEngine
        -> CalculatorRunResponseData
      -> existing CalculatorApiErrorEnvelope on expected failure
```

```ts
Tests: in-process HTTP client

HTTP API tests
  -> TaxKitApiInProcessClientLive
    -> CalculatorApiHandlerLive
      -> PublicCalculatorServiceLive
        -> CalculationEngineLive
  -> success response equals SDK full-run response
  -> CalculatorInputDecodeError maps to CalculatorApiErrorEnvelope
```

The calculate route imports reusable `CalculatorRun*` schemas and
`CalculatorServiceError` from `@taxkit/calculators`. `CalculatorRunRequest`
has a `facts` field that is a union of canonical rule-owned input schemas, so
generated OpenAPI exposes concrete supported fact shapes under `facts.anyOf`
instead of `Schema.Unknown`. HTTP-only names such as
`CalculatorApiErrorEnvelope` stay in this package because they describe
calculator API transport status encoding. HTTP
handlers must not try to select or transform calculator facts locally;
`PublicCalculatorService` performs the selected-calculator `inputSchema` decode
and returns `CalculatorInputDecodeError` with descriptor-backed help for
incompatible calculator/facts combinations.

## Main Areas

- `src/api.ts`: `TaxKitApi` definition and OpenAPI annotations.
- `src/groups/health.ts`: health endpoint schema and route group.
- `src/groups/calculators.ts`: public calculation HTTP route schemas, bad
  request envelope, OpenAPI annotations and compatibility exports from
  `@taxkit/calculators`.
- `src/openapi.ts`: package-owned OpenAPI generation, structured
  normalization and snapshot formatting for compatibility checks.
- `src/handlers/`: server-side thin handler adapters and handler layers.
- `src/server/live.layer.ts`: server route layer, CORS middleware, Scalar docs
  route, OpenAPI JSON route using the package-owned OpenAPI source and
  calculator service layer composition.
- `src/server.ts`: server export boundary for `TaxKitServerLayer`.
- `src/config.ts`: package-owned client config schema and neutral `httpApi`
  config source.
- `src/client/`: typed Effect HTTP API client helpers and layers.

Export paths:

- `@taxkit/api-http`
- `@taxkit/api-http/api`
- `@taxkit/api-http/client`
- `@taxkit/api-http/client/live`
- `@taxkit/api-http/client/server`
- `@taxkit/api-http/config`
- `@taxkit/api-http/request-boundary`
- `@taxkit/api-http/server`
- `@taxkit/api-http/handlers`
- `@taxkit/api-http/handlers/live`

Reusable calculator exports:

- `@taxkit/calculators`
- `@taxkit/calculators/catalog`
- `@taxkit/calculators/errors`
- `@taxkit/calculators/live`
- `@taxkit/calculators/metadata`
- `@taxkit/calculators/service`
- `@taxkit/calculators/schemas`

## Runtime Shape

The package is built as ESM TypeScript. Runtime exports are split by boundary:

- browser-safe consumers should use `@taxkit/api-http/client`
- server runtimes may use `@taxkit/api-http/server`
- app or test code that needs in-process wiring can use the client layers
- handler exports are server-side and should not be imported from browser code

`ApiRoutesLive` owns reusable route middleware such as CORS inside this package.
App packages should provide a platform HTTP server and process config, not
duplicate API route middleware.

`@taxkit/api-http/config` owns the reusable client config schema, type and
keyed config fragment. Apps should compose that fragment into runtime-specific
config modules, then provide server or client environment values through Effect
`ConfigProvider` composition. The package owns its env namespaces, including
`TAXKIT_API_*` and `VITE_TAXKIT_API_*`. See
`docs/architecture/configuration.md`.

Current responses are schema-backed with Effect Schema. Calculator response
schemas are imported from `@taxkit/calculators`; route-only HTTP envelopes and
status annotations stay in this package. The health response is:

```ts
{
  status: "ok";
  service: "taxkit";
}
```

## Commands

From the package root:

```sh
bun run build
bun run check-types
bun run clean
bun run test
bun run test:openapi
bun run update-openapi-snapshot
```

From the repo root:

```sh
bun run --filter=@taxkit/api-http build
bun run --filter=@taxkit/api-http check-types
bun run --filter=@taxkit/api-http test
bun run --filter=@taxkit/api-http test:openapi
bun run --filter=@taxkit/api-http update-openapi-snapshot
bun run --filter=api smoke:public-routes
```

## OpenAPI Compatibility

`src/openapi.ts` is the single source for generated OpenAPI. The live
`/api/docs/openapi.json` route and the compatibility test both import that
module, so a route, method, status envelope or schema-reference change flows
through the same `OpenApi.fromApi(TaxKitApi)` call graph.

Effect `4.0.0` retains encoded component names with an `Encoded`
suffix and nests the supported tax-year union one level deeper. The committed snapshot is unchanged by the stable-v4 migration. The route paths, methods, status codes
and JSON field names remain the same; the API smoke and route tests check
their runtime behaviour.

The committed normalized snapshot lives at:

```txt
packages/api/http/__snapshots__/openapi.json
```

Use the focused check before and after API contract work:

```sh
bun run --filter=@taxkit/api-http test:openapi
```

For an intentional OpenAPI contract change:

1. Update the owning API group schema, route annotation or handler boundary.
2. Refresh the normalized snapshot:

   ```sh
   bun run --filter=@taxkit/api-http update-openapi-snapshot
   ```

3. Review the snapshot diff for route paths, methods, status responses,
   schema references and generated calculator fact shapes.
4. Run the package gates:

   ```sh
   bun run --filter=@taxkit/api-http test
   bun run --filter=@taxkit/api-http check-types
   bun run --filter=@taxkit/api-http build
   ```

5. Add a Changeset when the OpenAPI change reflects package-facing API
   behaviour or documented package usage. Internal test-only snapshot refreshes
   can record an explicit no-Changeset rationale instead.

## Route fixtures and live smoke

The package test suite owns route contract fixtures for the current public
surface. `__tests__/public-calculation-api.test.ts` covers:

- `GET /api/health`
- `GET /api/v1/calculators`
- successful `POST /api/v1/calculators/au.pay.take-home/calculate`
- schema-guided calculator input errors through `CalculatorApiErrorEnvelope`

The calculate success fixture compares the HTTP response with
`@taxkit/sdk/effect` `calculateRunRequest`. The typed client decodes the transport
response once. These fixtures check the
already decoded response and error against the owning Schema Type, including
trace and question Options, rather than applying wire decoding a second time.
The input-error fixture checks that the underlying `CalculatorServiceError`
matches the SDK and calculator service failures, then encodes the canonical
envelope to check that rejected input and private paths are absent.

`apps/api` owns the live process smoke:

```sh
bun run --filter=api smoke:public-routes
```

Use it after package fixture changes when you need proof that the standalone
API app serves the same contract through Bun. Do not move process startup,
host/port config or child-process cleanup into this package.

## Intentional contract changes

For an intentional public API contract change:

1. Update the owning schema, API group annotation, handler boundary or
   calculator-owned contract.
2. Refresh the OpenAPI snapshot when generated route, status or schema
   references change:

   ```sh
   bun run --filter=@taxkit/api-http update-openapi-snapshot
   ```

3. Update route fixture assertions for the changed health, metadata,
   calculate or error-envelope behaviour.
4. Update package or app READMEs when commands, routes or public workflow
   expectations change.
5. Run the compatibility gates:

   ```sh
   bun run --filter=@taxkit/api-http test
   bun run --filter=@taxkit/api-http check-types
   bun run --filter=@taxkit/api-http build
   bun run --filter=api smoke:public-routes
   ```

6. Add a Changeset when package-facing API behaviour, exported package usage
   or documented package promises change. Record a no-Changeset rationale for
   internal fixtures, snapshots or app-owned smoke tooling that do not affect
   package consumers.

## Packaging

The TypeScript build removes `dist` before compiling. Workspace exports retain
`source` conditions, while `publishConfig.exports` and `files` define the
dist-only package surface. The SDK-owned strict downstream gate installs the
actual API tarball and imports all JavaScript public entrypoints.

## Guardrails

- Keep browser consumers on client exports; do not import server handlers into
  browser code.
- Keep endpoint request and response shapes schema-owned; route-only HTTP
  envelopes stay here and reusable `CalculatorRun*` payload schemas live in
  `@taxkit/calculators`.
- Keep calculate facts imported from `@taxkit/calculators` so OpenAPI and
  typed clients reflect canonical rule-owned fact shapes.
- Keep calculation execution delegated through `@taxkit/sdk/effect`
  `calculateRunRequest`, which uses `PublicCalculatorService` for the
  catalog-driven, scenario-schema decoded and `CalculationEngine` based run.
- Keep metadata responses derived from canonical fact descriptors, rule
  descriptors, source refs, parameter periods and graph diagnostics from the
  owning engine and rule packages.
- Keep handlers thin. They may extract route input and translate tagged
  service errors to HTTP status envelopes; reusable calculator lookup,
  metadata transformation, graph assembly, calculation dispatch and expected
  error shaping stay in `@taxkit/calculators`.
- Add OpenAPI annotations with new API groups so docs stay generated from the
  contract.
- Add tests or focused verification when new endpoints, handlers or client
  layers are added.

## Related Docs

- `docs/architecture/api-and-sdk.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/testing-and-quality.md`
- `docs/product-specs/documentation-improvement-roadmap.md`

## Contract verification boundaries

The OpenAPI snapshot test uses Effect FileSystem and the owning JSON Schema
codec; the committed normalized snapshot remains the wire-contract oracle.
The secret-negative HTTP test encodes its error with CalculatorApiErrorEnvelope.
Both test files are checked by `tsconfig.test.json` in `check-types`, including
canonical branded identities and explicit Match narrowing of report/error unions.

The in-process Fetch adapter retains its required Promise return signature in
one exact lint admission. It contains no async orchestration or Effect runner.
Real CLI fixtures prove adjacent files reject the signature and the admitted
file still rejects async/await. This preserves the current host bridge pending
the separate native app composition task; it is not native Worker lifetime proof.

The [shared work policy](../../../packages/calculators/README.md#shared-calculation-work-limits) gives the API instance one eight-calculation pool
across HTTP and RPC, including individual batch messages, with a five-second
operation budget for all nine service methods. Checked capacity and operation-timeout errors become HTTP
503/504 envelopes or canonical RPC errors. Website guidance requests
manual retry only. This is separate from the body-read and ten-second client
budgets. Metadata does not use a calculation place. Native built proof covers a
seven-calculation RPC batch plus one HTTP calculation, rejected extra HTTP/SSR/
browser calls, HTTP 504/RPC timeouts and reached cleanup. Synchronous CPU work
cannot be stopped by a JavaScript timer; a late-result check rejects it after
control returns. The native rate policy below is implemented separately; MCP and whole T004
qualification remain unfinished.


## Shared request admission

`@taxkit/api-http/request-boundary` owns the streamed 64 KiB POST body limit and
five-second total read deadline. It counts encoded bytes before parsing, closes
rejected/interrupted readers and rejects late synchronous reads after control
returns. The retained standalone server applies it before calculator decoding;
native API and Website hosts use the same owner. The RPC entrypoint re-exports
its original four symbols for compatibility. Only the native API host's outer
composition covers both HTTP and RPC; a custom route host must supply its own
admission middleware.

Fixed Schema-owned request errors use HTTP 413 (`request-too-large`, reduce the
request) and 408 (`request-timeout`, retry manually). JSON responses use the
`error` envelope. Website form hosts select the checked HTML policy, producing a
fixed message and link back to the calculators without reflecting input or URLs.
The calculation endpoint declares both statuses in OpenAPI. Every metadata
endpoint declares 504 for the shared operation timeout; lookup failures retain
400. Metadata never consumes a calculation place. No automatic retry is added.


Calculator-owned context, help and filter fields use `Option<Option<A>>` in
checked TypeScript values: `None` means a missing key, `Some(None)` means a
present undefined key, and `Some(Some(value))` means a present value. Owning
constructors default omitted keys to `None`. JSON and HTTP query fields retain
their ordinary optional representation. Flatten the two absent forms only where
they mean the same thing; do not invent a jurisdiction or tax year.

Typed client calls use canonical constructor values. Raw HTTP JSON and query
strings still encode and decode through the owning request codecs; the OpenAPI
snapshot remains the representation contract.


The reusable Core calculation error now has a nested Option cause in checked
TypeScript values. Its existing HTTP representation is retained, including
missing/undefined/null diagnostic forms. This is an absence-owner change, not
a diagnostic sanitiser; do not export legacy diagnostic values to telemetry.


## Native calculation rate admission

The [calculator-owned rate contract](../../calculators/README.md#native-calculation-rate-admission) adds canonical rate/unavailable errors to calculation responses. The native API maps them to HTTP 429 with `Retry-After: 60` and fixed 503 guidance, using the existing error envelope. Metadata consumes no rate unit. Owning group Schemas drive generated clients and the OpenAPI snapshot; the standalone Bun host keeps its existing policy.

The public page-address refinement and fixed documentation errors now belong
to `@taxkit/content`, shared with native documentation RPC. This package retains
its existing error exports and HTTP status/media rules. Generated OpenAPI names
the same canonical address bound for both the request and returned page.
