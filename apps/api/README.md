---
document_type: app-readme
lifecycle: current
authority: canonical
owner: taxkit-api-app-owner
last_reviewed: 2026-10-05
review_trigger: API app settings, startup, smoke command or shutdown change
---

# API App

API application with the retained standalone Bun process and a native Alchemy
Worker candidate for the active DEV-74 work.

## Scope

`apps/api` owns process config, Bun server startup, request dispatch to
`@taxkit/api-http/server` and graceful shutdown. API contracts, handlers,
schemas, generated OpenAPI and docs routes stay in `packages/api/http`.

## Native Worker candidate

`src/worker.ts` declares native `TaxKitApiWorker` with the standard Alchemy
class and `.make` entry. `src/worker.application.ts` constructs one router and
shared `PublicCalculatorService` in the native instance scope. HTTP and
POST `/rpc` delegate to that same operation. Native requests keep their own
fibre and cleanup scope; the app constructs no backend ManagedRuntime.

The Worker checks `API_PUBLIC_ORIGIN` and `WEBSITE_PUBLIC_ORIGIN` with the
canonical RPC origin policy. Its own origin comes from native `Worker.URL`;
the future stack composition must supply the matching website resource Output.
Absent or invalid settings return a fixed native Config error without the
rejected value. CORS allows the checked website origin and `content-type`,
with credentials disabled. Other origins receive no allow-origin header.
Planning leaves those resource addresses deferred. On first incoming use, the
app decodes and caches the bound runtime values; missing or invalid values
produce an empty 503 response, without a guessed address.

Every POST body is limited to one MiB before JSON parsing, with a total
five-second read deadline. The native stream stops at the limit and its reader
is closed on rejection, timeout or cancellation. Oversized requests return an
empty 413; stalled bodies return an empty 408. CORS applies to those responses.

The app's native logger and error reporter emit only a fixed event name, time
and severity. Arbitrary messages, Causes, annotations and span labels are
discarded before console output. This is bounded containment; full safe native
tracing and exporter qualification remains required by the active plan.

The Worker is not yet wired into the infrastructure root. Local construction
and transport tests do not prove a deployment or completion of DEV-74. The Bun
commands and public contract stay available during this work.

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

For local UI development, run the API and web app in separate terminals:

```sh
bun run --filter=api dev
bun run --filter=web dev
```

`bun run --filter=api dev` serves this app through portless at
`https://api.taxkit.localhost`. `bun run --filter=web dev` injects that URL
into `TAXKIT_API_BASE_URL` for SSR and `VITE_TAXKIT_API_BASE_URL` for browser
navigation.

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
- Keep `apps/web` as an HTTP client of this app, not an in-process API mount.

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
