# @taxkit/mdx

Content-neutral MDX compilation and presentation data. The package has no Content,
router, filesystem or runtime dependency. TaxKit publication rules belong to
[Content](../content/README.md). See [ADR 0007](../../docs/adr/0007-content-neutral-mdx.md).

- `./service`: `MdxCompiler.compile(source)`, `MdxRenderer.render(document)`,
  the `MdxArtifacts` persistence service and the `CodeHighlighter.highlight`, `DiagramRenderer.render` and
  `LinkResolver.resolve` adapter contracts. Operations return closed Effects.
- `./compiler`: static `MdxCompilerLive`; needs no rendering providers.
- `./renderer`: static `MdxRendererLive`; acquires exactly the three adapters.
- `./live`: static `MdxLive`, the convenient merge of compiler, renderer and artifacts.
  The host supplies providers and builds the graph once in its existing scope.
- `./schemas`: `Source`, semantic `Document` and enriched `RenderedDocument`.
  Their owning Schemas brand identities, source/code/inline text, authored link
  targets, resolved destinations, list starts, token colours and diagram values.
- `./artifacts`: static `MdxArtifactsLive`, with no dependencies. The service's
  `decodeDocument`, `encodeDocument`, `decodeRenderedDocument` and
  `encodeRenderedDocument` methods own JSON persistence as closed Effects and
  always reject excess fields, including nested nodes and tokens. JSON codecs
  are private; callers cannot override parse options. Failures are native
  `SchemaError` values. Use these operations for stored artifacts; decoding a
  structural Schema directly uses Effect's ordinary parser defaults.
- `./errors`: closed compiler, renderer and adapter failures. Rendering errors
  carry source identity and a node path, without source text or raw causes.
- `./highlights`: `PierreCodeHighlighterLive`, the only Pierre caller. A private
  instance is acquired once; WASM compilation and instance creation return a
  `CodeHighlighterInitializationError` on failure. Provider output is checked
  immediately; per-snippet failures remain `CodeHighlightError`.
- `./config`: checked `PresentationThemeConfig` (`MDX_THEME`, `light` by default,
  or `dark`), acquired through the host's ConfigProvider at Layer construction.
- `./test`: deterministic static highlighter and diagram Layers.

Compilation accepts fragments without frontmatter or a heading. Optional YAML
metadata must be a finite JSON mapping; duplicate keys, aliases and unsupported
YAML tags fail. The existing Markdown subset supports headings, paragraphs,
formatting, links, flat lists, tables and fenced code. LF and CRLF normalise to LF.
Arbitrary JSX, imports, expressions, images, raw HTML and quotes fail. The initial
component vocabulary is empty; adding a component requires a modelled Schema and
exhaustive presentation/text semantics, rather than a caller registry.

Documents preserve original links, code text, diagram definitions and titles.
Rendering adds resolved links, checked tokens and SVG; token text must reproduce
code. The host decides whether to compile/render during a build or a request, and
owns storage, cache identity and invalidation. A stored Document can render without
the compiler. Renderer data is not HTML: consumers project it into their view.

Providers run synchronously. Effect interruption applies between operations;
there is no hard CPU pre-emption. Pierre 0.3.0's default entry eagerly compiles
WASM. The pinned [Bun patch](../../patches/pierre-highlights-0.3.0.patch)
exposes its existing pure core and packaged bytes as `./core` and `./wasm`, plus
the byte declaration. Static imports stay side-effect-free; the static Layer
owns compilation through `Effect.try`. The patch changes no provider algorithm.
Recheck these exports when upgrading Pierre. See
[ADR 0008](../../docs/adr/0008-effect-rendering-providers.md).

The adapter's byte-compilation path is qualified in Bun and Node, including a
real host without WebAssembly. It is not qualified for Workerd request-time
rendering. TaxKit continues to serve prebuilt documentation; no request-time
route or cache is introduced.

Brands are constructed with the owning Schema at ingress or through `makeEffect`.
Internal methods retain the checked types: `SourceText` cannot substitute for
`CodeText`, and `LinkTarget` cannot substitute for `LinkDestination`. Branding
never trims or normalises text. A brand proves only its owner's refinement;
a link target is not an approved URL and a checked SVG is not a sanitiser.
Literal discriminants and closed enums already distinguish alternatives; arbitrary
metadata stays JSON data. Documents and blocks derive their types from their
structural Schemas rather than gaining redundant aggregate brands.

Stored-document consumers yield `MdxArtifacts` and call
`artifacts.decodeDocument(json)` before rendering. They can provide
`MdxArtifactsLive` and `MdxRendererLive` without acquiring a compiler. The public
API exports no standalone encoding or decoding functions.

MDX inherits the complete shared style and strict presets, including `no-ternary`.
Use native `Match`, `Option`, `Boolean` and `Array` operations for branching and
selection; closed domain alternatives use exhaustive matching.
