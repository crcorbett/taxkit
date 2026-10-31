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

`ContentCatalogueLive` (`./catalogue`) builds that catalogue once from the authored MDX in
[`@content/docs`](../../content/docs/README.md). It reads the navigation and
repository link profile from that package, takes the page texts from
`DocsSources`, reads each page through `DocsPageReader`, writes each page's
processed Markdown from its checked body, and keeps only published pages. Any
unreadable page fails the Layer. `ContentServiceLive` (`./live`) serves pages, navigation
and search from `ContentCatalogue`. The runtime export does not import authored
navigation, repository metadata or the catalogue builder.

Content owns `DocsPageReader`, implemented by `ContentMdxReaderLive` (`./mdx`)
using the neutral MDX contracts. It validates TaxKit metadata and page titles and
projects finished data into the existing public body. `ContentLinkResolverLive`
(`./link-resolver`) consumes a checked `DocsLinkTargets` snapshot; the static
`DocsLinkTargetsLive` loads the authored navigation/repository policy. The API build
supplies the concrete MDX, highlighter and diagram Layers. The API Worker reads
the prebuilt catalogue, keeping parser and provider engines out of request code.
The checked [HTTP package](../api/http/README.md)
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
- `./errors`: `DocsPageReadError` for file-specific authoring failures with
  matchable reasons, `DocsSourceError` for catalogue/runtime failures, lookup
  failures, provider failures and shared fixed public page/search failures.
- `./service`: `ContentServiceContract`, `ContentService`, `ContentCatalogue`,
  `DocsSources`, `DocsPageReader`, `DocsPageRenderer` and `DocsOgImages` contracts.
- `./publication`: page addresses, share-image input and head metadata.
- `./links`: shared `DocsLinkTargets`, per-file `DocsLinkContext` and
  `resolveDocsHref`. The reader derives the context from `DocsSource.path`;
  the resolver acquires shared targets at Layer construction.
- `./mdx`: static `ContentMdxReaderLive`.
- `./link-resolver`: static link resolver and publication policy Layers.
- `./catalogue`: build-time `ContentCatalogueLive`, which reads authored metadata.
- `./live`: runtime `ContentServiceLive`, which only reads the supplied catalogue.
- `./config` (internal, not in the published export map):
  `DocsPublicationOriginConfig` (`TAXKIT_PUBLICATION_ORIGIN`) and
  `DocsWebsiteOriginConfig` (`WEBSITE_PUBLIC_ORIGIN`), the one declaration of
  each host binding beside its Schema. MCP, the API Worker and the Website reuse
  them.
- `./response-check`: request/reply page identity predicate for checked docs
  pages, used after generated-client decoding.
- `./test`: the same implementation with controlled request observations, plus
  deterministic `DocsOgImagesTest`. MDX owns its provider test Layers.
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
