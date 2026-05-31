---
status: draft
last_reviewed: 2026-05-31
source_of_truth: docs
confidence: medium
---

# Public MDX Developer Documentation

## Overview

WhatTax needs public developer documentation for engineers who consume the
TypeScript SDK, call the HTTP API, or contribute new facts, rules,
calculators and tax-year support. The documentation should be authored in MDX
so code examples, generated API reference, callouts, interactive examples and
future docs-app components can live beside narrative content.

The docs should adopt the useful patterns from Stripe, Vercel and Mintlify:

- task-first quickstarts before reference material
- SDK and API guides separated from generated reference
- strong testing, error-handling and versioning guidance
- clear navigation groups with one primary information architecture
- docs-as-code MDX content that is searchable, linkable and usable by humans
  and AI tools
- a first-class contributing section for proposing and validating new tax
  behaviour

All implementation work for this spec must follow the documentation standards
suite:

- [Documentation style](../standards/documentation-style.md)
- [Documentation writing](../standards/documentation-writing.md)
- [Documentation templates](../standards/documentation-templates.md)
- [Documentation review](../standards/documentation-review.md)
- [Documentation architecture](../standards/documentation-architecture.md)
- [Documentation user journeys](../standards/documentation-user-journeys.md)

## Problem

Current repository docs are strong for internal architecture and agent work,
but they are not yet a public developer documentation product. External
developers need a fast path to:

- install the SDK and run a calculation
- choose between the plain SDK, Effect SDK and HTTP API
- understand canonical facts, branded values and schema decode errors
- inspect the API surface and generated OpenAPI reference
- contribute new tax behaviour with the right package ownership, source
  citations, tests and PR evidence

Without a public MDX docs structure, implementation and contribution knowledge
will remain scattered across architecture pages, package READMEs and product
specs.

## Call graphs

```ts
Production: public docs request

developer
  -> docs site navigation
    -> MDX guide / concept / reference page
      -> runnable SDK or HTTP example
      -> linked API reference or schema reference
      -> package README / architecture doc when deeper ownership detail is needed
```

```ts
Production: SDK consumer learning path

developer
  -> Start / Quickstart
    -> Install SDK
    -> Run first calculation with @whattax/sdk/au
    -> Handle result or safe result
    -> Type safety concept page
    -> SDK reference
```

```ts
Production: contributor learning path

developer
  -> Contributing / What are you changing?
    -> Add a fact / rule / calculator / tax year guide
      -> owning package and canonical schema/type/id source
      -> source references and parameter periods
      -> golden tests, type tests and API/SDK compatibility tests
      -> PR evidence checklist
```

```ts
Tests: docs validation

docs implementation
  -> MDX build/typecheck
  -> link/reference audit
  -> code example typecheck or smoke scripts
  -> generated OpenAPI/reference validation
  -> bun run verification
```

## Goals

- Define a public MDX documentation structure for developer consumers of the
  SDK and HTTP API.
- Make the SDK quickstart the primary first-run experience.
- Make contribution workflows explicit enough for external PR authors to add
  facts, rules, calculators and tax-year support without learning internal
  repo history first.
- Keep durable architecture in `docs/architecture/*` and public docs focused
  on developer tasks.
- Preserve current package boundaries: `@whattax/sdk` for developer-facing
  SDK use, `@whattax/http-api` for HTTP transport and `@whattax/calculators`
  for calculator-owned run schemas and service contracts.
- Require examples and docs to use canonical schemas, branded values and
  schema-derived types.
- Include enough navigation and metadata structure for search, AI indexing and
  future docs-site generation.
- Enforce the documentation standards suite in every implementation task,
  including the relevant page template and user journey file.

## Non-goals

- Do not build a marketing site or landing page in this spec.
- Do not publish the SDK or remove `private: true`.
- Do not rename packages.
- Do not move architecture docs into the public docs app.
- Do not document private downstream products or app-specific strategy.
- Do not hand-write generated API reference pages when OpenAPI generation can
  own the endpoint contract.

## Ownership and boundaries

`apps/docs`
: Planned public MDX documentation app. It should own docs routing, MDX
rendering, navigation config, generated reference ingestion and public docs UI.

`docs/public` or `apps/docs/content`
: Candidate home for public MDX content. Implementation should choose the path
that best matches the selected docs framework, but content must remain
docs-as-code and repo-owned.

`docs/architecture`
: Owns durable internal architecture and package boundaries. Public docs may
link here for deep implementation detail but should not duplicate long
architecture manuals.

`packages/sdk/typescript/README.md`
: Owns local SDK package guardrails and command reference. Public SDK docs
should link to this README only for package-local details.

`packages/http-api/README.md`
: Owns local HTTP API package guardrails. Public API docs should consume
OpenAPI output and link here only for package-local details.

`@whattax/calculators`
: Owns canonical `CalculatorRun*` schemas, `CalculatorServiceError`,
calculator catalog entries, metadata transformations and calculation
execution.

## Proposed information architecture

Use one primary root navigation pattern with clear groups:

```txt
Documentation
  Start
  SDK
  API
  Guides
  Concepts
  Contributing
  Reference
```

The implementation must load the template index and the specific template file
for each page type before writing content. It must also load the user-journey
index and the specific journey file for the target reader before writing or
reviewing content.

If the docs framework supports anchors or products, expose:

```txt
Documentation
  Start
  SDK
  Guides
  Concepts
  Contributing

API reference
  OpenAPI
  Endpoints
  Errors

Resources
  Examples
  Changelog
  GitHub
```

### Start

```txt
Start
  Overview
  Quickstart
  Install the SDK
  Run your first calculation
  Choose SDK vs HTTP API
```

The quickstart should let a TypeScript developer calculate something useful in
five minutes. It should use the plain SDK first:

```ts
import { aud } from "@whattax/core/primitives";
import { au } from "@whattax/sdk/au";

const report = await au.incomeTax.annual({
  taxableIncome: aud(90_000_00),
});

console.log(report.liability.cents);
```

The SDK-vs-API page should include a decision table:

| Use | Choose |
| --- | --- |
| server-side TypeScript app | plain SDK |
| Effect app or in-process transport | `@whattax/sdk/effect` |
| browser or non-TypeScript client | HTTP API |
| generated endpoint contract | OpenAPI |
| contribution work | repo packages and contribution guides |

### SDK

```txt
SDK
  TypeScript SDK
  Plain SDK
    WhatTax.calculate
    WhatTax.safe.calculate
    AU helpers
  Effect SDK
    calculateRunRequest
    calculateReportRequest
    calculateReport
    createClient
  Schemas
    CalculatorRunRequest
    CalculatorRunResponse
    CalculatorServiceError
  Type safety
    Branded values
    Canonical facts
    Compile-time calculator inputs
    Runtime schema decoding
```

SDK docs should put ergonomic usage first and advanced Effect APIs second.
`calculateRunRequest` should be documented as the full-run helper for
transports and advanced Effect consumers, not as the default beginner API.

### API

```txt
API
  Overview
  Authentication and deployment assumptions
  Errors
  OpenAPI reference
  Endpoints
    List jurisdictions
    List tax years
    List calculators
    Get calculator
    Get calculator schema
    Calculate
    Get graph
    List facts
    List rules
```

The API overview must explain that HTTP is a thin transport over the SDK and
calculator service:

```ts
Production: HTTP calculate

HTTP caller
  -> @whattax/http-api route contract
    -> CalculatorApiHandlerLive
      -> @whattax/sdk/effect calculateRunRequest
        -> PublicCalculatorService.calculate
          -> CalculationEngine
      -> CalculatorApiErrorEnvelope for expected service errors
```

Endpoint reference should be generated from OpenAPI where possible. Narrative
API pages should focus on auth/deployment assumptions, request examples,
error handling and when to prefer SDK usage.

### Guides

```txt
Guides
  Calculate Australian take-home pay
  Calculate annual income tax
  Handle validation errors
  Show calculator help to users
  Build a server route with the SDK
  Build a browser app with the HTTP API
  Test your integration
  Migrate from raw HTTP to SDK
```

Every guide should include:

- prerequisites
- complete code sample
- expected output
- error handling
- links to SDK/API reference
- validation or test command when relevant

### Concepts

```txt
Concepts
  Calculators
  Facts
  Rules
  Jurisdictions and tax years
  Money and branded values
  Reports
  Diagnostics
  SDK, HTTP API and calculators service boundary
```

Concept pages explain terms and mental models, not implementation tutorials.
They should link to architecture docs only when a developer needs deeper
package ownership detail.

### Contributing

Contributing must be first-class and deeply structured:

```txt
Contributing
  Overview
  What are you changing?
  Contribution workflow
    Propose a change
    Open a rules RFC
    Prepare a pull request
    Review checklist
  Domain model
    Facts
    Rules
    Calculators
    Parameters
    Source references
    Graph metadata
    Reports and ledgers
  Add a fact
  Add a rule
  Add a calculator
  Add a tax year
  Fix an incorrect result
  Testing
    Golden tests
    Type tests
    Schema decode tests
    API compatibility tests
    SDK compatibility tests
  Standards
    Source citation standards
    Naming conventions
    Schema and branded value standards
    Effect service and layer standards
    Backward compatibility
    Changesets and versioning
  Pull requests
    PR template
    Required evidence
    Review expectations
    Release impact
```

The "What are you changing?" page should route contributors by intent:

| I want to... | Start with |
| --- | --- |
| add a new input field | Add a fact |
| update a threshold or rate | Parameters |
| add a calculation step | Add a rule |
| add a user-facing calculation | Add a calculator |
| support a new tax year | Add a tax year |
| fix a wrong result | Fix an incorrect result |

Contribution docs must emphasize:

- facts are canonical boundary values, not arbitrary request fields
- rules must be source-backed and effective-period aware
- calculators compose facts, rules and report schemas
- HTTP and SDK layers must not hide business logic
- PRs need verification evidence, source citations and release-impact notes

### Reference

```txt
Reference
  SDK reference
  Schema reference
  Error reference
  API reference
  Examples
  Changelog
  Versioning
  Release notes
```

Reference pages should be concise and mechanically checkable. Where possible,
generate or derive them from package exports, OpenAPI and schema metadata
instead of maintaining hand-written copies.

The accepted final navigation keeps examples under Reference because the
current `apps/docs/navigation.json` contract has one primary section tree and
does not yet support separate Resources anchors.

## MDX authoring standards

The canonical writing, review, architecture, template and journey rules live
in `docs/standards/*`. This section summarises the public MDX expectations;
the standards suite wins if there is a conflict.

Each MDX page should include frontmatter:

```yaml
title: "Page title"
description: "One concrete sentence describing the page."
```

Public MDX pages should:

- use stable, descriptive URLs
- keep page titles and descriptions unique
- include code examples that compile or are covered by smoke tests when they
  represent public SDK/API usage
- prefer task-focused headings over package-internal headings
- include callouts for beta/private/publish-readiness limitations
- link to related pages with descriptive anchor text
- avoid private downstream product names
- avoid documenting planned package surfaces as implemented

Code examples should use current public names:

- `WhatTax.calculate`
- `WhatTax.safe.calculate`
- `au.incomeTax.annual`
- `@whattax/sdk/effect` `calculateRunRequest`
- `calculateReportRequest`
- `calculateReport`
- `CalculatorRunRequest`
- `CalculatorRunResponse`
- `CalculatorServiceError`
- `CalculatorApiErrorEnvelope` only in HTTP API transport docs

## Tests and verification

Implementation must include:

- docs app typecheck/build once `apps/docs` exists
- MDX syntax validation
- link audit for local docs links
- code example smoke tests for SDK examples
- generated OpenAPI/reference smoke check for API pages
- `bun run verification`
- explicit no-changeset rationale for docs-only content, or a Changeset when
  package README/export/package behaviour changes

The docs implementation should include a downstream or sample-app check when
examples claim browser or app integration behaviour.

## Risks and tradeoffs

- A docs app can become a second architecture manual. Mitigation: keep public
  pages task-first and link to architecture docs for internal ownership.
- Generated API reference and narrative API docs can drift. Mitigation:
  generate endpoint reference from OpenAPI and keep examples covered by smoke
  tests.
- Contribution docs can over-prescribe implementation details. Mitigation:
  document required evidence and ownership boundaries, then link to package
  READMEs for local commands.
- MDX components can make docs harder to maintain. Mitigation: use custom
  components only where they improve examples, API snippets or contribution
  checklists.

## Versioning and changelog impact

Initial docs scaffolding and MDX content are docs-only and do not require a
Changeset unless package READMEs, package exports, package metadata or runtime
behaviour change.

If implementation adds a published docs package or changes SDK/API package
README content in a package-facing way, add a Changeset for the affected
package with a user-facing summary.

## Acceptance Criteria

- A public MDX docs structure exists with Start, SDK, API, Guides, Concepts,
  Contributing and Reference sections.
- The quickstart lets a developer run a real SDK calculation with current
  public names.
- SDK docs distinguish plain, safe and Effect APIs without making Effect the
  beginner path.
- API docs explain HTTP as a thin transport over the SDK/calculators boundary
  and link to/generated OpenAPI reference.
- Contributing docs include concrete workflows for facts, rules, calculators,
  tax years, testing and PR evidence.
- Docs content avoids private downstream product details.
- Docs content passes review against the documentation standards suite,
  including reader journey, page template, style, link/source-of-truth and
  audit checklists.
- MDX build/typecheck/link/code-example verification passes.
- `bun run verification` passes.

## References

- [Content and posts](../architecture/content-and-posts.md)
- [API and SDK](../architecture/api-and-sdk.md)
- [Package ownership](../architecture/package-ownership.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Documentation style](../standards/documentation-style.md)
- [Documentation writing](../standards/documentation-writing.md)
- [Documentation templates](../standards/documentation-templates.md)
- [Documentation review](../standards/documentation-review.md)
- [Documentation architecture](../standards/documentation-architecture.md)
- [Documentation user journeys](../standards/documentation-user-journeys.md)
- Stripe documentation patterns: quickstarts, SDKs, API reference and
  versioning.
- Vercel documentation patterns: outcome-based docs, SDK pages, examples and
  reference separation.
- Mintlify documentation patterns: navigation groups, anchors, OpenAPI
  integration, SEO/search and AI indexing.
