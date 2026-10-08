---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-rules-and-parameters-owner
last_reviewed: 2026-10-06
review_trigger: rule Layer, descriptor, parameter or rule-pack composition change
---

# Rules and parameters

Rules are Effect Layers that produce named facts from other facts and parameter
services. Descriptors explain that graph; the typed dependencies drive execution.

## Rule pattern

The current [TaxablePayLive](../../packages/rules/au/pay/src/rules/taxable-pay.ts)
uses `Layer.effect(TaxablePayFact)(...)` and reads `GrossPayFact` inside its
Effect. It produces canonical `TaxablePay` with a `TraceNode`. In the retained
implementation taxable pay equals gross pay: salary sacrifice is not yet part
of this rule. Do not describe a proposed input as an existing dependency.

After the rule pack and scenario Layers are supplied, a calculator must have no
remaining dependencies. A missing fact or parameter remains visible in Effect's
required service type.

## Rule descriptors

Reuse `RuleDescriptor` and `makeRuleDescriptor` from `@taxkit/core`.
The [descriptor owner](../../packages/core/src/rules/descriptor.ts) ties the
Layer's output, errors and required services to readonly fact/parameter
descriptors. It owns branded rule IDs, titles, source references and the
`required` or `not-required` source policy. Do not maintain a second descriptor
interface or add fields that the owning contract does not expose.

Descriptors must match the actual Layer. The core graph validator and owning
rule-pack tests check missing dependencies, competing providers and source
requirements; static descriptor metadata alone is not execution proof.

## Parameter services

A parameter table belongs to its own service, separate from the algorithm that
uses it. The current [Schedule 1 owner](../../packages/rules/au/pay/src/parameters/schedule1.ts)
defines checked rows, a table Schema and the service:

```ts
export class AtoSchedule1Table extends Context.Service<
  AtoSchedule1Table,
  Schedule1Table
>()("taxkit/rules-au-pay/parameter/AtoSchedule1Table") {}
```

This is an excerpt from the owning module. Its `AtoSchedule1_2025_26_Live`
Layer supplies the canonical table. PAYG algorithms require the service rather
than reading a year-specific table from a global variable.

Parameter descriptors include source references and the table's effective
tax-year period. Graph validation reports overlapping periods for different
descriptors with the same parameter ID, preventing two competing tables from
silently supplying the same service and year.

The core date codec retains missing, explicitly undefined and present end keys
while domain readers use Option. Both representations check start-before-end;
an absent end remains unbounded. The [core owner](../../packages/core/README.md)
explains the two Option levels and the fallible date helpers. Authored tables
assemble trusted constants through their owning Schemas. Rule calculations
check newly derived constrained amounts through fallible constructors and map
expected failures to safe `CalculationError` values. This does not change the
retained table values or expand supported tax years.

## Whole parameter relationships

The row and table Schemas own their relationships as well as individual fields.
Income-tax and LITO brackets begin at a zero threshold, have ordered adjacent
bounds and end with an open bound. Schedule 1 and STSL use inclusive weekly cent
ranges; each Schedule 1 scale is checked separately. Their local rate/multiplier
checks admit zero through one, while generic core decimal brands stay open.
Schedule 1 dollar coefficients remain signed. Medicare checks threshold order
and a positive full levy rate no greater than its shade-in rate, both at most
one; it does not infer exact continuity from published rounded cutoffs.

Each class-row array derives its saved form through the owning row Schema and
checks coverage on saved and decoded arrays with one shared predicate. A check
on an array of decoded class rows alone disappears under `Schema.toEncoded`.
The shared check prevents a saved table with gaps, overlaps, missing scales or
an open middle row from passing representation validation. Valid saved bytes,
source artifacts, retained tax results and supported years are unchanged.

## Rule packs

A rule pack composes existing Layers and keeps descriptors, sources and golden
examples with their owning modules. Reuse the actual public exports; a pack
does not require a namespace containing duplicate metadata or a made-up graph
builder.

The current [take-home-pay pack](../../packages/rules/au/pay/src/rule-pack/au-take-home-pay-2025-26.ts)
composes:

```ts
export const AuTakeHomePay2025_26_Live = NetPayLive.pipe(
  Layer.provideMerge(PayWithholdingsLedgerLive),
  Layer.provideMerge(PaygWithholdingLive),
  Layer.provideMerge(TaxablePayLive),
  Layer.provideMerge(AtoSchedule1_2025_26_Live)
);
```

This excerpt uses the owning module's imports. The caller supplies
`GrossPayFact` and `TaxFreeThresholdClaimedFact` through its scenario Layer.
The base withholding ledger includes PAYG only; a pack adding STSL replaces
that ledger with the owner that requires both components. Compose typed Layers
rather than using untyped plugin arrays.

## Algorithm and data separation

Keep a year's checked parameter data separate from the reusable algorithm.
A yearly change can then update that data and its source references while
focused tests check the resulting calculation. Changes to formulas, thresholds,
rounding or supported inputs still require rule review and golden-result proof.

Use schema-checked data tables where they express the actual rule, including
marginal rates, coefficient formulas, caps and ledger components. Add a shared
rule builder only when it owns repeated policy and makes the call graph simpler;
the [abstraction admission owner](../design-docs/abstraction-admission.md)
defines that review.


Rule descriptors always expose a parameter array. Their ordinary metadata fields
derive from Core-owned Schemas, while their Layer and provided/required service
tuples remain tied to each descriptor's native service identity. A missing
duplicate-provider permission and explicit false both reject multiple unpermitted
providers; explicit true retains the existing permission. Parameter source
artifacts use Option. Checked effective-period values retain their date content.
See the [Core owner](../../packages/core/README.md) for these constructor contracts.
