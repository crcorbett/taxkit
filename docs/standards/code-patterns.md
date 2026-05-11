# Code Patterns

WhatTax is an Effect-native TypeScript library. Code should make invalid
calculation states difficult to represent, keep official rule data separate
from algorithms, and expose enough metadata for graph validation, traces, and
documentation.

## Boundary Values

- Define externally visible values with `Schema`.
- Brand domain primitives that should not be mixed accidentally, such as fact
  IDs, rule IDs, component IDs, cents, rates, tax years, and effective periods.
- Derive public TypeScript types from schemas with `typeof Schema.Type`.
- Decode unknown caller input at scenario and API boundaries with Effect Schema.
- Prefer `Schema.TaggedClass` or `Schema.TaggedStruct` when a value crosses a
  package boundary or appears in traces, ledgers, reports, or descriptors.

```ts
export const TaxYear = Schema.String.pipe(Schema.brand("whattax/TaxYear"));
export type TaxYear = typeof TaxYear.Type;

export const taxYear = (value: string): TaxYear => TaxYear.make(value);
```

## Effects, Layers, And Services

- Rules are `Layer`s. Algorithms should require facts and parameter services
  through the Effect environment.
- Parameter tables are `Context.Service` values supplied by year-specific
  parameter layers.
- Scenario helpers may accept `unknown`, but they must decode before providing
  facts.
- Calculation failures should use typed tagged errors, normally
  `CalculationError`, rather than `throw` or `Effect.die`.
- Keep caller-provided facts, derived facts, and parameter services distinct in
  both types and descriptors.

```ts
export const TaxablePayLive = Layer.effect(TaxablePayFact)(
  Effect.gen(function* () {
    const gross = yield* GrossPayFact;
    return new TaxablePay({
      amount: gross.amount,
      period: gross.period,
      trace: TraceNode.make(...),
    });
  })
);
```

## Collections And Algorithms

Engine validation code should use Effect collections and algorithms. They keep
the code consistent with the rest of the Effect ecosystem and avoid ad hoc
nullable or mutable JavaScript collection patterns in core logic.

### `Array`

Use `Array.reduce`, `Array.map`, `Array.filter`, and `Array.findFirst` when
folding descriptors or constructing validation issues.

```ts
const missingProviderIssues = Array.reduce(
  rules,
  Array.empty<GraphValidationIssue>(),
  (issues, rule) =>
    Array.reduce(rule.requires, issues, (updatedIssues, required) => {
      const key = factKey(required);
      return hasProvider(key)
        ? updatedIssues
        : Array.append(updatedIssues, missingProvider(rule, key));
    })
);
```

### `HashMap`

Use `HashMap` for descriptor indexes where the key is a branded ID.

```ts
const providers = Array.reduce(
  rules,
  HashMap.empty<FactId, readonly AnyRuleDescriptor[]>(),
  (byFact, rule) =>
    Array.reduce(rule.provides, byFact, (updatedByFact, provided) => {
      const existing = HashMap.get(updatedByFact, provided.id);
      const next = Option.isSome(existing)
        ? Array.append(existing.value, rule)
        : Array.of(rule);

      return HashMap.set(updatedByFact, provided.id, next);
    })
);
```

### `HashSet`

Use `HashSet` for stable membership checks, especially input facts and official
source references.

```ts
const inputFacts = HashSet.fromIterable(
  Array.map(
    args.inputFacts ?? Array.empty<AnyFactDescriptor>(),
    (fact) => fact.id
  )
);

const isInputFact = HashSet.has(inputFacts, required.id);
```

### `Option`

Use `Option.match`, `Option.isSome`, or `Option.isNone` for lookups. Do not
encode missing values with `undefined` branches in validation algorithms.

```ts
const row = Array.findFirst(
  table.rows,
  (candidate) => weeklyCents >= candidate.weeklyMinCents
);

return Option.match(row, {
  onNone: () => Effect.fail(new CalculationError({ message: "missing row" })),
  onSome: Effect.succeed,
});
```

### `Graph`

Use `Graph.directed` directly for dependency graphs and Effect graph algorithms
for validation.

```ts
const graph = Graph.directed<FactId, string>((mutable) => {
  const gross = Graph.addNode(mutable, GrossPayDescriptor.id);
  const taxable = Graph.addNode(mutable, TaxablePayDescriptor.id);
  Graph.addEdge(mutable, gross, taxable, "gross -> taxable");
});

const isAcyclic = Graph.isAcyclic(graph);
```

## Exhaustiveness

Use `Match.value(...).pipe(..., Match.exhaustive)` for closed-domain dispatch
over schema literal unions. Do not use `switch` in core or official rule
packages.

```ts
export const scaleWeeklyWithholdingToPayPeriodDollars = (
  weekly: number,
  period: PayPeriod
): number =>
  Match.value(period).pipe(
    Match.when("weekly", () => weekly),
    Match.when("fortnightly", () => weekly * 2),
    Match.when("monthly", () => Math.round((weekly * 13) / 3)),
    Match.exhaustive
  );
```

## Descriptor Discipline

- Every public input or derived fact needs a fact descriptor with a stable ID,
  title, authority, schema, and service tag.
- Caller-collected input facts should include question metadata. This metadata
  describes the question shape without introducing UI concerns.
- Official rules need rule descriptors with required/provided facts, layer,
  source policy, sources, and parameter descriptors.
- Parameter descriptors must identify the schema, tag, source reference, and
  effective period used by the rule.
- Graph validation must catch missing providers, duplicate providers, missing
  required sources, parameter-source drift, parameter effective-period overlap,
  and cycles.

## Public Exports

Use explicit named exports in package entrypoints. Avoid `export *` barrels:
Ultracite's `oxc/no-barrel-file` rule is enabled because explicit exports make
public API shape clearer and help bundlers avoid loading unrelated modules.
