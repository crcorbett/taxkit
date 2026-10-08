# Provider Adapters

## Contents

- [Purpose](#purpose)
- [Files](#files)
- [SDK construction](#sdk-construction)
- [Operation implementation](#operation-implementation)
- [Pagination](#pagination)
- [Retry](#retry)
- [HTTP versus SDK](#http-versus-sdk)
- [Memory Layer](#memory-layer)
- [Streaming claims](#streaming-claims)
- [Tests](#tests)

## Purpose

A provider adapter converts an external SDK or HTTP API into a typed domain service. The provider client remains private.

```text
domain input
  -> Schema encode provider request
  -> private SDK/HttpClient
  -> select minimal response
  -> Schema decode
  -> domain success or tagged error
```

## Files

```text
provider/
  schemas.ts
  errors.ts
  service.ts
  live.layer.ts
  memory.layer.ts
```

Add operation files only for substantial retry, pagination, or lifecycle policy.

## SDK construction

Construct the SDK in `live.layer.ts` from redacted Config. Catch constructor failure in Effect. Do not instantiate at module import.

Keep private:

- SDK instance;
- generated DTO types;
- auth headers;
- raw request function;
- pagination cursor format;
- provider error objects.

## Operation implementation

For each named operation:

1. encode provider request from domain input;
2. call SDK through `Effect.tryPromise` only at this ingress;
3. map rejection to a tagged transport/provider error;
4. decode response immediately;
5. map status/provider codes to domain errors;
6. apply bounded retry/timeout if semantically safe;
7. add span and safe structured fields;
8. return domain value.

Do not scatter SDK method selection and `Effect.tryPromise` calls throughout the application. Keep them inside the named private adapter operation.

## Pagination

Hide provider pagination behind a semantic operation:

- return Stream for potentially unbounded results;
- return bounded ReadonlyArray/Chunk for a known limited inventory;
- validate cursors;
- detect repeated cursors;
- define rate limiting and interruption;
- decode each page;
- bound receipt/report collection.

## Retry

Classify:

- never retry: permission, validation, conflict without readback;
- retry: transient transport or documented server throttling;
- readback before retry: uncertain mutation;
- operator review: ambiguous identity/destructive operation.

Use Schedule and Clock, not hand-written loops/timers.

## HTTP versus SDK

Prefer Effect Platform HttpClient when:

- SDK adds little value;
- typed transport/test control matters;
- streaming/backpressure is needed;
- SDK error/Promise surface is difficult to contain.

Use an SDK when it carries meaningful provider semantics, but wrap it equally strictly. Do not claim an SDK response is validated merely because TypeScript types exist.

## Memory Layer

Model domain semantics rather than copying the SDK. Provide deterministic:

- state;
- operation observations;
- failure injection;
- pagination;
- uncertain-write scenarios;
- clock-controlled latency.

Use a separate test-control service if tests need to inspect/seed it.

## Streaming claims

Do not call an adapter streaming because its method name says stream. Prove:

- provider delivers incrementally;
- adapter does not buffer the whole response;
- Stream propagates chunks;
- consumer observes before completion;
- interruption closes transport;
- backpressure is bounded.

## Tests

Test request encoding, response decoding, error mapping, redaction, pagination, retry classes, timeout, interruption, and client privacy. Add live conformance tests only under explicit provider authority.
