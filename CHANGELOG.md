# WhatTax

## 0.0.1

### Patch Changes

- Hardened the calculation engine with typed rule descriptor builders,
  date-level parameter effective periods, source artifact metadata, Effect
  BigDecimal-backed tax rates and coefficients, and a reusable
  `CalculationEngine` service.
- Introduced the fixed release-train versioning workflow so implemented
  `@whattax/*` packages can be installed as one compatible version set.

### Package Changelogs

- [`@whattax/core`](./packages/core/CHANGELOG.md)
- [`@whattax/http-api`](./packages/http-api/CHANGELOG.md)
- [`@whattax/rules-au-income-tax`](./packages/rules/au/income-tax/CHANGELOG.md)
- [`@whattax/rules-au-pay`](./packages/rules/au/pay/CHANGELOG.md)
- [`@whattax/rules-au-stsl`](./packages/rules/au/stsl/CHANGELOG.md)
- [`@whattax/testing`](./packages/testing/CHANGELOG.md)
- [`@whattax/tsconfig`](./packages/tsconfig/CHANGELOG.md)
