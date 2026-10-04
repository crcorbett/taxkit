# Option, Result, Match, and Collections

## Option

Use Option when absence is a valid semantic state after ingress:

- optional lookup result;
- optional configuration branch;
- cache miss;
- optional provider field once decoded;
- optional previous value.

Do not allow `null | undefined` to spread through the domain. Decode nullable input once into Option or reject it.

Use a typed not-found error instead when absence is exceptional for the operation. The service contract decides; do not convert every failure into Option.

## Result

In the qualified Effect 4.0.0-rc.117, use `Result.Result<Success, Error>` for a
synchronous pure computation with a typed success or failure that needs no
services, concurrency, interruption or tracing. The existing reference filename
is retained so links to this owner continue to work.

Construct results with `Result.succeed` and `Result.fail`. Match with
`Result.match`, or check `Result.isSuccess` before reading `success` and
`Result.isFailure` before reading `failure`. For synchronous Schema checks,
use the native Result decoder and map its failure to the owning named error:

```ts
import { Result, Schema } from "effect";

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).pipe(Schema.brand("Count"));
type Count = typeof Count.Type;
class InvalidCountError extends Schema.TaggedError<InvalidCountError>()("InvalidCountError", {}) {}

const readCount = (input: unknown): Result.Result<Count, InvalidCountError> =>
  Schema.decodeUnknownResult(Count)(input).pipe(Result.mapError(() => new InvalidCountError()));
```

Use Effect when the computation:

- performs I/O;
- depends on services;
- is asynchronous;
- needs retry/timeout;
- owns resources;
- participates in a larger Effect workflow.

Do not shuttle between Result and Effect repeatedly without a boundary reason.

## Match

Use native exhaustive `Match` for closed tagged alternatives:

- domain states;
- provider resource kinds;
- plan classes;
- error recovery;
- workflow results;
- serialised messages.

Do not add a default branch that hides a new tag. If a provider introduces an unknown string, fail Schema decoding before the domain Match.

## Collections

Choose by semantics:

- `ReadonlyArray`: ordered, JSON-friendly bounded data;
- `Chunk`: immutable efficient sequences in Effect workflows/streams;
- `HashMap`: immutable key/value domain state;
- `HashSet`: immutable uniqueness;
- `SortedMap`/`SortedSet`: stable ordering when the installed package supports the needed contract;
- native `Map`/`Set`: only in an exact, documented host constraint or measured private adapter; never the default for pure work.

Use Effect `Array.map`, `filter`, `reduce`, `unfold` and `Record` functions for pure work over readonly values. Use immutable HashMap/HashSet updates for keyed state. Reject handwritten loops, `let`/`var`, reassignment, native array traversal, mutation and transient/mutable collection modes. Do not introduce Ref merely to replace a pure accumulator. A Ref update returns the next immutable value. Do not expose a mutable collection from a service.

## Boundedness

Decode maximum lengths for external arrays/maps. Avoid collecting an unbounded Stream into memory.

For provider inventories and receipts:

- page/stream provider results;
- sort on a stable safe key when deterministic output matters;
- cap receipt entries;
- report total/count/truncation;
- avoid serialising raw items.

## Equality and hashing

Use branded identifiers or readonly address records as keys. Verify the installed Equal/Hash contract: qualified v4 compares and hashes plain records structurally, including nested records and arrays. It does not need a wrapper class or Data.struct for an ordinary readonly key. A different installed version or custom equality policy may need its supported data type/protocol. Never assume an older version's identity behaviour applies.

Do not use JSON stringification as a general equality or map-key strategy.

## Traversal

Use Effect collection traversal when each element performs an Effect:

- choose explicit concurrency;
- preserve/recover failures deliberately;
- retain stable result ordering if the contract needs it;
- encode rate limit/backpressure.

Do not write `Promise.all(array.map(async ...))`. Do not default to unbounded concurrency.

## Tests

Test:

- absence versus failure semantics;
- exhaustive tagged matches;
- duplicate handling;
- stable ordering;
- bounds/truncation;
- concurrency and failure policy for Effect traversal.

Option/Result predicates are useful for codec tests and ordinary narrowing.
Domain tag decisions use `Match.exhaustive`; do not compare `_tag` manually,
write a switch, or add a fallback that conceals a new closed alternative.
Pure unfolding emits the next value and next immutable state through Option;
effectful pagination uses an owned Stream/traversal with cancellation and bounds.
