# @whattax/rules-au-income-tax

## 0.0.2

### Patch Changes

- d1d84c3: Add canonical `CalculatorId` and `Jurisdiction` brands, move AU public
  calculator IDs and supported jurisdiction/tax-year schemas into the owning AU
  rule packages, then compose those canonical exports in `@whattax/calculators`.
  The calculator service no longer mirrors request context or revalidates context
  fields already narrowed by schemas. Public calculator input decode errors now
  use calculator-specific names.
- b632995: Document and align the jurisdiction-neutral public calculation API route design
  around calculator, fact and rule discovery, schema-guided validation errors,
  and `help` parameters for richer client guidance.

  Add the initial public calculation API schema foundation, including
  schema-backed calculator IDs, context and help-mode contracts, public error
  envelopes and the initial AU calculator catalog. Add a canonical PAYG-only
  withholding rule-pack layer for the withholding catalog entry.

  Expose public metadata routes for jurisdictions, tax years, calculator
  discovery, calculator schema metadata, graph diagnostics, canonical fact
  descriptors and canonical rule descriptors. Calculation execution remains
  deferred.

  Expose `POST /api/v1/calculators/:calculatorId/calculate` for the initial AU
  calculator catalog. Calculation requests decode canonical scenario facts, use
  catalog-selected rule-pack layers and run through `CalculationEngine`; schema
  decode failures return machine-readable issue paths plus descriptor-backed help
  when requested.

  Document the follow-up extraction of reusable calculator orchestration into a
  new `@whattax/calculators` package so HTTP handlers can become thin transport
  adapters over package-owned Effect services.

- Updated dependencies [d1d84c3]
  - @whattax/core@0.0.2

## 0.0.1

### Patch Changes

- bba9102: Harden the calculation engine with typed rule descriptor builders, date-level
  parameter effective periods, source artifact metadata, Effect BigDecimal-backed
  tax rates and coefficients, a reusable CalculationEngine service, and fixed
  release-train versioning.
- Updated dependencies [bba9102]
  - @whattax/core@0.0.1
