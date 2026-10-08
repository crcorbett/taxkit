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
`rules-au-income-tax/1.0.1`. It versions this package's ruleset independently
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
- Income-tax and LITO rows check non-negative amounts, local rates from zero to
  one and ordered bounds. Their tables begin at a zero threshold, retain
  adjacent brackets and require a final open bound. Medicare checks threshold
  order and positive levy/shade-in rates; it does not impose guessed exact
  continuity. The 2025–26 thresholds are $28,011 and $35,013 from Act No. 58 of 2026, Schedule 5. Construction and saved-data
  checks enforce the same relationships.
- Derived money and ledger totals use core fallible constructors and return
  safe `CalculationError` failures for unsupported amounts. Exact decimal
  arithmetic and unaffected results stay unchanged. The [accepted Medicare correction](../../../../docs/product-specs/medicare-2025-26-correction.md) owns the changed source, affected results and proof. This table covers a single person not entitled to SAPTO; family reductions, exemptions and surcharge are not modelled.

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


Trace formula and rounding values now use Core's nested Option contract. Use
the owning trace codec for transport or saved snapshots, and `Option.flatten`
to read content when missing and undefined mean the same thing. Descriptor
questions/source artifacts use Option and rule parameters are total arrays.
See the [Core owner](../../../core/README.md). Existing formulas and unrelated source records stay unchanged. Annual Medicare amounts and source snapshots follow the accepted correction above.
