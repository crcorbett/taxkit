# @taxkit/og-image

## 0.2.2

### Patch Changes

- Updated dependencies [786e719]
  - @taxkit/content@3.2.1

## 0.2.1

### Patch Changes

- 990965c: Update Effect to 4.0.7 and Alchemy to beta.84, migrate the Cloudflare, Axiom and Doppler providers to their separate packages, and preserve the existing deployment identities. Keep telemetry authorization redacted through native planning and state migration.

  Keep the Website build hash focused on real workspace inputs, adopt the native redirect provider's refusal to write after a failed ruleset read, and regenerate OpenAPI with flattened unions and optional query parameters represented by omission rather than null.

  Use Alchemy's supported Node loader for local development and persist standalone native test bundles explicitly. Preserve HTTP 500 for internal Website faults and mismatched pages, while unavailable page reads retain their intended HTTP 503 through the updated TanStack error renderer.

  Refresh the remaining application, rendering, browser-test and development dependencies, including the native TypeScript compiler diagnostics and the SDK assembler's JavaScript compiler API.

## 0.2.0

### Minor Changes

- 148fee7: Share images are drawn when the API is built. `DocsOgImages` now reads one
  finished image by page address, and `@taxkit/og-image` exports the build-time
  `./archive` instead of the request-time `./live` cache.

### Patch Changes

- Updated dependencies [148fee7]
  - @taxkit/content@3.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [6ff0743]
  - @taxkit/content@3.1.0
