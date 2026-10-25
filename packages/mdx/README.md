# @taxkit/mdx

Private source package that reads TaxKit's authored MDX. It implements two
contracts that [`@taxkit/content`](../content/README.md) declares; Content never
imports this package.

- `./live` exports `DocsPageReaderLive`. It splits the YAML frontmatter, parses
  the page with the micromark MDX and GFM table extensions, and decodes the
  syntax tree with Schemas that accept only the supported Markdown: headings,
  paragraphs, bold, italics, inline code, links, lists, tables and fenced code.
  JSX, images, raw HTML and quotes fail the page. Links resolve through
  Content's `resolveDocsHref`. The Layer requires Content's
  `DocsCodeHighlighter` and `DocsDiagramRenderer`, so the host chooses their
  implementations.
- `./highlights` exports `DocsCodeHighlighterLive`, the only caller of
  `@pierre/highlights`. It turns a fenced code block into coloured token lines
  with the `pierre-light` theme and decodes the reply at once.

Every failure is Content's `DocsSourceError` with operation `parse` and the
source file, or the highlighter's `DocsCodeHighlightError`. A page fails as a
whole; nothing is skipped.

The API build composes both Layers in
`apps/api/scripts/docs-catalogue.layer.ts`; the Worker bundle never includes this
package. The Website's share-image build composes them to read page titles. Tests use
Content's deterministic highlighter and diagram renderer.
