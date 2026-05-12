# WhatTax Documentation Atlas

This atlas is the fastest path through the WhatTax docs.

## Architecture

- [Architecture overview](./architecture/README.md): engine model, authority
  boundary, and implementation bias.
- [Package boundaries](./architecture/package-boundaries.md): package
  ownership and import direction.
- [Facts](./architecture/facts.md): input facts, derived facts, question
  metadata, and fact descriptors.
- [Rules and parameters](./architecture/rules-and-parameters.md): Layer-based
  rule composition, parameter descriptors, source references, and effective
  periods.
- [Calculators](./architecture/calculators.md): scenario decoding and
  calculator programs.
- [Graph, trace and ledgers](./architecture/graph-trace-ledgers.md): graph
  validation, audit traces, and ledger components.
- [API and SDK](./architecture/api-and-sdk.md): reusable HTTP and client
  boundary.
- [Testing and validation](./architecture/testing-and-validation.md): current
  validation approach and expected quality gates.
- [Core calculation productionization](./productionization-core-calculations.md):
  original spike-to-production checklist and change record.
- [Core hardening productionization](./productionization-core-hardening.md):
  typed descriptors, date intervals, source artifacts, BigDecimal arithmetic,
  engine service, and test hygiene follow-up checklist.

## Engineering Standards

- [Code patterns](./standards/code-patterns.md): Effect collections, Schema,
  Layers, descriptors, explicit exports, and Match exhaustiveness.
- [Docstring conventions](./standards/docstrings.md): public API JSDoc rules
  that follow Ultracite's lint contract.
- [Formatting, linting, and dependency hygiene](./standards/tooling.md): Bun,
  Ultracite, Oxfmt, Oxlint, Knip, and TypeScript 6.
- [Productionization audit](./standards/productionization-audit.md): completed
  hardening work and remaining structural follow-ups.
