---
document_type: product-spec
lifecycle: current
authority: supporting
owner: taxkit-product-owner
last_reviewed: 2026-10-04
review_trigger: rebuild scope, interview answer, version selection, or implementation admission
---

# Clean slate for the TaxKit website and API

This is the accepted implementation contract and design interview record.
Cooper explicitly requested implementation on 4 October 2026, superseding the
prior whole-design Q14 admission hold. Q1–Q13 remain settled. The
[sibling tasks](./clean-slate-foundation.tasks.json) and
[active plan](../exec-plans/active/clean-slate-foundation.md) track actual progress.
This authority includes reviewable commits and draft PRs, but no merge, deploy,
publication or provider apply. Final provider-plan approval remains separate.

## Agreed direction

Keep the TaxKit calculation packages, tax rules and calculation results. Rebuild
the website and application wiring using the repository structure, Alchemy and
strict Effect TypeScript skill requirements originally requested from
development-workflows 0.5.1. The installed successor is now 0.6.0; use its
complete canonical baseline and qualify its stricter rules with TaxKit's
existing checks. Earlier dated research retains its original skill version.
Keeping packages allows edits needed for current dependencies. Cooper allowed
a fresh package and SDK interface in Q3; keep the tax rules and calculation
results while replacing the public interface deliberately.
The calculation vocabulary is recorded in [the glossary](../../CONTEXT.md).
The architectural trade-off is recorded in [ADR 0001](../adr/0001-separate-website-and-api.md).
The shared telemetry trade-off is recorded in
[ADR 0002](../adr/0002-reuse-shared-telemetry-datasets.md).

The replacement must include:

- a separate website and backend API;
- remote MCP tools and browser WebMCP tools, detected at runtime so the normal
  website remains usable in browsers without WebMCP;
- search engine and answer engine discovery, page metadata, social share images
  and processed Markdown;
- the current package releases, selected from official sources and pinned to
  exact versions after compatibility checks;
- native Alchemy Secrets and Doppler support;
- Alchemy-managed domain and DNS for `taxkit.dev` and `api.taxkit.dev`;
- PostHog traffic and calculator-name events, without calculation details or
  a consent dialog;
- Axiom logs, traces and metrics in the existing three shared datasets,
  with TaxKit project, app and stage filters;
- the skills' package boundaries, application lifetime rules, checked inputs,
  named operations, typed failures, deterministic tests and enforced lint rules;
- immutable application/domain values and declarative Effect workflows across
  apps, retained packages, tests, scripts and infrastructure, with no local
  mutation, imperative loops or helper dumping grounds.

The existing catalogue has three calculators: AU take-home pay, AU pay
withholdings and AU annual income tax. The first two are PAYG-only; all currently
target 2025–26. The rebuild makes these limits visible and adds no new tax tables.

The earlier audit found reusable HTTP contracts, SDK compatibility checks,
documentation content and deployment proof. Retain these until a checked
replacement covers their jobs. A fresh website does not by itself fix package
validation or qualify package upgrades. Historical evidence and deployed
resource ownership need an explicit retention and replacement plan.

## Proposed call graph

```ts
Current
docs visitor -> apps/docs -> docs-content and docs-fumadocs
API caller -> standalone Bun apps/api -> api/http -> SDK Effect operations
  -> calculators -> core and Australian rule packages

Requested replacement
visitor -> standard TanStack website -> private checked Effect RPC client -> backend API
Website server render -> same-stage binding RPC client -> backend API
browser interaction -> checked public-address RPC client -> backend API
public HTTP/OpenAPI caller -> HTTP adapter -> the same named calculation operations
remote agent -> native Effect MCP tools -> the same named calculation operations
browser agent -> page-owned WebMCP tools -> the same website commands
backend API -> existing calculator contracts and rule packages
human docs page -> checked API page/navigation -> accepted content contract
  -> Website HTML with browser-safe generated presentation components
dynamic search, Markdown, content or images -> native API -> owning content/image service
generated sitemap/robots/agent indexes/static Markdown/OG -> accepted catalogue assets
browser pageview -> private PostHog browser service -> bounded Website relay
successful hosted calculation -> API application event owner -> PostHog capture
request observations -> safe log/metric exporters and qualified native spans
  -> existing shared Axiom logs/metrics/traces, filtered by TaxKit identity
Alchemy -> matching website and API for each stage
  -> explicitly selected Doppler configuration and named secret inputs
```

The backend keeps its native request lifetime. The website has one server
runner and one browser Effect graph owned by the mounted React application.
Generated clients remain private. Preview uses its own backend. Runtime secrets
are added only for named application consumers; deployment credentials and
application secrets retain separate ownership.

Browser WebMCP is still experimental. Registration and actual agent execution
need separate checks; a registered tool name does not prove that an agent can
use it. Follow [current browser support](https://developer.chrome.com/docs/ai/webmcp)
and keep the ordinary calculator interaction available.

```ts
Tests: target
retained calculator golden tests -> original rule owner -> unchanged results
RPC, HTTP, SDK and MCP contract tests -> same calculator contract -> test/live Layer
website and WebMCP browser tests -> checked RPC client -> matching test API
telemetry tests -> checked event policy -> fake SDK/exporter -> no tax values
controlled Preview journeys -> exact Website/API artifacts -> independent readback
```

## Interview decision tree

### Website connection agreed in Q9

Use native Effect RPC for named website operations. The proposed first
transport is ordinary HTTP POST with the native JSON codec and Schema-derived
success/error values. Existing calculators return one bounded result; they do
not need WebSockets, persistent RPC sessions or an invented progress stream.
Explicitly select `RpcServer.layerHttp({ protocol: "http", ... })` and
`RpcSerialization.layerJson`; the selected server otherwise defaults to the
WebSocket protocol.
Introduce native NDJSON/Stream only if an accepted feature actually produces
incremental output, with its own framing, bounds and cancellation proof.

`packages/api/rpc` owns the group, thin handlers, native server integration and
private generated client Layers. The domain/calculator/content owners keep
their Schemas, brands, errors and operations. HTTP/OpenAPI, RPC and remote MCP
call the same API application operation, which coordinates calculation,
request limits and safe measurement. No transport duplicates tax policy,
analytics or calculation Schemas. Browser WebMCP calls the visible page
commands, then the same website client.

The Website server runner supplies a private same-stage service-binding
transport; browser Atom supplies the checked public API URL from the root
loader. Both implement the same named checked client contract and keep the
native generated client private. The Website has no live rule engine, authored
source loader, RPC server or backend fallback. Calculator facts go only in
bounded bodies; reports live only in the current calculation/page state.
Credentials are omitted and unexpected redirects rejected for public browser
calls. Actual native request headers determine the tested CORS allowlist.

Version the RPC contract and qualify a checked compatibility boundary so
independently activated Website/API Workers fail safely during version skew.
A single Alchemy plan does not make activation atomic. Keep public HTTP/OpenAPI
versioning and package Changesets explicit; a fresh SDK interface is not
permission to silently repurpose an already published wire contract. T001
establishes any existing public consumer/version before selecting its successor.

Private client Layers distinguish expected calculation errors, unavailable
transport, incompatible contract and malformed replies. Keep one total budget
through headers and decoded body; preserve earlier caller interruption and
close abandoned bodies. Root-owned RPC/client resources survive individual
request cleanup and are released at their actual host/browser lifetime. Native
API handlers run in the incoming Effect fibre with no extra ManagedRuntime.

Exact Effect 4.0.0 exports RPC at `effect/rpc`, while the RPC source still marks
the APIs unstable. Requalify the older skill's invalid-reply decoder workaround,
native error/defect encoders, JSON codec and Alchemy integration against this
selected source; copy no RC-specific workaround without evidence. A safe outer
HTTP reporter alone does not prove that native RPC replies omit raw Causes,
Schema inputs or stack details. Native global/fatal defect paths, malformed
envelopes, unknown procedure tags and request IDs also need qualification;
per-procedure defect encoding alone does not cover them. Test actual wire
replies, request/response payloads and native logs with sensitive sentinels,
including malformed valid-JSON responses and an unrelated adapter defect.
The public serialisation `codecFor` hook is a candidate supported adapter,
not yet proof that every native path is safe: an unknown-procedure response
uses an identity encoder and can reflect its supplied tag. Qualify a supported
checked ingress treatment or an exact reviewed native correction for uncovered
paths. No complete redaction capability has been established. Do not replace
the native protocol
with handwritten framing or broadly convert every defect to an expected error.

Sources: [selected native RPC server](https://github.com/Effect-TS/effect/blob/effect%404.0.0/packages/effect/src/rpc/RpcServer.ts),
[client](https://github.com/Effect-TS/effect/blob/effect%404.0.0/packages/effect/src/rpc/RpcClient.ts)
and [serialisation](https://github.com/Effect-TS/effect/blob/effect%404.0.0/packages/effect/src/rpc/RpcSerialization.ts).

Q9 selects backend calculation through native RPC. Inputs are temporarily sent
in bounded bodies, with no persisted figures or logged reports. Keep the rules
out of the website bundle and provide no browser engine fallback. Protocol
compatibility, error privacy and actual cancellation still need the named
implementation checks; selecting the design does not prove them.

### Settled interview choices

| Decision | State | Recommendation | Opens next |
| --- | --- | --- | --- |
| First release | Agreed in Q1: docs and all existing calculators | Use only the catalogue already supported by the packages | Page structure, input forms, result detail and browser tools |
| Public API and remote MCP access | Agreed in Q2: anonymous access with request limits | Keep access simple and bound expensive requests | Request limits, privacy and abuse handling |
| Package and SDK compatibility | Agreed in Q3: allow a fresh package interface | Preserve rules and results; document the new interface and breaking changes | Runtime ownership, package migration and Changesets |
| Calculation privacy | Agreed in Q4: temporary only | No saved calculations, tax figures in URLs, calculation logs or personalised share images | Browser state lifetime and safe operational logging |
| Browser agent actions | Agreed in Q5: allow all proposed actions | Find, fill, calculate and read; keep changes visible to the person | Tool scopes, cancellation and page state |
| Documentation launch | Agreed in Q6: review and publish finished pages | Update and review pages; publish accepted pages and keep unfinished drafts out of public search | Publication records, search, sitemap, Markdown and agent indexes |
| Public website and API addresses | Agreed in Q7: taxkit.dev, API subdomain and Alchemy-managed DNS/domain | Use taxkit.dev and api.taxkit.dev; follow the Common Practice ownership pattern | Canonical links, origins, sitemap, DNS and deployment routing |
| Measurement | Agreed in Q8 and expanded by Cooper's latest message | PostHog visits and calculator names; Axiom logs, traces and metrics in the existing shared datasets; no calculation details or consent dialog | Event ownership, privacy checks, identity filters and retained provider resources |
| Functional Effect policy | Required by Cooper's follow-up | Immutable values, declarative workflows, services/Layers and piping across all owned code; current portable rules plus proved corrections for remaining gaps | Mutation/loop restrictions, state ownership and precise host exceptions |
| Website connection | Agreed in Q9 | Native Effect RPC to the same-stage backend; temporarily send calculation facts in a body | RPC contract/version, server binding/browser URL, failure and cancellation proof |
| Calculation trigger | Agreed in Q10 | Explicit Calculate action; edits invalidate the old answer and interrupt old work | Form/result state and one usage event per successful action |
| Result explanation | Agreed in Q11 | Main answer with expandable existing breakdown, assumptions, supported year and rule sources | Accessible result layout and checked explanation representations |
| Homepage priority | Agreed in Q12 | Calculator-first homepage with clear developer/agent routes | Navigation and public landing pages |
| Markdown scope | Agreed in Q13 | Accepted public docs and calculator reference pages only | Discovery/content representations; no personal report downloads in this release |

Q1–Q13 are settled. The broader analytics request supersedes the earlier
technical-health-only Q8 recommendation. Existing supported tax years stay
explicit; unsupported years fail rather than silently falling back to another
year. Share images describe public pages and never a person's figures. The 4 October implementation request admits the settled design.
Cooper reopened the interview and has now accepted Q9–Q13. There are no further
unresolved product branches in this first-release design. The 4 October implementation request supersedes the former Q14
whole-design confirmation hold. The
stronger functional Effect requirement is already explicit user direction,
not another permission question.

## Outcome, ownership and scope

Cooper is the product decision owner. The primary implementation owner must
carry the rebuild through integration, local checks, reviewed provider plans,
accepted journeys and handover. The first release gives a person useful docs
and every currently supported calculator, and gives agents the same documented
operations. It does not add tax years, rates, accounts, payments or saved
calculations. Retain `packages/core`, `packages/calculators`,
`packages/rules/au/*` and their known-result tests. Interface and compatibility
edits are allowed; valid calculations must still produce the same results.

The new frontend owns `apps/web`; the backend owns `apps/api`. Keep the existing
calculator contract as the domain owner and `packages/api/http` as the HTTP,
OpenAPI and private HTTP-client owner. The agreed website connection adds
`packages/api/rpc` as the native RPC contract, handlers and private checked
client owner; it reuses the calculator/content Schemas and named services.
Add a separate MCP adapter only where its public protocol needs an owner; it
must reuse named calculator operations.
Do not create empty domain/UI packages merely to reproduce a scaffold.
Retain useful authored content in `packages/docs-content`; keep the generic
Fumadocs bridge only where it still serves a real renderer contract. Retire
`apps/docs` and the starter app wiring after their replacement is proved.

The repository maintainer owns dependencies, enforcement and upgrades. TaxKit
owns its app graph, provider adapters, telemetry fields, dashboards and scoped
tokens. Site remains the owner of shared Axiom datasets. Historical evidence
keeps its original authority and target; it cannot prove the replacement.

## Rebuild requirements

| ID | Required outcome | Owner and acceptance |
| --- | --- | --- |
| CSF-001 | Keep tax behaviour while allowing a fresh interface | Core, rule and calculator owners retain known-result tests and supported-year contracts. Reject invalid input with checked failures; compare old and new valid results. Record breaking exports with appropriate Changesets. |
| CSF-002 | Qualify current dependencies and strict repository structure | Root manifest, lock, runtime, exports, TypeScript, formatting, lint, tests, Turbo, Knip and CI select one exact qualified graph. Update canonical repository skill copies and their local profiles together. Enforce immutable/declarative owned code as well as the portable Effect baseline. No silent version downgrade or blanket exception. |
| CSF-003 | Separate native backend and standard frontend | Native Alchemy API handlers keep request work and cleanup; no backend ManagedRuntime. The Website uses one server runner and one React-owned browser Atom graph. Native RPC clients use a same-stage server binding and checked public browser URL, implementing checked named operations with a complete-response deadline, revision agreement and caller cancellation. |
| CSF-004 | Give visitors all existing calculators | Derive forms, calculator names, input contracts and result scope from the catalogue. Use a calculator-first homepage and explicit Calculate buttons; edits invalidate old results and interrupt old work. Show the main answer with expandable existing breakdown, assumptions, supported year and sources. Route owns restoration and result matching, feature container owns commands, focused leaves show readonly values and local input state. Keyboard, focus, loading, errors and cancellation work; unmount releases work. |
| CSF-005 | Serve anonymous API, remote MCP and browser tools | HTTP/OpenAPI and native Effect MCP reuse checked named operations. Bound bodies, work, concurrency and request rates; return checked rate-limit/error responses. WebMCP can find, read, fill, calculate and read results through visible page commands. Feature detection keeps normal browser use working. |
| CSF-006 | Publish one useful content and discovery catalogue | Review existing pages, record exact acceptance for finished content and navigation, and keep unfinished drafts out of public search. Derive SEO/AEO metadata, canonicals, sitemap, robots, structured data, search, agent indexes, processed Markdown and page OG images from the same accepted catalogue. Markdown covers public pages/reference content only; no personal report download. Website owns HTML and browser-safe compiled presentation exports; dynamic source/search/Markdown/image services belong to the backend. Generated static assets need no extra server. No raw MDX or alternate calculations. |
| CSF-007 | Let Alchemy own infrastructure, domains and secret inputs | One native graph pairs Website/API for each stage. Production uses taxkit.dev/api.taxkit.dev; Previews never call Production. Each host binds its own origin from native Cloudflare.Worker.URL and receives another host's address through native resource Outputs. No duplicated hard-coded app origin. DNS/zone ownership, retained resources, Doppler stage selection and secret precedence are explicit before apply. |
| CSF-008 | Measure only traffic and chosen calculator usage in PostHog | Explicit pageview and successful calculator-use events pass a closed Schema allowlist after SDK enrichment. No figures, facts, result details, free text, user profiles, session recordings or automatic click capture. No consent dialog. Respect Do Not Track; proposed browser identity is memory-only. |
| CSF-009 | Send useful, safe telemetry to the three shared Axiom datasets | Reference site-prod-logs/site-prod-traces/site-prod-metrics without changing their owner or retention. One owner per signal, checked TaxKit identity fields, bounded event cleanup, safe fields, correct endpoint/encoding/header and independent filtered readback. No second competing trace exporter. |
| CSF-010 | Complete a qualified replacement and operational handover | Inventory retained source, history and deployed identities before removing wiring. Keep release/consumer proof, stage isolation, approvals and rollback intent. Replace obsolete commands, docs, skills, lint scopes and CI in the owning slice. Distinguish local, Preview, provider and Production proof. |

Apply the relevant stable harness invariants `HC-OUTCOME-001`, `HC-CTX-001`,
`HC-REPO-001`, `HC-BOUNDARY-001`, `HC-DOC-001`, `HC-PROOF-001`, `HC-AUTH-001`,
`HC-DEPENDENCY-001`, `HC-EVIDENCE-001` and `HC-LIFETIME-001`. New continuous
automation and comparative claims about worker effectiveness are N/A: this
rebuild requests ordinary CI and product behaviour, not a new background agent
or an experiment about worker performance.

## Strict Effect and enforcement contract

Initial anonymous calculation/MCP policy is 60 work requests per minute per
trusted, non-logged client rate key; 64 KiB request bodies; at most eight active
calculations per Worker isolate; a five-second operation budget; and a
ten-second complete-response client deadline. Scope and approximation of the
native rate limiter must be documented. Metadata/content responses are bounded
to 2 MiB at the client. Return checked 413/429/timeout failures with safe codes
and retry guidance; do not retry calculations automatically. Qualify valid
catalogue responses and supported streaming/MCP envelopes before adopting these
limits, and record a justified adjustment in the SPEC rather than adding an
unlimited fallback. Rate identity is not an analytics visitor ID and must not
be exported in logs, spans or product events.

Keep owning Schemas, schema-derived types, branded identities, checked semantic
Config, services, Layers and tagged errors. Decode unknown representations once
at their true boundary and encode outward values. Keep Effects lazy and flat;
keep one-use mapping and error logic beside the operation. Separate contracts,
live Layers, test Layers and application execution. Provider adapters expose
named operations and immediately decode replies; no raw SDK client, generic
callback, `instanceof` policy or primitive secret configuration escapes.
Public service operations normally return a closed
`Effect.Effect<Success, DomainError, never>`; dependencies are supplied when
their Layer is built. Public effectful methods use named `Effect.fn`; private
work stays in the caller's span unless it owns a separate external operation.
Infer types from one owning Schema and reuse whole-record checks as well as
fields/brands. Do not re-decode checked internal values, mirror primitive
refinements or JSON-encode internal cache keys. New constrained values use the
owner's fallible constructor with named failures. Convert semantic absence to
Option while preserving any historical missing/null encoding and source hashes
at their actual codec boundary.

Cooper requires a stronger functional policy than the skill's minimum:

- Bind owned values with `const`; no `let`/`var`, reassignment, increment/decrement,
  property/index writes, deletion, mutable class fields or in-place updates.
  This includes short-lived local builders and test observation arrays.
- Domain and service values are readonly Schema-derived records, readonly
  bounded arrays or persistent Effect collections. Do not expose a mutable
  array, native Map/Set/WeakMap/WeakSet, Date, SDK object or mutable reference as
  a domain value.
  Do not use casts or shallow freezing as a substitute for this contract.
- Express transformations with pure Effect collection mapping/folding;
  express workflows with named Effects and combinators. No `for`, `for...in`,
  `for...of`, `while`, `do...while` or native array traversal, including native
  `forEach`, in owned code. Pure array work uses Effect Array functions directly;
  use scoped, bounded Effect traversal/repetition where work really repeats.
- Prefer a pipe for a clear linear data flow. Use flat `Effect.gen` with
  immutable bindings when dependencies or several sequential steps make that
  clearer. Neither syntax permits raw work, mutation, hidden branching or
  helper chains that obscure the operation.
- Expected failures stay in tagged error channels and are handled exhaustively
  with Effect/Match and Option/Result's matching APIs. No `switch`, manual
  `_tag` comparisons, thrown expected errors, `try`/`catch`, manual Promise
  control flow, manual unknown probing or nullable domain state.
- Pure deterministic calculations and rendering remain total plain functions.
  Do not wrap constants or safe leaf transformations in ceremonial Effects,
  or construct a service/Layer for every helper.

Necessary changing state belongs to the narrowest explicit owner: React for
local synchronous input/display state; Effect Atom for browser work; or scoped
Ref/Queue/Cache/Semaphore/transaction facilities inside a named Layer where
their semantics are needed. Values held in those owners remain immutable;
updates are pure and atomic, and no underlying mutable reference escapes.
There is no claim that React, Effect, the host or a vendor SDK has no internal
state. Prove route/request/instance lifetime, concurrent updates, interruption
and disposal rather than hiding state in module globals. Calculation facts and
reports get no persistence or cache; accepted public content may have an
explicit bounded cache policy.

The current skill permits measured private native data structures and genuine
host requirements, and no longer treats a total leaf as permission for local
mutation. TaxKit's stronger requirement admits only a host-imposed primitive
in a named outer adapter with an exact construct, containment, owner, test and
removal condition. Grant only the
construct that the host needs; a Promise-returning adapter exception does not
permit nearby mutation, loops, SDK leakage or a nested runtime. Generated,
vendor and reference templates have explicit provenance and exclusions; runnable owned policy code
and tests remain covered. A performance preference alone cannot silently relax
Cooper's immutable/declarative requirement.

Extract an operation only when it owns stable policy, external work or a
resource lifetime, or has a real independent reuse/substitution point. Each
extraction needs its semantic owner and simpler call graph. Keep one-use
decoding, mapping, error projection and matching inline. Ban dumping-ground
`helpers`, `utils`, `common` and `shared` modules; naming a wrapper as a service
does not give it semantic weight. Review the actual call graph in every slice.

Adopt the installed 0.6.0 portable strict Effect policy at its repository-owned
canonical skill asset. Merge into `oxlint.config.ts` and retain useful existing TaxKit,
MDX and workspace checks. Enable `strict-effect/no-unchecked-index`,
`no-native-at`, `runtime-file-convention`, `tagged-error-name`,
`error-constructor-new`, `no-promise-workflow`, `no-unsafe-option-unwrap`,
`no-unchecked-json`, `no-runtime-outside-boundary`, `no-native-work` and
`no-imperative-collections` under that plugin. Keep assertions/any, raw fetch/JSON/environment, ambient
time/random/timers, console telemetry and native mutable collections restricted
across owned source, tests, tools, infrastructure and configuration. Exact host
adapters get only their necessary exception; generated/vendor exclusions are
explicit. Pure local rendering and deterministic computations remain direct.
Cover owned `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` and `.cjs` execution paths, not
only the scaffold's TypeScript override. Convert retained JavaScript policy
tools to checked TypeScript where needed; do not leave them outside enforcement
because their extension differs. Validate executable MDX expressions/imports
through the existing content-policy owner; fenced documentation examples are
representation content, not hidden executable source.

The earlier 0.5.1 plugin lacked local mutation and loop checks. Its installed
0.6.0 successor now supplies `no-imperative-collections`: use that canonical
rule instead of creating duplicate mutable-binding/reassignment/loop rules.
It rejects loops, `let`/`var`, assignments, updates, deletion, native array
traversal/mutators/constructors, transient Effect collection modes, `switch`
and manual `_tag` decisions. Imported Effect functional collection operations
and native Alchemy Output transformations remain valid. Ordinary pure work
needs no Effect wrapper merely to use those functional operations.

The rule is syntax/import-based. Add a TaxKit correction only for an evidenced
gap, with the owner and actual tool capability established first. Retain and
qualify native Map/Set/WeakMap/WeakSet, mutable built-in/class/contract values,
Object/Reflect writes, local/destructured aliases and runtime reference checks
through the relevant existing rules, readonly types and focused additions.
Computed member access is already rejected by `no-unchecked-index`; do not
present it as an admitted combined-baseline escape.
`Ref.set` and native mutable `Map.set` are different operations; a method-name
search alone does not establish their identity. Each correction must reject
its bad fixture without rejecting a valid persistent collection, Effect-managed
state update or qualified Alchemy Output operation.

Actual-command fixtures must cover every owned path group, including moved
apps, nested packages, JavaScript policy tools, tests and configuration. Assert
the admitted file count, exit code and expected rule. Exact `allowedAssignments`
and `allowedMethods` options name a file and the single target/receiver/method;
no parent path, glob or whole-file exception. Prove nearby mutations remain
rejected and that removing/disabling a required rule or broadening an exception
fails the verifier. Readonly types and the selected Effect diagnostics cover
the type side; structural review covers helper purpose, Schema ownership and
call-graph simplicity. Do not present lint as proof of all semantic requirements.

Preserve and qualify the stronger existing TaxKit lexical checks when merging
the portable plugin. Runtime operations used as references/callbacks, such as
passing `Effect.runPromise` to a pipe, must be rejected outside the exact host
owner as well as direct calls. Prove renamed imports, namespace aliases,
re-exports, shadowed names and callback references; a CallExpression-only check
is insufficient. Primitive host adapters cannot become a generic `run`
escape for arbitrary callers.

Derive workspace boundaries from manifests, including nested API/SDK/rule
packages. Cover imports, re-exports and literal dynamic imports. Packages cannot
depend on apps; frontend code cannot import backend handlers or live domain
Layers through otherwise valid exports. Positive and negative fixtures must run
the actual installed Oxlint command under the new paths and report the expected
rule. Run the selected language-service diagnostics against stable Effect.
Adding prose alone does not establish enforcement.

Initially select native MCP adapters `v2026_07_28` and `v2025_11_25`, whose
exports were checked in the [stable Effect archive](https://registry.npmjs.org/effect/-/effect-4.0.0.tgz).
Qualify each before advertising it. The
[current transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
uses per-request metadata; the
[older transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
uses initialise/session flows. Tests must match each adapter, including version
rejection, header agreement, origins, rate limits, stream cancellation and
cleanup. Older session routing/expiry must work on the real Worker; session
metadata remains bounded and must not persist tax inputs or results. Supporting
one adapter does not prove the other.

## Product analytics

Proposed event policy:

| Event | When | Permitted product properties |
| --- | --- | --- |
| `$pageview` | Initial accepted public page and each completed client navigation | Checked page identity/path and bounded source classification; strip URL query/fragment and referrer details. |
| `calculator_used` | A supported hosted calculation completes successfully | Catalogue calculator ID/name only. No inputs, year selection, amounts, facts, report or result fields. |

Add only operational identity needed to filter project, app, stage and schema
version. One API application operation owns the successful-use event for
website HTTP, browser WebMCP, direct API and remote MCP callers. The pure tax
packages remain free of analytics; browser buttons and transport adapters do
not emit a second usage event. A checked collection-policy flag carries a
browser opt-out to that application boundary without passing browser identity.
It never grants authentication or a request-limit bypass. API and MCP events
use request-scoped random identity rather than a stored user profile. Use one
UUID for an event and preserve it within any deliberately qualified delivery
retry; do not promise exactly-once storage across provider loss or caller
recalculation. Local package calculations do not send analytics. Visits are
loaded-page counts, not a promise of exact returning-person counts.

Manage retained TaxKit Production and one shared Preview PostHog project through
Alchemy, following Common Practice's fixed US-region pattern, subject to the
actual organisation/credentials in the reviewed provider plan. Local analytics
is disabled. Ordinary Previews are disabled; an explicit controlled Preview
proof can enable its Preview project. Production capture tokens are public
write-only browser inputs; management/query credentials remain private in
Doppler and never enter app output or bundles. No paid feature or billing
change is required by this scope.

Use a private Effect browser service and React-owned Atom lifetime around the
latest `posthog-js`. Explicitly disable autocapture, recording, person profiles,
surveys and unnecessary automatic events; set Do Not Track handling explicitly.
Use memory persistence with persistence disabled, rather than assuming local
storage cannot fall back to cookies. Qualify current shutdown/flush behaviour
without promising network delivery on tab close. A synchronous closed allowlist
after SDK enrichment rejects unknown events/fields. Anonymous event identity
and checked page metadata are the only browser context needed.
Keep explicitly configured-off analytics distinct from invalid configuration:
invalid project/region/stage/token configuration has a named checked failure,
not a silent disabled result. After valid initialisation, capture/delivery is
best-effort and cannot fail a tax calculation or page. There is no old consent
or identity migration to copy into the fresh application.

The Website may own a narrow same-origin POST event relay as the skill's
analytics exception to separate machine routes. Fix its regional upstream,
checked origin, path, query and media types. Bound whole-body read, forwarded
bytes, upstream wait and reply size. Strip cookies, authorisation, IP-forwarding
and tracing headers; do not follow or expose redirects. Preserve event UUIDs,
timestamps and upstream status; keep no-store. The SDK owns retries and the relay
makes one upstream attempt. Qualify the current SDK's actual `/e/` endpoint,
batch/compression/query behaviour; do not copy an older relay contract blindly.

## Shared Axiom telemetry

Source research confirms Site declares the retained datasets `site-prod-logs`,
`site-prod-traces` and `site-prod-metrics`. Common Practice references the
Site stack's dataset outputs and owns its own scoped token, destination and
dashboards. TaxKit must reference those shared datasets rather than create,
adopt, rename or change them. Their current live state still requires provider
readback before apply. Dataset count stays at three across apps and stages.

Define one TaxKit resource identity: `project=taxkit`,
`service.namespace=taxkit`, `service.name=taxkit-web|taxkit-api`,
`taxkit.application=web|api`, `deployment.environment=<exact stage>` and
`deployment.environment.name=production|preview|development`. Bind repository,
ref, revision and request identity on logs/traces only. Dashboards and proof
queries must filter TaxKit, app and stage; proof also binds revision. Do not
copy Common Practice's stale `daw` labels or assume the reference repos already
use identical field names. Map native Cloudflare Worker identities explicitly
to the query identity. Avoid request/revision/visitor values as metric labels,
which would create an unbounded number of series.

Native Alchemy/Cloudflare tracing owns traces. Do not install an OTLP trace
exporter that replaces that tracer. Event-scoped OTLP pipelines own logs and
metrics and flush through bounded host background work with explicit cleanup.
Do not rely on an isolate's final shutdown. Use `/v1/metrics` with Protobuf and
`X-Axiom-Metrics-Dataset`, not Common Practice's older generic dataset header,
as required by [Axiom's current OTLP contract](https://axiom.co/docs/send-data/opentelemetry).
Telemetry failure cannot fail a calculation or public page. Qualify exporter
cleanup order, sampling and burst/sequential metric behaviour; do not equate an
accepted HTTP export with indexed events or exact request counts.

Minimum observation catalogue:

| Signal | Name and bounded fields | Measurement boundary |
| --- | --- | --- |
| Request log | `taxkit.request`: app/stage, route family, method, safe outcome/status class and response-ready duration | One outer request observation per Worker. No raw paths, queries, headers, body, visitor ID or error text. |
| Calculation log | `taxkit.calculation`: calculator ID, checked outcome and duration | One API application operation, separate from product analytics. Do not log facts, values or report contents. |
| Named spans | `taxkit.calculate`, `taxkit.catalog`, `taxkit.content.read`, `taxkit.search`, `taxkit.mcp.call` as applicable | Actual named service work with safe fixed attributes; no raw cause or response. Require parent/child and cancellation proof. |
| Request counter | `taxkit.http.requests`, unit request | Incoming Worker requests by app, route family and checked outcome/status class. Includes bots/API calls; it is not visitor pageviews. |
| Response-ready histogram | `taxkit.http.response_ready`, unit ms | Request observation start to response headers/object ready; excludes streamed body completion and background telemetry flush. |
| Calculation counter/histogram | `taxkit.calculations`, unit calculation; `taxkit.calculation.duration`, unit ms | Named calculation operation start to success/failure/cancellation, excluding PostHog/export delivery. |

Metrics use only bounded project/app/stage/route/outcome/calculator labels where
relevant. Describe native CPU/startup/I/O separately if exposed. A native root
span can include background work and must not be labelled visitor response time.
Browser pageviews remain PostHog's separate measurement. Qualify observable
counts/timings against controlled requests rather than inventing precision from
sampled traces.

Use a closed safe application field set: route identity, status/outcome, duration,
calculator ID where appropriate and checked error tag. Never export calculation
bodies, values, results, raw exceptions/Schema issues, secrets or raw headers.
Calculations send figures in bodies and keep them out of URLs, browser history,
page metadata and images. Inspect native automatic traces too: platform URL
fields can escape an application log allowlist, as described in
[Cloudflare's span fields](https://developers.cloudflare.com/workers/observability/traces/spans-and-attributes/).
Redact/suppress URL/query fields with a version-matched supported mechanism.
Disabling URL-bearing automatic spans while retaining safe native Effect spans
is a candidate fallback, not a demonstrated capability. Qualify both inbound
and outgoing spans plus Axiom and any retained Cloudflare copy. If the native
path cannot meet privacy, keep it disabled and record CSF-009 as unmet; do not
silently install a competing exporter or weaken the privacy requirement.
Resolve that observed constraint through a reviewed design change before
accepting tracing. Sentinel checks on the actual exported rows must establish
the privacy claim before accepting it.

Use separate private administration, scoped ingestion and query/readback
credentials. Retain shared datasets and long-lived TaxKit telemetry resources
on ordinary Preview teardown. Dashboards, tokens and destinations must have
explicit owners and revocation/rollback procedures; access to them alone does
not authorise provider mutation.

## Domain, DNS and secret ownership

Follow Common Practice's native zone adoption/retention and Website/API domain
attachments after confirming the real `taxkit.dev` account, zone and existing
records. Production owns the retained zone, `taxkit.dev`, a `www.taxkit.dev`
redirect and `api.taxkit.dev`. Preview uses its own temporary native addresses
and must not alter Production DNS. Preserve unrelated mail/verification records.
Native [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
own their generated DNS records and certificates. Registrar/nameserver/DS
state still needs its own readback; zone adoption alone does not prove that
public DNS or DNSSEC has converged. Recheck current Alchemy domain and Preview
options instead of copying old security settings or patches unchanged.

Each Website/Worker binds its own canonical origin from native
`Cloudflare.Worker.URL`. Another host's address comes from that resource's native
Output and is decoded at application ingress; no hard-coded or concatenated
application origin. A missing Output remains null and fails through checked
configuration, rather than guessing an address. Custom domains remain explicit
infrastructure inputs. Qualify local, Preview and custom-domain address behaviour
against the selected Alchemy version.

Choose the checked TaxKit Doppler project/config from the stage at the root
`Stack.secrets`. Disable the implicit shell secret source for Doppler-only
configuration so local values cannot silently override it. `Stack.secrets`
replaces the old `--env-file` mechanism. Resolve native API Config in the
construction context that infers bindings, and pass only named checked Website
bindings. Use redacted secret Config; deploy, runtime capture/ingest,
administration, independent query/readback and Turbo credentials have separate
purposes. Never forward the whole deployment environment to an application.

Before each provider mutation, the reviewed version-matched plan must identify
principal, account/organisation, operation, exact resource and stage, approval,
duration, receipt, revocation, rollback and independent readback. Existing
credential availability is not permission. Preparing code or a provider plan is
allowed planning work; applying it is a separate consequential operation.

## Ordered implementation and impact

The [task list](./clean-slate-foundation.tasks.json) owns dependencies and exact
acceptance checks. Start with retained-source/infra handover and latest-version
qualification, then prove one native two-app calculator. Expand calculators and
the SDK, accepted public content/discovery and MCP/WebMCP. Prepare DNS/secrets,
add minimal PostHog and safe shared Axiom telemetry, then qualify the complete
replacement and its operational delivery. An active execution plan begins only
after final shared understanding. A passing early slice is not final acceptance.

| Impact surface and inspected owner | Decision | Required change, order and proof |
| --- | --- | --- |
| Tax rules/core/calculator owners and READMEs under `packages/core`, `packages/calculators`, `packages/rules/au/*` | Change required | Compatibility/type/input/interface corrections in T002/T004; preserve valid known results and rate tables. Owning package tests, whole test run, reviewed Changesets. |
| RPC/HTTP/OpenAPI/SDK owners, export maps, snapshots, consumer fixtures and READMEs in `packages/api/rpc`, `packages/api/http`, `packages/sdk/typescript` | Change required | Agreed native RPC owner and named closed client operations, new lifetime/interface, current module paths and checked transport in T003/T004. Actual RPC and HTTP clients, wire privacy/version/cancellation tests, plus packed/downstream consumer proof. |
| `apps/api`, `apps/web`, `apps/docs` and their READMEs; `docs/architecture/{package-ownership,effect-services,api-and-sdk,frontend}.md` | Change required | Native API/standard Website/React lifetime in T003/T004, agent adapters in T006. Retire the old docs app in T005 only after replacement/retention proof. Actual local/browser/agent journeys and bundle/import inspection. |
| `packages/docs-content`, `packages/docs-fumadocs`, accepted public MDX/navigation, generated `.source`, `tools/documentation/owner-policy.json`, content architecture | Change required | One accepted publication/discovery owner in T005; exact status records, regenerated representations, source-faithful pages, processed Markdown and OG images. Content/docs/build/browser checks; never hand-edit generated output. |
| Root manifests/lock/runtime, `turbo.json`, TypeScript, `oxlint.config.ts`, `oxfmt.config.ts`, `knip*.json`, `tools/oxlint/**`, language-service config, `tools/quality-workflow/**` and quality workflow | Change required | Exact qualified versions and the complete 0.6.0 baseline in T002; reroute inputs/scopes per later move. T005 replaces hard-coded apps/docs browser/cache paths and quality admission. Actual CLI rejected/accepted fixtures, type/lint/format/build/tests, source export/bundle audits and complete verification. |
| `.agents/skills/**`, `tools/skills/canonical-skill-baseline.json`, `AGENTS.md`, linked `CLAUDE.md`, root/docs routes and affected standards | Change required | Complete canonical skill trees, including the required Linear skill, and local profiles teach the accepted implementation in T002 and each affected slice. Include the Linear folder/link in baseline receipts; this authorises no Linear project or issue write. Keep metadata/receipts/references coherent; test skills, harness governance and docs. Global installed skills remain outside write scope. |
| `alchemy.run.ts`, `packages/infrastructure`, `tools/docs-deployment/**`, deployment workflows and infrastructure README | Change required | Same-stage native pair, new graph admission, exact DNS/secrets/analytics/telemetry ownership in T003/T007/T008/T009. Current Alchemy types/tests and reviewed plans; retain ordinary native commands over a parallel verification framework. |
| `docs/runbooks/{docs-deployment,recovery}.md`, operations authority model, `tools/documentation/runbook-contract.json` and router pointers | Change required | Replace the one-DocsWebsite procedures with exact pair/domain/secret/analytics/signal plans and recovery in the owning slice. Revise any changed procedure target/command contract together. Docs/runbook checks plus authorised independent readback. |
| `.changeset/config.json`, changed package Changesets, SDK/release-readiness consumer graph including `packages/scripts/src/release-readiness/schemas.ts` and versioning standards | Change required | Fresh public interfaces require a major change at the affected owner; the existing nine-package fixed train takes its highest required bump. T005 replaces the old docs browser command in the release graph. Reconcile additions/removals in T002/T004/T010 and retain local release/packed proof. No package publication is part of design approval. |
| `docs/verification/critical-journeys.json`, `repository-harness-profile.json`, current SPEC/tasks/ADR, active-plan indexes, bounded proof/evidence pointers | Change required | Add consumer-visible calculator, discovery, agent and privacy journeys with real oracles as their slices land. T005 replaces the current profile's apps/docs owner when retiring the app. Bind candidate/config/stage and distinguish local/provider/Production proof in T010. |
| `docs/exec-plans/completed/**`, historical/binary `docs/evidence/**`, previous audits, Git source and deployed rollback identity | Preserve | T001 retention manifest records identity and later successor pointers before removal. No historical evidence is silently deleted, reassigned or treated as current proof. |
| Site-owned shared datasets, their foreign stack, retention and unrelated DNS/dirty work | Preserve | TaxKit references foreign Axiom outputs; it does not adopt/edit them. Account/readback and exact plans must show this in T007/T009. |
| New tax rates/years, stored calculations, accounts/payments, billing changes and continuous agents | N/A | These are outside the requested first release. No new rates, persistence, account model, paid feature or background-agent authority is implied. |

Every required impact is mirrored into the sibling tasks. The task's owning
docs and enforcement change with its implementation, not in a final catch-all
cleanup. Require one fresh independent review of the substantive replacement;
reviewer count is not evidence. New abstractions need semantic weight, an owner,
actual reuse/substitution and a simpler call graph. Retire an adapter, patch or
control when a qualified upstream capability replaces its job; do not preserve
it merely because it was once useful.

## Version research

The skills' recorded Effect RC is a fallback. The explicit request for current
releases takes precedence. Alchemy beta.80 and the stable Effect 4.0.0 family
are research candidates, not a qualified installation. Check their actual
exports, module paths and peers together. Do not combine beta.80 with the old
rc.117 pin or assume the old scaffold compiles unchanged.

Official research on 3 October identifies
[Alchemy beta.80](https://github.com/alchemy-run/alchemy/releases/tag/v2.0.0-beta.80)
and [Effect 4.0.0](https://github.com/Effect-TS/effect/releases/tag/effect@4.0.0).
The bundled version resolver selects Alchemy's `next` tag, which currently
points to older beta.72, and labels Effect as an RC even with a stable override.
Correct that selection in the recorded candidate rather than adopting its
output unchanged. This checkout's first resolver attempt failed at npm DNS
lookup; it produced no version snapshot. The release facts above were checked
separately against public official sources.

Stable Effect moves the old `effect/unstable/*` modules to public paths such as
`effect/http`, `effect/http-api`, `effect/rpc` and `effect/ai`. Existing packages
need checked compatibility edits even while their behaviour is retained.

Native [Alchemy secret providers](https://alchemy.run/environments/secret-providers/)
load a selected Doppler configuration. Its default shell source can override
Doppler, so an explicit source policy is required. `Stack.secrets` also replaces
the old `--env-file` path. Review the downloaded configuration's scope before
replacing TaxKit's current named credential reads. Deployment secrets do not
automatically become runtime secrets, Turbo credentials or independent
readback credentials.

A resolved version record must cover the chosen apps and tools, companion and
transitive Effect packages, Fumadocs, browser integration and image generation.
Keep official source URLs and compatibility results. Rendering, installation,
builds, package-consumer tests, browser behaviour and provider deployment are
separate proof steps.

[The dated provisional research](../documentation-audit/clean-slate-foundation/2026-10-03-versions.json)
now covers all 41 current external dependency names across 17 manifests, the
scaffold additions and 55 observed packages. It records official sources,
selectors, exact candidate versions and pending choices. It is research only,
not adopted renderer input or an installed dependency graph.

One declared compatibility conflict remains: current Atom React requires a
Scheduler version below 0.28, while current React DOM requires 0.28. Investigate
the real APIs and behaviour, then qualify any narrowly justified correction.
Do not silently downgrade the user's latest-version target or hide the warning.

Source inspection found that Atom uses three Scheduler operations and that
the published default production and development implementations of Scheduler
0.27.0 and 0.28.0 are byte-for-byte identical. The proposed correction is a
metadata-only patch adding exactly 0.28.0 to Atom's accepted version range,
with one shared Scheduler instance. The source comparison supports testing
this candidate; it does not prove runtime compatibility. Qualification must
cover server rendering, browser hydration, scheduled and cancelled updates,
rapid input changes, strict-mode remount and final resource disposal. Remove
the patch when an upstream release admits the qualified version.

Sources: [pinned Atom source](https://github.com/Effect-TS/effect/blob/effect%404.0.0/packages/atom/react/src/RegistryContext.ts),
[Atom release metadata](https://registry.npmjs.org/%40effect%2Fatom-react/4.0.0),
[Scheduler 0.27.0](https://registry.npmjs.org/scheduler/-/scheduler-0.27.0.tgz),
[Scheduler 0.28.0](https://registry.npmjs.org/scheduler/-/scheduler-0.28.0.tgz).

[The separate analytics/telemetry/image research](../documentation-audit/clean-slate-foundation/2026-10-03-measurement-versions.json)
records 28 further observations. Current candidates include `posthog-js`
1.435.8, Distilled PostHog/Axiom rc.13 and Takumi 2.14.0. Alchemy beta.80
has native Axiom resources; PostHog still needs a small private custom
Resource/Provider with Distilled management operations. Stable Effect exports
native OTLP modules under `effect/observability/*`, so the external OTel SDK
observations are optional and unselected. Add no package simply because it was
researched. Distilled rc.13 still omits the dashboard soft-delete request field;
if TaxKit needs removable dashboards, qualify the exact provider correction or
an upstream fix before using it.

Exact [PostHog source](https://registry.npmjs.org/posthog-js/-/posthog-js-1.435.8.tgz)
shows DNT defaults off, `/e/` is the browser capture endpoint, local storage can
fall back to cookies, and `shutdown()` is best-effort flush/disposal. The plan
therefore states those policies explicitly. Secondary DeepWiki answers through
Executor were researched and contradicted the selected source on DNT and the
endpoint; they do not override the versioned source or qualified runtime proof.

## Research identity and outstanding qualification

The requested reference patterns were checked against committed source in two
other checkouts. Their unrelated dirty planning files were not changed or used
as executable state. Detailed comparison paths and checkout identities remain
private research; TaxKit's durable owners record the resulting contract,
official package observations and native foreign-resource addresses only.
The reference patterns' older package pins/patches require fresh qualification.

Shared dataset references target `{ stack: "CooperCorbettSiteCloudflare",
stage: "prod" }` and IDs `SiteProdLogsDataset`, `SiteProdTracesDataset`,
`SiteProdMetricsDataset`. Source declares 30-day retention; no live retention,
capacity, token, PostHog organisation or `taxkit.dev` provider state has been
read back in this interview. The DNS/account/registrar, provider organisation,
actual bindings, metric behaviour, native URL suppression and indexed-event
proof belong to the named implementation tasks, not settled external facts.

This proposal follows the user's clean-rebuild direction and Q1–Q13, rather
than admitting every finding from the earlier read-only audit. That audit's
accepted-finding crosswalk remains empty. Do not silently add new tax-rule work
or attribute unrelated findings to this agreement.

## Current verification limitation

The planning documentation passes the repository documentation policy. The
installed baseline's full verification stopped in
`tools/quality-workflow/release-boundary.test.ts` when its temporary workspace's
offline frozen dependency install exited with an error. The test does not show
the install's diagnostic in that failure. No package manifest or lockfile was
changed in this interview, and this observation does not qualify the planned
replacement or establish the install failure's cause. The implementation plan
must retain and resolve this failed proof step.

## Documentation impact of this interview

| Surface | Decision | Reason and owner |
| --- | --- | --- |
| Proposed intent, tasks, glossary and architectural decisions | Change required | This SPEC/tasks, root CONTEXT.md, ADRs 0001/0002 and the product-spec index record all settled Q1–Q13 answers and the complete 0.6.0 functional baseline. ADR 0001 includes the agreed website RPC choice and trade-off. The glossary has no new domain term to add. Cooper admitted implementation on 4 October; provider-plan approval remains separate. |
| Current architecture, app/package READMEs and public docs | Preserve | Implementation has not changed. Update their earliest owners with each accepted replacement slice. |
| Tax packages, SDK/HTTP exports, schemas, tests, examples and generated references | Preserve | No package behaviour changed during the interview. Q3 allows a fresh interface during the accepted implementation, with its required versioning and consumer proof. |
| Commands, lint, skills, CI and runbooks | Preserve | Record desired requirements here; do not present them as installed or enforced yet. |
| Historical evidence and active Alchemy modernisation | Preserve | Retain the existing authority and evidence owners until an explicit handover is agreed. |
| Changeset | N/A | These planning documents change no installed package, export or calculation behaviour. |
| Provider changes, publication and deployment proof | N/A | The interview performs none of these operations. |

This proposed SPEC/task set now carries the downstream-impact ledger. Complete
its final review and shared-understanding confirmation before admitting
implementation and starting an active plan. The grilling skill requires that
confirmation before acting on the design.
