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
: Planned public documentation site and current public MDX content root. The
  current implementation owns navigation and draft MDX section indexes, but it
  does not yet include a docs app package, framework runtime or generated
  reference pipeline.

`apps/docs/content`
: Public MDX content root. It owns the Start, SDK, API, Guides, Concepts,
  Contributing and Reference section directories.

`apps/docs/navigation.json`
: Draft public docs navigation contract. It owns top-level section order,
  section source files, stable paths and primary reader metadata until a docs
  framework owns a generated or typed navigation API.

`packages/docs/fumadocs`
: Optional shared docs configuration or content package when app-local docs
become too large.

`docs/architecture`
: Durable implementation architecture.

`docs/product-specs`
: Current product/spec intent for repo development.

## Public docs graph

```ts
Production: public docs request

developer
  -> docs site navigation
    -> apps/docs/navigation.json
      -> apps/docs/content/<section>/index.mdx
      -> generated API reference when available
      -> package README or architecture doc for deeper ownership detail
```

```ts
Tests: docs structure

docs implementation
  -> navigation audit for required sections
  -> documentation standards review
  -> bun run verification
  -> docs app build/typecheck once apps/docs has a package manifest
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

## Related docs

- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)
- [../product-specs/index.md](../product-specs/index.md)
