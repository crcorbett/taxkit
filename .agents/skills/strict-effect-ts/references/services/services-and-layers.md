# Services and Layers

## Contents

- [Contract first](#contract-first)
- [Named operations](#named-operations)
- [Public methods and private helpers](#public-methods-and-private-helpers)
- [Close public requirements](#close-public-requirements)
- [Layer construction](#layer-construction)
- [Layer dependency direction](#layer-dependency-direction)
- [Layer names](#layer-names)
- [Memory test Layers](#memorytest-layers)
- [Layer construction failures](#layer-construction-failures)
- [Avoid over-layering](#avoid-over-layering)
- [Tests](#tests)

## Contract first

A service exposes domain capabilities, not an implementation technology.

```ts
interface AccountsContract {
  readonly load: (id: AccountId) => Effect.Effect<Account, AccountNotFound | AccountsUnavailable>;

  readonly create: (
    input: CreateAccount,
  ) => Effect.Effect<Account, InvalidAccount | AccountsUnavailable>;
}
```

Use the installed Effect version's Context service/tag API. Give tags globally unique stable identifiers according to repository policy.

## Named operations

Prefer:

- `loadAccount`;
- `createRedirectUri`;
- `queryDataset`;
- `readDeployment`.

Reject:

- `request<T>(options)`;
- `execute<T>(callback)`;
- `withClient(fn)`;
- `raw`;
- `sdk`.

A caller should express domain intent without knowing URL paths, SDK methods, or credentials.

## Public methods and private helpers

Public service methods use named `Effect.fn("Service.operation")`. This names
the operation's span and preserves useful call-site information. Use the same
name in live and test implementations. Pass a generator directly to `Effect.fn`
when the method needs several steps; do not add an arrow returning `Effect.gen`.

Private Effect helpers use `Effect.fnUntraced` when their work belongs to the
calling operation's span. It adds no automatic function tracing or span; the
caller owns that context. A private helper that owns a
meaningful external call or separately measured operation can use named
`Effect.fn`; privacy alone does not forbid a span. Pure, total helpers remain
plain functions. Do not replace public methods with `fnUntraced` to reduce
telemetry noise; choose the public operations and sampling policy deliberately.

```ts
const lookupAccount = Effect.fnUntraced(function* (id: AccountId) {
  return yield* store.load(id);
});

return Accounts.of({
  load: Effect.fn("Accounts.load")(function* (id: AccountId) {
    return yield* lookupAccount(id);
  }),
});
```

Here `store` was acquired inside the Layer. A one-use helper should normally
stay inline; this example describes instrumentation, not a reason to extract it.

## Close public requirements

Public service operations should normally return:

```text
Effect<Success, DomainError, never>
```

The service Layer acquires transport, persistence, Config, Clock, or provider SDK requirements while constructing the implementation. This prevents dependency details leaking to every caller.

Keep a requirement public only when it is intentionally part of composition, such as a generic policy module designed to work over a caller-supplied service.

## Layer construction

Construct implementations in `live.layer.ts`:

1. acquire dependencies;
2. derive private helpers;
3. define named operations with exact contract types;
4. add spans/log annotations at semantic operations;
5. return the service implementation;
6. expose a Layer.

Avoid side effects during module import.

Choose the smallest construction that matches the work:

| Construction                                            | Use it when                                                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Layer.succeed(Service, Service.of(implementation))`    | The implementation is already available and construction performs no effects.                                        |
| `Layer.effect(Service, effect)`                         | Construction acquires other services, reads Config, or creates Effect-managed state, a cache or a concurrency limit. |
| `Layer.effect(Service, effect)` with scoped acquisition | A resource needs release when the Layer's scope closes.                                                              |

For the qualified Effect v4 RC API, use the two-argument `Layer.effect`. Check
installed types before copying this into a different version. `Service.of`
checks the implementation against the service contract; it does not run it.

```ts
export const AccountsLive = Layer.effect(
  Accounts,
  Effect.gen(function* () {
    const store = yield* AccountsStore;
    return Accounts.of({
      load: Effect.fn("Accounts.load")((id: AccountId) => store.load(id)),
      create: Effect.fn("Accounts.create")((input: CreateAccount) => store.create(input)),
    });
  }),
);
```

Create caches, `Ref`s and semaphores during acquisition, once per intended
Layer lifetime. A shared application Layer means shared state; a request Layer
means request state. Cache failure retention, size, timeout and concurrency
are deliberate policies, not universal defaults. Acquire external handles with
`Effect.acquireRelease` or the installed scoped constructor and keep release
inside that scope. Avoid closing a resource before a returned stream finishes.

## Layer dependency direction

If `AccountsLive` needs `AccountsStore` and `IdentityProvider`, its Layer input contains those services. Compose them at the application root.

Do not:

- provide dependencies inside every operation;
- import `AccountsStoreLive` from `service.ts`;
- make `AccountsLive` read process environment itself if Config can be layered;
- rebuild expensive clients per call.

`Layer.provide` supplies a Layer's dependencies while exposing the target's
outputs. `Layer.provideMerge` also retains the supplied outputs for other
consumers. `Layer.mergeAll` combines independent Layers; it does not wire one
Layer's output into another's input. Share the same Layer value at the root so
normal build memoisation shares acquisition. Recreating a Layer factory or
building separate runtimes can create extra clients and separate state.

Acquire individual dependency services, not the whole request Context. The
native host supplies request services in the incoming fibre; keep their lifetime
with that host. The separate TanStack frontend supplies client Layers without
borrowing the API request Context. Consumers import service contracts and
provide live Layers at the root, rather than importing raw SDK constructors.

## Layer names

Use:

- `AccountsLive`;
- `AccountsMemory`;
- `AccountsTest` when it is test-specific;
- `AccountsHttpLive` only if multiple live transports coexist.

`live.layer.ts` may export multiple closely related Layers, but avoid a global mega-Layer with unrelated domains.

## Memory/test Layers

Implement the identical service contract. A memory Layer may expose a separate control service for:

- seeding state;
- observing calls;
- injecting failure;
- advancing a simulated provider state.

Do not add testing-only methods to the Production service contract.

Make state immutable/Effect-managed and tests scoped so suites cannot leak state.

## Layer construction failures

If configuration or SDK construction can fail, express it in the Layer error channel and prove application startup handles it. Do not throw during import or constructor evaluation.

Once a runtime is successfully built, public service operations may be closed over those dependencies.

## Avoid over-layering

Do not create:

- a service for a pure stateless function;
- a Layer that only wraps a static constant with no composition value;
- one service per SDK method;
- a separate Layer for every helper.

Use services for substitutable capabilities, dependency boundaries, state/lifetime, provider isolation, or observability policy.

## Tests

Test:

- contract through memory and controlled live adapter;
- Layer builds with valid Config;
- Layer fails with typed error for invalid Config/client construction;
- public operation requirements are intentional;
- provider client is not publicly exported;
- dependencies are constructed once per intended scope.
