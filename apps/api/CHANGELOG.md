# TaxKit API

## 3.0.0

### Major Changes

- b533bc7: Remove the public native RPC endpoint at POST `/rpc` and the private
  `@taxkit/api-rpc` package. Machine callers use the public HTTP API, its
  OpenAPI description or remote MCP, which keep the same calculator and
  documentation operations, limits and errors. `@taxkit/api-http/routes` no
  longer exports `rpcPath`, `RpcRoutePath` or `isTrustedCalculationPath`, and
  host request records no longer use the `rpc` route family. Shared calculator
  test fixtures move to `@taxkit/calculators/testing/fixtures`.

### Minor Changes

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

- b88ee2d: Documentation pages now come from plain MDX in `content/docs` (`@content/docs`)
  instead of a Fumadocs build. The API bundles the pages as raw text and
  `@taxkit/content` builds the checked catalogue once per Worker isolate. Nothing
  is generated before planning or deploying.

  Each public page now carries `body`, a checked list of reading blocks:
  headings with ids, paragraphs, lists, tables, highlighted code as coloured
  tokens, and Mermaid diagrams as SVG. The Website renders that body directly, so
  it no longer compiles MDX. The processed Markdown is written from the same body.

  `@taxkit/content` declares the contracts it consumes: `DocsPageReader` and
  `DocsCodeHighlighter`, implemented by the new `@taxkit/mdx` package with
  `@pierre/highlights`, and `DocsDiagramRenderer`, implemented by the new
  `@taxkit/diagrams` package with `beautiful-mermaid`. Diagrams no longer need a
  browser to render. The private `@taxkit/docs-content` and
  `@taxkit/docs-fumadocs` packages, the `docs:validate` command and the MDX lint
  rule are removed; API and examples tests now check the sources, wording, links
  and copied snippets.

### Patch Changes

- Updated dependencies [cafcc71]
- Updated dependencies [221ee31]
- Updated dependencies [b88ee2d]
- Updated dependencies [b533bc7]
  - @taxkit/analytics@1.0.0
  - @taxkit/observability@1.0.0
  - @taxkit/infrastructure@1.1.0
  - @taxkit/core@2.1.0
  - @taxkit/content@3.0.0
  - @taxkit/api-http@3.0.0
  - @taxkit/mdx@0.2.0
  - @taxkit/diagrams@0.2.0
  - @taxkit/calculators@2.1.0
  - @taxkit/api-mcp@0.2.1
  - @taxkit/publication@1.0.2

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
