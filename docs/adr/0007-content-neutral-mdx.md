# Content-neutral MDX compilation and rendering

Status: accepted; partly superseded by ADR-0009 (paired themes)

Make `@taxkit/mdx` a content-neutral package with two Effect operations:
`MdxCompiler.compile` turns checked source into a semantic `Document`, and
`MdxRenderer.render` resolves its links, code and diagrams into a
`RenderedDocument`. Content owns TaxKit's publication rules, and the host
chooses when each operation runs. A build can therefore compile once and render
under different presentation policies without parsing again. This refines
[ADR 0006](0006-follow-common-practice.md); TaxKit keeps build-time processing as
its default.

## Ownership

MDX owns the document Schemas, compiler and renderer contracts, typed failures
and artifact codecs. It imports no Content, TaxKit pages, navigation, router,
filesystem or application runtime. Content interprets frontmatter, publication,
titles, navigation, repository revisions and link policy, and supplies MDX's
`LinkResolver`. Highlighting and diagram rendering implement MDX-owned provider
contracts; [ADR 0008](0008-effect-rendering-providers.md) names the providers.
The host composes concrete Layers and owns execution, concurrency, persistence
and caching.

## Values

`Source`, `Document` and `RenderedDocument` are distinct Schema-derived values,
not copies of one record:

- `Source` is a branded logical id and text. The id is identity, not permission
  to read a file or URL.
- `Document` holds checked semantic blocks and optional JSON metadata. It keeps
  original link targets, code text and diagram definitions, and contains no
  resolved addresses, tokens, SVG, parser AST or executable values.
- `RenderedDocument` holds the same semantic content enriched in place with
  resolved destinations, code tokens and SVGs. Rendering never changes text,
  order, metadata or heading ids.

Heading ids are fixed during compilation, independently of theme and host, and
duplicate or empty ids fail rather than receiving suffixes, so existing anchors
do not move.

## Consequences

- The component vocabulary is closed and versioned. Unsupported JSX, imports,
  exports, expressions and evaluation fail at compile time; there is no
  caller-supplied component registry or generic `{ name, props }` node. This
  trades full MDX execution for portable checked output, and adding a node is a
  format compatibility decision.
- `Document` and `RenderedDocument` have their own format discriminators and
  versions, independent of package versions. `MdxArtifacts` owns their JSON
  codecs with fixed excess-property rejection; unknown versions fail and are
  regenerated from source rather than migrated by guesswork.
- An operation either succeeds completely or fails with a typed error naming
  the source and, for rendering, the node path. No partial document is
  returned, and deterministic failures are not retried.
- Provider calls are synchronous. Effect interruption applies between
  operations; a timeout is not a CPU budget.
- A rendering cache key must include the compiled artifact, provider revisions,
  the checked theme and the resolver's complete policy snapshot; a path or
  theme name alone is not enough. MDX itself keeps no cache.
- JSON codec round trips must be exact. Regenerating authored MDX or Markdown
  byte for byte is not promised.
