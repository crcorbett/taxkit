# @taxkit/rules-au-income-tax

## 2.0.0

### Major Changes

- 7dbd09b: Validate ISO dates as real Gregorian calendar dates, expose exact independent
  Australian ruleset versions in calculation reports, and prevent rejected input
  values or raw Effect causes from appearing in public calculator and SDK errors.
- 48384d5: Adopt the stricter shared Oxlint policy and use precise public contract names.
  Rename vague service `Shape` types to `Contract`, rename
  `SourceExtract.shape` to `rowContract`, keep trace values JSON-safe, and add
  preferred `create*` constructors while retaining deprecated `make*` aliases
  where compatibility is safe.
- facca83: Trace formula/rounding and question help text now use nested Options that retain
  missing, present undefined and present value keys. Descriptor question/artifact/
  permission values use Option, while rule parameter arrays default to empty.
  Update domain readers and constructors; transport codecs retain the same bytes.

  Ordinary descriptor fields derive from one Schema owner. Rule service tuple
  types read the native service Identifier and preserve empty tuple meaning.
  The engine live Layer is separate from its service contract with existing
  public entrypoints retained. SDK output narrowing validates a calculator's
  domain report Type rather than decoding transport data again.

  Existing tax formulas, amounts, saved snapshots, tables and source records
  remain unchanged. The Medicare decision and wider request/rate work remain open.

- 02c813f: Money, date and decimal helpers now return checked Effect failures for invalid
  inputs and amounts that cannot fit safe whole cents. `aud` requires checked
  `Cents`; use `audFromCents` for a number that still needs checking. Addition,
  subtraction, money rounding, decimal conversion and ledger totals now return
  Effects. Rule calculations map these failures to safe `CalculationError` values;
  `buildPayWithholdingsLedger` also returns an Effect.

  DateInterval ends now use Option values while retaining the original encoded
  strings, missing keys, explicitly undefined keys and saved bytes. Metadata
  consumers see the new domain type through the affected packages; HTTP and RPC
  representations remain unchanged. Open intervals have no finite surrogate end,
  and Australian year helpers check the entire label and representable boundaries.

  Update callers and examples to yield fallible operations or assemble unchanged
  Money from already checked cents. Retained tables, source records, golden tax
  results and Medicare thresholds are unchanged. Publication is not included.

- ab1293b: Public parameter Schemas now reject invalid row ranges and local rates, empty
  or incomplete tables, gaps, overlaps and open middle bounds. Schedule 1 checks
  both supported scales independently; STSL checks inclusive weekly cent coverage.
  Income tax and LITO begin at a zero threshold with adjacent brackets. Medicare
  checks threshold order and positive full/shade-in rate relationships.

  Owning fallible constructors and saved-data Schemas enforce the same checks.
  Generic decimal brands and signed Schedule 1 dollar coefficients stay open.
  Retained table values, source records, encoded bytes, supported years and known
  calculator results are unchanged. This does not correct the unresolved Medicare
  thresholds or publish packages.

- 59b0a36: Require stable Effect 4.0.0 and migrate HTTP, process and encoding imports to its stable module paths. Upgrade the shared compiler configuration to TypeScript 7.0.2 and the supported native Effect diagnostic tool. Consumers must use the stable Effect graph instead of the release-candidate graph. This is a deliberate compatibility boundary for the fixed release train; calculator inputs, supported 2025–26 scope, retained results and the OpenAPI document are unchanged.
- 4b75366: Scenario Layers are static. Decode `TakeHomeScenarioInputSchema` or
  `AnnualTaxScenarioInputSchema` at your boundary, supply the value with
  `Layer.succeed(TakeHomeScenario)(input)` or
  `Layer.succeed(AnnualTaxScenario)(input)`, and use `TakeHomeScenarioLive` or
  `AnnualTaxScenarioLive`. `TakeHomeScenarioLiveFromInput`,
  `AnnualTaxScenarioLiveFromInput` and the unknown-input
  `TakeHomeScenarioLive(input)` and `AnnualTaxScenarioLive(input)` factories are
  removed.

### Minor Changes

- 876b485: Add a private native Effect RPC calculation contract with caller-scoped clients,
  checked response failures, a whole-response deadline and safe native request and
  error encoding. Calculation remains with the existing calculator service.

  Separate canonical diagnostics and calculator report/input Schemas from live
  calculation imports, and add narrow public Schema exports. Existing exports
  retain the same class identities and calculation values.

### Patch Changes

- 0d82b82: Correct the single-person 2025–26 annual Medicare thresholds to $28,011 and $35,013 using the enacted amendment. Annual reports now identify rules-au-income-tax/1.0.1 and link the checked legal source. At $30,000 taxable income, the Medicare levy changes from $277.80 to $198.90. Other annual tax components and pay calculators retain their rules.

  Accept zero taxable income in the existing nil-rate income-tax band. Positive-income results and nearest-cent arithmetic are unchanged.

- e7b9f0a: Build dependency graphs and tax-rule calculations with immutable Effect collections and exhaustive matching. Preserve existing graph validation, tax parameters, cent rounding, ledger order and trace content. Add lint enforcement for immutable construction throughout core, rules and calculator source and tests.
- Updated dependencies [7dbd09b]
- Updated dependencies [0b58ab5]
- Updated dependencies [48384d5]
- Updated dependencies [5fd1ebb]
- Updated dependencies [facca83]
- Updated dependencies [15bf685]
- Updated dependencies [02c813f]
- Updated dependencies [e7b9f0a]
- Updated dependencies [7d51afa]
- Updated dependencies [6b2a857]
- Updated dependencies [876b485]
- Updated dependencies [390c3cd]
- Updated dependencies [59b0a36]
  - @taxkit/core@2.0.0

## 1.0.0

### Major Changes

- e409856: Introduce the TaxKit package namespace as a breaking identity cutover. Update
  consumer imports and runtime configuration to the TaxKit package and
  environment names; no compatibility package aliases are provided.

### Patch Changes

- Updated dependencies [e409856]
  - @taxkit/core@1.0.0

## 0.1.0

### Minor Changes

- a3a39e7: Expose typed scenario-layer constructors for calculator composition, couple
  catalogue schemas to typed continuations, and simplify SDK report decoding.

### Patch Changes

- 2dc693a: Make package builds and release artifacts deterministic with clean compilation,
  dist-only publication exports, concrete packed dependency ranges, and
  Effect-native scoped validators for focused SDK artifacts and strict clean
  consumers across the complete TaxKit release package graph.
- Updated dependencies [2dc693a]
  - @taxkit/core@0.1.0

## 0.0.4

### Patch Changes

- @taxkit/core@0.0.4

## 0.0.3

### Patch Changes

- @taxkit/core@0.0.3

## 0.0.2

### Patch Changes

- d1d84c3: Add canonical `CalculatorId` and `Jurisdiction` brands, move AU public
  calculator IDs and supported jurisdiction/tax-year schemas into the owning AU
  rule packages, then compose those canonical exports in `@taxkit/calculators`.
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
  new `@taxkit/calculators` package so HTTP handlers can become thin transport
  adapters over package-owned Effect services.

- Updated dependencies [d1d84c3]
  - @taxkit/core@0.0.2

## 0.0.1

### Patch Changes

- bba9102: Harden the calculation engine with typed rule descriptor builders, date-level
  parameter effective periods, source artifact metadata, Effect BigDecimal-backed
  tax rates and coefficients, a reusable CalculationEngine service, and fixed
  release-train versioning.
- Updated dependencies [bba9102]
  - @taxkit/core@0.0.1
