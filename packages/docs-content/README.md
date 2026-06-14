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
errors, validation policy and the content service for `apps/docs/content`.
Reusable Fumadocs internals come from `@whattax/docs-fumadocs`.

This package does not own routes, layout, MDX renderer components or search UI.
Those belong in the `apps/docs` runtime.

## Main Areas

- `source.config.ts`: WhatTax collection declaration for `apps/docs/content`
  using reusable `@whattax/docs-fumadocs/config` helpers.
- `src/schemas.ts`: canonical docs frontmatter, meta, navigation and
  validation issue schemas.
- `src/errors.ts`: tagged docs source and lookup errors.
- `src/server.ts`: server-only generated Fumadocs source loader export for the
  content collection.
- `src/live.layer.ts`: Effect service layer that serves navigation, validation
  and renderable Fumadocs page data.
- `.source/`: generated Fumadocs output. Regenerate it instead of editing it by
  hand.

## Runtime Shape

`fumadocs-mdx` compiles `source.config.ts` into `.source/`. Server-only package
code adapts that generated collection through `fumadocs-core/source` and the
reusable `@whattax/docs-fumadocs/source` helpers before exposing page data
through `DocsContentService`. The existing `getPage` and `listPages` methods
return serialisable content page data for the current app route. The
`getRenderablePage` and `listRenderablePages` methods expose compiled
Fumadocs page data for server-side rendering integration.

This package is intentionally private and source-only. It is not a publishable
runtime package because its server and client exports wrap generated
Fumadocs/Vite modules for `apps/docs/content`. The package exports include
`types`, `source` and `default` entries that all point at source files so
workspace consumers use the same generated-source boundary in development,
build and type checking.

Validation may read raw MDX source text for source-text policy checks such as
frontmatter, navigation coverage, local links, allowed MDX component usage,
examples and OpenAPI references. App routes should consume the service boundary
instead of importing `.source/*` files directly. Browser modules must not
import `@whattax/docs-content/server`.

## Frontmatter Contract

Every authored MDX page under `apps/docs/content` must provide:

- `title`
- `description`
- `status`

The schema source of truth is `DocsPageFrontmatter` in `src/schemas.ts`.
Fumadocs receives that schema through `Schema.toStandardSchemaV1(...)`, so the
Effect Schema contract remains canonical while Fumadocs performs frontmatter
validation.

## Validation Policy

`bun run --filter=@whattax/docs-content validate` checks:

- navigation JSON decodes through `DocsNavigation`;
- every navigation source exists;
- every authored MDX source is represented in navigation;
- every page frontmatter decodes through `DocsPageFrontmatter`;
- local relative links resolve;
- fenced code blocks are balanced;
- banned marketing language, stale public names and private downstream product
  details are absent;
- JSX-style MDX components outside inline code and fenced code blocks are in the
  explicit allowed component set;
- examples and OpenAPI reference pages include their required reference text.

Add new MDX component allowances in `src/validation/policy.ts` only when the
component is intentionally supported by the docs app renderer. Keep renderer
implementation in `apps/docs` or reusable primitives in
`@whattax/docs-fumadocs/render`.

## Guardrails

- Keep authored content in `apps/docs/content`.
- Keep generated source behind `@whattax/docs-content`.
- Do not import `packages/docs-content/.source/*` from browser/runtime code.
- Do not add app routes, layout, renderer components or search behavior here.
- Keep generic MDX options, Standard Schema bridging, source loader adapters
  and reusable renderer primitives in `@whattax/docs-fumadocs`.
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
