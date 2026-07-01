# @whattax/api-http

## 0.0.2

### Patch Changes

- 765ea46: Migrate SDK and HTTP API calculator execution contracts to the canonical `CalculatorRun*` and `CalculatorServiceError` names.
- 984ced5: Add Effect Vitest coverage for public calculator service scenarios and
  in-process HTTP API calculator execution/error handling. The public calculate
  contract now exposes a canonical facts union while the calculator service
  validates facts again against the selected catalog entry schema.
- 0bb699b: Add the initial calculators workspace package shell with explicit exports,
  package docs and build/typecheck wiring for the upcoming reusable calculator
  service extraction. Move reusable public calculator schemas, catalog entries
  and metadata projection helpers from `@whattax/http-api` into
  `@whattax/calculators`, leaving HTTP route definitions and handler behavior
  compatible.
- d1d84c3: Add canonical `CalculatorId` and `Jurisdiction` brands, move AU public
  calculator IDs and supported jurisdiction/tax-year schemas into the owning AU
  rule packages, then compose those canonical exports in `@whattax/calculators`.
  The calculator service no longer mirrors request context or revalidates context
  fields already narrowed by schemas. Public calculator input decode errors now
  use calculator-specific names.
- 24911a5: Rename calculator API and SDK Effect report helpers to clearer public names,
  and add an SDK Effect full-run helper that returns typed calculator run
  responses. The HTTP calculate route now delegates full-run execution through
  that SDK helper.
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

- d95715b: Move public calculator execution, graph validation and schema-guided expected
  error shaping into the reusable `@whattax/calculators` service. HTTP handlers
  now delegate to `PublicCalculatorService`, and the HTTP route layer composes
  the calculator service with the core calculation engine once instead of inside
  requests.
- 59fc66a: Move the public calculation HTTP API handler to consume the SDK Effect facade and extend SDK import-boundary checks to prove the HTTP API depends on the SDK, not the reverse.
- 8bd7c21: Document the final calculator run naming contract, HTTP-owned transport names, and dist-only SDK export map.
- Updated dependencies [765ea46]
- Updated dependencies [984ced5]
- Updated dependencies [0bb699b]
- Updated dependencies [d1d84c3]
- Updated dependencies [24911a5]
- Updated dependencies [08ab855]
- Updated dependencies [793ad00]
- Updated dependencies [d95715b]
- Updated dependencies [7a8f5e9]
- Updated dependencies [f4bf6e6]
- Updated dependencies [59fc66a]
- Updated dependencies [0b4fe92]
- Updated dependencies [8bd7c21]
- Updated dependencies [877adc1]
- Updated dependencies [c3e6497]
  - @whattax/sdk@0.0.2
  - @whattax/calculators@0.0.2
  - @whattax/core@0.0.2

## 0.0.1

### Patch Changes

- bba9102: Harden the calculation engine with typed rule descriptor builders, date-level
  parameter effective periods, source artifact metadata, Effect BigDecimal-backed
  tax rates and coefficients, a reusable CalculationEngine service, and fixed
  release-train versioning.
