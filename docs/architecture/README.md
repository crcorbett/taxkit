---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: high
---

# WhatTax Architecture

This directory is the implementation reference for the planned WhatTax tax
calculator architecture. It is also the routing guide for the small surface
that exists today.

WhatTax is the open-source engine repository. Today it contains a TanStack
Start web scaffold, the `@whattax/http-api` health endpoint package, shared
TypeScript config, documentation, and planned ownership directories. It does
not yet contain the deterministic engine packages, rule packs, calculation
programs, public API app, Fumadocs site, or TypeScript SDK described by these
architecture docs.

## Current Implementation

Implemented surfaces:

- `apps/web`: TanStack Start scaffold that loads the health endpoint.
- `packages/http-api`: Effect HTTP API package for the current health route,
  docs page and OpenAPI JSON.
- `packages/tsconfig`: shared TypeScript configuration presets.
- `docs/**`: architecture, product specs, execution plans, references and
documentation audits.

Planned ownership directories such as `packages/core`, `packages/scripts` and
`packages/ui` currently contain README guidance only. They are not runtime
packages until a package manifest, source exports and verification are added.

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

## Immediate Implementation Bias

1. Use Effect `Layer`s as the rule composition mechanism.
2. Use Effect Schema for every boundary value and persisted value.
3. Keep engine input facts separate from application state.
4. Keep yearly parameters separate from algorithms.
5. Make traces and graph validation part of the first implementation, not a later add-on.
6. Keep WhatTax engine packages independent of application packages.
