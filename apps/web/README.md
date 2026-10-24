---
document_type: app-readme
lifecycle: current
authority: canonical
owner: taxkit-web-app-owner
last_reviewed: 2026-10-18
review_trigger: website rendering, settings, API client, loader, form, cache, generated types or build change
---

# Website app

`apps/web` is the TanStack Start Website on Cloudflare. It renders the three
supported Australian 2025–26 calculators and the accepted public
documentation. Tax calculation and content lookup stay in the separate API app;
the Website reads them through Effect's generated `HttpApiClient` for
`TaxKitApi`.

## Source layout

`src/lib` keeps only what the Website itself owns. Request policy, forms,
page state, tools and WebMCP live in their packages.

| Folder | Owns |
| --- | --- |
| `host/` | checked settings and API binding: `service.ts` contracts, `config.server.ts`, `binding.server.ts`, `settings.server.layer.ts`, `schemas.ts`, `errors.ts` |
| `http/` | replies before TanStack renders: `early-reply.ingress.ts` (discovery files, share images, the empty server-function base) and `negotiation.server.ts` (Markdown files and `Accept`) |
| `pages/` | `loaders.ts`, `load.failure.ts`, `loader-context.ts` and the root load |
| `docs/` | documentation views, view types and the search address reader |
| `calculators/` | calculator containers and views, `page.atoms.ts`, `tools.atoms.ts` and the safe failure text |
| `seo/` | `head.ts`, the documentation page head |
| root | `runtime.server.ts`, `runtime.client.ts` and `api-client.atoms.ts` |

## What runs where

**Server rendering.** `src/lib/runtime.server.ts` owns one `ManagedRuntime`
(`runtime`) per loaded Worker module. It provides `WebsiteSettingsLive`
(`host/settings.server.layer.ts`), `WebsiteApiLive` (`host/binding.server.ts`)
and the fixed host telemetry. The contracts in `host/service.ts` fail
independently:

- `WebsiteSettings` holds checked public settings;
- `WebsiteApi` holds the generated client, `HttpApiClient.makeWith(TaxKitApi, ...)`, over the
  private `TAXKIT_API` service binding
  (`toHttpClient(fromCloudflareFetcher(binding))`);
- `forward(path)`, which sends one request to the API and returns its finished
  response (used for discovery files and share images), with a ten-second
  deadline covering headers and the complete body, a 2 MiB cap, and scoped
  cancellation.

A malformed binding fails only the API capability;
invalid Website or publication origins fail only public settings. The API origin
is required by both. Configuration failures expose fixed safe errors
(`TaxKitWebConfigError` for settings, `WebsiteApiConfigError` for the API).
The root load policy in `pages/root.load.server.ts` can therefore retain its
settings without waiting for an optional remote catalogue. It owns
the root transport encoding; `runtime.server.ts` owns execution and cancellation.

The server only reads through the binding (documentation, catalogue,
discovery files and share images); it never calculates. The binding boundary
uses standard `redirect: "manual"` while preserving the native receiver and
abort signal. Caller interruption cancels the outbound call.

**Browser.** `src/lib/api-client.atoms.ts` declares `ApiClient`, an
`AtomHttpApi.Service` for `TaxKitApi` built with `runtime:
browserRuntime.factory`. It calls the API's public origin directly with
`FetchHttpClient` (`credentials: "omit"`, `redirect: "error"`), sends no
`b3`/`traceparent` headers (`HttpClient.TracerDisabledWhen`) and adds no
collection header. The Website has no proxy for API paths and declares no
TanStack server functions.

**Both.** The HTTP package's `@taxkit/api-http/requests` owns each named read:
`requestDocsPage`, `requestDocsSearch`, `requestDocsMarkdown`,
`requestCatalogue` and `requestCalculation`. Each call has one ten-second
deadline covering headers, body and decoding, and `boundedReplies` reads each
reply with a 2 MiB cap while keeping its status and headers. Transport,
deadline and size failures become `@taxkit/api-http/errors`. A calculation
reply must answer the requested calculator with its own report kind, and a docs
page reply must have the requested path (`ApiReplyMismatch` otherwise). Both
server and browser loaders use these reads without decoding the page again.

## Loaders and router

`src/router.tsx` creates one `AtomRegistry` (`createLoaderRegistry`) before any
loader runs and passes it as router context; the root route gives the same
registry to React. On the server the context holds none and each render gets
its own registry.

TanStack owns loader data. There are no request atoms or a second cache.
`defaultPreload` is `"intent"` and `defaultStaleTime`/`defaultPreloadStaleTime`
are 60 seconds. The root route sets `staleTime: 0` because it carries the live
settings.

`src/lib/pages/loaders.ts` uses `createIsomorphicFn`: server loads call
`runtime.server.ts`, browser loads call `runtime.client.ts`. Both call the same
named reads with the generated client. Server loads stop when either the
loader or the incoming request is aborted; browser loads use the loader's own
`AbortSignal`, which cancels the HTTP call. `src/lib/pages/load.failure.ts` turns a
missing documentation page into TanStack `notFound()` (HTTP 404) and any other
failure into `WebsiteLoadError`, rendered by the route's error component.
Interruption stays interruption. Failed server page loads (settings
unavailable, a documentation build mismatch, search unavailable) reply 500 with
`no-store`.

## Settings

`src/lib/host/config.server.ts` reads only the Website's own keys from the Worker
bindings, through `reifyBoundConfigProvider`:

| Key | Source | Use |
| --- | --- | --- |
| `WEBSITE_PUBLIC_ORIGIN` | the Website's own `Worker.URL` | browser-tool registration |
| `API_PUBLIC_ORIGIN` | the API's address Output | browser client base URL and the server client's base URL |
| `TAXKIT_PUBLICATION_ORIGIN` | fixed `https://taxkit.dev` | canonical, Markdown alternate and share-image links |

`TAXKIT_API` is checked separately as the binding object (it must expose
`fetch` and `connect`) so its methods keep their receiver. Its small host
adapter enforces manual redirects before the stock Alchemy HTTP conversion.
Missing or invalid settings produce `TaxKitWebConfigError` with fixed fields.
The root loader encodes the public settings into its loader data; the root
route restores them and seeds `publicSettingsAtom`, which the browser client
reads. No binding or Effect Context reaches the browser. Vite sets
`envPrefix: []`; there is no build-time API address.

`wrangler.jsonc` owns the standalone local fixture. Wrangler generates
`src/worker-runtime.generated.d.ts` and TanStack generates
`src/routeTree.gen.ts`; regenerate them rather than editing them.

## Calculator pages

Take-home pay is at `/`; `/calculators/au.pay.withholdings` and
`/calculators/au.income-tax.annual` have their own form and answer state. The
navigation uses the canonical browser-safe `@taxkit/calculators/summaries`
titles and identities, also reused by the API catalogue. It renders all links
without a network read or JavaScript; summaries change with deployment and
browser reload. Remote discovery tools still read the live API catalogue.
Annual pages state
that the retained Medicare thresholds await correction.

`@taxkit/calculators/page` owns the page state: one `Atom.family` group per
calculator with the form, the calculation and the shared readonly
`CalculatorViewState`. `src/lib/calculators/page.atoms.ts` supplies the
calculation (`apiClientRuntime.fn` over `requestCalculation`) and the safe
failure text. `@taxkit/calculators/form` turns a visible form into a checked
request. Calculate sends the checked request. Editing interrupts
unfinished work and keeps the last successful answer, marked out of date, until
an explicit calculation succeeds. Leaving the page interrupts its work. The
view is kept alive for the registry's lifetime so an answer survives a paused
first render and a return visit. No figures go to browser storage or the URL.

The take-home result shows the answer first, with native `details` for the
breakdown, assumptions, year and sources. Explanations come from the checked
report and its trace, not the edited form. Source references become links only
for valid HTTPS addresses.

**Without JavaScript.** Calculators need JavaScript. Each calculator page shows
a `<noscript>` notice, "Turn on JavaScript to use this calculator." The server
never calculates, and a POST to any Website page returns an empty 404.

## Documentation pages

The catch-all route loads the page and navigation from the API's documentation
routes; the server uses the original pathname. The route shows the page title
as `DocsHeading`, and `src/lib/docs/reading-body.view.tsx` renders the page's
checked `body`: code tokens as coloured spans, diagrams as images with an SVG
data address and tables in a labelled scroll region. Missing pages use
TanStack's not-found state and HTTP 404. Internal links are router links; client navigation moves
focus to the new heading and initial hydration does not.

`/search` has a plain GET form with one `term` field and works without
JavaScript. `docs/search-location.ingress.ts` reads the raw address once, so words
such as `1e3` or quoted text are not JSON-parsed; duplicate or unexpected keys
and words over 100 characters are a normal invalid-search page state. Empty
words load navigation only. Search pages are `noindex, follow`.

**Markdown.** Accepted pages also serve their processed Markdown at the `.md`
address (`http/negotiation.server.ts`). A page address with a preferring
`Accept` header answers 307 to that `.md` address. HTML wins ties and a missing
preference; `@taxkit/api-http/negotiation` reads the header. Invalid or wholly
excluding `Accept` fields return empty 400/406.
The redirect, 400 and 406 are stored as their own public variant: Workers Cache
drops a page's stored HTML when an uncacheable reply arrives at the same
address, so an `Accept` header must not be able to empty it. Other methods on `.md` return 405; query input 400;
missing or unavailable pages 404/503, all `no-store`. Every reply at a docs
address carries `Vary: Accept`; Markdown also carries `nosniff` and a canonical
link to the publication origin.

**Discovery.** `/sitemap.xml`, `/robots.txt`, `/llms.txt` and `/llms-full.txt`
are forwarded once to the API's `/api/v1/docs/discovery/*` routes, which own the
documents. GET and HEAD only (other methods 405 with `Allow: GET, HEAD`); query
input 400; an unreachable API 503.

**Share metadata.** Each docs loader returns Content's `docsPageMetadata`:
canonical, Markdown alternate and image addresses on the publication origin and
TechArticle data with script-breaking characters escaped. `seo/head.ts` renders
it as the page title, description, Open Graph and Twitter tags. `/og/<page>.png`
is forwarded once to the API's `/api/v1/docs/og/<page>.png` route
(`http/image.ingress.ts`), which renders the 1200 × 630 PNG; the Website checks
the type and bytes. GET and HEAD only; an unknown page 404 and an unusable
reply 503, both `no-store`. No renderer is in the Website or browser bundles.

## Caching

`src/server.ts` makes one cache decision for every reply with
`applyCachePolicy` from `@taxkit/api-http/response-policy`, with
`publicRead: true`. A successful GET or HEAD without `Set-Cookie` or a stricter
instruction gets
`Cache-Control: public, max-age=0` and
`Cloudflare-CDN-Cache-Control: public, max-age=604800, stale-if-error=0`.
Everything else, including other methods and errors, gets `no-store`. The apps
graph enables the Website's native Workers Cache scoped to the deployed version. `/_serverFn` and `/_serverFn/*` return an empty
404.

## Browser tools

On a mounted calculator, browsers with WebMCP support can register five tools:
`taxkit_find_calculators`, `taxkit_read_calculator`, `taxkit_fill_calculator`,
`taxkit_calculate_visible_form` and `taxkit_read_result`. The toolkit and its
handlers belong to `@taxkit/calculators/page-tools`, registration to
[`@taxkit/webmcp`](../../packages/webmcp/README.md), and
`calculators/tools.atoms.ts` composes them for a mounted page. They use the
page's own edit and submit commands and the same `ApiClient`; mounting or
reading starts no calculation. Each tool has a
two-second registration limit and calculation has a twelve-second outer limit.
A caller's cancellation or an edit cancels only the request that call owns;
another unfinished calculation is reported as busy. Page cleanup removes the
tools. Failures carry fixed codes without input values. `/agents` links the
remote MCP address on the API origin, the OpenAPI description and the
[agent connection guide](../../content/docs/api/agent-tools.mdx).

## Analytics

The Website collects no analytics: it has no PostHog relay or settings, and
its browser client sends no collection header. The API's own calculator
analytics is described in the [API app](../api/README.md#analytics-candidate).

## Checks

```sh
bun run --filter=web generate:worker-types
bun run --filter=web check:worker-types
bun run --filter=web check-types
bun run --filter=web test
bun run --filter=web test:browser
bun run --filter=web build
bun run --filter=web build:native-pair
bun run --filter=web test:native-pair
```

`test:browser` runs the Chromium tests in `src/lib/**/*.browser.test.tsx`: the
shared loader registry and client reuse, not-found and load-error translation,
loader cancellation, invalid search words, calculator commands, editing,
hydration and form unmount.

`build:native-pair` builds the API dependency graph and then both apps with
Alchemy's native builders, without a cloud provider, state or credentials. Its
API output is under the ignored `.alchemy/native-pair`; the Website output is
`dist/server/server.js`. A standalone Vite build writes `dist/server/index.js`
instead, so run the native build immediately before its test. The root
`bun run test:native` does both.

The native tests in `test/` run the built pair in Miniflare and Chromium. They
cover first HTML for every page, documentation pages, search, Markdown and
discovery files with their cache headers, browser calculation, the
no-JavaScript notice and refused POSTs, request and reply limits, cancellation,
rate admission, settings failure, API analytics, MCP clients and the WebMCP
browser tools. They need Node 24.16.0 and the installed Chromium, and they do
not show hosted behaviour.

## Local development

From the repository root, `bun run dev` starts the native API and Website pair
with `alchemy.local.run.ts` at the `dev_native_apps` stage. The Website uses
port 3220 and the API uses port 3221, with native strict-port checks so they
cannot swap addresses. An occupied port stops startup. Alchemy prints both
addresses, binds the private API and supplies the origins, using local state
and `.alchemy/native-apps-auth` without a cloud login. Ctrl-C stops the pair.
App source changes reload; shared-package changes need that package's build,
because the API bundler reads compiled exports.

`bun run --filter=web dev` runs the Website alone through portless. It still
needs a native API binding, which the standalone Bun API cannot supply.

The Vite config reads Alchemy's native plugin flag through a fresh
ConfigProvider so it does not add a second Cloudflare plugin. Server code
imports the runtime-only `alchemy/Cloudflare/Bridge` export.

## Related owners

- [Frontend architecture](../../docs/architecture/frontend.md)
- [API app](../api/README.md)
- [HTTP API package](../../packages/api/http/README.md)
- [Native apps graph](../../packages/infrastructure/README.md)
- [Deployment](../../docs/architecture/deployment.md)
