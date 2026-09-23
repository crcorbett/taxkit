---
document_type: app-readme
lifecycle: current
authority: canonical
owner: taxkit-docs-app-owner
last_reviewed: 2026-08-28
review_trigger: docs route, content boundary, build target, runtime, credential source, proof or deployment ownership change
---

# Docs app

This private TanStack Start app renders the public TaxKit developer
documentation.

It owns routes, the app shell, navigation presentation, app-local MDX component
composition and browser rendering. It does not own canonical docs schemas,
validation policy or generated Fumadocs source access; those live in
`@taxkit/docs-content`. Reusable Fumadocs integration lives in
`@taxkit/docs-fumadocs`.

## Content root

Public MDX content lives in:

```txt
packages/docs-content/content
```

Each top-level section owns an `index.mdx` file. Later content tasks can add
child pages below the matching section directory.

## Navigation contract

The public docs navigation is defined in:

```txt
packages/docs-content/navigation.json
```

The required top-level sections are:

- Start
- SDK
- API
- Guides
- Concepts
- Contributing
- Reference

The navigation file is the source of truth for sidebar order until a docs
runtime owns a generated or typed navigation API. It is decoded and validated
by `@taxkit/docs-content`.

## Runtime graph

```ts
Production: docs page

browser
  -> TanStack route loader
    -> createServerFn
      -> dynamic .server module
        -> one app-owned ManagedRuntime
          -> DocsContentService + DocsRuntimeProbe
            -> @taxkit/docs-content live layer
              -> @taxkit/docs-fumadocs FumadocsSource
              -> TaxKit generated collection adapter
              -> packages/docs-content/.source/server
              -> schema-decoded navigation.json representation
        -> schema-encoded Exit representation
    -> TanStack SSR hydration or client-navigation transport
      -> direct route-root restore and Result match
        -> @taxkit/docs-content/client
          -> Fumadocs compiled MDX module
        -> @taxkit/docs-fumadocs/render
        -> app-local MDX component map
```

## Commands

```txt
bun run --filter=docs dev
bun run --filter=docs dev:vite
bun run --filter=docs check-import-boundaries
bun run --filter=docs test
bun run --filter=docs test:browser
bun run --filter=docs test:built
bun run --filter=docs test:cloudflare-built
bun run --filter=docs test:cloudflare-hosted
bun run --filter=docs build:cloudflare
bun run --filter=docs check-types
bun run --filter=docs build
bun run --filter=docs preview
bun run --filter=@taxkit/docs-content check-examples
bun run docs:validate
```

`dev` is the authoritative Alchemy-managed Cloudflare development path. The
root adapter selects Doppler project/config `taxkit/dev`, strips ambient
Doppler and Cloudflare values, disables Doppler fallback and both Bun and
Alchemy `.env` loading, and then runs the source-neutral internal `alchemy dev`
command. Alchemy's local `dev_<user>` stage is decoded separately; Preview and
Production inputs and evidence remain limited to `pr-N` or `prod`. Run
`bun run check:doppler-custody` after the repository-scoped login described in
the [deployment runbook](../../docs/runbooks/docs-deployment.md). A successful
local start does not grant provider authority or prove a deployment.

`dev:vite` is the fast, infrastructure-free portless Vite path at
`https://docs.taxkit.localhost`.
Alchemy beta.64 injects its Cloudflare Vite plugin for the native resource;
standalone Vite installs the same official plugin only when the documented
`ALCHEMY_CLOUDFLARE_VITE_INJECTED` guard is absent.

`@taxkit/docs-content` `check-types` includes `check-examples`, so the
package-owned public examples stay connected to current SDK/API/calculator
exports.

Run `build` before `preview`. Turbo orders the package-owned content build
before the app, while a direct Vite app build regenerates the same package-owned
source through `source.config.ts`. The config-only Fumadocs export is
source-owned, so a clean direct app build does not require a prebuilt workspace
artifact. The Vite config resolves the Fumadocs config and generated-source
paths from its own file location, so the standalone and repository-root
Alchemy builds use the same generated source even after a cached package
build. `dev:vite` and `preview` expose the app through portless.

`test:browser` runs the programmatic TanStack client-route harness in Chromium.
It proves success, expected failures, malformed transport and framework error
boundaries after `Route.useLoaderData`; it does not prove SSR or hydration. Use
the built app for initial SSR, hydration and real client-navigation proof.

`test:built` builds the production Cloudflare Worker/assets output and executes
the generated no-bundle Worker through a command-owned local workerd server. It
asserts a known page in the HTTP response before browser JavaScript, hydration
without warnings or errors, real sidebar and authored-MDX client transitions
with zero document requests, browser back/forward, heading focus without
stealing initial-hydration focus, pending state, framework-native client
not-found behavior and a direct HTTP 404. It also checks the skip link,
landmarks, labelled/current navigation, mobile disclosure, representative
contrast, reduced-motion rendering, immutable asset headers, runtime reuse,
filesystem isolation and compressed upload size. The command owns
browser/workerd cleanup. `test:cloudflare-built` remains an explicit alias for
the same canonical proof command. Add `-- --screenshots` for the bounded
candidate-bound desktop/mobile PNG and digest manifest under ignored
`tmp/docs-cloudflare/`. The desktop capture shows the representative guide;
the mobile capture shows its open navigation state. Screenshot review
supplements these behavioral assertions and cannot prove request type, focus
behavior, contrast, motion suppression, HTTP status, hydration, console
cleanliness or hosted behavior.

`build` and its compatibility alias `build:cloudflare` select the exact
official Cloudflare Vite adapter and emit the deployable no-bundle Worker at
`dist/server/index.js` plus `dist/client` assets. The canonical built proof
strips provider credentials from the child environment, performs a Wrangler
dry-run, and runs an isolated output-only copy under real workerd. It reuses the
built-app behavioral contract for SSR, assets, server functions, 404,
hydration, no-document navigation, accessibility and console cleanliness, and
adds concurrent-isolate, filesystem, binding, compressed-upload-size, local
readiness-timing and immutable asset-header oracles. The local timing is not a
Cloudflare CPU-startup-limit receipt. The exact verified invocation is:

```sh
bun run --filter=docs test:cloudflare-built
```

This is local workerd evidence only. It does not prove Alchemy state, a
Cloudflare deployment, a `workers.dev` URL, Preview, Production or rollback.
The former docs-app Nitro/Vercel bridge has been removed after local parity;
Nitro remains an independent owner only where another application still uses
it. Final hosted requalification of the exact retirement candidate and the
report-only Alchemy state boundary remain separate claims.

Root `alchemy.run.ts` composes the private
`@taxkit/infrastructure` declaration of
`Cloudflare.Website.Vite("DocsWebsite")`. Alchemy owns Vite build execution,
assets, the SSR Worker lifecycle and the physical Worker name as one logical
resource. Its beta.64 memo includes the lockfile and both sibling docs
packages, so those authored inputs participate in Alchemy's resource input.
The standalone `build:cloudflare` alias and workerd harness are provider-free
preflight proof; their `dist/**` output is not asserted to be the exact artifact
produced inside an Alchemy plan/apply. `.wrangler/**` and `dist/**` remain
ignored generated output and are never deployment receipts.

Preview and exact-stage teardown repository source selects only
`taxkit/stg_preview` through the shared Preview GitHub environment. Preview
selects `taxkit/ci` separately for its two Turbo consumers after cache saves;
teardown does not fetch it. Their upload steps receive only a separately
prepared allowlist of sanitised proof files, while raw provider output stays on
the runner. Production uses its separate protected `taxkit/prd` bridge, fixed
`prod` stage and the same allowlisted upload owner. No hosted Doppler fetch is
claimed before the separately approved TaxKit bridge is created and read back.

Exact Preview, Production, teardown, rollback and Alchemy-state operations
belong to `docs/runbooks/docs-deployment.md`; dated sanitized observations
belong below `docs/evidence/deployments/`. The hosted harness requires the
read-back URL, candidate, stage, environment, plan/config/lock/deployment-input
digests, Worker/deployment/version identities, evidence directory and rollback
identity. Effect Config and the owning Schemas decode those values plus the
whole-number retry count and delay before Chromium starts. Preview must pair
`pr-N` with the same positive PR number; Production and rollback must pair
`prod` with no PR number. Missing, empty, partial-number, unsafe-path and
secret-bearing URL input fails with a value-free tagged error. Chromium is one
focused host adapter acquired and closed through an Effect Scope, including on
failure or interruption. Provider-free boundary tests prove those local input
and cleanup rules only; they do not prove a hosted deployment. The harness
writes candidate-qualified desktop/mobile PNGs and emits the behavioural
observation used to build Schema-decoded receipts. The first dated
Preview observation was torn down but did not meet the final evidence contract,
so it remains disconfirming history. Fresh candidate `d9cb894…` passed the
corrected hosted, screenshot and pre-mutation contracts, independent
adversarial review and full repository gates and was then torn down; DCD-002
is accepted. DCD-003 then deployed that source to fixed `prod`, qualified
`c99984c…` through Preview and Production, removed the successor Preview, and
restored `d9cb894…` through the same normal Alchemy graph. The current
dated Production readback observed one stable Worker URL and restored
source-bound state; it does not establish timeless availability. This does not
claim byte promotion, recovery from known broken content, a custom domain/DNS
route, a paid plan or release/publication.

`check-import-boundaries` rejects server-only content, service, generated-source
and runtime imports from browser-reachable app modules. The docs app has no
browser Effect runtime. Its `.server.ts` loader module is the only route edge
that acquires `DocsContentService`, and the module-scoped server runtime is
reused for the server isolate. The same runtime owns a private live
`DocsRuntimeProbe` Layer. That Layer acquires one Effect `Ref` construction
state and an identifier produced by Effect `Random`; focused tests inject an
exact deterministic identifier and dispose the complete runtime. The runtime
factory exposes disposal so tests and future host lifecycle integration can
release all Layers; the current hosting adapter does not provide an
application shutdown hook.

The Worker entry accepts the exact
`x-taxkit-docs-runtime-proof: construction-count` opt-in header and returns a
non-secret construction count plus random isolate identifier. The host callback
runs the typed read through the application runtime and Schema-encodes it only
at response-header egress; it owns no counter or randomness itself. This
temporary deployment-migration channel proves reuse within the observed
process/isolate across requests; it is not a public API and does not prove a
singleton across Cloudflare isolates. Review it when the runtime, Worker entry,
privacy boundary or proof channel changes. Retire it after an equally strong
non-public provider oracle exists; otherwise retain its bounded
one-identifier/two-header carrying cost explicitly through migration parity.

The app-local MDX adapter classifies root-relative, query-only and authored
relative `.mdx` destinations as TanStack routes while keeping external,
protocol-relative, mail, download, repository-source and same-document
destinations as anchors. It removes an authored `.mdx` suffix before any query
or fragment without changing either suffix. Sidebar, home and MDX route links
set one app-owned navigation-focus intent; the destination heading consumes it
after a client transition. Initial hydration does not set that intent. The
route container owns responsive navigation state and retry commands; render
leaves receive readonly values and callbacks and do not acquire services or
execute runtimes.

## Authoring rules

Before writing or reviewing public docs, read:

- [Documentation style](../../docs/standards/documentation-style.md)
- [Documentation writing](../../docs/standards/documentation-writing.md)
- [Documentation templates](../../docs/standards/documentation-templates.md)
- [Documentation review](../../docs/standards/documentation-review.md)
- [Documentation architecture](../../docs/standards/documentation-architecture.md)
- [Documentation user journeys](../../docs/standards/documentation-user-journeys.md)

Use the matching template and user journey for each page. If a repeated page
shape does not have a template, add the template before writing more pages in
that shape.

The required frontmatter `status` is schema-validated. `draft` means authored,
locally renderable, visibly labelled candidate content, not accepted-current
truth, publication, deployment, availability, accuracy, or user visibility.
`published` means explicitly accepted current public documentation, still not
runtime or external availability proof. Preserve draft pages unless explicit
page-level acceptance records their transition. `bun run check:docs` enforces
status representation and path ownership without asserting external state.

## Validation graph

```ts
Tests: docs runtime

docs change
  -> @taxkit/docs-content validate
    -> frontmatter and navigation schemas
    -> local links and allowed MDX components
    -> example and OpenAPI reference checks
  -> @taxkit/docs-content check-examples
    -> TypeScript example compilation
  -> docs build
    -> TanStack Start and Fumadocs rendering
```

## Guardrails

- Do not import raw `packages/docs-content/content` files from route loaders.
- Do not import `@taxkit/docs-content/server` or generated `.source/server`
  modules from browser code.
- Do not statically import content services, live Layers or the server runtime
  from browser-reachable route modules. Keep execution behind the app-owned
  `.server.ts` server-function implementation.
- Do not add a browser Effect runtime. Browser routes restore the encoded
  transport value and render canonical values.
- Keep app-specific MDX components in `src/lib/mdx/components.tsx`.
- Use TanStack `Link` for internal docs routes so navigation runs the client
  loader and server-function RPC. Use ordinary anchors for external URLs.
- Keep browser boundary tests programmatic. Do not add production test routes.
- Keep direct loader restoration and top-level `Result` matching in the route
  root. Compose semantic page landmarks route-high, and pass focused readonly
  values and callbacks to section and leaf components.
- Keep local presentation commands in leaves. Remote or domain commands remain
  with the route action or nearest policy-owning container.
- Put loading, empty and recoverable error UI at the smallest owning boundary
  and preserve constrained component footprints.
- Put generic Fumadocs primitives in `@taxkit/docs-fumadocs` only when they
  are reusable outside this app.
- Use [Documentation style](../../docs/standards/documentation-style.md) and
  the related standards suite before writing or reviewing public docs.
- Apply [Abstraction
  admission](../../docs/design-docs/abstraction-admission.md) before adding a
  shared hook, provider, component family or package.
