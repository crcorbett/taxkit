# web

## 1.0.0

### Major Changes

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

### Minor Changes

- b88ee2d: Documentation pages now come from plain MDX in `content/docs` (`@content/docs`)
  instead of a Fumadocs build. The API bundles the pages as raw text and
  `@taxkit/content` builds the checked catalogue once per Worker isolate. Nothing
  is generated before planning or deploying.

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

### Patch Changes

- Updated dependencies [cafcc71]
- Updated dependencies [221ee31]
- Updated dependencies [b88ee2d]
- Updated dependencies [b533bc7]
  - @taxkit/observability@1.0.0
  - @taxkit/core@2.1.0
  - @taxkit/content@3.0.0
  - @taxkit/api-http@3.0.0
  - @taxkit/rules-au-income-tax@2.0.1
  - @taxkit/rules-au-pay@2.0.1
