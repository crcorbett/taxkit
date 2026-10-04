# Effect service rules

Use the installed Effect version and repository exemplars. For Effect v4:

- Define application capabilities with `Context.Service`.
- Keep live/test Layers in implementation subpaths.
- Check implementations with `Service.of`. Use `Layer.succeed` for an already
  available implementation and two-argument `Layer.effect` for effectful setup.
- Public methods use named `Effect.fn("Service.operation")`; private Effect
  helpers use `Effect.fnUntraced` unless they own a separately useful span.
- Acquire clients, state, caches and limits once per intended Layer lifetime.
  Compose dependencies at the application root and scope resource release.
- Use `Schema.decodeUnknownEffect` immediately for unknown provider output.
- Use `Config.schema` for meaningful configuration and redact secrets.
- Map expected failures into tagged application errors without runtime
  class-identity branching. Preserve useful safe context and causes.
- Put retry, timeout, concurrency, interruption, and resource scope at the
  operation or adapter that owns them.
- Keep `Effect.runPromise`/runtime execution at application, framework, CLI, or
  adapter boundaries.

Reject these API shapes:

- generic `use`, `run`, or `withClient` callbacks over an SDK;
- a raw-client accessor or unconstrained generic result;
- raw `id: string` when an owning brand exists;
- manually threaded primitive config when an owning Config Schema exists;
- pass-through readers/mappers/forwarders used once;
- provider DTOs returned before decoding.

One readable generator is not automatically monolithic. Extract only stable
policy, demonstrated reuse, I/O, or resource lifetime.

## Checked immutable service values

Infer data records from their one owning Schema; share branded fields and
whole-record refinements through every codec. A live/test implementation returns
that type directly. Do not decode a checked service input/reply again. New
constrained values use an installed fallible constructor with the owner's named
error; unchanged records assemble from already checked fields.

Pure transformations use Effect Array/Record functions and persistent keyed
collections. No loops, reassignment or hidden mutation. Mutable shared state
uses an owned Ref with a pure immutable update; it is not a substitute for a
pure fold. Optional data uses Option and closed alternatives use exhaustive
Match. Structured cache keys reuse complete checked identity and need sharing,
distinct-address and last-reader cleanup tests. Source codec changes need old
encoding/version/hash proof when data is retained.
