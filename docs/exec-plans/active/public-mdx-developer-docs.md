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
| DOCS-MDX-003 | complete | Added API, guides and concepts MDX pages, navigation entries and generated-reference follow-up. |
| DOCS-MDX-004 | complete | Added Contributing MDX pages for contribution routing, facts, rules, calculators, tax years, incorrect-result fixes, testing, source citations, naming/schema standards, Effect service standards, backward compatibility, Changesets, PR evidence and review expectations. |
| DOCS-MDX-005 | complete | Added Reference pages, examples, final navigation, docs validation config and final validation evidence. |

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

### 2026-06-01 - DOCS-MDX-002 parent acceptance

- Parent reviewed the committed Start and SDK docs slice in
  `607a1b6 Add Start and SDK developer docs`.
- Verified `apps/docs/navigation.json` and
  `apps/docs/navigation.schema.json` parse successfully with `jq empty`.
- Audited every Start and SDK navigation `source` entry and confirmed each MDX
  file exists.
- Audited Start and SDK MDX pages for frontmatter, balanced code fences and
  valid relative links.
- Audited Start and SDK docs for banned marketing wording and stale SDK/API
  names including `calculateRequest`, `createEffectClient`,
  `PublicCalculationMetadata` and `PublicErrorEnvelope`; no matches were
  found.
- Verified current public SDK names appear across the Start and SDK docs:
  `WhatTax.calculate`, `WhatTax.safe.calculate`, `calculateRunRequest`,
  `calculateReportRequest`, `calculateReport`, `CalculatorRunRequest`,
  `CalculatorRunResponse` and `CalculatorServiceError`.
- Verification passed:
  - `bun run --filter=@whattax/sdk test-types`
  - `bun run verification`
  - `bun run changeset status --verbose`
- Accepted `DOCS-MDX-002` for the parent gate.

### 2026-06-01 - DOCS-MDX-003 implementation

- Read the public MDX developer docs spec, `DOCS-MDX-003`, relevant API/SDK,
  content, facts, rules, calculators and graph architecture docs and the
  documentation standards suite.
- Loaded the relevant page templates: API reference overview, guide, concept,
  reference, troubleshooting and section index.
- Loaded the relevant reader journeys: API consumer, application integrator,
  type-safety focused developer, SDK evaluator and correctness reviewer.
- Added API pages for overview, authentication and deployment assumptions,
  errors, OpenAPI reference routing and endpoint routing.
- Added guide pages for take-home pay, annual income tax, validation errors,
  calculator help, server-route SDK integration, browser HTTP integration,
  integration tests and migration from raw HTTP to SDK.
- Added concept pages for calculators, facts, rules, jurisdictions and tax
  years, money and branded values, reports, diagnostics and the SDK/HTTP/API
  calculators service boundary.
- Updated `apps/docs/navigation.json` so API, Guides and Concepts child pages
  are part of the draft navigation contract.
- Recorded the generated-reference follow-up in
  `apps/docs/content/api/openapi-reference.mdx` because `apps/docs` remains a
  content root only and has no generated-reference ingestion pipeline yet.
- Docs app typecheck/build remains unavailable because `apps/docs` has no
  package manifest or runtime package yet.
- Verification passed:
  - `jq empty apps/docs/navigation.json && jq empty apps/docs/navigation.schema.json`
  - MDX content-root validation for frontmatter, balanced fences, local links
    and navigation sources
  - API OpenAPI smoke check against `GET /api/docs/openapi.json` on a local
    API app instance
  - API calculate smoke check against
    `POST /api/v1/calculators/au.pay.take-home/calculate`
  - documentation review audit for guide prerequisites, examples, expected
    output, error handling, banned language, stale SDK/API names, current
    public names, useful call graphs and HTTP-over-SDK call graph coverage
  - `git diff --check`
  - `bun run verification`
  - `bun run changeset status --verbose`
- Changeset rationale: no new Changeset was required because this slice only
  changes public MDX content, docs navigation and the active execution plan. It
  does not change package exports, package README behaviour or runtime
  behaviour.
- Final call graph still matches the spec: HTTP calculate routes through
  `CalculatorApiHandlerLive` to `@whattax/sdk/effect` `calculateRunRequest`,
  then to `PublicCalculatorService.calculate` and `CalculationEngine`, with
  `CalculatorApiErrorEnvelope` for expected service errors.

### 2026-06-01 - DOCS-MDX-003 parent acceptance

- Parent reviewed the committed API, guides and concepts slice in
  `0beb1b8 Add API guides and concepts docs`.
- Confirmed the changed file scope is limited to API, Guides and Concepts MDX
  pages, navigation and this execution plan.
- Verified `apps/docs/navigation.json` and
  `apps/docs/navigation.schema.json` parse successfully with `jq empty`.
- Audited every navigation `source` entry for API, Guides and Concepts and
  confirmed each MDX file exists.
- Audited API, Guides and Concepts MDX pages for frontmatter, balanced code
  fences and valid relative links.
- Confirmed public docs may link to deeper architecture docs under the current
  documentation architecture standard and spec.
- Audited API, Guides and Concepts pages for banned marketing wording, private
  downstream product names and stale SDK/API names; no matches were found.
- Verified current public API/SDK names appear across the slice:
  `WhatTax.calculate`, `WhatTax.safe.calculate`, `au.incomeTax.annual`,
  `calculateRunRequest`, `calculateReportRequest`, `calculateReport`,
  `CalculatorRunRequest`, `CalculatorRunResponse` and
  `CalculatorServiceError`.
- Verified the HTTP calculate over SDK call graph appears in the public API and
  concept docs.
- Verification passed:
  - `bun run verification`
  - `bun run changeset status --verbose`
- Accepted `DOCS-MDX-003` for the parent gate.

### 2026-06-01 - DOCS-MDX-004 parent acceptance

- Parent reviewed the committed contributing docs slice in
  `70689f8 Add contributing developer docs`.
- Confirmed the changed file scope is limited to Contributing MDX pages,
  navigation and this execution plan.
- Verified `apps/docs/navigation.json` and
  `apps/docs/navigation.schema.json` parse successfully with `jq empty`.
- Audited every contributing navigation `source` entry and confirmed each MDX
  file exists.
- Audited contributing MDX pages for frontmatter, balanced code fences and
  valid relative links.
- Audited the section for banned marketing wording, private downstream product
  names and stale SDK/API names; no matches were found.
- Verified required contributing coverage for facts, rules, calculators, tax
  years, source citations, golden tests, type tests, API compatibility tests,
  SDK compatibility tests and Changesets.
- Verified contributing docs state that HTTP and SDK layers must not hide tax
  business logic.
- Verification passed:
  - `bun run verification`
  - `bun run changeset status --verbose`
- Accepted `DOCS-MDX-004` for the parent gate.

### 2026-06-01 - DOCS-MDX-004 implementation

- Read the public MDX developer docs spec, `DOCS-MDX-004`, relevant package
  ownership, API/SDK, facts, rules, calculators, Effect services, testing and
  documentation standards docs.
- Loaded the contribution-guide and section-index templates.
- Loaded the new-contributor, correctness-reviewer and documentation
  contributor journeys.
- Added Contributing pages for:
  - what-are-you-changing router
  - add-a-fact, add-a-rule, add-a-calculator and add-a-tax-year guides
  - incorrect-result fixes
  - testing standards, source citation standards, naming/schema standards and
    Effect service standards
  - backward compatibility, Changesets, PR evidence and review expectations
- Updated `apps/docs/navigation.json` so Contributing child pages are part of
  the draft navigation contract.
- Kept the slice limited to DOCS-MDX-004 outputs. `DOCS-MDX-005` remains
  pending and was not implemented.
- Docs app typecheck/build remains unavailable because `apps/docs` has no
  package manifest, docs framework runtime or app-local build script.
- MDX content-root validation passed for frontmatter, balanced fences, local
  links and navigation source files across 53 MDX files.
- Documentation standards audit passed for the new Contributing docs:
  second-person voice, Australian spelling, sentence-case headings, no banned
  marketing language, useful flowcharts, current SDK/API names and canonical
  schema/type references.
- Local link audit passed for the public MDX content root.
- Required coverage audit passed for facts, rules, calculators, tax years,
  source citations, golden tests, type tests, API compatibility tests, SDK
  compatibility tests and Changesets.
- Verification passed:
  - `jq empty apps/docs/navigation.json && jq empty apps/docs/navigation.schema.json`
  - MDX content-root validation for frontmatter, balanced fences, local links
    and navigation sources
  - documentation review audit scans for banned language and stale SDK/API
    names
  - `rg -n "facts|rules|calculators|tax years|source citations|golden tests|type tests|API compatibility tests|SDK compatibility tests|Changesets" apps/docs/content/contributing`
  - `bun run verification`
  - `bun run changeset status --verbose`
- Changeset rationale: no new Changeset was required because this slice only
  changes public MDX content, docs navigation and the active execution plan. It
  does not change package exports, package README behaviour or runtime
  behaviour.
- Final call graph still matches the spec. Contributor learning still routes
  from Contributing / What are you changing? into fact, rule, calculator,
  tax-year and incorrect-result guides, then into PR evidence. Public HTTP and
  SDK docs still route calculation behaviour through `@whattax/sdk/effect`
  `calculateRunRequest`, `PublicCalculatorService.calculate` and
  `CalculationEngine` rather than putting tax logic in transport or SDK
  adapters.

### 2026-06-01 - DOCS-MDX-005 implementation

- Read the public MDX developer docs spec, `DOCS-MDX-005`, API/SDK, content,
  facts, calculators and testing architecture docs and the documentation
  standards suite.
- Loaded the reference, section-index, guide and changelog/release-note
  templates.
- Loaded the SDK evaluator, application integrator, API consumer and
  type-safety focused developer journeys.
- Added Reference pages for SDK, schemas, errors, API, examples, changelog,
  versioning and release notes.
- Added example files covering:
  - Node/server SDK route usage
  - browser HTTP `fetch` usage
  - Effect `calculateRunRequest` construction
  - `WhatTax.safe.calculate` error handling
- Added `apps/docs/scripts/validate-content.mjs` for MDX content-root
  validation of frontmatter, balanced fences, navigation sources, local links,
  banned marketing language, stale public names and private downstream product
  terms.
- Added `apps/docs/tsconfig.examples.json` so example files can type-check
  against current package source exports while `apps/docs` remains a content
  root without a package manifest.
- Updated `apps/docs/navigation.json` so final Reference child pages are part
  of the navigation contract.
- Updated the spec Reference section with the accepted final placement of
  Examples under Reference because the current navigation contract does not
  yet support separate Resources anchors.
- Docs app typecheck/build remains unavailable because `apps/docs` still has
  no package manifest or docs framework runtime. Example type-checking is
  covered by `apps/docs/tsconfig.examples.json`.
- Validation passed:
  - `bun run build`
  - `bun run verification`
  - `node apps/docs/scripts/validate-content.mjs`
  - `bunx tsc -p apps/docs/tsconfig.examples.json --noEmit`
  - `jq empty apps/docs/navigation.json && jq empty apps/docs/navigation.schema.json`
  - `git diff --check`
  - `test ! -f apps/docs/package.json && echo 'apps/docs has no package manifest or docs runtime package'`
  - SDK example smoke checks:
    - `bun --tsconfig-override apps/docs/tsconfig.examples.json apps/docs/examples/node-server.ts`
    - `bun --tsconfig-override apps/docs/tsconfig.examples.json apps/docs/examples/effect.ts`
    - `bun --tsconfig-override apps/docs/tsconfig.examples.json apps/docs/examples/error-handling.ts`
  - API example smoke check:
    - `bun run --filter=api --elide-lines=0 start`
    - `bun --tsconfig-override apps/docs/tsconfig.examples.json apps/docs/examples/browser-http.ts`
  - OpenAPI/reference generation smoke check:
    - `curl -fsS http://127.0.0.1:4000/api/docs/openapi.json` confirmed
      title `WhatTax API` and 10 paths including the calculate route.
  - Documentation standards audit scans:
    - banned marketing language: no matches in `apps/docs/content` or
      `apps/docs/examples`
    - stale public names: no matches for `calculateRequest`,
      `createEffectClient`, `PublicCalculationMetadata*` or
      `PublicErrorEnvelope`
    - private downstream product terms: no matches for `adad`, `SaaS`,
      `paid`, `simulation`, `AI`, `private downstream` or `private product`
    - current public names verified across Reference docs and examples:
      `WhatTax.calculate`, `WhatTax.safe.calculate`, `au.incomeTax.annual`,
      `calculateRunRequest`, `calculateReportRequest`, `calculateReport`,
      `CalculatorRunRequest`, `CalculatorRunResponse` and
      `CalculatorServiceError`
  - `bun run changeset status --verbose`
- Changeset rationale: no new Changeset was required because this slice only
  changes public MDX content, docs examples, validation config, navigation,
  the accepted docs spec structure and this active execution plan. It does not
  change package exports, package README behaviour, package metadata or
  runtime behaviour.
- Final call graph still matches the spec. Public docs requests route through
  `apps/docs/navigation.json` into MDX pages and examples. HTTP calculate
  documentation still routes through `CalculatorApiHandlerLive` to
  `@whattax/sdk/effect` `calculateRunRequest`,
  `PublicCalculatorService.calculate` and `CalculationEngine`, with
  `CalculatorApiErrorEnvelope` for expected service errors.

### 2026-06-01 - DOCS-MDX-005 parent acceptance

- Parent reviewed the committed Reference, examples and validation slice in
  `c2a231e Add reference docs and examples`.
- Confirmed the changed file scope is limited to Reference MDX pages, docs
  example files, docs validation config/scripts, navigation, accepted spec
  structure notes and this execution plan.
- Verified `apps/docs/navigation.json` and
  `apps/docs/navigation.schema.json` parse successfully with `jq empty`.
- Ran `node apps/docs/scripts/validate-content.mjs`; it validated 61 MDX files,
  61 navigation entries and local links.
- Ran `bunx tsc -p apps/docs/tsconfig.examples.json --noEmit`; example files
  type-check against current package source exports.
- Audited public docs and examples for stale public names, banned marketing
  language and private downstream product terms; no matches were found.
- Ran `bun run build` and `bun run verification`; both passed.
- Ran SDK example smokes for the Node/server, Effect and safe error-handling
  examples; each exited 0 with expected output. Bun printed its known
  `--tsconfig-override` internal diagnostic after successful execution.
- Ran the browser HTTP example against a local API app; it exited 0 and
  returned calculator JSON. The API server was stopped after the smoke check.
- Ran the OpenAPI smoke against `GET /api/docs/openapi.json`; it returned
  `WhatTax API` with 10 paths including
  `/api/v1/calculators/{calculatorId}/calculate`.
- Ran `bun run changeset status --verbose`; existing pending package
  Changesets are unchanged.
- No new Changeset was required because the final slice changes public docs
  content, examples, validation config, navigation, accepted spec notes and
  execution-plan evidence only. It does not change package exports, package
  README behaviour, package metadata or runtime behaviour.
- Accepted `DOCS-MDX-005` for the parent gate and completed the public MDX
  developer documentation implementation.
