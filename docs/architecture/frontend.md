---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-architecture-owner
last_reviewed: 2026-10-07
review_trigger: frontend runtime, transport, rendering, build adapter, or composition change
---

# Frontend

TaxKit has two browser-facing TanStack Start apps: `apps/web` is the native
calculator/documentation Website candidate and `apps/docs` remains the public developer
documentation app until its replacement is qualified.

## Scope

This doc covers browser/runtime boundaries and frontend ownership. It does not
define tax calculation rules.

## Main areas

`apps/web`
: Native Website candidate with checked settings, a take-home form, server
  rendering over the private API binding and direct browser RPC.

`apps/api`
: Retained standalone Bun API and native Alchemy Worker candidate. The Worker
  serves HTTP and RPC through the same checked calculator operation.

`apps/docs`
: Fumadocs-backed public documentation site for rule references, API docs, SDK
  guides and contributor docs. It owns the route runtime, app shell, app-local
  MDX component map and browser rendering. Route files import that shared map;
  they do not define local `mdxComponents` objects or inline MDX registries.
  Server loaders consume
  `@taxkit/docs-content`; browser modules consume browser-safe
  `@taxkit/docs-content/client`, `@taxkit/docs-content/schemas` and
  `@taxkit/docs-fumadocs/render` exports.

`packages/ui`
: Planned shared UI primitives for TaxKit-owned apps, once repeated UI
patterns justify a package.

## Runtime shape

Browser code should consume browser-safe client/schema exports and reach the
API through the configured API base URL. Server-only handlers, filesystem code
and Node adapters must stay behind explicit server exports and out of
`apps/web`.

The Website's native graph supplies its own origin from `Worker.URL`, the API
origin from the peer resource Output, and the private `TAXKIT_API` binding.
`config.server.ts` checks semantic origin strings through Config and the native
SDK object through Schema. Missing or invalid settings become fixed checked
errors; deferred planning outputs do not become invented deployment addresses.
Vite exposes no ambient public env prefix or guessed build-time API address.

The Website owns one server ManagedRuntime. The browser owns a React Atom
registry, not another ManagedRuntime. The root loader receives encoded plain
settings through a TanStack server function, restores the branded origin and
seeds the registry. Settings remain alive until that registry is disposed.
`calculator.atoms.ts` describes scoped native RPC operations and synchronous
form commands. The focused container owns command coordination and interrupts
its operation on unmount; the leaf renders readonly values and callbacks.

Explicit Calculate reaches POST `/rpc` directly in the browser and uses the
native private Fetcher binding for a standard server HTML form. Both calls
reach the API's shared named operation. Neither initial rendering nor editing
calculates. Editing interrupts work and retains the last successful answer,
visibly marked out of date until a successful explicit calculation. The form
works without JavaScript. Schema-encoded submissions restore checked outcomes
through TanStack's native server request context; no Effect Context or native
binding crosses into loader data.

The protocol Layer retains connection configuration. Each calculation owns its
native RPC client's receive-loop scope, avoiding a suspended earlier Worker
request's fibre blocking later requests. The client explicitly sets `/rpc` and
omits credentials/rejects redirects. Both RPC and HTTP tracing are disabled on
this connection pending safe export qualification; the API allows only the
matching Website origin and `content-type` in browser CORS.

The native API and Website share streamed POST limits and fixed log/report
containment. The Website's native HTTP Cause response boundary produces empty
unexpected-error responses and preserves interruption classification. This
contains host errors; it does not qualify all framework console or native trace
paths. The saved native pair test runs actual native artifacts, a private API
binding and real Chromium. Focused browser tests qualify idle settings, editing,
form unmount and expected-error hydration. The app README owns exact commands,
generated Wrangler declarations and the distinction between standalone and
Alchemy-native build output. The native RPC failure test also checks fixed global/procedure/fatal replies,
a damaged valid-JSON result through the genuine private binding, and restored
error editing in Chromium without replay. Positive fixed log events omit pay
values in emitted messages and the short marker across complete records. The
native cancellation test requires the five-second headers/body deadline and
actual browser request abort after the deadline, editing and browser Back
leaving the form. It observes caller cancellation; the upstream artificial
stream can continue. The three calculator pages are locally qualified; full
exported telemetry remains active work.

The root local development command starts both native apps from the same graph.
Native local resource outputs own the public origins and private binding. The
Website imports its Fetcher adapter through `alchemy/Cloudflare/Bridge`, the
SDK's supported runtime-only export, avoiding development-tool code in Worker
SSR. Vite reads the injected plugin flag with a fresh ConfigProvider at its
configuration boundary. The [Website README](../../apps/web/README.md) owns
setup, source reload and the saved real-CLI check; docs development is separate.

Docs SSR loaders retain their existing module-scoped runtime rule. `apps/docs` keeps one module-scoped
server runtime for `DocsContentServiceLive`, composed over the TaxKit generated
collection Layer, plus one app-private runtime-probe Layer, and exposes explicit
disposal for tests and future host lifecycle integration. Native runtime tests
acquire the actual factory, reuse its cached context and dispose it inside a
scope; acquired content is released after success, failure and interruption.
Only the private factory owns runtime creation permission; its tests own none.
The probe Layer owns
its construction state in an Effect `Ref`, creates its non-secret identifier
through Effect `Random`, and admits a deterministic identity Effect in tests.
The Worker callback executes its native request program at the exact host,
normalises the framework's response or promise, and passes the request abort
signal to that program. Framework promise cancellation is a separate concern.
Only opt-in proof requests acquire the existing docs runtime's cached context
for the typed probe read and Schema encoding at response-header egress;
ordinary responses do not initialise docs services. Response body/status and
unrelated headers are preserved. It owns no mutable counter or randomness.
The browser owns no Effect runtime. A browser-reachable loader defines only
the TanStack server-function transport stub. The installed Start compiler
extracts its handler and removes unused static server imports from browser
callers; the named `.server.ts` implementation acquires the service, decodes route input before
lookup and preloads compiled MDX through the browser-safe client loader. App
routes should not read `packages/docs-content/content` files,
`navigation.json` or generated `.source/server` modules directly.
`@taxkit/docs-content` bundles the authored navigation representation and
decodes it with the canonical navigation schema, so built server functions do
not depend on a source-relative filesystem path.

The docs import checker uses native Effect file/path services and one exact
Bun command entrypoint. The pinned TypeScript 6 compatibility parser owns
its direct static source inspection; TypeScript 7 still owns compilation.
It ignores server, test and generated owners and non-file directory entries,
rejects browser runtime execution/file presence, and fails closed on file-service
errors. Native fixtures and real CLI strict-rule canaries qualify this checker
separately from transitive browser-bundle and local Worker behaviour.
All docs app source and Vite/server-test/browser-test configurations receive
the canonical strict rules. Exact hosts retain only the execution or promise
result construct they require. The Vite host reads Alchemy's injection signal
through an owning Config Schema, with absence preserving the original default.

The opt-in proof response establishes one construction and stable identity only
for the observed process/isolate. It does not establish a global singleton
across Cloudflare isolates. Built proof may retain ignored, candidate-bound
desktop/mobile screenshots and a digest manifest as visual review input; the
behavioral HTTP/browser oracles remain the authority for SSR, hydration,
navigation, status, focus, accessibility and console claims.

Docs server functions encode route outcomes with a browser-safe Effect Schema
boundary. Route loaders return that representation unchanged. On an initial
request, TanStack Router dehydrates and hydrates the encoded loader state. On
client navigation, the server-function RPC serialiser carries the encoded
response before the route loader returns it. In both paths, the direct route
root restores the value once and matches the typed `Result` before composing
the page. Internal docs navigation uses TanStack `Link`; a browser click then
runs the destination route loader and server-function RPC without a new
document request. The app MDX adapter treats root-relative, query-only and
authored relative `.mdx` destinations as router destinations, removes only the
`.mdx` suffix before a query or fragment, and keeps external, mail,
protocol-relative, download, repository-source and same-document destinations
as anchors. Focus movement is app policy: sidebar, home and MDX route links
record one navigation intent and the destination heading consumes it after
client navigation. Initial hydration does not record that intent.

The catch-all server-function implementation maps only
`DocsPageNotFoundError` to TanStack `notFound()`. The route owns the nearest
`notFoundComponent`, so direct missing-page requests return HTTP 404 and client
navigation renders the same framework state. Expected source/preload failures
remain schema-encoded recoverable outcomes; defects and interruptions remain
in the framework error channel. `bun run --filter=docs test:built` proves this
against the generated production server and browser output.

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
route loader/action or server function
  -> direct route-root restore and Result match
    -> page shell and semantic landmarks
      -> section container and smallest owning fallback
        -> leaf with readonly values and focused commands
```

Do not add a hook, provider or wrapper component only to relocate a decoder or
silence lint. Extract React composition when it owns reusable UI policy or
removes meaningful repetition. App-specific composition remains app-owned;
docs accessibility and navigation UI stays in each consuming app, and this slice
does not create or depend on `packages/ui`.

MDX component registries follow the same composition rule. The docs app owns
one registry under its MDX adapter, while routes and leaves import focused
render primitives or the app-owned registry. `mdx/no-route-local-component-registry`
enforces route placement; it does not move the registry into a shared package
before a second application needs it.

## Guardrails

- Keep app state conversion outside the deterministic engine.
- Decode boundary inputs before invoking calculators and before React
  composition begins.
- Do not import server-only API exports from browser routes.
- Do not remount the canonical API inside TanStack Start.
- Keep frontend docs and component details out of rule packages.
- Keep browser docs modules on browser-safe exports such as
  `@taxkit/docs-content/client` and `@taxkit/docs-fumadocs/render`.
- Keep content service acquisition, live Layer composition and Effect runtime
  execution in app-owned `.server.ts` modules. Run the focused import-boundary
  audit and do not add a browser docs runtime.
- Keep docs loader outcomes encoded until a direct route-root consumer restores
  them through the browser-safe route boundary.
- Use TanStack router links for internal docs routes so client navigation runs
  the route loader. Preserve query and fragment semantics; keep ordinary
  anchors for external, mail, download, repository-source and same-document
  destinations.
- Keep the skip link, one main landmark, labelled navigation, current-page
  semantics, focus intent and responsive disclosure app-owned. Client
  navigation may move focus to the page heading; initial hydration must not.
- Keep all information and focus behavior available without animation. A
  reduced-motion browser setting must not remove required state.
- Do not import generated `.source/server` files or
  `@taxkit/docs-content/server` from browser modules.
- Keep Fumadocs generated source access inside `@taxkit/docs-content` server
  values from the `@taxkit/docs-fumadocs/service` boundary.
- Apply the [abstraction admission
  contract](../design-docs/abstraction-admission.md) before sharing a hook,
  provider, component family or UI package.

## Related Docs

- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)
- [Content and posts](./content-and-posts.md)

The Website settings function takes no data or client Context. Its build-owned
route base and Worker ingress share `WebsiteServerFunctionBase`; query payloads
and non-GET methods are rejected before TanStack's parser. Expected settings
errors remain encoded checked results. Unexpected settings failures use native
HTTP matching/reporting and a native Response, bypassing error serialisation.
The saved native suite also qualifies controlled fatal/RPC paths and caller
cancellation. T003's bounded local connection acceptance is complete; T009
retains the unqualified safe trace exports.

Native settings ingress admits the function's own generated URL, without
copying its build ID. Unknown IDs, extra path parts and missing IDs get empty
404 responses before TanStack lookup; its native lookup otherwise logs unknown
IDs even when the response body hides them.

The answer container uses native `AsyncResult.value` to retain the last success
through refresh, failure and interruption. Submit does not reset that history.
A checked server-submitted answer supplies the fallback before the first browser
success. The readonly leaf renders a named semantic `output` with an atomic
polite announcement for both answer and out-of-date state. This state stays in
the current React registry/checked submission; it is not browser storage or a
URL. Expected errors still clear on editing and unfinished work still cancels.


The focused `take-home-result.view.tsx` leaf receives only the checked report
and stale flag. Native `details` supplies keyboard expansion. Money, period,
withholding components and sources are report-owned; the trace's checked JSON
record is read with `Record.get` and optional matching for the recorded scale.
Missing/unrecognised scale values do not imply a threshold choice. Never use
the currently edited form to explain an older answer. Link rendering uses the
platform's URL validity check plus an HTTPS restriction, preserving non-link
source references as text. It does not change the general SourceRef contract
or calculate tax in the browser.


A remembered failure or interruption in AsyncResult is not the outcome of a
new request while `waiting` is true. The policy container therefore hides old
request errors during waiting and displays the finished new failure only.
Form validation errors still appear immediately without sending a request.


The root Website bootstrap also restores the checked API catalogue. Navigation
uses its titles, identities and context rather than a parallel local list.
The additional calculator route selects only its own successful report; the
container receives that checked report and owns form/work/error policy. Each
calculator's description group is retained by React while mounted because
`Atom.family` uses weak references. The registry owns the group's transient
values and execution. Saved submission admission checks calculator identity,
form shape and successful report shape together. No personal figure reaches
navigation, page metadata, browser storage or a query string.

The standard HTML submission routes select their canonical calculator by the
closed page address. Both extra pages display report-owned ledger explanation
and sources. The annual page explains the unresolved retained Medicare limit.
The developer link and `/agents` route lead to actual API documentation,
OpenAPI and calculator metadata; they do not imply finished remote MCP or
content discovery.


The registry provider seeds public settings only. Each feature container uses
`useAtomInitialValues` for its checked saved form before reading form state.
The route still owns transport restoration and result selection; this hook
adds no decoder or transport. Provider options apply only on its first render,
so saved form restoration must not depend on re-supplying those options.
The native fixture uses different saved figures from initial examples and
checks server HTML, hydrated fields, retained reports and no replay.
The Website also has a keyboard skip link, one main landmark, current-page
navigation, spaced controls and visible keyboard focus.


## Native calculation rate admission

The [Website owner](../../apps/web/README.md#native-calculation-rate-admission) captures checked original connection identity and uses the API's binding-only named operation for HTML forms. Browser calculations use public RPC. Both reach the same [calculator-owned allowance](../../packages/calculators/README.md#native-calculation-rate-admission), including separate batch members. Containers show fixed safe guidance with manual retry. This adds no calculation engine, stored figures, analytics identity or URL data to the Website. Private-call local cancellation and remote work limits remain distinct.

T005 now supplies five checked documentation calls at the API/RPC owner. The
actual native pair test compares all accepted page values and exact Markdown
through the documentation client, alongside the retained calculator journeys.
The Website now connects these loaders and renders browser-safe compiled MDX
presentation as described below. Markdown negotiation, share images and replacement qualification must
finish before the retained docs app can retire.

## Replacement Website documentation composition

The Website's catch-all route gets canonical page/navigation values through
five named `WebsiteServerApplication` documentation operations. One server
runtime supplies the scoped native client. The app's documentation HttpClient
materialises a native `Request` with `HttpClientRequest.toWeb`, preserving the
immutable JSON byte body and request signal, then calls the attached binding
receiver. Unknown native Responses are checked immediately. Safe transport
errors discard provider diagnostics. Calculator binding composition stays separate.

The installed generic Fetcher adapter turns that byte body into a stream. A
fresh Worker request performing navigation then page lookup could receive a
stream associated with an earlier request. The actual cold content-mismatch
journey exposed this; preserving the native byte body fixes it. This does not
add a dependency upgrade, custom RPC framing or another runtime.

Native browser page navigation carries a bounded canonical public page address
in `x-taxkit-docs-page`, through a data-free GET server function. Its generated
identity, the search identity and the settings identity are the only admitted function addresses.
GET query or content-type input and invalid page headers reject before the
framework parser. SSR derives the page from its original pathname. A private,
per-request not-found identity preserves only the route's own native not-found
signal; unexpected Causes still reach fixed native failure reporting.

A dedicated route boundary restores encoded outcomes. Direct route and head
consumers restore once and match the checked result. The route keeps the
sidebar/article composition visible; focused readonly leaves receive only
accepted navigation and page values. The app MDX map uses router links for
internal addresses, records navigation focus intent and preserves initial
hydration focus. Its labelled table scroll region has one narrowly scoped
accessibility lint exception for explicit keyboard focus, qualified by real
Chromium keyboard interaction. No broader decoder or runtime permission is added.

The browser-safe MDX loader checks processed Markdown and all frontmatter
against the API page at preload and display. Body/metadata drift or a missing
compiled module becomes fixed recoverable guidance. The native pair proves
actual HTML for every accepted page, native 404, malformed loader restoration,
internal navigation without document reload, phone/keyboard behaviour and
reading without JavaScript. Search and discovery are described below; later T005 work remains open. The
[dated receipt](../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-connection.json)
records local proof; it establishes no deployment or public availability.

The application router supplies the named documentation page loader through
its typed router context, beside the settings and search loaders. The page route consumes
that function without importing its server-only implementation. Standalone
browser checks use the same route tree with supplied loaders; native built
checks exercise the actual server function and private API connection.


### Replacement Website search

The `/search` route has a standard HTML GET form with one labelled `term`
field. Its original URL owns SSR words; browser native GET carries only a
bounded ASCII URI component header. The installed Schema URI codec preserves
Unicode. A separate URL boundary admits one optional term, rejects duplicates
and unexpected keys, trims words and reuses the content owner's bound. The
router's parse/stringify callbacks preserve literal URL pairs, including
scientific numbers, quoted words and duplicate keys, instead of JSON parsing.
The host admits only the generated search function identity and checked wire
header; the native producer decodes that input once. Empty words do not call
search. Nonempty words call the existing named accepted-content operation.

The route restores its encoded result once, matches it locally and passes only
checked values to readonly form/results leaves. It keeps navigation and article
composition visible. Accepted titles and descriptions remain readable without
raw Markdown formatting. Empty, no-match, loading, invalid and unavailable
states have distinct fixed guidance; malformed loader data shares recoverable
unavailable guidance. Results use the existing router-link and heading-focus
policy. The form works without JavaScript. Search addresses are `noindex,
follow`; words are not collected and no second index or calculation value is
introduced. Share images and Markdown negotiation remain separate T005 work.


### Replacement Website discovery files

The Website host admits four closed paths before React routing: `/sitemap.xml`,
`/robots.txt`, `/llms.txt` and `/llms-full.txt`. Its existing server runner calls
`docsDiscovery`, backed by the native API client and `ContentDiscovery` owner.
The backend derives the file from the same accepted catalogue and checks lazy
application settings for actual stage addresses. The Website owns no second
index, authored-source access or live Layer construction.

GET returns checked XML or plain text, UTF-8, a five-minute public cache and
`nosniff`. HEAD has the same headers, explicit 200 and no body. Other methods
return empty 405 with `Allow: GET, HEAD`; query input returns empty 400.
Expected transport/configuration failure gives empty 503 with `no-store`.
Unexpected Causes keep the existing safe host failure policy. The short agent
index links existing public API processed Markdown; the full file preserves
all accepted bodies, including fenced code examples. No personal reports enter
these documents. The [discovery receipt](../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-discovery.json)
owns bounded local observations; availability and old-app retirement require
separate proof.
