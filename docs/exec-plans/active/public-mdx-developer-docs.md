---
status: active
last_reviewed: 2026-05-31
source_of_truth: execution-plan
confidence: medium
---

# Public MDX developer documentation execution plan

Spec:
[Public MDX developer documentation](../../product-specs/public-mdx-developer-docs.md)

Task list:
[`public-mdx-developer-docs.tasks.json`](../../product-specs/public-mdx-developer-docs.tasks.json)

Goal:
Implement the public MDX developer documentation task list sequentially. Each
task is delegated to one subagent when available; the parent agent reviews,
audits documentation standards, verifies mandatory gates, accepts the task,
updates this plan and commits each coherent slice before delegating the next
task.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| DOCS-MDX-001 | complete | Chose `apps/docs/content` as the MDX content root and added the draft navigation contract without scaffolding a docs app package. |
| DOCS-MDX-002 | complete | Added public Start and SDK MDX pages covering the SDK quickstart, install path, first calculation, SDK-vs-API choice, plain SDK, safe SDK, Effect SDK, schemas and type safety. |
| DOCS-MDX-003 | pending | Write API, guides and concepts docs. |
| DOCS-MDX-004 | pending | Write contribution docs for facts, rules, calculators and PRs. |
| DOCS-MDX-005 | pending | Add reference, examples and final docs validation. |

## Validation log

### 2026-05-31 - Planning

- Read the target spec, task list and implementation flow.
- Read relevant architecture docs for content, frontend and API/SDK
  boundaries.
- Read the documentation standards entrypoints for style and architecture.
- Created active implementation goal requiring sequential subagent execution,
  parent review, documentation standards audit, verification and commits
  between slices.

### 2026-05-31 - DOCS-MDX-001 implementation

- Read the public MDX developer docs spec, `DOCS-MDX-001`, implementation
  guidance, relevant architecture docs and the documentation standards suite.
- Chose `apps/docs/content` as the public MDX content root.
- Added `apps/docs/navigation.json` as the draft navigation contract for Start,
  SDK, API, Guides, Concepts, Contributing and Reference.
- Added draft section index pages only. Later tasks still own full Start, SDK,
  API, guide, concept, contribution and reference content.
- Added a section-index template because the top-level MDX pages introduced a
  reusable page shape.
- Updated `docs/architecture/content-and-posts.md` with the content root,
  navigation contract and docs structure call graph.
- No docs app package was scaffolded in this slice, so there is no docs app
  typecheck or build command yet.
- Verification passed:
  - `bun run verification`
  - `bun run changeset status --verbose`
  - `jq empty apps/docs/navigation.json && jq empty apps/docs/navigation.schema.json`
  - `rg -n '"title": "(Start|SDK|API|Guides|Concepts|Contributing|Reference)"|# (Start|SDK|API|Guides|Concepts|Contributing|Reference)' apps/docs`
  - documentation review audit for reader fit, section-index template use,
    second person, Australian spelling, sentence-case headings, banned
    language, stale SDK/API names, useful diagrams and private-product
    references
- Changeset rationale: no new Changeset was required because this slice is
  docs/spec/standards/content-root only and does not change package exports,
  package README behaviour or runtime behaviour.

### 2026-06-01 - DOCS-MDX-002 implementation

- Read the public MDX developer docs spec, `DOCS-MDX-002`, implementation
  guidance, relevant API/SDK and content architecture docs and the
  documentation standards suite.
- Loaded the relevant page templates: quickstart, decision page, guide,
  concept and reference.
- Loaded the relevant reader journeys: SDK evaluator, application integrator,
  type-safety focused developer and API consumer.
- Added Start pages for overview, quickstart, install, first calculation and
  SDK-vs-API selection.
- Added SDK pages for the TypeScript SDK, plain SDK, safe SDK, Effect SDK,
  schemas and type safety.
- Updated `apps/docs/navigation.json` and its schema so Start and SDK child
  pages are part of the docs navigation contract.
- Kept API, guides, concepts, contributing and reference sections as indexes
  only because later tasks own those sections.
- MDX build validation is still limited because `apps/docs` has no package
  manifest, MDX compiler or runtime yet. This slice used JSON validation,
  source-existence checks and frontmatter/fence audits instead.
- Snippet extraction is not automated yet. This slice validated examples
  against current SDK exports with the SDK type-test command and recorded the
  extraction gap as follow-up evidence.
- Changeset rationale: no new Changeset was required because this slice is
  public docs content and navigation only. It does not change package exports,
  package README behaviour or runtime behaviour.
