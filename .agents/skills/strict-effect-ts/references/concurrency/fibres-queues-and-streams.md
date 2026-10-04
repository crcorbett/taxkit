# Fibres, Queues, and Streams

## Contents

- [Structured concurrency](#structured-concurrency)
- [Concurrency limits](#concurrency-limits)
- [Deferred](#deferred)
- [Queue](#queue)
- [PubSub](#pubsub)
- [Stream](#stream)
- [Streaming truth](#streaming-truth)
- [Workers and request completion](#workers-and-request-completion)
- [Tests](#tests)

## Structured concurrency

Every child fibre must have an owner and lifetime.

Use:

- fork/join when the parent needs the result;
- scoped fork when the child must end with a Scope;
- supervision for application-owned background work;
- race/parallel combinators for bounded competing operations;
- explicit daemon/background semantics only at an application boundary.

Reject detached Promises and unowned fibres.

## Concurrency limits

Set concurrency deliberately:

- serial for provider reconciliation where ordering/readback matters;
- small fixed bound for rate-limited APIs;
- inherited/default only when the application policy is known;
- unbounded only with proof that input is bounded and work is safe.

Do not translate `Promise.all` into unbounded Effect traversal.

Define failure policy:

- fail fast and interrupt siblings;
- collect typed results;
- retry individual elements;
- continue with bounded error receipt.

## Deferred

Use Deferred for one-shot coordination:

- wait for server readiness;
- complete a shared initialisation result;
- communicate first terminal outcome;
- test a concurrent ordering point.

Do not use polling plus sleep when an event can complete a Deferred.

## Queue

Use Queue for point-to-point work with backpressure. Define:

- capacity;
- bounded/sliding/dropping strategy;
- offer/take interruption;
- shutdown;
- work acknowledgement/retry;
- metrics.

Do not use an array plus timer as a queue.

## PubSub

Use PubSub when multiple subscribers need the same events. Define replay expectations, subscriber lifetime, buffer policy, and slow-subscriber behaviour.

Do not use PubSub for durable delivery unless backed by a durable transport with an explicit adapter.

## Stream

Use Stream for incremental, pull/push, or potentially unbounded values:

- paginated APIs;
- file/network body;
- event source;
- batched processing;
- telemetry pipeline.

Preserve:

- chunking;
- backpressure;
- typed failure;
- resource Scope;
- interruption;
- finalisation.

Avoid collecting to an array unless the contract is bounded and the limit is enforced.

## Streaming truth

Prove streaming end to end:

1. source emits before completion;
2. adapter does not buffer the full source;
3. transformations preserve incremental delivery;
4. sink observes early chunks;
5. interruption closes the source;
6. memory remains bounded.

A Stream return type alone is not proof.

## Workers and request completion

Background work in a Worker/server request must connect to host lifecycle. Use the platform adapter to attach completion and keep domain work as Effect. Do not fire-and-forget a Promise after returning the response.

## Tests

Use Deferred/TestClock/controlled Queues to prove:

- ordering;
- concurrency bound;
- cancellation;
- shutdown;
- backpressure;
- failure propagation;
- no orphan fibres;
- early stream delivery.

Avoid wall-clock sleeps.
