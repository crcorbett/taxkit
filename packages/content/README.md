---
document_type: package-guide
lifecycle: current
authority: canonical
owner: taxkit-content-owner
last_reviewed: 2026-10-07
review_trigger: content contracts, search policy or package exports change
---

# @taxkit/content

Private compiled package for TaxKit docs contracts and accepted public page
lookup, navigation, search and discovery documents. `DocsPublicCatalogue` rejects draft pages,
duplicate addresses and navigation that does not match the pages. Application
composition supplies a checked catalogue through `ContentCatalogue`;
`ContentServiceLive` has no default catalogue or filesystem access.

The authored MDX, source review and Fumadocs compiler remain in
[`docs-content`](../docs-content/README.md). This package cannot itself accept
an authored page for publication. The local catalogue builder requires reviewed
source records; the
[dated source review](../../docs/documentation-audit/clean-slate-foundation/2026-10-06-public-content-acceptance.json)
owns those individual decisions. The checked
[HTTP package](../api/http/README.md) now delegates public content routes to
this service. The [native RPC package](../api/rpc/README.md#documentation-connection)
delegates page, navigation, Markdown, search and discovery operations to the
content owners. The replacement
Website uses those checked operations for pages and search.
Existing docs-content imports re-export
the canonical page, navigation and lookup error contracts for compatibility.

Acceptance records have one canonical Schema here. Version one retains its
existing fields for older lifecycle evidence. Version two adds the exact
reviewed source SHA-256 hash. The repository catalogue builder requires the
second version and checks file bytes; this package's Schema does not read files
or accept authored pages by itself.

Search matches page titles, descriptions and processed Markdown without case
sensitivity. Results follow catalogue order, contain at most twenty pages, and
include a whitespace-normalised excerpt of at most 240 characters. The caller
checks the search term once, including its 100-character limit. The excerpt uses its owning checked type;
projection failure stays in the safe `DocsSourceError` channel.

## Discovery documents

`ContentDiscovery.getDocument` admits only `/sitemap.xml`, `/robots.txt`,
`/llms.txt` and `/llms-full.txt`. All four use the same accepted catalogue.
`ContentDiscoveryLive` accepts a lazy Effect of `DocsDiscoverySettings`; its
application owner checks configuration and maps settings failure to the safe
source error. Settings are read on first use and retained in that instance.
This keeps deferred native stage addresses out of source-time guesses.

`PublicHttpOrigin` owns the shared HTTPS/exact-loopback root-address policy.
`DocsWebsiteOrigin` and the RPC package's API origin have separate identities.
The sitemap contains canonical accepted page addresses, escaped as XML, without
invented modification dates. Robots names that sitemap and excludes private
server functions; search remains crawlable so its noindex page can be read.
The short agent index links to the existing checked API Markdown endpoint.
The full index preserves processed page bodies and their canonical Website
addresses, including useful fenced code examples. Neither file contains
personal calculation reports or performs a calculation.

The document Schema relates path to media type and limits body length to
300,000 characters, within the existing native reply byte budget even under
JSON escaping. Projection failure remains `DocsSourceError`; RPC exposes only
the fixed `DocsDiscoveryUnavailable`. No document cache or secondary content
index is added. The [discovery receipt](../../docs/documentation-audit/clean-slate-foundation/2026-10-07-website-docs-discovery.json)
records local qualification separately from public availability.

## Exports

- `./schemas`: canonical page, navigation, accepted catalogue, search, secure
  origin, discovery settings and discovery document Schemas.
- `./errors`: internal checked source/lookup failures and shared fixed public
  page/search/discovery failures.
- `./service`: `ContentServiceContract`, `ContentService`, `ContentCatalogue`
  and the closed `ContentDiscovery` contract.
- `./live`: page/search implementation and `ContentDiscoveryLive` over a
  supplied checked catalogue and deferred checked discovery settings.
- `./test`: the same implementations with controlled request observations.
- `./testing/fixtures`: checked synthetic catalogue inputs for tests.
- `./testing/observations`: typed test observations.

All repository exports select source under the `source` condition and compiled
JavaScript/declarations otherwise. The proposed publish exports omit test
subpaths and source conditions. The package remains private; a proposed publish
manifest does not establish a packed or published consumer. The HTTP package
now depends on these compiled contracts, so the local downstream check includes
this package in its ten-artifact closure and fixed version group. That check
still does not authorise registry publication.

## Documentation impact

Change required for this README, docs-content compatibility routes,
[repository package ownership](../../docs/architecture/package-ownership.md),
[content architecture](../../docs/architecture/content-and-posts.md), the active
T005 plan and focused proof. Preserve exact reviewed lifecycle decisions, tax results,
metrics deferral and historical receipts. Application routing, generated MDX
presentation and external publication are separate owners.

## Runbook applicability

No operational runbook is needed: this package reads checked, immutable data
without external systems, runtime execution or consequential operations.

## Non-claims

Service tests and compiled output do not prove source acceptance, an installed
HTTP consumer, app routes, deployment, public availability or publication.

`DocsPublicPagePath` refines the existing page identity to a canonical lowercase
public address of at most 256 characters. The public page Schema and HTTP/RPC
request contracts reuse it. `DocsPageUnavailable` and `DocsSearchUnavailable`
contain fixed messages with no request path or source diagnostic. Internal
content lookup/source errors retain their existing checked fields; the two
transport handlers project them at response egress.
