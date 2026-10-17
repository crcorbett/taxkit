---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-content-owner
last_reviewed: 2026-10-17
review_trigger: content ownership, publication status or generated presentation changes
---

# Content and posts

TaxKit public content should explain the open-source engine, supported rule
packs, calculator behaviour, API usage and SDK usage.

## Scope

This doc owns public docs/content direction for TaxKit. It should stay focused
on the open-source tax engine and avoid downstream private-product specifics.

## Main areas

`apps/web`
: Public documentation site. It owns the TanStack Start route runtime, app
  shell, app-specific MDX component composition and browser rendering.

`packages/docs-content/content`
: Public MDX content root. It owns the Start, SDK, API, Guides, Concepts,
  Contributing and Reference section directories.

`packages/docs-content/navigation.json`
: Public docs navigation contract. It owns top-level section order, section
  source files, stable paths and primary reader metadata. It is authored,
  decoded and enforced beside the package-owned content and examples.

`packages/content`
: Private compiled owner of canonical docs page, frontmatter, navigation and
  source error contracts. Its public catalogue Schema admits published pages
  with matching navigation; its service reads that checked catalogue and limits
  search to twenty short results. It does not read authored sources or decide
  which pages are published.

`packages/docs-content`
: Private source-only package for authored navigation, meta, MDX, validation
  policy, validation errors and generated Fumadocs source access. Its existing
  page/navigation/source-error exports re-export `@taxkit/content` contracts;
  its source service remains available to build-time content consumers.
  Its independent native MDX index and build-only source Layer use the installed
  compiler and the same adapter as the retained Vite source.
  Its compiler-only link policy maps parsed page links through checked navigation
  and repository references to a recorded immutable revision before both HTML
  and processed Markdown are produced. It rejects unowned page destinations
  and paths outside the checkout, preserving code examples and source bytes.

`packages/docs-examples`
: Private checked integration templates and their compiler/runtime proof. It
  depends on HTTP/SDK/calculator contracts independently of the content package,
  preventing a cycle when the backend consumes content contracts. Public MDX
  references these retained templates; content validation checks those links.

`packages/docs-fumadocs`
: Private reusable package for generic Fumadocs configuration, Effect Schema to
  Standard Schema bridging, the generic source service and live/test Layers,
  and generic MDX render primitives.

`packages/docs-content/src/catalogue.runtime.ts`
: Local public-catalogue build step, run by
`bun run --filter=@taxkit/docs-content build`. Page frontmatter and
`navigation.json` decide publication: `catalogue.policy.ts` keeps pages whose
`status` is `published`, requires published navigation, rejects a published
child under a draft section page, and builds the one catalogue through the
canonical constructor. No published pages is a failure. It writes ignored
`.source/public-catalogue.json` only on success. The compiler's browser path is
a build environment input. Its JSON-only `./public-catalogue` export is
checked once by each API host; it imports no compiler into request handling.
HTTP and native RPC documentation groups delegate page/navigation/search and
processed Markdown to the same `ContentService`. Its compiled public-path
refinement and fixed missing-page/search errors serve both transports. The
Website reads pages, navigation, search and Markdown from the API's public HTTP
content routes with the generated client and renders browser-safe compiled
presentation. Its `/search` GET form shows published titles and descriptions
with the existing document links. No second index is added.
`@taxkit/publication` owns `ContentDiscovery`, which derives four discovery files from the same public
catalogue, the API origin and the publication origin `https://taxkit.dev`. The
API serves them at `/api/v1/docs/discovery/*`; the Website forwards its
conventional addresses there once. Robots allows everything (`Allow: /`) and
names the sitemap. The short agent index links to published processed Markdown;
the full index retains those bodies, including fenced examples. No authored
source, personal report, guessed origin or competing content catalogue is
exposed. The Website serves the processed body through same-address Accept
negotiation and explicit `.md` links; the
[frontend owner](frontend.md#documentation) records representation policy.
Share images are derived during the Website build. The old app workspace is
retired; verified original-source data and dated provider recovery identities
remain addressable.

`docs/architecture`
: Durable implementation architecture.

`docs/product-specs`
: Current product/spec intent for repo development.

## Public docs graph

```ts
Current native public docs request

browser or Website SSR
  -> apps/web route loader
    -> generated HttpApiClient (public origin or private binding)
      -> API content routes -> ContentService
        -> public JSON catalogue
    -> browser-safe compiled MDX presentation
    -> @taxkit/docs-fumadocs/render primitives
    -> app-local MDX component map
```

```ts
Tests: docs structure

docs implementation
  -> @taxkit/docs-content validate
    -> frontmatter and navigation schema decode
    -> navigation coverage and local link checks
    -> MDX component allowlist
    -> examples and OpenAPI reference checks
  -> bun run check:docs
    -> maintainer metadata in docs/
    -> relative links and documented commands in current documents
  -> @taxkit/docs-fumadocs tests
  -> apps/web native build and real browser/Worker checks when rendering changes
  -> bun run verification
```

## Guardrails

- Keep public docs generic to callers and applications.
- Do not document private downstream product strategy here.
- Link to canonical architecture docs rather than duplicating them.
- Treat old planning material as historical until revalidated.
- Use [Documentation style](../standards/documentation-style.md) and the
  related standards suite before writing or reviewing public docs.
- Keep public MDX pages task-first. Use architecture docs for durable
  ownership and runtime detail.
- Validate public MDX through `@taxkit/docs-content`, which owns Effect Schema
  frontmatter, navigation coverage, source-text policy, local link, MDX
  component allowlist, examples and OpenAPI reference checks.
- `draft` means authored, locally renderable, visibly labelled candidate public
  documentation; it is not publication, deployment, external availability,
  correctness, or user visibility. `published` puts the page in the public
  catalogue; it still does not establish runtime or external availability.
  Change a page from `draft` to `published` in its frontmatter in an ordinary
  pull request.
- Keep reusable Fumadocs code in `@taxkit/docs-fumadocs`; keep TaxKit
  content contracts in `@taxkit/docs-content`; keep route composition and
  app-specific rendering in `apps/web`.

## Related docs

- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)
- [../product-specs/index.md](../product-specs/index.md)

## Generated collection boundary

Generated collection adapters expose named Effect operations with safe tagged
failures. The collection owner wraps synchronous loader calls and processed-text
Promise reads, preserving the SDK receiver. The reusable Fumadocs live Layer
decodes raw representations through its owning Schemas. Shiki metadata
transformation returns replacement nodes instead of mutating SDK-owned input.

### Published page share assets

The Website Vite build derives PNG share assets from the existing public
catalogue through `apps/web/scripts/docs-images.build.ts`. The same page address
mapping supplies HTML metadata; there is no separate page list or dynamic image
API. The exact current Takumi 2.14.0 WebAssembly renderer and embedded font are
build-only dependencies. Generator, dimensions/byte Schema, metadata egress and
Website config are tracked inputs; generated `apps/web/public/og/**` is ignored
and declared as a Turbo build output. Static generation reads only the built
catalogue and accepts no calculation values.
