---
"taxkit": major
"@taxkit/core": major
"@taxkit/calculators": major
"@taxkit/analytics": major
"@taxkit/api-http": major
"@taxkit/rules-au-pay": patch
"@taxkit/rules-au-income-tax": patch
---

Remove the generic calculation engine. Each calculator definition is now a
closed program: its owning rule package composes the static rule-pack Layer and
supplies only the checked scenario per call, and `defineCalculator` attaches
the graph diagnostics. `calculateReport` and `calculateRun` return Effects with
no requirements.

`taxkit/effect` no longer exports `TaxKitService`, `TaxKitLive` or
`TaxKitEffectRequirements`; `taxkit/testing` no longer exports
`TaxKitService`; `taxkit/core` no longer exports `CalculationEngine`,
`CalculationEngineLive`, `CalculationEngineService` or `CalculationRequest`.
Delete `Effect.provide(TaxKitLive)` and substitute a calculator definition in
tests instead of mocking the engine. Plain `calculate`, `calculateSafe`, `run`
and `createClient()` keep their signatures; the named functions now share one
lazily created private host instead of building a runtime per call.

Internally, the public calculator service has one implementation over a
separate `CalculatorCatalogue` with its work budget, optional rate admission
and a `CalculatorUsage` observer (supplied by analytics as
`ApiCalculatorUsageLive`), replacing the service decorators. The unused
`@taxkit/api-http/config` export is removed.
