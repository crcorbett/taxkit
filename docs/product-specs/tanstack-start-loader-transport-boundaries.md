---
status: implemented
last_reviewed: 2026-07-14
source_of_truth: docs
confidence: high
---

# TanStack Start loader transport boundaries

## Overview

Primary reader:
: A TaxKit maintainer implementing or reviewing the docs route runtime.

Primary need:
: Place Effect Schema encoding and restoration at TanStack Start's actual
loader transport boundary without weakening React or decoding rules.

Implementation status:
: Implemented and accepted. See the
[completed execution plan](../exec-plans/completed/tanstack-start-loader-transport-boundaries.md)
for runtime evidence and residual risk.

TaxKit should keep Effect-owned route outcomes schema-encoded until the route
root consumes them. On initial SSR, the encoded loader value must survive
TanStack Router dehydration and browser hydration. On client navigation, the
same value must survive the server-function RPC serializer. The route root then
restores the representation once per consumer invocation, matches the typed
state and passes canonical values into React composition and leaf components.

This corrects the docs-route placement introduced by the
[boundary-only decoding](./boundary-only-decoding.md) rollout. That rollout
decoded the server-function response inside the route loader, but the decoded
`Result` then became the value TanStack serialised during SSR. A browser
server-function call is one network boundary; it is not a reason to decode
before the independent route-loader dehydration boundary.

The implementation should follow the serialisable-loader pattern validated in
the `site` repository, adapted to TaxKit's stricter Effect, lint and component
composition rules. A route-root transport restore is an explicit boundary
operation. It is not permission to decode in ordinary components or hooks.

## Problem

The current docs flow encodes a typed `Exit` from the server function, decodes
it in `loadDocsHome` or `loadDocsPage`, then returns an Effect `Result` through
TanStack's loader transport. TypeScript preserves the loader's declared return
type, but that type does not prove that TanStack's runtime serialiser preserves
Effect result/error representation.

This places the schema contract before the final representation crossing:

- the server-function output is schema-encoded correctly
- the route loader decodes that output too early
- TanStack receives a decoded Effect value rather than the JSON-safe codec
  representation
- the route component trusts hydrated loader data without restoring it through
  the owning schema
- the current tests exercise the codec directly but do not prove route-root,
  browser-navigation or hydration behaviour

Moving restoration to a route root creates a narrow React exception. Without
an explicit rule, that exception could expand into defensive decoding in leaf
components, custom hooks or route-local wrappers. The implementation therefore
needs two complementary controls: decoder implementations remain restricted to
exact boundary modules, and calls that restore loader transport remain
restricted to direct route-root consumers.

## Call graphs

```ts
Production: current shared producer

DocsContentService Effect
  -> route boundary encodes Schema.Exit(success, error, defect)
    -> createServerFn returns encoded data
      -> loadDocsHome/loadDocsPage restores too early
        -> TanStack loader returns a decoded Effect Result

Production: current initial SSR

server route loader
  -> decoded Result enters TanStack loader state
    -> Router dehydrates loader state into the SSR response
      -> browser hydrates an unverified Effect representation
        -> Route.useLoaderData trusts its inferred Result type

Production: current client navigation

browser route loader
  -> createServerFn RPC serialises the encoded response
    -> loader restores to Result before returning
      -> route component trusts the Result
```

```ts
Production: target shared producer

DocsContentService Effect
  -> Effect.exit once
    -> exactly one typed failure or success encodes through
       Schema.Exit(success, error, Schema.Never)
    -> defect/interruption preserves the original failed Cause
    -> empty or multiple typed failure reasons become invariant defects
      -> createServerFn returns only the encoded representation

Production: target initial SSR

server route loader returns encoded representation unchanged
  -> Router dehydrates encoded loader state into the SSR response
    -> browser hydrates encoded loader state
      -> direct route root restores once
        -> Result<success, expected error | transport error>
          -> route composition
            -> focused pure leaves

Production: target client navigation

browser route loader
  -> createServerFn RPC runtime serialises encoded representation
    -> route loader returns representation unchanged
      -> direct route root restores once
        -> the same typed route composition
```

```ts
Production: target failure policy

expected DocsLoaderError
  -> encoded Exit failure
    -> route-root restore
      -> typed Result failure
        -> route-owned expected-failure UI

malformed loader transport
  -> Schema decode failure during route-root restore
    -> DocsRouteTransportError
      -> route-owned transport-failure UI

defect or interruption
  -> encodeExit preserves failed Cause
    -> rejected loader/server-function promise
      -> TanStack route errorComponent

empty or multiple typed failure reasons from producer
  -> encodeExit treats the invalid cardinality as an invariant defect
    -> TanStack route errorComponent

decoded defect, interruption, empty cause or multiple typed failures
  -> restore treats semantic transport invariant as invalid
    -> DocsRouteTransportError
      -> route-owned transport-failure UI
```

```ts
Tests: target loader boundary proof

codec tests
  -> canonical success and tagged expected failure
    -> encode to JSON-safe loader representation
      -> restore to schema-derived values

Vitest Browser Mode route harness
  -> client-side TanStack route loader
    -> Route.useLoaderData at direct route root
      -> route transport restore
        -> typed success/failure leaf or framework error boundary

built docs runtime: initial request
  -> server route loader returns encoded value
    -> SSR response and browser hydration
      -> expected content with no hydration or console errors

built docs runtime: client navigation
  -> browser route loader invokes createServerFn RPC
    -> encoded response reaches direct route root
      -> expected MDX content and clean console
```

## Goals

- Make the schema-encoded `Exit` representation the exact value returned from
  each docs route loader to TanStack.
- Keep `createServerFn` strict TypeScript input/output serialisability checks
  enabled and prove the encoded representation through the runtime serializer
  without casts or opt-outs.
- Use `Schema.Exit(success, error, Schema.Never)` so defects are not encodable,
  and make `encodeExit` preserve interruption before the codec is called.
- Admit exactly one expected failure reason. Treat an empty or multi-failure
  producer cause as an invariant defect and the equivalent decoded transport
  state as `DocsRouteTransportError`.
- Preserve typed expected docs failures and malformed-transport failures as
  distinct route-owned UI states.
- Restore loader transport only at the direct route component or route-owned
  `head` consumer that first reads hydrated loader data.
- Keep route containers and leaf components on canonical schema-derived values
  with no access to `unknown`, encoded transport, Effect services or runtimes.
- Enforce both decoder implementation placement and route-root restoration
  placement with tested Oxlint rules.
- Prove success, expected failure, malformed transport, defect and interruption
  behaviour across unit, client-side route, SSR hydration and client-navigation
  tests.
- Preserve linear Effect composition, typed errors and the module-scoped docs
  runtime.

## Non-goals

- Do not extract a shared TanStack/Effect package from one app-local use case.
- Do not add `packages/ui` primitives or redesign the docs presentation.
- Do not replace docs server functions with RPC or add a client runtime.
- Do not set `createServerFn({ strict: false })` or weaken only its type-level
  output serialisability check.
- Do not permit arbitrary Schema decoding in React components or hooks.
- Do not create route-specific decoder hooks, providers, wrapper components or
  mirrored transport DTOs to move code around lint.
- Do not change docs content contracts owned by `@taxkit/docs-content`.
- Do not run `bun run version-repo` or publish packages.

## Ownership and boundaries

`apps/docs/src/lib/docs/errors.ts` owns the canonical app-local tagged errors
shared by the MDX client loader, route boundary and route composition. Moving
`DocsContentPreloadError` out of `route-boundary.ts` removes the current
lower-level MDX-to-route-boundary dependency. This is canonical schema/error
ownership, not helper extraction.

`apps/docs/src/lib/docs/route-boundary.ts` owns the app-local repeated policy:

- success and expected-error schemas
- the `Schema.Exit(..., Schema.Never)` JSON codec
- effectful encoding before TanStack receives the value
- synchronous restoration after TanStack transport
- conversion from malformed representation to `DocsRouteTransportError`
- conversion from decoded expected `Exit` failure to typed `Result` failure

The two route contracts justify one policy-owning generic constructor. They do
not justify a package extraction, per-route hook, one-line mapper family or
generic `decodeOrFail` utility. The current top-level, one-use `toRouteResult`
helper must be removed; flattening the decoded `Exit` belongs inline in that
constructor's `restore` operation. Binding schema-generated codec operations
once inside the constructor is allowed because those bindings are part of the
repeated policy, not wrappers around a single callsite.

The route-boundary module is imported by browser-rendered route roots. Its
runtime imports must remain limited to the app-local error schemas,
browser-safe Effect modules, and browser-safe
`@taxkit/docs-content/errors`/`@taxkit/docs-content/schemas` exports. It must
not import the docs content service, MDX client loader, runtime, server exports,
filesystem adapters, environment access or generated server source.

`apps/docs/src/lib/docs/loaders.ts` owns server-function input decoding,
module-scoped runtime execution and returning the encoded route representation
unchanged. It must not restore the output before TanStack receives it or opt
out of TanStack Start's strict type-level serialisability checks.

`apps/docs/src/routes/*.tsx` owns the direct route-root restore and route-level
composition. A restore is allowed only where the route first consumes
`Route.useLoaderData()` or a route-owned `head` callback receives `loaderData`.
The boundary component must match the `Result` itself; it must not pass the
encoded value or whole `Result` to a child. Any child component receives only
focused readonly canonical values, callbacks or children.

`tools/oxlint/taxkit-rules.js` and `oxlint.config.ts` own static enforcement.
Architecture documentation owns the durable categories and invariants; it must
not duplicate exact file allowlists.

## Proposed approach

### Keep encoded data through TanStack

Build the transport codec from the canonical success and expected-error
schemas:

```ts
const codec = Schema.toCodecJson(
  Schema.Exit(schemas.success, schemas.error, Schema.Never)
);

const encode = Schema.encodeUnknownEffect(codec);
const formatSchemaIssue = SchemaIssue.makeFormatterDefault();

const encodeExit = <R>(
  program: Effect.Effect<Success["Type"], Failure["Type"], R>
) =>
  Effect.exit(program).pipe(
    Effect.flatMap((exit) =>
      Match.value(exit).pipe(
        Match.when(Exit.isSuccess, (successExit) =>
          encode(successExit).pipe(Effect.orDie)
        ),
        Match.orElse((failureExit) =>
          Match.value(failureExit.cause).pipe(
            Match.when(Cause.hasDies, Effect.failCause),
            Match.when(Cause.hasInterrupts, Effect.failCause),
            Match.orElse((cause) =>
              pipe(
                cause.reasons,
                Array.filter(Cause.isFailReason),
                Array.matchLeft({
                  onEmpty: () =>
                    Effect.die(
                      new Error(
                        "Docs route failure contained no expected error"
                      )
                    ),
                  onNonEmpty: (_failure, additionalFailures) =>
                    pipe(
                      additionalFailures,
                      Array.match({
                        onEmpty: () =>
                          encode(failureExit).pipe(Effect.orDie),
                        onNonEmpty: () =>
                          Effect.die(
                            new Error(
                              "Docs route failure contained multiple expected errors"
                            )
                          ),
                      })
                    ),
                })
              )
            )
          )
        )
      )
    )
  );
```

This is the required control-flow shape, subject only to naming and formatter
details discovered during implementation. It uses Effect `Array` and the
imported `pipe` function rather than native array methods. `encodeExit` captures
the program exit once, preserves any cause containing a defect or interruption
with `Effect.failCause`, and
schema-encodes only success or exactly one expected failure. Empty and multiple
typed failure causes violate the sequential docs-loader contract and become
explicit invariant defects through `Effect.die`, not thrown exceptions.

An encoding failure for a value already produced under the canonical
success/error contract is also an invariant defect; `Effect.orDie` may be used
only at that codec-encoding point. Expected application errors remain in the
typed error channel and may be refined with `Effect.mapError`,
`Effect.catchTag` or `Effect.catchTags`; they must not be caught broadly or
converted with `Effect.orDie`.

The implementation should prefer `Match`, `Exit`, `Cause` and pipe-first
composition over nested Promise control flow, `if` ladders or broad catches.
It must not convert expected docs failures into defects or convert defects into
recoverable transport values.

### Restore once at the route root

The boundary exposes one clearly named `restore` operation accepting
`unknown`. It decodes the JSON codec, maps `Schema.SchemaError` inline to
`DocsRouteTransportError`, and flattens an expected `Exit` into a typed
`Result`. An impossible decoded cause without a typed expected error becomes a
transport invariant failure; it must not throw from React render.

The implementation must keep that flow inline in `restore`:

```ts
const restore = (encoded: unknown) =>
  Schema.decodeUnknownResult(codec)(encoded).pipe(
    Result.mapError(
      (issue) =>
        new DocsRouteTransportError({
          message: formatSchemaIssue(issue),
        })
    ),
    Result.flatMap((exit) =>
      Match.value(exit).pipe(
        Match.when(Exit.isSuccess, ({ value }) => Result.succeed(value)),
        Match.orElse(({ cause }) =>
          Match.value(cause).pipe(
            Match.when(Cause.hasDies, () =>
              Result.fail(
                new DocsRouteTransportError({
                  message: "Decoded loader failure contained a defect",
                })
              )
            ),
            Match.when(Cause.hasInterrupts, () =>
              Result.fail(
                new DocsRouteTransportError({
                  message: "Decoded loader failure contained an interruption",
                })
              )
            ),
            Match.orElse((expectedCause) =>
              pipe(
                expectedCause.reasons,
                Array.filter(Cause.isFailReason),
                Array.matchLeft({
                  onEmpty: () =>
                    Result.fail(
                      new DocsRouteTransportError({
                        message:
                          "Decoded loader failure contained no expected error",
                      })
                    ),
                  onNonEmpty: (failure, additionalFailures) =>
                    pipe(
                      additionalFailures,
                      Array.match({
                        onEmpty: () => Result.fail(failure.error),
                        onNonEmpty: () =>
                          Result.fail(
                            new DocsRouteTransportError({
                              message:
                                "Decoded loader failure contained multiple expected errors",
                            })
                          ),
                      })
                    ),
                })
              )
            )
          )
        )
      )
    )
  );
```

`DocsRouteTransportError` remains a schema-owned tagged error with a
`Schema.String` message. Bind the Schema issue formatter once beside the codec;
malformed codec input uses that canonical formatter, while a decoded cause with
defects, interruption, no expected error or multiple expected errors uses a
deterministic invariant message. Docs loader programs are sequential and have
one expected error union, so producer and consumer both enforce exactly one
typed failure reason rather than silently choosing the first reason. The
consumer checks defect and interruption defensively because representation-level
input is untrusted even though the producer must preserve those causes through
`Effect.failCause` before encoding.

The producer and consumer cardinality branches intentionally have different
outputs: invalid producer state is an Effect defect, while invalid decoded
transport is a typed route failure. Do not unify them through `unknown`, unsafe
casts or polymorphic callbacks. A local shared helper is acceptable only if it
returns one canonical, fully typed cardinality result that materially reduces
complexity for both branches; otherwise keep the output-specific `Match` and
`Array` transformations inline.

```ts
component() {
  const loaderData = Route.useLoaderData();
  const routeResult = docsPageRouteBoundary.restore(loaderData);

  return Result.match(routeResult, {
    onFailure: (error) => <DocsRouteFailure error={error} />,
    onSuccess: ({ navigation, page }) =>
      <DocsPageLayout navigation={navigation} page={page} />,
  });
}
```

This synchronous restore is permitted because `Route.useLoaderData()` is the
first consumer of the hydrated representation. It should be direct and visible
as one immutable loader-data binding followed by one restore binding. "Once"
means one restore expression per invocation of each direct consumer, not one
evaluation for the lifetime of the route. React may render again. Do not add
`useMemo`, module caches or mutable state for semantic correctness, and do not
hide restoration in `useDecodedLoader`, context providers, higher-order
components or a component created only to obtain a lint exemption.

If a route `head` callback consumes loader data, it must restore the same
contract before reading success fields. When TanStack types `loaderData` as
optional, use `Option.fromUndefinedOr` before restoration rather than raw
`undefined` branching. The callback may choose an empty metadata result for
malformed or expected failures, but it must not inspect encoded objects.
When both `component` and `head` consume loader data, each is an independent
consumer and restores its own input once; do not introduce shared mutable cache
or module state between them.

### Keep React composition typed

The route root may match transport state because it owns route composition.
Extract a container or leaf only when it owns meaningful UI policy, is reused,
or materially reduces repetition. Do not split one-off JSX merely to make the
route file shorter.

Extracted components must:

- receive canonical schema-derived readonly values, callbacks or children;
  prop types must reuse owning schema types rather than mirror their fields
- avoid `Route.useLoaderData`, route-boundary imports and representation-level
  `unknown`
- avoid Schema decoders, Effect service acquisition and runtime execution
- avoid data fetching, storage reads and environment access
- use `Result`, `Option` and `Match` for typed composition where they clarify
  closed states

Use three explicit React ownership levels:

- the route boundary component reads loader data, restores once and exhaustively
  matches transport/expected state
- route composition components own meaningful page layout and distribute
  focused canonical values
- leaf components render focused props and may own local interaction state, but
  do not receive encoded loader data, the whole loader `Result` or broad route
  success objects when they need only one field

Prefer components such as `DocsRouteFailure`, `DocsPageLayout`,
`DocsNavigation` or `DocsArticle` when they own exhaustive error presentation,
layout or a focused visual region. Do not replace them with one-use render
functions such as `renderFailure` or `renderNavigation`, and do not split JSX
that has no independent UI responsibility.

The route root may be an inline `component()` method or a statically traceable
named component referenced by the route definition. In either form, that exact
consumer owns `Route.useLoaderData()`, calls `restore` once and matches the
typed result. It then passes focused values into route composition. Extraction
must follow ownership: a meaningful route container may compose several pure
leaves, but no child may recover route data through `getRouteApi`, import the
route boundary or receive the encoded representation.

### Enforce the narrow exception

Keep `taxkit/no-decoding-outside-boundaries` globally enabled. The actual
Schema decoder stays in the exact route-boundary module; route files do not
receive a broad decoder exemption.

Add `taxkit/no-route-transport-restore-outside-consumers`. It should track
direct named imports from configured canonical route-boundary module specifiers
and report restoration outside direct `createFileRoute` `component` or `head`
consumers. Configuration must use exact `routeTransportBoundaryModules` and
`routeTransportConsumerFiles` entries, with no filename heuristics or route
globs. Namespace, default, dynamic or CommonJS import shapes are unsupported
and must fail closed if they reference the canonical operation.

The rule should reject restoration in ordinary components, extracted leaves,
custom hooks, callbacks and helper wrappers, including code in an otherwise
valid route file. Any reference to a canonical `restore` member is invalid
unless that member is the direct callee of an allowed invocation. This rejects
destructuring, renaming, function extraction, callback passing, and
`.call`/`.apply`/`.bind` indirection rather than trying to follow arbitrary
dataflow. It should also reject multiple restoration calls for the same
consumer.

The rule must recognise inline consumers and same-file named consumers that are
statically referenced by the route definition. If a route/component binding
cannot be resolved statically, it must fail closed with a specific diagnostic
rather than silently allow restoration. It must not put route `.tsx` files in
`decodingBoundaryFiles`. An unrelated object method named `restore` must not be
treated as the canonical boundary operation.

Component restoration must consume either that route's direct
`Route.useLoaderData()` call or one immutable local binding whose initializer
is that direct call. Head restoration must consume the callback's `loaderData`
input after schema-owned `Option` normalisation when optional. A value recovered
via `getRouteApi`, props, context, reassignment, closure capture or a child
callback is not an allowed substitute. The restored `Result` must be matched in
the same boundary consumer rather than forwarded to a child.

Real Oxlint CLI tests must prove:

- direct and single-immutable-binding route-root restore forms are allowed
- a route `head` restore from its `loaderData` input is allowed
- leaf, hook, helper and unrelated-file restoration is rejected
- namespace/default imports, aliases, destructuring, computed/static members,
  callback passing and `.call`/`.apply`/`.bind` cannot evade the rule
- supported named route components are allowed and unresolved bindings fail
  closed
- reassigned loader data, multiple restores and forwarding the restored
  `Result` to a child are rejected
- unrelated methods named `restore` do not produce false positives
- direct Schema decoding in the route file remains rejected by
  `taxkit/no-decoding-outside-boundaries`
- inline disable directives for either boundary rule fail
- encoding and declarative `Schema.decodeTo` remain valid

Do not enforce helper quality through function-length limits. The three-pass
audit and parent review must reject helpers that do not own repeated policy.

## Tests and verification

Unit tests should cover the codec independently of React:

- canonical success round-trip
- every current tagged expected docs failure round-trip
- malformed representation becomes `DocsRouteTransportError`
- producer defects, interruptions and typed-failure causes combined with either
  are preserved as failed causes rather than encoded route data
- empty and multiple typed producer failures become invariant defects
- decoded defect, interruption, empty and multiple-failure representations
  become `DocsRouteTransportError` without throwing
- the boundary accepts only programs whose success/error channels match its
  canonical schemas
- the browser-import graph for the route boundary contains no service, runtime,
  server, filesystem, environment or generated-source dependency

A compile-time fixture must pair a boundary with an incompatible success or
error program and prove TypeScript rejects the mismatch without casts.

Add Vitest Browser Mode with Playwright for the docs app, following the proven
configuration shape in `site:apps/web`. A programmatic client-side
TanStack route tree should prove direct route-root restoration and framework
error boundaries without adding production test routes. The harness should
cover success, recoverable expected failure, malformed transport, defect and
interruption, and assert that no unexpected console warnings or errors occur.
This harness does not claim to prove SSR dehydration or hydration.

Run the built docs app on its real home and one content route. For initial SSR,
prove server-rendered content is present before client interaction, then prove
browser hydration retains that content with no mismatch or console error. For
client navigation, observe a successful server-function request and prove the
destination MDX renders from the encoded response. These built-app checks prove
the two production paths; deterministic codec and synthetic client-route tests
cover failure states that should not require production test routes.

Required final gates:

```bash
bun run lint
bun run test:oxlint
bun run test:docs-boundaries
bun run --filter=docs test:browser
bun run --filter=docs check-types
bun run --filter=docs build
bun run docs:validate
bun run verification
jq empty docs/product-specs/tanstack-start-loader-transport-boundaries.tasks.json
git diff --check
```

## Risks and tradeoffs

- Restoration is synchronous route-root work and may repeat on React renders.
  "Once" is a source/dataflow invariant per consumer invocation. Keep the codec
  direct and deterministic; do not add memoisation or module state for semantic
  correctness. Measure before adding performance policy.
- A custom lint rule can enforce static call shape but cannot prove every
  runtime dataflow. Browser proof, exact call-graph audits and parent review
  remain required.
- A route-root exception can become a loophole if route files accumulate leaf
  implementations. The specialised rule must inspect the owning consumer, not
  merely allowlist an entire `.tsx` file.
- Browser tooling adds a private app development dependency and local Chromium
  requirement. Keep it app-scoped and do not turn it into a production
  dependency.
- The site reference uses `if` branches and a nested `Result<Exit>` consumer.
  TaxKit should retain the proven transport lifecycle while using `Match`, a
  flattened typed `Result` and the existing error-presentation contract.
- The currently installed versions are `@tanstack/react-start@1.167.65`,
  `@tanstack/react-router@1.169.2` and `effect@4.0.0-beta.60`. Implementation
  must recheck `bun.lock` and installed source before copying API assumptions;
  the ownership and transport invariants remain authoritative if syntax moves.

## Versioning and changelog impact

No Changeset is expected. The work changes app-internal docs routing, private
test tooling, repository lint rules and maintainer documentation. It does not
change package exports, install behaviour or a package-facing contract.

Implementation must still run `bun run changeset status --verbose` and record
the no-Changeset rationale. Do not consume existing pending Changesets.

## Acceptance criteria

- TanStack route loaders return only the schema-encoded `Exit` representation.
- Server functions retain strict TypeScript input/output serialisability
  checking without casts or `strict: false`, and runtime browser evidence proves
  actual serialisation.
- No loader restores the server-function response before returning it to
  TanStack.
- The route boundary uses `Schema.Never` for defects and preserves defects and
  interruptions as failed causes.
- Producer and consumer enforce exactly one typed failure reason; empty,
  multiple, defect-bearing and interruption-bearing decoded causes never become
  ordinary expected-failure UI.
- Each route root restores its loader representation once before inspecting
  success or failure values.
- Expected docs failures and malformed transport remain distinct typed route
  states.
- Ordinary components, leaves and hooks cannot restore loader transport or
  execute Schema decoders.
- The direct route boundary component matches the restored `Result`; children
  receive focused canonical values rather than encoded data, route state or
  mirrored prop DTOs.
- `taxkit/no-decoding-outside-boundaries` and
  `taxkit/no-route-transport-restore-outside-consumers` pass positive,
  negative, named-component, alias and inline-disable CLI tests.
- Effect code is a clean linear pipeline with canonical schemas, typed errors,
  no unsafe casts, no mirrored DTOs, no broad catches and no nested runtime.
- No route-specific decoder hooks, one-use mappers or wrapper components are
  introduced to satisfy lint.
- The current one-use `toRouteResult` helper is removed; restoration flattening
  remains inline in the policy-owning constructor.
- The browser-visible route-boundary import graph contains only browser-safe
  schema, error and Effect dependencies.
- Unit, browser-route, SSR/hydration, docs build, docs validation and full
  repository verification gates pass.
- The final architecture docs, prior boundary-only spec, this spec, task list
  and completed execution plan describe the implemented call graph accurately.
- Every implementation task receives three documented improvement audits and
  parent acceptance before the next task begins.

## References

- [Effect services](../architecture/effect-services.md)
- [Frontend](../architecture/frontend.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Package ownership](../architecture/package-ownership.md)
- [Boundary-only decoding](./boundary-only-decoding.md)
- [TanStack Start server functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [TanStack Start execution model](https://tanstack.com/start/latest/docs/framework/react/guide/execution-model)
- [TanStack Router SSR](https://tanstack.com/router/latest/docs/guide/ssr)
- [TanStack Router loader data](https://tanstack.com/router/latest/docs/api/router/useLoaderDataHook)
- Reference implementation: `site:apps/web/src/lib/loader/serializable.ts`
- Reference browser proof: `site:apps/web/src/lib/loader/serializable.browser.test.tsx`
