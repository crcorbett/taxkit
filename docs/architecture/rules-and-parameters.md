---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: high
---

# Rules And Parameters

Rules are Effect `Layer`s. Metadata describes rules for tooling, but execution is driven by typed Effect dependencies.

## Rule Pattern

A rule provides one or more facts and requires facts or services through the `R` channel.

```ts
export const TaxablePayLive: Layer.Layer<
  TaxablePayFact,
  CalculationError,
  GrossPayFact | SalarySacrificeFact
> = Layer.effect(
  TaxablePayFact,
  Effect.gen(function* () {
    const grossPay = yield* GrossPayFact
    const salarySacrifice = yield* SalarySacrificeFact

    return deriveTaxablePay(grossPay, salarySacrifice)
  })
)
```

If a calculator still has `R != never` after rule and scenario layers are provided, the selected world is missing dependencies.

## Rule Descriptor

Descriptors are required for graph visualization, validation, explanation, documentation, API metadata and source references.

```ts
export interface RuleDescriptor<ROut, E, RIn> {
  readonly id: RuleId
  readonly title: string
  readonly domain: RuleDomain
  readonly provides: ReadonlyArray<FactDescriptor.Any>
  readonly requires: ReadonlyArray<FactDescriptor.Any>
  readonly layer: Layer.Layer<ROut, E, RIn>
  readonly effective: EffectivePeriod
  readonly sources: ReadonlyArray<SourceRef>
  readonly togglePolicy: RuleTogglePolicy
  readonly tracePolicy: TracePolicy
}
```

The descriptor must match the actual layer. CI graph validation should catch descriptor drift.

## Parameters Are Services

Parameter tables are services, not imported globals. Algorithms depend on parameter services.

```ts
export class AtoSchedule1Table
  extends Context.Tag("whattax/au/payg/AtoSchedule1Table")<
    AtoSchedule1Table,
    Schedule1Table
  >() {}

export const AtoSchedule1_2025_26_Live =
  Layer.succeed(AtoSchedule1Table, schedule1_2025_26)
```

This lets consumers swap tax-year parameters without changing algorithms.

```txt
PaygWithholdingLive
  requires TaxablePayFact
  requires TaxFreeThresholdClaimedFact
  requires AtoSchedule1Table
```

## Algorithm And Data Separation

Prefer:

```txt
PaygWithholdingLive
  + AtoSchedule1_2025_26_Live
  = AuPayg2025_26.Live
```

Avoid fusing a year's data table into a single opaque algorithm package.

## Rule Packs

A rule pack exports:

- `Live`: the composed layer
- `Descriptors`: facts, parameters and rules
- `Graph`: generated graph metadata
- `Sources`: source references
- `GoldenTests`: optional official examples and regression vectors

Example shape:

```ts
export namespace AuPayg2025_26 {
  export const Live = PaygWithholdingLive.pipe(
    Layer.provideMerge(TaxablePayLive),
    Layer.provideMerge(AtoSchedule1_2025_26_Live)
  )

  export const Descriptors = [...]
  export const Graph = makeRuleGraph(Descriptors)
  export const Sources = [...]
}
```

Do not use untyped plugin arrays as the primary composition model. Consumers should compose Effect layers.

## Data-First Rule Builders

Most yearly updates should be data changes plus golden tests. Prefer rule specs for common patterns:

```txt
marginal rate table
threshold rate table
coefficient formula
phase-in / phase-out
cap / floor
gross-up
annualise / periodise
loan amortisation
ledger component adjustment
aggregation
aggregation
```

Official rule updates should use schema-validated data tables and golden tests wherever possible.
