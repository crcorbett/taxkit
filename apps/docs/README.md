---
status: draft
last_reviewed: 2026-05-31
source_of_truth: docs
confidence: medium
---

# Public docs content

This directory owns the planned public MDX developer documentation content for
WhatTax.

The current slice establishes the content root and navigation contract only. It
does not scaffold a docs app package, framework runtime or generated reference
pipeline yet.

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
framework owns a generated or typed navigation API.

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

## Planned app graph

```ts
Production: public docs request

developer
  -> docs site navigation
    -> apps/docs/navigation.json
      -> apps/docs/content/<section>/index.mdx
      -> generated API reference when available
      -> package README or architecture doc for deeper ownership detail
```

## Current status

This directory is a content-root tracer bullet. There is no `apps/docs`
package manifest yet, so there is no docs-app build or typecheck command for
this slice.
