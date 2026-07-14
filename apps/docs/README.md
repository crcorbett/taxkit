---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: app-root
confidence: high
---

# Docs app

This private TanStack Start app renders the public WhatTax developer
documentation.

It owns routes, the app shell, navigation presentation, app-local MDX component
composition and browser rendering. It does not own canonical docs schemas,
validation policy or generated Fumadocs source access; those live in
`@whattax/docs-content`. Reusable Fumadocs integration lives in
`@whattax/docs-fumadocs`.

## Content root

Public MDX content lives in:

```txt
apps/docs/content
```

Each top-level section owns an `index.mdx` file. Later content tasks can add
child pages below the matching section directory.

## Navigation contract

The public docs navigation is defined in:

```txt
apps/docs/navigation.json
```

The required top-level sections are:

- Start
- SDK
- API
- Guides
- Concepts
- Contributing
- Reference

The navigation file is the source of truth for sidebar order until a docs
runtime owns a generated or typed navigation API. It is decoded and validated
by `@whattax/docs-content`.

## Runtime graph

```ts
Production: docs page

browser
  -> TanStack route loader
    -> createServerFn
      -> DocsContentService
        -> @whattax/docs-content live layer
          -> @whattax/docs-fumadocs source adapter
          -> packages/docs-content/.source/server
          -> schema-decoded apps/docs/navigation.json representation
      -> schema-encoded Exit representation
    -> TanStack SSR hydration or client-navigation transport
      -> direct route-root restore and Result match
        -> @whattax/docs-content/client
          -> Fumadocs compiled MDX module
        -> @whattax/docs-fumadocs/render
        -> app-local MDX component map
```

## Commands

```txt
bun run --filter=docs dev
bun run --filter=docs test:browser
bun run --filter=docs check-types
bun run --filter=docs build
bun run --filter=docs preview
bun run --filter=docs check-examples
bun run docs:validate
```

`check-types` includes `check-examples`, so public examples stay connected to
current SDK/API/calculator exports.

Run `build` before `preview`. Both `dev` and `preview` expose the app through
`https://docs.whattax.localhost` with portless.

`test:browser` runs the programmatic TanStack client-route harness in Chromium.
It proves success, expected failures, malformed transport and framework error
boundaries after `Route.useLoaderData`; it does not prove SSR or hydration. Use
the built app for initial SSR, hydration and real client-navigation proof.

## Authoring rules

Before writing or reviewing public docs, read:

- [Documentation style](../../docs/standards/documentation-style.md)
- [Documentation writing](../../docs/standards/documentation-writing.md)
- [Documentation templates](../../docs/standards/documentation-templates.md)
- [Documentation review](../../docs/standards/documentation-review.md)
- [Documentation architecture](../../docs/standards/documentation-architecture.md)
- [Documentation user journeys](../../docs/standards/documentation-user-journeys.md)

Use the matching template and user journey for each page. If a repeated page
shape does not have a template, add the template before writing more pages in
that shape.

## Validation graph

```ts
Tests: docs runtime

docs change
  -> @whattax/docs-content validate
    -> frontmatter and navigation schemas
    -> local links and allowed MDX components
    -> example and OpenAPI reference checks
  -> docs check-examples
    -> TypeScript example compilation
  -> docs build
    -> TanStack Start and Fumadocs rendering
```

## Guardrails

- Do not import raw `apps/docs/content` files from route loaders.
- Do not import `@whattax/docs-content/server` or generated `.source/server`
  modules from browser code.
- Keep app-specific MDX components in `src/lib/mdx/components.tsx`.
- Use TanStack `Link` for internal docs routes so navigation runs the client
  loader and server-function RPC. Use ordinary anchors for external URLs.
- Keep browser boundary tests programmatic. Do not add production test routes.
- Keep direct loader restoration and top-level `Result` matching in the route
  root. Compose semantic page landmarks route-high, and pass focused readonly
  values and callbacks to section and leaf components.
- Keep local presentation commands in leaves. Remote or domain commands remain
  with the route action or nearest policy-owning container.
- Put loading, empty and recoverable error UI at the smallest owning boundary
  and preserve constrained component footprints.
- Put generic Fumadocs primitives in `@whattax/docs-fumadocs` only when they
  are reusable outside this app.
- Use [Documentation style](../../docs/standards/documentation-style.md) and
  the related standards suite before writing or reviewing public docs.
- Apply [Abstraction
  admission](../../docs/design-docs/abstraction-admission.md) before adding a
  shared hook, provider, component family or package.
