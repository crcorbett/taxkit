# @taxkit/mdx

Content-neutral MDX compilation and presentation data. The package has no Content,
router, filesystem or runtime dependency. TaxKit publication rules belong to
[Content](../content/README.md). See [ADR 0007](../../docs/adr/0007-content-neutral-mdx.md).

- `./service`: `MdxCompiler.compile(source)`, `MdxRenderer.render({ document, theme })`,
  the `MdxArtifacts` persistence service and the `CodeHighlighter.highlight`, `DiagramRenderer.render` and
  `LinkResolver.resolve` adapter contracts. Operations return closed Effects.
- `./compiler`: static `MdxCompilerLive`; needs no rendering providers.
- `./renderer`: static `MdxRendererLive`; acquires exactly the three adapters.
- `./live`: static `MdxLive`, the convenient merge of compiler, renderer and artifacts.
  The host supplies providers and builds the graph once in its existing scope.
- `./schemas`: `Source`, semantic `Document` and enriched `RenderedDocument`.
  Their owning Schemas brand identities, source/code/inline text, authored link
  targets, resolved destinations, list starts and diagram values. Compiled
  documents stay at version 1; rendered documents use version 2 and retain
  their exact theme with paired token appearances.
- `./artifacts`: static `MdxArtifactsLive`, with no dependencies. The service's
  `decodeDocument`, `encodeDocument`, `decodeRenderedDocument` and
  `encodeRenderedDocument` methods own JSON persistence as closed Effects and
  always reject excess fields, including nested nodes and tokens.
  `decodeTheme` and `encodeTheme` apply the same strict policy to theme JSON. JSON codecs
  are private; callers cannot override parse options. Failures are native
  `SchemaError` values. Use these operations for stored artifacts; decoding a
  structural Schema directly uses Effect's ordinary parser defaults.
- `./errors`: closed compiler, renderer and adapter failures. Rendering errors
  carry source identity and a node path, without source text or raw causes.
- `./highlights`: `PierreCodeHighlighterLive`, the only Pierre caller. A private
  instance is acquired once through Pierre's public `createHighlighter()` API.
  Instance creation returns a `CodeHighlighterInitializationError` on failure.
  Provider output is checked immediately; per-snippet failures remain
  `CodeHighlightError`.
- `./theme`: the checked `Theme`, complete light/dark schemes, branded `Color`,
  font names and sizes, and the closed syntax/style vocabulary. The host passes
  one immutable theme per render. Neither provider reads an independent mode.
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
there is no hard CPU pre-emption. Pierre 0.3.0's public root entry initializes
shared WASM during import. An import failure is a host startup failure, before
the Layer exists. The Layer owns its separate highlighter instance through
`Effect.try`; it cannot turn an earlier module-load failure into a typed service
error. Only published exports are used; there are no dependency patches, private
deep imports or dynamic imports. See
[ADR 0008](../../docs/adr/0008-effect-rendering-providers.md).

The public entry is qualified in Bun and Node. An isolated Node process without
WebAssembly confirms the host startup failure boundary. Pierre's published
Workerd entry is not qualified for request-time rendering. TaxKit continues to
serve prebuilt documentation; no request-time route or cache is introduced.

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


One Pierre call returns both schemes over shared token text. The renderer's
`CodeToken` stores `text`, `light` and `dark` appearances with checked colours
and font styles. The compiler and processed Markdown remain presentation-free.
The Pele adapter embeds both palettes in one SVG image; the reading container's
`color-scheme` selects its palette without rerendering geometry. See
[ADR 0009](../../docs/adr/0009-mdx-themes.md) for ownership and lifetime.


The same `./schemas` entry owns the neutral `ReadingInline`, `ReadingBlock` and
`ReadingBody` contracts plus their node Schemas. These omit authored link targets
and redundant code source for compact reading payloads; full rendered blocks
also satisfy them structurally. Source/rendered/reading models share the owning
`ConsistentTableColumns` and `UniqueHeadingIds` checks. Content refines these
values for publication instead of defining another inline/block vocabulary.
The separate [React presenter](../mdx-react/README.md) consumes this contract;
MDX itself imports no React, router, Content or application. See
[ADR 0010](../../docs/adr/0010-agnostic-mdx-presentation.md).
