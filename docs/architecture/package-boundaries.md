---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: docs
confidence: high
---

# Package Boundaries

TaxKit should grow as a package-oriented monorepo for the open-source tax
engine, docs, API server and TypeScript SDK. Package dependencies must point
from foundational packages toward rule packages, API packages and apps. Engine
packages must stay deterministic and reusable.

This page is a target architecture, not a list of implemented packages.

## Current Package State

Implemented packages and apps:

- `apps/api`
- `apps/web`
- `packages/calculators`
- `packages/core`
- `packages/api/http`
- `packages/sdk/typescript`
- `packages/rules/au/income-tax`
- `packages/rules/au/pay`
- `packages/rules/au/stsl`
- `packages/scripts`
- `packages/testing`
- `packages/tsconfig`

Planned ownership directory with README guidance but no package manifest or
runtime source yet:

- `packages/ui`

The proposed package map below should guide new work, but callers should not
import from a planned package until the corresponding package exists with
exports and verification.

## Proposed Package Map

```txt
apps/
  docs/
  api/

packages/
  core/
    primitives/
    facts/
    rules/
    graph/
    trace/

  domain/
    au/
      dates/
      pay/
      tax/
      super/
      deductions/
      fbt/
      mortgage/

  rules/
    au/
      pay/
      payg/
      stsl/
      super/
      income-tax/
      medicare/
      deductions/
      fbt/
      mortgage/

  calculators/

  api/
    http/

  sdk/
    typescript/

  docs-content/
  docs-fumadocs/
  scripts/

  cli/
```

Current packages such as `@taxkit/api-http` and the TanStack Start app sit
outside the calculation engine. As the repo matures, the app layer should
settle into a public Fumadocs documentation site and reusable API server. They
will expose and consume engine capabilities once those capabilities exist, but
the deterministic engine must not import from them.

## Dependency Direction

```txt
packages/core/**
  <- packages/domain/**
  <- packages/rules/**
  <- packages/calculators/**
  <- packages/api/** / packages/sdk/** / packages/cli/** / apps/**
```

TaxKit packages must not depend on application-layer code. React is allowed only inside app/docs packages that explicitly need it.

## Package Responsibilities

Implemented `@taxkit/core` owns:

- branded primitives such as money, dates, percentages and ids
- fact descriptor helpers
- rule descriptor helpers
- graph metadata types
- trace and ledger types
- common tagged errors
- Effect `Context.Tag` / `Layer` helpers
- calculation engine orchestration

Planned `@taxkit/domain-au-*` packages will own:

- Australian income years, FBT years and local date helpers
- pay periods and date dimensions
- Australian tax-domain facts that are not specific to one rule pack

Implemented `@taxkit/rules-au-pay` owns:

- gross pay, taxable pay, net pay and pay event facts
- pay-period conversions
- salary sacrifice effects where they affect pay calculations
- payslip reconciliation target facts, but not payslip parsing

Current PAYG withholding behavior is implemented inside
`@taxkit/rules-au-pay`. A later split to `@taxkit/rules-au-payg` should keep
canonical schemas, ids and parameter services with the owning package.

Planned `@taxkit/rules-au-payg` may own:

- ATO withholding schedule schemas
- PAYG withholding algorithms
- PAYG parameter table services
- PAYG withholding traces and golden tests

Implemented `@taxkit/rules-au-stsl` and
`@taxkit/rules-au-income-tax` own their corresponding facts, algorithms,
parameter tables and official rule packs. Planned `@taxkit/rules-au-super`,
`@taxkit/rules-au-medicare`, `@taxkit/rules-au-fbt`,
`@taxkit/rules-au-mortgage` and `@taxkit/rules-au-deductions` will own their
corresponding facts, algorithms, parameter tables and official rule packs.

Implemented `@taxkit/calculators` owns the reusable calculator orchestration
boundary for:

- reusable calculator catalog schemas and entries
- calculator service tags and live layers
- metadata projections for calculator, fact, rule and graph discovery
- schema-guided expected error shaping for calculation inputs
- composition of canonical scenario layers, rule-pack layers and
  `CalculationEngine`
- reusable service methods for HTTP handlers, SDK helpers, CLI commands and
  direct in-process consumers

It must not own OpenAPI annotations, HTTP status mapping, Bun serving, process
config, app runtime lifecycle, SDK client transport or CLI command parsing.

Implemented `@taxkit/scripts` owns cross-package repository command
orchestration. Its release-readiness program invokes canonical root and
package-owned commands through an Effect child-process service. It must not
copy validator logic out of the SDK, API, docs app or other owning packages.

Implemented `@taxkit/api-http` owns:

- Effect HTTP API groups for public calculation endpoints
- thin server handlers that call package-owned API services
- OpenAPI generation
- API boundary schemas

HTTP API packages should not own calculator catalog transformations or
calculation business logic when a reusable API service package exists.

Scaffolded `@taxkit/sdk`, published later as `taxkit` or `@taxkit/sdk`,
owns:

- direct in-process calculation facade
- plain TypeScript `TaxKit.create(...)` client factory and `TaxKit.{method}` generic helpers
- Effect-native `taxkit/effect` entrypoint
- jurisdiction-specific opt-in subpaths such as `taxkit/au`
- Layer-backed typed modules that preserve compile-time calculation, fact, rule and period capabilities
- typed declarations, provider Layers and bindings shared by plain and Effect entrypoints
- typed client functions for the public API where needed
- browser-safe types and schemas
- SDK examples and compatibility tests

Implemented `@taxkit/docs-content` owns:

- TaxKit docs frontmatter, meta, navigation and validation schemas
- navigation and source-text validation policy
- docs content service tags and live layers
- server-only generated Fumadocs source wiring for TaxKit docs content

Implemented `@taxkit/docs-fumadocs` owns:

- reusable Fumadocs configuration helpers
- Effect Schema to Standard Schema bridges
- generic Fumadocs source loader adapters
- generic page-tree conversion helpers
- generic browser-safe MDX render primitives

Docs packages must not own rule-pack algorithms, API endpoint business logic
or SDK calculation facades.

## Directory Naming

Directory paths should group packages by purpose first. Package names may use the same purpose prefix.

Examples:

```txt
packages/rules/au/payg       -> @taxkit/rules-au-payg
packages/rules/au/super      -> @taxkit/rules-au-super
packages/domain/au/dates     -> @taxkit/domain-au-dates
packages/api/http            -> @taxkit/api-http
packages/calculators         -> @taxkit/calculators
packages/sdk/typescript      -> taxkit or @taxkit/sdk
packages/docs-content        -> @taxkit/docs-content
packages/docs-fumadocs       -> @taxkit/docs-fumadocs
```

Avoid flat package sprawl such as `packages/au-payg`, `packages/au-super` and
flat transport package names once the engine packages start growing.
`packages/calculators` is the exception for cross-surface calculator
orchestration because it is intentionally shared by HTTP, SDK, CLI and
in-process callers.

## Export Rules

Each package should expose isolated export paths. Avoid broad root barrels that accidentally mix server-only, client-only, API, SDK or docs code into deterministic calculation bundles.

Recommended shape:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./facts": "./src/facts/index.ts",
    "./rules": "./src/rules/index.ts",
    "./parameters": "./src/parameters/index.ts",
    "./testing": "./src/testing/index.ts"
  }
}
```

Server-only adapters and filesystem code must have explicit server-only export paths and must not be imported by browser-safe packages.

## Out Of Scope For Engine Packages

Engine packages should contain tax-domain primitives, facts, rule packs, calculators, graph metadata, traces, validation fixtures and test helpers. Application-specific packages should stay outside the engine dependency graph.
