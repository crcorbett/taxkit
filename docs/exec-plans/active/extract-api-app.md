---
status: active
last_reviewed: 2026-05-23
source_of_truth: exec-plan
confidence: medium
---

# Extract API App Execution Plan

## Spec

- [Extract API app](../../product-specs/extract-api-app.md)
- [Task list](../../product-specs/extract-api-app.tasks.json)

## Execution Rules

- Implement tasks sequentially.
- Delegate one task at a time to a subagent.
- Parent agent reviews the diff, runs `bun run verification`, runs
  task-specific smoke checks, and accepts the task before delegating the next.
- Commit each accepted task when its `commitAfterPassing` flag is true.

## Progress

| Task | Status | Notes |
| --- | --- | --- |
| API-001 | complete | Added standalone Bun API app with an Effect `BunRuntime.runMain` entrypoint, Bun server layer and scoped shutdown. |
| API-002 | complete | Rewired web server and browser runtimes to the standalone API over HTTP. |
| API-003 | complete | Removed TanStack-mounted API route and in-process web API handler context. |
| API-004 | complete | Updated repo docs for the standalone API boundary and completed final verification. |

## Validation Log

- 2026-05-23 API-001:
  - `bun run --filter=api check-types` passed.
  - `bun run --filter=api build` passed.
  - `bun run verification` passed, including Oxlint, Oxfmt check, Knip and
    Turbo typecheck.
  - Ran `API_PORT=4012 bun run --filter=api start`; `GET /api/health`
    returned `200 {"service":"whattax","status":"ok"}`.
  - Ran `GET /api/docs/openapi.json`; response parsed as OpenAPI `3.1.0`
    with title `WhatTax API` and `/api/health` present.
  - Ran `API_PORT=4013 bun apps/api/src/index.ts`, sent `SIGTERM` to the Bun
    entrypoint process, and observed graceful shutdown with exit code `0`.
  - Audited `apps/api/src/server.ts` and `apps/api/src/index.ts`: the app runs
    one Effect entrypoint with `BunRuntime.runMain` and creates no runtime
    inside request handling.
- 2026-05-23 API-002:
  - `bun x tsc --help` confirmed TypeScript `5.9.3` supports concrete
    `ES2024` and `ESNext` targets, not `ES2025`; set the repo target and
    package libs to `ES2024`.
  - `bun run --filter=web check-types` passed.
  - `bun run verification` passed, including Oxlint, Oxfmt check, Knip and
    Turbo typecheck.
  - Ran `bun run --filter=api dev` on `https://api.whattax.localhost` and
    `bun run --filter=web dev` on `https://whattax.localhost`.
  - `GET https://api.whattax.localhost/api/health` returned
    `200 {"service":"whattax","status":"ok"}`.
  - `GET https://whattax.localhost/` returned `200` and contained
    `API status: <strong>ok</strong>`.
  - With `apps/api` stopped and `apps/web` still running,
    `GET https://whattax.localhost/` returned `500` containing an attributable
    API transport error.
  - Import audit: `apps/web` has no
    `@whattax/http-api/client/server` imports. The only
    `@whattax/http-api/server` source import remains in
    `apps/web/src/lib/server/api-handler.server.ts`, intentionally pending
    API-003 removal.
- 2026-05-23 API-003:
  - `bun run --filter=web check-types` passed.
  - `bun run --filter=web build` passed. Build emitted a Rolldown
    `INVALID_ANNOTATION` warning from Effect's published
    `unstable/http/HttpRouter.js`, but exited `0`.
  - `bun run verification` passed, including Oxlint, Oxfmt check, Knip and
    Turbo typecheck.
  - Ran `bun run --filter=api dev` on `https://api.whattax.localhost` and
    `bun run --filter=web dev` on `https://whattax.localhost`.
  - `GET https://api.whattax.localhost/api/health` returned
    `200 {"service":"whattax","status":"ok"}`.
  - `GET https://whattax.localhost/` returned `200` and contained
    `API status: <strong>ok</strong>`.
  - `GET https://whattax.localhost/api/health` returned a web `404` HTML page,
    confirming `apps/web` no longer serves the API route.
  - Import audit: `apps/web/src` has no remaining
    `@whattax/http-api/server`, `@whattax/http-api/client/server`,
    `handleApiRequest`, `api-handler` or `serverContext` matches.
- 2026-05-23 API-004:
  - Updated root, app and architecture docs so `apps/api` is the API runtime
    owner and `apps/web` is only an HTTP client of that API.
  - `bun run verification` passed, including Oxlint, Oxfmt check, Knip and
    Turbo typecheck.
  - Ran `bun run --filter=api dev` on `https://api.whattax.localhost`.
  - Ran `bun run --filter=web dev` on `https://whattax.localhost`, with the
    web dev script injecting `portless get api.whattax` into both API base URL
    environment variables.
  - `GET https://api.whattax.localhost/api/health` returned
    `200 {"service":"whattax","status":"ok"}`.
  - `GET https://whattax.localhost/` returned `200` and contained
    `API status: <strong>ok</strong>`.
  - Browser verification used headless system Chrome against
    `https://whattax.localhost/`; the rendered DOM contained
    `API status: <strong>ok</strong>`.
  - Audited root atlas and app/package README links/path references; checked
    107 references and found no missing files.
  - DeepWiki review against `Effect-TS/effect-smol` confirmed the custom Bun
    `HttpServer.make` plus `HttpEffect.toWebHandler` adapter is valid, and
    that reusable middleware such as CORS should live with the reusable
    `http-api` route layer.
  - Moved `ApiRoutesLive` and CORS middleware to
    `packages/http-api/src/server/live.layer.ts`; kept `apps/api` focused on
    Bun server resources, process config and runtime lifecycle.
  - Replaced manual `process.env` parsing in `apps/api/src/config.ts` with
    Effect `ConfigProvider` loading and Effect Schema validation.
  - Disabled Oxlint `func-names` and `func-name-matching` so anonymous
    `Effect.gen(function* () { ... })` callbacks are allowed.
  - Re-ran `bun run verification`; Oxlint, Oxfmt check, Knip and Turbo
    typecheck all passed after the ownership and config refactor.
  - Re-ran smoke checks with `bun run --filter=api dev` and
    `bun run --filter=web dev` through portless.
  - `GET https://api.whattax.localhost/api/health` returned
    `200 {"service":"whattax","status":"ok"}`.
  - `GET https://api.whattax.localhost/api/docs/openapi.json` parsed as OpenAPI
    `3.1.0` with title `WhatTax API` and `/api/health` present.
  - `GET https://whattax.localhost/` returned `200` and contained
    `API status: <strong>ok</strong>`.
  - `GET https://whattax.localhost/api/health` returned a web `404` HTML page,
    confirming `apps/web` still does not serve the API route.
