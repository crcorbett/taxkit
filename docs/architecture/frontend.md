---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-architecture-owner
last_reviewed: 2026-10-08
review_trigger: frontend runtime, transport, rendering, build adapter, or composition change
---

# Frontend

`apps/web` is the native calculator/documentation Website candidate and the
current local release reader. `apps/docs` is now a retirement tombstone
for verified original-source data and dated provider recovery records.
Local replacement proof does not establish a deployed Website.

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
: Retirement tombstone, not an active workspace. Original source and provider
  recovery identities remain preserved under the retention manifest.

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
setup, source reload and the saved real-CLI check, including documentation.

The current documentation composition is owned by the replacement Website
section below. The retired runtime's original composition remains inspectable
in the [retained source record](../documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json).
Its old runtime proof is history, not current Website or provider qualification.

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

The shared calculator page state uses native `AsyncResult.value` to retain the last success
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
The additional calculator route restores only its own checked server report;
the shared page state owns later browser reports and form/work/error policy. Each
calculator's description group is weakly cached by `Atom.family`. The registry
owns its transient values and execution. The shared page view uses
`Atom.keepAlive` for the root registry's lifetime and its read callback holds
the whole immutable description group. Holding only individual members would
let browser memory cleanup remove the group and create a second description
on a return visit, leaving the old values behind. This retains both page
identity and checked form/outcome parents when a first
React render pauses before subscriptions attach. Once-only initial-value hooks
cannot restore values that registry cleanup has already removed. Page cleanup
still interrupts calculations and browser callbacks; root disposal releases
in-memory snapshots and the scoped client. No browser storage is added.
Saved submission admission checks calculator identity,
form shape and successful report shape together. No personal figure reaches
navigation, page metadata, browser storage or a query string.

The standard HTML submission routes select their canonical calculator by the
closed page address. Both extra pages display report-owned ledger explanation
and sources. The annual page explains the unresolved retained Medicare limit.
The developer link and `/agents` route lead to actual API documentation,
OpenAPI and calculator metadata; they do not imply finished remote MCP or
content discovery.


The registry provider seeds checked public settings and the catalogue. Each
feature container uses `useAtomInitialValues` for its checked saved form on
the owning page form atom before reading form state. Seeding a narrowed writable
projection directly can leave its underlying form at the default amount.
The route still owns transport restoration and result selection; this hook
adds no decoder or transport. Provider options apply only on its first render,
so saved form restoration must not depend on re-supplying those options.
The native fixture uses different saved figures from initial examples and
checks server HTML, hydrated fields, retained reports and no replay. A focused
browser fixture uses separate server/client registries, deliberately exercises
an unobserved first render and cleanup, then waits for client mounting and idle
cleanup before asserting the restored guidance and next explicit request.
The native caller also leaves the annual page, forces actual browser garbage
collection and returns. Visible fields, the shared result and the retained stale
answer must still agree without another RPC request.
The Website also has a keyboard skip link, one main landmark, current-page
navigation, spaced controls and visible keyboard focus.


## Page-owned browser tools

`WebsiteBrowserToolkit` describes the five visible calculator commands separately
from the remote tools. Its arguments reuse the owning form Schema, its catalogue
uses the API contract, and its results reuse `WebsiteCalculatorViewState`.
That state also supplies the containers' readonly form/report/error presentation.
Routes restore server outcomes; no route selects an independent client answer.

The browser family holds one checked calculator description and uses the existing
`calculatorRuntime.fn` registration command. Containers explicitly start it and
send `Atom.Interrupt` on cleanup. Relying on deferred registry garbage collection
for registration cleanup allowed the next page to collide with old tool names.
The registration scope's `FiberSet.makeRuntimePromise` is the single callback
bridge; it creates no independent ManagedRuntime or backend client. Each native
method retains its original receiver and its own abortable two-second limit.

One checked request object identifies each visible attempt. The handler waits for
its fresh native Atom result, with a subscription owned by that invocation's
scope. Edit, caller abort or page exit interrupts it. Cleanup cancels unfinished
work only while that exact request still owns the page; no old callback can return
a newer answer or cancel a newer manual request. The registration holds the
attempt atom while idle so garbage collection cannot erase this identity.

Installed Effect 4.0.0's empty Struct accepts excess keys. No-argument tools
therefore decode unknown input once through native `Tool.EmptyParams`; host
metadata advertises that checked empty-record shape. Native Toolkit owns ordinary
JSON result encoding. The host boundary encodes only fixed safe failures.
Requalify these choices when the receiving Effect or native browser contract
changes. The [Website guide](../../apps/web/README.md#visible-calculator-browser-tools)
and [dated receipt](../documentation-audit/clean-slate-foundation/2026-10-07-browser-calculator-tools.json)
separate actual caller evidence from autonomous-agent or deployment claims.

## Native calculation rate admission

The [Website owner](../../apps/web/README.md#native-calculation-rate-admission) captures checked original connection identity and uses the API's binding-only named operation for HTML forms. Browser calculations use public RPC. Both reach the same [calculator-owned allowance](../../packages/calculators/README.md#native-calculation-rate-admission), including separate batch members. Containers show fixed safe guidance with manual retry. This adds no calculation engine, stored figures, analytics identity or URL data to the Website. Private-call local cancellation and remote work limits remain distinct.

T005 supplies five checked documentation calls at the API/RPC owner. The
actual native pair test compares all accepted page values and exact Markdown
through the documentation client, alongside the retained calculator journeys.
The Website now connects these loaders and renders browser-safe compiled MDX
presentation as described below. The old app's retirement and original-source
recovery record are retained separately; this does not establish provider retirement.

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
introduced. Share images use the build-only owner described below.


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


### Replacement Website Markdown

A named native HTTP policy composes the HTML Effect inside the existing server
runner and request scope. It checks the original pathname through the content
owner's public page codec and delegates body lookup to the captured
`docsMarkdown` operation. It builds no live Layer or source fallback. Explicit
`.md` files and same-page Markdown negotiation use the same accepted body. The
article and alternate head link point to the Website file; canonicals remain HTML.

The ingress-only Accept Schema bounds characters, ranges and parameters, covers the
whole token/quoted-string field and applies quality and specificity. Zero
excludes a representation; HTML wins equal preferences and missing preference.
HTML responses retain existing Vary fields and add Accept. Markdown GET and
explicit empty 200 HEAD share UTF-8/cache/`nosniff`/Vary/canonical headers.
Invalid/unacceptable fields, file methods, Markdown queries and missing or
unavailable content have empty safe 400/406/405/400/404/503 responses.

Exact HTTP/test decoding permissions admit no encoder, runner or nearby leaf.
Native functions, calculator form paths, search and agent landing pages retain
their existing policy; temporary calculation reports never enter Markdown. The
[dated Markdown receipt](../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-markdown.json)
owns actual built content/header/browser observations and their limits.

### Replacement Website share metadata

The checked page and Website settings supply canonical and explicit Markdown
alternate links, Open Graph/Twitter cards and Schema-encoded TechArticle data.
The named `apps/web/src/lib/docs/metadata.egress.ts` output boundary escapes
script-breaking characters after native JSON encoding. It invents no authorship,
publisher or dates. The shared `docsImagePath` maps that same public page to its
static 1200 by 630 PNG. The route consumes this checked output; it adds no decoder,
renderer or runner. The Website README owns generation and build prerequisites.


## Calculator collection preference

The existing calculator Atom runtime composes a native HttpClient policy Layer
that reads Do Not Track at each outgoing request. It carries only allow/deny to
the backend owner, and catches missing, refusing or malformed browser preferences
as denial without blocking calculation. Visible browser tools share this same
client. HTML calculation derives its policy from the original request in the
server client, using the analytics package’s single header boundary. It does
not retain the first visitor’s choice when the server client is reused. No
browser identity, storage or duplicate calculator event is added.
The [Website owner](../../apps/web/README.md#calculator-collection-choice) routes
the exact built-pair evidence and pending pageview sender work.

## Browser event relay

The existing Website runtime also composes the private POST `/ingest/e/` relay,
the narrow provider-ingress exception agreed in the SPEC. It adds no domain
operation or extra Worker. Off refuses without a key; invalid enabled settings
fail only this route. The [Website owner](../../apps/web/README.md#browser-event-relay)
owns its exact origin, query, media-type, complete-byte, deadline and reply policy.
Browser delivery, the event allowlist, real projects and stored-event readback
remain separate; composing this relay enables none of them.
