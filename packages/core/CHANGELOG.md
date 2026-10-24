# @taxkit/core

## 2.1.0

### Minor Changes

- 221ee31: Add `moneyFromDollarsText`, which reads typed dollar text as non-negative
  `Money` exactly and fails with `InvalidDollarsText` and a matchable `reason`
  (`empty`, `format` or `range`). `dollarsTextFromMoney` writes Money back as
  plain dollars, and `MoneyFromDollarsString` joins both as a Schema codec with
  default messages.

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

- 15bf685: Core calculation error causes use canonical nested Options with omitted-field
  constructor defaults. Original missing, undefined, null and opaque diagnostic
  representations are retained; current rule errors omit diagnostics. Legacy
  values are not made safe for telemetry by this type change.

  Calculator catalogue entries expose their checked selected continuation without
  an unused generic program Effect. Actual rule programs and all retained tax,
  report, metadata, table and source values remain unchanged.

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

- 390c3cd: Derive ledger component types from their canonical Schema and recursive trace
  fields from one shared field owner. Exported type aliases replace open interfaces,
  so declaration merging is no longer supported. Retain encoded field order,
  optional-key omission/undefined behaviour, nested trace values and tax results.
- 59b0a36: Require stable Effect 4.0.0 and migrate HTTP, process and encoding imports to its stable module paths. Upgrade the shared compiler configuration to TypeScript 7.0.2 and the supported native Effect diagnostic tool. Consumers must use the stable Effect graph instead of the release-candidate graph. This is a deliberate compatibility boundary for the fixed release train; calculator inputs, supported 2025–26 scope, retained results and the OpenAPI document are unchanged.

### Minor Changes

- 876b485: Add a private native Effect RPC calculation contract with caller-scoped clients,
  checked response failures, a whole-response deadline and safe native request and
  error encoding. Calculation remains with the existing calculator service.

  Separate canonical diagnostics and calculator report/input Schemas from live
  calculation imports, and add narrow public Schema exports. Existing exports
  retain the same class identities and calculation values.

### Patch Changes

- 0b58ab5: Enforce DateInterval start-before-end validation in its canonical Schema as well as the convenience constructor. Consolidate ISO date validation and use checked month lookup; invalid constructors now raise the owning Schema validation `Error` with its issue cause instead of a custom diagnostic. Keep valid date, AUD arithmetic and calculator results unchanged.
- 5fd1ebb: Remove the unused automatic Node type-package requirement from Core's compiler
  configuration. Source and test checking use explicit imports, and the inherited
  source-only build now works without Node types supplied by another workspace.
  Runtime exports, emitted package paths and calculation results are unchanged.
- e7b9f0a: Build dependency graphs and tax-rule calculations with immutable Effect collections and exhaustive matching. Preserve existing graph validation, tax parameters, cent rounding, ledger order and trace content. Add lint enforcement for immutable construction throughout core, rules and calculator source and tests.
- 7d51afa: Packages now declare the MIT licence and ship its text. The TaxKit name and
  mark are reserved under the repository's trademark policy.
- 6b2a857: Update the public Effect v4 dependency family and tagged error definitions.
  Regenerate the OpenAPI document with the matching Effect release. Its encoded
  component names now end in `Encoded`, and its tax-year union is nested one level
  deeper; the HTTP paths and JSON response fields stay the same.

## 1.0.0

### Major Changes

- e409856: Introduce the TaxKit package namespace as a breaking identity cutover. Update
  consumer imports and runtime configuration to the TaxKit package and
  environment names; no compatibility package aliases are provided.

## 0.1.0

### Patch Changes

- 2dc693a: Make package builds and release artifacts deterministic with clean compilation,
  dist-only publication exports, concrete packed dependency ranges, and
  Effect-native scoped validators for focused SDK artifacts and strict clean
  consumers across the complete TaxKit release package graph.

## 0.0.4

## 0.0.3

### Patch Changes

- Fixed release-train version alignment for the API HTTP package topology
  release. No package-local runtime changes.

## 0.0.2

### Patch Changes

- d1d84c3: Add canonical `CalculatorId` and `Jurisdiction` brands, move AU public
  calculator IDs and supported jurisdiction/tax-year schemas into the owning AU
  rule packages, then compose those canonical exports in `@taxkit/calculators`.
  The calculator service no longer mirrors request context or revalidates context
  fields already narrowed by schemas. Public calculator input decode errors now
  use calculator-specific names.

## 0.0.1

### Patch Changes

- bba9102: Harden the calculation engine with typed rule descriptor builders, date-level
  parameter effective periods, source artifact metadata, Effect BigDecimal-backed
  tax rates and coefficients, a reusable CalculationEngine service, and fixed
  release-train versioning.
