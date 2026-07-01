# @whattax/sdk

## 0.0.3

### Patch Changes

- @whattax/rules-au-income-tax@0.0.3
- @whattax/rules-au-pay@0.0.3
- @whattax/calculators@0.0.3

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
  - @whattax/calculators@0.0.2
  - @whattax/rules-au-income-tax@0.0.2
  - @whattax/rules-au-pay@0.0.2
