# Runtimes and Host Boundaries

## Contents

- [One owner per host lifecycle](#one-owner-per-host-lifecycle)
- [Adapter shape](#adapter-shape)
- [Runtime composition](#runtime-composition)
- [Shutdown](#shutdown)
- [Cloudflare Workers](#cloudflare-workers)
- [Framework loaders actions](#framework-loadersactions)
- [Browser](#browser)
- [Tests](#tests)
- [Runtime anti-patterns](#runtime-anti-patterns)

## One owner per host lifecycle

An application owns runtime construction and disposal. A package exposes Effect programs and Layers.

Typical owners:

- Bun/Node CLI main;
- HTTP server bootstrap;
- Cloudflare Worker module/handler adapter;
- browser application root;
- test runner;
- Alchemy entrypoint.

Construct at most one long-lived runtime per independent host lifecycle. A browser and server may need separate runtimes because their environments differ.

## Adapter shape

Keep adapters small:

```text
host input
  -> Schema decode
  -> named Effect operation
  -> provide application runtime
  -> execute
  -> Schema encode / host response
```

Do not perform domain branching, retry loops, provider calls, or manual logging in the adapter.

## Runtime composition

Compose Layers by dependency:

1. platform services;
2. Config provider;
3. transport/storage/provider Layers;
4. domain live Layers;
5. observability Layers;
6. application services;
7. runtime.

Memoise shared Layers according to the installed Effect API. Avoid constructing a new SDK/exporter/client for each request unless per-request lifetime is required.

## Shutdown

Tie runtime disposal to:

- process signals for CLI/server;
- framework shutdown/hot-reload lifecycle;
- Worker request completion for scoped work;
- test scope/finaliser;
- explicit Alchemy callback lifecycle.

Do not leave timers, sockets, spans, or fibres detached after shutdown.

## Cloudflare Workers

Treat the exported `fetch` handler as a host adapter.

- Decode bindings once into a typed service/Config Layer.
- Keep secrets redacted.
- Use the host's incoming Effect request fibre when it supplies one; otherwise
  run through the application's sole host runner.
- Connect background completion to `ExecutionContext.waitUntil` or the installed platform integration.
- Preserve interruption/resource finalisers within the platform constraints.
- Avoid global mutable request state.

Separate platform telemetry from application Effect telemetry.

For the native Alchemy API, build shared Layers in the Worker-instance Scope.
Each incoming request keeps its own Scope, interruption and response cleanup.
The separate TanStack Website owns typed clients and one `runtime.server.ts`
runner; its private binding adapter forwards requests to the same-stage API.
Do not lend Effect Context or request services through TanStack, merge them
into its runtime, or borrow native tracer hooks. The native API owns its request
telemetry. Any frontend host-span adapter needs its own qualified owner and
tests. Follow
[hosted web telemetry](../../../alchemy-iac/references/effect/hosted-web-telemetry.md)
for those separate lifetimes and proof limits.

## Framework loaders/actions

When a framework requires a Promise:

- use one runtime bridge;
- call one named operation;
- encode only serialisable success/error data;
- preserve redirects/responses as explicit protocol values;
- do not return Effect services or Causes to the client.

Hydration boundaries require encoded values. Never assume class instances, provider errors, or arbitrary tagged objects survive serialisation.

## Browser

Use a client runtime only for client-owned effects. Do not ship server secrets, provider Layers, filesystem services, or server Config.

Web owners use `runtime.server.ts` and `runtime.client.ts`, with imports inside
TanStack's matching environment functions. Runtime permission comes from the
repository's exact allowed paths, not a filename suffix. React owns the browser
Atom runtime and registry lifetime.

Model browser lifecycle:

- abort/interruption on navigation or unmount;
- subscriptions scoped to components/routes;
- transport through a typed client service;
- cached state through a declared cache/store service;
- telemetry with browser-safe fields.

## Tests

Tests may execute Effect directly through the test integration or a scoped test runtime. Do not make each test recreate unrelated live dependencies. Compose a deterministic test Layer and release it after the suite/test scope.

## Runtime anti-patterns

Reject:

- `Effect.runPromise` inside `service.ts`;
- one runtime per function call;
- global runtime in a shared package;
- environment reads during module import;
- live Layer construction in React render;
- swallowed shutdown/finaliser errors;
- detached Promise background work.
