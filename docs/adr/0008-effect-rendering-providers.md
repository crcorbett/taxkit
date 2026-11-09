# Effect-owned rendering providers

Status: accepted; partly superseded by ADR-0009 (paired themes)

Render Mermaid with Pele through an independent Effect service, and acquire
Pierre's private highlighter instance inside its static Layer through the
published API. This refines [ADR 0007](0007-content-neutral-mdx.md) without
changing the document formats, the supported Markdown grammar or TaxKit's
build-time catalogue.

## Pele

`@taxkit/pele` owns `Pele.renderSvg(source)`, a closed `Effect<Svg,
PeleRenderError>` over branded `Source` and `Svg` values. It imports no MDX,
Content, app, filesystem or runtime, so a caller can render a diagram without
documents or TaxKit publication rules. Pele's own messages can include authored
text, so the service keeps only bounded reason codes (unsupported diagram,
syntax, semantic, limit, render and output) and never exposes provider
exceptions or snippets.

`@taxkit/diagrams/pele` adapts Pele to MDX's existing `DiagramRenderer` contract
and error. MDX can use a different diagram provider by implementing that
contract. Pele replaced `beautiful-mermaid` with no fallback; SVG geometry and
styling changed deliberately.

## Pierre

Use Pierre's published `@pierre/highlights` exports without dependency patches,
deep imports or custom WASM loading. Its root entry initialises shared WASM
during static import, so a module-load failure belongs to host startup and
cannot be a typed Effect failure. `PierreCodeHighlighterLive` creates its own
instance with public `createHighlighter()` during Layer acquisition and
returns `CodeHighlighterInitializationError` if that fails; per-snippet
failures remain `CodeHighlightError`. Accepting the import-time constraint keeps
upgrades on Pierre's supported contract instead of adding a loader framework.

## Consequences

- TaxKit displays diagram SVG as an image, which does not inherit page CSS.
  Schema checks bound the SVG format; they are not a sanitisation guarantee for
  inline HTML.
- Pierre is qualified in Bun and Node only. Its Workerd entry is not qualified
  for request-time rendering, so TaxKit continues to serve prebuilt docs.
