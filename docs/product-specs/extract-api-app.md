---
document_type: product-spec
lifecycle: implemented
authority: supporting
owner: taxkit-product-owner
last_reviewed: 2026-07-20
review_trigger: historical intent, task evidence, or successor correction
successor: null
tombstone: false
---

# Extract API app

## Overview

Move the TaxKit HTTP API out of the TanStack Start web app and into a
separate Bun server app at `apps/api`. The web app should become a browser/UI
consumer of the API instead of also mounting the API transport.

The first extraction should keep the existing Effect HTTP API package in
`packages/http-api` and introduce the smallest app boundary needed to run it as
a standalone service. Longer-term package naming or placement changes should
follow [API and SDK](../architecture/api-and-sdk.md) and
[Package ownership](../architecture/package-ownership.md).

## Implementation status

Implemented on 2026-05-23:

- `apps/api` is the standalone Bun API runtime.
- `apps/web` calls the API over HTTP for SSR and browser navigation.
- The TanStack-mounted `/api/$` route and in-process API handler were removed.
- Final verification evidence is tracked in
  [the completed execution plan](../exec-plans/completed/extract-api-app.md).

## Problem

Before this extraction, `apps/web` proved the browser/server runtime split by
mounting the Effect API inside the TanStack Start server. That is useful for
the scaffold, but it conflates the public web surface with the reusable API
runtime.

This makes it harder to deploy, scale, test and document the API as its own
open-source integration surface. It also leaves `apps/web` with server-only API
handler wiring that should belong to a dedicated API app.

## Goals

- Add a standalone Bun API app under `apps/api`.
- Keep API behaviour owned by `packages/http-api`.
- Run the API server through the existing Effect HTTP `TaxKitServerLayer`.
- Run the Bun API entrypoint as an Effect program through
  `@effect/platform-bun/BunRuntime.runMain` so signals, exit codes and root
  fiber interruption are owned by Effect.
- Keep `apps/api` thin: process config, server startup, request handling and
  shutdown only.
- Rewire `apps/web` to call the standalone API over HTTP through browser-safe
  client exports.
- Remove app-side API mounting from the TanStack Start machine route once the
  standalone API is the canonical runtime.
- Preserve `/api/docs` and `/api/docs/openapi.json` on the API service.
- Keep `bun run verification` passing at the repo level.

## Non-goals

- Rename `packages/http-api` to `packages/api/http` in this extraction.
- Implement calculation endpoints beyond the current API surface.
- Build the TypeScript SDK package.
- Add production hosting infrastructure beyond local scripts and documented
  deployment expectations.
- Keep an in-process TanStack Start fallback after the API app is canonical.

## Ownership and boundaries

- `apps/api` owns Bun process startup, listening port, host binding, request
  dispatch to the Effect HTTP handler and graceful shutdown.
- `packages/http-api` owns HTTP API definitions, handlers, schemas, OpenAPI and
  server layers.
- `apps/web` owns React routes and frontend runtime selection only. It should
  consume `@taxkit/http-api/client` and `@taxkit/http-api/client/live`, not
  `@taxkit/http-api/server` or `@taxkit/http-api/client/server`.
- Runtime config belongs at the app boundary. The API app should own its server
  port and host config; the web app should own the API base URL it needs to
  reach `apps/api`.

## Proposed approach

1. Add `apps/api` with a Bun entrypoint that builds an app layer containing the
   API handler, Bun server resource and config.
2. Add local API scripts, package metadata, TypeScript config and README
   coverage for the new app.
3. Add explicit API app config for host and port. Defaults should support local
   development without extra env setup.
4. Run an entrypoint Effect with `BunRuntime.runMain`, start the server
   through the provided app layer and release it through scoped layer
   finalizers on root fiber interruption.
5. Update `packages/http-api` only where needed so the server handler can be
   reused without importing TanStack-specific code.
6. Update `apps/web` so both server-rendered loaders and browser transitions
   use the HTTP client layer against the configured API base URL.
7. Remove `apps/web/src/routes/(machine)/api/$.ts`,
   `apps/web/src/lib/server/api-handler.server.ts` and in-process server API
   context wiring once no route depends on them.
8. Update docs and scripts so local development can run web and API together.

## Process lifecycle

The Bun API app should follow the Effect v4 process lifecycle:

```txt
ApiAppLayer -> BunRuntime.runMain(entrypoint Effect) -> serve
SIGINT/SIGTERM -> interrupt root fiber -> close scoped resources
```

Requirements:

- The Bun API app entrypoint is an Effect program run with `BunRuntime.runMain`.
- The app layer includes the HTTP API handler and any scoped resources the API
  process owns.
- Startup should run through the root Effect program, not through ad hoc
  unscoped promises.
- Long-running server work should be interruptible. On `SIGINT` and `SIGTERM`,
  `BunRuntime.runMain` should interrupt the root fiber and Effect should run
  scoped finalizers exactly once.
- Scoped layer finalizers must be the teardown mechanism for owned resources,
  including the Bun server stop path.
- Request handling must not create a new runtime per request.

## Runtime shape

Local development should have two processes:

```txt
apps/api  -> Bun HTTP server, Effect API, /api/*
apps/web  -> TanStack Start UI, browser-safe HTTP client
```

The API app should expose:

```txt
GET /api/health
GET /api/docs
GET /api/docs/openapi.json
```

The web app should call the API using a configurable base URL. Local dev scripts
inject the API URL from portless; deployed environments should provide explicit
API base URL values.

## Risks and tradeoffs

- Running two local processes is slightly more complex than the current
  embedded API route. The tradeoff is a cleaner deployment and ownership model.
- The current web loader may run on the server during SSR and in the browser
  during navigation. Both paths must use the same HTTP client contract so SSR
  does not accidentally reintroduce in-process API calls.
- Browser-safe export checks matter more after the split because `apps/web`
  should no longer have any reason to import server-only API exports.
- CORS may become necessary once web and API run on different local or deployed
  origins. The first implementation should configure it deliberately rather
  than relying on same-origin behaviour from the TanStack machine route.

## Acceptance criteria

- `apps/api` exists and runs a Bun server for `TaxKitServerLayer`.
- `apps/api` runs its entrypoint through `BunRuntime.runMain`.
- `SIGINT` and `SIGTERM` interrupt the root fiber and release scoped resources.
- `apps/api` serves `/api/health`, `/api/docs` and `/api/docs/openapi.json`.
- `apps/web` no longer imports `@taxkit/http-api/server` or
  `@taxkit/http-api/client/server`.
- `apps/web` no longer mounts an API catch-all route.
- The web health route renders from the standalone API service.
- Local scripts document how to run API and web together.
- `bun run verification` passes.

## References

- [API and SDK](../architecture/api-and-sdk.md)
- [Frontend](../architecture/frontend.md)
- [Package ownership](../architecture/package-ownership.md)
- [Effect services](../architecture/effect-services.md)
- [Testing and quality](../architecture/testing-and-quality.md)
