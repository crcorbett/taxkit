# Scope, Time, Retry, and Interruption

## Contents

- [Scope and resources](#scope-and-resources)
- [Finalisers](#finalisers)
- [Time](#time)
- [Timeout](#timeout)
- [Retry](#retry)
- [Polling](#polling)
- [Interruption](#interruption)
- [Randomness and identifiers](#randomness-and-identifiers)
- [Tests](#tests)

## Scope and resources

Use scoped acquisition for:

- files;
- sockets;
- database connections/transactions;
- provider clients with shutdown;
- servers;
- temporary directories;
- telemetry exporters;
- subscriptions;
- runtime bridges.

Acquire, use, and release through Effect's scoped resource APIs. Release must run on success, typed failure, defect, and interruption.

Do not spread `try/finally` across domain code.

## Finalisers

Finalisers should:

- be idempotent where possible;
- be bounded by timeout where hanging is possible;
- avoid creating new unowned background work;
- log safe result;
- preserve important cleanup failure without hiding the original Cause.

Define ordering for nested resources.

## Time

Use Clock and Duration for:

- current time;
- elapsed duration;
- deadlines;
- sleep;
- cache expiry;
- polling;
- timestamps in domain values;
- tests.

Do not use `Date.now`, `new Date()` as an ambient clock, or raw millisecond arithmetic in workflows.

Parsing/formatting a provided Date/ISO value may remain pure after Schema decode.

## Timeout

Every external operation should have an explicit timeout policy derived from domain/config:

- connection/request;
- provider reconciliation;
- readback polling;
- shutdown;
- public journey.

Map timeout to a tagged domain error when expected. Preserve interruption semantics.
For HTTP/RPC reads, wrap the complete native operation, including decoded body,
with one deadline. Do not restart the budget when headers arrive. Test a late
header followed by a stalled body using TestClock, plus interruption before the
deadline and release of the pending request/body. A caller cancelling earlier
must remain interruption rather than become a timeout or availability error.
Choose the client budget from the backend's work limit and reply overhead;
DAW's 40-second example is not a universal client default.

## Retry

Use Schedule to encode:

- maximum attempts or elapsed time;
- exponential/fixed delay;
- jitter where appropriate;
- retryable error predicate;
- provider retry-after information if safely available;
- observation/log/metric per attempt.

Never retry:

- invalid input;
- permission denied;
- known entitlement/capacity block;
- destructive ambiguity;
- non-idempotent mutation without readback.

For uncertain writes, read before retry.

## Polling

Poll using Schedule and a semantic read operation. Define terminal states, timeout, and contradiction handling.

Stop when:

- desired state observed;
- terminal failure observed;
- identity contradicts expectation;
- bounded timeout reached.

Do not wait indefinitely for an external entitlement/capability change.

## Interruption

Assume Effects can be interrupted at every asynchronous boundary.

Design:

- which work is interruptible;
- critical region only where necessary;
- cleanup on interruption;
- whether external mutation may have committed;
- readback/recovery after interruption;
- child fibre propagation.

Do not mark a whole workflow uninterruptible for convenience.

## Randomness and identifiers

Use Effect Random or an injected identifier service for nondeterministic values. For provider idempotency/logical identity, prefer deterministic derivation from stable inputs when possible.

Tests provide deterministic randomness/identifier Layers.

## Tests

Use TestClock to prove:

- retry schedule;
- timeout;
- polling;
- expiry;
- delayed queue/stream behaviour;
- finaliser timing.

Interrupt at controlled points to prove cleanup and uncertain-write recovery.
