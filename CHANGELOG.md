# WhatTax

## 0.0.1

### Patch Changes

- Added public calculator metadata and execution routes for the initial
  calculator catalog: take-home pay, PAYG withholdings and annual income tax.
  The public route model is calculator, fact, rule and graph driven rather than
  jurisdiction-route driven.
- Hardened the calculation engine with typed rule descriptor builders,
  date-level parameter effective periods, source artifact metadata, Effect
  BigDecimal-backed tax rates and coefficients, and a reusable
  `CalculationEngine` service.
- Added the standalone Bun API runtime and initial public health/docs routes.
- Introduced the fixed release-train versioning workflow so implemented
  `@whattax/*` packages can be installed as one compatible version set.

### App Changelogs

- [WhatTax API](./apps/api/CHANGELOG.md)

### Package Changelogs

- [`@whattax/core`](./packages/core/CHANGELOG.md)
- [`@whattax/http-api`](./packages/http-api/CHANGELOG.md)
- [`@whattax/rules-au-income-tax`](./packages/rules/au/income-tax/CHANGELOG.md)
- [`@whattax/rules-au-pay`](./packages/rules/au/pay/CHANGELOG.md)
- [`@whattax/rules-au-stsl`](./packages/rules/au/stsl/CHANGELOG.md)
- [`@whattax/testing`](./packages/testing/CHANGELOG.md)
- [`@whattax/tsconfig`](./packages/tsconfig/CHANGELOG.md)
