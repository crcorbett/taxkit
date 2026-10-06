---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-au-income-tax-owner
last_reviewed: 2026-10-06
review_trigger: schemas, exports, calculator contract or runtime ownership change
---

# Australian Income Tax Rules

Implemented rule package for Australian annual income-tax calculations.

## Scope

`@taxkit/rules-au-income-tax` owns annual taxable income facts, income tax,
LITO, Medicare levy, annual tax ledger aggregation, official parameter tables,
descriptors, rule pack, calculator program and golden tests.

`AnnualTaxReport.rulePackVersion` is the exact literal
`rules-au-income-tax/1.0.0`. It versions this package's ruleset independently
from the package manifest version so callers can identify the tax rules used
without runtime manifest reads.

## Guardrails

- Reuse canonical schemas, facts, parameter services, rule IDs and component
  IDs from this package and `@taxkit/core`.
- Use Effect `Layer`s for rule derivations and parameter services.
- Use Effect `Array`, `HashMap`, `HashSet`, `Match`, `Context`, `Layer`,
  `Schema`, `Data`, `Record`, `Result` and `Exit` where they fit.
- Do not mirror canonical IDs or fact shapes as local `string` or DTO fields.
- Keep official parameter tables separate from algorithms.
- Derived money and ledger totals use core fallible constructors and return
  safe `CalculationError` failures for unsupported amounts. Exact decimal
  arithmetic, retained source records and known tax results stay unchanged.
  The active clean-slate plan owns the unresolved Medicare correction decision;
  this constructor change does not correct those retained thresholds.

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

## Browser Schema entrypoints

Use `@taxkit/rules-au-income-tax/schemas` for canonical calculator metadata, `AnnualTaxReport` and `AnnualTaxScenarioInputSchema` without live calculator or rule-pack imports. Existing root/calculator exports retain the same definitions and calculation behaviour.

The [transport architecture](../../../../docs/architecture/api-and-sdk.md) and active clean-slate plan own application use and proof limits.
