# @taxkit/mdx

## 0.2.4

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

## 0.2.3

### Patch Changes

- 990965c: Update Effect to 4.0.7 and Alchemy to beta.84, migrate the Cloudflare, Axiom and Doppler providers to their separate packages, and preserve the existing deployment identities. Keep telemetry authorization redacted through native planning and state migration.

  Keep the Website build hash focused on real workspace inputs, adopt the native redirect provider's refusal to write after a failed ruleset read, and regenerate OpenAPI with flattened unions and optional query parameters represented by omission rather than null.

  Use Alchemy's supported Node loader for local development and persist standalone native test bundles explicitly. Preserve HTTP 500 for internal Website faults and mismatched pages, while unavailable page reads retain their intended HTTP 503 through the updated TanStack error renderer.

  Refresh the remaining application, rendering, browser-test and development dependencies, including the native TypeScript compiler diagnostics and the SDK assembler's JavaScript compiler API.

## 0.2.2

### Patch Changes

- Updated dependencies [148fee7]
  - @taxkit/content@3.2.0

## 0.2.1

### Patch Changes

- Updated dependencies [6ff0743]
  - @taxkit/content@3.1.0

## 0.2.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [b88ee2d]
  - @taxkit/content@3.0.0
