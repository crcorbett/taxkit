---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Frontend

WhatTax currently has two browser-facing TanStack Start apps: `apps/web` for
API/runtime smoke behaviour and `apps/docs` for public developer
documentation.

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
: Fumadocs-backed public documentation site for rule references, API docs, SDK
  guides and contributor docs. It owns the route runtime, app shell, app-local
  MDX component map and browser rendering. Server loaders consume
  `@whattax/docs-content`; browser modules consume browser-safe
  `@whattax/docs-content/client`, `@whattax/docs-content/schemas` and
  `@whattax/docs-fumadocs/render` exports.

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

Docs SSR loaders use the same runtime rule. `apps/docs` keeps a module-scoped
runtime for `DocsContentServiceLive`, decodes route input before lookup and
preloads compiled MDX through the browser-safe client loader. App routes should
not read `apps/docs/content` files, `navigation.json` or generated
`.source/server` modules directly.

## Guardrails

- Keep app state conversion outside the deterministic engine.
- Decode boundary inputs before invoking calculators.
- Do not import server-only API exports from browser routes.
- Do not remount the canonical API inside TanStack Start.
- Keep frontend docs and component details out of rule packages.
- Keep browser docs modules on browser-safe exports such as
  `@whattax/docs-content/client` and `@whattax/docs-fumadocs/render`.
- Do not import generated `.source/server` files or
  `@whattax/docs-content/server` from browser modules.
- Keep Fumadocs generated source access inside `@whattax/docs-content` server
  exports and reusable adapters in `@whattax/docs-fumadocs/source`.

## Related Docs

- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)
- [Content and posts](./content-and-posts.md)
