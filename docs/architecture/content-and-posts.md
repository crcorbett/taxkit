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
: Private compiled owner of canonical docs page, frontmatter, navigation and
  source error contracts, including the checked reading `body`: headings with
  ids, paragraphs, lists, tables, highlighted code as coloured token lines and
  diagrams with Mermaid source, title and SVG. Its public catalogue Schema
  admits published pages with matching navigation. `ContentCatalogueLive` builds
  that catalogue once from `DocsSources` through `DocsPageReader`; its service
  reads the checked catalogue and limits search to twenty short results.
  `src/links.ts` turns a relative `.mdx` link into the page's public address and
  any other relative link into a GitHub link at the revision in
  `repository.json`. `src/reading-markdown.egress.ts` writes the processed
  Markdown. Content declares the consumed `DocsPageReader`,
  `DocsCodeHighlighter` and `DocsDiagramRenderer` contracts and never imports
  their implementations. See [its README](../../packages/content/README.md).

`packages/mdx`
: Private `@taxkit/mdx`. `./live` implements `DocsPageReader` with micromark MDX
  and GFM tables and a Schema-checked syntax tree; JSX, images, raw HTML and
  quotes fail the page. `./highlights` implements `DocsCodeHighlighter` and is
  the only `@pierre/highlights` caller. See
  [its README](../../packages/mdx/README.md).

`packages/diagrams`
: Private `@taxkit/diagrams`. `./mermaid` implements `DocsDiagramRenderer` and is
  the only `beautiful-mermaid` caller. It renders SVG on the server, with no
  browser or Chromium. See [its README](../../packages/diagrams/README.md).

`packages/docs-examples`
: Private checked integration templates and their compiler/runtime proof. It
  depends on HTTP/SDK/calculator contracts independently of the content package,
  preventing a cycle when the backend consumes content contracts. Public MDX
  references these retained templates; `test/published-snippets.test.ts`
  checks that copied guide snippets equal their checked example files and that
  the examples at the `repository.json` checked-example revision equal the
  current files, through `git show`.

`apps/api/src/content.boundary.ts`
: Composes the public catalogue. It bundles `@content/docs/sources` and
supplies the `@taxkit/mdx` reader and highlighter and the `@taxkit/diagrams`
renderer to `ContentCatalogueLive`. Page frontmatter and `navigation.json`
decide publication: Content keeps pages whose `status` is `published`, requires
published navigation and rejects a published child under a draft section page.
Any unreadable page fails the Layer. The catalogue is built once per Worker
isolate on its first request.
The HTTP documentation group delegates page/navigation/search and processed
Markdown to the `ContentService`. Its compiled public-path refinement and fixed
missing-page/search errors serve HTTP and MCP. The
Website reads pages, navigation, search and Markdown from the API's public HTTP
content routes with the generated client and renders each page's checked
`body` with `apps/web/src/lib/docs/reading-body.view.tsx`. Its `/search` GET form shows published titles and descriptions
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
: Product/spec intent for active repo development.

## Public docs graph

```ts
Current native public docs request

browser or Website SSR
  -> apps/web route loader
    -> generated HttpApiClient (public origin or private binding)
      -> API content routes -> ContentService
        -> ContentCatalogue (built once per isolate from @content/docs)
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
- Use [Documentation style](../standards/documentation-style.md) and the
  related standards suite before writing or reviewing public docs.
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
- [Product specs](../product-specs/index.md)

## Published page share assets

The Website Vite build derives PNG share assets through
`apps/web/scripts/docs-images.build.ts`, which builds the same catalogue from
the files in `content/docs` via `readDocsCatalogue`. The same page address
mapping supplies HTML metadata; there is no separate page list or dynamic image
API. The exact current Takumi 2.14.0 WebAssembly renderer and embedded font are
build-only dependencies. Generator, dimensions/byte Schema, metadata egress and
Website config are tracked inputs; generated `apps/web/public/og/**` is ignored
and declared as a Turbo build output. Static generation reads only that checked
catalogue and accepts no calculation values.
