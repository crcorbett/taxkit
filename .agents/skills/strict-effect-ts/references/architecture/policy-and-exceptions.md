# Policy and Exceptions

## Contents

- [The default](#the-default)
- [Boundary test](#boundary-test)
- [Host exceptions](#host-exceptions)
- [Explicit exception record](#explicit-exception-record)
- [Defects versus expected failures](#defects-versus-expected-failures)
- [Strict review searches](#strict-review-searches)
- [Do not fetishise syntax](#do-not-fetishise-syntax)

## The default

Use Effect whenever owned TypeScript performs or coordinates:

- failure;
- asynchronous work;
- external input/output;
- configuration;
- resource acquisition/release;
- time, retry, or randomness;
- mutable or concurrent state;
- queues, streams, or background work;
- logging, tracing, or metrics.

Keep plain TypeScript for total, deterministic leaf computation over decoded values.

## Boundary test

Ask four questions:

1. Can this operation fail for an expected reason?
2. Does it depend on the world outside its arguments?
3. Does it have lifetime, cancellation, concurrency, or state semantics?
4. Does it cross a trust or serialisation boundary?

If any answer is yes, model it as Effect.

## Host exceptions

Frameworks may require:

- a synchronous render function;
- a Promise-returning loader/action;
- a Worker `fetch` handler;
- a Bun/Node CLI main;
- a callback registration;
- an Alchemy provider callback.

Keep the exception at the outermost adapter:

1. decode host input;
2. construct a named Effect program;
3. provide the application runtime/Layer;
4. execute once;
5. translate typed failure to the host protocol;
6. tie shutdown to host lifecycle.

Do not call `Effect.runPromise` in domain or package code.

## Explicit exception record

If owned code must use a normally forbidden construct, place a bounded comment or architecture rule that states:

- host or measured constraint;
- exact file/function;
- why an Effect API cannot satisfy it;
- how the exception is encapsulated;
- test that prevents semantic leakage;
- removal/review condition.

Examples:

- host callback must return Promise;
- generated SDK type contains `any`;
- native Map is measurably required inside one service;
- a host requires one exact writable property during a controlled lifetime.

React rendering can use Effect Array functions synchronously; it does not need a native collection exception.

“Simpler” and “the SDK uses it” are not sufficient.

## Defects versus expected failures

Use the typed error channel for:

- validation;
- missing records;
- provider rejection;
- permissions;
- timeout;
- unavailable dependency;
- conflict;
- protocol/codec mismatch;
- user cancellation when domain-relevant.

Use defects only for impossible invariants, programmer bugs, or corrupted assumptions that cannot be handled meaningfully. Do not convert expected failure to `die` to make a signature look clean.

## Strict review searches

Search changed owned code for:

```text
async
new Promise
Promise.
throw
catch (
fetch(
process.env
Bun.env
import.meta.env
JSON.parse
JSON.stringify
Date.now
new Date(
Math.random
setTimeout
setInterval
console.
new Map
new Set
 as
: any
Effect.run
```

Classify every match. Generated, vendor, fixtures, and host adapters may be excluded only through explicit path policy.

## Do not fetishise syntax

Strict Effect is about semantics, not maximizing `Effect.gen`.

- Keep pure Effect `Array.map`/`reduce`/`unfold` transformations synchronous; they do not need Effect.gen. Use immutable values even inside a leaf.
- Do not wrap a constant in `Effect.succeed` unless it participates in an Effect interface.
- Do not create a Layer for a static value with no dependency/lifecycle role.
- Do not split a linear program into tiny helpers just to look functional.

The goal is explicit failure, dependency, lifetime, concurrency, and observability—not ceremony.

An exception must name its exact repository-relative file and operation/property.
Do not allow an entire file, glob, filename suffix, tests folder or package to
use mutation or execute Effect. The native API already owns its request fibre
and Scope; return the native Effect handler instead of adding a runner. A
framework that truly requires a Promise gets one checked application runner,
whose lint allowance is a complete path. A similarly named package file remains
forbidden. Test both the allowed operation and a nearby forbidden operation.
