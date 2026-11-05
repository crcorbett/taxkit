import type { CalculatorDefinition } from "@taxkit/core";
import {
  Effect,
  Exit,
  ManagedRuntime,
  Ref,
  Result,
  Scope,
  Boolean as EffectBoolean,
} from "effect";
import type { Layer, Schema } from "effect";

import { calculateReport, calculateRun } from "./effect.js";
import type { TaxKitEffectRequirements } from "./effect.js";
import {
  TaxKitClientDisposedError,
  TaxKitClientDisposeError,
  TaxKitUnexpectedError,
} from "./errors.js";
import type { TaxKitError } from "./errors.js";
import { TaxKitLive } from "./live.layer.js";
import type { CalculationRun } from "./types.js";

type ReportOperation = <Input extends Schema.Top, Output extends Schema.Top>(
  calculation: CalculatorDefinition<Input, Output>,
  input: NoInfer<Input["Type"]>
  // oxlint-disable-next-line effect/no-async-await-promise -- The requested vanilla SDK exposes Promise signatures at this exact private host; orchestration remains Effect-native.
) => Promise<Output["Type"]>;
type SafeReportOperation = <
  Input extends Schema.Top,
  Output extends Schema.Top,
>(
  calculation: CalculatorDefinition<Input, Output>,
  input: NoInfer<Input["Type"]>
  // oxlint-disable-next-line effect/no-async-await-promise -- The requested vanilla SDK exposes Promise signatures at this exact private host; orchestration remains Effect-native.
) => Promise<Result.Result<Output["Type"], TaxKitError>>;
export interface TaxKitClient extends AsyncDisposable {
  readonly calculate: ReportOperation;
  readonly calculateSafe: SafeReportOperation;
  // oxlint-disable-next-line effect/no-async-await-promise -- The requested vanilla SDK exposes Promise signatures at this exact private host; orchestration remains Effect-native.
  readonly dispose: () => Promise<void>;
}

// The plain SDK is an explicitly Promise-shaped host. This private module owns
// the bridge and each client's runtime, interruption and shared cleanup result.
export const createPlainClient = (
  layer: Layer.Layer<TaxKitEffectRequirements>
): TaxKitClient => {
  const lifetime = Scope.makeUnsafe();
  const runtime = Effect.acquireRelease(
    Effect.sync(() => ManagedRuntime.make(layer)),
    (owned) => owned.disposeEffect
  ).pipe(Effect.provideService(Scope.Scope, lifetime), Effect.runSync);
  const disposed = Ref.makeUnsafe(false);
  const safeCalculation = <Input extends Schema.Top, Output extends Schema.Top>(
    calculation: CalculatorDefinition<Input, Output>,
    input: NoInfer<Input["Type"]>
  ): Effect.Effect<Result.Result<Output["Type"], TaxKitError>> => {
    if (Ref.getUnsafe(disposed)) {
      return Effect.succeed(Result.fail(new TaxKitClientDisposedError()));
    }
    // ManagedRuntime tracks acquisition and calculation fibers in its own native
    // lifetime. The outer host only projects their already captured public result.
    return Effect.tryPromise({
      try: () =>
        runtime.runPromiseExit(
          calculateReport(calculation, input).pipe(Effect.result)
        ),
      catch: () => new TaxKitUnexpectedError(),
    }).pipe(
      Effect.map(
        Exit.match({
          onFailure: () =>
            EffectBoolean.match(Ref.getUnsafe(disposed), {
              onTrue: () => Result.fail(new TaxKitClientDisposedError()),
              onFalse: () => Result.fail(new TaxKitUnexpectedError()),
            }),
          onSuccess: (result) =>
            EffectBoolean.match(Ref.getUnsafe(disposed), {
              onTrue: () => Result.fail(new TaxKitClientDisposedError()),
              onFalse: () => result,
            }),
        })
      ),
      Effect.catchTag("TaxKitUnexpectedError", (error) =>
        Effect.succeed(Result.fail(error))
      )
    );
  };
  const dispose = Effect.cached(
    Ref.set(disposed, true).pipe(
      Effect.andThen(Scope.close(lifetime, Exit.void)),
      Effect.catchCause(() => Effect.fail(new TaxKitClientDisposeError()))
    )
  ).pipe(Effect.runSync);
  const disposeHost = () =>
    Effect.runPromise(dispose, { uninterruptible: true });
  return {
    calculate: (calculation, input) =>
      Effect.runPromise(
        safeCalculation(calculation, input).pipe(
          Effect.flatMap(Effect.fromResult)
        )
      ),
    calculateSafe: (calculation, input) =>
      Effect.runPromise(safeCalculation(calculation, input)),
    dispose: disposeHost,
    [Symbol.asyncDispose]: disposeHost,
  };
};
export const calculateSafe = <
  Input extends Schema.Top,
  Output extends Schema.Top,
>(
  calculation: CalculatorDefinition<Input, Output>,
  input: NoInfer<Input["Type"]>
  // oxlint-disable-next-line effect/no-async-await-promise -- The requested vanilla SDK exposes Promise signatures at this exact private host; orchestration remains Effect-native.
): Promise<Result.Result<Output["Type"], TaxKitError>> =>
  Effect.runPromise(
    calculateReport(calculation, input).pipe(
      Effect.provide(TaxKitLive),
      Effect.result,
      Effect.catchCause(() =>
        Effect.succeed(Result.fail(new TaxKitUnexpectedError()))
      )
    )
  );
export const calculate = <Input extends Schema.Top, Output extends Schema.Top>(
  calculation: CalculatorDefinition<Input, Output>,
  input: NoInfer<Input["Type"]>
  // oxlint-disable-next-line effect/no-async-await-promise -- The requested vanilla SDK exposes Promise signatures at this exact private host; orchestration remains Effect-native.
): Promise<Output["Type"]> =>
  Effect.runPromise(
    calculateReport(calculation, input).pipe(
      Effect.provide(TaxKitLive),
      Effect.result,
      Effect.catchCause(() =>
        Effect.succeed(Result.fail(new TaxKitUnexpectedError()))
      ),
      Effect.flatMap((result) =>
        Effect.fromResult<Output["Type"], TaxKitError>(result)
      )
    )
  );
export const run = <
  Input extends Schema.Top,
  Output extends Schema.Top,
  const Identity extends Pick<
    CalculatorDefinition<Input, Output>,
    "calculatorId" | "jurisdiction" | "taxYear"
  >,
>(
  calculation: CalculatorDefinition<Input, Output> & Identity,
  input: NoInfer<Input["Type"]>
  // oxlint-disable-next-line effect/no-async-await-promise -- The vanilla full-run operation preserves checked report and exact calculator identity at this private Promise host.
): Promise<CalculationRun<Output, Identity>> =>
  Effect.runPromise(
    calculateRun(calculation, input).pipe(
      Effect.provide(TaxKitLive),
      Effect.result,
      Effect.catchCause(() =>
        Effect.succeed(Result.fail(new TaxKitUnexpectedError()))
      ),
      Effect.flatMap((result) =>
        Effect.fromResult<CalculationRun<Output, Identity>, TaxKitError>(result)
      )
    )
  );
