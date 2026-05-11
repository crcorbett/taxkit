# Effect TypeScript Patterns

WhatTax is an Effect-native TypeScript library. The code should make invalid
calculation states difficult to represent, keep official rule data separate
from algorithms, and expose enough metadata for graph validation, traces, and
documentation.

## Boundary Values

- Define externally visible values with `Schema`.
- Brand domain primitives that should not be mixed accidentally, such as fact
  IDs, rule IDs, component IDs, cents, rates, and tax years.
- Derive public TypeScript types from schemas with `typeof Schema.Type`.
- Decode unknown caller input at scenario or API boundaries with Effect Schema.
- Prefer `Schema.TaggedClass` or `Schema.TaggedStruct` when the value crosses a
  package boundary or appears in traces, ledgers, reports, or descriptors.

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

## Collections And Exhaustiveness

- Use Effect collections and algorithms for engine validation code:
  `Array`, `HashMap`, `HashSet`, `Option`, and `Graph`.
- Use `Graph.directed` directly for rule dependency graphs and Effect graph
  algorithms for cycle checks.
- Use `Match.value(...).pipe(..., Match.exhaustive)` for closed-domain
  dispatch over schema literal unions. Do not use `switch` in core or official
  rule packages.
- Prefer `Option.match` or explicit `Option.isSome` / `Option.isNone` handling
  over nullable lookups.

## Descriptor Discipline

- Every public input or derived fact needs a fact descriptor with a stable ID,
  title, authority, schema, and service tag.
- Caller-collected input facts should include question metadata. This metadata
  describes the question shape without introducing UI concerns.
- Official rules need rule descriptors with required/provided facts, layer,
  source policy, sources, and parameter descriptors.
- Parameter descriptors should identify the parameter service schema, tag, and
  source reference used by the rule.
- Graph validation must catch missing providers, duplicate providers, missing
  required sources, cycles, and parameter-source drift.

## Public Barrels

WhatTax is a public library, so explicit package entrypoints and package-local
barrels are allowed. Consumers should import from package export paths rather
than deep private files. Tooling should not force removal of these barrels
unless the public export map is redesigned at the same time.
