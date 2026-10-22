# @taxkit/rules-au-stsl

## 2.0.0

### Major Changes

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

### Patch Changes

- 5f713b1: Correct cash take-home pay to deduct salary sacrifice as well as tax withholdings. Evaluate the complete PAYG coefficient formula before whole-dollar rounding, avoiding a one-dollar overcharge near half-dollar boundaries. Identify corrected pay calculations as rules-au-pay/1.0.1.

  Make BackendAnalyticsLive a static Layer that reads checked settings from the host ConfigProvider. Callers now provide configuration through the native provider instead of invoking a Layer factory.

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
- Updated dependencies [3e15c9f]
- Updated dependencies [876b485]
- Updated dependencies [ab1293b]
- Updated dependencies [390c3cd]
- Updated dependencies [59b0a36]
- Updated dependencies [4b75366]
- Updated dependencies [5f713b1]
  - @taxkit/core@2.0.0
  - @taxkit/rules-au-pay@2.0.0

## 1.0.0

### Major Changes

- e409856: Introduce the TaxKit package namespace as a breaking identity cutover. Update
  consumer imports and runtime configuration to the TaxKit package and
  environment names; no compatibility package aliases are provided.

### Patch Changes

- Updated dependencies [e409856]
  - @taxkit/core@1.0.0
  - @taxkit/rules-au-pay@1.0.0

## 0.1.0

### Patch Changes

- 2dc693a: Make package builds and release artifacts deterministic with clean compilation,
  dist-only publication exports, concrete packed dependency ranges, and
  Effect-native scoped validators for focused SDK artifacts and strict clean
  consumers across the complete TaxKit release package graph.
- Updated dependencies [a3a39e7]
- Updated dependencies [2dc693a]
- Updated dependencies [6b307e3]
  - @taxkit/rules-au-pay@0.1.0
  - @taxkit/core@0.1.0

## 0.0.4

### Patch Changes

- @taxkit/core@0.0.4
- @taxkit/rules-au-pay@0.0.4

## 0.0.3

### Patch Changes

- @taxkit/core@0.0.3
- @taxkit/rules-au-pay@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies [d1d84c3]
- Updated dependencies [b632995]
  - @taxkit/core@0.0.2
  - @taxkit/rules-au-pay@0.0.2

## 0.0.1

### Patch Changes

- bba9102: Harden the calculation engine with typed rule descriptor builders, date-level
  parameter effective periods, source artifact metadata, Effect BigDecimal-backed
  tax rates and coefficients, a reusable CalculationEngine service, and fixed
  release-train versioning.
- Updated dependencies [bba9102]
  - @taxkit/core@0.0.1
  - @taxkit/rules-au-pay@0.0.1
