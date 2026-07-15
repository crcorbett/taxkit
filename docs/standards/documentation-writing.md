---
status: canonical
last_reviewed: 2026-05-31
source_of_truth: docs
confidence: medium
---

# Documentation writing

Use this guide for writing and editing TaxKit documentation prose.

## Reader stance

Write to a capable developer who wants to complete a task. Assume they can
read TypeScript, understand package managers and follow a short command
sequence. Do not assume they know TaxKit package ownership, Effect conventions
or Australian tax terminology.

Write in second person:

- "You can call the SDK from a server route."
- "Use the HTTP API when the caller cannot import TypeScript packages."
- "Add a golden test before you update the calculator."

Avoid first-person marketing claims:

- "We make it easy to..."
- "Our SDK seamlessly..."
- "Users can simply..."

## Voice and tone

Use a calm, practical voice:

- direct rather than promotional
- specific rather than broad
- helpful without over-explaining
- confident without hype
- honest about limitations, beta surfaces and prerequisites

Prefer short paragraphs. Most paragraphs should be one to three sentences.

## Australian spelling

Use Australian spelling:

- behaviour
- modelling
- organise
- initialise
- catalogue
- licence
- analyse

Do not mix US and Australian spelling on the same page.

## Headings

Use sentence case for all headings, page titles, sidebar labels and table
headings.

Prefer:

```md
# Run your first calculation

## Handle validation errors
```

Avoid:

```md
# Run Your First Calculation

## Handle Validation Errors
```

Headings should describe the reader task or concept. Do not use clever
headings, slogans or marketing taglines.

## Sentences

Prefer concrete verbs:

- use
- call
- pass
- return
- add
- validate
- update
- publish

Avoid vague verbs:

- leverage
- utilise
- enable
- streamline
- unlock

Use "must" only for rules that are required. Use "should" for strong
recommendations. Use "can" for options.

## Examples before claims

When you want to say a task is approachable, show the smallest correct example
instead.

Prefer:

```ts
const report = await au.incomeTax.annual({
  taxableIncome: aud(90_000_00),
});
```

Avoid:

```md
The SDK makes income tax calculations easy.
```

## Limits and beta surfaces

Be explicit about limitations:

- "The SDK package is private until release approval."
- "The HTTP API is useful for browser and non-TypeScript callers."
- "Snippet checking is not automated yet."

Do not hide missing capability behind vague language.

## Code snippets

Code snippets should be useful, short and current.

Include imports when the snippet is meant to be copied:

```ts
import { aud } from "@taxkit/core/primitives";
import { au } from "@taxkit/sdk/au";
```

Use canonical schema-owned values and branded constructors where required.
Avoid raw object shapes when a package owns a schema, constructor or branded
type.

For now, examples may be manually reviewed. If a snippet is illustrative and
not intended to run, say so.

## Links and references

Use links to reduce duplication:

- public developer tasks link to public MDX pages
- package-local behaviour links to package READMEs
- durable implementation boundaries link to `docs/architecture/*`
- contribution standards link to `docs/standards/*`
- API endpoint contracts link to generated OpenAPI reference where available

Write descriptive link text. Avoid "click here".

## Editing pass

Before a page is ready, read it once only for prose and fix:

- marketing language
- headings that are not sentence case
- passive or vague sentences
- repeated explanation
- missing prerequisites
- examples without imports
- unclear next steps
