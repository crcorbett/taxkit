# TaxKit TypeScript SDK

TaxKit calculates Australian tax with one Effect-native domain model. Plain
TypeScript and Effect consumers use the same checked Money, scenarios, rules,
errors and reports. Install the single `taxkit` package; Effect is its runtime
dependency.

```sh
npm install taxkit
```

## Plain TypeScript

Parse external money as exact decimal text. Native Result keeps construction
failures explicit. The selected definition infers the required scenario and
returned report.

```ts
import { calculateSafe } from "taxkit";
import { AuPayTakeHomeCalculation } from "taxkit/au";
import { TakeHomeScenarioInputSchema } from "taxkit/au/schemas";
import { fromDecimal, nonNegative } from "taxkit/money";
import { Result } from "effect";

const input = Result.gen(function* () {
  const grossPay = yield* fromDecimal("1654.00").pipe(Result.flatMap(nonNegative));
  return TakeHomeScenarioInputSchema.make({
    grossPay,
    period: "weekly",
    taxFreeThresholdClaimed: true,
  });
});
if (Result.isSuccess(input)) {
  const result = await calculateSafe(AuPayTakeHomeCalculation, input.success);
  if (Result.isSuccess(result)) {
    result.success.netPay.cents;
  } else {
    result.failure._tag;
  }
}
```

`calculate` returns a Promise and rejects with the public expected error directly.
`calculateSafe` returns `Promise<Result<Report, TaxKitError>>`. Native Result uses
`Success` / `success` and `Failure` / `failure`. `run` includes diagnostics.
Use `Schema.Result(definition.outputSchema, TaxKitError)` with
`Schema.toCodecJson` to persist outcomes.

`createClient()` owns one lazy ManagedRuntime. Use `client.calculate` or
`client.calculateSafe`, then await `client.dispose()` or declare it with
`await using`. Closing interrupts pending calculations, waits for their
finalisers and shares the cleanup outcome with repeated callers. A closed
client returns `TaxKitClientDisposedError`. The named `calculate`,
`calculateSafe` and `run` functions share one private host, created on first
use and kept for the module's lifetime, rather than building a runtime per call;
each call still settles only after its own calculation's cleanup.

## Effect

```ts
import { Effect } from "effect";
import { AuPayTakeHomeCalculation } from "taxkit/au";
import { TakeHomeScenarioInputSchema } from "taxkit/au/schemas";
import { fromDecimal, nonNegative } from "taxkit/money/effect";
import { calculateReport } from "taxkit/effect";

const program = Effect.gen(function* () {
  const grossPay = yield* fromDecimal("1654.00").pipe(Effect.flatMap(nonNegative));
  const input = TakeHomeScenarioInputSchema.make({
    grossPay, period: "weekly", taxFreeThresholdClaimed: true,
  });
  return yield* calculateReport(AuPayTakeHomeCalculation, input);
});
```

Your application runs this Effect; it has no requirements to provide, because
each definition composes its own rule packs. `calculateRun` includes diagnostics and
`decodeInput(definition, unknownInput)` strictly decodes raw scenario data once.
Nominal checked inputs flow into execution directly. Import native fact services,
rules, parameter Layers and rule packs from `taxkit/au/effect`; unprovided facts
remain in the native requirements channel. In tests, substitute a definition
whose `calculate` program returns a controlled result or failure.

`AuPayTakeHomeWithSacrificeCalculation` requires
`TakeHomeWithSacrificeScenarioInput`, including its checked `salarySacrifice`.
All amounts in a pay scenario share one period. The report carries the applied
sacrifice so its accounting equation can validate after restoration. STSL packs
require their explicit debt-status fact when composed natively.

## Money and Schemas

Money is signed AUD in safe integer cents. `fromCents(number)`,
`fromDecimal(string)`, `add`, `subtract`, `nonNegative` and `round` return native
Result from `taxkit/money` and lazy Effect from `taxkit/money/effect`. Rounding
requires an explicit statutory policy. `format` is pure. Numeric-dollar
construction and silent fractional-cent rounding are removed.

Use `Money.fromCents(Cents.make(...))` for trusted constants and the fallible
constructors for dynamic input. Scenario inputs require `NonNegativeMoney`.
`MoneyFromDecimalString` and `NonNegativeMoneyFromDecimalString` are symmetric
native codecs. Reports and ledgers validate their accounting relationships,
periods and unique component identities using exact arithmetic. Use their
explicit `*Encoded` Schemas for representation-only checks; reconstructing
fields or extracting a bare encoded view can lose aggregate checks in Effect
4.1.2. Effect decoding remains authoritative for checks JSON Schema cannot
express. Native Standard Schema adapters support form validation.

## Public paths

| Path | Responsibility |
| --- | --- |
| `taxkit` | Named Promise functions and caller-owned clients |
| `taxkit/effect` | Native execution and explicit ingress |
| `taxkit/au` | AU definitions and named plain conveniences |
| `taxkit/au/schemas` | AU scenarios, facts, reports and parameters |
| `taxkit/au/effect` | AU programs, services, rules and rule-pack Layers |
| `taxkit/money` | Result money operations and codecs |
| `taxkit/money/effect` | Effect money operations |
| `taxkit/schemas` | Shared public Schemas and errors |
| `taxkit/core` | Primitives and calculator/rule/fact definition contracts |
| `taxkit/http` | Native HttpApi client contracts |
| `taxkit/testing` | Checked scenario fixtures |

Schema and HTTP entrypoints do not import live calculation implementations.
The root does not import AU rules or HTTP. The archive contains compiled
JavaScript and declarations with one shared identity for each Schema/class.

## SDK 6: no calculation engine

Definitions are closed programs. `TaxKitService`, `TaxKitLive`,
`TaxKitEffectRequirements` and the `taxkit/core` engine exports
(`CalculationEngine`, `CalculationEngineLive`, `CalculationEngineService`,
`CalculationRequest`) are removed. Delete `Effect.provide(TaxKitLive)`; the
report and run Effects already have no requirements. Replace engine mocks with a
substituted definition. Plain Promise functions and `createClient()` keep their
signatures.

## SDK 5 hard cutover

Replace `TaxKit` / `au` / `auEffect` object facades with named imports. Replace
custom success/failure classes with native Result. Remove module selectors,
independent SDK descriptor factories, transport-shaped SDK helpers and blanket
calculation-error wrappers. Move AU Schemas to `taxkit/au/schemas`. Construct a
checked scenario instead of passing a raw object, and supply its period once.
Replace numeric dollars with exact text and old money aliases with the named
money operations. Opaque diagnostic causes and missing-versus-undefined request
compatibility are removed. Calculator HTTP routes use `/api/v2`; the docs API
retains its independent version. No legacy aliases, handlers or decoders ship.

## Verification and publication

```sh
bun run --filter=taxkit build
bun run --filter=taxkit check-types
bun run --filter=taxkit test
bun run --filter=taxkit test:browser
bun run --filter=taxkit check-packed-artifact
bun run --filter=taxkit validate:downstream
```

`check-types` includes the negative compiler examples. Packed and downstream
checks install only this archive outside the checkout and verify declarations,
all public imports, both execution styles, browser bundles, codec laws,
removals and preserved statutory table/source fingerprints. Build and pack
with the pinned Bun; publish the checked archive, following the
[publication runbook](../../../docs/runbooks/release.md#sdk-publication-through-github).
