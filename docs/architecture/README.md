# WhatTax Architecture

This directory is the implementation reference for the WhatTax tax calculator architecture.

WhatTax is the open-source engine repository. It owns Australian tax domain types, facts, primitives, rule packs, calculation programs, graph metadata, traces, a Fumadocs documentation site, a reusable API app server and a TypeScript SDK.

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

The engine is deterministic. Given the same accepted facts, rule layers, parameter layers, dates and policies, it must produce the same output and trace.

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
- [Facts](./facts.md)
- [Rules and parameters](./rules-and-parameters.md)
- [Calculators](./calculators.md)
- [Graph, trace and ledgers](./graph-trace-ledgers.md)
- [API and SDK](./api-and-sdk.md)
- [Testing and validation](./testing-and-validation.md)
- [Engineering standards](../standards/README.md)

## Immediate Implementation Bias

1. Use Effect `Layer`s as the rule composition mechanism.
2. Use Effect Schema for every boundary value and persisted value.
3. Keep engine input facts separate from application state.
4. Keep yearly parameters separate from algorithms.
5. Make traces and graph validation part of the first implementation, not a later add-on.
6. Keep WhatTax engine packages independent of application packages.
