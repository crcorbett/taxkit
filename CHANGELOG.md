# TaxKit

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
