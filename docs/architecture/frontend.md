---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Frontend

The current frontend is a TanStack Start app that exercises the standalone
Effect HTTP API and runtime split. Future public documentation UI should move
toward the docs app described in the architecture docs.

## Scope

This doc covers browser/runtime boundaries and frontend ownership. It does not
define tax calculation rules.

## Main Areas

`apps/web`
: Current scaffold app and health-check integration surface. It calls
  `apps/api` over HTTP for SSR loaders and browser navigation.

`apps/api`
: Current standalone Bun API runtime. It owns API process startup and serves
  the `packages/http-api` routes.

`apps/docs`
: Planned Fumadocs public documentation site for rule references, API docs, SDK
guides and contributor docs.

`packages/ui`
: Planned shared UI primitives for WhatTax-owned apps, once repeated UI
patterns justify a package.

## Runtime Shape

Browser code should consume browser-safe client/schema exports and reach the
API through the configured API base URL. Server-only handlers, filesystem code
and Node adapters must stay behind explicit server exports and out of
`apps/web`.

The web runtime reads:

- `WHATTAX_API_BASE_URL` for server-rendered loaders
- `VITE_WHATTAX_API_BASE_URL` for browser navigation

Both runtime-specific values are mapped into the package-owned
`@whattax/http-api/config` schema by `apps/web/src/lib/config.server.ts` and
`apps/web/src/lib/config.client.ts`. Those modules compose package config
fragments that use `Config.nested(...)`, then provide runtime env sources with
`ConfigProvider.fromEnv(...)` and `ConfigProvider.constantCase`. Local dev
scripts inject them from `portless get api.whattax`; deployed environments
should set them explicitly.

Web SSR and browser runtimes should use module-scoped
`ManagedRuntime.make(...)` values from fully provided layers. Do not create
Effect runtimes inside route loaders, React components or request-local helper
functions.

## Guardrails

- Keep app state conversion outside the deterministic engine.
- Decode boundary inputs before invoking calculators.
- Do not import server-only API exports from browser routes.
- Do not remount the canonical API inside TanStack Start.
- Keep frontend docs and component details out of rule packages.

## Related Docs

- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)
- [Content and posts](./content-and-posts.md)
