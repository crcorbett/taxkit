---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: docs
confidence: high
---

# WhatTax architecture

This directory is the implementation reference for the WhatTax tax calculator
architecture. It is also the routing guide for the implemented surface that
exists today.

WhatTax is the open-source engine repository. Today it contains a standalone
Bun API app, a TanStack Start web scaffold, a Fumadocs-backed docs app, the
`@whattax/api-http` package with health, generated docs, metadata and public
calculation endpoints, the `@whattax/calculators` service package,
deterministic core engine primitives, Australian pay, income-tax and STSL rule
packages, a private TypeScript SDK package, private `@whattax/docs-content`
and `@whattax/docs-fumadocs` packages, shared testing helpers, shared
TypeScript config, private Effect-native release orchestration and
documentation.

## Current implementation

Implemented surfaces:

- `apps/api`: standalone Bun API runtime for the current API surface.
- `apps/docs`: TanStack Start public docs runtime over MDX content,
  `@whattax/docs-content` and `@whattax/docs-fumadocs`.
- `apps/web`: TanStack Start scaffold that loads the health endpoint.
- `packages/api/http`: Effect HTTP API package for health, generated docs,
  OpenAPI JSON, public calculator metadata and public calculation routes.
- `packages/calculators`: reusable calculator catalog, metadata, graph,
  calculation and expected-error orchestration package.
- `packages/sdk/typescript`: private TypeScript SDK package with browser-safe,
  Effect-native, schema, testing and AU entrypoints.
- `packages/docs-content`: private source-only docs contracts, generated
  Fumadocs source access, navigation validation and docs content service.
- `packages/docs-fumadocs`: private reusable Fumadocs configuration, source
  adapter and render primitive package.
- `packages/core`: deterministic primitives, fact/rule/parameter descriptors,
  graph validation, trace and ledger contracts and calculation engine service.
- `packages/rules/au/pay`: Australian take-home pay and PAYG withholding rule
  pack.
- `packages/rules/au/income-tax`: Australian annual income-tax rule pack.
- `packages/rules/au/stsl`: Australian STSL withholding rule pack.
- `packages/testing`: shared test helpers for workspace packages.
- `packages/scripts`: Effect-native release-readiness command orchestration
  over canonical root and package-owned validators.
- `packages/tsconfig`: shared TypeScript configuration presets.
- `docs/**`: architecture, product specs, execution plans, standards,
  references and documentation audits.

`packages/ui` remains a planned ownership directory with README guidance only.
It is not a runtime package until a package manifest, source exports and
verification are added.

## Core model

```txt
Schema-branded domain values
  -> Schema.TaggedClass / Data.TaggedClass facts
  -> Context.Tag fact and service providers
  -> Layer.effect rule derivations
  -> Layer-composed rule packs
  -> typed calculator programs
  -> trace, ledger, graph and report output
```

The planned engine is deterministic. Given the same accepted facts, rule
layers, parameter layers, dates and policies, it must produce the same output
and trace.

## Authority boundary

Official calculations consume explicit input facts. Callers convert their application state into WhatTax-compatible input facts before invoking the engine.

```txt
explicit WhatTax input facts
  -> WhatTax rule layers
  -> WhatTax calculators
  -> reports, graph metadata and traces
```

## Documents

- [Architecture atlas](../architecture.md)
- [Package boundaries](./package-boundaries.md)
- [Package ownership](./package-ownership.md)
- [Effect services](./effect-services.md)
- [Configuration](./configuration.md)
- [Facts](./facts.md)
- [Rules and parameters](./rules-and-parameters.md)
- [Calculators](./calculators.md)
- [Graph, trace and ledgers](./graph-trace-ledgers.md)
- [API and SDK](./api-and-sdk.md)
- [Frontend](./frontend.md)
- [Content and posts](./content-and-posts.md)
- [Deployment](./deployment.md)
- [Testing and quality](./testing-and-quality.md)
- [Testing and validation](./testing-and-validation.md)
- [Engineering standards](../standards/README.md)

## Immediate implementation bias

1. Use Effect `Layer`s as the rule composition mechanism.
2. Use Effect Schema for every boundary value and persisted value.
3. Use Effect-native primitives and platform APIs when they fit: `Data`,
   `Schema`, `Array`, `Chunk`, `HashSet`, `HashMap`, `Match`, `Context`,
   `Layer`, `Config`, `Service`, `Record`, `Result`, `Exit`, `Bun`,
   `Platform`, `Command` and `ManagedRuntime`.
4. Reuse canonical schemas, schema-derived types, branded ids, service tags,
   tagged errors and constructors from the owning package. Never mirror
   canonical fields such as `id: string` outside the owning schema/type source.
5. Keep engine input facts separate from application state.
6. Keep yearly parameters separate from algorithms.
7. Make traces and graph validation part of the first implementation, not a later add-on.
8. Keep WhatTax engine packages independent of application packages.
