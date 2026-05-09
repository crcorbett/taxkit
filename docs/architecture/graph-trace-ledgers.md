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
  children: Schema.Array(Schema.suspend(() => TraceNode))
}) {}
```

Trace output is part of the engine contract, not only debugging. It supports trust, auditability, contributor review and calculation explanation.

## Ledger Components

For additive annual-tax and pay calculations, use ledger components instead of hiding everything in one total.

```ts
export class TaxComponent extends Schema.TaggedClass<TaxComponent>()(
  "TaxComponent",
  {
    id: ComponentId,
    label: Schema.String,
    amount: Money,
    effect: Schema.Literal(
      "increase-tax",
      "decrease-tax",
      "information-only"
    ),
    status: Schema.Literal("active", "disabled", "zeroed"),
    trace: TraceNode
  }
) {}
```

Ledgers make output explanation clearer because each additive component can be inspected independently.

## Source References

Official rules and parameters should include source references. A rule with no source references should not be marked official.

Source references should identify:

- source type
- title
- URL or publication reference
- effective dates
- retrieval or review date
- table, section or schedule identifier when available
