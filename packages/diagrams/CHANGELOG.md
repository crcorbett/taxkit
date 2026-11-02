# @taxkit/diagrams

## 0.4.1

### Patch Changes

- Updated dependencies [ccfbb17]
  - @taxkit/mdx@0.4.0

## 0.4.0

### Minor Changes

- 012f346: Render MDX with one Schema-checked light/dark theme and shared typography.
  Pierre returns paired token appearances in one call; Pele produces one SVG
  with both palettes and checked fonts. Rendered artifacts and the public content
  catalogue use version 2. Strict artifact operations also encode and decode themes.

  Move the public docs namespace to `/api/v2/docs`, including discovery and image
  paths, and update its generated client/OpenAPI and Website together. Calculator
  routes retain their existing version. The reading area's native Light, Dark and
  System controls switch prose, code and diagrams without rerendering providers.

### Patch Changes

- Updated dependencies [012f346]
  - @taxkit/mdx@0.3.0
  - @taxkit/pele@0.2.0

## 0.3.0

### Minor Changes

- 70e7319: Add an independent, Schema-branded Pele Effect service and use it for MDX diagrams.
  Replace the legacy diagram adapter export with `@taxkit/diagrams/pele`. Diagram
  SVG styling and layout change while authored definitions, titles and document
  structure remain unchanged.

  Acquire Pierre's private highlighter instance inside its static Layer through
  the published API, with a distinct typed instance-creation error and an explicit
  host startup boundary for import-time WASM initialization. Simplify pure compiler
  mappings and preserve checked values through rendering and Content projection.

### Patch Changes

- Updated dependencies [70e7319]
  - @taxkit/pele@0.1.0
  - @taxkit/mdx@0.2.5

## 0.2.3

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

- Updated dependencies [786e719]
  - @taxkit/mdx@0.2.4

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
