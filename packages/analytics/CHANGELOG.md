# @taxkit/analytics

## 1.0.1

### Patch Changes

- Updated dependencies [6ff0743]
- Updated dependencies [889f0cf]
  - @taxkit/content@3.1.0
  - @taxkit/calculators@2.2.0

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

- Updated dependencies [cafcc71]
- Updated dependencies [b88ee2d]
- Updated dependencies [b533bc7]
  - @taxkit/observability@1.0.0
  - @taxkit/content@3.0.0
  - @taxkit/calculators@2.1.0

## 0.1.1

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

- 94e0362: Use one retained TaxKit analytics project for live and controlled preview events,
  with separate stage labels for reports. Close rejected analytics connections
  promptly and accept successful replies that have no body.
- 5f713b1: Correct cash take-home pay to deduct salary sacrifice as well as tax withholdings. Evaluate the complete PAYG coefficient formula before whole-dollar rounding, avoiding a one-dollar overcharge near half-dollar boundaries. Identify corrected pay calculations as rules-au-pay/1.0.1.

  Make BackendAnalyticsLive a static Layer that reads checked settings from the host ConfigProvider. Callers now provide configuration through the native provider instead of invoking a Layer factory.

- 1fea106: Reject documentation replies that do not match the requested page and keep Website settings available when its API binding fails.

  Separate native host composition, observability, MCP, analytics relay and discovery publication into their owning packages. Centralize API paths while preserving HTTP/RPC/MCP wire contracts, private calculation admission and telemetry privacy.

  Keep native modern MCP invocations alive through their existing work deadline after a client disconnect so calculation capacity is released reliably.

- Updated dependencies [dc9d0ba]
- Updated dependencies [501d419]
- Updated dependencies [20a9dcc]
- Updated dependencies [0d82b82]
- Updated dependencies [7dbd09b]
- Updated dependencies [ded95d3]
- Updated dependencies [bd9df35]
- Updated dependencies [48384d5]
- Updated dependencies [facca83]
- Updated dependencies [15bf685]
- Updated dependencies [02c813f]
- Updated dependencies [d39a16e]
- Updated dependencies [876b485]
- Updated dependencies [049b04f]
- Updated dependencies [737ffcd]
- Updated dependencies [1b85440]
- Updated dependencies [48f4681]
- Updated dependencies [72c8f42]
- Updated dependencies [59b0a36]
- Updated dependencies [4b75366]
- Updated dependencies [4b75366]
- Updated dependencies [1fea106]
  - @taxkit/content@2.0.0
  - @taxkit/calculators@2.0.0
  - @taxkit/observability@0.1.1
