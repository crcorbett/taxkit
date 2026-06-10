---
status: draft
last_reviewed: 2026-06-10
source_of_truth: docs
confidence: high
---

# Docs MDX Fumadocs runtime

## Overview

WhatTax should turn the existing public MDX documentation into a working docs
runtime without surrendering content ownership to a framework shell. The first
implementation should use MDX, a thin Fumadocs MDX source layer, and an
Effect-native docs content service.

The goal is a composable docs system:

- `packages/docs-content` owns content schemas, Fumadocs source configuration,
  generated source access, navigation decoding and Effect services.
- `apps/docs` owns routes, layout, search/navigation wiring and app-specific
  rendering.
- MDX renderer components stay app-local until repeated primitives justify
  moving them into `packages/ui`.
- Validation is a first-class boundary, not an afterthought.

This spec follows the public MDX docs work in
[Public MDX developer documentation](./public-mdx-developer-docs.md).

## Problem

The repository now has public docs content under `apps/docs/content`, example
files, a navigation contract and a content validation script. It does not yet
have a docs app package, a generated MDX source, typed page data, server/client
rendering boundaries, search/navigation runtime, or framework-level build
proof.

The next implementation must avoid two failure modes:

- a monolithic docs app where content, routing, validation, rendering and
  generated reference wiring are tangled together
- a bespoke renderer/source stack that spends effort recreating MDX compile and
  route primitives before WhatTax has a public docs runtime

MDX plus Fumadocs MDX is the shortest path to a working docs site. The
architecture must still keep WhatTax-owned schemas, services and validation in
canonical packages.

## Call graphs

```ts
Production: current

developer
  -> apps/docs/navigation.json
    -> apps/docs/content/**/*.mdx
      -> manual validation script
      -> no docs runtime package
```

```ts
Production: target

developer
  -> apps/docs route
    -> docs app loader
      -> DocsContentService
        -> fumadocs source loader
          -> packages/docs-content/.source/server
            -> apps/docs/content/**/*.mdx
      -> MDX renderer component map
      -> docs page shell
```

```ts
Build: target

bun run --filter=@whattax/docs-content build
  -> fumadocs-mdx
    -> packages/docs-content/source.config.ts
      -> Effect Schema frontmatter and meta contracts
      -> packages/docs-content/.source/*

bun run --filter=docs build
  -> Vite/TanStack Start docs app
    -> packages/docs-content source/server
    -> apps/docs route tree
    -> docs renderer components
```

```ts
Tests: target

docs validation
  -> DocsContentService test layer
    -> generated fumadocs source
    -> Effect Schema decode of frontmatter/navigation
    -> local link audit
    -> MDX component allowlist audit
    -> snippet extraction and typecheck
    -> OpenAPI reference smoke
```

```ts
Audit: final

parent reviewer
  -> docs runtime diff
    -> package ownership audit
    -> Effect control-flow audit
    -> canonical schema/type/id reuse audit
    -> Fumadocs boundary audit
    -> browser-safe import audit
    -> final call graph update
```

## Goals

- Keep authored docs in MDX.
- Use Fumadocs MDX as a thin content compile/source layer.
- Add a package-owned Effect service for docs content lookup and navigation.
- Validate frontmatter, meta data, navigation and page routing through
  canonical Effect schemas.
- Keep MDX renderer components separate from content discovery and route
  loading.
- Keep Fumadocs UI optional. Use Fumadocs aspects where they accelerate layout,
  navigation or search, but do not make framework defaults the source of truth.
- Add real docs build/typecheck gates.
- Add content validation that catches private product references, stale API/SDK
  names, broken links, invalid frontmatter and unsafe MDX component usage.
- Add example/snippet validation so docs examples keep matching SDK/API
  exports.
- End with an explicit seam/boundary audit and follow-up list.

## Non-goals

- Do not convert the existing docs to Markdoc or `.mdoc` in this phase.
- Do not build a bespoke Markdown compiler or renderer.
- Do not publish `packages/docs-content` as a public npm package.
- Do not move reusable tax, API or SDK contracts into docs packages.
- Do not import server-only docs source modules from browser routes.
- Do not add a broad `packages/docs-renderer` package until repeated
  app-local renderer primitives justify it.

## Ownership and boundaries

`apps/docs`
: New private docs app package. Owns the public docs runtime, routes, layout,
  app shell, search UI, navigation presentation and app-local MDX renderer
  component map. It consumes `@whattax/docs-content` and public SDK/API
  contracts. It must not own canonical docs content schemas.

`apps/docs/content`
: Authored public MDX content. This remains the source directory for Start,
  SDK, API, Guides, Concepts, Contributing and Reference pages.

`packages/docs-content`
: New private source-only content package. Owns Fumadocs MDX
  `source.config.ts`, generated `.source/*`, content schemas, navigation
  schemas, tagged docs source errors, `DocsContentService`, server/source
  exports and validation scripts. This package may depend on Fumadocs MDX,
  Fumadocs core, Effect and docs content files. It must not depend on
  `apps/docs`.

`packages/ui`
: Still planned for shared UI primitives. Renderer components should stay in
  `apps/docs` until repeated WhatTax-owned components justify promotion.

`packages/sdk/typescript`, `packages/calculators`, `packages/http-api`
: Continue to own public SDK/API/calculator contracts. Docs packages consume
  these contracts for examples and reference validation but must not mirror
  them.

`docs/architecture/content-and-posts.md`
: Durable architecture owner for docs/content boundaries. It must be updated
  when this runtime lands.

## Proposed approach

### Content package

Create `packages/docs-content` as a private source-only package, following the
shape that `Projects/site` uses for its posts package:

- `source.config.ts`
- `src/schemas.ts`
- `src/errors.ts`
- `src/service.ts`
- `src/live.layer.ts`
- `src/server.ts`
- `src/client.ts` only if browser collection access is needed
- `src/validation/*` or `src/validate.ts` for reusable validation policy
- `.source/` generated by `fumadocs-mdx`

The package should use `Schema.toStandardSchemaV1(...)` for Fumadocs
frontmatter/meta validation. Fumadocs' default schema dependencies should not
leak into public package types if an Effect Schema bridge can avoid it.

Canonical schemas should include:

- `DocsPageFrontmatter`
- `DocsMeta`
- `DocsNavigation`
- `DocsNavigationItem`
- `DocsPagePath`
- `DocsPageSlug`
- `DocsSection`
- validation issue/tagged error schemas

The service should expose a small contract:

```ts
DocsContentService
  -> getPage(path)
  -> listPages()
  -> getNavigation()
  -> getPageMarkdown(path) when needed for llms.txt or markdown negotiation
  -> validateContent()
```

Use `Context.Service`, `Layer`, `Schema`, `Option`, `Array`, `HashMap`,
`HashSet`, `Match` and tagged errors where they fit. Do not use local DTO
mirrors of page/frontmatter/navigation shapes.

### Docs app

Create `apps/docs` as a private Vite/TanStack Start app unless implementation
discovers a better fit inside the current workspace. It should:

- consume `@whattax/docs-content/server` from server loaders
- keep MDX renderer components in `apps/docs/src/lib/mdx/components.tsx`
- expose typed routes for docs pages
- render the current navigation contract from `DocsContentService`
- include search/navigation scaffolding without hard-coding page lists in
  routes
- include a browser proof for the docs home page and one nested MDX page

Fumadocs UI may be used for low-level docs layout/navigation pieces if it keeps
the implementation smaller. The app must still preserve WhatTax-owned
navigation/data contracts and must not make Fumadocs UI configuration the only
source of truth.

### Renderer boundary

Renderer components should form a small allowlist:

- code block
- callout
- tabs or segmented examples when needed
- architecture diagram/flowchart rendering
- API/OpenAPI embed placeholder

The allowlist should be validated. MDX pages should not import arbitrary app
components. If implementation discovers useful repeated renderer primitives,
record them as a follow-up before moving anything into `packages/ui`.

### Validation

Replace the current app-local validation script with package-owned validation
that can be called from:

- `bun run --filter=@whattax/docs-content validate`
- `bun run --filter=docs build`
- root verification if appropriate after the first stable pass

Validation should cover:

- frontmatter schema decode
- navigation schema decode
- navigation source existence
- local links
- banned marketing language
- private downstream product terms
- stale public SDK/API names
- MDX component allowlist
- code fence balance and language/title metadata
- snippet extraction and typecheck for TypeScript examples
- OpenAPI reference smoke or accepted exclusion

### Final seam audit

The final task must audit the implementation for:

- whether `packages/docs-content` has too much renderer/app responsibility
- whether `apps/docs` has content/schema ownership that belongs in the package
- whether Fumadocs-generated types leak third-party schema details
- whether validation should move further into canonical schemas
- whether renderer components should stay app-local or move to `packages/ui`
- whether root `bun run verification` should include docs generation,
  validation and docs build
- whether package boundaries and architecture docs match the final graph

## Tests and verification

Minimum final gates:

- `bun run verification`
- `bun run build`
- `bun run --filter=@whattax/docs-content build`
- `bun run --filter=@whattax/docs-content check-types`
- `bun run --filter=@whattax/docs-content test`
- `bun run --filter=@whattax/docs-content validate`
- `bun run --filter=docs build`
- `bun run --filter=docs check-types`
- browser verification for docs home and one nested docs page
- local link audit
- MDX component allowlist audit
- snippet extraction/typecheck or explicit accepted exclusions
- OpenAPI reference smoke or explicit accepted exclusion
- `bun run changeset status --verbose`
- Changeset or explicit no-Changeset rationale for each package/app slice

Every implementation task must include a strict Effect audit:

- meaningful linear Effect pipelines or `Effect.gen` for primary operations
- typed errors handled in `.pipe(...)` with `Effect.catchTag`,
  `Effect.catchTags`, `Effect.mapError` or package-owned policy
- canonical `Schema` contracts and schema-derived types
- no unsafe casts
- no local DTO mirrors
- no manual object readers where schemas fit
- no trivial wrappers/helpers
- browser/runtime code only imports browser-safe exports

## Risks and tradeoffs

- Fumadocs can become the architecture instead of a content source. Mitigation:
  keep WhatTax schemas/services as the contract and Fumadocs behind
  `packages/docs-content`.
- MDX can import arbitrary components. Mitigation: renderer allowlist and
  validation.
- Generated `.source/*` can leak bundler assumptions. Mitigation: keep
  `packages/docs-content` source-only until the generated source strategy is
  proven.
- A separate docs app can duplicate `apps/web` infrastructure. Mitigation:
  reuse workspace patterns and keep app-specific docs UI separate from shared
  primitives until repetition justifies promotion.
- Root verification can become slow. Mitigation: start with package-local docs
  gates, then add root gates only after they are stable and useful.

## Versioning and changelog impact

Expected package changes:

- New private `docs` app package.
- New private `@whattax/docs-content` package.
- New Fumadocs-related dependencies.
- No public npm package release is expected for docs runtime work unless
  implementation changes `@whattax/sdk`, `@whattax/http-api`,
  `@whattax/calculators` or other release-train packages.

Each task must run `bun run changeset status --verbose`. Package-facing public
runtime changes need a Changeset. Private docs app/content package changes may
record an explicit no-Changeset rationale if they do not affect public package
installation, exports or behaviour.

## Acceptance criteria

- A developer can open the docs app locally and navigate from the docs home to
  a nested MDX page.
- `packages/docs-content` owns frontmatter, navigation schemas, generated
  source access, docs content service and validation.
- `apps/docs` consumes the docs content service and renders MDX through an
  app-owned renderer component map.
- Fumadocs MDX is present as a thin source/compile layer, not as the owner of
  WhatTax docs contracts.
- Public docs content remains in MDX.
- Validation catches frontmatter, navigation, link, banned-term, stale-name,
  private-product and MDX component allowlist failures.
- Examples/snippets remain typechecked or have explicit accepted exclusions.
- Browser/runtime imports respect server/client boundaries.
- Architecture docs, package READMEs, this spec and task list match the final
  implementation graph.
- Final implementation records a seam/boundary audit with follow-up items.

## References

- [Content and posts architecture](../architecture/content-and-posts.md)
- [Frontend architecture](../architecture/frontend.md)
- [Package ownership](../architecture/package-ownership.md)
- [Effect services](../architecture/effect-services.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Public MDX developer documentation](./public-mdx-developer-docs.md)
- [Fumadocs MDX](https://www.fumadocs.dev/docs/mdx)
- [Fumadocs MDX collections](https://www.fumadocs.dev/docs/mdx/collections)
- [Fumadocs MDX Vite integration](https://www.fumadocs.dev/docs/mdx/vite)
