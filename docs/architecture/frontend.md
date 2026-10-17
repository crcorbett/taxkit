---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-architecture-owner
last_reviewed: 2026-10-17
review_trigger: frontend runtime, API client, loader, rendering, cache, build adapter, or composition change
---

# Frontend

`apps/web` is the TanStack Start Website for the calculators and the public
documentation. `apps/docs` is a retirement tombstone for verified original
source and dated provider recovery records. The
[Website README](../../apps/web/README.md) owns exact settings, routes,
response rules and commands.

## Scope

This doc covers browser/runtime boundaries and frontend ownership. It does not
define tax calculation rules.

## Main areas

`apps/web`
: The Website. It renders calculator forms and documentation, and reads the
  API through Effect's generated `HttpApiClient` for `TaxKitApi`: over the
  private `TAXKIT_API` binding on the server and the API's public origin in the
  browser.

`apps/api`
: The API: the standalone Bun host and the native Alchemy Worker. The Worker
  serves HTTP, machine RPC and MCP over the same calculator and content
  services.

`apps/docs`
: Retirement tombstone, not an active workspace.

`packages/ui`
: Planned shared UI primitives, once repeated UI patterns justify a package.

## Runtime shape

The Website has exactly two places that run Effects:

- `apps/web/src/lib/runtime.server.ts`: one `ManagedRuntime` with
  independent `WebsiteSettingsLive` and `WebsiteApiLive` Layers. The API Layer
  builds the generated client over the binding with
  `toHttpClient(fromCloudflareFetcher(binding))`. Its calculation POST uses the
  API's trusted private `calculatorRequest` method so the caller's rate key
  travels outside JSON and headers.
- `apps/web/src/lib/runtime.client.ts`: the browser loader bridge. It runs one
  request Effect with the shared `AtomRegistry` and the loader's `AbortSignal`.
  The browser client is `ApiClient`, an `AtomHttpApi.Service` built with
  `runtime: browserRuntime.factory` over `FetchHttpClient` with
  `credentials: "omit"` and `redirect: "error"`, and tracing headers disabled.

Both clients read replies through the same 2 MiB bound and give each call one
ten-second deadline. Declared API errors keep their owning types; transport,
deadline, size and mismatch failures become the Website's own tagged errors.
The Website declares no server functions, has no proxy at the API's `/api`,
`/rpc` or `/mcp` paths and does not mount the API in process.

`src/router.tsx` creates one registry before loaders run and React reuses it.
TanStack owns loader data and its freshness: intent preloading, a one-minute
default stale time and `staleTime: 0` on the root route, which carries live
settings and any personal submission. Loaders hold no request atoms and add no
second cache. `loaders.ts` selects the server or browser branch with
`createIsomorphicFn`; failures become TanStack `notFound()` or a
`WebsiteLoadError` for the route's error component.

The Website's own address comes from its native `Worker.URL`, the API address
from the API resource's Output and canonical links from the fixed publication
origin `https://taxkit.dev`. `config.server.ts` reads only the Website's keys
through `reifyBoundConfigProvider`. Settings and the API binding retain independent
checked failures: a broken binding leaves settings available, and invalid Website
settings do not block valid API forwarding. `root.load.server.ts` requires settings
and treats the catalogue as optional page chrome.
Vite exposes no ambient public env prefix or build-time API address.

`src/server.ts` is the Worker entry. Before TanStack it handles the analytics
relay, discovery files (forwarded once to the API), the no-JavaScript
calculator form POSTs and an empty 404 for `/_serverFn`. Every reply then gets
one cache decision from `applyCachePolicy` in
`@taxkit/api-http/response-policy`: only successful public GET/HEAD replies are
shared; everything else is `no-store`.

## Decoding and composition boundaries

Route loaders, actions and dedicated boundary adapters own executable decoding
of URL state, browser storage, external HTTP responses and other transport
representations. The generated client decodes API replies; route code does not
decode them again. `@taxkit/content/response-check` separately relates the checked
page to its requested path; a different valid page becomes `WebsiteDocsPageMismatch`.
Prefer extracting a focused boundary module when a TanStack
route file also renders React; do not allowlist a mixed `.tsx` route merely
because its loader needs a decoder.

Loader data must be plain values TanStack can serialise. When a loader returns a
Schema-encoded value (the root route's settings and catalogue, or a
no-JavaScript submission), the direct route component is its first consumer:
it restores the value once and matches the `Result` before composing React.
It must not forward the encoded value or whole route `Result` to a child, and
must not hide restoration in a hook, provider, higher-order component, callback
or one-use wrapper.

Leaf components receive focused readonly values, callbacks or `children` from
their typed container and render only. They may own local interaction state,
but must not accept representation-level `unknown`, call a decoder, acquire an
Effect service, create or run a runtime, read storage or environment directly,
or fetch their own boundary data. Pass commands from the loader, action or
owning container instead.

## Visible composition and leaf ownership

Keep the visible composition route-high. The route root owns restoration and
top-level outcome matching, then renders the page shell and major semantic
landmarks such as `header`, `nav`, `main`, `aside` and `footer`. A section
container may arrange one coherent feature, but it must not hide the page's
primary hierarchy behind a generic provider, hook or wrapper. Use one `main`
landmark per page and keep landmark labels and heading order meaningful when
sections are rendered independently.

Place loading, empty, unavailable and recoverable error UI at the smallest
composition boundary that owns the failed data. Preserve the surrounding shell
and unrelated landmarks. A constrained panel, table, chart or control keeps a
stable footprint while its fallback is shown so dynamic states do not shift or
overlap adjacent content. Use a route-wide fallback only when the route cannot
establish the page composition at all.

Leaf props are focused and `readonly`: pass the canonical scalar, value object,
small schema-derived view or callback the leaf renders, not a transport DTO,
whole route result, service or broad page model. Leaves may own complete local
UI commands such as disclosure, focus, copy or dialog state. A command that
crosses a trust boundary, mutates domain state or invokes a remote operation is
owned by the route action or nearest policy-owning container and reaches the
leaf as a focused callback. The leaf may bind that callback to an event; it
must not construct another runtime, service or transport client to execute it.

```ts
route loader (server or browser branch)
  -> direct route-root restore and Result match
    -> page shell and semantic landmarks
      -> section container and smallest owning fallback
        -> leaf with readonly values and focused commands
```

Do not add a hook, provider or wrapper component only to relocate a decoder or
silence lint. Extract React composition when it owns reusable UI policy or
removes meaningful repetition. App-specific composition remains app-owned;
docs accessibility and navigation UI stays in the app, and the Website does not
depend on `packages/ui`.

MDX component registries follow the same composition rule. The Website owns one
registry under its MDX adapter; routes and leaves import focused render
primitives or that registry. `mdx/no-route-local-component-registry` enforces
route placement.

## Calculator state

`calculator.atoms.ts` holds one `Atom.family` group per calculator: form,
calculation (`apiClientRuntime.fn` over the generated client), commands and one
shared readonly view (`WebsiteCalculatorViewState`). Editing interrupts work and
keeps the last success, visibly out of date, until an explicit calculation
succeeds; an old error is hidden while a new request runs. The view is kept
alive for the registry's lifetime and holds its whole family group, so a
restored server answer survives a paused first render and a return visit after
browser garbage collection. Page cleanup still interrupts work and browser-tool
callbacks; registry disposal releases the snapshot and client. No figure
reaches navigation, metadata, browser storage or a query string.

Routes restore only the checked no-JavaScript submission for their calculator;
the container seeds the saved form with `useAtomInitialValues` on the page's
form atom. The take-home result leaf receives only the checked report and stale
flag; explanations come from the report and its trace, not the edited form.

## Page-owned browser tools

`WebsiteBrowserToolkit` describes five visible calculator commands, separate
from the API's remote MCP tools. Arguments reuse the form Schemas and results
reuse `WebsiteCalculatorViewState`. `browser-tools.atoms.ts` registers them with
`apiClientRuntime.fn`; handlers call the page's existing edit and submit
commands and the same `ApiClient`, never another client or runtime. The
registration scope's `FiberSet.makeRuntimePromise` is the only callback bridge.
One checked request object identifies each attempt, so an old callback cannot
return a newer answer or cancel a newer manual request. Containers start
registration and interrupt it on cleanup.

## Documentation

The catch-all route loads page and navigation from the API's documentation
routes and renders browser-safe compiled MDX presentation; its processed
Markdown and frontmatter must match the API page before display. `/search`
reads the raw address once and calls the API's search route. Markdown
representations (`.md` and `Accept` negotiation) are a named HTTP policy over
the HTML Effect in `src/server.ts`; discovery documents belong to the API and
are forwarded once. Share metadata comes from `metadata.egress.ts` and share
images from a build-only Vite step. No Website request reads authored MDX,
builds a content index or constructs a Layer.

## Analytics

The browser client adds the Do Not Track collection choice to each request; the
server client forwards the incoming request's choice. Only allow/deny is sent.
The private POST `/ingest/e/` relay is the one provider-ingress exception; the
current graph binds no analytics settings, so it reports off. Browser delivery,
the event allowlist and stored-event readback are not built.

## Guardrails

- Keep app state conversion outside the deterministic engine.
- Decode boundary inputs before invoking calculators and before React
  composition begins.
- Run Effects only in `runtime.server.ts`, the `runtime.client.ts` loader
  bridge and the `ApiClient` Atom runtime. `strict-effect/website-rpc-boundary`,
  `no-loader-request-state`, `no-native-client-replica`, `website-data-proxy`
  and `module-ownership` enforce this in `apps/web/src`.
- Use the generated client for API calls; do not add copied method services,
  server functions or Website endpoints that proxy API data.
- Do not import server-only API exports from browser routes, and do not mount
  the API inside TanStack Start.
- Read Worker bindings only in `runtime.server.ts` and adapt the private binding
  only in `api/host.server.ts`.
- Keep frontend docs and component details out of rule packages.
- Keep browser docs modules on browser-safe exports such as
  `@taxkit/docs-content/client` and `@taxkit/docs-fumadocs/render`; do not import
  generated `.source/server` files or `@taxkit/docs-content/server` from browser
  modules.
- Use TanStack router links for internal docs routes so client navigation runs
  the route loader. Keep ordinary anchors for external, mail, download,
  repository-source and same-document destinations.
- Keep the skip link, one main landmark, labelled navigation, current-page
  semantics, focus intent and responsive disclosure app-owned. Client
  navigation may move focus to the page heading; initial hydration must not.
- Keep all information and focus behaviour available without animation.
- Apply the [abstraction admission
  contract](../design-docs/abstraction-admission.md) before sharing a hook,
  provider, component family or UI package.

## Related docs

- [Website README](../../apps/web/README.md)
- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)
- [Content and posts](./content-and-posts.md)
- [Deployment](./deployment.md)
