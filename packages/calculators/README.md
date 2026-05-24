---
status: canonical
last_reviewed: 2026-05-24
source_of_truth: package-readme
confidence: medium
---

# Calculators

Reusable public calculator orchestration package.

## Scope

`packages/calculators` owns the package boundary for reusable calculator
catalog, metadata, graph, calculation and expected-error behavior used by HTTP,
SDK, CLI and direct in-process callers.

The package currently owns reusable calculator schemas, catalog entries and
metadata projections, the `PublicCalculatorService` contract, production live
layer, calculator graph construction, calculation dispatch and schema-guided
expected error shaping. HTTP handlers own transport wiring only.

## Ownership

This package owns:

- calculator catalog composition schemas and entries
- metadata projections for calculator, fact, rule and graph discovery
- calculator service tags and layers
- schema-guided expected error shaping for calculation inputs
- composition of canonical scenario layers, rule-pack layers and
  `CalculationEngine`

This package must not own:

- HTTP endpoints, OpenAPI annotations or HTTP status mapping
- Bun serving, app runtime lifecycle or process config
- SDK client transport or CLI command parsing
- imports from `@whattax/http-api`, `apps/api`, `apps/web` or runtime modules

## Guardrails

- Reuse canonical schemas, descriptors, service tags, tagged errors and
  constructors from owning packages.
- Compose rule-owned calculator ids, jurisdictions and tax years. Do not
  redeclare supported calculator context literals in this package.
- Use Effect-native primitives where they fit: `Schema`, `Option`, `Match`,
  `Array`, `Chunk`, `HashMap`, `HashSet`, `Context`, `Layer`, `Result` and
  `Exit`.
- Keep schema and tagged value shapes in owning schema modules.
- Keep expected domain failures in the typed error channel. Use `Effect.die`
  only for defects outside the service contract.
- Use schema-owned optional fields instead of conditional response-shaping
  object spreads.
- Keep runtime execution outside this package. Calculator code returns Effect
  programs and layers; apps own `BunRuntime.runMain` and `ManagedRuntime`
  lifecycle.
- Keep service contracts separate from layer wiring. Do not export `Live`,
  `Mock` or `Test` layers from service contract files.

## Commands

```sh
bun run --filter=@whattax/calculators check-types
bun run --filter=@whattax/calculators build
```

## Public Exports

- `@whattax/calculators`
- `@whattax/calculators/catalog`
- `@whattax/calculators/errors`
- `@whattax/calculators/live`
- `@whattax/calculators/metadata`
- `@whattax/calculators/service`
- `@whattax/calculators/schemas`

## Related Docs

- `docs/architecture/package-ownership.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/api-and-sdk.md`
