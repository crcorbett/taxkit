---
status: implemented
last_reviewed: 2026-05-24
source_of_truth: docs
confidence: medium
---

# Extract Public Calculator Service

## Overview

Move reusable public calculator catalog, metadata, graph, calculation and
expected-error logic out of `@whattax/http-api` into a reusable calculator
orchestration package. HTTP handlers should become thin wrappers around Effect
service methods.

Target package:

```txt
packages/calculators
```

Target package name:

```txt
@whattax/calculators
```

## Problem

Before this extraction started,
`packages/http-api/src/handlers/calculators.ts` performed calculator
lookup, context validation, graph validation, calculation execution, schema
decode error formatting and response construction. Some reusable catalog and
metadata transformation logic also lived in
`packages/http-api/src/groups/calculators.ts`.

That makes `@whattax/http-api` more than a transport package. It also makes
the future SDK and CLI likely to duplicate calculator behavior or import HTTP
internals. The public calculator behavior should be reusable without depending
on HTTP handlers, OpenAPI generation or app runtime modules.

## Goals

- Create `@whattax/calculators` as the reusable calculator orchestration
  package.
- Move public calculator catalog ownership out of `@whattax/http-api`.
- Move metadata projection, graph assembly, calculation dispatch and expected
  error shaping into service methods.
- Replace handler-local undefined branching, context defaults, conditional
  object-spread shaping and ad hoc schema-issue formatting with
  Effect-native service policies.
- Keep `@whattax/http-api` responsible for route schemas, OpenAPI/status
  annotations, typed HTTP clients and thin handler adapters.
- Keep `apps/api` as a runtime-only Bun app.
- Preserve the implemented public route paths while improving the generated
  OpenAPI request-body shape for calculator facts.
- Reuse canonical schemas, descriptors, tagged errors, services, scenario
  layers, rule-pack layers and report schemas from owning packages.

## Non-Goals

- Add new calculator coverage.
- Rename `@whattax/http-api` to `@whattax/api-http`.
- Build the TypeScript SDK package.
- Change public route paths.
- Add persistence, auth, accounts or saved scenarios.

## Ownership And Boundaries

`packages/core` owns primitives, fact descriptors, rule descriptors, graph
diagnostics, trace, ledgers, common tagged errors and `CalculationEngine`.

Rule packages own canonical facts, report schemas, scenario layers, rule-pack
layers, parameter services, rule descriptors, calculator ids and supported
calculator context literals for their jurisdiction/rule domain. Shared scalar
brands such as calculator id, jurisdiction and tax year belong in
`packages/core`; rule packages narrow those brands to the concrete values they
support.

`@whattax/calculators` owns:

- composed public calculator schemas that reuse rule-owned calculator ids,
  jurisdictions, tax years, facts, reports and descriptors
- public calculator catalog entries
- calculator service tag/interface and live layer
- public calculator metadata response construction
- fact/rule/graph response construction
- calculation dispatch through canonical scenario/rule-pack layers and
  `CalculationEngine`
- public calculation facts schema composition that reuses canonical
  calculator-specific input schemas from rule packages
- schema decode error shaping with descriptor-backed help
- expected calculation/domain failures as typed failures, including canonical
  `CalculationError`
- schema-owned optional context fields without jurisdiction-specific defaults
- MUST use schema-owned optional response fields instead of conditional
  object-spread construction
- schema issue path formatting through reusable service/error policy

`@whattax/http-api` should own:

- Effect HTTP API groups and endpoints
- OpenAPI annotations
- HTTP status annotations such as bad-request envelopes
- typed HTTP client helpers
- thin handler layers that call `@whattax/calculators`

The dependency direction must be:

```txt
packages/core
  <- packages/rules/au/*
  <- packages/calculators
  <- packages/http-api
  <- apps/api
```

`@whattax/calculators` must not import from `@whattax/http-api`,
`apps/api`, `apps/web` or browser/runtime modules.

## Proposed Approach

### Package Shape

Implemented shape:

```txt
packages/calculators/
  README.md
  package.json
  tsconfig.json
  tsconfig.build.json
  src/
    index.ts
    schemas.ts
    catalog.ts
    metadata.ts
    errors.ts
    service.ts
    live.layer.ts
```

Reusable schemas must stay in an owning public schema module, not inline with
handler logic.

### Service Shape

Expose a package-owned Effect service:

```ts
export class PublicCalculatorService extends Context.Service<
  PublicCalculatorService,
  {
    readonly listJurisdictions: () => Effect.Effect<JurisdictionsResponse>;
    readonly listTaxYears: (
      query: MetadataQuery
    ) => Effect.Effect<TaxYearsResponse>;
    readonly listCalculators: (
      query: MetadataQuery
    ) => Effect.Effect<CalculatorCatalogResponse>;
    readonly getCalculator: (
      request: GetCalculatorRequest
    ) => Effect.Effect<CalculatorCatalogItem, CalculatorServiceError>;
    readonly getCalculatorSchema: (
      request: GetCalculatorRequest
    ) => Effect.Effect<CalculatorSchemaResponse, CalculatorServiceError>;
    readonly getCalculatorGraph: (
      request: GetCalculatorGraphRequest
    ) => Effect.Effect<CalculatorGraphResponse, CalculatorServiceError>;
    readonly listFacts: (
      query: DescriptorFilterQuery
    ) => Effect.Effect<FactsResponse>;
    readonly listRules: (
      query: DescriptorFilterQuery
    ) => Effect.Effect<RulesResponse>;
    readonly calculate: (
      request: CalculatorRunServiceRequest
    ) => Effect.Effect<CalculatorRunResponse, CalculatorServiceError>;
  }
>()("@whattax/calculators/PublicCalculatorService") {}
```

The implementation should use Effect-native collection and error primitives.
Expected failures should be tagged errors or schema-backed error envelopes from
the service package. HTTP-specific status decoration belongs in
`@whattax/http-api`.

### Public Calculation Facts Schema

The public calculate route remains:

```txt
POST /api/v1/calculators/:calculatorId/calculate
```

The route payload MUST NOT use `facts: Schema.Unknown` as the public contract.
`@whattax/calculators` exports a composed `CalculatorRunFacts` schema that
is a union of the canonical calculator input schemas from the owning rule
packages:

```ts
export const CalculatorRunFacts = Schema.Union([
  TakeHomeScenarioInputSchema,
  AnnualTaxScenarioInputSchema,
]);
```

`CalculatorRunRequest` uses that union:

```ts
export const CalculatorRunRequest = Schema.Struct({
  facts: CalculatorRunFacts,
  ...OptionalCalculatorContextFields,
});
```

This keeps one stable route while allowing generated clients and OpenAPI docs
to show the currently supported fact shapes. The tradeoff is that the route
schema can only say “facts must match one supported calculator input shape,”
not “this path parameter requires exactly this facts shape.” Effect `HttpApi`
does not currently provide dependent request-body schemas selected by a path
parameter.

The calculator service MUST still validate facts against the selected
calculator catalog entry. Each `CalculatorCatalogEntry` references the
canonical input schema it accepts, for example:

```ts
readonly inputSchema: Schema.Schema<Input>;
```

`calculate` looks up the entry by `calculatorId`, decodes
`request.payload.facts` with `entry.inputSchema`, and map decode failures to
`CalculatorInputDecodeError` with descriptor-backed help. This catches cases
where the route-level union accepts a valid fact shape for another calculator
but that shape is incompatible with the selected calculator.

Public JSON callers must send canonical schema values, including tagged values
where the owning schema requires them. For example, take-home pay facts include
`grossPay._tag = "GrossPay"` and `grossPay.amount._tag = "Money"`. The OpenAPI
request body for `POST /api/v1/calculators/{calculatorId}/calculate` exposes
these canonical shapes through `facts.anyOf`.

Service implementation rules:

- Optional request and response fields MUST be represented by schema-owned
  optional fields. Branch with `Option.match`, `Match` or another
  Effect-native equivalent when service policy genuinely needs to inspect an
  optional value. Do not use raw `undefined` conditionals for service policy.
  Nullable input must be owned by `Schema.NullOr` or schema transforms and
  normalized with `Option.fromNullable`, not raw `null` comparison.
- Catalog lookup results should stay as `Option` until the callsite that needs
  an `Effect` failure. Convert with `Effect.fromOption` and map missing-entry
  failures inline so error context matches the request being served.
- Do not invent defaults for missing jurisdiction, tax year or calculator
  context. Missing context should be absent or fail through a schema/tagged
  error unless a canonical schema explicitly owns a default.
- Use pipe-first composition when data flow is clearer left-to-right, for
  example `query.pipe(filterCalculatorEntries, toFactsResponse)`. Do not use
  nested wrapper composition such as
  `toFactsResponse(filterCalculatorEntries(query))` for sequential service
  transformations.
- Code MUST use schema-owned optional keys for optional response fields. Code
  MUST NOT construct schema values with conditional spread blocks for
  help/error payloads.
- Keep schema issue path formatting in `errors.ts` or an equivalent
  service-owned error module. Do not inline `typeof`/`in` probes inside HTTP
  handlers.
- Use Effect collection primitives in service logic. Use `Array.filter(items,
  predicate)`, `Array.findFirst(...)`, `Chunk.map(...)`, `HashMap.get(...).pipe(
  Option.match(...))` and `HashSet` instead of native `items.filter(...)`,
  `items.find(...)`, `new Map()` or `new Set()`.
- Service code MUST return `Effect` values and typed tagged failures. Do not use
  `throw`, `async`, `await` or `new Promise` in calculator services; use
  `Effect.gen`, `Effect.flatMap`, `Effect.all`, `Effect.async`,
  `Effect.promise` or `Effect.tryPromise` at the correct boundary with inline
  tagged-error mapping.
- Expected calculation failures MUST remain in the typed error channel. Do not
  use `Effect.die` for schema decode failures, `CalculationError` or other
  recoverable domain/API errors. Use `Effect.die` only for defects outside the
  declared service contract.
- Calculator input decode MUST use the selected catalog entry's canonical
  `inputSchema` at the service boundary. Do not rely only on the route-level
  `CalculatorRunFacts` union, because that union is intentionally
  calculator-neutral.
- Service contract files MUST define `Context.Service` contracts and canonical
  schemas only. Do not export `Live`, `Mock` or `Test` layers from `service.ts`;
  put production wiring in `live.layer.ts` and test wiring in `test.layer.ts` or
  test helpers.
- Runtime execution MUST stay outside `@whattax/calculators`. Calculator code
  returns `Effect` programs and layers; app/runtime files own
  `BunRuntime.runMain`, module-scoped `ManagedRuntime.make` and disposal.
- JSON, time and randomness MUST be schema/boundary owned. Do not use
  `JSON.parse`, `JSON.stringify`, `Date.now`, `new Date` or `Math.random` in
  calculator services. Use `Schema.decodeUnknown`, `Schema.decodeJson`,
  `Schema.encode`, `Schema.encodeJson`, explicit canonical request/config
  values, or Effect `Clock`/`Random` dependencies at boundaries.

### HTTP Handler Shape

After extraction, handlers should be transport adapters:

```ts
.handle("calculate", ({ params, payload, query }) =>
  PublicCalculatorService.pipe(
    Effect.flatMap((service) =>
      service.calculate({
        calculatorId: params.calculatorId,
        help: query.help,
        payload,
      })
    )
  )
)
```

Handlers should not call `validateRuleGraph`, format `SchemaIssue`, build
descriptor help arrays, compose rule-pack layers or provide
`CalculationEngineLive` directly. Those policies belong in the calculator
service live layer.

Handlers should also avoid local `Option.match` branches when the branch is
calculator business policy. The handler should pass route input to the service;
the service owns the lookup, validation and expected error result.

### Layer Composition

`@whattax/calculators` should export a live layer that requires
`CalculationEngine` if the service implementation calls `CalculationEngine`
through the environment. The HTTP API route layer or server package should
compose that service layer with `CalculationEngineLive`.

Do not create request-local runtimes. Do not import app runtime modules.

## Risks And Tradeoffs

- Creating `packages/calculators` requires package docs, explicit exports and
  verification. The current Bun workspace glob already includes
  `packages/*`.
- Moving schemas can be noisy if downstream imports are broad. Keep export
  paths explicit and preserve current public names where practical.
- Some public error envelope schemas may need an HTTP wrapper around service
  errors so status annotations remain transport-owned.
- This refactor should not change public route paths or response semantics.
- Tightening context handling may expose currently hidden AU defaults. The
  service must preserve wire compatibility where valid requests omit optional
  context, but it must not report invented context in errors.

## Versioning And Changelog Impact

This is package-facing. Expected Changeset impact is patch for:

- `@whattax/calculators` when created
- `@whattax/http-api` because its public exports and handler dependencies
  change

If public exports move out of `@whattax/http-api`, keep compatibility exports
or document the breaking impact before choosing a non-patch bump. The intended
first implementation should preserve public behavior and route contracts.

Update:

- `.changeset/*`
- `packages/http-api/README.md`
- new `packages/calculators/README.md`
- architecture docs if implementation discovers a different ownership split

## Acceptance Criteria

- Architecture docs describe `packages/calculators` as the reusable
  calculator orchestration and service layer.
- `@whattax/http-api` handlers for public calculation routes delegate to
  service methods and contain no calculator lookup, graph assembly,
  calculation dispatch, descriptor transformations or schema-error formatting.
- `@whattax/calculators` MUST use `Option`/`Match` or equivalent Effect
  primitives for optional context and lookup policy, without raw undefined
  branching, raw null comparison or jurisdiction-specific defaults.
- `@whattax/calculators` MUST use pipe-first composition for sequential service
  transformations and MUST NOT use nested wrapper calls for readable data-flow
  pipelines.
- `@whattax/calculators` MUST use Effect `Array`, `Chunk`, `HashMap`,
  `HashSet`, `Effect`, schema codecs and boundary-owned `Clock`/`Random`
  dependencies instead of native array pipelines, native `Map`/`Set`, thrown
  exceptions, `async`/`await`/`new Promise`, ad hoc JSON parsing or hidden
  time/randomness.
- Optional help/error fields are modeled by schemas instead of handler-local
  conditional object spreads.
- Schema issue path formatting is owned by the calculators service/error
  module, not by HTTP handlers.
- `@whattax/calculators` owns the public calculator catalog and reusable
  response/error construction.
- Public route behavior remains compatible for metadata, calculation success
  and schema-guided error responses.
- `CalculatorRunRequest.facts` reuses canonical rule-owned calculator input
  schemas through a union instead of `Schema.Unknown`.
- The selected calculator catalog entry performs the final canonical
  input-schema decode and incompatible calculator/facts combinations return
  `CalculatorInputDecodeError` with descriptor-backed help.
- OpenAPI for `POST /api/v1/calculators/:calculatorId/calculate` exposes the
  union of supported public calculator fact shapes.
- Effect Vitest coverage covers public calculator service journeys, in-process
  HTTP calculation and incompatible fact payloads that match a different
  calculator's canonical input schema.
- `bun run verification` passes.
- `bun changeset status --verbose` previews the expected release-train impact.

## References

- [API and SDK](../architecture/api-and-sdk.md)
- [Effect services](../architecture/effect-services.md)
- [Package ownership](../architecture/package-ownership.md)
- [Package boundaries](../architecture/package-boundaries.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Public calculation API routes](./public-calculation-api-routes.md)
