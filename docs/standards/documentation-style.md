---
status: canonical
last_reviewed: 2026-05-31
source_of_truth: docs
confidence: medium
---

# Documentation style

Use this standard when writing, reviewing or editing public WhatTax docs,
package READMEs, contributor guides, API/SDK guides, MDX pages, product specs
and documentation task lists.

WhatTax documentation is developer documentation. It should help a capable
engineer understand the right concept, run the right code and make the right
change without marketing language or internal history.

## Required reading

Read the relevant page before writing or reviewing docs:

- [Documentation writing](./documentation-writing.md) for voice, tone,
  wording and editing rules.
- [Documentation templates](./documentation-templates.md) for reusable page
  structures and when to create a new template.
- [Documentation review](./documentation-review.md) for review checklists,
  audit lists and editing passes.
- [Documentation architecture](./documentation-architecture.md) for docs
  ownership, navigation, MDX structure and source-of-truth rules.
- [Documentation user journeys](./documentation-user-journeys.md) for target
  readers, reader needs and example page journeys.

## Non-negotiable style rules

- Write in second person.
- Use Australian spelling.
- Use sentence-case headings, page titles, sidebar labels and table headings.
- Keep prose brief, clear, straightforward and sophisticated.
- Avoid marketing language.
- Prefer concrete examples over claims.
- Use architecture diagrams and flowcharts only when they clarify the page.
- Avoid sequence diagrams unless there is a specific reason they are clearer
  than a call graph or flowchart.
- Use current SDK/API names and canonical schema/type references.
- Use the page template that matches the page type, or record a new template
  before repeating a new page structure.

## Banned language

Do not use vague promotional words unless they are part of a quoted product
name:

- powerful
- seamless
- easy
- simple
- simply
- just
- effortless
- beautiful
- magical
- revolutionary
- world-class

Do not write filler claims such as "it is easy to integrate" or "seamlessly
connect". Show the integration with a short example instead.

## Current public names

Use current public names in new docs:

- `WhatTax.calculate`
- `WhatTax.safe.calculate`
- `au.incomeTax.annual`
- `calculateRunRequest`
- `calculateReportRequest`
- `calculateReport`
- `CalculatorRunRequest`
- `CalculatorRunResponse`
- `CalculatorServiceError`

Do not use stale names such as `calculateRequest`,
`createEffectClient`, `PublicCalculationMetadataGroup`,
`PublicCalculationMetadataHandlerLive` or `PublicErrorEnvelope` in new public
docs, except when documenting migration from old names.

## Task-list rule

Any task list that writes or changes docs must instruct implementers to read
and thoroughly follow this documentation standards suite. The task must require
parent review for:

- reader fit and user journey
- voice and Australian spelling
- sentence-case headings
- absence of marketing language
- correct page template, or a documented new template
- useful diagrams only
- current SDK/API names
- canonical schema/type references
- link and source-of-truth accuracy
