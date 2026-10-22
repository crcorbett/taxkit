# @taxkit/api-rpc

## 1.0.0

### Major Changes

- 501d419: Add checked discovery documents derived from the accepted documentation catalogue
  and the configured Website/API addresses. Native documentation calls now require
  revision 2 and gain the closed discovery operation and fixed unavailable error.
  API and Website origins reuse one checked public-address policy with
  separate identities. No calculator request or retained answer changes.
- ded95d3: Add checked calculation capacity and operation-timeout errors to the canonical
  service contract. API hosts share one eight-calculation pool with a five-second
  operation budget. HTTP returns checked 503/504 envelopes and native RPC preserves
  the same safe errors for manual retry. Tax calculations and retained results are
  unchanged. The local SDK service remains caller-owned and has no server pool.
- fc22e47: Complete the closed calculator RPC service with detail, schema, graph, facts,
  rules, jurisdictions and tax-year operations. Contract revision 3 rejects older
  revisions and applies the existing checked reply and lifetime policy to every
  named call. Required service methods change; retained tax calculations do not.
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

- d39a16e: Add canonical checked rate-limit and admission-unavailable calculation errors.
  The native API shares 60 calculations per minute per checked connection address
  across HTTP, RPC and private Website calls, including each batch member. HTTP
  uses 429 with Retry-After 60 or fixed 503 guidance; RPC revision 4 preserves the
  same errors. Metadata, direct engine/local SDK and standalone Bun work retain
  their existing policy. Declare required native namespace configuration and
  explicit bounded local emulation. Update generated/public error contracts.
  No automatic calculation retry, provider apply, versioning or publication.
- 9ca78cc: Bound private JSON replies to 2 MiB, apply one ten-second complete-response
  client deadline, and return distinct safe status/size errors with manual retry
  guidance. Preserve native RPC codecs, caller cancellation and no automatic retries.
- 049b04f: Add four checked native documentation operations and their separate client. The RPC server now requires the caller's ContentService as well as its calculator service. Keep calculator methods and revision 4, and check documentation revision 1 separately.

  Own the bounded public page address and fixed page/search errors in the compiled content package, shared by HTTP and RPC. Both private JSON clients use the same scoped 2 MiB response reader; their existing error vocabularies stay separate.

- ee29ccf: Reduce the shared native POST body limit from one MiB to 64 KiB. Use the same
  byte limit for the streamed reader and native RPC message admission, preserving
  source cleanup and the five-second body-read deadline. Native API and Website
  hosts reject oversized bodies before decoding; exactly 64 KiB remains allowed.
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

### Minor Changes

- cd03dd8: Add a named native RPC operation for reading the supported calculator catalogue.
  Reuse canonical query and result Schemas, checked native request/reply codecs,
  caller-scoped cleanup and the complete five-second deadline.
- 876b485: Add a private native Effect RPC calculation contract with caller-scoped clients,
  checked response failures, a whole-response deadline and safe native request and
  error encoding. Calculation remains with the existing calculator service.

  Separate canonical diagnostics and calculator report/input Schemas from live
  calculation imports, and add narrow public Schema exports. Existing exports
  retain the same class identities and calculation values.

### Patch Changes

- 7d51afa: Packages now declare the MIT licence and ship its text. The TaxKit name and
  mark are reserved under the repository's trademark policy.
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

- 1fea106: Reject documentation replies that do not match the requested page and keep Website settings available when its API binding fails.

  Separate native host composition, observability, MCP, analytics relay and discovery publication into their owning packages. Centralize API paths while preserving HTTP/RPC/MCP wire contracts, private calculation admission and telemetry privacy.

  Keep native modern MCP invocations alive through their existing work deadline after a client disconnect so calculation capacity is released reliably.

- Updated dependencies [dc9d0ba]
- Updated dependencies [501d419]
- Updated dependencies [20a9dcc]
- Updated dependencies [0d82b82]
- Updated dependencies [7dbd09b]
- Updated dependencies [ded95d3]
- Updated dependencies [be1fcc4]
- Updated dependencies [bd9df35]
- Updated dependencies [48384d5]
- Updated dependencies [facca83]
- Updated dependencies [15bf685]
- Updated dependencies [02c813f]
- Updated dependencies [6b2a857]
- Updated dependencies [1e72f6b]
- Updated dependencies [d39a16e]
- Updated dependencies [876b485]
- Updated dependencies [049b04f]
- Updated dependencies [4b75366]
- Updated dependencies [737ffcd]
- Updated dependencies [5221b42]
- Updated dependencies [103feda]
- Updated dependencies [1b85440]
- Updated dependencies [c1f3d69]
- Updated dependencies [48f4681]
- Updated dependencies [37abee7]
- Updated dependencies [72c8f42]
- Updated dependencies [59b0a36]
- Updated dependencies [4b75366]
- Updated dependencies [4b75366]
- Updated dependencies [1fea106]
- Updated dependencies [a1e2f28]
  - @taxkit/content@2.0.0
  - @taxkit/calculators@2.0.0
  - @taxkit/api-http@2.0.0
  - @taxkit/publication@1.0.1
