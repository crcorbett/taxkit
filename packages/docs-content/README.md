---
status: canonical
last_reviewed: 2026-06-10
source_of_truth: package-root
confidence: high
---

# @whattax/docs-content

## Scope

Private source-only package for public WhatTax MDX content contracts. It owns
Effect Schema frontmatter, meta and navigation schemas, tagged docs source
errors, and the Fumadocs MDX source configuration for `apps/docs/content`.

This package does not own routes, layout, MDX renderer components or search UI.
Those belong in the future `apps/docs` runtime.

## Main Areas

- `source.config.ts`: Fumadocs MDX configuration for `apps/docs/content`.
- `src/schemas.ts`: canonical docs frontmatter, meta, navigation and
  validation issue schemas.
- `src/errors.ts`: tagged docs source and lookup errors.
- `.source/`: generated Fumadocs output. Regenerate it instead of editing it by
  hand.

## Runtime Shape

`fumadocs-mdx` compiles `source.config.ts` into `.source/`. This package is
source-only because generated source is intended to sit behind the
`@whattax/docs-content` package boundary before an app consumes it. Do not make
browser/runtime code import `.source/*` files directly.

The first slice exposes only schemas, errors and source config. The
`DocsContentService` and validation policy are owned by the next implementation
task.

## Frontmatter Contract

Every authored MDX page under `apps/docs/content` must provide:

- `title`
- `description`
- `status`

The schema source of truth is `DocsPageFrontmatter` in `src/schemas.ts`.
Fumadocs receives that schema through `Schema.toStandardSchemaV1(...)`, so the
Effect Schema contract remains canonical while Fumadocs performs frontmatter
validation.

## Guardrails

- Keep authored content in `apps/docs/content`.
- Keep generated source behind `@whattax/docs-content`.
- Do not import `packages/docs-content/.source/*` from browser/runtime code.
- Do not add app routes, layout, renderer components or search behavior here.
- Regenerate `.source/` with `bun run --filter=@whattax/docs-content build`
  after changing content, `source.config.ts` or schema fields that affect
  generated source.
- Keep docs identifiers, frontmatter, meta, navigation and tagged source errors
  schema-owned in this package.

## Related Docs

- `docs/product-specs/docs-mdx-fumadocs-runtime.md`
- `docs/architecture/content-and-posts.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/testing-and-quality.md`
