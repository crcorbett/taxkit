---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Effect services

WhatTax uses Effect services, layers, schemas and tagged errors as the default
shape for deterministic tax calculation boundaries.

## Scope

This doc owns cross-package Effect service conventions. Rule-specific service
contracts live with their owning rule packages and should link back here.

## Service shape

Prefer package-owned `Context.Tag` services with explicit dependencies through
the Effect `R` channel. Do not hide rule, parameter or runtime dependencies in
module globals.

Core service categories:

- fact providers for accepted input facts
- parameter services for tax-year tables and constants
- rule layers that derive facts from facts and parameters
- calculator programs that require facts and return schema-backed reports
- calculator, API and SDK services that adapt transport, CLI or plain-client
  inputs to engine inputs

Public calculator services should live in `packages/calculators`, not HTTP
handler modules. A calculator service method should own calculator lookup,
context validation, metadata projection, graph diagnostics, scenario layer
composition, `CalculationEngine` execution and expected error shaping. HTTP
handlers should only pass route input to the service and return the resulting
schema-backed value or tagged error envelope.

## Effect-native primitives

WhatTax code MUST use Effect-native primitives and platform APIs when they fit
the problem. This is a consistency and reliability rule, not a style
preference.

Use:

- `Data`, `Schema`, `Schema.TaggedClass`, `Schema.TaggedStruct`,
  `Data.TaggedClass` and `Data.TaggedError` for domain values and expected
  errors.
- `Array`, `Chunk`, `HashSet`, `HashMap`, `Record`, `Option`, `Result`,
  `Exit` and `Match` for collection processing, lookup results, closed-domain
  dispatch and program results.
- `Context`, `Context.Service`, `Layer`, `Config`, `ConfigProvider`,
  `ManagedRuntime`, Bun runtime/platform APIs and `Command` for dependency
  injection, configuration, app runtime lifecycle and process/platform work.

Do not fall back to ad hoc classes, manual `_tag` object literals, mutable
JavaScript `Map`/`Set` indexes, nullable lookups, `switch`, `Object.values`,
`Object.entries`, custom env parsing, manual process signal orchestration,
request-local runtime creation or hand-rolled runtime wrappers when Effect
owns the pattern.

For optional request values, use schema optionality plus `Option`/`Match` at
the service boundary. Code MUST NOT use undefined checks and defaulting such
as `payload.jurisdiction ?? "AU"` to invent missing calculator context.
Missing context MUST either remain absent, be decoded by a schema that
explicitly owns the default, or fail with a tagged expected error.

Code MUST use pipe-first composition for readable Effect and data pipelines
when it keeps the source value visible and data flow clearer, for example
`query.pipe(filterCalculatorEntries, toFactsResponse)`. Do not nest
transformations in wrapper calls when a left-to-right pipeline makes ownership
and flow clearer.

## Runtime composition

Use `ManagedRuntime.make(...)` for module-scoped app runtimes that run many
Effects against the same fully provided service graph, such as web SSR and
browser client runtimes. Do not create a `ManagedRuntime` inside route loaders,
React components, request handlers or per-operation helpers.

Use `@effect/platform-bun/BunRuntime.runMain(...)` for Bun process entrypoints
where the root Effect is the process lifecycle. Process entrypoints should
compose config, platform layers and server layers, then let Effect
interruption/scopes release resources.

## Callsite error handling

One-off Effect error handling MUST stay at the callsite. Error transformations
MUST live directly beside the operation whose failure is being transformed:

```ts
program.pipe(
  Effect.mapError(
    (cause) =>
      new BoundaryError({
        cause,
        message: `Failed to load boundary config: ${cause.message}`,
      })
  )
);
```

Do not extract one-off helpers such as `mapConfigError`, `toBoundaryError` or
`createRuntimeLayer` only to wrap a single `Effect.mapError`, `Effect.catchTag`,
`Effect.catchAll` or `Effect.catchAllDefect` call. Extraction is allowed only
when the helper is reused across boundaries, owns a real policy, or materially
reduces complex duplication.

## Boundary-only decoding

Decode a value only when it crosses an explicit trust or type-erasure boundary.
After an owning `Schema` has produced its schema-derived type, internal code
must pass that type inward without decoding it again. This is a contract rule;
it is not permission to replace Schema with casts, manual guards or object
readers.

Executable decoding belongs at one of these boundaries:

- external input from HTTP, configuration, environment, storage, files,
  serialised server/client transport or another process
- an exported API that intentionally accepts `unknown`
- normalisation of representation-level data supplied by an external library
- dynamic catalogue or descriptor selection, where heterogeneous storage has
  erased the selected schema's concrete type
- a focused boundary test that proves one of these behaviours

Do not decode between internal services, as defensive validation of an already
typed parameter, inside ordinary rule or calculator code, or merely to build a
unit-test fixture. A repeated or internal decoder is implementation work, not a
new boundary to allowlist.

For dynamic catalogue and descriptor dispatch, a policy-owning generic
constructor must close over both the selected schema and the continuation that
accepts `InputSchema["Type"]` before heterogeneous storage erases that generic.
Do not recover the concrete type with an unsafe cast or by passing the decoded
value through an `unknown` callback. The selected calculator input decoder and
SDK report decoder are examples of required type-erasure boundaries.

Keep each boundary operation linear. Start with the canonical decoder, map its
expected `Schema.SchemaError` inline where that boundary owns the public error
context, then continue with the typed value in one readable `pipe` or
`Effect.gen` program. Preserve unrelated typed errors; do not use broad
`Effect.catchAll`, `Effect.orDie`, raw Promise control flow or nested runtime
execution to bridge a decoder. An app entrypoint, route loader or plain SDK
facade may run a completed Effect through its existing module-scoped runtime at
the outer edge only.

Do not extract one-use fragments such as `decodePayload`, `mapDecodeError`,
`runDecoder`, `withDecodedInput` or generic `decodeOrFail`. A shared helper is
appropriate only when it owns real, repeated policy, such as the generic
catalogue constructor that preserves schema-to-continuation coupling. Review
helper reuse and ownership in the required three audit passes rather than
adding a brittle function-size rule.

`whattax/no-decoding-outside-boundaries` will enforce decoder placement once
the boundary-only decoding rollout reaches its lint slice. Its exact file
allowlist belongs only in `oxlint.config.ts`; this architecture page owns the
categories and review contract, not a duplicate path list. Until that rollout
lands, use the active decoder inventory and this contract during review.

## Guardrails

- Use `Effect.Schema` for boundary and persisted values.
- Schemas and tagged value shapes MUST live in colocated `schemas.ts` files, or
  in the owning package's public schema module. Exported types MUST be derived
  from those schemas. Runtime and handler files should compose services and
  layers, not define or duplicate reusable shapes inline.
- Canonical ids, branded scalar fields, request/response shapes, facts,
  descriptors and tagged values MUST be declared once by the owning package.
  Consumers MUST import and reuse the owning schema, type, constructor, service
  tag or branded id. Do not redeclare canonical fields as local primitives such
  as `id: string`, `ruleId: string` or object mirrors outside the owning
  schema/type source.
- Use `Layer` composition for rule packs and scenario inputs.
- Keep parameter data separate from algorithms.
- Use tagged errors for expected domain failures.
- Expected domain and API failures MUST remain in the typed Effect error
  channel. Do not use `Effect.die` for schema decode failures,
  `CalculationError`, unsupported calculator/context errors, config decode
  failures or other recoverable service-contract errors. Reserve defects for
  impossible states outside the declared contract.
- Manual `_tag` object literals are not allowed. Tagged values MUST be
  constructed with `Data.TaggedClass`, `Data.TaggedError`,
  `Schema.TaggedClass`, or an owning package constructor built from those
  primitives.
- Keep one-off error mapping and transformation logic inline at the callsite;
  tiny mapper or wrapper helpers are not allowed.
- Avoid local DTO mirrors when an owning schema already exists.
- MUST use schema-owned optional fields instead of conditional object-spread
  transforms for response shaping. Complex response-shaping policy MUST live in
  the owning service package, not an HTTP handler.
- Keep schema issue formatting in owning schema/error modules or services. Do
  not inline ad hoc `typeof`/`in` object probes in handlers.
- Keep engine services independent of React, request handlers and app state.
- Keep HTTP handlers thin. Do not put reusable calculator transformation,
  graph assembly, calculation dispatch or expected error-shaping policy in
  `HttpApiBuilder.group(...)` handlers.

## Related Docs

- [Facts](./facts.md)
- [Rules and parameters](./rules-and-parameters.md)
- [Calculators](./calculators.md)
- [API and SDK](./api-and-sdk.md)
