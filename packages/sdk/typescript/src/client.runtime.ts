import type { CalculatorDefinition } from "@taxkit/core";
import { Deferred, Effect, Exit, Fiber, ManagedRuntime, Ref, Result, Scope, Boolean as EffectBoolean } from "effect";
import type { Layer, Schema } from "effect";

import { calculateReport, calculateRun } from "./effect.js";
import type { TaxKitEffectRequirements } from "./effect.js";
import { TaxKitClientDisposedError, TaxKitClientDisposeError, TaxKitUnexpectedError } from "./errors.js";
import type { TaxKitError } from "./errors.js";
import { TaxKitLive } from "./live.layer.js";

type ReportOperation = <Input extends Schema.Top, Output extends Schema.Top>(calculation: CalculatorDefinition<Input, Output>, input: NoInfer<Input["Type"]>) => Promise<Output["Type"]>;
type SafeReportOperation = <Input extends Schema.Top, Output extends Schema.Top>(calculation: CalculatorDefinition<Input, Output>, input: NoInfer<Input["Type"]>) => Promise<Result.Result<Output["Type"], TaxKitError>>;
export interface TaxKitClient extends AsyncDisposable {
  readonly calculate: ReportOperation;
  readonly calculateSafe: SafeReportOperation;
  readonly dispose: () => Promise<void>;
}

// The plain SDK is an explicitly Promise-shaped host. This private module owns
// the bridge and each client's runtime, interruption and shared cleanup result.
export const createPlainClient = (layer: Layer.Layer<TaxKitEffectRequirements>): TaxKitClient => {
  const lifetime = Scope.makeUnsafe();
  const runtime = Effect.acquireRelease(
    Effect.sync(() => ManagedRuntime.make(layer)),
    (ownedRuntime) => ownedRuntime.disposeEffect
  ).pipe(Effect.provideService(Scope.Scope, lifetime), Effect.runSync);
  const disposed = Ref.makeUnsafe(false);
  const closed = Deferred.makeUnsafe<true, TaxKitClientDisposeError>();
  const safeCalculation = <Input extends Schema.Top, Output extends Schema.Top>(
    calculation: CalculatorDefinition<Input, Output>, input: NoInfer<Input["Type"]>
  ): Effect.Effect<Result.Result<Output["Type"], TaxKitError>> =>
    Effect.interruptible(runtime.contextEffect.pipe(
      Effect.flatMap((context) => calculateReport(calculation, input).pipe(Effect.provideContext(context)))
    )).pipe(
      Effect.result,
      Effect.catchCause(() => Effect.succeed(Result.fail(new TaxKitUnexpectedError()))),
      Effect.map((result) => Ref.getUnsafe(disposed) ? Result.fail(new TaxKitClientDisposedError()) : result)
    );
  const dispose = Ref.getAndSet(disposed, true).pipe(
    Effect.flatMap((alreadyClosed) => EffectBoolean.match(alreadyClosed, {
      onFalse: () => Scope.close(lifetime, Exit.void).pipe(
        Effect.catchCause(() => Effect.fail(new TaxKitClientDisposeError())),
        Effect.as(true as const), Effect.exit,
        Effect.flatMap((exit) => Deferred.done(closed, exit)),
        Effect.andThen(Deferred.await(closed))
      ),
      onTrue: () => Deferred.await(closed),
    })), Effect.asVoid
  );
  const disposeHost = () => Effect.runPromise(dispose, { uninterruptible: true });
  return {
    calculate: (calculation, input) => Effect.runPromise(
      (Ref.getUnsafe(disposed) ? Effect.succeed(Result.fail(new TaxKitClientDisposedError())) : safeCalculation(calculation, input)).pipe(Effect.flatMap(Effect.fromResult)),
      { onFiberStart: (fiber) => { Fiber.runIn(runtime.scope)(fiber); }, uninterruptible: true }
    ),
    calculateSafe: (calculation, input) => Effect.runPromise(
      Ref.getUnsafe(disposed) ? Effect.succeed(Result.fail(new TaxKitClientDisposedError())) : safeCalculation(calculation, input),
      { onFiberStart: (fiber) => { Fiber.runIn(runtime.scope)(fiber); }, uninterruptible: true }
    ),
    dispose: disposeHost,
    [Symbol.asyncDispose]: disposeHost,
  };
};
export const calculateSafe = <Input extends Schema.Top, Output extends Schema.Top>(
  calculation: CalculatorDefinition<Input, Output>, input: NoInfer<Input["Type"]>
): Promise<Result.Result<Output["Type"], TaxKitError>> => Effect.runPromise(
  calculateReport(calculation, input).pipe(Effect.provide(TaxKitLive), Effect.result,
    Effect.catchCause(() => Effect.succeed(Result.fail(new TaxKitUnexpectedError()))))
);
export const calculate = <Input extends Schema.Top, Output extends Schema.Top>(
  calculation: CalculatorDefinition<Input, Output>, input: NoInfer<Input["Type"]>
): Promise<Output["Type"]> => Effect.runPromise(
  calculateReport(calculation, input).pipe(Effect.provide(TaxKitLive),
    Effect.result, Effect.catchCause(() => Effect.succeed(Result.fail(new TaxKitUnexpectedError()))), Effect.flatMap(Effect.fromResult))
);
export const run = <Input extends Schema.Top, Output extends Schema.Top>(
  calculation: CalculatorDefinition<Input, Output>, input: NoInfer<Input["Type"]>
) => Effect.runPromise(calculateRun(calculation, input).pipe(Effect.provide(TaxKitLive),
  Effect.result, Effect.catchCause(() => Effect.succeed(Result.fail(new TaxKitUnexpectedError()))), Effect.flatMap(Effect.fromResult)));
