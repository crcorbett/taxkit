---
document_type: package-guide
lifecycle: current
authority: canonical
owner: taxkit-publication-owner
last_reviewed: 2026-10-17
review_trigger: discovery documents, publication settings, route links or package exports change
---

# @taxkit/publication

Private compiled publication capability for the four public discovery documents:
`sitemap.xml`, `robots.txt`, `llms.txt` and `llms-full.txt`. It reads the checked
catalogue owned by [Content](../content/README.md), and uses addresses from the
[HTTP route catalogue](../api/http/src/routes.ts). Content owns authored page and
navigation identity; HTTP owns transport paths; this package owns finished
publication output. The Website owns its file routes and forwards discovery
requests to the API.

`ContentDiscovery.getDocument` accepts exactly the HTTP catalogue's
`DiscoveryPath`. The static `ContentDiscoveryLive` Layer requires
`ContentCatalogue` and `ContentDiscoverySettings`, a lazy Effect of checked
`DocsDiscoverySettings`. Application composition supplies checked API and
publication origins. Settings resolve on first use and remain cached within
that service instance, preserving deferred native resource addresses.

The sitemap names each public page on the publication origin, escapes XML and
adds no invented modification dates. Robots allows every path and links the
sitemap. The short agent index links the declared HTTP Markdown endpoint for
every page. The full index preserves processed bodies and their canonical page
addresses, including fenced examples. Projection errors remain safe checked
`DocsSourceError` values; RPC maps failures to `DocsDiscoveryUnavailable` and
the API discovery adapter returns an empty 503.

The document Schema relates each path to its XML or text media type and bounds
bodies to 300,000 characters. No source compiler, second catalogue or document
cache is introduced. Publication output contains public documentation and never
calculation reports or financial inputs.

## Exports

Exports select repository source under `source` and compiled JavaScript and
declarations otherwise:

- `./schemas`: discovery settings, path, bounded body and document Schemas.
- `./errors`: the fixed public discovery failure.
- `./service`: `ContentDiscovery` and its deferred settings requirement.
- `./live`: the static production discovery Layer.
- `./test`: deterministic service substitution with request observations.
- `./testing/fixtures`: checked synthetic discovery settings.

## Documentation impact

[Content architecture](../../docs/architecture/content-and-posts.md) and
[package ownership](../../docs/architecture/package-ownership.md) explain the
publication boundary. HTTP and Content READMEs route here; API and RPC hosts
compose this capability. Public page status and API wire contracts stay stable.
Focused proof includes settings laziness, failure, escaping, media and size
tests. The link regression checks generated Markdown addresses against the
native HTTP contract.

## Runbook applicability

No operational runbook applies to this immutable projection over checked data;
application deployment remains an app concern.

## Non-claims

Local proof does not establish deployment, public availability, packed consumers
or external publication.
