---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Content and posts

WhatTax public content should explain the open-source engine, supported rule
packs, calculator behaviour, API usage and SDK usage.

## Scope

This doc owns public docs/content direction for WhatTax. It should stay focused
on the open-source tax engine and avoid downstream private-product specifics.

## Main areas

`apps/docs`
: Public documentation site. It owns the TanStack Start route runtime, app
  shell, app-specific MDX component composition and browser rendering.

`apps/docs/content`
: Public MDX content root. It owns the Start, SDK, API, Guides, Concepts,
  Contributing and Reference section directories.

`apps/docs/navigation.json`
: Public docs navigation contract. It owns top-level section order, section
  source files, stable paths and primary reader metadata. The file remains
  authored in the app so contributors can review route structure beside the
  content, but it is decoded and enforced by `@whattax/docs-content`.

`packages/docs-content`
: Private source-only package for WhatTax docs frontmatter, meta, navigation,
  validation policy, tagged docs errors, generated Fumadocs source access and
  the content service. It bundles the app-authored navigation representation
  for built runtimes and decodes it through the package-owned navigation
  schema.

`packages/docs-fumadocs`
: Private reusable package for generic Fumadocs configuration, Effect Schema to
  Standard Schema bridging, source loader adapters, page-tree helpers and
  generic MDX render primitives.

`docs/architecture`
: Durable implementation architecture.

`docs/product-specs`
: Current product/spec intent for repo development.

## Public docs graph

```ts
Production: public docs request

browser
  -> apps/docs route
    -> apps/docs route boundary schema
    -> DocsContentService
      -> @whattax/docs-fumadocs source adapter
        -> packages/docs-content/.source/server
          -> apps/docs/content/**/*.mdx
      -> apps/docs/navigation.json
    -> @whattax/docs-content/client
      -> Fumadocs compiled MDX module
    -> @whattax/docs-fumadocs/render primitives
    -> app-local MDX component map
```

```ts
Tests: docs structure

docs implementation
  -> @whattax/docs-content validate
    -> frontmatter and navigation schema decode
    -> navigation coverage and local link checks
    -> MDX component allowlist
    -> examples and OpenAPI reference checks
  -> @whattax/docs-fumadocs tests
  -> apps/docs build and browser screenshots when rendering changes
  -> bun run verification
```

## Guardrails

- Keep public docs generic to callers and applications.
- Do not document private downstream product strategy here.
- Link to canonical architecture docs rather than duplicating them.
- Treat old planning material as historical until revalidated.
- Use [Documentation style](../standards/documentation-style.md) and the
  related standards suite before writing or reviewing public docs.
- Keep public MDX pages task-first. Use architecture docs for durable
  ownership and runtime detail.
- Validate public MDX through `@whattax/docs-content`, which owns Effect Schema
  frontmatter, navigation coverage, source-text policy, local link, MDX
  component allowlist, examples and OpenAPI reference checks.
- Keep reusable Fumadocs code in `@whattax/docs-fumadocs`; keep WhatTax
  content contracts in `@whattax/docs-content`; keep route composition and
  app-specific rendering in `apps/docs`.

## Related docs

- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)
- [../product-specs/index.md](../product-specs/index.md)
