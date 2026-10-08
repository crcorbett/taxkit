# Strict Cookbook

The service examples use the qualified Effect v4 RC style: `Schema.TaggedError`,
`Service.of` and two-argument `Layer.effect`. Other sketches still require the
installed API and owning types. The current baseline is DAW's
`4.0.0-rc.117`; do not retain older API alternatives in these examples.

## Contents

- [Schema error service](#schema-error-service)
- [Live Layer](#live-layer)
- [Provider Promise boundary](#provider-promise-boundary)
- [Nullable ingress](#nullable-ingress)
- [Config and secret](#config-and-secret)
- [Bounded traversal](#bounded-traversal)
- [Retry and timeout](#retry-and-timeout)
- [Scoped resource](#scoped-resource)
- [Queue worker](#queue-worker)
- [CLI runtime](#cli-runtime)
- [Framework Promise bridge](#framework-promise-bridge)
- [Effect with Alchemy](#effect-with-alchemy)

## Schema, error, service

```ts
import { Context, Effect, Schema } from "effect";

export const AccountId = Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(128)).pipe(
  Schema.brand("AccountId"),
);
export type AccountId = typeof AccountId.Type;

export const Account = Schema.Struct({
  id: AccountId,
  displayName: Schema.String,
});
export type Account = typeof Account.Type;

export class AccountNotFound extends Schema.TaggedError<AccountNotFound>()("AccountNotFound", {
  id: AccountId,
}) {}

export class AccountsUnavailable extends Schema.TaggedError<AccountsUnavailable>()(
  "AccountsUnavailable",
  { operation: Schema.String },
) {}

export interface AccountsContract {
  readonly load: (id: AccountId) => Effect.Effect<Account, AccountNotFound | AccountsUnavailable>;
}

export class Accounts extends Context.Service<Accounts, AccountsContract>()(
  "@acme/accounts/Accounts",
) {}
```

Keep Schemas, errors, and service in their conventional files in real code.

Use the installed Schema tagged-error constructor and preserve the same closed,
Schema-backed fields.

## Live Layer

```ts
import { Effect, Layer, Schema } from "effect";

const decodeProviderAccount = Schema.decodeUnknownEffect(ProviderAccount);

const makeAccounts = Effect.gen(function* () {
  const transport = yield* AccountsTransport;

  const load: AccountsContract["load"] = Effect.fn("Accounts.load")(function* (id: AccountId) {
    const response = yield* transport.getAccount(id);
    return yield* decodeProviderAccount(response);
  }, Effect.mapError(mapAccountsError));

  return Accounts.of({ load });
});

export const AccountsLive = Layer.effect(Accounts, makeAccounts);
```

The transport, Config, and SDK are private Layer dependencies. Public methods
use named `Effect.fn`; private Effect helpers normally use `Effect.fnUntraced`
unless they own separately useful external work. Adjust codecs to the installed
version. See the [service recipes](../services/services-and-layers.md).

## Provider Promise boundary

```ts
const callSdk = Effect.fnUntraced((id: AccountId) =>
  Effect.tryPromise({
    try: (signal) => sdk.accounts.get({ id, signal }),
    catch: () => new AccountsUnavailable({ operation: "load" }),
  }),
);
```

Place this in `live.layer.ts` or a private adapter, not at each call site. Decode the result immediately.

## Nullable ingress

```ts
const OptionalNickname = Schema.OptionFromNullOr(Schema.String);
// Use a nested optional-key Option only when the saved format distinguishes
// an omitted key from a present null.
const SourceNickname = Schema.Struct({
  nickname: Schema.OptionFromOptionalKey(OptionalNickname),
});
```

Once decoded, use Option matching. Do not keep `string | null` throughout the domain.

## Config and secret

```ts
const makeProvider = Effect.gen(function* () {
  const endpoint = yield* ProviderEndpointConfig;
  const token = yield* ProviderTokenConfig; // redacted

  return Provider.of({
    query: (input) => queryProvider(endpoint, token, input),
  });
});
```

Represent the concrete Config values using the installed Config/Schema APIs. Unwrap the token only inside the request boundary.

## Bounded traversal

```ts
const loadMany = (ids: ReadonlyArray<AccountId>) =>
  Effect.forEach(ids, loadAccount, {
    concurrency: 8,
  });
```

Choose failure and ordering policy explicitly. Use serial concurrency for provider mutations that require read-after-write.

## Retry and timeout

```ts
const resilientRead = readProvider.pipe(
  Effect.retry(retryTransientSchedule),
  Effect.timeout(providerTimeout),
  Effect.mapError(mapReadError),
);
```

The schedule must filter typed retryable failures. Never retry permission or validation errors.

## Scoped resource

```ts
const withClient = Effect.acquireRelease(makeClient, (client) =>
  closeClient(client).pipe(Effect.orDie),
);
```

Use the installed scoped API and keep the client private. Do not expose a generic `withClient(callback)` service.

The release Effect cannot return an expected failure. `Effect.orDie` keeps a
failed close visible to the execution owner; returning success would hide a
resource that may still be open. Set a bounded shutdown policy when closing can
stall. If the owner deliberately continues after failed cleanup, record the
safe failure through its reporting policy rather than silently discarding it.

## Queue worker

```text
Layer acquires bounded Queue
  -> supervised scoped worker fibre takes jobs
  -> named service operation processes each job
  -> shutdown interrupts worker and closes Queue
```

Test with a Deferred/barrier rather than sleep.

## CLI runtime

```ts
const program = Effect.gen(function* () {
  const command = yield* decodeArguments;
  return yield* runCommand(command);
});

// Only the root host file uses the installed Bun runtime bridge.
```

Map typed failure to exit status at the root. Packages return Effect.

## Framework Promise bridge

```ts
export const loader = (hostInput: HostLoaderInput): Promise<EncodedLoaderData> =>
  appRuntime.runPromise(
    decodeLoaderInput(hostInput).pipe(
      Effect.flatMap(loadRouteData),
      Effect.flatMap(encodeLoaderData),
    ),
  );
```

This Promise exists only because the host requires it. Reuse one application runtime and wire host cancellation.

## Effect with Alchemy

```text
alchemy.run.ts
  -> decode stage and authority
  -> provide state/provider Layers
  -> run named stack Effect
  -> resolve/encode safe outputs
```

Provider Resources own read/diff/reconcile/delete. Use `$alchemy-iac` for lifecycle and proof.

## Checked construction without a second decode

```ts
import { Array, Effect, Schema } from "effect";

const PassageStart = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).pipe(
  Schema.brand("PassageStart"),
);
const PassageEnd = Schema.Int.check(Schema.isGreaterThan(0)).pipe(Schema.brand("PassageEnd"));
const PassageText = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(3000)).pipe(
  Schema.brand("PassageText"),
);
const PassageBounds = Schema.makeFilter<{
  readonly start: number;
  readonly end: number;
  readonly text: string;
}>((row) => row.end === row.start + row.text.length || "end must follow the complete text");
const Passage = Schema.Struct({ start: PassageStart, end: PassageEnd, text: PassageText }).check(
  PassageBounds,
);
type Passage = typeof Passage.Type;
// A wire codec reuses fields AND the whole-record check.
const ProviderPassage = Schema.Struct({ ...Passage.fields, id: AccountId }).check(PassageBounds);
class InvalidPassageError extends Schema.TaggedError<InvalidPassageError>()(
  "InvalidPassageError",
  {},
) {}

const fromCheckedText = (
  text: typeof PassageText.Type,
): Effect.Effect<Passage, InvalidPassageError> =>
  Effect.gen(function* () {
    const start = yield* PassageStart.makeEffect(0);
    const end = yield* PassageEnd.makeEffect(text.length);
    return yield* Passage.makeEffect({ start, end, text });
  }).pipe(Effect.mapError(() => new InvalidPassageError()));

const texts = (rows: ReadonlyArray<Passage>) => Array.map(rows, (row) => row.text);
```

Check the installed constructor input and error types. An owning refinement can
have a small structural parameter annotation; domain records still come from
their Schema. Do not repeat decode/encode for checked internal rows.
