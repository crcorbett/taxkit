# TaxKit API

## 2.0.3

### Patch Changes

- 990965c: Update Effect to 4.0.7 and Alchemy to beta.84, migrate the Cloudflare, Axiom and Doppler providers to their separate packages, and preserve the existing deployment identities. Keep telemetry authorization redacted through native planning and state migration.

  Keep the Website build hash focused on real workspace inputs, adopt the native redirect provider's refusal to write after a failed ruleset read, and regenerate OpenAPI with flattened unions and optional query parameters represented by omission rather than null.

  Use Alchemy's supported Node loader for local development and persist standalone native test bundles explicitly. Preserve HTTP 500 for internal Website faults and mismatched pages, while unavailable page reads retain their intended HTTP 503 through the updated TanStack error renderer.

  Refresh the remaining application, rendering, browser-test and development dependencies, including the native TypeScript compiler diagnostics and the SDK assembler's JavaScript compiler API.

- Updated dependencies [990965c]
  - @taxkit/api-http@3.1.2
  - @taxkit/infrastructure@1.1.3
  - @taxkit/aeo@0.1.3
  - @taxkit/api-mcp@0.2.4

## 2.0.2

### Patch Changes

- 148fee7: Share images are drawn when the API is built. `DocsOgImages` now reads one
  finished image by page address, and `@taxkit/og-image` exports the build-time
  `./archive` instead of the request-time `./live` cache.
- Updated dependencies [148fee7]
  - @taxkit/content@3.2.0
  - @taxkit/aeo@0.1.2
  - @taxkit/analytics@1.0.2
  - @taxkit/api-http@3.1.1
  - @taxkit/api-mcp@0.2.3
  - @taxkit/infrastructure@1.1.2

## 2.0.1

### Patch Changes

- Updated dependencies [6ff0743]
- Updated dependencies [889f0cf]
  - @taxkit/content@3.1.0
  - @taxkit/api-http@3.1.0
  - @taxkit/calculators@2.2.0
  - @taxkit/aeo@0.1.1
  - @taxkit/analytics@1.0.1
  - @taxkit/api-mcp@0.2.2
  - @taxkit/og-image@0.1.1
  - @taxkit/infrastructure@1.1.1

## 2.0.0

- Accept zero taxable income in the existing annual nil-rate band.

### Patch Changes

- Annual reports now identify `rules-au-income-tax/1.0.1`. The single-person
  2025–26 Medicare thresholds are corrected to $28,011/$35,013, with the enacted
  source and boundary tests; affected lower-income answers change. Other tax
  components and pay rules retain their results.
- Invalid present `API_PORT` values now fail with a safe settings error rather
  than silently using `PORT`. Normal defaults and valid overrides remain.
- Public-route smoke checks cover complete request deadlines, the OpenAPI
  calculate path and checked external-consumer evidence. Cancellation and
  timeout stop the child processes; failed temporary-folder cleanup fails the
  command and remains alongside earlier failures.

### Major Changes

- Generated native HTTP clients replace the former callable client/Layer
  helpers. Checked request and report types use Schema-owned Option values;
  the generated package changelog contains the TypeScript migration details.
- HTTP, RPC and MCP calls share bounded calculation work and the native host's
  request allowance. Fixed public errors cover request size, timeouts,
  capacity and rate limits without exposing rejected financial values.
- Remote MCP supports the modern `2026-07-28` protocol through Effect's native
  request-scoped transport. Legacy MCP sessions and their Durable Object
  namespace are retired. Website calculations use the native HTTP binding
  with a stage-owned forwarding credential and the original caller's allowance.
- Public documentation and discovery use checked HTTP routes, Production
  publication links and version-scoped caching for eligible public responses.
  Calculations, private responses and errors remain uncached.
- Calculation responses now expose the independent exact ruleset identifiers
  `rules-au-pay/1.0.0` and `rules-au-income-tax/1.0.0`. Calculator field errors
  keep their tagged shape, normalized paths and descriptor help while no longer
  echoing rejected values in issue messages.

## 1.0.0

### Major Changes

- Renamed API runtime configuration to the `TAXKIT_` environment prefix and
  the local development endpoint to `https://api.taxkit.localhost` as part of
  the TaxKit identity cutover. Public HTTP route paths, request schemas and
  response schemas are unchanged.

## 0.0.1

### Patch Changes

- Added `POST /api/v1/calculators/:calculatorId/calculate` for public
  calculator execution across take-home pay, PAYG withholdings and annual
  income tax, with schema-guided fact decode errors.
- Added public calculator metadata routes for jurisdictions, tax years,
  calculator discovery, calculator schema metadata, graph diagnostics, facts
  and rules.
- Added the standalone Bun API runtime for the public TaxKit HTTP surface.
- Added public API documentation routes for the initial health-check contract:
  `GET /api/docs` and `GET /api/docs/openapi.json`.
- Added `GET /api/health` as the initial API availability endpoint.
