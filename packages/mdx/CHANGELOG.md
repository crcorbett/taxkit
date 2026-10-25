# @taxkit/mdx

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
