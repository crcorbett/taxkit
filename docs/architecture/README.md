---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: high
---

# WhatTax Architecture

This directory is the implementation reference for the WhatTax tax calculator
architecture. It is also the routing guide for the implemented surface that
exists today.

WhatTax is the open-source engine repository. Today it contains a standalone
Bun API app, a TanStack Start web scaffold, the `@whattax/http-api` health
endpoint package, deterministic core engine primitives, Australian pay,
income-tax and STSL rule packages, shared testing helpers, shared TypeScript
config and documentation. Public calculation HTTP endpoints, the Fumadocs site
and TypeScript SDK remain planned.

## Current Implementation

Implemented surfaces:

- `apps/web`: TanStack Start scaffold that loads the health endpoint.
- `apps/api`: standalone Bun API runtime for the current API surface.
- `packages/http-api`: Effect HTTP API package for the current health route,
  docs page and OpenAPI JSON.
- `packages/core`: deterministic primitives, fact/rule/parameter descriptors,
  graph validation, trace and ledger contracts and calculation engine service.
- `packages/rules/au/pay`: Australian take-home pay and PAYG withholding rule
  pack.
- `packages/rules/au/income-tax`: Australian annual income-tax rule pack.
- `packages/rules/au/stsl`: Australian STSL withholding rule pack.
- `packages/testing`: shared test helpers for workspace packages.
- `packages/tsconfig`: shared TypeScript configuration presets.
- `docs/**`: architecture, product specs, execution plans, references and
documentation audits.

Planned ownership directories such as `packages/scripts` and `packages/ui`
currently contain README guidance only. They are not runtime packages until a
package manifest, source exports and verification are added.

## Core Model

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

## Authority Boundary

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

## Immediate Implementation Bias

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
