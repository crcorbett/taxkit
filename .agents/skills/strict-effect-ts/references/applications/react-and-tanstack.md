# React and TanStack

## Contents

- [Keep render pure](#keep-render-pure)
- [Server and client runtimes](#server-and-client-runtimes)
- [Loaders and actions](#loaders-and-actions)
- [TanStack Query](#tanstack-query)
- [TanStack Router Start](#tanstack-routerstart)
- [React lifecycle](#react-lifecycle)
- [State](#state)
- [Errors](#errors)
- [Tests](#tests)

## Keep render pure

React components should be total render functions over props, decoded loader/query state, and declared hooks. Do not:

- run Effect during render;
- construct live Layers during render;
- access server Config/secrets;
- call raw provider clients;
- mutate global state;
- create unmanaged Promise side effects.

JSX and pure view transformations may remain plain TypeScript.

## Server and client runtimes

Keep separate composition:

- server runtime: filesystem/database/provider/secrets;
- client runtime: browser transport, client cache, browser-safe telemetry.

Never serialise a service, Layer, Cause, Redacted value, or SDK object into hydration data.

Use TanStack's matching server/client environment functions for runtime imports
as well as the `*.server.ts` and `*.client.ts` filenames. Keep browser globals
out of module initialisation and inspect the built browser dependency graph.

For an Alchemy-hosted Website/API pair, keep TanStack as the frontend. All
Website server entry points use one runner whose Layers contain typed API
clients, not live backend implementations. A private Cloudflare service-binding
adapter supplies its same-stage API; browser clients use a checked public URL.
The native API owns HTTP/RPC/MCP handlers and executes them in its incoming
Effect fibre without another runtime.

Do not carry Effect Context through TanStack, merge event services into its
runtime, borrow tracer hooks or add a custom backend Worker around Start.
Preserve cancellation and body streams at the narrow host adapter. Native API
telemetry and any qualified frontend host-span adapter have separate owners;
see [hosted telemetry](../../../alchemy-iac/references/effect/hosted-web-telemetry.md).

## Loaders and actions

Framework loaders/actions are host adapters:

1. decode params/search/body/session;
2. call a named Effect service operation;
3. map tagged errors to redirect/not-found/protocol result;
4. encode hydration-safe data;
5. bridge to Promise only at the required callback.

Keep retries, provider calls, and business policy inside Effect services.

## TanStack Query

Wrap query/mutation functions through one runtime bridge. The query key must use stable encoded domain identity.

Define intentionally:

- which layer owns retry: Query or Effect Schedule, not both accidentally;
- cancellation: Query AbortSignal interrupts the Effect;
- error shape: encoded domain/protocol error, not Cause;
- cache staleness versus Effect Cache;
- invalidation after mutation;
- server prefetch/hydration encoding.

Avoid returning `Effect.runPromise(program)` ad hoc from every component.

## TanStack Router/Start

Keep route definitions declarative. Route loaders decode and bridge to the server/client runtime appropriate to the execution environment.

For serialisable loader data:

- Schema encode before crossing server/client;
- Schema decode on the receiving side if trust boundary requires;
- represent expected recoverable states explicitly;
- prove all error variants are handled.

Do not depend on class prototype identity after hydration. Return a
Schema-encoded success/error result for expected backend failures and decode it
on the receiving side. Prove tags and useful fields survive the actual TanStack
transport, including an error response status.

## React lifecycle

For subscriptions/streams:

- acquire in an effect/hook adapter;
- scope to mount/route lifetime;
- interrupt on unmount/navigation;
- avoid duplicate subscriptions under development lifecycle;
- encode backpressure/sampling;
- update view state through a controlled adapter.

Do not launch a daemon fibre from a component without cleanup.

When Effect Atom already owns browser work, use its runtime and root registry.
An optional registration/subscription pattern is
`Atom.runtime(browserLayers).atom(scopedOperation)`, mounted with `useAtomMount`
under one `RegistryProvider`. Unmounting must release the operation's Scope and
interrupt outstanding work. A browser-only registration has an inert server
counterpart selected through TanStack's environment function. Do not create an
extra ManagedRuntime or an unmanaged Promise workflow in a component. Atom is
not required for purely synchronous local UI state.

## State

Keep domain state in Effect services when it is shared, concurrent, or effectful. Keep local ephemeral UI state in React when it is truly view-local and synchronous.

Do not move every `useState` into Effect. Do move provider/cache/concurrent workflows out of component-local mutable logic.

## Errors

Translate domain errors to a closed UI state:

- not found;
- unauthorised;
- validation fields;
- unavailable/retry;
- conflict;
- unexpected defect boundary.

Never render raw provider messages, stack traces, or Causes.

## Tests

Test:

- domain service independently;
- loader/action decoding and encoding;
- runtime bridge and cancellation;
- hydration round-trip;
- retry ownership;
- subscription cleanup;
- no server dependency in client bundle;
- exhaustive UI error states.
