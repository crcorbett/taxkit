---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: high
---

# Graph, Trace And Ledgers

Effect `Layer` composition provides compile-time dependency tracking. Graph metadata provides runtime tooling, validation and explanation.

## Graph Metadata

The graph models facts, parameter services and rules.

```txt
GrossPayFact
SalarySacrificeFact
  -> TaxablePayRule
  -> TaxablePayFact
  -> PaygWithholdingRule
  -> PaygWithholdingFact
  -> NetPayRule
  -> NetPayFact
```

Use graph metadata for:

- cycle detection
- duplicate provider detection
- explanation order
- visual diagrams
- missing question planning
- rule toggle impact analysis
- impact analysis for package consumers
- package documentation

## Validation Gates

Graph validation should run in CI for official rule packages.

Required checks:

```txt
No cycles
No duplicate providers unless explicitly replaced
No missing required provider for selected goal
No invalid effective-date overlap
No official rule with missing source references
```

## Trace Tree

Every calculation should produce a trace tree. A trace records what rule ran, what it used, what it produced, how it rounded and which sources justify it.

```ts
export class TraceNode extends Schema.TaggedClass<TraceNode>()("TraceNode", {
  ruleId: RuleId,
  title: Schema.String,
  inputs: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  formula: Schema.optional(Schema.String),
  result: Schema.Unknown,
  rounding: Schema.optional(RoundingMode),
  sources: Schema.Array(SourceRef),
  children: Schema.Array(Schema.suspend(() => TraceNode)),
}) {}
```

Trace output is part of the engine contract, not only debugging. It supports trust, auditability, contributor review and calculation explanation.

## Ledger Components

For additive annual-tax and pay calculations, use ledger components instead of hiding everything in one total.

```ts
export const LedgerComponent = Schema.TaggedStruct("LedgerComponent", {
  id: ComponentId,
  label: Schema.String,
  amount: Money,
  effect: Schema.Literals(["additive", "subtractive", "informational"]),
  status: Schema.Literals(["active", "disabled", "zeroed"]),
  trace: TraceNode,
});
```

`effect` is intentionally domain-neutral. The aggregator that consumes the components decides what additive/subtractive _means_ in context: a pay-withholdings aggregator treats `additive` as "more withheld → less take-home"; an annual-tax aggregator treats `additive` as "more tax owed". Sharing the value type across domains lets `sumLedgerComponents` and other ledger utilities live in `@whattax/core/ledger`.

Ledgers make output explanation clearer because each component can be inspected independently. Disabled and zeroed components stay in the trace for auditability and do not affect the total.

## Source References

Official rules and parameters should include source references. A rule with no source references should not be marked official.

Source references should identify:

- source type
- title
- URL or publication reference
- effective dates
- retrieval or review date
- table, section or schedule identifier when available
