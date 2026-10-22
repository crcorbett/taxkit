---
document_type: package-guide
lifecycle: current
authority: canonical
owner: taxkit-content-owner
last_reviewed: 2026-10-17
review_trigger: content contracts, search policy or package exports change
---

# @taxkit/content

Private compiled package for TaxKit docs contracts and published public page
lookup, navigation and search. `DocsPublicCatalogue` rejects draft pages,
duplicate addresses and navigation that does not match the pages. Application
composition supplies a checked catalogue through `ContentCatalogue`;
`ContentServiceLive` has no default catalogue or filesystem access.

The authored MDX, its frontmatter status and the Fumadocs compiler remain in
[`docs-content`](../docs-content/README.md), whose catalogue build decides which
pages are published. This package cannot itself publish an authored page. The checked
[HTTP package](../api/http/README.md) now delegates public content routes to
this service. The [native RPC package](../api/rpc/README.md#documentation-connection)
delegates page, navigation, Markdown and search to Content, and discovery to
[Publication](../publication/README.md), for machine callers. The Website reads pages, navigation,
search and Markdown through the API's HTTP routes.
Existing docs-content imports re-export
the canonical page, navigation and lookup error contracts for compatibility.

Search matches page titles, descriptions and processed Markdown without case
sensitivity. Results follow catalogue order, contain at most twenty pages, and
include a whitespace-normalised excerpt of at most 240 characters. The caller
checks the search term once, including its 100-character limit. The excerpt uses its owning checked type;
projection failure stays in the safe `DocsSourceError` channel.

## Publication boundary

[Publication](../publication/README.md) owns discovery settings, document
Schemas and generation. It consumes the checked catalogue and HTTP route
catalogue, keeping transport addresses out of Content. `PublicHttpOrigin`
retains the shared HTTPS/exact-loopback root-address policy; `DocsWebsiteOrigin`
and `DocsPublicationOrigin` preserve their separate checked identities.

## Exports

- `./schemas`: canonical page, navigation, public catalogue, search, secure
  origin Schemas.
- `./errors`: internal checked source/lookup failures and shared fixed public
  page/search failures.
- `./service`: `ContentServiceContract`, `ContentService` and `ContentCatalogue`.
- `./live`: page/search implementation over a supplied checked catalogue.
- `./config` (internal, not in the published export map):
  `DocsPublicationOriginConfig` (`TAXKIT_PUBLICATION_ORIGIN`) and
  `DocsWebsiteOriginConfig` (`WEBSITE_PUBLIC_ORIGIN`), the one declaration of
  each host binding beside its Schema. MCP, the analytics relay, the API Worker
  and the Website reuse them.
- `./response-check`: request/reply page identity predicate for checked docs
  pages, used after generated-client decoding.
- `./test`: the same implementation with controlled request observations.
- `./testing/fixtures`: checked synthetic catalogue inputs for tests.
- `./testing/observations`: typed test observations.

All repository exports select source under the `source` condition and compiled
JavaScript/declarations otherwise. The proposed publish exports omit test
subpaths and source conditions. The package remains private; a proposed publish
manifest does not establish a packed or published consumer. The HTTP package
depends on these compiled contracts, and the SDK build includes them in its
single archive. The local downstream check installs that SDK archive without a
separate content package. That check does not authorise registry publication.

## Documentation impact

Change required for this README, docs-content compatibility routes,
[repository package ownership](../../docs/architecture/package-ownership.md),
[content architecture](../../docs/architecture/content-and-posts.md) and focused
proof. Preserve page publication status, tax results and the metrics
deferral. Application routing, generated MDX
presentation and external publication are separate owners.

## Runbook applicability

No operational runbook is needed: this package reads checked, immutable data
without external systems, runtime execution or consequential operations.

## Non-claims

Service tests and compiled output do not prove page correctness, an installed
HTTP consumer, app routes, deployment, public availability or publication.

`DocsPublicPagePath` refines the existing page identity to a canonical lowercase
public address of at most 256 characters. The public page Schema and HTTP/RPC
request contracts reuse it. `DocsPageUnavailable` and `DocsSearchUnavailable`
contain fixed messages with no request path or source diagnostic. Internal
content lookup/source errors retain their existing checked fields; the two
transport handlers project them at response egress.
