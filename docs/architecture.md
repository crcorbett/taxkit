# TaxKit documentation atlas

This atlas is the fastest path through the TaxKit docs.

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

## Implementation specs

- [TypeScript SDK and publishing](./product-specs/typescript-sdk-and-publishing.md):
  public SDK facade, plain TypeScript export, Effect export, HTTP handler usage
  and release-prep boundary.
- [SDK public naming and export contract](./product-specs/sdk-public-naming-and-export-contract.md):
  current public SDK names, calculator run contracts and package export
  boundaries.

## Productionization records

- [Core calculation productionization](./productionization-core-calculations.md):
  original spike-to-production checklist and change record.
- [Core hardening productionization](./productionization-core-hardening.md):
  typed descriptors, date intervals, source artifacts, BigDecimal arithmetic,
  engine service, and test hygiene follow-up checklist.

## Engineering standards

- [Code patterns](./standards/code-patterns.md): Effect collections, Schema,
  Layers, descriptors, explicit exports, and Match exhaustiveness.
- [Docstring conventions](./standards/docstrings.md): public API JSDoc rules
  that follow Ultracite's lint contract.
- [Formatting, linting, and dependency hygiene](./standards/tooling.md): Bun,
  Ultracite, Oxfmt, Oxlint, Knip, and the cataloged TypeScript/ES2025 baseline.
- [Versioning and Changesets](./standards/versioning.md): fixed release-train
  package versioning and changelog workflow.
- [Productionization audit](./standards/productionization-audit.md): completed
  hardening work and remaining structural follow-ups.
