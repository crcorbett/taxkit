# @taxkit/infrastructure

## 1.0.0

### Major Changes

- 0531234: Make exported documentation build-cache settings readonly, including nested
  workspace arrays. Callers passing them to a provider that expects writable
  arrays must first copy those arrays. The stack now passes fresh copies while
  preserving the resource settings and cache inputs.

### Minor Changes

- 94e0362: Use one retained TaxKit analytics project for live and controlled preview events,
  with separate stage labels for reports. Close rejected analytics connections
  promptly and accept successful replies that have no body.

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

- 1fea106: Reject documentation replies that do not match the requested page and keep Website settings available when its API binding fails.

  Separate native host composition, observability, MCP, analytics relay and discovery publication into their owning packages. Centralize API paths while preserving HTTP/RPC/MCP wire contracts, private calculation admission and telemetry privacy.

  Keep native modern MCP invocations alive through their existing work deadline after a client disconnect so calculation capacity is released reliably.

- Updated dependencies [7d51afa]
- Updated dependencies [737ffcd]
- Updated dependencies [94e0362]
- Updated dependencies [5f713b1]
- Updated dependencies [1fea106]
  - @taxkit/analytics@0.1.1
  - @taxkit/observability@0.1.1
