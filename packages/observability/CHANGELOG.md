# @taxkit/observability

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
