---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Content And Posts

WhatTax public content should explain the open-source engine, supported rule
packs, calculator behavior, API usage and SDK usage.

## Scope

This doc owns public docs/content direction for WhatTax. It should stay focused
on the open-source tax engine and avoid downstream private-product specifics.

## Main Areas

`apps/docs`
: Planned public documentation site.

`packages/docs/fumadocs`
: Optional shared docs configuration or content package when app-local docs
become too large.

`docs/architecture`
: Durable implementation architecture.

`docs/product-specs`
: Current product/spec intent for repo development.

## Guardrails

- Keep public docs generic to callers and applications.
- Do not document private downstream product strategy here.
- Link to canonical architecture docs rather than duplicating them.
- Treat old planning material as historical until revalidated.

## Related Docs

- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)
- [../product-specs/index.md](../product-specs/index.md)
