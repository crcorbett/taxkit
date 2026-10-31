# @taxkit/content

## 3.2.1

### Patch Changes

- 786e719: Extract content-neutral MDX compilation and rendering into independent Effect
  services with static individual Layers and a combined MdxLive composition.
  Preserve semantic code and authored links in portable versioned documents, support
  checked theme configuration, and keep TaxKit publication/link policy in Content.
  Migrate the catalogue builder and provider adapters while preserving public page
  responses. Compile-only and stored-document consumers can acquire just the
  capability they need.

  Own strict artifact decoding and encoding on the MdxArtifacts service with a
  static Layer and private JSON codecs. Brand semantic text, link targets and list positions at their Schema
  owners and carry those types through compilation, providers and rendering.

- Updated dependencies [786e719]
  - @taxkit/mdx@0.2.4

## 3.2.0

### Minor Changes

- 148fee7: Share images are drawn when the API is built. `DocsOgImages` now reads one
  finished image by page address, and `@taxkit/og-image` exports the build-time
  `./archive` instead of the request-time `./live` cache.

## 3.1.0

### Minor Changes

- 6ff0743: Content now owns each published page's addresses, share-image contracts
  (`DocsOgImage`, `DocsPngBytes`, `DocsPageRenderer`, `DocsOgImages`) and head
  metadata (`@taxkit/content/publication`). The HTTP route catalogue adds the
  share-image path family `DocsImageApiPath`, and the shared cache policy now
  stores a 307 Markdown redirect that varies on `Accept` beside its page, like
  the existing 400 and 406 answers. The new `@taxkit/aeo` and `@taxkit/og-image`
  packages serve the discovery documents and render share images on the API,
  replacing `@taxkit/publication` and the Website's build-time images.

## 3.0.0

### Major Changes

- b88ee2d: Documentation pages now come from plain MDX in `content/docs` (`@content/docs`)
  instead of a Fumadocs build. `@taxkit/content` builds the checked catalogue from
  them during the API build.

  Each public page now carries `body`, a checked list of reading blocks:
  headings with ids, paragraphs, lists, tables, highlighted code as coloured
  tokens, and Mermaid diagrams as SVG. The Website renders that body directly, so
  it no longer compiles MDX. The processed Markdown is written from the same body.

  `@taxkit/content` declares the contracts it consumes: `DocsPageReader` and
  `DocsCodeHighlighter`, implemented by the new `@taxkit/mdx` package with
  `@pierre/highlights`, and `DocsDiagramRenderer`, implemented by the new
  `@taxkit/diagrams` package with `beautiful-mermaid`. Diagrams no longer need a
  browser to render. The private `@taxkit/docs-content` and
  `@taxkit/docs-fumadocs` packages, the `docs:validate` command and the MDX lint
  rule are removed; API and examples tests now check the sources, wording, links
  and copied snippets.

## 2.0.0

### Major Changes

- 501d419: Add checked discovery documents derived from the accepted documentation catalogue
  and the configured Website/API addresses. Native documentation calls now require
  revision 2 and gain the closed discovery operation and fixed unavailable error.
  API and Website origins reuse one checked public-address policy with
  separate identities. No calculator request or retained answer changes.
- 049b04f: Add four checked native documentation operations and their separate client. The RPC server now requires the caller's ContentService as well as its calculator service. Keep calculator methods and revision 4, and check documentation revision 1 separately.

  Own the bounded public page address and fixed page/search errors in the compiled content package, shared by HTTP and RPC. Both private JSON clients use the same scoped 2 MiB response reader; their existing error vocabularies stay separate.

- 48f4681: Discovery documents now name the TaxKit publication address. `DocsDiscoverySettings`
  replaces `websiteOrigin` with `publicationOrigin`, checked by the new
  `DocsPublicationOrigin` Schema, so canonical links name the published site even
  when a separate Preview serves the page. The acceptance-record Schemas
  (`PublicPageAcceptanceRecord`, its versions and `DocsAcceptedSourceDigest`) are
  removed; page frontmatter now decides publication. Packages use Effect 4.0.2.
- 4b75366: Content and Fumadocs source Layers are static. `ContentDiscoveryLive` now
  requires `ContentDiscoverySettings`; supply the lazy settings Effect with
  `Layer.succeed(ContentDiscoverySettings)(settings)`. A settings failure still
  fails `getDocument`, not Layer construction. `makeFumadocsSourceLive(adapter)`
  is replaced by `FumadocsSourceLive`, which requires
  `FumadocsGeneratedCollection` from `@taxkit/docs-fumadocs/service`; the
  `FumadocsGeneratedCollectionAdapter` type moves to that export.
  `makeFumadocsSourceTest(fixtures)` and `makeDocsContentServiceTest(fixtures)`
  are replaced by `FumadocsSourceTest` and `DocsContentServiceTest`, which require
  `FumadocsSourceFixtures` from `@taxkit/docs-fumadocs/test`.

### Minor Changes

- dc9d0ba: Add a compiled content contract and service for accepted pages, navigation and
  bounded search. Drafts and inconsistent catalogue entries fail validation.
  Keep the existing docs-content schema and error imports as compatibility
  re-exports; authored MDX and its compiler remain in docs-content.
- bd9df35: Add source-bound acceptance record contracts, an independent native MDX build
  connection and checked public snippet validation. Retain older acceptance
  records and the current docs app while the accepted catalogue is introduced.

### Patch Changes

- 20a9dcc: Record individual reviewed source acceptance for the existing documentation
  pages and navigation. Bind each decision to exact file bytes so the local
  catalogue builder can include accepted pages and reject later unreviewed edits.
  Preserve the existing examples, retained tax results and private package status.
- 1fea106: Reject documentation replies that do not match the requested page and keep Website settings available when its API binding fails.

  Separate native host composition, observability, MCP, analytics relay and discovery publication into their owning packages. Centralize API paths while preserving HTTP/RPC/MCP wire contracts, private calculation admission and telemetry privacy.

  Keep native modern MCP invocations alive through their existing work deadline after a client disconnect so calculation capacity is released reliably.
