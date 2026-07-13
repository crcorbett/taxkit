---
status: draft
last_reviewed: 2026-07-13
source_of_truth: docs
confidence: high
---

# Boundary-only decoding

## Overview

WhatTax should decode unknown or representation-level values only where they
cross an explicit trust or type-erasure boundary. After a value has been
decoded with its owning Effect Schema, internal code should pass the resulting
schema-derived type without decoding it again.

This work adds a durable architecture rule, a custom Oxlint rule enabled across
the repository, an exact boundary-file allowlist and focused rule tests. It
also removes the current repeated calculator scenario decode while preserving
the selected-calculator decode required by dynamic catalogue dispatch.

The lint rule controls where executable decoding may occur. Architecture,
module placement and tests control whether each allowed decode is a real
boundary and whether the resulting typed value remains trusted downstream.
For frontend code, route loaders or dedicated adapters own the boundary;
React components and hooks receive schema-derived values and remain free of
decoding, Effect runtime execution and service acquisition.

## Problem

Effect Schema is the canonical way to accept unknown input, but unrestricted
decoder calls allow schema decoding to become internal defensive validation.
That weakens package contracts:

- a typed value may be decoded repeatedly as it moves through services
- callers may pass `unknown` deeper than the boundary that received it
- mixed modules may hide one boundary decoder among ordinary domain logic
- tests may decode fixtures instead of constructing canonical typed values
- a new decoder call may appear without an explicit ownership decision

The current calculator flow demonstrates the risk. The HTTP contract decodes
the public request union, `@whattax/calculators` decodes the selected
calculator's input schema, and the rule-owned scenario layer decodes the same
facts again. The selected-calculator decode is required because the route
schema cannot depend on `calculatorId`; the later scenario-layer decode is not.

The SDK has a separate legitimate type-erasure boundary. A generic calculator
response carries the public report union, so the selected SDK descriptor must
decode that report with its concrete output schema before returning the
narrowed type. That decoder should remain explicit and isolated.

The docs frontend has a related placement issue. Its server function encodes a
typed `Exit`, but route components currently call
`docsHomeRouteBoundary.match(...)` or `docsPageRouteBoundary.match(...)`, which
decodes the loader value during React render. The decoder is hidden inside an
allowlisted boundary module, so file-based linting alone cannot identify the
render-time execution. The loader or a dedicated adapter must restore the
typed route result before React composition begins.

## Call graphs

```ts
Production: current calculator input

HTTP request body
  -> @whattax/api-http CalculatorRunRequest decode
    -> PublicCalculatorService.calculate
      -> CalculatorCatalogEntry.inputSchema decode
        -> entry.calculate(facts as unknown)
          -> TakeHomeScenarioLive / AnnualTaxScenarioLive
            -> rule-owned scenario schema decode again
              -> typed scenario Layer
                -> CalculationEngine
```

```ts
Production: target calculator input

HTTP request body
  -> @whattax/api-http CalculatorRunRequest decode boundary
    -> PublicCalculatorService.calculate
      -> calculator catalogue dispatch boundary
        -> policy-owning generic catalogue entry
          -> selected canonical inputSchema decode
            -> constructor-closed typed calculator continuation
              -> typed rule-owned scenario Layer constructor
                -> CalculationEngine
```

```ts
Production: target SDK report narrowing

PublicCalculatorService.calculate
  -> CalculatorRunResponse with CalculatorRunReport union
    -> SDK descriptor boundary
      -> selected canonical outputSchema decode
        -> OutputSchema["Type"]
          -> plain or Effect SDK caller
```

```ts
Production: current docs frontend boundary

docs server function
  -> encode typed Exit for transport
    -> Route.useLoaderData returns encoded representation
      -> route component calls docs*RouteBoundary.match(encoded)
        -> boundary module decodes during React render
          -> success/error JSX branch
```

```ts
Production: target frontend boundary

URL, HTTP, storage or server-function representation
  -> route loader, action or dedicated boundary adapter
    -> canonical Schema decode with typed boundary error
      -> Result<typed success, typed expected failure>
        -> route or container composition
          -> leaf component with focused readonly values, callbacks or children
            -> render only; no decode, service lookup or runtime execution
```

```ts
Static analysis: target

non-boundary source file
  -> executable decode call
    -> whattax/no-decoding-outside-boundaries error

exact allowlisted boundary file
  -> only the boundary-decoding rule is disabled
    -> all other Oxlint rules remain active
      -> canonical Schema decode
        -> schema-derived typed value passed to internal code
```

```ts
Tests: target

custom Oxlint rule tests
  -> executable decoder examples report errors
  -> encoding and declarative schema-combinator examples remain valid
  -> member, identifier and computed decoder call forms are covered

boundary integration tests
  -> unknown external fixture
    -> exact allowlisted boundary module
      -> canonical decode result or typed Schema error

internal unit tests
  -> canonical constructors and schema-derived typed fixtures
    -> internal service or calculator
      -> no decoder call
```

## Goals

- Define decoding as an explicit trust-boundary operation.
- Enable one repository-wide Oxlint rule that rejects executable decoding
  outside exact allowlisted files.
- Keep boundary files fully linted by disabling only the decoding rule.
- Require every new decoder location to change the reviewed allowlist.
- Preserve necessary transport, external-data and dynamic catalogue/descriptor
  decodes.
- Remove repeated decoding after the selected calculator input is typed.
- Preserve the selected input schema and typed calculator continuation as one
  generic catalogue-entry contract that cannot be assembled incorrectly.
- Keep decoder failures in typed Effect error channels at their owning
  boundary.
- Require one readable Effect pipe or `Effect.gen` flow from decode, through
  inline typed error mapping, into the typed continuation.
- Forbid decoder wrappers, one-use error mappers and boundary files that exist
  only to suppress lint.
- Keep React route/container composition typed and keep leaf components pure,
  focused and free of decoding or Effect runtime ownership.
- Add deterministic tests for both prohibited and permitted lint syntax.

## Non-goals

- Do not ban schema definitions, schema transformations or constructors.
- Do not ban encoding; outbound encoding remains a separate boundary concern.
- Do not replace Effect Schema with manual guards, casts or object readers.
- Do not redesign public HTTP routes, calculator ids or SDK calculation names.
- Do not move API, SDK, calculator or rule packages.
- Do not redesign React routes, visual components or application state.
- Do not add a type-aware compiler plugin or whole-program data-flow analysis.
- Do not exempt whole packages, source trees or all test files from the rule.
- Do not run `bun run version-repo` or publish packages.

## Ownership and boundaries

[Effect services](../architecture/effect-services.md) owns the durable
decoding rule. [Testing and quality](../architecture/testing-and-quality.md)
owns lint and verification expectations. [API and SDK](../architecture/api-and-sdk.md)
owns the selected-calculator and SDK descriptor call graphs.
[Frontend](../architecture/frontend.md) owns loader/runtime placement and
React component composition boundaries.

`tools/oxlint/whattax-rules.js` owns the repository-specific AST rule.
`oxlint.config.ts` owns the exact file allowlist and is the source of truth for
which files may execute decoders. Architecture docs should define categories
and review requirements rather than duplicate a path inventory that can drift.

Owning packages continue to define canonical schemas and schema-derived types.
Boundary modules import those schemas, decode the representation-level input,
map expected failures to the owning tagged error where required, and pass the
typed value inward.

### Allowed boundaries

Executable decoding is allowed only when one of these conditions is true:

- external input enters through HTTP, configuration, environment, filesystem,
  generated content, browser/server serialisation or another process
- an exported API intentionally accepts `unknown` and owns validation of that
  public input
- an external library exposes representation-level or unknown data that must
  be normalised into a canonical WhatTax type
- dynamic catalogue or descriptor selection has erased the concrete schema
  type and the selected schema must restore it before a typed continuation
- a focused boundary test proves one of these contracts

The route-level `CalculatorRunFacts` union decode and the selected
`CalculatorCatalogEntry.inputSchema` decode are separate valid boundaries. The
first establishes the public transport union. The second establishes the
calculator-specific type after dynamic `calculatorId` selection.

### Prohibited decoding

Decoding is not allowed:

- between internal services that already exchange schema-derived types
- as defensive validation of a typed parameter
- after an upstream boundary has already produced the required concrete type
- inside ordinary domain transformations, rules or calculator programs
- in general unit tests merely to construct fixtures
- in React render functions, leaf components or ordinary hooks
- through renamed aliases intended to evade the lint rule

If internal code appears to require a decoder, its input type or boundary
placement is wrong and should be corrected instead of allowlisted by default.

## Proposed approach

### Document the contract

Update `AGENTS.md`, `docs/architecture/effect-services.md`,
`docs/architecture/testing-and-quality.md` and
`docs/architecture/frontend.md` with the boundary-only rule, allowed boundary
categories, exact allowlist policy, frontend composition rule and test
expectations. Update `docs/architecture/api-and-sdk.md` if the implemented
calculator or SDK call graph changes from this spec.

New boundary modules should use a clear `*.boundary.ts` name where that fits
their ownership. Existing canonical boundary names such as `config.ts`,
`loaders.ts` or `*.runtime.ts` may remain when the role is unambiguous and the
exact file is allowlisted.

### Add the Oxlint rule

Add `whattax/no-decoding-outside-boundaries` to the existing WhatTax plugin and
enable it globally. The rule should report executable decoder use, including:

- Effect Schema runtime decoder calls such as `Schema.decodeUnknownEffect`,
  `Schema.decodeEffect`, `Schema.decodeUnknownExit`, `Schema.decodeExit`,
  `Schema.decodeUnknownOption`, `Schema.decodeOption`,
  `Schema.decodeUnknownResult`, `Schema.decodeResult`,
  `Schema.decodeUnknownPromise`, `Schema.decodePromise`,
  `Schema.decodeUnknownSync` and `Schema.decodeSync`
- direct decoder helpers such as `decodeJson(...)`
- member decoders such as `descriptor.decodeOutput(...)`
- statically named computed members such as `Schema["decodeUnknownEffect"](...)`
- decoder factory creation when the decoder-producing call is executed and
  stored for later use
- extraction or destructuring of known runtime decoder members for later use
- `Schema` aliases imported from `effect`, namespace imports from
  `effect/Schema`, named runtime-decoder imports from `effect/Schema`, and
  statically traceable local aliases of those bindings
- direct calls whose static identifier or member name is `decode` or starts
  with `decode` followed by an uppercase letter, including `decodeJson`,
  `decodeOutput`, `Stream.decodeText` and platform decoders

The rule must resolve these forms from import and local binding syntax, not
assume that every identifier named `Schema` is Effect Schema. It does not need
whole-program type analysis or dynamic property resolution. Decoder factory
creation must be reported at the factory call, so assigning the returned
function to an unrelated name cannot hide the decode. The rule tests must
record unsupported dynamic alias/property forms as residual risk rather than
pretending they are statically enforceable.

The implementation must distinguish executable decoding from declarative
schema construction. APIs such as `Schema.decodeTo`, schema transformation
objects and encoding calls must not be rejected merely because their names or
fields contain `decode`.

The diagnostic should tell the contributor to move the operation to a real
boundary or add the exact file to the reviewed allowlist. It should name
`docs/architecture/effect-services.md` as the governing contract. A
deterministic comment-token audit must reject both `oxlint-disable` and
`eslint-disable` directive comments naming this rule, including file,
next-line and line forms; Oxlint honours both directive families. The exact
config allowlist is the only exemption mechanism. Do not implement that audit
as raw text search because docs, diagnostics and test fixture strings may
legitimately contain the rule name. Run the rule itself through the real
Oxlint CLI against positive, negative and exact-override fixtures so plugin
registration and configuration are tested with the AST logic.

### Use an exact allowlist

Define a named `decodingBoundaryFiles` list in `oxlint.config.ts`. Apply an
override that turns off only
`whattax/no-decoding-outside-boundaries` for those paths.

Do not add these files to `ignorePatterns`. Do not use package-wide globs,
`**/*.test.ts`, `**/*.runtime.ts` or `**/*.boundary.ts` as automatic
exemptions. A boundary-style filename improves discovery but does not grant
permission by itself. Repository-authored source containing a decoder must not
be removed from lint coverage through `ignorePatterns` or a nested Oxlint
configuration. Run the canonical root lint and CLI fixture commands with
`--disable-nested-config` so `oxlint.config.ts` remains the only configuration
authority for this rule.

Group allowlist entries by boundary category and keep comments brief. A new
entry requires review of the receiving representation, owning schema, typed
output, error mapping and downstream call graph.

### Keep boundary Effects linear

A boundary should expose one cohesive representation-to-type operation. Put
the decoder first, then continue with the decoded value. Map its expected error
directly beside it when that module owns the required error context. When a
policy-owning generic entry must preserve `Schema.SchemaError` for its immediate
service caller, catch that tag/predicate specifically at that caller; do not
broaden or erase the error channel. Use one readable pipe for a short flow and
`Effect.gen` when several named Effect steps make the sequence clearer.

Use `decodeUnknown*` only when the receiving representation is genuinely
`unknown` or is wider than the dynamically selected schema because catalogue
or descriptor selection erased the concrete encoded type. When the boundary
already owns the selected schema's encoded type, use the matching typed
`decodeEffect`, `decodeExit`, `decodeOption`, `decodeResult`, `decodePromise`
or `decodeSync` variant instead of widening the value. Inside Effect programs,
prefer the Effect decoder so `Schema.SchemaError` remains in the error channel.
Use a synchronous, throwing decoder only when a synchronous framework boundary
requires that contract and tests prove the thrown failure is contained by the
framework.

The selected schema and its continuation must be closed over before the
heterogeneous catalogue erases their concrete generic. This illustrative
shape shows the policy-owning abstraction; implementation must use the final
catalogue entry and result types:

```ts
type CalculatorCatalogDefinition<
  InputSchema extends CalculatorInputSchema,
> = Omit<CalculatorCatalogEntry, "calculate" | "inputSchema"> &
  Readonly<{
    calculate: (
      facts: InputSchema["Type"],
      validationIssues: readonly GraphValidationIssue[]
    ) => Effect.Effect<
      CalculationResult<CalculatorRunReport>,
      CalculationError,
      CalculationEngine
    >;
    inputSchema: InputSchema;
  }>;

const defineCalculatorCatalogEntry = <
  InputSchema extends CalculatorInputSchema,
>(
  definition: CalculatorCatalogDefinition<InputSchema>
): CalculatorCatalogEntry =>
  new CalculatorCatalogEntryData({
    ...definition,
    calculate: (input, validationIssues) =>
      Schema.decodeUnknownEffect(definition.inputSchema)(input).pipe(
        Effect.flatMap((facts) =>
          definition.calculate(facts, validationIssues)
        )
      ),
  });
```

The service then keeps expected error selection and response construction in
one pipeline. `Effect.catchIf` is important here because calculation errors
must not be remapped as schema failures:

```ts
entry.calculate(request.payload.facts, validationIssues).pipe(
  Effect.catchIf(Schema.isSchemaError, (error) =>
    Effect.fail(
      toCalculatorInputDecodeError({
        calculatorId: request.calculatorId,
        entry,
        help: Option.fromNullishOr(request.help),
        issue: error.issue,
      })
    )
  ),
  Effect.provideService(CalculationEngine, engine),
  Effect.map(
    (result) =>
      new CalculatorRunResponseData({
        calculator: toCalculatorCatalogItem(entry),
        diagnostics: result.diagnostics,
        report: result.report,
      })
  )
);
```

Do not split that flow into one-use helpers such as `decodePayload`,
`mapDecodeError`, `runDecoder`, `withDecodedInput` or `toBoundaryError`.
Do not introduce a generic `decodeOrFail` abstraction that hides the owning
schema or error policy. A shared abstraction is allowed only when it owns real,
reused policy, such as coupling every catalogue entry's input schema to its
typed continuation, and materially reduces unsafe generic erasure. The
catalogue-entry constructor above and the existing shared
`toCalculatorInputDecodeError` projection are examples of policy-owning
abstractions, not helper sprawl.

Effect-native decoder and service pipelines must not use `async`/`await`, raw
`Promise`, nested runtime execution, `Effect.runPromise`, request-local
`ManagedRuntime`, broad `Effect.catchAll`, `Effect.orDie` or unsafe casts to
bridge the decode. Process entrypoints, route loaders and the plain SDK facade
may execute the completed Effect through their existing module-scoped runtime
at the outer edge; they must not interleave Promise control flow with decoding
or create a runtime per operation. Expected schema failures remain in the typed
error channel and are transformed inline with `Effect.mapError`,
`Effect.catchTag` or another owning boundary combinator.

### Decode calculator inputs once per required boundary

Keep the public route union decode and the selected catalogue-entry decode.
Refactor catalogue construction so a generic definition couples each selected
input schema to a callback accepting exactly `InputSchema["Type"]`. The
heterogeneous stored entry may expose an erased boundary method, but the
constructor must close over decoding and the typed callback before that
erasure. Add a compile-time negative fixture proving that a schema cannot be
paired with another calculator's input type. Do not decode in the service and
then pass the result through an `unknown` callback.

Rule-owned scenario layer constructors should accept
`TakeHomeScenarioInput` or `AnnualTaxScenarioInput` after catalogue dispatch.
If existing exported `unknown`-accepting constructors remain part of the
package contract, preserve them as thin, explicitly allowlisted boundary
adapters and add separate typed constructors for internal composition. The
calculator catalogue must use the typed constructor and must not trigger the
same scenario schema decode again.

Expected `Schema.SchemaError` values should remain in the typed Effect error
channel and be mapped inline to `CalculatorInputDecodeError` at the owning
catalogue/service boundary.

### Isolate SDK report decoding

Keep descriptor output decoding because the generic calculator report union
must be narrowed after dynamic descriptor selection. Isolate decoder creation
and invocation in exact SDK boundary modules. Do not rename the operation to
hide decoding from the rule, duplicate report schemas or use a cast to recover
the concrete report type.

`defineSdkCalculation` is the policy-owning generic constructor for this
boundary. Prefer assigning `Schema.decodeUnknownEffect(outputSchema)` directly
as its decoder so the result already has the required typed Effect error
channel. Do not decode to `Exit` and immediately convert that `Exit` back into
an `Effect` unless a tested caller contract genuinely requires the intermediate
representation.

Plain and Effect SDK paths must continue to return the same schema-derived
output type and preserve existing browser-safe import boundaries.

### Keep React leaves typed and compositional

Decode URL state, server-function payloads, browser storage, external HTTP
responses and other representations in route loaders, actions or dedicated
boundary adapters. When a TanStack route file also contains React rendering,
prefer moving executable decoding into a focused `.boundary.ts` or loader
module instead of allowlisting the mixed `.tsx` file.

The docs route boundary must stop exposing a `match(encoded, handlers)` path
that performs decoding when called by a component. Decode the transported
value in the loader/adapter path and give React a typed success/error value to
compose. Preserve the existing transport codec and error semantics unless the
implementation proves that a smaller canonical schema is required.

Prefer normalising the decoded transport `Exit` to
`Result.Result<Success, Failure>` in the loader adapter. The adapter should own
`Cause` traversal and impossible-defect policy once; React should receive the
typed `Result` and compose it with `Result.match` or `Match`, not call another
generic decode-and-match callback API. Malformed transport data must remain a
schema/boundary failure and must not be relabelled as an expected docs-content
error.

Route and container components should compose already-typed success, absence
and error branches with readonly props, `Option` and `Match`. Leaf components
should render focused values derived from the decoded schema result or
`children`. UI-only presentation props, callbacks and local interaction state
remain valid; do not mirror a transport/domain DTO merely to shape component
props. Leaves must not accept representation-level `unknown`, call a decoder,
acquire an Effect service, create or run a runtime, read environment/storage
directly or fetch their own boundary data. Pass commands from the owning
container or action boundary instead of moving service/runtime ownership into
the leaf.

Do not add wrapper hooks, providers or components merely to relocate a decoder
or silence lint. Extract a React composition only when it owns reusable UI
policy or removes meaningful repetition. Keep app-specific composition in the
owning app while `packages/ui` remains planned.

### Verify every allowlisted file

Audit every current executable decoder call and classify it as a real boundary,
a boundary test or a repeated/internal decode to remove. Mixed modules should
be split when doing so materially narrows the exemption. Do not create tiny
wrapper files whose only purpose is to bypass lint; a boundary module must own
the representation transition and typed continuation.

## Tests and verification

Implementation should add focused custom-rule tests and wire them into the
root test path. Tests must prove reporting for direct Schema decoders, custom
decoder helpers, member calls and static computed members. Tests must also
prove that encoding, schema declarations and `Schema.decodeTo` are not false
positives. Alias extraction, renamed Schema imports, `effect/Schema` namespace
and named imports, decoder factories and both Oxlint/ESLint inline-disable
directive families must be covered so the rule cannot be bypassed through a
spelling change. At least one test must invoke the actual Oxlint CLI with the
repository plugin and config, including an exact allowlisted fixture. The
inline-disable check must inspect comment tokens rather than matching docs or
string literals. Include a `.tsx` fixture that attempts to decode in a React
component or hook so frontend enforcement is proved through the same rule.

Oxlint cannot reliably infer whether an arbitrary helper is one-use or owns
meaningful repeated policy. Do not add a brittle minimum-function-size rule.
Enforce helper-sprawl constraints through the decoder factory/call rule,
compile-time contract tests, the three required quality audits and parent diff
review of each boundary file.

Calculator and SDK verification should prove:

- selected-calculator mismatched facts still fail as
  `CalculatorInputDecodeError`
- valid calculator facts are not decoded again by rule scenario layers
- public rule-package boundary constructors still reject invalid `unknown`
  input if they remain exported
- SDK plain and Effect calculations still return descriptor-narrowed reports
- HTTP and SDK result parity remains intact
- browser-safe SDK entrypoints do not import server-only modules
- React render functions, leaf components and ordinary hooks contain no
  executable decoder calls, service acquisition or runtime execution
- docs route components no longer trigger decoding indirectly through
  `docsHomeRouteBoundary.match(...)` or `docsPageRouteBoundary.match(...)`
- frontend boundary data reaches route/container composition and leaf
  components through schema-derived typed values

Required final gates:

```bash
bun run lint
bun run test
bun run --filter=@whattax/calculators test
bun run --filter=@whattax/sdk test
bun run --filter=@whattax/sdk test-types
bun run --filter=@whattax/sdk check-boundaries
bun run --filter=@whattax/api-http test
bun run --filter=api smoke:public-routes
bun run --filter=web check-types
bun run --filter=docs check-types
bun run --filter=docs build
bun run docs:validate
bun run verification
```

The implementation must also run an `rg` audit for executable decoder calls
and compare every result with the exact allowlist.

## Risks and tradeoffs

- JavaScript lint plugins do not provide full type-aware data-flow analysis.
  The rule should cover supported executable syntax deterministically, while
  docs and review prohibit aliasing intended to evade it.
- An exact allowlist adds review friction when a legitimate boundary is added.
  That friction is intentional because decoder placement changes the trust
  model.
- Over-broad name matching can reject declarative schema APIs. Focused
  positive and negative tests are required before global enablement.
- Splitting mixed modules can create wrapper sprawl. Split only when the new
  module owns a complete representation-to-type transition or materially
  narrows an exemption.
- Dynamic catalogue and descriptor boundaries may require existential or
  generic typing. Keep decoding and the typed continuation colocated rather
  than recovering types with unsafe casts.
- TanStack route files can colocate loaders and React components. Allowlisting
  a mixed `.tsx` file would exempt its render scope, so prefer an extracted
  boundary adapter when executable decoding is required.

## Versioning and changelog impact

The architecture docs, root lint rule, allowlist and lint-rule tests are
repository-internal and do not require a Changeset.

If calculator, rule-package or SDK refactoring changes public exports,
accepted public input behaviour or package-facing documentation, add
Changesets for the affected release-train packages at the semver level required
by the public diff. Adding typed scenario constructors while preserving the
existing `unknown` boundary adapters is normally additive package API work;
narrowing or removing those existing adapters is breaking and is out of scope
without an explicit design decision. If the final refactor preserves public
exports, package behaviour and package-facing docs, record an explicit
no-Changeset rationale. Do not run `bun run version-repo` as part of
implementation.

## Acceptance criteria

- Canonical docs state that executable decoding belongs only at explicit trust
  or type-erasure boundaries.
- `whattax/no-decoding-outside-boundaries` is enabled globally.
- `oxlint.config.ts` contains an exact, reviewed boundary-file allowlist and
  disables only this rule for those files.
- Broad package, runtime, boundary-name and test globs are not used as
  exemptions.
- Canonical lint commands disable nested configuration and repository-authored
  decoder source is not hidden through `ignorePatterns`.
- Focused tests prove the rule's required positive and negative syntax.
- Every executable decoder call in repository-owned source is either in the
  exact allowlist or removed.
- The calculator flow retains the route-union and selected-entry decodes but
  no longer decodes selected facts again in the scenario layer.
- Calculator dispatch enters a typed continuation without unsafe casts or
  mirrored DTOs.
- A compile-time negative fixture proves catalogue construction rejects a
  schema paired with the wrong typed calculator continuation.
- SDK descriptor output decoding remains explicit, schema-owned and isolated
  at the type-erasure boundary.
- Typed decoder failures remain in the Effect error channel and are mapped at
  the owning boundary.
- Boundary programs use one meaningful linear Effect pipe or `Effect.gen`
  sequence, with no nested runtime execution, broad catch-all conversion or
  one-use decoder/error wrappers.
- No inline lint-disable comment, renamed decoder alias or unsafe cast bypasses
  enforcement.
- React route/container composition receives typed boundary results and leaf
  components remain render-only consumers of focused typed props or children.
- Boundary APIs do not expose decode-and-match helpers intended to be called
  from React render; loaders or adapters return typed route results first.
- Internal tests use canonical typed constructors unless they explicitly test
  a boundary.
- API, SDK, calculator, docs and repository verification gates pass.
- Each implementation task receives parent review, three documented quality
  audit passes and no more than three failed correction turns before replan or
  user decision.
- Changeset impact is recorded and `bun run version-repo` is not run.

## References

- [Effect services](../architecture/effect-services.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [API and SDK](../architecture/api-and-sdk.md)
- [Frontend](../architecture/frontend.md)
- [Package ownership](../architecture/package-ownership.md)
- [Writing spec task lists](./writing-task-lists.md)
- [Implementing specs](../exec-plans/implementing-specs.md)
