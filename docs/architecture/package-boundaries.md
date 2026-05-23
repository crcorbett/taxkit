---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: high
---

# Package Boundaries

WhatTax should grow as a package-oriented monorepo for the open-source tax
engine, docs, API server and TypeScript SDK. Package dependencies must point
from foundational packages toward rule packages, API packages and apps. Engine
packages must stay deterministic and reusable.

This page is a target architecture, not a list of implemented packages.

## Current Package State

Implemented packages and apps:

- `apps/web`
- `packages/http-api`
- `packages/tsconfig`

Planned ownership directories with README guidance but no package manifest or
runtime source yet:

- `packages/core`
- `packages/scripts`
- `packages/ui`

The proposed package map below should guide new work, but callers should not
import from planned packages until the corresponding package exists with
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

  api/
    http/

  sdk/
    typescript/

  docs/
    fumadocs/

  cli/
```

Current packages such as `@whattax/http-api` and the TanStack Start app sit
outside the calculation engine. As the repo matures, the app layer should
settle into a public Fumadocs documentation site and reusable API server. They
will expose and consume engine capabilities once those capabilities exist, but
the deterministic engine must not import from them.

## Dependency Direction

```txt
packages/core/**
  <- packages/domain/**
  <- packages/rules/**
  <- packages/api/** / packages/sdk/** / packages/cli/** / apps/**
```

WhatTax packages must not depend on application-layer code. React is allowed only inside app/docs packages that explicitly need it.

## Package Responsibilities

Planned `@whattax/core-*` packages will own:

- branded primitives such as money, dates, percentages and ids
- fact descriptor helpers
- rule descriptor helpers
- graph metadata types
- trace and ledger types
- common tagged errors
- Effect `Context.Tag` / `Layer` helpers

Planned `@whattax/domain-au-*` packages will own:

- Australian income years, FBT years and local date helpers
- pay periods and date dimensions
- Australian tax-domain facts that are not specific to one rule pack

Planned `@whattax/rules-au-pay` will own:

- gross pay, taxable pay, net pay and pay event facts
- pay-period conversions
- salary sacrifice effects where they affect pay calculations
- payslip reconciliation target facts, but not payslip parsing

Planned `@whattax/rules-au-payg` will own:

- ATO withholding schedule schemas
- PAYG withholding algorithms
- PAYG parameter table services
- PAYG withholding traces and golden tests

Planned `@whattax/rules-au-stsl`, `@whattax/rules-au-super`,
`@whattax/rules-au-income-tax`, `@whattax/rules-au-medicare`,
`@whattax/rules-au-fbt`, `@whattax/rules-au-mortgage` and
`@whattax/rules-au-deductions` will own their corresponding facts,
algorithms, parameter tables and official rule packs.

Planned `@whattax/api-http` will own:

- Effect HTTP API groups for public calculation endpoints
- server handlers that compose engine rule packs and calculators
- OpenAPI generation
- API boundary schemas

`whattax` or `@whattax/sdk` owns:

- direct in-process calculation facade
- plain TypeScript `WhatTax.create(...)` client factory and `WhatTax.{method}` generic helpers
- Effect-native `whattax/effect` entrypoint
- jurisdiction-specific opt-in subpaths such as `whattax/au`
- Layer-backed typed modules that preserve compile-time calculation, fact, rule and period capabilities
- typed declarations, provider Layers and bindings shared by plain and Effect entrypoints
- typed client functions for the public API where needed
- browser-safe types and schemas
- SDK examples and compatibility tests

Planned `@whattax/docs-fumadocs` will own:

- public documentation site content and configuration
- rule-pack reference documentation
- API and SDK guides
- contributor architecture documentation

## Directory Naming

Directory paths should group packages by purpose first. Package names may use the same purpose prefix.

Examples:

```txt
packages/rules/au/payg       -> @whattax/rules-au-payg
packages/rules/au/super      -> @whattax/rules-au-super
packages/domain/au/dates     -> @whattax/domain-au-dates
packages/api/http            -> @whattax/api-http
packages/sdk/typescript      -> whattax or @whattax/sdk
packages/docs/fumadocs       -> @whattax/docs-fumadocs
```

Avoid flat package sprawl such as `packages/au-payg`, `packages/au-super` and `packages/http-api` once the engine packages start growing.

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
