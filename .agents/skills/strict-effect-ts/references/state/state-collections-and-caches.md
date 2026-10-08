# State, Collections, and Caches

## State selection

Choose the narrowest primitive:

- immutable local value for pure transformation;
- `Ref` for atomic synchronous Effect-managed state;
- synchronised/ref variant when updates require effects;
- subscription ref for observable current state;
- `TxRef` inside `Effect.tx` for coordinated changes to several values;
- Queue/PubSub for communication rather than shared mutable state;
- Cache for keyed effectful memoisation with policy;
- scoped resource for state tied to a lifetime.

Inspect installed Effect exports; names and modules can change across versions.

## No mutable globals

Reject module-level mutable objects, arrays, Maps, Sets, clients, counters, or caches in shared packages.

Application-level state belongs in a Layer so:

- construction is explicit;
- lifetime is scoped;
- tests can substitute it;
- concurrent access policy is visible;
- shutdown can clear resources.

## Ref

Use Ref for small atomic state such as:

- last safe provider cursor;
- in-memory test inventory;
- bounded operation observations;
- feature state;
- counters where Metric is not the right semantic store.

Keep updates pure and atomic. Return a new readonly value using immutable collection functions; do not mutate the old value or use transient collection modes. Do not read-modify-write using separate operations when lost updates matter. Pure folds need no Ref. Effects inside an update need the installed synchronised or transactional primitive and its tested interruption policy.

## Transactions

The qualified Effect 4.0.0-rc.117 uses `Effect.tx` with `TxRef` and the other
transactional collections, such as `TxQueue`. Use them when several values must
change together, or an operation must wait until transactional state changes.
The outermost `Effect.tx` commits all changes together on success and discards
them on failure. Nested transactions share that boundary. `Effect.txRetry`
waits for a value read by the transaction to change, then retries the transaction.

```ts
import { Effect, TxRef } from "effect";

const incrementTogether = Effect.gen(function* () {
  const left = yield* TxRef.make(0);
  const right = yield* TxRef.make(0);
  yield* Effect.tx(
    Effect.gen(function* () {
      yield* TxRef.update(left, (value) => value + 1);
      yield* TxRef.update(right, (value) => value + 1);
    }),
  );
  return { left: yield* TxRef.get(left), right: yield* TxRef.get(right) };
});
```

Keep external writes outside the transaction. Retrying a transaction can repeat
its program; network calls and file writes are not rolled back with `TxRef`
changes. Test both successful coordinated changes and failure rollback.

Examples:

- reserve capacity and enqueue work together;
- move an item between two collections;
- update resource inventory plus index;
- coordinate a bounded pool.

Do not introduce a transaction for a single simple value.

## Domain collections

Use immutable Effect collections for domain state where they express equality, hashing, ordering, and persistent updates. Use ReadonlyArray for bounded ordered serialisable values.

Native Map/Set may remain:

- within a private performance-critical implementation;
- when a host API requires them;
- never solely because the code is a total leaf or the mutation is local.

Document and test the containment. Never expose a mutable reference.

## Cache

Define:

- key Schema/brand;
- lookup Effect and error;
- capacity;
- expiry using Effect time;
- invalidation;
- concurrent miss behaviour;
- negative-cache policy;
- observability;
- scope/shutdown.

Do not use a plain global Map as a cache. Do not cache secrets, provider errors, or unbounded payloads without explicit policy.

## Context-local state

Use Effect context/fibre-local facilities for request correlation or scoped annotations when supported by the installed version. Do not use ambient global variables for request identity.

## Tests

Test:

- atomic concurrent updates;
- scoped isolation;
- cache hit/miss/expiry with TestClock;
- invalidation;
- bounded capacity;
- failure caching policy;
- no state leakage between test Layers;
- immutable collection behaviour.

## Structured keys and shared cancellation

A key includes every part of the saved address: for example record ID, version,
revision and preparation hash. Infer it from one owning Struct using existing
branded fields. Pass that readonly record directly to the cache. Internal cache
keys and values need no JSON encode/decode. Serialisation belongs only to a real
persistence or message boundary.

Research installed Equal, Hash, Cache and ScopedCache source before changing
keys or resource ownership. Qualified v4 plain records use structural equality
and hashing; prove separately reconstructed equivalent keys share one lookup
and changing each address field creates a distinct lookup. Do not mutate a key
after insertion or use Effect Hash as a cryptographic source hash.

For a scoped shared lookup, keep the existing capacity, success/failure expiry,
deadline and acquisition/finaliser contract. Test that cancelling one of two
readers keeps the lookup alive, the last reader cancels it, and cancellation
waits for underlying cleanup. Requalify these behaviours on a version change;
matching names in an older clone do not prove the installed cancellation rules.
