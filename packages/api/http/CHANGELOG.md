# @taxkit/api-http

## 2.0.0

### Major Changes

- ded95d3: Add checked calculation capacity and operation-timeout errors to the canonical
  service contract. API hosts share one eight-calculation pool with a five-second
  operation budget. HTTP returns checked 503/504 envelopes and native RPC preserves
  the same safe errors for manual retry. Tax calculations and retained results are
  unchanged. The local SDK service remains caller-owned and has no server pool.
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
- 4b75366: Use Effect's generated client directly. `HttpApiClient.make(TaxKitApi, { baseUrl })`
  from `effect/http-api`, with `TaxKitApi` from `@taxkit/api-http/api`, replaces
  `createTaxKitApiClient`, `makeTaxKitApiClient`, `TaxKitApiClientOptions`,
  `TaxKitHttpApiService`, `getTaxKitHttpApiClient`, `withTaxKitHttpApiClient`,
  `createTaxKitApiClientLayer` and `makeTaxKitApiClientLayer`; the `./client`
  and `./client/live` exports are removed. `./client/server` becomes
  `./in-process`: `TaxKitApiInProcessLive` now provides an in-process
  `HttpClient` for the generated client instead of a client service.
- 103feda: Add checked navigation, page, search and processed Markdown HTTP routes for accepted public documentation. Server Layers and the in-process client now require the caller's ContentService. API hosts supply the built public catalogue; requests do not run the documentation compiler.
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

- 48384d5: Adopt the stricter shared Oxlint policy and use precise public contract names.
  Rename vague service `Shape` types to `Contract`, rename
  `SourceExtract.shape` to `rowContract`, keep trace values JSON-safe, and add
  preferred `create*` constructors while retaining deprecated `make*` aliases
  where compatibility is safe.
- c1f3d69: Add `@taxkit/api-http/response-policy`: TaxKit's single public cache decision.
  Successful public GET/HEAD documentation and calculator metadata replies get
  `Cache-Control: public, max-age=0` and seven-day Cloudflare freshness; every
  other reply, including calculations, errors and cookie-setting responses, is
  `no-store` for both browsers and Cloudflare.

  `publicCors` and `isBrowserOrigin` are the one public browser policy for HTTP
  and RPC: any exact HTTP(S) origin, no credentials. The Bun host's routes now
  use it instead of the native wildcard defaults.

### Patch Changes

- 0d82b82: Correct the single-person 2025–26 annual Medicare thresholds to $28,011 and $35,013 using the enacted amendment. Annual reports now identify rules-au-income-tax/1.0.1 and link the checked legal source. At $30,000 taxable income, the Medicare levy changes from $277.80 to $198.90. Other annual tax components and pay calculators retain their rules.

  Accept zero taxable income in the existing nil-rate income-tax band. Positive-income results and nearest-cent arithmetic are unchanged.

- 7dbd09b: Validate ISO dates as real Gregorian calendar dates, expose exact independent
  Australian ruleset versions in calculation reports, and prevent rejected input
  values or raw Effect causes from appearing in public calculator and SDK errors.
- be1fcc4: Export the existing health response Schema so app-owned HTTP checks can reuse
  the endpoint contract. Retain the health response and calculator routes.
- 6b2a857: Update the public Effect v4 dependency family and tagged error definitions.
  Regenerate the OpenAPI document with the matching Effect release. Its encoded
  component names now end in `Encoded`, and its tax-year union is nested one level
  deeper; the HTTP paths and JSON response fields stay the same.
- 1e72f6b: Call the owning calculator operation directly for HTTP calculation and expose
  an app-supplied route Layer for shared native HTTP/RPC host composition. Preserve
  existing HTTP JSON, OpenAPI, errors and standalone server consumers.
- 049b04f: Add four checked native documentation operations and their separate client. The RPC server now requires the caller's ContentService as well as its calculator service. Keep calculator methods and revision 4, and check documentation revision 1 separately.

  Own the bounded public page address and fixed page/search errors in the compiled content package, shared by HTTP and RPC. Both private JSON clients use the same scoped 2 MiB response reader; their existing error vocabularies stay separate.

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

- 5221b42: `cacheHeaders` also shares a 400 or 406 that varies on `Accept`. Workers Cache
  drops a page's stored entry when an uncacheable reply arrives at the same
  address, so these negotiation answers are stored as their own variant instead
  of letting an odd `Accept` header empty the page's cache.
- 37abee7: Preserve response-owner cache lifetimes and revalidation directives instead of replacing them with default CDN freshness. Prevent public caching when cookies are stored in Effect's response cookie collection, including cookies parsed from Web responses.
- 1fea106: Reject documentation replies that do not match the requested page and keep Website settings available when its API binding fails.

  Separate native host composition, observability, MCP, analytics relay and discovery publication into their owning packages. Centralize API paths while preserving HTTP/RPC/MCP wire contracts, private calculation admission and telemetry privacy.

  Keep native modern MCP invocations alive through their existing work deadline after a client disconnect so calculation capacity is released reliably.

- a1e2f28: Preserve the native rate-limit response Schema's precise types, including its
  Retry-After header, when generating the HTTP client. Keep response bytes and
  existing compatibility exports unchanged. Finish shared lint-package adoption
  and type-aware checks across the repository.
- Updated dependencies [dc9d0ba]
- Updated dependencies [501d419]
- Updated dependencies [20a9dcc]
- Updated dependencies [0d82b82]
- Updated dependencies [7dbd09b]
- Updated dependencies [ded95d3]
- Updated dependencies [0b58ab5]
- Updated dependencies [bd9df35]
- Updated dependencies [48384d5]
- Updated dependencies [5fd1ebb]
- Updated dependencies [facca83]
- Updated dependencies [15bf685]
- Updated dependencies [02c813f]
- Updated dependencies [e7b9f0a]
- Updated dependencies [7d51afa]
- Updated dependencies [6b2a857]
- Updated dependencies [d39a16e]
- Updated dependencies [876b485]
- Updated dependencies [049b04f]
- Updated dependencies [737ffcd]
- Updated dependencies [1b85440]
- Updated dependencies [48f4681]
- Updated dependencies [390c3cd]
- Updated dependencies [72c8f42]
- Updated dependencies [59b0a36]
- Updated dependencies [4b75366]
- Updated dependencies [4b75366]
- Updated dependencies [1fea106]
  - @taxkit/content@2.0.0
  - @taxkit/calculators@2.0.0
  - @taxkit/core@2.0.0

## 1.0.0

### Major Changes

- e409856: Introduce the TaxKit package namespace as a breaking identity cutover. Update
  consumer imports and runtime configuration to the TaxKit package and
  environment names; no compatibility package aliases are provided.

### Patch Changes

- Updated dependencies [e409856]
  - @taxkit/calculators@1.0.0
  - @taxkit/core@1.0.0
  - @taxkit/sdk@1.0.0

## 0.1.0

### Patch Changes

- 2dc693a: Make package builds and release artifacts deterministic with clean compilation,
  dist-only publication exports, concrete packed dependency ranges, and
  Effect-native scoped validators for focused SDK artifacts and strict clean
  consumers across the complete TaxKit release package graph.
- Updated dependencies [a3a39e7]
- Updated dependencies [2dc693a]
- Updated dependencies [6b307e3]
- Updated dependencies [9814598]
  - @taxkit/calculators@0.1.0
  - @taxkit/sdk@0.1.0
  - @taxkit/core@0.1.0

## 0.0.4

### Patch Changes

- 190d238: Add OpenAPI snapshot checks, route fixture coverage and the live API smoke
  workflow for the API HTTP package.
  - @taxkit/core@0.0.4
  - @taxkit/sdk@0.0.4
  - @taxkit/calculators@0.0.4

## 0.0.3

### Patch Changes

- 96632e7: Relocate the HTTP API transport package to `packages/api/http` and rename it
  from `@taxkit/http-api` to `@taxkit/api-http` while preserving the existing
  runtime, client and handler export paths under the new package name.
  - @taxkit/core@0.0.3
  - @taxkit/sdk@0.0.3
  - @taxkit/calculators@0.0.3

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
  and metadata projection helpers from `@taxkit/http-api` into
  `@taxkit/calculators`, leaving HTTP route definitions and handler behavior
  compatible.
- d1d84c3: Add canonical `CalculatorId` and `Jurisdiction` brands, move AU public
  calculator IDs and supported jurisdiction/tax-year schemas into the owning AU
  rule packages, then compose those canonical exports in `@taxkit/calculators`.
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
  new `@taxkit/calculators` package so HTTP handlers can become thin transport
  adapters over package-owned Effect services.

- d95715b: Move public calculator execution, graph validation and schema-guided expected
  error shaping into the reusable `@taxkit/calculators` service. HTTP handlers
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
  - @taxkit/sdk@0.0.2
  - @taxkit/calculators@0.0.2
  - @taxkit/core@0.0.2

## 0.0.1

### Patch Changes

- bba9102: Harden the calculation engine with typed rule descriptor builders, date-level
  parameter effective periods, source artifact metadata, Effect BigDecimal-backed
  tax rates and coefficients, a reusable CalculationEngine service, and fixed
  release-train versioning.
