# Closed calculator programs without an engine service

Status: Accepted for SDK 6.0.0. Supersedes the engine service, `TaxKitLive`
and engine-substitution parts of
[ADR 0011](0011-effect-native-sdk-contracts.md); the rest of ADR 0011 stands.

## Context

`CalculationEngine.run({ calculation, layer })` accepted any Effect and any
Layer and only called `Effect.provide`. Its optional validation input was never
passed, so its diagnostics were always replaced by `defineCalculator`. Rule
packages built `Layer.succeed(Scenario)(input)` inside every `calculate`, and
the SDK exported the engine as `TaxKitService` with a ready Layer that every
Effect consumer had to provide. This is the generic callback escape hatch the
repository's Effect guardrails reject: it had no semantic weight, owner-named
operation or behaviour to substitute.

## Decision

- `@taxkit/core` has no engine service. `defineCalculator` validates the rule
  graph once and wraps the owner's report program, attaching that
  definition's `CalculationDiagnostics` to every result.
- A definition's `calculate` is a closed program:
  `(input) => Effect<CalculationResult<Report>, CalculationError>`. The owning
  rule package composes its static rule-pack and scenario-fact Layers at module
  level and supplies only the checked scenario per call with
  `Effect.provideService`.
- `@taxkit/calculators` separates the catalogue (`CalculatorCatalogue`) from the
  one public service implementation, which owns the work budget, optional rate
  admission and the `CalculatorUsage` observer. Hosts choose a composition; no
  Layer acquires and rebuilds the service it provides.
- The SDK removes `TaxKitService`, `TaxKitLive`, `TaxKitEffectRequirements` and
  the core engine re-exports. Plain functions and `createClient()` keep their
  signatures; the named functions share one lazily created private host.

## Consequences

SDK Effect consumers delete `Effect.provide(TaxKitLive)`; tests substitute a
definition whose `calculate` returns a controlled result. Fact derivation still
builds the rule-pack Layer in each calculation's own scope, because facts are
derived from that calculation's scenario. This is a breaking `taxkit` release.
