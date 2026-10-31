---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-content-owner
last_reviewed: 2026-10-18
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
  shell and browser rendering of each page's checked reading body.

`content/docs`
: Source-only `@content/docs` package and public MDX content root. It owns the
  Start, SDK, API, Guides, Concepts, Contributing and Reference section
  directories, `repository.json` (the GitHub revisions that repository-file
  links use) and `sources.ts` (every page as a `?raw` import). See
  [its README](../../content/docs/README.md).

`content/docs/navigation.json`
: Public docs navigation contract. It owns top-level section order, section
  source files, stable paths and primary reader metadata. It is authored,
  decoded and enforced beside the package-owned content and examples.

`packages/content`
: Private source owner of canonical docs page, frontmatter, navigation and
  source error contracts, including the checked reading `body`: headings with
  ids, paragraphs, lists, tables, highlighted code as coloured token lines and
  diagrams with Mermaid source, title and SVG. Its public catalogue Schema
  admits published pages with matching navigation. `ContentCatalogueLive` (`./catalogue`) builds
  that catalogue once from `DocsSources` through `DocsPageReader`; its service
  reads the checked catalogue and limits search to twenty short results. The
  runtime `./live` export is separate from the builder and authored metadata.
  `src/links.ts` turns a relative `.mdx` link into the page's public address and
  any other relative link into a GitHub link at the revision in
  `repository.json`. `src/reading-markdown.egress.ts` writes the processed
  Markdown. Content owns `DocsPageReader` and its MDX adapter, plus publication link
  resolution. MDX/provider implementations are selected by the application. See [its README](../../packages/content/README.md).

`packages/mdx`
: Private source `@taxkit/mdx`: content-neutral `MdxCompiler.compile` and
  `MdxRenderer.render`, static individual Layers and combined `MdxLive`.
  MDX owns portable versioned documents and provider contracts; the compiler
  requires no providers. `./highlights` owns every Pierre call. Content imports
  only these contracts and Schemas, while the app selects implementations.
  See [the package](../../packages/mdx/README.md).

`packages/diagrams`
: Private source `@taxkit/diagrams`. Static `MermaidDiagramRendererLive`
  implements MDX's `DiagramRenderer`; it is the only `beautiful-mermaid` caller
  and draws SVG without a browser. It does not import Content.

`packages/docs-examples`
: Private checked integration templates and their compiler/runtime proof. It
  depends on HTTP/SDK/calculator contracts independently of the content package,
  preventing a cycle when the backend consumes content contracts. Public MDX
  references these retained templates; `test/published-snippets.test.ts`
  checks that copied guide snippets equal their checked example files and that
  the examples at the `repository.json` checked-example revision equal the
  current files, through `git show`.

`apps/api/scripts/docs-catalogue.runtime.ts` and `apps/api/src/content.boundary.ts`
: The API build composes the public catalogue ahead of time. It supplies
`@content/docs/sources`, the `@taxkit/mdx` reader and highlighter and the
`@taxkit/diagrams` renderer to `ContentCatalogueLive` and writes the checked
catalogue to `apps/api/src/generated/docs-catalogue.json`. The Worker only
decodes that file. Page frontmatter and `navigation.json`
decide publication: Content keeps pages whose `status` is `published`, requires
published navigation and rejects a published child under a draft section page.
Any unreadable page fails the build.
The HTTP documentation group delegates page/navigation/search and processed
Markdown to the `ContentService`. Its compiled public-path refinement and fixed
missing-page/search errors serve HTTP and MCP. The
Website reads pages, navigation, search and Markdown from the API's public HTTP
content routes with the generated client and renders each page's checked
`body` with `apps/web/src/lib/docs/reading-body.view.tsx`. Its `/search` GET form shows published titles and descriptions
with the existing document links. No second index is added.
`@taxkit/aeo` owns the answer-engine routes, which derive four discovery files
from the same public catalogue, the API origin and the publication origin
`https://taxkit.dev`. The API serves them at `/api/v1/docs/discovery/*`; the
Website forwards its conventional addresses there once. Robots allows everything (`Allow: /`) and
names the sitemap. The short agent index links to published processed Markdown;
the full index retains those bodies, including fenced examples. No authored
source, personal report, guessed origin or competing content catalogue is
exposed. The Website serves the processed body at explicit `.md` addresses, and
a Markdown `Accept` preference at a page redirects there; the
[frontend owner](frontend.md#documentation) records representation policy.
Share images are rendered when the API is built. The old app workspace is
retired; verified original-source data and dated provider recovery identities
remain addressable.

`ARCHITECTURE.md` and `docs/architecture`
: Durable implementation architecture.

## Public docs graph

```ts
Current native public docs request

browser or Website SSR
  -> apps/web route loader
    -> generated HttpApiClient (public origin or private binding)
      -> API content routes -> ContentService
        -> ContentCatalogue (decoded from the catalogue the API build wrote)
    -> DocsHeading and reading-body.view.tsx over page.body
```

```ts
Tests: docs structure

docs implementation
  -> apps/api/test/docs-sources.test.ts
    -> source list matches the files in content/docs
    -> wording rules and required reference text
    -> every page builds with real highlighting and diagrams
    -> every repository link names a real file
  -> packages/docs-examples/test/published-snippets.test.ts
    -> copied guide snippets equal their checked example files
    -> examples at the checked-example revision equal the current files
  -> bun run check:docs
    -> relative links and documented commands in docs/, AGENTS.md and READMEs
  -> @taxkit/content, @taxkit/mdx and @taxkit/diagrams unit tests
  -> apps/web native build and real browser/Worker checks when rendering changes
  -> bun run verification
```

## Guardrails

- Keep public docs generic to callers and applications.
- Do not document private downstream product strategy here.
- Link to canonical architecture docs rather than duplicating them.
- Treat old planning material as historical until revalidated.
- Write public docs in plain, simple Australian English, task first.
- Keep public MDX pages task-first. Use architecture docs for durable
  ownership and runtime detail.
- Check public MDX through `@taxkit/content` and `@taxkit/mdx`, which decode
  frontmatter, navigation and the supported Markdown when the catalogue is
  built, and through `apps/api/test/docs-sources.test.ts`, which checks the
  source list, wording rules, required reference text and repository links.
  JSX, images, raw HTML and quotes fail the page.
- `draft` means authored candidate public documentation that Content leaves
  out of the catalogue; it is not publication, deployment, external availability,
  correctness, or user visibility. `published` puts the page in the public
  catalogue; it still does not establish runtime or external availability.
  Change a page from `draft` to `published` in its frontmatter in an ordinary
  pull request.
- Keep authored pages in `@content/docs`; keep TaxKit content contracts in
  `@taxkit/content`; keep MDX reading and highlighting in `@taxkit/mdx` and
  diagram rendering in `@taxkit/diagrams`; keep route composition and
  app-specific rendering in `apps/web`.

## Related docs

- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)

## Published page share assets

Content declares the share-image contracts (`DocsOgImage`, `DocsPngBytes`,
`DocsPageRenderer`, `DocsOgImages`) and the page addresses and head metadata in
`@taxkit/content/publication`. `@taxkit/og-image` implements them with the
Takumi 2.14.0 WebAssembly renderer and the bundled Geist font. The API build
renders every published page once (about three seconds) into
`docs-images.json`; the Worker decodes one stored PNG per request. The AEO
package serves one image route per published page at `/api/v1/docs/og/<page>.png`,
from the same catalogue; there is no separate page list. The Website forwards
`/og/<page>.png` there and checks the PNG. Images read only checked page titles,
descriptions and addresses and accept no calculation values. The CDN keeps each
image for seven days per deployed version. No Worker carries the renderer.
