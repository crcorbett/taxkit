---
document_type: package-guide
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-04
review_trigger: package contracts or generated-source boundaries change
---

# @taxkit/docs-fumadocs

## Scope

This private compiled package owns the narrow reusable Fumadocs boundary:
shared MDX compile configuration, generic source representation Schemas, safe
tagged source errors, the named `FumadocsSource` Effect service, its
generated-loader live Layer factory, deterministic test Layer and the generic
render primitives used by the docs app.

It does not own TaxKit frontmatter, navigation, content roots, generated
collection locations, routes, app layout or runtime execution.

## Exports

| Export | Use |
| --- | --- |
| `@taxkit/docs-fumadocs/config` | Build-time shared `fumadocs-mdx` and Effect Schema bridging. |
| `@taxkit/docs-fumadocs/schemas` | Generic decoded page and code-block representations. |
| `@taxkit/docs-fumadocs/errors` | Safe generic lookup and source-load errors. |
| `@taxkit/docs-fumadocs/service` | Named `getPage` and `listPages` service contract. |
| `@taxkit/docs-fumadocs/live` | One generated-collection adapter at Layer construction. |
| `@taxkit/docs-fumadocs/test` | Deterministic decoded fixture Layer. |
| `@taxkit/docs-fumadocs/render` | Browser-safe generic picture and code-block primitives. |

The live Layer is the only boundary that accepts generated-provider
representations. Its named adapter operations return Effects with
`FumadocsSourceLoadError` failures. The generated collection owner translates
its SDK calls into that channel; the live Layer decodes each successful value
through the package Schemas and maps failures to safe service errors. Consumers call named service operations; they do not pass
callbacks or receive raw provider pages.

The Shiki `pre` transformer returns a replacement HAST node with decoded
metadata. It preserves the input node; the installed Shiki transformer contract
consumes the returned node.

## Build ordering

`source`, `types` and `default` package conditions point to source and compiled
artifacts explicitly. The named docs-content generation task depends on this
package build. Direct docs-content generation/tests, docs app types/build and
both Knip commands therefore compile this package before config loading and
never depend on stale pre-existing `dist`.

```txt
bun run --filter=@taxkit/docs-fumadocs test
bun run --filter=@taxkit/docs-fumadocs check-types
bun run --filter=@taxkit/docs-fumadocs build
```

The package defines services and Layers only. It does not construct an
application runtime or execute Effects.

## Related docs

- `docs/product-specs/docs-application-architecture.md`
- `docs/architecture/content-and-posts.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/effect-services.md`
