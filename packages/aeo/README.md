# @taxkit/aeo

Private source package that serves TaxKit's answer-engine routes from the
accepted docs catalogue. The API Worker composes it; the Website forwards its
own conventional addresses to these routes once.

## Exports

- `./routes` exports `aeoRoutes`, one native `HttpRouter` Layer:
  - `/api/v2/docs/discovery/robots.txt`: every crawler, including named AI
    crawlers, may index, use as AI input and train (Content Signals), with the
    sitemap address;
  - `/api/v2/docs/discovery/sitemap.xml`: every published page on the
    publication origin;
  - `/api/v2/docs/discovery/llms.txt`: the short index, linking each page's
    processed Markdown on the API;
  - `/api/v2/docs/discovery/llms-full.txt`: every page's Markdown body;
  - `/api/v2/docs/og/<page>.png`: one share image per published page, from
    Content's `DocsOgImages`.
- `./service` exports `PublicationOrigins`, the host-supplied Effect that
  reads this stage's API and publication origins on first use, and its own
  `PublicationSettingsUnavailable` failure.
- `src/documents.egress.ts` (internal) holds the three catalogue document
  writers that the route Layer serves; `test/fixtures/origins.ts` holds
  checked example origins for this package's tests.

Documents are UTF-8 text or XML with `nosniff`. An origin failure answers an
empty 503 for the documents; a render failure answers an empty 503 for the
image. Only published catalogue pages have image routes, so any other address
is the router's 404. The route list comes from the catalogue, never a second
page list.

## Documentation impact

Change this README, [package ownership](../../docs/architecture/package-ownership.md)
and [content architecture](../../docs/architecture/content-and-posts.md) when the
routes, discovery documents or origin contract change. The API Worker owns the
composition and the Website owns its forwarded addresses.

## Runbook applicability

No package runbook is needed. The routes ship inside the API Worker, whose
deployment and rollback belong to the [deployment runbook](../../docs/runbooks/deployment.md).

## Non-claims

Package tests do not prove the deployed discovery files, the Website's
forwarding, crawler behaviour or public availability.
