# @taxkit/docs-fumadocs

## 1.0.0

### Major Changes

- 48384d5: Adopt the stricter shared Oxlint policy and use precise public contract names.
  Rename vague service `Shape` types to `Contract`, rename
  `SourceExtract.shape` to `rowContract`, keep trace values JSON-safe, and add
  preferred `create*` constructors while retaining deprecated `make*` aliases
  where compatibility is safe.
- 4b75366: Content and Fumadocs source Layers are static. `ContentDiscoveryLive` now
  requires `ContentDiscoverySettings`; supply the lazy settings Effect with
  `Layer.succeed(ContentDiscoverySettings)(settings)`. A settings failure still
  fails `getDocument`, not Layer construction. `makeFumadocsSourceLive(adapter)`
  is replaced by `FumadocsSourceLive`, which requires
  `FumadocsGeneratedCollection` from `@taxkit/docs-fumadocs/service`; the
  `FumadocsGeneratedCollectionAdapter` type moves to that export.
  `makeFumadocsSourceTest(fixtures)` and `makeDocsContentServiceTest(fixtures)`
  are replaced by `FumadocsSourceTest` and `DocsContentServiceTest`, which require
  `FumadocsSourceFixtures` from `@taxkit/docs-fumadocs/test`.

### Minor Changes

- eb13b36: Require named Effect operations when constructing a generated Fumadocs adapter.
  Wrap provider calls at the collection boundary and preserve safe source errors.
  Return immutable Shiki metadata nodes. Update checked documentation examples to
  use validated native Effect requests and the typed HTTP client with an explicit
  base URL. Public service values and calculator results are unchanged.

### Patch Changes

- 2af4155: Compile documentation page links from checked navigation and repository links
  from a recorded Git revision. Keep HTML and processed Markdown destinations
  aligned, preserve code examples, and reject unknown page addresses or links
  outside the checkout.
- 4c3d5e4: Move authored TaxKit MDX, navigation and checked examples into the content
  package, and replace callback-shaped Fumadocs loading with a schema-decoded
  Effect service and deterministic Layers.

## 0.0.3

### Patch Changes

- 2dc693a: Make package builds and release artifacts deterministic with clean compilation,
  dist-only publication exports, concrete packed dependency ranges, and
  Effect-native scoped validators for focused SDK artifacts and strict clean
  consumers across the complete TaxKit release package graph.
- 6b307e3: Upgrade the workspace package runtime and test contracts to the compatible
  Effect 4 beta.98 family and current schema, schedule, and runtime APIs while
  keeping calculation traces JSON-compatible at HTTP boundaries.

## 0.0.2

### Patch Changes

- 25f381d: Add a private reusable Fumadocs integration package with generic config, source
  loader, page-tree, schema and render helpers.
