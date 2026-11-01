# @taxkit/diagrams

MDX's adapter to the independent [Pele service](../pele/README.md). This private
source package owns no SDK, runtime, file loader, Content policy or site palette.

`./pele` exports the static `PeleDiagramRendererLive`. It requires `Pele`,
implements MDX's `DiagramRenderer`, constructs Pele's branded source and typography at that
semantic boundary, and maps provider failures to MDX's closed diagram errors.
The returned SVG becomes MDX's `DiagramSvg` through its owning constructor,
including the narrower 500,000-character document limit.

The application supplies `PeleLive` through ordinary Layer composition. Pele
can also be imported directly without MDX or this adapter. The operation accepts
`{ source, theme }`, renders geometry once using the theme's shared typography,
and embeds checked light/dark palettes in a controlled SVG stylesheet. The
Website displays it as an image whose media query follows the reading
container's `color-scheme`. Final SVG size is checked after adding the styles.
The package owns the mapping to Pele's public CSS variables and has no site
palette, provider patch or inline SVG mounting behaviour.
