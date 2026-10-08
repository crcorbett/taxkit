# Persistence and Transactions

## Contents

- [Persistence as a service](#persistence-as-a-service)
- [Schemas at storage boundaries](#schemas-at-storage-boundaries)
- [Error vocabulary](#error-vocabulary)
- [Transactions](#transactions)
- [Resource lifetime](#resource-lifetime)
- [Migrations](#migrations)
- [Idempotency and concurrency](#idempotency-and-concurrency)
- [Tests](#tests)

## Persistence as a service

Expose semantic storage operations:

- `loadAccount`;
- `saveAccount`;
- `reserveIdempotencyKey`;
- `appendEvent`;
- `withTransaction` only when transaction composition is a deliberate public capability.

Do not expose a database client or generic SQL callback from a domain package.

## Schemas at storage boundaries

Decode:

- database rows;
- document records;
- KV values;
- object-store metadata;
- event payloads;
- cache entries.

Encode before write. Keep a distinct encoded storage representation when it differs from the domain type.

Do not cast a row or parsed JSON into the domain model.

## Error vocabulary

Map driver errors to stable tags:

- `RecordNotFound`;
- `PersistenceConflict`;
- `ConstraintViolation`;
- `PersistenceUnavailable`;
- `PersistencePayloadInvalid`;
- `TransactionAborted`.

Do not make callers match driver codes or error messages.

## Transactions

Represent transaction lifetime with Scope or the selected Effect persistence integration.

Define:

- isolation requirements;
- retryable conflict policy;
- idempotency;
- timeout;
- nested transaction behaviour;
- post-commit external effects;
- rollback/finalisation.

Do not perform non-transactional external provider calls inside a database transaction unless the inconsistency/compensation design is explicit.

For multi-system workflows, use an outbox, durable event, or saga/compensation model rather than pretending the systems share an atomic transaction.

## Resource lifetime

Build pools/clients in live Layers and release them with application runtime. Acquire transaction/session handles per scoped operation.

Do not open a connection at module import or per helper call without pooling policy.

## Migrations

Separate schema migration authority from application startup unless the repository explicitly owns automatic migrations.

Migrations need:

- exact source/version;
- forward and rollback/restore policy;
- backup/readback;
- protected environment gate;
- receipt;
- compatibility window.

Do not infer database migration success from application deployment.

## Idempotency and concurrency

Use branded idempotency keys and storage constraints. Avoid check-then-write races; use atomic insert/update or transaction semantics.

For optimistic concurrency, model version/etag as a branded field and return a typed conflict.

## Tests

Test the contract through:

- memory/test Layer;
- real local/ephemeral database integration where appropriate;
- Schema drift fixtures;
- conflict/concurrent updates;
- transaction rollback;
- interruption cleanup;
- idempotency;
- migration compatibility.

Do not call a memory Map proof equivalent to provider/database conformance.
