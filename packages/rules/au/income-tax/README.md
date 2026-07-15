---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# Australian Income Tax Rules

Implemented rule package for Australian annual income-tax calculations.

## Scope

`@taxkit/rules-au-income-tax` owns annual taxable income facts, income tax,
LITO, Medicare levy, annual tax ledger aggregation, official parameter tables,
descriptors, rule pack, calculator program and golden tests.

## Guardrails

- Reuse canonical schemas, facts, parameter services, rule IDs and component
  IDs from this package and `@taxkit/core`.
- Use Effect `Layer`s for rule derivations and parameter services.
- Use Effect `Array`, `HashMap`, `HashSet`, `Match`, `Context`, `Layer`,
  `Schema`, `Data`, `Record`, `Result` and `Exit` where they fit.
- Do not mirror canonical IDs or fact shapes as local `string` or DTO fields.
- Keep official parameter tables separate from algorithms.

## Commands

```sh
bun run --filter=@taxkit/rules-au-income-tax check-types
bun run --filter=@taxkit/rules-au-income-tax test
```

## Packaging

The build removes `dist` before compiling. Workspace exports retain `source`
conditions, while `publishConfig.exports` and `files` define a dist-only
tarball validated by the SDK-owned strict downstream gate.

## Related Docs

- `docs/architecture/rules-and-parameters.md`
- `docs/architecture/calculators.md`
- `docs/standards/code-patterns.md`
