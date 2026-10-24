# @taxkit/observability

## 1.0.0

### Major Changes

- cafcc71: The Website calculators now need JavaScript. The Website no longer accepts
  HTML form POSTs and shows a notice when JavaScript is off; browsers keep
  calling the public API directly.

  The private Website forwarding key is removed with the server form path. The
  API takes a calculation caller's rate key only from the direct Cloudflare
  connection or the local emulator fallback. `@taxkit/observability/edge-identity`
  no longer exports the forwarding headers or credential Schema, and the
  `TaxKitWebsiteForwardingKey` resource leaves the native apps stack.

  The unused Website analytics relay (`/ingest/e/`) and the browser's collection
  header are removed, with the `@taxkit/analytics/relay/*` exports and the
  `analytics-relay` host route. The API's own calculator analytics is unchanged.

### Patch Changes

- b533bc7: Remove the public native RPC endpoint at POST `/rpc` and the private
  `@taxkit/api-rpc` package. Machine callers use the public HTTP API, its
  OpenAPI description or remote MCP, which keep the same calculator and
  documentation operations, limits and errors. `@taxkit/api-http/routes` no
  longer exports `rpcPath`, `RpcRoutePath` or `isTrustedCalculationPath`, and
  host request records no longer use the `rpc` route family. Shared calculator
  test fixtures move to `@taxkit/calculators/testing/fixtures`.

## 0.1.1

### Patch Changes

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
