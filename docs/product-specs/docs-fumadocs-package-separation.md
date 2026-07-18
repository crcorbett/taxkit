---
status: implemented
last_reviewed: 2026-06-14
source_of_truth: docs
confidence: high
---

# Docs Fumadocs package separation

## Overview

TaxKit should keep MDX authoring, Fumadocs internals and app rendering in
separate ownership layers. The current docs runtime proved the first
Fumadocs-based path, but it still puts generic Fumadocs configuration inside
`@taxkit/docs-content` and renders page markdown through an app-local
hand-written markdown renderer.

This spec updates [Docs MDX Fumadocs runtime](./docs-mdx-fumadocs-runtime.md)
with the package split we want before expanding public developer docs:

- `apps/docs/content` owns authored MDX content.
- `packages/docs-content` owns TaxKit docs schemas, navigation, validation
  policy and the content service.
- `packages/docs-fumadocs` owns reusable Fumadocs integration, source loader
  adapters, shared MDX options and reusable renderer helpers.
- `apps/docs/src/lib` owns app-specific routes, runtime, layout, search and
  component composition.

Fumadocs remains the MDX validation/rendering backbone. Effect Schema remains
the canonical contract for frontmatter, meta, navigation, validation issues and
route loader data. Rendering branches should use `Effect.Match` where the app
or reusable package handles a closed union, such as page tree nodes, loader
results or supported custom MDX items.

## Research and audit findings

### Current TaxKit state

Current files inspected:

- `packages/docs-content/source.config.ts`
- `packages/docs-content/src/schemas.ts`
- `packages/docs-content/src/live.layer.ts`
- `packages/docs-content/src/validation/policy.ts`
- `apps/docs/src/lib/docs/loaders.ts`
- `apps/docs/src/lib/mdx/components.tsx`
- `docs/architecture/content-and-posts.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/api-and-sdk.md`

Findings:

- `@taxkit/docs-content` currently owns both content contracts and generic
  Fumadocs configuration, including Shiki transformers, Mermaid configuration
  and `Schema.toStandardSchemaV1(...)` bridging.
- `apps/docs/src/lib/mdx/components.tsx` currently implements a markdown
  parser and renderer over raw markdown strings. This bypasses Fumadocs MDX
  rendering and will not scale to typed MDX components, table of contents,
  code block metadata, Mermaid or custom docs primitives.
- `DocsContentServiceLive` currently serves pages from the validation policy
  rather than a Fumadocs loader-backed source. This keeps validation working,
  but the rendered app is not consuming the same compiled MDX source that
  Fumadocs validates.
- The package architecture already names planned `@taxkit/docs-fumadocs`, but
  the implemented workspace only includes `packages/*`, `packages/sdk/*` and
  `packages/rules/au/*`. The implementation should therefore create
  `packages/docs-fumadocs` unless the workspace globs are intentionally
  changed.
- Current validation is Effect-native and valuable. It should move only when a
  rule is generic Fumadocs wiring; TaxKit content policy should remain in
  `@taxkit/docs-content`.

### `site` repository reference

Reference files inspected:

- `site:packages/posts/source.config.ts`
- `site:packages/posts/src/schemas.ts`
- `site:packages/posts/src/live.layer.ts`
- `site:packages/posts/src/server.ts`
- `site:apps/web/src/lib/runtime.server.ts`
- `site:packages/ui/src/mdx/code-block.tsx`
- `site:packages/ui/src/mdx/picture.tsx`

Findings to copy:

- The content package is source-only and exposes content schemas, service
  layers and Fumadocs generated source access through package exports.
- `Schema.toStandardSchemaV1(...)` is used to give Fumadocs a Standard Schema
  contract while keeping Effect Schema as the source of truth.
- An explicit meta schema avoids leaking Fumadocs default Zod types to
  consumers.
- Generated Fumadocs source stays behind a package boundary.
- Reusable MDX primitives live outside the content package.
- App runtime composes services with `ManagedRuntime`; routes consume services
  through app-local loaders.

Findings to improve for TaxKit:

- TaxKit should avoid copying raw TypeScript branches, mutable arrays, broad
  casts and one-off helpers from the reference implementation where an Effect
  primitive or schema-owned contract fits.
- The reusable Fumadocs package should make the Standard Schema bridge, meta
  schema and MDX options reusable so future content packages do not duplicate
  them.

### `mobius` repository website reference

Reference files inspected:

- `mobius:packages/docs/core/src/fumadocs.ts`
- `mobius:packages/docs/core/src/tree.ts`
- `mobius:packages/docs/mobius/src/presentation.ts`
- `mobius:apps/website/src/routes/docs/route.tsx`
- `mobius:apps/website/src/routes/docs/mobius/$slug.tsx`
- `mobius:apps/website/src/routes/docs/mobius/-route-boundary.ts`

Findings to copy:

- A reusable docs core package adapts typed docs trees to Fumadocs
  `PageTree.Root`.
- App routes compose multiple content trees into one Fumadocs layout without
  making the content package own route rendering.
- Route boundary files own loader input/output schemas and typed error
  encoding.
- `Effect.Match` is used for loader success/failure and tree rendering
  decisions.
- App-local docs components own product-specific rendering and navigation
  behaviour.

Findings to improve for TaxKit:

- TaxKit uses MDX content rather than Notion-backed docs, so Fumadocs MDX
  source generation and MDX component allowlist validation are first-class
  requirements.
- TaxKit should keep renderer helpers reusable only when they are generic.
  Domain-specific examples, SDK/API widgets and app shell components belong in
  `apps/docs/src/lib`.

## Problem

The current package split is too coarse for the next documentation phase:

- `@taxkit/docs-content` owns generic Fumadocs internals that future docs
  packages would otherwise duplicate.
- The docs app is not rendering compiled MDX modules from Fumadocs.
- The current renderer parses markdown manually, so it cannot reliably support
  custom MDX components, code metadata, table of contents, Mermaid or future
  generated reference embeds.
- App loaders return raw page objects without a route-owned serialisable
  loader schema boundary.
- Architecture docs still describe a planned nested docs package path that does
  not match the current workspace glob.

## Goals

- Create a reusable private `@taxkit/docs-fumadocs` package at
  `packages/docs-fumadocs`.
- Keep authored public docs content in `apps/docs/content`.
- Keep TaxKit content schemas and validation policy in
  `@taxkit/docs-content`.
- Move generic Fumadocs MDX configuration, Standard Schema bridging, source
  loader helpers and reusable renderer primitives into `@taxkit/docs-fumadocs`.
- Render docs pages through Fumadocs compiled MDX modules, not hand-parsed
  markdown.
- Use Effect Schema for frontmatter, meta, navigation, route loader and
  validation contracts.
- Use `Effect.Match` for closed rendering branches where it clarifies supported
  cases.
- Keep app-specific docs layout, search, route loaders and custom TaxKit MDX
  components in `apps/docs/src/lib`.
- Add package-boundary audits that prove browser code does not import
  server-only generated source.
- Preserve strict Effect TypeScript conventions from
  [Effect services](../architecture/effect-services.md).

## Non-goals

- Do not move authored MDX content into a package in this phase.
- Do not convert public docs to Markdoc or `.mdoc`.
- Do not publish docs packages.
- Do not create a generic UI design system package unless repeated components
  already need it.
- Do not duplicate SDK, API, calculator or fact schemas in docs packages.
- Do not make Fumadocs defaults the source of truth for frontmatter, meta or
  navigation.

## Implementation result

The implemented package split uses the flat workspace path
`packages/docs-fumadocs`, not the older planned nested
`packages/docs/fumadocs` path.

Implemented ownership:

- `apps/docs/content` owns authored public MDX.
- `packages/docs-content` owns TaxKit docs schemas, navigation, validation,
  tagged errors, generated source wiring and the `DocsContentService`.
- `packages/docs-fumadocs` owns reusable Fumadocs helpers, Standard Schema
  bridging, source adapters, page-tree conversion and generic MDX primitives.
- `apps/docs/src/lib` owns the app route boundary, route loaders, runtime,
  shell CSS and app-specific MDX component composition.

The docs app now renders compiled Fumadocs MDX modules through
`@taxkit/docs-content/client`, not hand-parsed markdown.

## Pre-implementation call graphs

These graphs show the state audited before this spec was implemented. Use the
final call graphs below for the current architecture.

```ts
Production: current docs page

browser
  -> apps/docs route
    -> apps/docs/src/lib/docs/loaders.ts
      -> DocsContentService
        -> packages/docs-content/src/validation/policy.ts
          -> apps/docs/navigation.json
          -> apps/docs/content/**/*.mdx
    -> apps/docs/src/lib/mdx/components.tsx
      -> hand-written markdown renderer
```

```ts
Build: current Fumadocs source

bun run --filter=@taxkit/docs-content build
  -> fumadocs-mdx
    -> packages/docs-content/source.config.ts
      -> DocsPageFrontmatter via Schema.toStandardSchemaV1
      -> DocsMeta via Schema.toStandardSchemaV1
      -> packages/docs-content/.source/*
```

```ts
Tests: current validation

bun run --filter=@taxkit/docs-content validate
  -> packages/docs-content/src/validate.runtime.ts
    -> validation policy
      -> frontmatter decode through DocsPageFrontmatter
      -> navigation decode through DocsNavigation
      -> link, examples and OpenAPI reference checks
```

## Final call graphs

```ts
Production: target docs page

browser
  -> apps/docs route
    -> apps/docs/src/lib/docs/route-boundary.ts
    -> apps/docs/src/lib/docs/loaders.ts
      -> DocsContentService
        -> @taxkit/docs-fumadocs source adapter
          -> packages/docs-content/.source/server
            -> apps/docs/content/**/*.mdx
      -> serialisable Exit encoded/decoded with Effect Schema
      -> preload @taxkit/docs-content/client entry
    -> apps/docs/src/lib/mdx/components.tsx
      -> @taxkit/docs-content/client createClientLoader
      -> @taxkit/docs-fumadocs/render primitives
      -> app-local MDX component map
      -> compiled Fumadocs MDX component
```

```ts
Build: target Fumadocs source

bun run --filter=@taxkit/docs-content build
  -> fumadocs-mdx
    -> packages/docs-content/source.config.ts
      -> @taxkit/docs-fumadocs source config helpers
        -> Effect Schema to Standard Schema bridge
        -> generic DocsMeta schema
        -> shared Shiki and Mermaid MDX options
      -> packages/docs-content/.source/*
```

```ts
Tests: final validation

docs verification
  -> @taxkit/docs-fumadocs tests
    -> Standard Schema bridge
    -> page tree adapter
    -> renderer helper contracts
  -> @taxkit/docs-content validation
    -> Fumadocs generated source
    -> Effect Schema frontmatter and navigation decode
    -> navigation coverage audit
    -> local link audit
    -> MDX component allowlist audit
    -> examples and OpenAPI smoke checks
  -> apps/docs checks
    -> route boundary schema tests
    -> browser-safe import audit
    -> build and browser smoke
```

```ts
Audit: final package boundary

parent reviewer
  -> import graph audit
    -> apps/docs content only under apps/docs/content
    -> @taxkit/docs-content has no React route or layout ownership
    -> @taxkit/docs-fumadocs has no TaxKit content policy ownership
    -> apps/docs imports no generated .source/server files directly
    -> browser modules import no server-only docs exports
```

## Package ownership

### `apps/docs/content`

Owns authored public MDX files only. Content must use frontmatter decoded by
`DocsPageFrontmatter` and custom components allowed by the docs validation
policy.

### `packages/docs-content`

Owns TaxKit-specific docs content contracts:

- `DocsPageFrontmatter`
- `DocsMeta` only if TaxKit extends the generic meta contract
- `DocsNavigation`
- `DocsPagePath`
- `DocsPageSlug`
- `DocsSourcePath`
- `DocsValidationIssue`
- `DocsValidationResult`
- docs validation policy
- `DocsContentService`
- tagged source and lookup errors
- generated source export wiring for this content collection

It may call `@taxkit/docs-fumadocs` helpers. It must not own reusable Shiki
transformers, generic Fumadocs page tree conversion, app routes, React layout
or app-specific MDX components.

### `packages/docs-fumadocs`

Owns reusable Fumadocs integration:

- Effect Schema to Standard Schema bridge helpers
- generic Fumadocs meta schema
- shared `defineConfig(...)` / MDX options helpers
- code block metadata transformer
- Fumadocs source loader adapter
- Fumadocs `PageTree` conversion helpers
- reusable renderer primitives that are not TaxKit-domain-specific
- browser-safe and server-only export separation

It must not import `@taxkit/docs-content`, SDK, API or calculator packages
unless a specific reusable renderer primitive requires a browser-safe public
contract and the architecture docs approve that dependency.

### `apps/docs/src/lib`

Owns app-specific composition:

- route loaders and route boundary schemas
- `ManagedRuntime` wiring
- Fumadocs layout shell
- search/navigation presentation
- app-local MDX component map
- TaxKit-specific docs components, such as SDK/API examples and generated
  reference embeds
- browser smoke tests and app route tests

It may import browser-safe helpers from `@taxkit/docs-fumadocs` and
server-only content service exports from `@taxkit/docs-content` only inside
server-only route loader/runtime modules.

## Implementation requirements

### Reusable Fumadocs package

Create `packages/docs-fumadocs` with package name
`@taxkit/docs-fumadocs`.

Recommended exports:

```json
{
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./config": {
      "source": "./src/config.ts",
      "default": "./src/config.ts"
    },
    "./source": {
      "source": "./src/source.ts",
      "default": "./src/source.ts"
    },
    "./tree": {
      "source": "./src/tree.ts",
      "default": "./src/tree.ts"
    },
    "./render": {
      "source": "./src/render/index.tsx",
      "default": "./src/render/index.tsx"
    },
    "./schemas": {
      "source": "./src/schemas.ts",
      "default": "./src/schemas.ts"
    }
  }
}
```

`./config` should expose the bridge and shared MDX options used by
`packages/docs-content/source.config.ts`.

`./source` should expose source loader helpers that can wrap generated
Fumadocs source with typed errors.

`./tree` should expose page tree helpers modelled on Mobius
`@docs/core/fumadocs`, adapted to Effect-style contracts and `Effect.Match`.

`./render` may expose generic MDX primitives such as `CodeBlock`, `Pre` and
`Picture` if they are browser-safe and reusable.

### Content package refactor

Refactor `packages/docs-content/source.config.ts` so it mainly declares:

- the content directory
- the TaxKit frontmatter schema
- optional TaxKit meta extensions
- calls into `@taxkit/docs-fumadocs/config`

`packages/docs-content` should use the generated Fumadocs source for page
lookup and rendering data. Validation may still read raw files where file
policy checks need source text, but app rendering must not depend on a
hand-parsed markdown object.

### App rendering refactor

Replace the hand-written markdown renderer in
`apps/docs/src/lib/mdx/components.tsx` with Fumadocs compiled MDX rendering.
The app should keep a small component map that combines:

- reusable primitives from `@taxkit/docs-fumadocs/render`
- app-specific TaxKit components in `apps/docs/src/lib`
- default HTML element overrides where useful

Route loader data should use Effect Schema-owned serialisable contracts. If the
app needs to encode `Exit` values, follow the serialisable route boundary
pattern from the `site` and `mobius` repository implementations.

### Validation and audits

Validation must include:

- Fumadocs build validation
- Effect Schema frontmatter and meta decode
- navigation decode and content path coverage
- MDX component allowlist validation
- local link audit
- examples and OpenAPI reference smoke checks
- import graph audit for server/browser boundaries
- package ownership audit for `docs-content`, `docs-fumadocs` and `apps/docs`

Every substantial implementation task must document at least three improvement
audit passes before parent acceptance.

## Documentation updates

Implementation must update:

- `docs/architecture/content-and-posts.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/api-and-sdk.md` if it still names the nested docs package
  path as the preferred current path
- `packages/docs-content/README.md`
- new `packages/docs-fumadocs/README.md`
- any public docs page affected by rendering or frontmatter changes

Docs changes must follow:

- [Documentation style](../standards/documentation-style.md)
- [Documentation writing](../standards/documentation-writing.md)
- [Documentation templates](../standards/documentation-templates.md)
- [Documentation review](../standards/documentation-review.md)
- [Documentation architecture](../standards/documentation-architecture.md)
- [Documentation user journeys](../standards/documentation-user-journeys.md)

## Verification

Required verification:

```txt
bun run --filter=@taxkit/docs-fumadocs build
bun run --filter=@taxkit/docs-fumadocs check-types
bun run --filter=@taxkit/docs-fumadocs test
bun run --filter=@taxkit/docs-content build
bun run --filter=@taxkit/docs-content check-types
bun run --filter=@taxkit/docs-content test
bun run --filter=@taxkit/docs-content validate
bun run --filter=docs check-types
bun run --filter=docs build
bun run verification
```

Browser verification should open:

- docs home
- one nested guide page
- one page with a code block
- one page with a Mermaid architecture or flowchart if present

Browser verification must also capture reviewable screenshots:

- Start the docs app with `bun run --filter=docs dev` or the repo-approved
  portless docs command.
- Test desktop and mobile widths, at minimum `1440x1000` and `390x844`.
- Capture screenshots for each route above and save them under the active exec
  plan evidence directory, for example
  `docs/exec-plans/active/<plan-name>/screenshots/`.
- Link every screenshot in the task handoff so the parent reviewer can inspect
  rendered layout, navigation, typography, code blocks and MDX components.
- Treat blank pages, hydration errors, missing navigation, clipped text,
  overlapping UI, unstyled code blocks, broken links, console errors or
  visibly unrendered MDX components as failures.

The parent review must inspect the screenshots before accepting the app
rendering task. Build/typecheck success alone is not enough for this spec.

Audit commands should prove:

```txt
rg "@taxkit/docs-content/server|\\.source/server" apps/docs/src
rg "from [\"']react|\\.tsx" packages/docs-content
rg "@taxkit/docs-content" packages/docs-fumadocs
rg "switch \\(|Object\\.values|Object\\.entries| as " packages/docs-fumadocs packages/docs-content apps/docs/src/lib
```

The first, second and third commands should return no inappropriate imports.
The fourth should be reviewed manually for justified exceptions.

## Risks and mitigations

- Fumadocs generated source may rely on bundler assumptions. Keep generated
  source behind package exports and test the docs app build.
- Renderer primitives can become too app-specific. Keep TaxKit-specific items
  in `apps/docs/src/lib` until repetition proves they should move.
- Frontmatter validation can drift from public docs standards. Keep
  `DocsPageFrontmatter` schema-owned and validate public MDX pages in
  `@taxkit/docs-content`.
- Browser-safe imports can regress silently. Add `rg` audits and route tests
  that fail when browser code imports server-only source.

## Acceptance criteria

- `@taxkit/docs-fumadocs` exists and owns reusable Fumadocs integration.
- `@taxkit/docs-content` owns TaxKit docs content contracts and validation,
  not generic renderer or route behaviour.
- `apps/docs` renders compiled Fumadocs MDX modules with an app-local component
  map.
- Effect Schema owns frontmatter, meta, navigation, loader and validation
  contracts.
- Current public docs still build and render.
- Architecture docs and package READMEs describe the final ownership.
- Required verification and import audits pass.
- The final call graph still matches this spec, or the spec is updated with
  the implemented graph before acceptance.

## References

- [Docs MDX Fumadocs runtime](./docs-mdx-fumadocs-runtime.md)
- [Content and posts architecture](../architecture/content-and-posts.md)
- [Package boundaries](../architecture/package-boundaries.md)
- [Effect services](../architecture/effect-services.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- `site:packages/posts`
- `site:packages/ui/src/mdx`
- `mobius:packages/docs/core`
- `mobius:apps/website/src/routes/docs`
