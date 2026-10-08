---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-core-architecture-owner
last_reviewed: 2026-10-06
review_trigger: graph, trace, ledger or encoded contract change
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

## Validation checks

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

[`TraceNode`](../../packages/core/src/trace/node.ts) is a recursive tagged
Struct codec. Its non-recursive fields have one private Schema owner; the
exported domain and encoded aliases add only their recursive children relation.
Inputs and results use checked `Schema.Json`, and source references reuse
`SourceRef`. No second interface repeats their fields.

The codec retains its historical field order and the distinction between a
missing optional key and a present undefined key. Schema encoding and decoding
own representation changes. The packed consumer checks nested traces and exact
legacy bytes. Formula and rounding use `Option<Option<Value>>`: outer None
means a missing key, Some(None) a present undefined key, and Some(Some(value))
a value. Constructor and recursive child inputs derive from the same field
owner. Their typed contract rejects incorrect ordinary fields and unbranded
rule IDs while preserving the historical encoded forms.


Trace output is part of the engine contract, not only debugging. It supports trust, auditability, contributor review and calculation explanation.

## Ledger Components

For additive annual-tax and pay calculations, use ledger components instead of hiding everything in one total.

```ts
export const LedgerComponent = Schema.TaggedStruct("LedgerComponent", {
  amount: Money,
  effect: ComponentEffect,
  id: ComponentId,
  label: Schema.String,
  status: ComponentStatus,
  trace: TraceNode,
});
export type LedgerComponent = typeof LedgerComponent.Type;
export type LedgerComponentEncoded = typeof LedgerComponent.Encoded;
```

`effect` is intentionally domain-neutral. The aggregator that consumes the components decides what additive/subtractive _means_ in context: a pay-withholdings aggregator treats `additive` as "more withheld → less take-home"; an annual-tax aggregator treats `additive` as "more tax owed". Sharing the value type across domains lets `sumLedgerComponents` and other ledger utilities live in `@taxkit/core/ledger`.

Ledgers make output explanation clearer because each component can be inspected independently. Disabled and zeroed components stay in the trace for auditability and do not affect the total.

`sumLedgerComponents` returns an Effect with `InvalidMoneyValue` when an
intermediate total cannot fit safe whole cents. A later component cannot undo
that failure. Rule aggregators yield the result and map it to their safe
calculation error. Informational, disabled and zeroed entries still contribute
no amount and remain available for explanation.

## Source References

Official rules and parameters should include source references. A rule with no source references should not be marked official.

Source references should identify:

- source type
- title
- URL or publication reference
- effective dates
- retrieval or review date
- table, section or schedule identifier when available
