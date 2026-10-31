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
  instance is acquired once; provider output is checked immediately.
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
there is no hard CPU pre-emption. Pierre also initialises WASM on module import,
so import failures remain host startup failures. Bun tests do not qualify the
Worker-specific WASM entry for request-time compilation. TaxKit continues to serve
prebuilt documentation; no request-time route or cache is introduced.

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

The MDX package enables the shared strict preset's `no-ternary` rule explicitly.
Use native `Match`, `Option`, `Boolean` and `Array` operations for branching and
selection; closed domain alternatives use exhaustive matching.
