---
name: docs-writer
description: "Use when writing or editing WhatTax developer documentation, MDX pages, package READMEs, contribution guides, docs specs, or documentation task lists so the work follows the canonical documentation style and templates."
---

# Docs writer

Use this skill for WhatTax documentation work.

## Start here

Read first:

1. `docs/standards/documentation-style.md`
2. `docs/standards/documentation-writing.md`
3. `docs/standards/documentation-templates.md`, then the specific template
   file under `docs/standards/documentation-templates/` that matches the page
   type
4. `docs/standards/documentation-review.md`
5. `docs/standards/documentation-architecture.md`
6. `docs/standards/documentation-user-journeys.md`, then the specific journey
   file under `docs/standards/documentation-user-journeys/` that matches the
   target reader
7. the relevant docs architecture page, usually
   `docs/architecture/content-and-posts.md`
8. any page, README, spec or task list being edited

## Required style

Follow the documentation standards suite thoroughly:

- write in second person
- use Australian spelling
- use sentence-case headings and sidebar labels
- keep prose brief, clear, straightforward and sophisticated
- avoid marketing language and banned hype words
- choose the documented page template that fits the page type
- add or update a template before creating a new repeatable page type
- identify the primary reader and reader need before writing
- use architecture diagrams or flowcharts only when useful
- avoid sequence diagrams unless they are clearly the best representation
- use current SDK/API names and canonical schema/type references
- review with the audit lists in `docs/standards/documentation-review.md`

## Task-list rule

When creating or editing a documentation task list, every task that writes or
changes docs must require implementers to read and follow the documentation
standards suite:

- `docs/standards/documentation-style.md`
- `docs/standards/documentation-writing.md`
- `docs/standards/documentation-templates.md`
- the specific template file in `docs/standards/documentation-templates/`
- `docs/standards/documentation-review.md`
- `docs/standards/documentation-architecture.md`
- `docs/standards/documentation-user-journeys.md`
- the specific journey file in `docs/standards/documentation-user-journeys/`

The task's verification or completion criteria must include parent review for:

- reader fit and user journey
- voice and Australian spelling
- sentence-case headings
- absence of marketing language
- correct page template, or a documented new template
- useful diagrams only
- current SDK/API names
- canonical schema/type references
- link and source-of-truth accuracy
- at least three documented improvement audit passes for substantial
  docs-runtime, docs-wiring or public MDX structure work
- the parent audit loop for delegated tasks: return incomplete work to the same
  subagent, stop after the third failed correction turn, and replan or ask for
  a decision

## Output expectations

For a small docs edit, update the page and run the narrowest useful validation.

For a new docs section or MDX set, update:

- the content pages
- the navigation or index page
- the relevant architecture or standards doc when ownership changes
- the task list or exec plan when implementation sequencing changes

Run `bun run verification` when docs wiring, package READMEs, specs or task
lists change. For docs-only changes, state the no-changeset rationale unless a
package-facing README or package behaviour changed.
