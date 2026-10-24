# TaxKit

## 2.2.0

- Read typed dollar text as `Money` with `moneyFromDollarsText` in
  `taxkit/core`. It converts exactly to whole cents and fails with
  `InvalidDollarsText` and a `reason` (`empty`, `format` or `range`) that
  callers match for their own wording. `dollarsTextFromMoney` writes Money
  back, and `MoneyFromDollarsString` is a Schema codec with default messages.
- Documentation page responses in `taxkit/http` now include `body`, the page as
  checked reading blocks with highlighted code and server-drawn Mermaid
  diagrams. Existing page fields, calculations and dependencies are unchanged.
- The documentation site now reads plain MDX from `content/docs`. The API builds
  the docs catalogue ahead of time, so new API instances no longer parse pages
  on their first request.
- The API now renders documentation share images on request and serves the
  discovery files from `@taxkit/aeo`; a Markdown `Accept` preference at a
  documentation page redirects (307) to its `.md` file. The Website's logic
  moved into packages. The SDK's public entry points and calculations are
  unchanged.
- The native RPC endpoint, the no-JavaScript calculator form and the Website
  analytics relay are removed. Use the public HTTP API, its OpenAPI description
  or remote MCP. See the [SDK changelog](./packages/sdk/typescript/CHANGELOG.md).

## 2.1.3

- Remove obsolete package-name instructions from the SDK README and current
  maintainer documentation. Install `taxkit` and use its eight public entry
  points. Calculation code and dependencies are unchanged.

## 2.1.2

- Correct monthly PAYG and student-loan withholding for earnings ending in
  33 cents. Select the student-loan table using the tax-free-threshold answer
  and show the correct rule in calculation explanations. Pay reports identify
  the corrected rules as `rules-au-pay/1.0.2`.
- Release these fixes under the npm name `taxkit`. See the
  [SDK changelog](./packages/sdk/typescript/CHANGELOG.md).

## 2.1.1

- Publish the single SDK under the npm name `taxkit`. Install it with
  `npm install taxkit` and use the same eight entry points under `taxkit/*`.
  Calculations and runtime dependencies are unchanged. The existing
  `@taxkit/sdk@2.1.0` release remains available under its original name.
- Keep the repository root and all other workspace packages private; the
  private root is named `@taxkit/workspace` to avoid a duplicate package name.

## 2.1.0

- Prepare the first public `@taxkit/sdk` release as one package containing the
  engine, calculators, Australian rules and HTTP contracts. Use the root,
  `/au`, `/effect`, `/core` and `/http` entry points; existing SDK paths remain
  available. Effect is the only external runtime dependency. See the
  [SDK changelog](./packages/sdk/typescript/CHANGELOG.md).
- Include the MIT licence and npm package links. Other workspace packages
  remain private; the private docs examples receive their dependent patch
  version. Package publication runs locally after the release checks.

## 2.0.0

### Major Changes

- Version the ten-package release train together at `2.0.0`. Core and SDK
  callers now use checked money/date operations, Schema-owned Option values,
  static Layers and resource-owning SDK clients. See the generated
  [Core](./packages/core/CHANGELOG.md),
  [calculators](./packages/calculators/CHANGELOG.md) and
  [SDK](./packages/sdk/typescript/CHANGELOG.md) migration notes.
- Record the API's bounded calculation work, shared request allowance, safe
  errors, public documentation routes and native modern-only MCP transport.
  Website calculations use the native HTTP API; public content uses the
  reviewed cache policy. See the [API changelog](./apps/api/CHANGELOG.md) and
  [HTTP package notes](./packages/api/http/CHANGELOG.md).
- Include the corrected 2025–26 Medicare thresholds, salary-sacrifice
  deduction, PAYG rounding and zero-income handling in the versioned release.
  Independent ruleset identifiers remain separate from package versions;
  see the [income-tax](./packages/rules/au/income-tax/CHANGELOG.md),
  [pay](./packages/rules/au/pay/CHANGELOG.md) and
  [STSL](./packages/rules/au/stsl/CHANGELOG.md) notes.

### Package Versioning

- Process the 56 accumulated Changesets into 19 package versions and their
  changelogs. Packages outside the fixed release train keep their own versions.
  Every package remains private; npm publication is separate from this update.

## 1.0.0

### Major Changes

- Completed the breaking TaxKit identity cutover across package names,
  consumer imports, runtime configuration, local development domains and
  repository tooling. Current package consumers must use `@taxkit/*` and
  runtime configuration must use the `TAXKIT_` prefix; no compatibility aliases
  or legacy configuration fallbacks are provided.
- Preserved the existing engine, calculator, SDK and HTTP API behaviour while
  establishing the `1.0.0` TaxKit release train. Packages remain private and
  unpublished pending a separate publication approach.

### App Changelogs

- [TaxKit API](./apps/api/CHANGELOG.md)

### Package Changelogs

- [`@taxkit/core`](./packages/core/CHANGELOG.md)
- [`@taxkit/calculators`](./packages/calculators/CHANGELOG.md)
- [`@taxkit/api-http`](./packages/api/http/CHANGELOG.md)
- [`@taxkit/rules-au-income-tax`](./packages/rules/au/income-tax/CHANGELOG.md)
- [`@taxkit/rules-au-pay`](./packages/rules/au/pay/CHANGELOG.md)
- [`@taxkit/rules-au-stsl`](./packages/rules/au/stsl/CHANGELOG.md)
- [`@taxkit/sdk`](./packages/sdk/typescript/CHANGELOG.md)
- [`@taxkit/testing`](./packages/testing/CHANGELOG.md)
- [`@taxkit/tsconfig`](./packages/tsconfig/CHANGELOG.md)

## 0.0.1

### Patch Changes

- Added public calculator metadata and execution routes for the initial
  calculator catalog: take-home pay, PAYG withholdings and annual income tax.
  The public route model is calculator, fact, rule and graph driven rather than
  jurisdiction-route driven.
- Extracted reusable calculator orchestration into `@taxkit/calculators`, with
  HTTP handlers acting as thin transport adapters over the public calculator
  service.
- Hardened the calculation engine with typed rule descriptor builders,
  date-level parameter effective periods, source artifact metadata, Effect
  BigDecimal-backed tax rates and coefficients, and a reusable
  `CalculationEngine` service.
- Added the standalone Bun API runtime and initial public health/docs routes.
- Introduced the fixed release-train versioning workflow so implemented
  `@taxkit/*` packages can be installed as one compatible version set.

### App Changelogs

- [TaxKit API](./apps/api/CHANGELOG.md)

### Package Changelogs

- [`@taxkit/core`](./packages/core/CHANGELOG.md)
- `@taxkit/calculators`: pending first package changelog generation through
  the release-train Changeset workflow.
- [`@taxkit/api-http`](./packages/api/http/CHANGELOG.md)
- [`@taxkit/rules-au-income-tax`](./packages/rules/au/income-tax/CHANGELOG.md)
- [`@taxkit/rules-au-pay`](./packages/rules/au/pay/CHANGELOG.md)
- [`@taxkit/rules-au-stsl`](./packages/rules/au/stsl/CHANGELOG.md)
- [`@taxkit/testing`](./packages/testing/CHANGELOG.md)
- [`@taxkit/tsconfig`](./packages/tsconfig/CHANGELOG.md)
