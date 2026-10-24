# @taxkit/infrastructure

## 1.1.0

### Minor Changes

- cafcc71: The Website calculators now need JavaScript. The Website no longer accepts
  HTML form POSTs and shows a notice when JavaScript is off; browsers keep
  calling the public API directly.

  The private Website forwarding key is removed with the server form path. The
  API takes a calculation caller's rate key only from the direct Cloudflare
  connection or the local emulator fallback. `@taxkit/observability/edge-identity`
  no longer exports the forwarding headers or credential Schema, and the
  `TaxKitWebsiteForwardingKey` resource leaves the native apps stack.

  The unused Website analytics relay (`/ingest/e/`) and the browser's collection
  header are removed, with the `@taxkit/analytics/relay/*` exports and the
  `analytics-relay` host route. The API's own calculator analytics is unchanged.

### Patch Changes

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

- Updated dependencies [cafcc71]
- Updated dependencies [b533bc7]
  - @taxkit/analytics@1.0.0
  - @taxkit/observability@1.0.0

## 1.0.0

### Major Changes

- 0531234: Make exported documentation build-cache settings readonly, including nested
  workspace arrays. Callers passing them to a provider that expects writable
  arrays must first copy those arrays. The stack now passes fresh copies while
  preserving the resource settings and cache inputs.

### Minor Changes

- 94e0362: Use one retained TaxKit analytics project for live and controlled preview events,
  with separate stage labels for reports. Close rejected analytics connections
  promptly and accept successful replies that have no body.

### Patch Changes

- 737ffcd: Use Effect's native request-scoped modern MCP transport in the Alchemy Worker
  and retire legacy session hosting. Website calculations now use the native HTTP
  binding with a stage-owned forwarding secret and the existing shared allowance.

  Expose canonical browser-safe calculator summaries, finish docs RPC page
  correlation, and strengthen checked-example publication and parser-owned MDX
  validation. Align the compatible Effect patch cohort and retain native
  credential, request and response lifetime boundaries.

  Generated OpenAPI now explicitly documents JavaScript's safe-integer bounds for
  `Money.cents`, matching its existing `Schema.Int` validation. The Effect patch
  upgrade changes this schema metadata without changing accepted money values.

- 1fea106: Reject documentation replies that do not match the requested page and keep Website settings available when its API binding fails.

  Separate native host composition, observability, MCP, analytics relay and discovery publication into their owning packages. Centralize API paths while preserving HTTP/RPC/MCP wire contracts, private calculation admission and telemetry privacy.

  Keep native modern MCP invocations alive through their existing work deadline after a client disconnect so calculation capacity is released reliably.

- Updated dependencies [7d51afa]
- Updated dependencies [737ffcd]
- Updated dependencies [94e0362]
- Updated dependencies [5f713b1]
- Updated dependencies [1fea106]
  - @taxkit/analytics@0.1.1
  - @taxkit/observability@0.1.1
