---
document_type: package-guide
lifecycle: current
authority: canonical
owner: taxkit-content-owner
last_reviewed: 2026-10-17
review_trigger: content contracts, search policy or package exports change
---

# @taxkit/content

Private source package for TaxKit docs contracts and published public page
lookup, navigation and search. `DocsPublicCatalogue` rejects draft pages,
duplicate addresses and navigation that does not match the pages.

`ContentCatalogueLive` builds that catalogue once from the authored MDX in
[`@content/docs`](../../content/docs/README.md). It reads the navigation and
repository link profile from that package, takes the page texts from
`DocsSources`, reads each page through `DocsPageReader`, writes each page's
processed Markdown from its checked body, and keeps only published pages. Any
unreadable page fails the Layer. `ContentServiceLive` serves pages, navigation
and search from `ContentCatalogue`.

Content declares the contracts it consumes and never imports their
implementations: `DocsPageReader` and `DocsCodeHighlighter` are implemented by
[`@taxkit/mdx`](../mdx/README.md), and `DocsDiagramRenderer` by
[`@taxkit/diagrams`](../diagrams/README.md). The API build supplies `DocsSources`
and those Layers and writes the catalogue to JSON; the API Worker decodes it with
`DocsPublicCatalogue` and provides it as `ContentCatalogue`. The checked [HTTP package](../api/http/README.md)
delegates public content routes to this service, and the answer-engine routes
to [AEO](../aeo/README.md). The Website reads pages, navigation, search and
Markdown through the API's HTTP routes.

## Reading body

Each page carries `body`, a checked list of reading blocks after its `#` title:
headings with unique ids, paragraphs, lists, tables, highlighted code (lines of
coloured tokens) and diagrams (Mermaid source, title and SVG). Inline content is
text, inline code, bold, italics and links. `links.ts` resolves every link: a
relative `.mdx` link becomes the page's public address, any other relative link
becomes a GitHub link at the revision in `repository.json`, and only HTTPS and
same-page fragments pass unchanged. `reading-markdown.egress.ts` writes the body
back as plain Markdown for the `.md` address and search.

Search matches page titles, descriptions and processed Markdown without case
sensitivity. Results follow catalogue order, contain at most twenty pages, and
include a whitespace-normalised excerpt of at most 240 characters. The caller
checks the search term once, including its 100-character limit. The excerpt uses its owning checked type;
projection failure stays in the safe `DocsSourceError` channel.

## Publication

`./publication` owns each published page's Website addresses (`docsMarkdownPath`
and `docsImagePath`), the share-image input `docsOgImage` and its head metadata
`docsPageMetadata`: canonical, Markdown and image addresses, the image text and
escaped TechArticle JSON-LD, all on the publication origin. Content declares the
share-image contracts `DocsPageRenderer` and `DocsOgImages` with
`DocsPngBytes` and the build's `DocsImageArchive`;
[`@taxkit/og-image`](../og-image/README.md) draws them at build time and
[`@taxkit/aeo`](../aeo/README.md) serves them. `PublicHttpOrigin` retains the
shared HTTPS/exact-loopback root-address policy; `DocsWebsiteOrigin` and
`DocsPublicationOrigin` preserve their separate checked identities.

## Exports

- `./schemas`: canonical page, navigation, public catalogue, search, secure
  origin Schemas.
- `./errors`: internal checked source/lookup failures and shared fixed public
  page/search failures.
- `./service`: `ContentServiceContract`, `ContentService`, `ContentCatalogue`,
  `DocsSources` and the consumed `DocsPageReader`, `DocsCodeHighlighter`,
  `DocsDiagramRenderer`, `DocsPageRenderer` and `DocsOgImages` contracts.
- `./publication`: page addresses, share-image input and head metadata.
- `./links`: `DocsLinkContext` and `resolveDocsHref`, used by the MDX reader.
- `./live`: `ContentCatalogueLive` and the page/search `ContentServiceLive`.
- `./config` (internal, not in the published export map):
  `DocsPublicationOriginConfig` (`TAXKIT_PUBLICATION_ORIGIN`) and
  `DocsWebsiteOriginConfig` (`WEBSITE_PUBLIC_ORIGIN`), the one declaration of
  each host binding beside its Schema. MCP, the API Worker and the Website reuse
  them.
- `./response-check`: request/reply page identity predicate for checked docs
  pages, used after generated-client decoding.
- `./test`: the same implementation with controlled request observations, plus
  deterministic `DocsCodeHighlighterTest`, `DocsDiagramRendererTest` and
  `DocsOgImagesTest`.
- `./testing/fixtures`: checked synthetic catalogue inputs for tests.
- `./testing/observations`: typed test observations.

All exports point at TypeScript source; the private package has no build. The
SDK build compiles the contracts it uses into its single archive. The local downstream check installs that SDK archive without a
separate content package. That check does not authorise registry publication.

## Documentation impact

Change this README, [repository package ownership](../../docs/architecture/package-ownership.md),
[content architecture](../../docs/architecture/content-and-posts.md) and focused
tests when the catalogue, reading body or contracts change. Application routing
and presentation are separate owners.

## Runbook applicability

No operational runbook is needed: this package reads checked, immutable bundled
data without external systems or consequential operations.

## Non-claims

Service tests and compiled output do not prove page correctness, an installed
HTTP consumer, app routes, deployment, public availability or publication.

`DocsPublicPagePath` refines the existing page identity to a canonical lowercase
public address of at most 256 characters. The public page Schema and HTTP
request contracts reuse it. `DocsPageUnavailable` and `DocsSearchUnavailable`
contain fixed messages with no request path or source diagnostic. Internal
content lookup/source errors retain their existing checked fields; the two
transport handlers project them at response egress.
