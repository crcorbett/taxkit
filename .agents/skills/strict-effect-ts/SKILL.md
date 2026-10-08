---
name: strict-effect-ts
description: Implement, review, migrate, or enforce extremely strict Effect TypeScript architecture across application, package, script, server, client, infrastructure, provider, transport, persistence, concurrency, and observability code. Use whenever owned TypeScript contains Promise or async workflows, thrown errors, nullable values, environment access, JSON or unknown input, fetch or SDK clients, timers, randomness, mutable collections, state, queues, streams, resource lifetimes, logging, tracing, metrics, tests, service.ts, live.layer.ts, errors.ts, schemas.ts, or Alchemy integration. Enforce Effect-first designs while preserving narrow host-framework runtime boundaries.
---

# Strict Effect TypeScript

Treat Effect as the application language for every fallible, asynchronous, stateful, concurrent, resourceful, configuration-dependent, or boundary-crossing workflow. Allow plain TypeScript only for total, deterministic leaf computation and unavoidable host adapters.

Use this skill with repository-local instructions, `$repo-structure`, `$package-structure`, and `$effect-client-wrapper` where applicable. Use `$alchemy-iac` for infrastructure ownership, provider proof, and deployment lifecycle.

## Strictness level

This skill is intentionally stricter than ordinary Effect guidance.

In owned code, do not introduce:

- `async` or raw `Promise` orchestration;
- thrown domain or expected operational errors;
- raw `fetch` or an exposed SDK client;
- direct `process.env`, `Bun.env`, `import.meta.env`, or platform binding reads below a host adapter;
- unchecked `JSON.parse`, type assertions, `any`, or manual `unknown` narrowing;
- nullable domain models after ingress;
- `Date.now`, `new Date()` as a clock, `Math.random`, unmanaged timers, or sleeps;
- `console.*` for application telemetry;
- mutable local or global collections, loops, reassignment, raw `Map`/`Set`, or detached background work;
- repeated decoding of already checked domain values or JSON keys for an internal cache;
- copied primitive refinements or handwritten data types that compete with an owning Schema;
- generic callback escape hatches such as `request<T>(fn)`, `run<T>(callback)`, or `withClient(fn)`;
- package-owned runtimes or repeated `Effect.runPromise`;
- provider objects, wire DTOs, or primitive configuration crossing service boundaries.

A narrow host callback may be synchronous or Promise-shaped only when a framework requires it. Adapt it immediately to an Effect program, provide one application-owned runtime, and execute only at that boundary. Document any other exception beside the code with its host constraint, containment, and test.

## Allowed plain TypeScript

Keep plain TypeScript for:

- total pure functions over already-decoded values;
- type declarations and static constants;
- JSX and framework declarations that do not perform effects;
- immutable transformations using Effect Array, Record, HashMap and HashSet functions;
- the smallest adapter signature required by a host framework;
- performance-sensitive native data structures proven by measurement and encapsulated behind an Effect service.

Plain does not mean unchecked. Boundary data still requires Schema, failure still requires a typed error channel, and effects still require the application runtime.

Read [policy and exceptions](references/architecture/policy-and-exceptions.md).

## Mandatory workflow

### 1. Inspect the exact codebase

Before editing:

1. Read repository and package instructions.
2. Inspect the receiving repository's installed Effect version and exports. Research the cloned v4 source when available, record its revision, then check every chosen API against installed source/types and behaviour. The canonical template snapshot qualifies rc.117; it does not choose an upgrade for another repository.
3. Find existing schemas, errors, services, Layers, runtimes, test Layers, and observability.
4. Identify the current package boundary and intended public API.
5. Search the change surface for strictness violations.
6. Preserve unrelated dirty worktree changes.

When documentation and installed types disagree, follow the installed package, then record any compatibility decision.

### 2. Classify every operation

For each operation, identify:

- value success type;
- expected error union;
- service requirements;
- external inputs that need decoding;
- resource lifetime;
- concurrency and interruption behaviour;
- retry and timeout policy;
- logging, span, and metric semantics;
- runtime owner.

Use this translation:

| Vanilla TypeScript         | Required Effect model                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `async` / `Promise`        | `Effect`, `Effect.gen`, `Effect.fn`; `tryPromise` only at ingress                               |
| `throw`                    | typed `Effect.fail`; defect only for impossible invariant failure                               |
| `T \| null \| undefined`   | decode once, then `Option<T>` where absence is semantic                                         |
| environment strings        | `Config` plus `Schema` refinement                                                               |
| JSON / `unknown`           | Schema decode and encode                                                                        |
| `fetch`                    | Effect Platform `HttpClient` or a private typed adapter                                         |
| provider SDK               | private `live.layer.ts`; decode every output                                                    |
| filesystem / child process | Effect Platform services in a private Layer                                                     |
| time / retry               | `Clock`, `Duration`, `Schedule`, timeout                                                        |
| randomness / identifiers   | Effect Random or an injected service                                                            |
| mutable state              | `Ref`, `SynchronizedRef`, `SubscriptionRef`; `TxRef` inside `Effect.tx` for coordinated updates |
| `Map` / `Set` domain state | `HashMap`, `HashSet`, `Chunk`, `ReadonlyArray`                                                  |
| event callback             | `Queue`, `PubSub`, `Deferred`, `Stream`                                                         |
| cleanup                    | `Scope`, acquire/use/release                                                                    |
| `console`                  | structured Effect logging                                                                       |
| test sleep / network       | `TestClock`, deterministic test Layer                                                           |

### 3. Model boundaries first

Create or update, in order:

1. `schemas.ts` for external and domain codecs, brands, and redaction policy.
2. `errors.ts` for the closed expected error vocabulary.
3. `service.ts` for named semantic operations.
4. `live.layer.ts` for SDK, transport, storage, and configuration wiring.
5. `memory.layer.ts` or a domain-specific test Layer with the identical contract.
6. operation modules only when they own substantial reusable policy.
7. an application runtime at the host root.

Do not create ceremonial files. A small service may colocate a coherent contract; split when ownership is stable. Read [file and package conventions](references/architecture/files-and-packages.md).

### 4. Make public operations closed

A public service operation should normally have:

```ts
Effect.Effect<Success, DomainError, never>;
```

Build dependencies into the service Layer. Do not make each caller provide transport, configuration, clock, SDK, or persistence requirements unless the dependency is intentionally part of the public composition contract.

Expose named operations such as `createRedirectUri`, `queryDataset`, or `loadAccount`. Do not expose raw clients, arbitrary request methods, or generic callbacks.

Read [services and Layers](references/services/services-and-layers.md) and [provider adapters](references/services/provider-adapters.md).

### 5. Decode at ingress and encode at egress

- Decode environment, HTTP, queue, database, filesystem, provider, and state payloads immediately.
- Brand identifiers and constrained strings.
- Use exact object schemas where unknown keys would hide drift.
- Redact secrets at acquisition and in error/log encoders.
- Encode owned outbound payloads and durable receipts.
- Never cast a provider response into the domain type.
- Infer domain, service and wire data types from one owning Schema. Reuse its fields, brands and whole-record checks in transport and persistence codecs. Spreading fields does not copy a record-level check.
- Keep already decoded values typed through internal calls. Construct new constrained values with the owning fallible constructor and map its validation issue to a named error. Construct unchanged records directly from checked fields.
- Convert optional/null source fields into Option. When historical bytes distinguish missing keys from null, preserve that distinction in the codec and prove the original encoding and hashes.
- Use readonly structured cache keys with the installed equality/hash contract. Do not encode and decode internal keys as JSON.

Read [schemas and brands](references/modeling/schemas-and-brands.md), [errors and Causes](references/modeling/errors-and-causes.md), and [Config and secrets](references/services/config-and-secrets.md).

### 6. Preserve structured effects

Keep Effect programs flat and sequential. Extract a helper only when it is independently reusable, represents stable policy, owns I/O, or owns resource lifetime.

Use structured concurrency. Every child fibre must be joined, scoped, supervised, or deliberately daemonised at an application boundary with an explicit lifecycle. Encode backpressure. Make interruption and finalisation part of the design.

Read [fibres, queues, and streams](references/concurrency/fibres-queues-and-streams.md) and [scope, time, retry, and interruption](references/concurrency/scope-time-retry-and-interruption.md).

### 7. Instrument semantic work

- Public service methods use named `Effect.fn("Service.operation")`.
- Private Effect helpers use `Effect.fnUntraced` when they do not own a separate
  span. A private external operation may still deserve named `Effect.fn`.
- Log structured, bounded, secret-negative fields.
- Create spans around semantic operations and external calls, not Layer construction.
- Classify expected failure without dumping arbitrary Causes.
- Use low-cardinality metric labels.
- Add application/resource identity: service, version/revision, environment, stage, repository, and branch/ref where useful.
- Keep application telemetry separate from platform telemetry.
- Treat exporter success as transport evidence only; query the backend for ingestion proof.

Read [logging, tracing, and metrics](references/observability/logging-tracing-and-metrics.md).

### 8. Test the contract and its real boundary

Test:

- Schema boundary success and failure;
- each tagged error branch;
- Layer construction;
- live adapter translation using controlled transport or SDK fixtures;
- the same service contract through a memory/test Layer;
- timeout, retry, interruption, and cleanup using deterministic time;
- concurrency ordering and backpressure;
- observability field safety;
- serialisation round-trips.

Never make ordinary unit tests depend on the live network or wall-clock sleeps. Read [deterministic testing](references/testing/deterministic-testing.md).

### 9. Enforce the policy

Run narrow searches for forbidden constructs on changed owned TypeScript. Classify each match as:

- host-required adapter;
- generated/vendor code;
- measured encapsulated exception;
- violation.

Use lint restrictions, architecture tests, package exports, and code review to stop recurrence. Read [lint, review, and migration](references/enforcement/lint-review-and-migration.md).

## Domain reference map

Architecture:

- [policy and exceptions](references/architecture/policy-and-exceptions.md)
- [files and packages](references/architecture/files-and-packages.md)
- [runtimes and host boundaries](references/architecture/runtimes-and-boundaries.md)

Modelling:

- [schemas and brands](references/modeling/schemas-and-brands.md)
- [errors and Causes](references/modeling/errors-and-causes.md)
- [Option, Result, Match, and collections](references/modeling/option-either-match-and-collections.md)

Services and state:

- [services and Layers](references/services/services-and-layers.md)
- [Config and secrets](references/services/config-and-secrets.md)
- [provider adapters](references/services/provider-adapters.md)
- [state, collections, and caches](references/state/state-collections-and-caches.md)

Concurrency and resources:

- [fibres, queues, and streams](references/concurrency/fibres-queues-and-streams.md)
- [scope, time, retry, and interruption](references/concurrency/scope-time-retry-and-interruption.md)

Transports and persistence:

- [HTTP, RPC, and serialisation](references/transports/http-rpc-and-serialization.md)
- [filesystem, processes, and platform services](references/transports/filesystem-process-and-platform.md)
- [persistence and transactions](references/transports/persistence-and-transactions.md)

Observability and tests:

- [logging, tracing, and metrics](references/observability/logging-tracing-and-metrics.md)
- [deterministic testing](references/testing/deterministic-testing.md)

Applications:

- [Bun, CLI, workers, and framework hosts](references/applications/bun-cli-workers-and-frameworks.md)
- [browser and Web Platform](references/applications/browser-and-web-platform.md)
- [React and TanStack](references/applications/react-and-tanstack.md)
- [MCP and WebMCP](references/applications/mcp-and-webmcp.md)
- [PostHog browser service and scoped SDK adapter](../effect-client-wrapper/references/posthog-browser.md)
- [PostHog application, backend capture and native HTTP relay](../alchemy-iac/references/effect/posthog-analytics.md)

Enforcement and examples:

- [lint, review, and migration](references/enforcement/lint-review-and-migration.md)
- [strict cookbook](references/examples/strict-cookbook.md)
- [format-selected client contract](references/examples/format-selected-client.md)
- [anti-patterns](references/examples/anti-patterns.md)
- [primary sources and version policy](references/sources.md)

## Final review

Do not call the change strict Effect code unless all relevant statements are true:

- External data is decoded and outbound data is encoded.
- Expected failures are a closed tagged error union.
- Services expose named domain operations.
- Live dependencies are private to Layers.
- Public operations have no accidental requirements.
- Runtime execution occurs only at an application boundary.
- Time, randomness, retry, concurrency, state, and cleanup are Effect-managed.
- Nullable values do not leak past ingress.
- No raw client, generic callback, assertion, or Promise escape hatch was added.
- Logs, spans, metrics, and receipts are secret-negative and low-cardinality.
- Tests use deterministic Layers and prove failure/interruption paths.
- Pure work uses immutable Effect collection operations; changing shared state uses an owned Ref or transactional primitive with pure updates.
- Domain alternatives use exhaustive Match; Option and Result use their own matching APIs.
- Schemas and brands have one owner, typed internal calls do not decode again, and cache keys do not use JSON.
- Historical source formats, missing/null distinctions and byte hashes have explicit compatibility tests when changed.
- Any exception is narrow, documented, and enforced against expansion.
