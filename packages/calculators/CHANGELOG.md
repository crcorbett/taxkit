# @taxkit/calculators

## 0.1.0

### Minor Changes

- a3a39e7: Expose typed scenario-layer constructors for calculator composition, couple
  catalogue schemas to typed continuations, and simplify SDK report decoding.

### Patch Changes

- 2dc693a: Make package builds and release artifacts deterministic with clean compilation,
  dist-only publication exports, concrete packed dependency ranges, and
  Effect-native scoped validators for focused SDK artifacts and strict clean
  consumers across the complete TaxKit release package graph.
- 6b307e3: Upgrade the workspace package runtime and test contracts to the compatible
  Effect 4 beta.98 family and current schema, schedule, and runtime APIs while
  keeping calculation traces JSON-compatible at HTTP boundaries.
- Updated dependencies [a3a39e7]
- Updated dependencies [2dc693a]
- Updated dependencies [6b307e3]
  - @taxkit/rules-au-income-tax@0.1.0
  - @taxkit/rules-au-pay@0.1.0
  - @taxkit/core@0.1.0

## 0.0.4

### Patch Changes

- @taxkit/core@0.0.4
- @taxkit/rules-au-income-tax@0.0.4
- @taxkit/rules-au-pay@0.0.4

## 0.0.3

### Patch Changes

- @taxkit/core@0.0.3
- @taxkit/rules-au-income-tax@0.0.3
- @taxkit/rules-au-pay@0.0.3

## 0.0.2

### Patch Changes

- 984ced5: Add Effect Vitest coverage for public calculator service scenarios and
  in-process HTTP API calculator execution/error handling. The public calculate
  contract now exposes a canonical facts union while the calculator service
  validates facts again against the selected catalog entry schema.
- 0bb699b: Add the initial calculators workspace package shell with explicit exports,
  package docs and build/typecheck wiring for the upcoming reusable calculator
  service extraction. Move reusable public calculator schemas, catalog entries
  and metadata projection helpers from `@taxkit/http-api` into
  `@taxkit/calculators`, leaving HTTP route definitions and handler behavior
  compatible.
- d1d84c3: Add canonical `CalculatorId` and `Jurisdiction` brands, move AU public
  calculator IDs and supported jurisdiction/tax-year schemas into the owning AU
  rule packages, then compose those canonical exports in `@taxkit/calculators`.
  The calculator service no longer mirrors request context or revalidates context
  fields already narrowed by schemas. Public calculator input decode errors now
  use calculator-specific names.
- 08ab855: Add canonical CalculatorRun schema names for reusable calculator execution and keep PublicCalculation aliases transitional.
- d95715b: Move public calculator execution, graph validation and schema-guided expected
  error shaping into the reusable `@taxkit/calculators` service. HTTP handlers
  now delegate to `PublicCalculatorService`, and the HTTP route layer composes
  the calculator service with the core calculation engine once instead of inside
  requests.
- 8bd7c21: Document the final calculator run naming contract, HTTP-owned transport names, and dist-only SDK export map.
- Updated dependencies [d1d84c3]
- Updated dependencies [b632995]
  - @taxkit/core@0.0.2
  - @taxkit/rules-au-income-tax@0.0.2
  - @taxkit/rules-au-pay@0.0.2
