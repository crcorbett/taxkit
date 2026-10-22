# @taxkit/docs-content

## 1.0.0

### Major Changes

- 48384d5: Adopt the stricter shared Oxlint policy and use precise public contract names.
  Rename vague service `Shape` types to `Contract`, rename
  `SourceExtract.shape` to `rowContract`, keep trace values JSON-safe, and add
  preferred `create*` constructors while retaining deprecated `make*` aliases
  where compatibility is safe.
- 4b75366: Content and Fumadocs source Layers are static. `ContentDiscoveryLive` now
  requires `ContentDiscoverySettings`; supply the lazy settings Effect with
  `Layer.succeed(ContentDiscoverySettings)(settings)`. A settings failure still
  fails `getDocument`, not Layer construction. `makeFumadocsSourceLive(adapter)`
  is replaced by `FumadocsSourceLive`, which requires
  `FumadocsGeneratedCollection` from `@taxkit/docs-fumadocs/service`; the
  `FumadocsGeneratedCollectionAdapter` type moves to that export.
  `makeFumadocsSourceTest(fixtures)` and `makeDocsContentServiceTest(fixtures)`
  are replaced by `FumadocsSourceTest` and `DocsContentServiceTest`, which require
  `FumadocsSourceFixtures` from `@taxkit/docs-fumadocs/test`.

### Patch Changes

- dc9d0ba: Add a compiled content contract and service for accepted pages, navigation and
  bounded search. Drafts and inconsistent catalogue entries fail validation.
  Keep the existing docs-content schema and error imports as compatibility
  re-exports; authored MDX and its compiler remain in docs-content.
- 20a9dcc: Record individual reviewed source acceptance for the existing documentation
  pages and navigation. Bind each decision to exact file bytes so the local
  catalogue builder can include accepted pages and reject later unreviewed edits.
  Preserve the existing examples, retained tax results and private package status.
- 0d82b82: Correct the single-person 2025–26 annual Medicare thresholds to $28,011 and $35,013 using the enacted amendment. Annual reports now identify rules-au-income-tax/1.0.1 and link the checked legal source. At $30,000 taxable income, the Medicare levy changes from $277.80 to $198.90. Other annual tax components and pay calculators retain their rules.

  Accept zero taxable income in the existing nil-rate income-tax band. Positive-income results and nearest-cent arithmetic are unchanged.

- 72c3286: Plain SDK clients now own their resources. Await `client.dispose()` when finished;
  closing cancels pending work and returns stable public errors for later calls.
  Direct calculation helpers clean up automatically. Client report types remain
  specific to the selected descriptor, and the SDK declares its core runtime
  dependency for packed installations. Update integration examples to close clients.
- bd9df35: Add source-bound acceptance record contracts, an independent native MDX build
  connection and checked public snippet validation. Retain older acceptance
  records and the current docs app while the accepted catalogue is introduced.
- d3fe476: Move the four checked public integration templates and their compiler/runtime
  checks to the private `@taxkit/docs-examples` workspace. Use
  `bun run --filter=@taxkit/docs-examples check-examples` for those templates.
  Declare the existing React catalog dependency needed by the installed Fumadocs
  processed-Markdown compiler; dependency versions and calculation results are
  unchanged.
- 2af4155: Compile documentation page links from checked navigation and repository links
  from a recorded Git revision. Keep HTML and processed Markdown destinations
  aligned, preserve code examples, and reject unknown page addresses or links
  outside the checkout.
- 15bf685: Core calculation error causes use canonical nested Options with omitted-field
  constructor defaults. Original missing, undefined, null and opaque diagnostic
  representations are retained; current rule errors omit diagnostics. Legacy
  values are not made safe for telemetry by this type change.

  Calculator catalogue entries expose their checked selected continuation without
  an unused generic program Effect. Actual rule programs and all retained tax,
  report, metadata, table and source values remain unchanged.

- eb13b36: Require named Effect operations when constructing a generated Fumadocs adapter.
  Wrap provider calls at the collection boundary and preserve safe source errors.
  Return immutable Shiki metadata nodes. Update checked documentation examples to
  use validated native Effect requests and the typed HTTP client with an explicit
  base URL. Public service values and calculator results are unchanged.
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

- 669a8f3: Make bundled documentation navigation available without request-time filesystem
  access so the docs application can render in Cloudflare Workers.
- d39a16e: Add canonical checked rate-limit and admission-unavailable calculation errors.
  The native API shares 60 calculations per minute per checked connection address
  across HTTP, RPC and private Website calls, including each batch member. HTTP
  uses 429 with Retry-After 60 or fixed 503 guidance; RPC revision 4 preserves the
  same errors. Metadata, direct engine/local SDK and standalone Bun work retain
  their existing policy. Declare required native namespace configuration and
  explicit bounded local emulation. Update generated/public error contracts.
  No automatic calculation retry, provider apply, versioning or publication.
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

- 103feda: Add checked navigation, page, search and processed Markdown HTTP routes for accepted public documentation. Server Layers and the in-process client now require the caller's ContentService. API hosts supply the built public catalogue; requests do not run the documentation compiler.
- 1b85440: Checked request context, help and filter values use nested Options that retain
  missing, present undefined and present-value keys. Optional error and metadata
  fields use the same owners, including explicit false permission. Constructors
  default omitted fields; JSON, HTTP query and RPC representations stay unchanged.

  SDK request types derive calculator constructor inputs and keep descriptor facts
  typed. The selected calculator still decodes facts and supplies safe field help.
  Typed callers and public Effect/HTTP templates use the canonical request values.
  Existing tax results, tables, source records and OpenAPI snapshots are retained.

- 4c3d5e4: Move authored TaxKit MDX, navigation and checked examples into the content
  package, and replace callback-shaped Fumadocs loading with a schema-decoded
  Effect service and deterministic Layers.
- a151e51: Correct browser SDK choices, API development commands, client cleanup and
  external-input examples. Link OpenAPI guidance to its checked snapshot and
  test, and require those references during authored-content validation. Keep
  annual tax examples explicitly tied to retained fixtures pending the Medicare
  threshold review.
- Updated dependencies [dc9d0ba]
- Updated dependencies [501d419]
- Updated dependencies [20a9dcc]
- Updated dependencies [bd9df35]
- Updated dependencies [48384d5]
- Updated dependencies [2af4155]
- Updated dependencies [eb13b36]
- Updated dependencies [049b04f]
- Updated dependencies [48f4681]
- Updated dependencies [4c3d5e4]
- Updated dependencies [4b75366]
- Updated dependencies [1fea106]
  - @taxkit/content@2.0.0
  - @taxkit/docs-fumadocs@1.0.0

## 0.0.3

### Patch Changes

- 6b307e3: Upgrade the workspace package runtime and test contracts to the compatible
  Effect 4 beta.98 family and current schema, schedule, and runtime APIs while
  keeping calculation traces JSON-compatible at HTTP boundaries.
- Updated dependencies [2dc693a]
- Updated dependencies [6b307e3]
  - @taxkit/docs-fumadocs@0.0.3

## 0.0.2

### Patch Changes

- 36e7f6c: Expose the docs content live layer through a narrow package export for the new
  docs app runtime.
- b5b4858: Resolve renderable page source paths from canonical docs navigation instead of
  slug inference, parse MDX frontmatter with YAML before canonical Effect Schema
  decode and make the private source-only export contract explicit.
- 25f381d: Refactor docs-content to use reusable Fumadocs config helpers and serve page
  lookup data from the generated Fumadocs source loader, including a browser-safe
  client collection export for compiled MDX rendering.

  Strengthen docs validation with navigation coverage checks and an explicit MDX
  component allowlist for authored content.

- ddea2c7: Add the private docs content Effect service, live layer and package-owned
  validation policy for the public MDX docs corpus.
- a5eb82f: Add the private docs content package with Effect Schema-owned frontmatter,
  navigation and meta contracts plus a Fumadocs MDX source boundary for the
  public docs content root.
- 98bba1d: Validate docs example references and the OpenAPI reference exclusion through the docs-content validation policy.
- Updated dependencies [25f381d]
  - @taxkit/docs-fumadocs@0.0.2
