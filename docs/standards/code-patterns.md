# Code Patterns

TaxKit is an Effect-native TypeScript library. Code should make invalid
calculation states difficult to represent, keep official rule data separate
from algorithms, and expose enough metadata for graph validation, traces, and
documentation.

Effect-native primitives are mandatory where they fit. Use `Data`, `Schema`,
`Array`, `Chunk`, `HashSet`, `HashMap`, `Match`, `Context`, `Layer`, `Config`,
`Service`, `Record`, `Result`, `Exit`, `Bun`, `Platform`, `Command` and
`ManagedRuntime` before reaching for ad hoc standard TypeScript equivalents.

## Boundary Values

- Define externally visible values with `Schema`.
- Brand domain primitives that should not be mixed accidentally, such as fact
  IDs, rule IDs, component IDs, cents, rates, tax years, and effective periods.
- Derive public TypeScript types from schemas with `typeof Schema.Type`.
- Reuse canonical schema-derived types, branded ids, service tags, tagged
  errors and constructors from the owning package. Do not mirror canonical
  fields as local primitives such as `id: string` outside the owning
  schema/type source.
- Decode unknown caller input at scenario and API boundaries with Effect Schema.
- Prefer `Schema.TaggedClass` or `Schema.TaggedStruct` when a value crosses a
  package boundary or appears in traces, ledgers, reports, or descriptors.

```ts
export const TaxYear = Schema.String.pipe(Schema.brand("taxkit/TaxYear"));
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
- Decimal tax rates and official formula coefficients should use Effect
  `BigDecimal`-backed primitives, not plain JavaScript numbers.
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
encode missing values with `undefined` or `null` branches in validation
algorithms.

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

For optional request fields, model optionality with `Schema.optional` and
normalize at the boundary into `Option` when branching is needed. Code MUST NOT
use `value ?? "AU"` or similar defaults to invent jurisdiction, tax year or
calculator context. Missing context MUST remain missing unless an owning schema
explicitly defines a default. Nullable inputs MUST be modeled with
`Schema.NullOr` or a schema transform and normalized with
`Option.fromNullable`; code MUST NOT compare directly against `null`.

```ts
const requestedJurisdiction = Option.fromNullable(payload.jurisdiction);

return requestedJurisdiction.pipe(
  Option.match({
    onNone: () => Effect.fail(new MissingCalculatorContextError(...)),
    onSome: (jurisdiction) =>
      jurisdiction === entry.context.jurisdiction
        ? Effect.void
        : Effect.fail(new UnsupportedCalculatorContextError(...)),
  })
);
```

## Functional Composition

Code MUST use pipe-first composition for transformations and service pipelines
when data flow is clearer left-to-right. Do not use nested wrapper calls such
as `toFactsResponse(filterCalculatorEntries(query))` when the same logic reads
left-to-right:

```ts
query.pipe(filterCalculatorEntries, toFactsResponse);
```

Use named reusable operations only when they own a real policy or are reused.
Do not extract tiny one-off wrappers just to hide a single function call.

Service contract files MUST NOT export `Live`, `Mock` or `Test` layers. Keep
`service.ts` focused on the `Context.Service` contract and canonical
schemas/types. Put production wiring in `live.layer.ts` and test wiring in
`test.layer.ts` or test helpers.

## Optional Object Shapes

Code MUST use schema-owned optional keys to model optional output fields. Code
MUST NOT build objects with conditional spread blocks such as:

```ts
{
  ...(includeHelp ? { help } : {})
}
```

Instead, construct the schema-backed value with the optional field set to an
`Option`-derived value or left as the schema's optional absence in one clear
callsite. If the conditional shape becomes complex, the policy MUST move into
the owning service method and the handler MUST remain a service call.

## Schema Issue Formatting

Schema issue path formatting is boundary policy. Code MUST NOT inline ad hoc
checks such as `typeof segment === "object" && "key" in segment` inside
handlers. Represent path segments with an owning schema/type and format them in
the service or schema-error module using Effect primitives such as `Array`,
`Option` and `Match`.

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
- Effective periods use half-open ISO date intervals so mid-year official
  changes can be represented precisely.
- Official parameter descriptors should include `SourceArtifact` metadata with a
  checksum, retrieval date, document version, and extracted row shape.
- Graph validation must catch missing providers, duplicate providers, missing
  required sources, parameter-source drift, parameter effective-period overlap,
  and cycles.

## Calculation Engine

Core orchestration should use the `CalculationEngine` service. Consumers select
the calculation program, rule-pack layer, and scenario layer; the engine provides
the environment and returns the report with diagnostics.

```ts
import { CalculationEngine, CalculationEngineLive } from "@taxkit/core/engine";
import { Effect, Layer } from "effect";

const program = Effect.gen(function* () {
  const engine = yield* CalculationEngine;
  return yield* engine.run({
    calculation: CalculateTakeHomePay,
    layer: AuTakeHomePay2025_26_Live.pipe(
      Layer.provideMerge(TakeHomeScenarioLive(input))
    ),
  });
}).pipe(Effect.provide(CalculationEngineLive));
```

## Public Exports

Use explicit named exports in package entrypoints. Avoid `export *` barrels:
Ultracite's `oxc/no-barrel-file` rule is enabled because explicit exports make
public API shape clearer and help bundlers avoid loading unrelated modules.

## Runtime And HTTP API Patterns

Use `HttpApi`, `HttpApiGroup`, `HttpApiEndpoint` and
`HttpApiBuilder.group(...)` for HTTP contracts and handlers. API packages
expose contract, handler and route layers; app packages provide platform
runtimes and runtime config.

Use `ManagedRuntime.make(...)` for module-scoped web/server-client runtimes and
`BunRuntime.runMain(...)` for Bun process entrypoints. Do not create runtimes
inside request handlers, route loaders, React components, package services or
calculator orchestration code.
