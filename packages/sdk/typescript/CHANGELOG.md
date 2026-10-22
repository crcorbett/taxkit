# @taxkit/sdk

## 2.0.0

### Major Changes

- ded95d3: Add checked calculation capacity and operation-timeout errors to the canonical
  service contract. API hosts share one eight-calculation pool with a five-second
  operation budget. HTTP returns checked 503/504 envelopes and native RPC preserves
  the same safe errors for manual retry. Tax calculations and retained results are
  unchanged. The local SDK service remains caller-owned and has no server pool.
- 72c3286: Plain SDK clients now own their resources. Await `client.dispose()` when finished;
  closing cancels pending work and returns stable public errors for later calls.
  Direct calculation helpers clean up automatically. Client report types remain
  specific to the selected descriptor, and the SDK declares its core runtime
  dependency for packed installations. Update integration examples to close clients.
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

### Patch Changes

- 0d82b82: Correct the single-person 2025–26 annual Medicare thresholds to $28,011 and $35,013 using the enacted amendment. Annual reports now identify rules-au-income-tax/1.0.1 and link the checked legal source. At $30,000 taxable income, the Medicare levy changes from $277.80 to $198.90. Other annual tax components and pay calculators retain their rules.

  Accept zero taxable income in the existing nil-rate income-tax band. Positive-income results and nearest-cent arithmetic are unchanged.

- 7dbd09b: Validate ISO dates as real Gregorian calendar dates, expose exact independent
  Australian ruleset versions in calculation reports, and prevent rejected input
  values or raw Effect causes from appearing in public calculator and SDK errors.
- 60db527: Check SDK command scripts with TypeScript and the canonical strict rules.
  Decode package manifests once, scope command lifetimes, bound captured stdout
  and fail when a search or temporary-folder cleanup cannot complete. Retain
  safe step/exit diagnostics without exposing captured command output.
- 6b2a857: Update the public Effect v4 dependency family and tagged error definitions.
  Regenerate the OpenAPI document with the matching Effect release. Its encoded
  component names now end in `Encoded`, and its tax-year union is nested one level
  deeper; the HTTP paths and JSON response fields stay the same.
- 48f4681: Discovery documents now name the TaxKit publication address. `DocsDiscoverySettings`
  replaces `websiteOrigin` with `publicationOrigin`, checked by the new
  `DocsPublicationOrigin` Schema, so canonical links name the published site even
  when a separate Preview serves the page. The acceptance-record Schemas
  (`PublicPageAcceptanceRecord`, its versions and `DocsAcceptedSourceDigest`) are
  removed; page frontmatter now decides publication. Packages use Effect 4.0.2.
- a1e2f28: Preserve the native rate-limit response Schema's precise types, including its
  Retry-After header, when generating the HTTP client. Keep response bytes and
  existing compatibility exports unchanged. Finish shared lint-package adoption
  and type-aware checks across the repository.
- Updated dependencies [0d82b82]
- Updated dependencies [7dbd09b]
- Updated dependencies [ded95d3]
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
- Updated dependencies [d39a16e]
- Updated dependencies [876b485]
- Updated dependencies [737ffcd]
- Updated dependencies [ab1293b]
- Updated dependencies [1b85440]
- Updated dependencies [390c3cd]
- Updated dependencies [72c8f42]
- Updated dependencies [59b0a36]
- Updated dependencies [4b75366]
- Updated dependencies [5f713b1]
  - @taxkit/rules-au-income-tax@2.0.0
  - @taxkit/calculators@2.0.0
  - @taxkit/core@2.0.0
  - @taxkit/rules-au-pay@2.0.0

## 1.0.0

### Major Changes

- e409856: Introduce the TaxKit package namespace as a breaking identity cutover. Update
  consumer imports and runtime configuration to the TaxKit package and
  environment names; no compatibility package aliases are provided.

### Patch Changes

- Updated dependencies [e409856]
  - @taxkit/calculators@1.0.0
  - @taxkit/rules-au-income-tax@1.0.0
  - @taxkit/rules-au-pay@1.0.0

## 0.1.0

### Patch Changes

- a3a39e7: Expose typed scenario-layer constructors for calculator composition, couple
  catalogue schemas to typed continuations, and simplify SDK report decoding.
- 2dc693a: Make package builds and release artifacts deterministic with clean compilation,
  dist-only publication exports, concrete packed dependency ranges, and
  Effect-native scoped validators for focused SDK artifacts and strict clean
  consumers across the complete TaxKit release package graph.
- 9814598: Add an SDK-owned downstream consumer validation command that builds and packs the SDK runtime closure, creates an external temp workspace, and reports release-blocking packed manifest protocols before claiming clean install readiness.
- Updated dependencies [a3a39e7]
- Updated dependencies [2dc693a]
- Updated dependencies [6b307e3]
  - @taxkit/calculators@0.1.0
  - @taxkit/rules-au-income-tax@0.1.0
  - @taxkit/rules-au-pay@0.1.0

## 0.0.4

### Patch Changes

- @taxkit/rules-au-income-tax@0.0.4
- @taxkit/rules-au-pay@0.0.4
- @taxkit/calculators@0.0.4

## 0.0.3

### Patch Changes

- @taxkit/rules-au-income-tax@0.0.3
- @taxkit/rules-au-pay@0.0.3
- @taxkit/calculators@0.0.3

## 0.0.2

### Patch Changes

- 765ea46: Migrate SDK and HTTP API calculator execution contracts to the canonical `CalculatorRun*` and `CalculatorServiceError` names.
- 24911a5: Rename calculator API and SDK Effect report helpers to clearer public names,
  and add an SDK Effect full-run helper that returns typed calculator run
  responses. The HTTP calculate route now delegates full-run execution through
  that SDK helper.
- 793ad00: Lock the SDK publish export map to dist files and expose canonical calculator run schemas from the schemas entrypoint.
- 7a8f5e9: Replace raw Effect cause storage in SDK safe errors with schema-backed public error details.
- f4bf6e6: Add strict typed calculation/module descriptors and the Effect-native calculator
  facade backed by `PublicCalculatorService`.
- 59fc66a: Move the public calculation HTTP API handler to consume the SDK Effect facade and extend SDK import-boundary checks to prove the HTTP API depends on the SDK, not the reverse.
- 0b4fe92: Add the browser-safe plain SDK facade, SDK-owned safe result errors, and typed Australian module helpers.
- 8bd7c21: Document the final calculator run naming contract, HTTP-owned transport names, and dist-only SDK export map.
- 877adc1: Prepare SDK package metadata for clean packed artifacts while keeping publication gated behind explicit release approval.
- c3e6497: Add the initial TypeScript SDK package scaffold with explicit browser-safe,
  Effect-native, AU and testing export paths. The package remains private while
  the typed facade, calculator execution and downstream validation are built in
  later SDK tasks.
- Updated dependencies [984ced5]
- Updated dependencies [0bb699b]
- Updated dependencies [d1d84c3]
- Updated dependencies [08ab855]
- Updated dependencies [b632995]
- Updated dependencies [d95715b]
- Updated dependencies [8bd7c21]
  - @taxkit/calculators@0.0.2
  - @taxkit/rules-au-income-tax@0.0.2
  - @taxkit/rules-au-pay@0.0.2
