# @taxkit/diagrams

MDX's adapter to the independent [Pele service](../pele/README.md). This private
source package owns no SDK, runtime, file loader, Content policy or site palette.

`./pele` exports the static `PeleDiagramRendererLive`. It requires `Pele`,
implements MDX's `DiagramRenderer`, constructs Pele's branded source at that
semantic boundary, and maps provider failures to MDX's closed diagram errors.
The returned SVG becomes MDX's `DiagramSvg` through its owning constructor,
including the narrower 500,000-character document limit.

The application supplies `PeleLive` through ordinary Layer composition. Pele
can also be imported directly without MDX or this adapter. Rendering uses Pele's
CSS-variable defaults and native font fallback; the Website displays the finished
SVG as an image. SVG markup and layout change from the previous renderer, while
authored definitions, titles, links and non-diagram content remain intact.
