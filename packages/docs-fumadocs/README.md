---
status: canonical
last_reviewed: 2026-06-14
source_of_truth: package-root
confidence: medium
---

# @taxkit/docs-fumadocs

## Scope

Use this private package for reusable Fumadocs integration shared by TaxKit
docs packages and apps. It owns generic MDX configuration, Effect Schema to
Standard Schema bridging, Fumadocs source-loader adapters, page-tree conversion
and browser-safe MDX primitives.

It does not own TaxKit frontmatter, navigation policy, validation rules, route
loaders, app layout or generated content. Keep those in the content package or
the docs app that owns the behaviour.

## Exports

| Export | Runtime | Use |
| --- | --- | --- |
| `@taxkit/docs-fumadocs` | Browser-safe | Shared schemas and page-tree helpers. |
| `@taxkit/docs-fumadocs/schemas` | Browser-safe | Generic meta, code-block metadata, page-tree input schemas and tagged source errors. |
| `@taxkit/docs-fumadocs/tree` | Browser-safe | Convert the package-owned page-tree contract to Fumadocs `PageTree` nodes. |
| `@taxkit/docs-fumadocs/render` | Browser-safe React | Render generic MDX `pre` and image primitives. |
| `@taxkit/docs-fumadocs/config` | Build-time | Configure `fumadocs-mdx`, shared Shiki options, Mermaid support and Standard Schema bridges. |
| `@taxkit/docs-fumadocs/source` | Server or route-loader boundary | Wrap generated Fumadocs source methods in Effect errors. |

Browser modules should use only the root export, `./schemas`, `./tree` or
`./render`. Server route loaders and content packages can use `./source` and
build configuration can use `./config`.

## Schema bridge

Use `effectSchemaToStandardSchema(...)` when a Fumadocs collection needs a
Standard Schema contract:

```ts
import { effectSchemaToStandardSchema } from "@taxkit/docs-fumadocs/config";
import { ProductDocsFrontmatter } from "./schemas";

export const docsFrontmatterSchema =
  effectSchemaToStandardSchema(ProductDocsFrontmatter);
```

The Effect Schema remains the source of truth. Fumadocs receives the Standard
Schema adapter for build-time validation.

## Source loader boundary

Use `@taxkit/docs-fumadocs/source` from server-only content services or route
loaders:

```ts
import { loadFumadocsPage } from "@taxkit/docs-fumadocs/source";
```

The helpers return `Effect` values and fail with package-owned tagged errors.
Do not import generated `.source/server` files from browser modules.

## Commands

```txt
bun run --filter=@taxkit/docs-fumadocs build
bun run --filter=@taxkit/docs-fumadocs check-types
bun run --filter=@taxkit/docs-fumadocs test
```

Run `bun run verification` when package exports, README guidance or shared
runtime behaviour changes.

The build removes `dist` before TypeScript compilation so stale output cannot
survive a successful build. This private docs package is not part of the
nine-package release tarball closure.

## Related docs

- `docs/product-specs/docs-fumadocs-package-separation.md`
- `docs/architecture/content-and-posts.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/frontend.md`
- `docs/architecture/effect-services.md`
