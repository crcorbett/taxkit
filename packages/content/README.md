---
document_type: package-guide
lifecycle: current
authority: canonical
owner: taxkit-content-owner
last_reviewed: 2026-10-06
review_trigger: content contracts, search policy or package exports change
---

# @taxkit/content

Private compiled package for TaxKit docs contracts and accepted public page
lookup, navigation and search. `DocsPublicCatalogue` rejects draft pages,
duplicate addresses and navigation that does not match the pages. Application
composition supplies a checked catalogue through `ContentCatalogue`;
`ContentServiceLive` has no default catalogue or filesystem access.

The authored MDX, source review and Fumadocs compiler remain in
[`docs-content`](../docs-content/README.md). This package cannot itself accept
an authored page for publication. The generated catalogue and its acceptance
records remain unfinished T005 work. Existing docs-content imports re-export
the canonical page, navigation and lookup error contracts for compatibility.

Search matches page titles, descriptions and processed Markdown without case
sensitivity. Results follow catalogue order, contain at most twenty pages, and
include a whitespace-normalised excerpt of at most 240 characters. The caller
checks the search term once, including its 100-character limit. The excerpt uses its owning checked type;
projection failure stays in the safe `DocsSourceError` channel.

## Exports

- `./schemas`: canonical page, navigation, accepted catalogue and search Schemas.
- `./errors`: checked source and page lookup failures.
- `./service`: `ContentServiceContract`, `ContentService` and `ContentCatalogue`.
- `./live`: the implementation over a supplied checked catalogue.
- `./test`: the same implementation with controlled request observations.
- `./testing/fixtures`: checked synthetic catalogue inputs for tests.
- `./testing/observations`: typed test observations.

All repository exports select source under the `source` condition and compiled
JavaScript/declarations otherwise. The proposed publish exports omit test
subpaths and source conditions. The package remains private; a proposed publish
manifest does not establish a packed or published consumer.

## Documentation impact

Change required for this README, docs-content compatibility routes,
[repository package ownership](../../docs/architecture/package-ownership.md),
[content architecture](../../docs/architecture/content-and-posts.md), the active
T005 plan and focused proof. Preserve authored draft status, tax results,
metrics deferral and historical receipts. Application routing, generated MDX
presentation and external publication are separate owners.

## Runbook applicability

No operational runbook is needed: this package reads checked, immutable data
without external systems, runtime execution or consequential operations.

## Non-claims

Service tests and compiled output do not prove source acceptance, an installed
HTTP consumer, app routes, deployment, public availability or publication.
