# @taxkit/sdk

## 0.1.0

### Patch Changes

- a3a39e7: Expose typed scenario-layer constructors for calculator composition, couple
  catalogue schemas to typed continuations, and simplify SDK report decoding.
- 2dc693a: Make package builds and release artifacts deterministic with clean compilation,
  dist-only publication exports, concrete packed dependency ranges, and
  Effect-native scoped validators for focused SDK artifacts and strict clean
  consumers across the complete TaxKit release package graph.
- 9814598: Add an SDK-owned downstream consumer validation command that builds and packs the SDK runtime closure, creates an external temp workspace, and reports release-blocking packed manifest protocols before claiming clean install readiness.
- Updated dependencies [a3a39e7]
- Updated dependencies [2dc693a]
- Updated dependencies [6b307e3]
  - @taxkit/calculators@0.1.0
  - @taxkit/rules-au-income-tax@0.1.0
  - @taxkit/rules-au-pay@0.1.0

## 0.0.4

### Patch Changes

- @taxkit/rules-au-income-tax@0.0.4
- @taxkit/rules-au-pay@0.0.4
- @taxkit/calculators@0.0.4

## 0.0.3

### Patch Changes

- @taxkit/rules-au-income-tax@0.0.3
- @taxkit/rules-au-pay@0.0.3
- @taxkit/calculators@0.0.3

## 0.0.2

### Patch Changes

- 765ea46: Migrate SDK and HTTP API calculator execution contracts to the canonical `CalculatorRun*` and `CalculatorServiceError` names.
- 24911a5: Rename calculator API and SDK Effect report helpers to clearer public names,
  and add an SDK Effect full-run helper that returns typed calculator run
  responses. The HTTP calculate route now delegates full-run execution through
  that SDK helper.
- 793ad00: Lock the SDK publish export map to dist files and expose canonical calculator run schemas from the schemas entrypoint.
- 7a8f5e9: Replace raw Effect cause storage in SDK safe errors with schema-backed public error details.
- f4bf6e6: Add strict typed calculation/module descriptors and the Effect-native calculator
  facade backed by `PublicCalculatorService`.
- 59fc66a: Move the public calculation HTTP API handler to consume the SDK Effect facade and extend SDK import-boundary checks to prove the HTTP API depends on the SDK, not the reverse.
- 0b4fe92: Add the browser-safe plain SDK facade, SDK-owned safe result errors, and typed Australian module helpers.
- 8bd7c21: Document the final calculator run naming contract, HTTP-owned transport names, and dist-only SDK export map.
- 877adc1: Prepare SDK package metadata for clean packed artifacts while keeping publication gated behind explicit release approval.
- c3e6497: Add the initial TypeScript SDK package scaffold with explicit browser-safe,
  Effect-native, AU and testing export paths. The package remains private while
  the typed facade, calculator execution and downstream validation are built in
  later SDK tasks.
- Updated dependencies [984ced5]
- Updated dependencies [0bb699b]
- Updated dependencies [d1d84c3]
- Updated dependencies [08ab855]
- Updated dependencies [b632995]
- Updated dependencies [d95715b]
- Updated dependencies [8bd7c21]
  - @taxkit/calculators@0.0.2
  - @taxkit/rules-au-income-tax@0.0.2
  - @taxkit/rules-au-pay@0.0.2
