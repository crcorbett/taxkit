---
status: canonical
last_reviewed: 2026-07-14
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

## Main areas

`apps/web`
: Current scaffold app and health-check integration surface. It calls
  `apps/api` over HTTP for SSR loaders and browser navigation.

`apps/api`
: Current standalone Bun API runtime. It owns API process startup and serves
  the `packages/api/http` routes.

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

## Runtime shape

Browser code should consume browser-safe client/schema exports and reach the
API through the configured API base URL. Server-only handlers, filesystem code
and Node adapters must stay behind explicit server exports and out of
`apps/web`.

The web runtime reads:

- `WHATTAX_API_BASE_URL` for server-rendered loaders
- `VITE_WHATTAX_API_BASE_URL` for browser navigation

Both runtime-specific values are mapped into the package-owned
`@whattax/api-http/config` schema by `apps/web/src/lib/config.server.ts` and
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
`.source/server` modules directly. `@whattax/docs-content` bundles the authored
navigation representation and decodes it with the canonical navigation schema,
so built server functions do not depend on a source-relative filesystem path.

Docs server functions encode route outcomes with a browser-safe Effect Schema
boundary. Route loaders return that representation unchanged. On an initial
request, TanStack Router dehydrates and hydrates the encoded loader state. On
client navigation, the server-function RPC serialiser carries the encoded
response before the route loader returns it. In both paths, the direct route
root restores the value once and matches the typed `Result` before composing
the page. Internal docs navigation uses TanStack `Link`; a browser click then
runs the destination route loader and server-function RPC without a new
document request.

```ts
DocsContentService Effect
  -> browser-safe Schema.Exit JSON encoding
    -> createServerFn and route loader return encoded data unchanged
      -> SSR hydration or client-navigation transport
        -> direct route-root restore
          -> Result match
            -> canonical values reach composition and leaves
```

## Decoding and composition boundaries

Route loaders, actions and dedicated boundary adapters own executable decoding
of URL state, browser storage, external HTTP responses and other transport
representations. Prefer extracting a focused boundary module when a TanStack
route file also renders React; do not allowlist a mixed `.tsx` route merely
because its loader needs a decoder.

For encoded TanStack loader state, the browser-safe boundary adapter owns the
Schema decoder and exposes a synchronous restore operation. The direct route
component or route-owned `head` callback may call that operation when it is the
first consumer of loader data. This is an explicit transport boundary, not a
general render-time decoder exception. The consumer uses one immutable loader
data binding, restores once per invocation and matches the resulting
`Result.Result<Success, ExpectedFailure | TransportFailure>` itself.

Route composition then uses `Result`, `Option` or `Match` over schema-derived
values. It must not forward the encoded value or whole route `Result` to a
child, and it must not hide restoration in a hook, provider, higher-order
component, callback or one-use wrapper.

Leaf components receive focused readonly values, callbacks or `children` from
their typed container and render only. They may own local interaction state,
but must not accept representation-level `unknown`, call a decoder, acquire an
Effect service, create or run a runtime, read storage or environment directly,
or fetch their own boundary data. Pass commands from the loader, action or
owning container instead.

Do not add a hook, provider or wrapper component only to relocate a decoder or
silence lint. Extract React composition when it owns reusable UI policy or
removes meaningful repetition. App-specific composition remains app-owned;
`packages/ui` remains planned.

## Guardrails

- Keep app state conversion outside the deterministic engine.
- Decode boundary inputs before invoking calculators and before React
  composition begins.
- Do not import server-only API exports from browser routes.
- Do not remount the canonical API inside TanStack Start.
- Keep frontend docs and component details out of rule packages.
- Keep browser docs modules on browser-safe exports such as
  `@whattax/docs-content/client` and `@whattax/docs-fumadocs/render`.
- Keep docs loader outcomes encoded until a direct route-root consumer restores
  them through the browser-safe route boundary.
- Use TanStack router links for internal docs routes so client navigation runs
  the route loader. Keep ordinary anchors for external destinations.
- Do not import generated `.source/server` files or
  `@whattax/docs-content/server` from browser modules.
- Keep Fumadocs generated source access inside `@whattax/docs-content` server
  exports and reusable adapters in `@whattax/docs-fumadocs/source`.

## Related Docs

- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)
- [Content and posts](./content-and-posts.md)
