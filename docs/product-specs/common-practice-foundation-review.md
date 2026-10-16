---
document_type: product-spec
lifecycle: current
authority: supporting
owner: taxkit-architecture-owner
last_reviewed: 2026-10-13
review_trigger: agreed direction, Common Practice implementation, upstream support or migration scope changes
---

# Common Practice foundation review

Use Common Practice's application structure and ordinary development workflow.
Prioritise the Cloudflare Website and API, remove every Alchemy patch, and remove
TaxKit's separate receipt and approval machinery. Keep Bun as a supported,
secondary host over the same calculation packages.

```text
Website first HTML -> server runner -> native HttpApiClient -> private API binding
Website navigation -> shared registry -> native AtomHttpApi client -> public API
Public GET/HEAD -> version-scoped native Cloudflare cache (eligible responses only)
Local Website setup -> encoded root settings -> retained browser configuration
Checked API operations ---------------------------------> calculations -> rules/core
Machine HTTP/RPC/MCP -----------------------------> API -> calculations -> rules/core
Local SDK ----------------------------------------------> calculations -> rules/core

Native API declaration -> Website declaration
                    API address + private binding -> Website
No reverse Website address dependency; publication links use Production
Git commit/PR -> ordinary checks -> native Alchemy -> deployed Website/API
                               Doppler supplies stage-specific secrets
```

The comparison uses TaxKit commit `f899c963f463d2283517e908febcfa3ebb1dd442`
and current Common Practice main `6dc08581d1ad79b06853fe3721a5e6124d2989a1`.
Commonplace `development-workflows` 0.7.1 is published and installed, verified
against its [published release](https://github.com/crcorbett/commonplace-plugins/releases/tag/%40commonplace/development-workflows%400.7.1)
on 13 October 2026. Its native HTTP/Atom and caching guidance supersedes the
11 October RPC loading proposal and copied client-service approach. Earlier
Common Practice comparisons remain research history, not the proposed target.
This document and its [plan](../exec-plans/active/common-practice-foundation-review.md)
replace the large, uncommitted audit packet created during this review.

On 13 October 2026 Cooper authorised implementing this design, merging it into
`main` and deploying the Preview and Production Website/API pair locally with
native Alchemy and Doppler. The [plan](../exec-plans/active/common-practice-foundation-review.md)
records implementation progress and the remaining limits. Common Practice is
read-only. Earlier wording below that describes a review-only stage is the
history of how these choices were agreed.

## Agreed direction

| Choice | Direction |
| --- | --- |
| Website calls | Updated proposal: native HTTP clients use the private same-stage binding for server rendering and the public API directly in the browser. Use existing GET reads and calculation POSTs; native AtomHttpApi shares the browser factory/registry. Remove copied client services, loader request atoms and generated Website server functions. Existing machine RPC stays supported. |
| Hosts | Cloudflare first. Keep Bun and Cloudflare, with shared packages independent of either. Preserve Bun's current HTTP coverage; adding RPC/MCP to Bun is outside this change. |
| Alchemy | Zero Alchemy patches, including replacement monkeypatches, copied planner code or a custom provider carrying the same fixes. Redesign the declarations that currently need them. |
| Public HTTP helpers | Q5 agreed replacement of generic-callback and callable Layer helpers. Native generated endpoint clients already provide named checked operations: use them directly, with static host composition, rather than copying methods into another service. Update callers/examples and normal package versioning together. |
| Browser access and publication links | Q6 agreed Common Practice's public, credential-free browser API policy and Production canonical/publication links on 13 October. Keep actual API endpoint addresses stage-specific and each host's own native URL. |
| Public response caching | Q7 agreed seven-day Cloudflare freshness on 13 October for eligible public documentation and fixed metadata. Browsers recheck; cache storage is version-scoped. Personal calculation inputs/results, sessions, errors and Set-Cookie responses remain uncached. |
| External MCP tools | Q8 agreed native Effect: allow Origin-less desktop/server clients and listed browser sites. Initially list `https://taxkit.dev`; add other sites only for a known need. No Effect predicate patch or Preview Website address dependency. TaxKit's on-page tools remain independent. |
| Browser loader freshness | Q9 agreed one-minute reuse of public documentation/metadata through native TanStack settings. Personal submission/results and live local configuration remain outside that public reuse policy. |
| Development and operations | Ordinary commits, pull requests, checks, GitHub Actions, native Alchemy and native Doppler, following Common Practice. Remove receipt packets, duplicated approval records and checks whose only purpose is to verify that paperwork. |
| Operational information | Allow fixed safe details such as app, stage, route category, duration and safe failure category. Exclude salaries, facts, results, calculation traces, raw URLs, request bodies and raw errors. PostHog remains postponed. |

The host and privacy choices are also recorded in [ADR 0003](../adr/0003-support-independent-api-hosts.md)
and [ADR 0004](../adr/0004-limit-operational-observations.md). The earlier
[shared Axiom dataset choice](../adr/0002-reuse-shared-telemetry-datasets.md)
remains: reference the existing three physical datasets, with TaxKit-owned scoped
access and destinations. The public access/link choice is recorded in
[ADR 0005](../adr/0005-public-api-and-production-publication-links.md).
No collection is enabled by this review.

## What to copy from Common Practice

| Area | Common Practice source | TaxKit adoption |
| --- | --- | --- |
| Server execution | `apps/web/src/lib/runtime.server.ts` | One frontend server runtime, constructed in the application. Services and tax packages never start their own runtime. |
| Browser state | `apps/web/src/lib/runtime.client.ts`, `router.tsx`, `routes/__root.tsx` | One application runtime factory and browser registry, created before loaders and shared with React. Native AtomHttpApi uses that factory. Keep form commands, retained configuration and cancellation. |
| Website loaders | `apps/web/src/lib/seo/page.loader.ts` | Local server/browser branches call native clients through one required host bridge. TanStack owns results and freshness; local settings need no Website data endpoint. |
| Native clients | `packages/http/src/api.ts`, `apps/web/src/lib/api/binding.adapter.layer.ts`, `runtime.client.ts` | Native HttpApi contracts and generated clients own encoding, decoding and declared errors. Keep adapters only for real tax/workflow policy or checked host conversion. No replica client service. |
| Native caching | `apps/api/src/deployment/cloudflare/worker.ts`, Website `build/cloudflare.ts`, `packages/http/src/publishing.policy.ts` | Native version-scoped cache declarations and a small public-response/header policy. No global Cache API wrapper or custom cache runtime. |
| Private Cloudflare calls | `apps/web/src/lib/api/binding.adapter.layer.ts` | Put Cloudflare binding conversion in one Website-owned adapter. Use native Alchemy conversion where it preserves caller trust and complete reply handling. |
| Resource declarations | `alchemy.run.ts`, `apps/web/src/lib/build/cloudflare.ts`, `apps/api/src/deployment/cloudflare/worker.ts` | Declare the API before the Website. Website uses the API's actual address and private binding. Keep deployment code at the app/infrastructure owners. |
| Secrets | `packages/infrastructure/src/secrets.ts` | One native source list: Doppler, ignored `.env` overrides, disabled shell-value fallback. Keep TaxKit's own project, configs and credentials. |
| Commands | Root `package.json` | Short commands calling native Alchemy directly. Keep one understandable verification command. |
| Automation | `.github/workflows/checks.yml`, `preview.yml`, `production.yml` | Checks on PR/main; PR previews and close-event cleanup; manual main-only Production. Native dry-run/deploy, small public smoke checks and native Production drift. |
| Everyday records | Git commits, PRs, workflow logs and Alchemy state | Use these ordinary records. No additional repository receipt files or approval-envelope system. |

These are paths within Common Practice, not personal checkout paths. Reuse the
approach and required code, not its project names, access tokens or provider IDs.

Common Practice still runs build, formatting, lint, types, Effect checks, tests,
unused-code and documentation checks. Its workflow does not support a claim that
all verification disappears. TaxKit should remove checks of ceremony while
keeping tests that catch wrong tax answers, broken public contracts or a broken
Website/API.

## Complete calls and the HTTP/RPC comparison

A host is the environment running the API, such as Cloudflare or Bun. HTTP, RPC
and MCP are different ways to send a request to that same API. The local SDK is
a library that calculates inside the caller's program.

| Call | Current path and behaviour to preserve |
| --- | --- |
| Browser calculation | Page container -> existing Atom command -> native public HTTP calculation POST -> API handler -> `PublicCalculatorService` -> catalogue/fact checks -> Australian rules/Core -> checked report -> the same Atom state and rendering leaf. Editing or leaving the page cancels pending browser work. |
| Server HTML form | Website checks the 64 KiB POST -> native HTTP client -> trusted private API method carrying the checked original caller identity separately from JSON -> the same calculation service -> checked submission data. Keep working without JavaScript. |
| Machine HTTP | HTTP declarations decode requests with the owning Schemas -> handler -> the same calculation service -> existing status/error envelope. Native generated clients use these declarations directly, without a copied method service. |
| Machine RPC | Revision-four checked operations -> the same service. Keep the current encoded replies and safe named failures. |
| Remote MCP | API tool definitions reuse the owning Schemas and shared service. Keep current request/cancellation ownership and Cloudflare session support. |
| Local SDK | Checked in-process request -> the same calculation service. Effect callers own their services; the Promise-facing SDK privately owns its necessary runtime and closes it. It does not become a network SDK. |

| Comparison | Common Practice | TaxKit decision |
| --- | --- | --- |
| Website transport | Public reads now use native HTTP GET/HEAD contracts; SSR uses the private binding and browser calls the API directly. Owned publishing RPC and copied client wrappers are removed there. | Use TaxKit's existing HTTP contract for docs/catalogue/metadata and calculation POSTs. Keep machine RPC/MCP contracts; removing them is not part of copying Website loading. |
| Named operations | Native generated endpoint methods already check declared inputs, replies and errors. | Call those methods directly. Keep only real input/report correlation, bounded transport and feature error policy; do not add a replica Content or CalculatorAccess client service. |
| Errors and serialisation | Typed errors are handled once at the page/tool/HTTP boundary; native TanStack serialises successful views. | Preserve existing HTTP status/error envelopes and RPC errors. Retire Website-only success/error envelopes and repeat reply decoding; retain owning domain Schemas and necessary view conversion. |
| Original caller identity | Ordinary public content reads need no anonymous-calculation admission policy. | Keep the trusted private calculation capability. Extend its exact POST admission from `/rpc` to the canonical HTTP calculation path without accepting caller keys from JSON or forwarded headers. |
| Cancellation and bounds | A shared native client remains available while each loader call receives its own AbortSignal. | Retain request cancellation, ten-second complete-call budget, 2 MiB response cap and no automatic operation retries. The trusted private method still cannot transmit a remote AbortSignal; its five-second work budget remains. |
| Response variants | One checked helper relates a selected page format to the native decoded response. | TaxKit's current docs page and Markdown are separate endpoints; do not invent a format wrapper. Keep calculation ID/report-kind and other genuine request/reply checks. |
| Package consumers | Common Practice is private/source-oriented. | Preserve TaxKit's compiled exports, public HTTP/RPC/MCP contracts and packed SDK consumers. Q5 helper signatures change through normal Changesets; native client exposure is not an unchecked SDK escape hatch. |

The updated transport recommendation follows the new full comparison. Q6 now
selects public credential-free HTTP/RPC browser access for valid HTTP(S) origins
and fixed Production publication links. Admit actual native CORS headers, retain
caller/rate/body/work policies, and keep each stage's API endpoint addresses.
Q8 separately selects native MCP origin admission; WebMCP registration stays
bound to the actual Website host.

## Native HTTP loader and client migration

TaxKit installs Effect/Atom React 4.0.0, patched Alchemy beta.80, TanStack Start
1.168.60 and Router 1.170.41. Common Practice qualifies its implementation at
Effect 4.0.2 and unpatched Alchemy beta.81. Installed source already supplies
AtomHttpApi.Service's runtime-factory option and the relevant native client APIs.
Matching upstream clones inform the design; neither this comparison nor the
published plugin authorises an upgrade.

| Website need | Native TaxKit owner and migration |
| --- | --- |
| Calculator catalogue/metadata | Existing `TaxKitApi.calculatorApi` GET endpoints and owning Schemas. Root catalogue remains domain data, distinct from local settings. |
| Docs page/navigation/search | Existing `TaxKitApi.content` GET endpoints with checked path/query inputs. Preserve accepted-only content, full page/metadata before rendering, Unicode/empty search behaviour and MDX presentation. |
| Markdown | Existing checked text endpoint. Reuse API-owned finished responses/negotiation where possible; keep correct media type, status and GET/HEAD behaviour. |
| Discovery files | No current HTTP endpoint. Add narrow native API GET/HEAD handlers for the existing checked discovery paths, reuse the existing formatter and bounded document Schema, and forward the finished reply through one Website binding request. Keep the machine RPC operation unchanged; add no second renderer or browser API proxy. |
| Calculation | Existing native POST `/api/v1/calculators/:calculatorId/calculate`. Keep calculator-specific input decoding, explicit submit, returned ID/report-kind checks and stale-answer/interruption rules. Calculation data remains uncached. |
| Root configuration | Local checked Website settings and any Website-owned cookie. Keep invalid-setting recovery and retained configuration; do not add a settings API call. |

`loaders.ts` uses local `createIsomorphicFn` branches and matching runtime import
owners. Remove settings/page/search `createServerFn` wrappers, generated path
allowlists and loader headers together. The server uses one `runtime` and a
static Layer holding `HttpApiClient.make(TaxKitApi)` over Alchemy's public
`fromCloudflareFetcher`/`toHttpClient` conversion. A native client value may have
a host-owned service tag for acquisition; it must not be a copied method map.
Keep selected checked Config and the original binding receiver. Calculation
uses the existing trusted `calculatorRequest` capability after its exact route
admission is extended; ordinary binding fetch cannot supply caller identity.

Move the existing browser composition to `runtime.client.ts`. Declare the native
`ApiClient` with `AtomHttpApi.Service`, `runtime: browserRuntime.factory` and the
existing FetchHttpClient Layer. Use a checked baseUrl or native `httpClient(get)`
configuration hook. Confirm that credentials/redirect settings reach execution
in installed 4.0.0; do not assume the qualified 4.0.2 Layer's context handling.
Keep checked configuration atoms alive and local optional services independent.

Create one registry in `createLoaderRegistry` before router loaders run. React
uses that exact registry through `RegistryContext.Provider`; SSR uses an isolated
RegistryProvider. Declare the retained native runtime atom once, for example
`const apiClientRuntime = ApiClient.runtime.pipe(Atom.keepAlive)`, then read it
with registry-backed `Atom.getResult(apiClientRuntime)` and `Context.get(ApiClient)`.
Do not repeat the keepAlive construction per loader: it creates another retained
atom object rather than reusing the existing registry entry.
The one browser Promise bridge calls generated methods directly, providing the
registry and AbortSignal. Server loaders combine router/request signals. Native
client retention must survive idle navigation and React development replay;
final root unmount disposes outstanding work once.

TanStack owns loader results, preload and freshness. Remove the earlier proposed
page/search/catalogue request atoms, resource-client replicas, success/error
loader envelopes and second result cache. Component-owned reactive remote reads
may use native ApiClient.query/mutation. Native query helpers can turn transport
or Schema errors into defects, so qualify recovery on the actual chosen path.
Retain the calculator's real local form/command state, not a parallel route cache.
Migrate existing `websiteCatalogueAtom` consumers to readonly root-loader data
or a genuinely component-owned native query; do not duplicate route results
in configuration atoms. Browser tools can use the same native client directly.
Plain successful views use native TanStack serialisation; convert only values
requiring an explicit checked view. Translate typed failures once to native
not-found/error handling with fixed safe diagnostics. Public machine envelopes
are existing contracts and are not removed with Website-only envelopes.

Wrap the entire generated endpoint call in the feature's Effect timeout,
including headers, body consumption and decoding; retain TaxKit's named timeout
projection. A timeout around an unconsumed HttpClient response covers header
acquisition only; its transformResponse callback can also consume the body.
HttpApiClient/AtomHttpApi transformResponse runs after headers, so timing that
callback alone misses header acquisition. Bound the complete generated call.
A necessary two-MiB HTTP adapter must
preserve original status, headers, streams/cleanup and declared 4xx/5xx bodies.
The old bounded RPC adapter filters failed statuses and reconstructs a default
200 response; copying it into HTTP would break native error decoding. Keep only
this meaningful body policy, not custom JSON codecs or blanket Cause recovery.

Keep existing machine RPC JSON framing/revision and per-operation receive-loop
ownership. The Website HTTP migration needs no NDJSON conversion or RPC package
removal. Preserve the no-JavaScript form, body-size/read/work limits, Markdown,
discovery, browser tools and public contracts through focused current tests.
Q9 selects `defaultPreload: "intent"`, `defaultStaleTime: 60_000` and
`defaultPreloadStaleTime: 60_000` for public documentation/metadata using native
TanStack loading. Keep explicit route exceptions for live local settings and
personal submission/results. Do not apply public freshness to the root's
no-JavaScript calculation submission merely because it travels beside catalogue
data. Test hover, return before expiry, return after expiry and recovery from
failed reads. This one-minute browser policy is separate from the CDN's seven days.

## Seven-day public caching

Q7 is agreed on 13 October: use native version-scoped Cloudflare cache for
eligible public documentation and fixed calculator metadata. The API declares
`yield* Cloudflare.cache({ crossVersionCache: false })` before its plan-only
return; Website.Vite declares `cache: { enabled: true, crossVersionCache: false }`.
These APIs exist in installed beta.80 and the beta.81 clone; runtime/header
behaviour still needs TaxKit checks. There is no owned caches.default/open/match/put
implementation, cache runtime or provider patch.

For eligible public successes use browser `Cache-Control: public, max-age=0`
and `Cloudflare-CDN-Cache-Control: public, max-age=604800, stale-if-error=0`.
Seven days belongs to Cloudflare; browsers recheck. TanStack freshness remains
separate, and cached public content can be evicted earlier. Share only responses
that are identical public content for the relevant checked request variant.

Stricter headers have a purpose, not an approval role. `private`/`no-store`
protect personal calculation inputs/results, authenticated/session data,
failures, malformed settings and responses setting cookies. Keep those exclusions
and CDN no-store where necessary; a Cloudflare-specific public header must not
override a private browser header. Analytics/credential operations also remain
uncached. The current authored no-store declarations chiefly protect error and
analytics replies; no blanket no-store on successful public docs was found.
Public Markdown/discovery currently use a five-minute browser header. Replace
that public policy with the agreed browser rechecking/seven-day CDN policy for
eligible successes. Remove other obsolete public-read restrictions if found,
while retaining purposeful private/error/cookie exclusions. Use one small
eligibility/header decision rather than duplicated precedence or TTL parsing.

Public GET selectors use paths/query fields, not GET bodies. Keep CORS
`Vary: Origin`, negotiated representation `Vary: Accept` and any qualified public
appearance `Vary: Cookie`. Cookie variation alone never makes personal data
shareable; malformed or personal variants stay private. Preserve native status,
media type, headers, cookies, body streams and cancellation in response adapters.

Include authored content in both Workers' build/memo inputs without importing
backend code into Website, and deploy each stage's pair together. New versions
start separate caches; deployment activation is not atomic. During authorised
implementation, use consumed repeated public requests to observe HIT/Age,
exercise format/Origin/Accept/Cookie variants in both orders, check private/error
responses, and prove a Preview content-only change refreshes both JSON and HTML.
Restore the fixture before Production. A local cache test or binding read does
not establish public edge reuse, and these future checks require no new receipt
system. See [Cloudflare header precedence](https://developers.cloudflare.com/cache/concepts/cdn-cache-control/)
for why browser and CDN restrictions must agree on private responses.

## Strict Effect design corrections

The deeper review uses the published 0.7.1 strict Effect skill and its service,
Config, error, lifetime, transport and React references, alongside the matching
upstream clones. Common Practice is a useful implementation reference, but some
of its code and copied lint rules predate those requirements. Copy its ownership
approach; apply the current shared rules rather than reproduce an old exception.

A service is the checked list of operations a caller can use. A Layer is a
recipe that supplies an implementation and its dependencies. Declaring a Layer
does not start it; the app builds it for the lifetime it needs.
Schema checks a value's shape and meaning; Config reads settings; Scope owns
when resources must be released. An Alchemy Output is a resource value that
Alchemy resolves during deployment or local development.

| Owner | Required design |
| --- | --- |
| Domain contracts and representations | Calculator/content owners keep the Schemas, branded identities and named expected errors. Decode external values once. Reuse whole-record checks as well as fields; encode when values leave the process or enter storage. Preserve meaningful missing/undefined distinctions with the existing Option codecs. Pure tax arithmetic and immutable mappings remain plain functions. |
| Public service methods | Named `Effect.fn("Service.operation")`, including test implementations. Acquire transport and fixed settings when building the service, so normal public operations need no extra service requirements. Short private pipelines stay plain functions; dependent private generators use `fnUntraced`. No generator or extra file just to wrap one step. |
| Static Layers | Keep owned host/backend Layers static, including the retained public RPC implementations and Website composition. Supply checked dependencies through Requirements, native Layer.succeed and checked Config. Native AtomHttpApi configuration callbacks remain native composition, not owned factories. Remove HTTP helper factories without replacing them with a replica client service. |
| Checked transport clients | Native HttpApiClient and AtomHttpApi endpoint methods own HTTP checking. Do not copy them into domain/client replicas. Preserve existing machine RPC clients and genuine feature/host policies with their owners. |
| Native API host | Build shared services once in the Worker instance, keep each request's Scope and cancellation native, and keep streams in the consumer's Scope. Do not capture a request, event tracer or request Scope in an app-wide service. No ManagedRuntime around the native Worker. |
| Website host | Keep the existing one server runner and one browser Atom graph. Move raw Cloudflare reads into a separate live ingress Effect; select only Website-owned keys and use native `reifyBoundConfigProvider`. Do not feed the whole environment into Config or inspect Alchemy's protected markers manually. Keep the original private binding object and its existing checked capability contract. |
| Frontend calls | Routes use native loader outcomes and one necessary checked view conversion; containers own commands/cancellation and leaves render readonly values. Native clients decode replies once. Import runtimes through matching environment branches, preserve root registry/initial values and inspect the real browser bundle. |
| Failure handling | Expected failures use the named error channel. Unexpected bugs and caller cancellation retain their identity until the host handles them. Do not convert every Cause into an unavailable result. Native HTTP mapping still owns missing-route, abort and server-failure responses. |

Two current reply adapters need correction. The private RPC buffer in
`apps/api/src/worker.application.ts` catches every Cause and returns 503; the MCP
buffer in `apps/api/src/mcp-response.boundary.ts` preserves interruption but
hides other unexpected defects. Recover only the named body-read, size and
deadline failures those adapters own. Pass cancellation and unexpected defects
to native handling with a safe reporter.

That does not mean removing every `catchCause`. Website host loaders and the
in-process HTTP adapter deliberately use native `HttpServerError.causeResponse`
to map the host response. Keep that narrow use. The current RPC client also
correctly marks only failure inside the native reply decoder and translates
that marker into its invalid-response error; unrelated Schema defects stay
unchanged. Recheck that native codec behaviour when upgrading Effect.

At the API boundary, provide the checked `ErrorReporter.CurrentErrorReporters`
to the outer native `safeHttpEffect` mapper. A reporter supplied only inside a
route does not prevent the host's raw-Cause fallback. Capture only that reporter
set, preserve the incoming request Scope, and keep its required synchronous
callback to fixed safe fields with an empty Cause. No extra runner, ambient
clock, raw error dump or request-wide Layer wrapper. This is part of safe host
composition, even while exported logs and traces remain off.

The existing ten-second complete-reply limit, 2 MiB response cap, request limit,
manual retry and per-operation RPC acquisition remain. A static service Layer
does not require an app-wide RPC receive loop. Keep that loop inside each call's
closing Scope; the shared capacity pool belongs to the app instead.

Read fixed API settings while building the runtime application after the native
`ALCHEMY_PHASE === "plan"` check. Alchemy supplies resolved bindings and builds
that application on the first real event, before its handler, then reuses a
successful build. Put address-dependent provided Layers after that check too;
a check inside an Effect already wrapped in `Effect.provide` is too late for
those Layers. Preserve binding/RPC/telemetry/secret registration during the
planning phase, with explicit native env declarations where reads are skipped.
Use the native bundled runtime guard for deployment-only settings; no copied
host is needed. Keep invalid-setting failures typed and preserve the intended
safe client response at the host.

TaxKit's current cached Config reads once on first use. It does not reread and
decode settings on every request, and that extra delay is not required by the
native host. Moving it into application acquisition is a composition change,
not a reason to remove startup checks or guess planning addresses.

Keep the existing `PublicCalculatorService` used by the local SDK. HTTP, machine
RPC and MCP handlers call the final service after admission, capacity and
analytics. Native HTTP clients consume the endpoint contract; they do not need
the previously proposed `CalculatorAccess` alias/replica contract. Keep current
error Schemas and wire projections with their actual owner. Move a Schema only
for demonstrated semantic reuse, not to force local and remote clients into an
identical method map. The SDK keeps its narrow in-process contract.

Name the underlying public calculator and engine operations, not only their
bounded wrappers. The local SDK currently misses the canonical operation names.
Named operations do not authorise exporting their arguments, reports or
calculation traces.

Correct CORS independently of exported tracing. The current Website RPC clients
disable native tracing at execution and acquisition, and the README calls this
CORS containment. The current Alchemy skill expressly rejects disabling tracing
to avoid preflight. Remove that workaround, retain named operations, and admit
the actual native `b3` and `traceparent` headers alongside TaxKit's content and
collection-policy headers. Keep the selected checked Origin policy and test
the real outgoing request/preflight. Header propagation enables no exporter;
exported trace and platform trace channels stay off. Native HTTP spans can carry
URLs and, in older versions, headers even without explicit annotations, so the
safe-field policy still applies to any future collection.

The public HTTP helper replacement is now agreed. Current exports include
`createTaxKitApiClient`, `withTaxKitHttpApiClient`,
`createTaxKitApiClientLayer` and their old aliases, and public examples use them.
Q5 agreed replacing these helpers and updating callers through a normal
Changeset. Published 0.7.1 clarifies that generated native HTTP clients already
provide named checked operations; a duplicate client service is unnecessary.
Examples should use the exported HttpApi contract and native client APIs, with
static host composition and genuine feature policies only. The generic callback
and owned Layer-factory helpers retire without a temporary compatibility path.
This clarifies the implementation of Q5; package code has not yet changed.

The Layer change also covers public `TakeHomeScenarioLiveFromInput` and
`AnnualTaxScenarioLiveFromInput`, used by calculator composition and package
consumers. Keep their checked scenario inputs and tax behaviour, but migrate
callable Layer helper signatures through normal package/versioning work. Do not
claim every helper signature can stay unchanged while enforcing no factories.

## Lint that enforces the design

The published 0.7.1 portable Effect asset contains nineteen rules, including
five new native request/cache checks. Current Common Practice uses that asset;
TaxKit's executable skill copy still carries the older eleven-rule set. Vendor
the published asset byte-for-byte with a short provenance note, and configure
real TaxKit paths instead of copying Common Practice's product names.

Use one unchanged copy of the current portable asset under
`tools/oxlint/vendor/strict-effect`, with a short source/version note. Keep only
useful TaxKit extensions and adapt Common Practice's ownership checks to actual
TaxKit paths. Do not edit installed plugin caches or add a digest/receipt system.
TaxKit's newer Oxlint 1.86.0, Ultracite 7.12.2 and Effect tooling 0.48.0 do not
need downgrading to Common Practice's versions to adopt its approach.

| Check | Adoption and limit |
| --- | --- |
| Static Layers and runtime calls | Enable current portable rules across owned apps, packages, tools, tests and root configuration. Keep exact server/browser/SDK runtime paths. The SDK's private Promise runtime remains its public library adapter. |
| Website client ownership | Configure the portable Website boundary for the exact runtime/factory/registry owners and native HTTP construction. Reject generated Website server functions, extra registries/runners and backend imports. Legitimate HTTP clients, download/discovery adaptation and analytics remain allowed. |
| Native loader and client ownership | Enable `strict-effect/no-loader-request-state` and `strict-effect/no-native-client-replica` at real loader/client owners. Reject loader request/query caches and locally inspectable copied client methods; retain configuration/service atoms, component queries and meaningful feature policy. |
| Native cache and Website paths | Enable `strict-effect/native-cloudflare-cache` on native Cloudflare owners and `strict-effect/website-data-proxy` for the actual public API paths. Keep native cache declarations and finished downloads/discovery valid; forbid a second global Cache API implementation or Website data proxy. |
| Checked response reuse | Enable `strict-effect/checked-page-response` only where an existing complete helper already verifies the selected variant and response. TaxKit's separate page/Markdown endpoints are not a reason to invent such a helper. Preserve unchecked-ingress and calculation correlation checks. |
| Host and private module ownership | Configure `module-ownership` for Alchemy, Cloudflare bindings, private SDKs and authored/generated content. Include re-exports, type imports and dynamic imports. Current TaxKit host checks miss Alchemy and `cloudflare:workers`. Source checks do not establish bundle contents. |
| Promise and HTTP adapters | Exact file/operation permissions only. Use native Alchemy binding conversion first; retain custom handling only for the actual trusted-call/reply policy it cannot supply. Keep TaxKit's checked error mapping for necessary `tryPromise`. No exemption for every Layer file or test. Extend raw-fetch restrictions across owned source. |
| Decoding and transport restoration | Retain TaxKit's lexical boundary rules and their effective two-pass suppression protection. They cover useful cases beyond the portable rules. A comment labelled `SAFETY` does not authorise a type assertion. |
| State and collections | Keep portable restrictions plus TaxKit's stronger alias/Object/Reflect write checks. Managed state uses Effect Ref/collections; a pure immutable fold does not need a Ref. Native Alchemy `Output.map` and `Namespace.push` already have targeted handling; no broad exception is needed. |
| Package imports and exports | Derive ownership from real nested workspace manifests, using the longest matching package root. Check exported subpaths and frontend-to-backend direction. The scaffold's one-level package scan would merge `packages/api/http` and `packages/api/rpc` incorrectly. Preserve source/types/default export conditions and SDK packed-consumer checks. |
| Named operations and Schema ownership | Adapt to actual TaxKit service owners. Common Practice's old instrumentation rule names obsolete services, so copying it does not enforce TaxKit methods. Type checks and focused review still establish Schema-derived contracts; a regex cannot establish this by itself. |
| Config and absence | Use owning `Config.schema` declarations for constrained settings. Native `Config.Boolean` is valid for a plain flag. Fix old template scans that miss current spellings and nested packages. Handle Option explicitly; native protocol/compiler nulls may stay inside their adapters. |
| Actual Effect diagnostics | Replace the single compatibility example with strict diagnostics over the real app/package/tool projects and root Alchemy entry. Elevate meaningful diagnostics such as floating Effects and missing service dependencies, following Common Practice. Keep ordinary TypeScript checking. |

`check:effect-language-service` currently checks only
`tools/effect-language-service/compatibility.ts`, which contains one successful
Effect example. The base config also excludes warnings/suggestions from the
compiler's failing exit. That checks tool compatibility, not application-wide
Effect correctness.

Use the existing actual-Oxlint fixture suite to show rejection and acceptance
for current spellings, aliases, shadowing, exact adapters, neighbouring files,
unknown dynamic imports and nested packages. Remove duplicates only once the
retained rule covers their useful behaviour. No separate qualification ledger
or second architecture harness is needed. Keep established checked method
signatures; Common Practice's blanket one-object input rule is not a reason to
break valid TaxKit branded-value or zero-argument operations.

## Cloudflare first, with host-independent packages

Use Effect services and Layers to describe shared operations and supply their
implementations. Core, rule, calculator and transport packages must not import
Cloudflare, Alchemy or Bun server code, interpret trusted Cloudflare headers, or
run Effects themselves. The SDK's private Promise adapter is a justified public
library execution boundary.

The API app owns the host adapters. Cloudflare supplies native request context,
private bindings, rate services and sessions. Bun supplies its HTTP server and
configuration through one top-level runner. Both use the same tax operations.
Do not add a managed Promise runtime to the native API Worker.

Matching upstream Effect 4.0.2 supports this separation: `HttpApiBuilder` captures
shared services, `HttpRouter` supplies the current request scope, and
`BunHttpServer` supplies the abstract server. `HttpRouter.provideRequest` builds
its supplied Layer per request; it must not own an application-wide capacity
pool. Alchemy's Worker bridge builds the application once and supplies native
request context. Stream cleanup belongs to the current consumer; isolate
shutdown is not a guaranteed cleanup hook.

Cloudflare already captures one bounded calculation service. Keep its shared
eight-place pool, five-second work budget and checked private identity. The pool
is shared within a running Worker, not across the world; Cloudflare's separate
native rate limit is approximate and per location. A timer cannot interrupt
synchronous calculation code. Q6 selects public browser access; the trusted
private identity and calculation limits are unchanged.

Bun currently builds the bounded service per request, creating a fresh pool for
each one. Fix that at Bun application composition after the Cloudflare work.
Keep its current HTTP coverage and explicitly owned CORS/admission differences;
no Cloudflare Durable Object substitute or new Bun protocol promise is needed.

## Patch-free Alchemy design

TaxKit currently locks Effect 4.0.0 and patched Alchemy 2.0.0-beta.80. Common
Practice locks Effect 4.0.2 and unpatched Alchemy 2.0.0-beta.81. The target is the
compatible, published, unpatched upstream package used by Common Practice,
checked against TaxKit's installed types and consumers during implementation.
An upstream comparison is not an installation or a completed upgrade.

Q6 settles the circular address graph. Declare the API before the Website.
Each host gets its own native `Worker.URL`; Website receives the API's native
Output and private binding. API no longer reads Website's stage Output for CORS
or discovery. The checked Production publication address (`https://taxkit.dev`)
is a public-link policy, not a copied self URL or a constructed Preview address.
API catalogue endpoints still use that stage's API address. Keep API-owned
finished discovery documents; do not introduce a reverse binding, second
renderer, saved-output lookup or identity Action to schedule the old circle.

Keep `websiteOrigin` as the running Website's native stage identity. Reuse the
owning origin Schema for a separate checked `publicationOrigin` in content and
Website settings, without an address-only service. Update
`packages/content/src/schemas.ts` and `live.layer.ts`, API settings/Config/
composition, and Website `schemas.ts`/`config.server.ts` together. HTML metadata
in `docs/metadata.egress.ts`, the visible Markdown link in `routes/$.tsx` and
the canonical Link header in `docs/markdown.response.server.ts` use publication
address. WebMCP, analytics host checks, relative navigation and form actions
keep actual stage identity. Replacing `WEBSITE_PUBLIC_ORIGIN` with Production
would break Preview/local tools or send a request to the wrong host.

Keep pure `Output.map` for resolved resource values and decode ingress through
owning Config/Schemas. Do not erase expected decode failures with `Effect.orDie`
in `Output.mapEffect`. Fixed local ports with `strictPort: true` fail on a port
conflict; actual local addresses still come from native Outputs.

Use native `domain.name: "taxkit.dev"` and `domain.redirects: ["www.taxkit.dev"]`,
following Common Practice. Native Alchemy already provides the current 301,
path/query preservation and redirect before Worker/static-asset execution.
Delete the proposed Worker `www` check, `runWorkerFirst` change, alias transition
and extra `ASSETS` delegation. They add a second redirect implementation without
improving the public redirect contract.

The unpatched beta.81 shared-ruleset provider has a real limit: a successful read
preserves other redirects, but every read error is treated as absence. A later
successful write can omit other rules. Normal apply follows that same branch;
Worker upload precedes redirect reconciliation. Keep useful public redirect and
successful-read preservation checks; do not claim the patch's stronger failed-read
guarantee is native. The old fixture documents that difference, not a passing
native guarantee. The 7 October observation contained only TaxKit's own redirect,
but it does not establish current zone contents. Resolve any concrete unrelated
rule ownership issue during implementation without a copied provider, patch or
new receipt system. A standalone native Ruleset owns an entire zone phase and
is not a smaller substitute for a Worker-owned redirect.

### Native MCP origin policy

Q8 selects unpatched Effect's native `allowedOrigins` list for both modern and
legacy remote MCP. Origin-less desktop/server clients stay supported; the initial
browser list is `https://taxkit.dev`. Other browser sites, local or Preview
origins need a known use case and an ordinary checked configuration change.
`["*"]` is a literal entry here, not a wildcard. Do not copy Common Practice's
separate Effect predicate patch to get arbitrary browser-origin support.

The legacy host currently refuses an unlisted Origin before creating a host and
spending its limited setup allowance. Its native MCP handler checks Origin only
after that wrapper has allocated. Preserve the narrow early resource protection,
or change ordering so native admission happens first; do not delete it as a
redundant protocol check while still charging rejected requests. Reuse the same
checked list rather than maintaining a second policy. Public HTTP CORS and the
Website's on-page tools do not require this remote MCP allowance.

Remove the Alchemy entry from `patchedDependencies`, its patch file, and the
corresponding lockfile patch references together. Search build, install and
infrastructure code for every other Alchemy modification. Do not relocate a fix
into a wrapper, copied source or postinstall step. Preserve logical resource IDs,
stack/state identities and the existing unrelated DNS records.

The Atom scheduler peer-metadata patch is unrelated to Alchemy. Common Practice
also has non-Alchemy Effect/PostHog patches; those are not required by this
proposal and must not be copied without a TaxKit need. Align the Effect family
and explicit companion override if choosing 4.0.2. Any React/Atom compatibility
change needs ordinary type/build/browser checks, not a new exception receipt.

## Ordinary commits, deployments and Doppler

Copy Common Practice's workflow shape:

- Make normal coherent Git commits and PRs. Describe the change and meaningful
  test results in the PR. Do not require an approval JSON, finding crosswalk,
  source-digest receipt or separate commit acceptance ceremony.
- Run one ordinary check workflow. Use the same verification command locally
  and in Actions, rather than a second release-policy graph that rechecks every
  earlier document and receipt.
- On an internal PR, install the frozen lockfile, check the change, then run
  native Alchemy dry-run and deploy for that PR's stage. Check the Website/API.
  On close, use native destroy restricted to that PR stage. Keep fork secrets
  excluded, same-stage deployment/cleanup serialised, and the current PR-state
  check. These prevent real mistakes and are small enough to understand.
- Production runs manually from `main`: ordinary verification, native dry-run,
  native deploy, native drift, and a small public Website/API check. Use existing
  GitHub environment settings; do not add a second TaxKit approval system.
- Use native `Doppler.Secrets`, `.env` and disabled `ProcessEnv` fallback in one
  owner, following Common Practice. `.env` overrides also apply in hosted runs;
  Actions should write deployment metadata only. Retain TaxKit's actual Doppler
  project/config mapping and environment-scoped read-only Doppler credentials.
  Do not copy another project's values or duplicate Cloudflare keys in GitHub.
  Keep checked stage selection before the secrets download. Explicit native
  Secrets reject `--env-file`; do not retain an old wrapper flag by habit.
- Roll back by redeploying the previous working Git revision through the same
  native workflow. Alchemy resource retention is not a deployment snapshot.

Target scripts are short native commands such as `dev`, `pr:plan`, `pr:deploy`,
`pr:destroy`, `production:plan`, `production:deploy` and `production:drift`.
The names can match Common Practice while selecting TaxKit's existing `prod`
and `pr-N` state identities. Do not rename a live stack/stage as a side effect
of making commands prettier. Native local development still needs its exact
address and state behaviour checked; delete custom wrappers once their useful
behaviour is covered by the native entrypoint.

`alchemy dev` selects local resource providers but retains the declared state
store. `Cloudflare.state()` does not automatically become a local file store.
Keep local development in a distinct stage/state, or retain a short local root
if needed for that isolation. Do not reuse `prod` state or claim local provider
mode alone makes the state local.

GitHub records the commit and run; Alchemy records state; the smoke check
confirms the deployed endpoints. No separate receipt workflow, deployment
manifest, hash catalogue, custody packet or per-step approval file is needed.
A request to review the design does not itself deploy it, delete resources or
rotate secrets, but those ordinary task boundaries do not need a bespoke record
system. Current Actions credit availability has not been rechecked here.

## Remove ceremony at its source

The implementation must remove requirements, callers and tests together, rather
than disable a failing check while leaving its policy active.

| Current owner | Proposed retirement or simplification |
| --- | --- |
| `.github/workflows/docs-deployment-workflow-receipts.yml` | Delete the receipt reconciliation workflow entirely. |
| Four retired `docs-preview`, `docs-preview-teardown`, `docs-production`, `docs-production-hosted-verify` workflow stubs | Replace obsolete app workflow routing with the current native preview/production workflows; no workflow whose only role is announcing a retirement. |
| `tools/docs-deployment` and root `check:docs-deployment-*`, `check:doppler-custody`, retired docs dev commands | Remove custody, workflow-input/run/plan/teardown receipt validation, source-hash admission, custom plan projections, old-app wrappers and their tests. Do not move this machinery to a newly named folder. |
| `tools/governance`, `tools/evals/hgi-206`, `tools/evals/harness-foundation` | Remove audit acceptance, skill-receipt, epoch/requalification and harness-record enforcement from normal development, including their validators and fixtures. |
| `tools/quality-workflow`, Quality workflow and `turbo.json` | Remove bespoke control/automation registers, release-evidence admission and tests of that paperwork. Replace Quality with ordinary checks; delete orphan tasks and cache outputs. |
| `tools/documentation/runbook-*`, `runbook-contract.json` | Remove enforced runbook counts, authority/receipt cross-reconciliation and generated validation reports. Keep a short human deployment/recovery procedure. |
| `tools/documentation/owner-policy.json`, documentation policy and schemas | Keep useful links, commands, metadata/source checks. Remove mandatory acceptance receipts, source hashes and historical evidence validation; simplify public page status to its actual content/navigation owner. |
| `tools/documentation/catalogue.*`, `packages/docs-content`, `packages/docs-fumadocs` | Preserve actual content compilation, generated source and Website catalogue loading. Replace acceptance-record plumbing without deleting the working public documentation product. |
| `packages/scripts/src/release-readiness`, `release:present` and custom `release:check` | Remove per-run authority envelopes, proof graphs, digest-ledger outputs and deploy/receipt prerequisites. Preserve real build, package packing and downstream checks as direct commands when releasing or changing package contracts. `@taxkit/scripts` exports this runner: check its consumers before retiring those exports deliberately. |
| `AGENTS.md`, `docs/README.md`, `docs/operations/authority-model.md`, standards, skill routing and active plans | Replace mandatory receipt/approval/epoch language and accumulated historical task routing with short current instructions. Keep tax/package boundaries, ordinary operation scope and a practical rollback command. |
| New audit packet from this review | Remove inventories, scope/findings JSON, acceptance/impact crosswalks, registry/provider result packets and validation hashes. Retain the useful findings and source comparison in this proposal. |

Two build/test dependencies needed replacement before deleting their old owners.
`packages/docs-content` now builds its catalogue from MDX frontmatter and
navigation instead of acceptance records and hashes, and generated catalogue
consumers keep working. Native app-stack tests no longer read plan fixtures
under the removed `tools/docs-deployment`.

Older history is already recorded in Git. It must stop being an input to current
checks, a prerequisite for new work or a reason to add another retention
manifest. This design edit removes only its own new uncommitted packet; removal
of existing tools and old files belongs to the implementation. Do not delete
unrelated source, secrets or active runtime assets under a broad folder name.

## Checks that still earn their place

The target verification command follows Common Practice: build, format, lint,
types, Effect diagnostics, tests, unused-code and a small docs check. Retain
nested-workspace import/export enforcement and actual tax/schema/API tests.
Keep root Alchemy entrypoint type checking (`tsc --noEmit -p
tsconfig.alchemy.json`) inside ordinary type checks when retiring
`check:docs-deployment:types`; workspace checks alone do not cover those files.
Keep resource-stage validation and fork-secret exclusion in their ordinary
owners. Remove duplicated checks and every test whose only purpose is enforcing
the retired paperwork.

Run focused native Website/API tests when changing those apps, bindings or
client lifetime. Run SDK packing and clean downstream checks when changing its
exports or supported dependencies. Keep local emulator tests separate from
provider-mutating integration tests; Common Practice's live integration tests
are opt-in. Do not run the whole native suite after every wording change, nor
turn a failed meaningful runtime check into a passing result by dropping its
assertion or increasing its timeout without understanding the failure.

Normal Changesets still describe public package contract changes. The existing
fixed version group is a packaging choice, not a deployment approval system;
this change does not need to redesign it. Drop per-run versioning authority
receipts and requirements to version private infrastructure for ordinary app
work. No package contract changes in this document-only edit need a Changeset.

Earlier local checks passed 162 focused tax cases and the SDK packed/downstream
checks. Full verification did not establish a clean result: native emulator
startup/cancellation/development cases timed out. A subsequent run was
interrupted without a confirmed final result. The earlier review's full
repository check stopped in
`tools/quality-workflow/release-boundary.test.ts`, where thirteen temporary
fixture installs failed with a temp-directory permission error under the then
available Bun 1.4.0. That run did not reach or establish application qualification.
The 13 October document-only update passes docs/runbook and diff checks; the
unrelated runtime suite is not rerun for these wording and proposed-design edits.
These results are recorded here, without new receipt files or a successful
deployment claim. Meaningful native emulator failures still need investigation
during the application change.

## Remaining corrections and sequence

| Priority | Change and owning paths |
| --- | --- |
| 1 | Replace Cloudflare deployment/secret/command ceremony with the native workflow above. Update the actual instructions and current docs in the same change, including the older active clean-slate plan. |
| 2 | Apply agreed Q6: remove reverse Website Output dependencies in `packages/infrastructure/src/apps-stack.ts`, keep native self URLs and stage API Outputs, and use checked Production publication links. Retain native `domain.redirects`, retire the proposed Worker/asset workaround and remove every Alchemy patch reference. |
| 3 | Apply static host Layers, selected-key native Config, native HTTP clients and one browser factory/registry. Replace old public HTTP helpers and copied client services; update examples. Migrate Website loaders without request atoms/envelopes or proxies, preserving calculation trust/bounds and existing machine RPC contracts. |
| 3a | Apply the agreed seven-day policy only to eligible public reads using native version-scoped caching. Keep private/error/cookie exclusions and response variants; include content in both Worker build inputs and qualify content-only pair deployment. |
| 4 | Move Cloudflare header interpretation from `packages/api/rpc/src/rate-identity.boundary.ts` into the API/Website host ingress. Keep the checked host-neutral identity contract. |
| 5 | Adopt the current portable lint asset under `tools/oxlint`, useful TaxKit extensions and real-project strict Effect diagnostics. Adapt manifest-aware imports for nested packages and retain actual-CLI fixtures. |
| 6 | Fix Bun's shared service lifetime at application composition, preserving its HTTP API and the host-independent packages. |
| Later | Add safe operational records through the existing native Axiom/Cloudflare declarations. Keep unsafe native channels off; Cloudflare's native metrics are distinct from exported logs/traces. |

No new generic utilities, second docs renderer, duplicated service facade or
permanent audit system is needed. Preserve tax rules/facts, encoded public
errors and HTTP statuses, RPC revision, MCP sessions, package names/subpaths and
SDK behaviour, subject only to the explicit compatibility choices below.

Public HTTP helper replacement is the agreed signature compatibility change;
it must not be confused with unchanged tax inputs/results. Q6 deliberately changes
stage publication links and browser HTTP access, Q8 selects the remote MCP origin
list, and Q9 changes public loader freshness. Native redirect failure semantics
replace the patched stronger guarantee. Keep these stated differences explicit;
existing machine operation payloads, statuses and protocol revisions stay.

## Source and documentation notes

Matching upstream clones: Effect tag `effect@4.0.2`, commit
`269a7c864351231d42e6e95b7fa8f32050df3691`; Alchemy tag `v2.0.0-beta.81`, commit
`e73c66857553a5abe045e1a66b5512cf7d39ef2e`. Consulted owners include Effect
`packages/effect/src/http/HttpRouter.ts`, `http-api/HttpApiBuilder.ts`,
`packages/platform/bun/src/BunHttpServer.ts`; Alchemy `Plan.ts`,
`Cloudflare/Workers/WorkerProvider.ts`, `WorkerBridge.ts`, `Cloudflare/Bridge.ts`
and native Worker/Ruleset resources. Their supported patterns inform this
proposal; local tests and deployed behaviour are separate observations.

The deeper comparison also reads Effect `Layer.ts`, `Context.ts`, `Config.ts`,
`http/HttpClient.ts`, `http/HttpServerError.ts`, `rpc/RpcClient.ts` and
`ai/McpServer.ts`; Alchemy `Runtime.ts`, `Platform.ts`, `RuntimeContext.ts`,
`Output.ts`, `Apply.ts`, `Http.ts`, `Cloudflare/Workers/Fetch.ts` and
`Alchemist/Session.ts`. Installed 4.0.0/beta.80 APIs were checked alongside the
matching target clones. Plugin references include `repo-structure`'s
`tanstack-effect.md`, repository/tooling contracts and templates, and
`strict-effect-ts`'s portable asset and service/Config/error/lifetime/transport/
React/enforcement guides. Common Practice's manifests, lint configuration,
vendor assets and custom rules were inspected, including its separate Effect
MCP patch. Its product-specific service names and one-level package assumptions
are not TaxKit enforcement.

The 13 October update reads published 0.7.1's native public HTTP/Atom,
native Cloudflare caching and native request-ownership guides, plus the current
repository architecture. Common Practice main's `ARCHITECTURE.md`,
`apps/web/src/lib/runtime.client.ts`, `runtime.server.ts`,
`api/binding.adapter.layer.ts`, `seo/page.loader.ts`, native API Worker and
`packages/http/src/publishing.policy.ts` establish its current approach. The
older Website RPC plan is superseded. Installed and matching upstream
AtomHttpApi/HttpApiClient, Atom factory/registry, FetchHttpClient and native
Cloudflare Cache APIs were inspected. Common Practice's successful local and
hosted checks do not qualify TaxKit or select dependency upgrades. Q6–Q9 are
Cooper's explicit product choices, recorded here rather than inferred from those
checks. The follow-up also checks native modern/legacy MCP origin admission and
Alchemy Worker redirect/apply ordering against installed and matching sources.

Documentation impact: **Change required** for the proposal, plan, ADR 0005,
domain glossary, decision priority and index pointers in this design edit; for root instructions,
deployment/API/frontend/testing owners, commands/runbooks and local skill
routing during implementation. **Preserve** tax, API/SDK and package contracts,
working public docs generation, and the agreed privacy/dataset choices.
**N/A** for generated OpenAPI, package changelogs and provider records in this
edit because none of those inputs or systems changed. The normal Git diff
records this document change; it needs no additional impact JSON or digest.
