---
document_type: product-spec
lifecycle: implemented
authority: supporting
owner: taxkit-product-owner
last_reviewed: 2026-07-25
review_trigger: accepted finding, implementation discovery, ownership change, or proof-boundary change
successor: null
tombstone: false
---

# TaxKit docs application architecture

## Overview

TaxKit already has a working three-surface documentation stack:
`apps/docs`, `packages/docs-content`, and `packages/docs-fumadocs`. This SPEC
defines a package-reshaping and application-boundary migration, not a greenfield
scaffold and not a public-copy redesign.

The target is a TanStack Start application that composes:

1. package-owned TaxKit Markdown/MDX and content policy;
2. a narrow generic Fumadocs source service; and
3. app-owned routing, server execution, SSR restoration, UI, navigation and
   accessibility.

The accepted exploration baseline is TaxKit commit
`3f4730daf4447b47a63cbe6470af6d550f8ee4b4`. Comparative evidence from the Site
repository at commit `ed4306f1ffa8bb0f08dc0cffef8fe9ef3e7897f4`,
inspected on 2026-07-25, supports the substitution principle but is not TaxKit
policy or a source tree to copy.

Implementation completed on 25 July 2026. The historical
[execution plan](../exec-plans/completed/docs-application-architecture.md)
retains the task evidence, candidate identity, limitations and bounded visual
artifacts.

On 2026-07-25 Cooper authorized one narrow governance amendment after
`DOCS-APP-004` exposed a collision between the evolving current critical
journey owner and immutable HGI-203 release evidence. The amendment preserves
the original packet, summary, attempt, manifests and validation receipt
unchanged; retains the exact journey bytes that HGI-203 observed as a
content-addressed historical snapshot; and makes the runbook validator decode
the current inventory independently. It does not fabricate a release attempt,
weaken a digest, grant release authority or broaden this SPEC into release,
versioning, publication or deployment work.

## Finding disposition register

| ID | Decision | Consequence owned by this SPEC |
| --- | --- | --- |
| `TDA-001` | Required | Move authored MDX, navigation and examples into `packages/docs-content`; remove package-to-app path ownership. |
| `TDA-002` | Required | Replace per-call Fumadocs loader callbacks with a real generic `FumadocsSource` service, live Layer and deterministic test Layer; remove duplicated or unused machinery. |
| `TDA-003` | Required | Remove the deliberately failing browser runtime and unused router service context; keep Effect execution server-owned and app-composed. |
| `TDA-004` | Required | Map a missing content page to framework-native not-found behavior and prove an initial HTTP 404 rather than a soft 404. Add explicit pending and error policy. |
| `TDA-005` | Required | Route internal MDX links through TanStack Router and prove client navigation without a document reload. |
| `TDA-006` | Required | Make generation ordering and the production docs dependency graph explicit; replace memory-router-only proof with built-app SSR, hydration and navigation evidence. |
| `TDA-007` | Required | Establish an app-local accessibility and interaction baseline. |
| `TDA-008` | Deferred | Search remains outside implementation. `packages/docs-content` is the future search policy owner, but this migration adds no search index, service operation or UI. |

Preserve these accepted strengths:

| ID | Invariant |
| --- | --- |
| `TDA-P01` | TaxKit-specific paths, navigation, frontmatter and content values remain canonical Effect Schemas with schema-derived types and tagged errors. |
| `TDA-P02` | Expected route outcomes cross the server-function boundary through a Schema codec; defects and interruptions are not reclassified as expected failures. |
| `TDA-P03` | Browser-safe generated-source access and server-only generated-source access remain separate public entrypoints with auditable import direction. |
| `TDA-P04` | Validation continues to cover navigation, frontmatter, links, examples, prohibited names and admitted MDX components. |
| `TDA-P05` | Proof claims continue to distinguish the component browser harness from built SSR, hydration, deployment and public-site behavior. |

## Problem

The current package names suggest the right architecture, but the dependencies
do not yet enforce it:

- authored content, navigation and examples live under `apps/docs`;
- `packages/docs-content` points back into those app paths from generation,
  validation and literal schemas;
- `packages/docs-fumadocs` exposes generic callbacks on every operation rather
  than a replaceable service boundary;
- TaxKit-specific and generic Fumadocs metadata are duplicated, while page-tree
  adapters are not reachable from production;
- router context contains a browser runtime that deliberately defects even
  though loaders dynamically acquire the real server runtime elsewhere;
- missing pages are restored as ordinary route data and rendered inside the
  catch-all route;
- internal links rendered from MDX use plain anchors;
- production Knip excludes the entire docs app and both docs packages, and
  Turbo does not describe generated-source inputs and outputs;
- the current browser suite proves a memory-router route boundary, not built
  initial SSR, hydration or document-reload-free navigation.

This creates reverse ownership, pass-through abstraction, an artificial browser
runtime, probable soft-404 behavior, and proof gaps at exactly the boundaries
the application is meant to own.

## Goals

- Make `packages/docs-content` the earliest semantic owner for all authored
  TaxKit documentation content and content policy.
- Give `packages/docs-fumadocs` one generic, service-shaped substitution point
  with canonical representations and deterministic Layers.
- Keep Effects lazy and flat until the app-owned server runtime executes them.
- Use installed dependency versions and installed APIs throughout the
  migration.
- Make missing-page, pending, error, internal navigation and accessibility
  behavior explicit at the TanStack application boundary.
- Make generated-source ordering and production reachability deterministic.
- Prove the final architecture through package, built-app and browser evidence
  whose claims match their observable boundaries.

## Non-goals

- Search implementation (`TDA-008`).
- Adding `fumadocs-ui`.
- Creating `packages/ui` or another shared design-system package.
- Rewriting public docs copy, navigation taxonomy or examples except for
  path-preserving relocation required by `TDA-001`.
- Dependency, framework or lockfile upgrades.
- Changing Nitro hosting, adding a deployment provider, or redesigning
  deployment configuration.
- SEO, canonical identity, analytics or observability work.
- Publishing, deploying, tagging, versioning packages, or proving a public
  site.
- Reopening implemented SPECs or completed plans as current policy.

## Installed compatibility baseline

Implementation must preserve the versions resolved by `bun.lock` at the target
revision:

| Dependency | Resolved version |
| --- | --- |
| `@tanstack/react-start` | `1.167.65` |
| `@tanstack/react-router` | `1.169.2` |
| `effect` | `4.0.0-beta.98` |
| `fumadocs-core` | `16.9.3` |
| `fumadocs-mdx` | `14.3.2` |
| `react` / `react-dom` | `19.2.6` |
| `vite` | `8.0.14` |
| `nitro` | `3.0.260429-beta` |

Manifest ranges and catalog entries remain as currently declared. This table is
installed compatibility truth, not a recommendation that these versions are
current upstream releases.

## Requirements

| ID | Requirement | Finding and decision trace |
| --- | --- | --- |
| `DAR-001` | `packages/docs-content` owns authored MDX, navigation, examples, TaxKit Schemas, validation, generation configuration/output contract, public content service and deterministic tests. No package path or literal names `apps/docs/content` or imports app-owned navigation. | `TDA-001`, `TDA-P01`, `TDA-P04` |
| `DAR-002` | `packages/docs-fumadocs` exposes a generic `FumadocsSource` Effect service with schema-owned representations, generic tagged lookup/load failures, a generated-loader live Layer factory and deterministic test Layer. It has no TaxKit-specific schema, path, route or collection knowledge. | `TDA-002`, `TDA-P01` |
| `DAR-003` | `DocsContentServiceLive` requires `FumadocsSource`, decodes the generic representation once into canonical TaxKit content, maps generic errors into content-owned errors, and does not expose unchecked provider objects or `unknown` render payloads. | `TDA-001`, `TDA-002`, `TDA-P01` |
| `DAR-004` | `apps/docs` owns a server-only ManagedRuntime, Layer composition, route execution and route transport. Browser code neither imports server entries nor receives a fake Effect runtime. | `TDA-003`, `TDA-P02`, `TDA-P03` |
| `DAR-005` | Initial and client missing-page requests use TanStack `notFound()` and the smallest owning `notFoundComponent`; the built initial response has status 404. Expected source/preload failures remain schema-encoded recoverable outcomes, while defects and interruptions reach the framework error boundary. | `TDA-004`, `TDA-P02` |
| `DAR-006` | All internal docs destinations, including links emitted from MDX, use router-native navigation. External, download, mail and same-document fragment links remain ordinary anchors. Internal navigation performs no document request and restores focus predictably. | `TDA-005` |
| `DAR-007` | The app owns a proportional, headless, app-local UI foundation: skip link, landmarks, labelled navigation, current-page semantics, focus-visible treatment, reduced-motion behavior, responsive keyboard-safe navigation, stable pending/error/not-found surfaces and contrast checks. | `TDA-007` |
| `DAR-008` | Turbo declares generated-source inputs, outputs and ordering; development and production Knip include all three docs workspaces and their real entries; package source/type/default conditions and build policy are explicit. | `TDA-006`, `TDA-P03` |
| `DAR-009` | Package tests use deterministic source and content Layers, malformed and missing fixtures, and import-boundary checks. Built-app proof covers initial SSR, hydration, client navigation, 404, error/loading stability, accessibility and console cleanliness. | `TDA-002` through `TDA-007`, `TDA-P04`, `TDA-P05` |
| `DAR-010` | All durable architecture, README, owner-policy, proof and lifecycle pointers agree with the target graph; local evidence is never described as deployment, provider, publication or public-site proof. | `TDA-001` through `TDA-007`, `TDA-P05` |
| `DAR-011` | Existing manifest dependency versions and the lockfile remain unchanged unless implementation proves an unavoidable blocker and Cooper separately accepts an upgrade SPEC. | Accepted dependency decision |
| `DAR-012` | Search policy has a named future owner in `packages/docs-content`, but no search-specific schema, index, service method or UI is added by this migration. | `TDA-008` |
| `DAR-013` | The exact final implementation candidate has a bounded, secret-safe screenshot set and manifest covering the representative page, responsive navigation, skip-link focus, pending, recoverable error, framework not-found and conditional reduced-motion states. Screenshots supplement the behavioral oracles in `DAR-009`; they never prove SSR content, hydration diagnostics, request type, HTTP status, keyboard behavior, contrast, motion suppression or console cleanliness. | `TDA-004` through `TDA-007`, `TDA-P05` |

## Ownership and dependency direction

### `packages/docs-content`

Owns:

- `content/**/*.mdx`, `navigation.json` and `examples/**`;
- TaxKit frontmatter, navigation, source-path, content-page and future search
  policy Schemas;
- source generation configuration and the `.source/**` generated-output
  contract;
- the TaxKit generated-collection adapter supplied to
  `makeFumadocsSourceLive`;
- `DocsContentService`, content-owned tagged errors and the live/test Layers;
- content validation and deterministic accepted/rejected fixtures;
- browser-safe and server-only public entrypoints.

It decodes Fumadocs source representations at its ingress and exposes only
canonical TaxKit values. It does not run Effects or own an application runtime.

### `packages/docs-fumadocs`

Owns only:

- generic source representation Schemas;
- generic `FumadocsPageNotFoundError` and `FumadocsSourceLoadError`;
- the `FumadocsSource` service contract with named `getPage` and `listPages`
  operations;
- a live Layer factory over a generated Fumadocs collection adapter and a
  decoded deterministic test Layer;
- shared `fumadocs-mdx` compile configuration;
- the existing image and code-block render primitives only while they remain
  genuinely reused and production-reachable.

It must not know TaxKit frontmatter, navigation, content roots, route paths or
generated collection locations. The generated collection adapter is a narrow
construction dependency supplied once when the live Layer is built. The live
Layer alone wraps the installed Fumadocs loader and converts provider
promise/callback failures into typed Effects. The adapter is not a generic
service operation, callback escape hatch or raw-client export, and provider
page objects never leave the Layer. Routes and content operations call only the
named `FumadocsSource` operations.

### `apps/docs`

Owns:

- TanStack Start router and generated route tree;
- server functions/loaders and direct route-root transport restoration;
- the app server runtime and Layer composition;
- framework-native not-found, pending and error policy;
- app-local layouts, navigation, MDX component mapping and accessibility;
- router-native internal navigation;
- built application and browser-journey harnesses.

Routes own transport restoration and outcome routing. Policy-owning containers
coordinate app behavior and local commands. Presentation leaves receive
readonly values and callbacks and never acquire services, import Layers or
execute runtimes. One-use mapping, decoding and error handling stays inline at
its owning boundary. A new shared component, hook or helper is admitted only
when its owner, semantic weight, reuse or substitution point, simpler call
graph and focused proof are recorded; `common`, `utils`, pass-through hooks and
barrel-only abstractions are rejected.

### Dependency graph

```ts
apps/docs
  -> @taxkit/docs-content public/browser/server contracts
  -> @taxkit/docs-fumadocs/render only when a primitive is genuinely reused

packages/docs-content
  -> @taxkit/docs-fumadocs/config
  -> @taxkit/docs-fumadocs service, live and test contracts

packages/docs-fumadocs
  -> Effect
  -> installed Fumadocs compile/source APIs
  -> React only for the narrow render entry

Forbidden:
packages/docs-* -> apps/docs
packages/docs-fumadocs -> TaxKit content or route contracts
browser entry -> server entry or generated .source/server
presentation leaf -> Effect service, Layer or runtime
```

## Current and target file trees

```text
Current

apps/docs/
  content/**/*.mdx
  examples/**
  navigation.json
  src/routes/{__root,index,$}.tsx
  src/lib/docs/{loaders,route-boundary}.ts
  src/lib/mdx/{client-loader,components}.tsx
  src/lib/runtime.{server,client}.ts

packages/docs-content/
  source.config.ts                 # points into apps/docs/content
  src/{schemas,errors,service,live.layer}.ts
  src/validation/**                # imports apps/docs/navigation.json
  .source/**                       # generated

packages/docs-fumadocs/
  src/config.ts
  src/source.ts                    # per-call generic callbacks
  src/schemas.ts                   # duplicate meta and page-tree contracts
  src/tree.ts                      # no production TaxKit consumer
  src/render/**
```

```text
Target

packages/docs-content/
  content/**/*.mdx
  examples/**
  navigation.json
  source.config.ts
  .source/**                       # generated, never hand-edited
  src/
    schemas.ts
    errors.ts
    service.ts
    live.layer.ts                  # requires FumadocsSource
    test.layer.ts
    generated-source.layer.ts      # TaxKit collection adapter
    validation/**
    client.ts
    server.ts

packages/docs-fumadocs/
  src/
    schemas.ts
    errors.ts
    service.ts
    live.layer.ts
    test.layer.ts
    config.ts
    render/**

apps/docs/
  src/
    routes/{__root,index,$}.tsx
    components/{docs-shell,docs-navigation,pending,not-found,catch-boundary}.tsx
    lib/docs/{loaders,route-boundary}.ts
    lib/mdx/{client-loader,components}.tsx
    lib/runtime.server.ts
    router.tsx
    server.ts
    styles.css
```

The exact file split may stay smaller when one-use logic is clearer inline.
Do not create generic `utils`, pass-through barrels, or files that only rename
an installed API.

## Call graphs

### Current production request

```ts
HTTP request
  -> TanStack catch-all loader
    -> createServerFn
      -> dynamic import(app runtime.server)
        -> DocsContentServiceLive
          -> per-call FumadocsSourceLoader callbacks
            -> packages/docs-content/.source/server
          -> apps/docs/navigation.json
      -> preload browser MDX collection
      -> encode Schema.Exit
  -> route restores Result
    -> route-owned presentation
      -> browser collection useContent()
```

The router separately installs an isomorphic `RouterContext.docs`. Its browser
implementation deliberately dies, while loaders do not use that context.

### Target generation and build

```ts
packages/docs-content/content + navigation + source.config
  -> @taxkit/docs-content generate
    -> @taxkit/docs-fumadocs/config
    -> packages/docs-content/.source/{server,browser}
  -> content validation
  -> docs package tests and types
  -> docs-fumadocs compiled package
  -> apps/docs types and production build
```

Turbo must name content/navigation/config as inputs, `.source/**` as generated
outputs, and package/app build dependencies explicitly. A clean candidate must
not depend on an untracked pre-existing `.source`.

### Target initial SSR

```ts
HTTP request
  -> TanStack route loader/server function
    -> app-owned server ManagedRuntime.runPromise
      -> DocsContentService
        -> FumadocsSource
          -> generated TaxKit collection live Layer
        -> decode generic page representation
        -> canonical DocsContentPage
      -> preload browser source path
      -> encode expected Schema.Exit outcome
  -> direct route root restores encoded outcome
    -> success container + readonly leaves
    -> SSR HTML contains requested MDX
```

### Target hydration

```ts
SSR HTML + dehydrated loader representation
  -> direct route-root Schema restore
  -> canonical readonly route values
  -> @taxkit/docs-content/client collection
  -> MDX component map
  -> hydration with no markup warning or console error
```

The browser has no `DocsContentService` runtime. It consumes the browser-safe
generated collection and encoded loader values.

### Target client navigation

```ts
sidebar Link or internal MDX Link
  -> TanStack client navigation
  -> route loader/server-function transport
  -> server runtime and services
  -> encoded outcome restore
  -> render next MDX page
  -> predictable focus target
```

The browser proof must observe zero document requests for the navigation and
must observe the expected loader/server-function request when the installed
TanStack Start transport uses one.

### Target missing page and failures

```ts
missing path
  -> DocsContentService.getPage
    -> FumadocsPageNotFoundError
    -> DocsPageNotFoundError
  -> app maps to TanStack notFound()
  -> smallest owning notFoundComponent
  -> initial HTTP response status 404

source/preload expected failure
  -> safe schema-tagged error
  -> Schema.Exit transport
  -> route-owned recoverable error UI

defect or interruption
  -> not encoded as expected failure
  -> TanStack error boundary
```

### Target malformed content

```ts
malformed frontmatter/navigation/MDX
  -> package generation or content validation ingress
  -> Schema/compile failure with source-relative safe detail
  -> non-zero generate/validate/build

malformed generated source representation
  -> FumadocsSource live Layer representation decode
  -> FumadocsSourceLoadError
  -> DocsSourceError at DocsContentService boundary
  -> recoverable route error or non-zero validation
```

### Target deterministic tests

```ts
docs-content test
  -> DocsContentServiceLive
    -> FumadocsSourceTest(decoded fixtures)
  -> canonical content assertions

docs-fumadocs test
  -> FumadocsSourceTest
  -> getPage/listPages/missing/malformed assertions

built docs journey
  -> production app build/start
  -> real HTTP + browser
  -> SSR/hydration/navigation/404/a11y/console assertions
```

```ts
final visual evidence
  -> all non-visual gates pass
  -> freeze clean implementation commit
  -> build and record built-output digest
  -> real routes + two narrow test-only state fixtures
  -> capture named viewport PNGs
  -> write safe manifest under full commit identity
  -> primary-owner visual review
```

This visual branch consumes the same candidate but does not feed, replace or
weaken any behavioral oracle.

Search has no target runtime call graph in this SPEC because `TDA-008` is
deferred.

## Boundary schemas, errors and encoding

The generic source package must expose a schema-decoded representation rather
than a Fumadocs provider object or `unknown` service contract. The minimal
representation contains only what the content service consumes: source path or
identifier, slug segments, processed Markdown, JSON-compatible frontmatter and
the browser source path required by `createClientLoader`.

`packages/docs-content` then decodes that representation with
`DocsPageFrontmatter`, `DocsPagePath`, `DocsPageSlug` and `DocsSourcePath`.
Navigation is decoded at the package-owned JSON/file ingress. Do not duplicate
these types in the app.

Errors:

- `FumadocsPageNotFoundError`: generic slugs and optional locale only;
- `FumadocsSourceLoadError`: safe operation and message fields, with no
  unchecked provider object in the public error;
- `DocsPageNotFoundError`: canonical TaxKit docs path;
- `DocsSourceError`: safe content-owned operation/source/message fields;
- route transport errors: app-owned restore failures only.

Raw causes may remain in an internal Effect `Cause` for debugging, but must not
cross server-function transport, be persisted, or appear in a user-facing
error. `DocsContentServiceLive` maps generic source errors once. Route
boundaries encode only admitted safe tagged errors and canonical success
values.

Remove `DocsRenderablePageData` and its `unknown` body, structured-data and TOC
fields unless implementation proves an exact, schema-safe consumer. Search
deferral is not a reason to preserve an unchecked search payload.

## Runtime and import policy

- The app owns one module-scoped server ManagedRuntime for its server isolate.
- `DocsContentServiceLive` is provided with the TaxKit generated
  `FumadocsSource` live Layer at the app boundary.
- The app exports an explicit disposal operation for tests and development
  lifecycle integration. No request creates a runtime.
- Because the admitted live Layers are not resourceful today, a production
  adapter without an installed lifecycle hook may use isolate lifetime; that
  limitation must be documented rather than hidden behind a fake browser
  runtime.
- Browser modules import only browser-safe package entries and restored route
  values.
- `runtime.client.ts`, unused `RouterContext.docs` and isomorphic runtime
  indirection are retired unless a real browser service consumer is introduced
  by a separately accepted requirement.
- `source`, `types` and `default` package conditions must point to the correct
  source and built artifacts. Compiled `docs-fumadocs` exports only admitted
  entrypoints. Source-only `docs-content` exposes narrow browser/server/service
  entries without a broad root barrel.

## Route and UI policy

The existing headless presentation direction is preserved:

- no `fumadocs-ui`;
- no shared `packages/ui`;
- existing generic `Picture` and `Pre` primitives remain in
  `docs-fumadocs/render` only if both are reachable and generic;
- shell, navigation, pending, not-found, catch boundaries and link
  classification remain app-owned;
- public copy and information architecture remain unchanged.

Minimum app-owned interaction contract:

- a visible-on-focus skip link to the main content;
- semantic header/nav/main/article landmarks and a labelled docs navigation;
- `aria-current="page"` or router-equivalent current state;
- persistent, visible focus treatment;
- focus restoration to the page heading or main region after internal client
  navigation without stealing focus on initial hydration;
- reduced-motion handling for any introduced transition;
- keyboard-accessible responsive navigation with no focus trap;
- stable pending/error/not-found layout that does not erase the route shell;
- checked text/background and interactive-state contrast;
- clean console during success, recoverable failure and missing-page journeys.

Route files restore transport and select not-found, recoverable or defect
outcomes. An app-owned policy container coordinates navigation, focus and any
retry command. Focused shell, navigation and article leaves render readonly
values and callbacks. A route must not grow into a mixed transport, runtime,
navigation and presentation component, and a hook that only renames one call
does not satisfy the container boundary.

## Production graph and package policy

- Preserve all installed versions in manifests and `bun.lock`.
- Give `packages/docs-content` a named generation command and make its build
  contract unambiguous.
- Declare generation inputs/outputs in `turbo.json`; app build must receive a
  generated source produced from the same candidate.
- Add `packages/docs-fumadocs` to development Knip with its admitted
  entrypoints.
- Remove `apps/docs`, `packages/docs-content` and
  `packages/docs-fumadocs` from production Knip ignores; model their production
  entries instead.
- Retain direct app dependencies only when app source/config imports them.
- Remove page-tree exports, duplicate metadata Schemas and callback source
  exports when reachability proves no consumer.
- Add a patch Changeset for private `@taxkit/docs-content` and
  `@taxkit/docs-fumadocs` because their package-facing exports and behavior
  change. This records release impact only; it does not authorize versioning,
  tagging or publication.

## Verification and proof

| Claim | Required observable | Focused proof | False green rejected |
| --- | --- | --- | --- |
| Package-owned content | Generation and validation read only package-owned content/navigation/examples. | `bun run docs:validate`; path/import audit; clean generation. | Existing generated output hides an app-path dependency. |
| Generic Fumadocs service | Live and test Layers satisfy the same named service contract and decode representations. | `bun run --filter=@taxkit/docs-fumadocs test`; type/build; accepted/rejected fixtures. | Tests call a different helper than production or pass a loader callback per operation. |
| Canonical content boundary | Generic representations decode once and outward values contain no provider/unknown fields. | docs-content tests/types; lint and `rg` audit. | Type assertions or current generated data happen to fit. |
| Server/browser separation | Browser production graph contains no server entries, runtime or `.source/server`. | app build, production Knip, bundle/import audit. | Source-condition dev resolution masks a production leak. |
| Initial SSR | Built HTTP response contains requested page content before browser JavaScript. | Start built app; direct HTTP response/body assertion. | Component test or client-rendered DOM only. |
| Hydration | Built page hydrates with no mismatch or console diagnostics. | Playwright against built app. | Static HTML or memory router only. |
| Client navigation | Internal sidebar and MDX links change route without a document request and render the target page. | Playwright request/navigation observation and focus assertion. | URL changes after full reload. |
| No soft 404 | Direct missing-page response has HTTP 404; client navigation uses not-found UI. | HTTP status plus browser journey. | A page that visually says not found but returns 200. |
| Failure stability | Expected source/preload errors render recoverably; defects reach framework error policy. | deterministic route/service fixtures and built error journey. | Tests only restore a hand-built success value. |
| Accessibility foundation | Keyboard, focus, landmarks, current page, contrast and reduced motion meet the minimum contract. | Browser assertions plus focused accessibility/contrast review. | Presence of ARIA attributes without interaction proof. |
| Production reachability | All docs workspaces are analyzed and generated/build ordering is reproducible. | `bun run knip`, `bun run knip:production`, clean candidate build. | Ignored workspaces or stale `.source`. |
| Visual-state evidence | Every required visible state is captured from the exact clean built candidate and indexed by a safe manifest. | `bun run --filter=docs test:built -- --screenshots --candidate=<full-candidate-commit>`; manifest validation; primary-owner visual review. | A screenshot from an uncommitted/stale build, or a visually correct image presented as proof of a non-visual behavior. |
| Repository closeout | Required docs, manifests, tasks and code agree. | `bun run check:docs`, `bun run check:repository-paths`, `bun run verification`, `git diff --check`. | Aggregate green result with no built docs journey. |

Implementation closeout commands:

```sh
bun install --frozen-lockfile
bun run docs:validate
bun run --filter=@taxkit/docs-fumadocs test
bun run --filter=@taxkit/docs-fumadocs check-types
bun run --filter=@taxkit/docs-fumadocs build
bun run --filter=@taxkit/docs-content test
bun run --filter=@taxkit/docs-content check-types
bun run --filter=@taxkit/docs-content build
bun run --filter=docs check-types
bun run docs:build
bun run --filter=docs test:browser
bun run --filter=docs test:built
bun run knip

bun run check:docs
bun run check:repository-paths
bun run verification
git diff --check
```

`bun run --filter=docs test:built` is the app-owned built-production
HTTP/Playwright harness. It builds the app, starts the generated Nitro/Vercel
function and static assets behind a command-owned ephemeral local server,
checks readiness, runs the SSR, hydration, 404, pending, navigation,
server-function, diagnostic and cleanup assertions, and then stops the browser
and server. `bun run --filter=docs test:built -- --screenshots` adds the bounded
provisional visual mode. `DOCS-APP-006` binds the retained visual set to the
exact clean commit with
`bun run --filter=docs test:built -- --screenshots --candidate=<full-candidate-commit>`.

Local browser and built-app receipts prove only the tested local candidate.
Deployment, provider, public URL and public-site behavior need separate
authority and external readback.

### Screenshot evidence contract

Final screenshot evidence belongs to the implementation execution plan, not to
the application or package source tree. Capture into:

```text
docs/exec-plans/completed/docs-application-architecture/
└── screenshots/<full-candidate-commit>/
    ├── manifest.json
    ├── 01-page-desktop-1440x1000.png
    ├── 02-nav-mobile-open-390x844.png
    ├── 03-skip-link-focus-desktop-1440x1000.png
    ├── 04-pending-desktop-1440x1000.png
    ├── 05-recoverable-error-desktop-1440x1000.png
    ├── 06-not-found-desktop-1440x1000.png
    └── 07-reduced-motion-desktop-1440x1000.png
```

Move this directory with the plan to the equivalent `completed` path only
after final acceptance. The capture command uses viewport screenshots rather
than full-page screenshots and must run against one clean, committed, built
implementation candidate. The manifest records the full candidate commit,
clean-worktree precondition, a content digest of the built output used by the
harness, capture command, browser name/version, timestamp, repository-relative
route/fixture identifiers, viewport, expected and observed visible
postconditions, each image digest, reviewer, limitations and non-claims. It
must not contain credentials, cookies, authorization data, private content,
absolute checkout paths, personal hostnames or browser chrome that exposes
them. Images use only public docs copy and sanitized deterministic fixture
messages.

| File | Exact journey and state | Viewport and deterministic input | Expected visible postcondition | Limitations and non-claims |
| --- | --- | --- | --- | --- |
| `01-page-desktop-1440x1000.png` | Direct load of the representative guide `/guides/calculate-australian-take-home-pay`, settled after hydration. | Chromium, `1440x1000`; real generated content from the candidate. | App shell, labelled docs navigation, current item, guide heading and representative body/code content are readable with no clipping or overlap. | Does not prove the HTML arrived in SSR, hydration was diagnostic-free, contrast passed or the console was clean. |
| `02-nav-mobile-open-390x844.png` | Direct load of the same guide at the narrow breakpoint, then open the responsive docs navigation. | Chromium, `390x844`; real generated content and the app's real nav disclosure. | Navigation is visibly open, its trigger is visibly expanded, the current guide is identifiable and the main content is not incorrectly clipped or obscured. If the accepted implementation has no disclosure, capture its visible narrow navigation state under this name and explain the evidenced `not_applicable` interaction in the manifest. | Does not prove keyboard operability, focus containment, client routing or document-request behavior. |
| `03-skip-link-focus-desktop-1440x1000.png` | Fresh direct load of `/start`, then the first `Tab` keypress. | Chromium, `1440x1000`; real page and keyboard input. | The skip link and its focus indicator are visibly present. | Does not prove tab order, the eventual focus target, keyboard activation or contrast; behavioral assertions must prove them separately. |
| `04-pending-desktop-1440x1000.png` | Client navigation from `/start` to the representative guide while the page load is deterministically held pending. | Chromium, `1440x1000`; test-owned `delayed-page-load` fixture in `apps/docs/test/fixtures/visual-states.ts`, composed only by the built test harness. | The stable shell remains visible with an unambiguous pending treatment and no destructive layout collapse. | Does not prove loader transport, duration, request type, eventual completion, reduced motion or console behavior. No production-only evidence route or scenario switch may be added. |
| `05-recoverable-error-desktop-1440x1000.png` | Load `/start` through the deterministic recoverable source-failure composition, then render its admitted retry surface. | Chromium, `1440x1000`; test-owned `recoverable-source-error` fixture in `apps/docs/test/fixtures/visual-states.ts`. | Shell/navigation remain visible; a sanitized recoverable docs message and retry affordance are visible; no raw cause or machine path appears. | Does not prove error tagging, `Schema.Exit` restoration, retry success or console cleanliness. No production-only evidence route or scenario switch may be added. |
| `06-not-found-desktop-1440x1000.png` | Direct load of the genuinely unmatched path `/__docs-evidence__/missing`. | Chromium, `1440x1000`; content validation asserts that the reserved path is absent, with no synthetic success response. | The framework-owned not-found surface and stable app shell are visible. | Does not prove HTTP status 404 or client/initial parity; direct HTTP and browser assertions remain mandatory. |
| `07-reduced-motion-desktop-1440x1000.png` | Load the representative guide with `prefers-reduced-motion: reduce`, exercise the visually relevant navigation transition if one exists, then capture the stable end state. | Chromium, `1440x1000`; browser media emulation and real UI. | Required content, navigation and focus presentation remain visible without a transition-dependent information loss. | Does not prove animation suppression or timing. A computed-style/event oracle must do that. If no visually relevant transition exists, omit the PNG and record `not_applicable` with code and behavioral evidence in the manifest. |

The pending and error fixtures are test-only composition inputs with one owner;
they are not public routes, environment flags or a reusable generic scenario
framework. Any code, generated content, dependency or build-config change
after capture invalidates the entire set. Freeze a new clean implementation
commit, discard or retain the old set only as failed evidence, and recapture
under the new full commit. The screenshot/manifest closeout may be a later
evidence-only commit, but it must not change the implementation candidate it
names.

A visually correct screenshot is explicitly rejected as evidence of SSR
response content, hydration diagnostics, zero document requests, HTTP 404
status, keyboard/focus behavior, contrast, reduced-motion behavior or console
cleanliness. Those claims retain their HTTP, Playwright, accessibility,
computed-style, request-trace and console oracles.

## Implemented evidence and limitations

Implementation has superseded the recorded target-revision baseline:

- a clean generated/build precondition removed docs-content `.source`,
  docs-fumadocs `dist` and the docs app output before the frozen install;
- the frozen install checked 681 installs across 806 packages with no changes,
  then both Knip graphs generated through the compiled Fumadocs config and
  passed;
- Turbo names content, navigation, source config, canonical schema and manifest
  inputs, `.source/**` output, docs-fumadocs compilation, content generation and
  app build order;
- `policy.runtime.test.ts` and docs-content `@effect/vitest` are exercised by
  the six-test content corpus; the MDX component policy is imported by both the
  production validation path and its focused rejected fixture;
- package tests/types/build, content validation, app types/build, the
  seven-test browser route corpus and built HTTP/browser proof pass;
- built proof observes SSR 200 content, direct missing 404, diagnostic-free
  hydration, real internal navigation with zero document requests, focus,
  keyboard, landmarks, responsive navigation, contrast, reduced motion,
  pending, recoverable failure and framework-native not-found behavior.

The clean implementation candidate is
`bf13ca114362708d461787585a9e8f83d0db55d2`. Fresh canonical verification and
the non-visual built-app harness passed before screenshot capture. The retained
[manifest](../exec-plans/completed/docs-application-architecture/screenshots/bf13ca114362708d461787585a9e8f83d0db55d2/manifest.json)
records built-output SHA-256
`40891fad961cc754c3fe09edd5a165d267dc662e967beef906f4066a1190c02d`,
Chromium `148.0.7778.96`, six individually digested PNGs, exact routes or
test-owned fixtures, viewports, expected and observed visible postconditions,
safe artifact fields and primary-owner visual acceptance. Reduced-motion
imagery is evidenced `not_applicable` because the app has no visually relevant
transition; the independent computed-style oracle still passed.

All proof remains local: it establishes no deployment, provider routing,
public URL, publication, production behavior or public availability.
Historical implemented SPECs and completed plans remain trajectory evidence
only.

## Documentation-impact ledger

| Surface | Decision | Inspected/current paths | Required owner change and task |
| --- | --- | --- | --- |
| Canonical docs | Change required | `docs/README.md`, `docs/architecture/{README,package-ownership,package-boundaries,frontend,content-and-posts,testing-and-quality}.md`, `tools/documentation/owner-policy.json` | Update ownership, target graphs, proof distinctions and public roots in `DOCS-APP-001`, `DOCS-APP-003`, `DOCS-APP-006`. |
| Root/app/package READMEs | Change required | `README.md`, `apps/docs/README.md`, `packages/docs-content/README.md`, `packages/docs-fumadocs/README.md` | Describe the final owner, entrypoint, runtime and command contracts in the task that changes each boundary; reconcile in `DOCS-APP-006`. |
| Architecture and standards | Change required | `docs/architecture/{package-ownership,package-boundaries,effect-services,frontend,content-and-posts,testing-and-quality}.md`, `docs/standards/{code-patterns,tooling}.md` | Architecture owners change; standards are preserved unless a focused rule needs clarification. `DOCS-APP-001` through `DOCS-APP-006`. |
| Runbooks and operations | Change required | `docs/runbooks/README.md`, `docs/runbooks/release-readiness.md`, `tools/documentation/runbook-contract.json`, `tools/documentation/runbook-{check.runtime,policy}.ts` | Apply only the approved `DOCS-APP-004` journey-epoch amendment: bind immutable HGI-203 to `docs/evidence/releases/HGI-203-critical-journeys.json`, schema-validate the evolving current owner independently, and preserve every original packet/receipt byte. No operational command, environment, credential, deployment, recovery or authority-stop change. |
| Proof and evidence | Change required | `docs/verification/critical-journeys.json`, `docs/evidence/releases/HGI-203-critical-journeys.json`, immutable HGI-203 packet/receipts, `docs/architecture/testing-and-quality.md`, current app browser harness, future execution-plan screenshot directory | Preserve the original HGI-203 evidence unchanged while retaining its exact journey snapshot; correct the current docs journey oracle and add built-app evidence ownership in `DOCS-APP-004` through `DOCS-APP-006`. The only committed browser artifacts are the bounded `DAR-013` manifest/PNG set carried by the evidence-only closeout commit and moved with the plan from active to completed; transient builds, videos, traces, logs and unbounded/raw browser output are not committed. |
| Skills, AGENTS and metadata | Change required | `docs/skill-profiles/docs-maintainer.md`, `AGENTS.md`, `development-workflows:docs-maintainer` | Update the local docs-maintainer profile paths/commands in `DOCS-APP-001` and `DOCS-APP-006`. Preserve `AGENTS.md`, skill implementation and relative instruction links; no skill baseline migration. |
| Lint, config and CI | Change required | `knip.json`, `knip.production.json`, `turbo.json`, `oxlint.config.ts`, `package.json`, `.github/workflows/quality.yml` | Model generation, docs workspaces and the verified app-owned built-app harness invocation in `DOCS-APP-004` and `DOCS-APP-006`. Existing Quality workflow inherits canonical verification; no new deployment job. |
| SPEC, tasks and lifecycle | Change required | this SPEC, sibling tasks, `docs/product-specs/index.md`, `docs/exec-plans/{active,completed}/README.md` | The implemented SPEC/tasks/index and historical plan agree; the bounded evidence moved with the plan only after all `DOCS-APP-006` proof passed. |
| Tests and fixtures | Change required | current docs-content validation tests, docs-fumadocs tests, app route-boundary tests and browser config | Add deterministic live/test substitution, malformed/missing fixtures, import audits and built-app journeys in `DOCS-APP-001` through `DOCS-APP-006`. |
| Config, exports and generated owners | Change required | three package manifests, `packages/docs-content/source.config.ts`, generated `.source`, app Vite config | Move source inputs, narrow exports, and enforce source/type/default plus generation/build ordering in `DOCS-APP-001`, `DOCS-APP-002`, and `DOCS-APP-006`. |
| Public content lifecycle | Change required | current published MDX/frontmatter/navigation and `docs/documentation-audit/hgi-207/public-mdx-lifecycle.json` | Relocate without copy/status/taxonomy changes, preserve acceptance bindings by updating paths atomically in `DOCS-APP-001`; do not fabricate new publication acceptance. |
| Installed dependency baseline | Preserve | root and three docs manifests, catalog declarations and `bun.lock` | Compare the final manifest/lock diff to the target revision in every task and reject dependency additions or upgrades; a proven compatibility blocker stops for a separate accepted SPEC. |
| Public content semantics | Preserve | authored MDX, navigation values, examples and lifecycle status records | Prove path-normalized content equality plus existing validation in `DOCS-APP-001`; do not rewrite copy, status, taxonomy or information architecture. |
| Release and rollback | Change required | `.changeset/config.json`, private docs package manifests, SPEC/tasks | Add one patch Changeset for both private docs packages during implementation; define per-task recovery and repository rollback. No version, tag, publication or deployment in `DOCS-APP-002` and `DOCS-APP-006`. |
| Critical journeys | Change required | `docs/verification/critical-journeys.json`, current docs browser harness | Replace the overbroad memory-harness oracle with explicit validation, built SSR, hydration, navigation, 404, accessibility and non-claim boundaries in `DOCS-APP-006`. |
| Search, SEO, hosting, deployment and public-site proof | Not applicable | search stubs/current docs app, runbook/operations indexes, deployment configuration and public-site owners | `TDA-008`, non-goals and authority limits exclude these surfaces. Negative scope audit in `DOCS-APP-005`/`006`; no file is changed merely to restate an exclusion. |

## Harness invariant crosswalk

| Invariant | Application |
| --- | --- |
| `HC-OUTCOME-001` | The whole migration has one owner and terminal acceptance state. |
| `HC-CTX-001` | Content, generic integration and application behavior are corrected at their earliest semantic owners. |
| `HC-REPO-001` | SPEC, tasks, active plan when created, durable docs and proof remain a coherent continuation chain. |
| `HC-BOUNDARY-001` | Generic/generated representations decode once; route outcomes encode explicitly. |
| `HC-DOC-001` | Architecture, public content and implementation evidence remain separate document classes. |
| `HC-PROOF-001` | Package, built-app, browser, deployment and public-site claims have distinct observables. |
| `HC-AUTH-001` | Local implementation does not authorize versioning, publication, deployment or provider mutation. |
| `HC-FEEDBACK-001` | Missing, malformed, pending and error states remain visible and recoverable. |
| `HC-DEPENDENCY-001` | Installed versions and dependency direction are explicit; upgrades are excluded. |
| `HC-EVIDENCE-001` | Clean-candidate and browser receipts retain exact target identity and limitations. |
| `HC-LIFETIME-001` | The app owns runtime lifetime and test/dev disposal; no request-local or fake browser runtime. |

Continuous harness metrics, automation epochs and provider controls are not
applicable: this migration does not create a scheduled process, continuous
evaluation loop or external provider operation.

## Migration and rollback

The executable sequence is owned by the sibling task list:

1. relocate content/navigation/examples and preserve their lifecycle bindings;
2. establish and prove the generic Fumadocs service boundary;
3. make the content service depend on it and compose the server runtime in the
   app;
4. implement native route outcomes and built initial SSR/404 proof;
5. correct internal MDX navigation and the accessibility foundation;
6. complete generation/production reachability and non-visual built-browser
   journeys, freeze the exact clean implementation candidate, capture and
   review the bounded screenshot set, then reconcile durable docs and close the
   lifecycle.

Each task must leave a coherent reviewable state. If a slice fails, retain the
failure evidence, revert only that slice through normal Git history, and keep
the task pending. Do not restore app-owned content paths or callback wrappers
after dependents land piecemeal; roll back to the last task boundary. Generated
`.source`, build output and transient browser artifacts are reproducible and
must not be used as rollback state. The bounded screenshot set is retained
evidence, not a rollback source. If the candidate changes, its screenshot set
is stale and cannot be relabelled or copied forward.

Stop and return to Cooper if installed APIs make the accepted three-owner
boundary impossible without an upgrade, if a real consumer requires the
page-tree abstraction, or if runtime disposal needs an external hosting change.
Do not silently expand scope.

## Risks and tradeoffs

- Moving authored files can break relative MDX links, example references and
  lifecycle records. Validation and exact path-binding checks must pass in the
  same slice.
- A generic service can become a pass-through wrapper. Its admission depends on
  canonical representation decoding, real live/test substitution and removal
  of per-operation callbacks.
- Source conditions can make development pass while compiled production
  exports fail. Production Knip, compiled-package builds and app-consumer proof
  are mandatory.
- Framework not-found behavior can differ between client navigation and the
  built server response. Both are independent acceptance claims.
- A browser component harness can remain useful for route codec scenarios, but
  it cannot substitute for built-app SSR/hydration proof.
- Runtime disposal may be a no-op with current pure Layers. The owner and
  limitation still must be explicit so future resourceful Layers cannot hide
  behind process lifetime.
- Screenshot evidence can become detached from the code it depicts. Full
  candidate identity, built-output digest, clean precondition, file digests and
  mandatory recapture after any implementation change prevent a stale visual
  set from closing the task.

## Acceptance criteria

- `DAR-001` through `DAR-013` are implemented and mapped to completed sibling
  tasks.
- `TDA-001` through `TDA-007` have accepted proof and `TDA-P01` through
  `TDA-P05` remain true.
- `TDA-008` remains explicitly deferred with no search implementation.
- No durable package or docs path points from a docs package back into
  `apps/docs` content ownership.
- The generic Fumadocs service has production and deterministic test Layers and
  no TaxKit knowledge.
- No browser bundle imports a server runtime, server entry or generated server
  source.
- Initial SSR, hydration, router-native MDX navigation, initial HTTP 404,
  recoverable errors, accessibility and console cleanliness pass against the
  built app.
- Generation/build ordering and production Knip cover all three docs
  workspaces.
- Public docs copy, status and navigation taxonomy are unchanged except for
  portable owner-path relocation.
- All documentation-impact rows are resolved with path evidence.
- A patch Changeset records the two private package contract changes without
  versioning or publishing them.
- Exact dependency versions and `bun.lock` remain unchanged.
- Focused commands, `bun run verification`, `git diff --check` and primary-owner
  review pass on the final candidate.
- The final candidate's screenshot manifest and every required image pass
  primary-owner visual review; a conditional reduced-motion omission has
  explicit evidenced `not_applicable` status.
- Screenshots are never cited as the oracle for SSR, hydration diagnostics,
  request type, HTTP status, keyboard/focus behavior, contrast, motion
  suppression or console cleanliness.
- Final evidence states that local proof does not establish deployment,
  publication, provider state or public-site behavior.

## References

- [Repository guide](../../AGENTS.md)
- [Documentation router](../README.md)
- [Package ownership](../architecture/package-ownership.md)
- [Package boundaries](../architecture/package-boundaries.md)
- [Effect services](../architecture/effect-services.md)
- [Frontend architecture](../architecture/frontend.md)
- [Content and posts](../architecture/content-and-posts.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Docs app README](../../apps/docs/README.md)
- [Docs content README](../../packages/docs-content/README.md)
- [Docs Fumadocs README](../../packages/docs-fumadocs/README.md)
- [Sibling implementation tasks](./docs-application-architecture.tasks.json)
