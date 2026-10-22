# @taxkit/calculators

## 2.0.0

### Major Changes

- ded95d3: Add checked calculation capacity and operation-timeout errors to the canonical
  service contract. API hosts share one eight-calculation pool with a five-second
  operation budget. HTTP returns checked 503/504 envelopes and native RPC preserves
  the same safe errors for manual retry. Tax calculations and retained results are
  unchanged. The local SDK service remains caller-owned and has no server pool.
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

- d39a16e: Add canonical checked rate-limit and admission-unavailable calculation errors.
  The native API shares 60 calculations per minute per checked connection address
  across HTTP, RPC and private Website calls, including each batch member. HTTP
  uses 429 with Retry-After 60 or fixed 503 guidance; RPC revision 4 preserves the
  same errors. Metadata, direct engine/local SDK and standalone Bun work retain
  their existing policy. Declare required native namespace configuration and
  explicit bounded local emulation. Update generated/public error contracts.
  No automatic calculation retry, provider apply, versioning or publication.
- 1b85440: Checked request context, help and filter values use nested Options that retain
  missing, present undefined and present-value keys. Optional error and metadata
  fields use the same owners, including explicit false permission. Constructors
  default omitted fields; JSON, HTTP query and RPC representations stay unchanged.

  SDK request types derive calculator constructor inputs and keep descriptor facts
  typed. The selected calculator still decodes facts and supplies safe field help.
  Typed callers and public Effect/HTTP templates use the canonical request values.
  Existing tax results, tables, source records and OpenAPI snapshots are retained.

- 72c8f42: Apply the server's five-second operation budget to all metadata methods without
  using calculation places. Export the canonical metadata timeout error union.
  Move shared streamed request admission into the HTTP package, mount it in the
  standalone server and return fixed checked JSON 413/408 guidance or safe HTML
  form guidance. Declare HTTP metadata 504 and calculation 408/413 responses.
  Retain the RPC body export alias, existing RPC revision and tax results.
- 59b0a36: Require stable Effect 4.0.0 and migrate HTTP, process and encoding imports to its stable module paths. Upgrade the shared compiler configuration to TypeScript 7.0.2 and the supported native Effect diagnostic tool. Consumers must use the stable Effect graph instead of the release-candidate graph. This is a deliberate compatibility boundary for the fixed release train; calculator inputs, supported 2025–26 scope, retained results and the OpenAPI document are unchanged.

### Minor Changes

- 737ffcd: Use Effect's native request-scoped modern MCP transport in the Alchemy Worker
  and retire legacy session hosting. Website calculations now use the native HTTP
  binding with a stage-owned forwarding secret and the existing shared allowance.

  Expose canonical browser-safe calculator summaries, finish docs RPC page
  correlation, and strengthen checked-example publication and parser-owned MDX
  validation. Align the compatible Effect patch cohort and retain native
  credential, request and response lifetime boundaries.

  Generated OpenAPI now explicitly documents JavaScript's safe-integer bounds for
  `Money.cents`, matching its existing `Schema.Int` validation. The Effect patch
  upgrade changes this schema metadata without changing accepted money values.

### Patch Changes

- 0d82b82: Correct the single-person 2025–26 annual Medicare thresholds to $28,011 and $35,013 using the enacted amendment. Annual reports now identify rules-au-income-tax/1.0.1 and link the checked legal source. At $30,000 taxable income, the Medicare levy changes from $277.80 to $198.90. Other annual tax components and pay calculators retain their rules.

  Accept zero taxable income in the existing nil-rate income-tax band. Positive-income results and nearest-cent arithmetic are unchanged.

- 7dbd09b: Validate ISO dates as real Gregorian calendar dates, expose exact independent
  Australian ruleset versions in calculation reports, and prevent rejected input
  values or raw Effect causes from appearing in public calculator and SDK errors.
- 876b485: Add a private native Effect RPC calculation contract with caller-scoped clients,
  checked response failures, a whole-response deadline and safe native request and
  error encoding. Calculation remains with the existing calculator service.

  Separate canonical diagnostics and calculator report/input Schemas from live
  calculation imports, and add narrow public Schema exports. Existing exports
  retain the same class identities and calculation values.

- 4b75366: Scenario Layers are static. Decode `TakeHomeScenarioInputSchema` or
  `AnnualTaxScenarioInputSchema` at your boundary, supply the value with
  `Layer.succeed(TakeHomeScenario)(input)` or
  `Layer.succeed(AnnualTaxScenario)(input)`, and use `TakeHomeScenarioLive` or
  `AnnualTaxScenarioLive`. `TakeHomeScenarioLiveFromInput`,
  `AnnualTaxScenarioLiveFromInput` and the unknown-input
  `TakeHomeScenarioLive(input)` and `AnnualTaxScenarioLive(input)` factories are
  removed.
- Updated dependencies [0d82b82]
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
  - @taxkit/rules-au-income-tax@2.0.0
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
  - @taxkit/rules-au-income-tax@1.0.0
  - @taxkit/rules-au-pay@1.0.0

## 0.1.0

### Minor Changes

- a3a39e7: Expose typed scenario-layer constructors for calculator composition, couple
  catalogue schemas to typed continuations, and simplify SDK report decoding.

### Patch Changes

- 2dc693a: Make package builds and release artifacts deterministic with clean compilation,
  dist-only publication exports, concrete packed dependency ranges, and
  Effect-native scoped validators for focused SDK artifacts and strict clean
  consumers across the complete TaxKit release package graph.
- 6b307e3: Upgrade the workspace package runtime and test contracts to the compatible
  Effect 4 beta.98 family and current schema, schedule, and runtime APIs while
  keeping calculation traces JSON-compatible at HTTP boundaries.
- Updated dependencies [a3a39e7]
- Updated dependencies [2dc693a]
- Updated dependencies [6b307e3]
  - @taxkit/rules-au-income-tax@0.1.0
  - @taxkit/rules-au-pay@0.1.0
  - @taxkit/core@0.1.0

## 0.0.4

### Patch Changes

- @taxkit/core@0.0.4
- @taxkit/rules-au-income-tax@0.0.4
- @taxkit/rules-au-pay@0.0.4

## 0.0.3

### Patch Changes

- @taxkit/core@0.0.3
- @taxkit/rules-au-income-tax@0.0.3
- @taxkit/rules-au-pay@0.0.3

## 0.0.2

### Patch Changes

- 984ced5: Add Effect Vitest coverage for public calculator service scenarios and
  in-process HTTP API calculator execution/error handling. The public calculate
  contract now exposes a canonical facts union while the calculator service
  validates facts again against the selected catalog entry schema.
- 0bb699b: Add the initial calculators workspace package shell with explicit exports,
  package docs and build/typecheck wiring for the upcoming reusable calculator
  service extraction. Move reusable public calculator schemas, catalog entries
  and metadata projection helpers from `@taxkit/http-api` into
  `@taxkit/calculators`, leaving HTTP route definitions and handler behavior
  compatible.
- d1d84c3: Add canonical `CalculatorId` and `Jurisdiction` brands, move AU public
  calculator IDs and supported jurisdiction/tax-year schemas into the owning AU
  rule packages, then compose those canonical exports in `@taxkit/calculators`.
  The calculator service no longer mirrors request context or revalidates context
  fields already narrowed by schemas. Public calculator input decode errors now
  use calculator-specific names.
- 08ab855: Add canonical CalculatorRun schema names for reusable calculator execution and keep PublicCalculation aliases transitional.
- d95715b: Move public calculator execution, graph validation and schema-guided expected
  error shaping into the reusable `@taxkit/calculators` service. HTTP handlers
  now delegate to `PublicCalculatorService`, and the HTTP route layer composes
  the calculator service with the core calculation engine once instead of inside
  requests.
- 8bd7c21: Document the final calculator run naming contract, HTTP-owned transport names, and dist-only SDK export map.
- Updated dependencies [d1d84c3]
- Updated dependencies [b632995]
  - @taxkit/core@0.0.2
  - @taxkit/rules-au-income-tax@0.0.2
  - @taxkit/rules-au-pay@0.0.2
