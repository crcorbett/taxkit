import type {
  CalculatorId,
  CalculatorJurisdiction,
  CalculatorTaxYear,
  CalculatorRunFacts,
  CalculatorRunReport,
} from "@taxkit/calculators/schemas";
import {
  Deferred,
  Effect,
  Exit,
  Fiber,
  ManagedRuntime,
  Match,
  Ref,
  Scope,
  Boolean as EffectBoolean,
} from "effect";
import type { Layer, Schema } from "effect";

import { calculateReport } from "./effect.js";
import type { TaxKitEffectRequirements } from "./effect.js";
import {
  TaxKitClientDisposedError,
  TaxKitClientDisposeError,
  TaxKitCalculationError,
  TaxKitFailure,
  TaxKitSuccess,
  toTaxKitCalculationError,
} from "./errors.js";
import type { TaxKitSafeResult } from "./errors.js";
import { SdkCalculatorServiceLive } from "./live.layer.js";
import type {
  AnyTaxKitModule,
  ModuleCalculation,
  SdkCalculation,
} from "./types.js";

export interface TaxKitClient<Modules extends readonly AnyTaxKitModule[]> {
  readonly calculations: {
    readonly calculate: <const Calculation extends ModuleCalculation<Modules>>(
      calculation: Calculation,
      input: Calculation["inputSchema"]["Type"]
    ) => ReturnType<
      typeof Effect.runPromise<Calculation["outputSchema"]["Type"], never>
    >;
    readonly safe: {
      readonly calculate: <
        const Calculation extends ModuleCalculation<Modules>,
      >(
        calculation: Calculation,
        input: Calculation["inputSchema"]["Type"]
      ) => ReturnType<
        typeof Effect.runPromise<
          TaxKitSafeResult<Calculation["outputSchema"]["Type"]>,
          never
        >
      >;
    };
  };
  readonly dispose: () => ReturnType<
    typeof Effect.runPromise<Effect.Success<typeof Effect.void>, never>
  >;
}
const disposedFailure = () =>
  new TaxKitFailure({
    error: new TaxKitCalculationError({
      error: new TaxKitClientDisposedError({
        message: "TaxKit client is closed",
      }),
      message: "TaxKit calculation failed",
    }),
  });
// The accepted plain API requires Promises. This exact private host owns the
// bridge; callers own each client and must await dispose(). No runtime is shared
// between clients or exposed in their public signatures.
export const createPlainClient = <
  const Modules extends readonly AnyTaxKitModule[],
>(
  layer: Layer.Layer<TaxKitEffectRequirements>,
  ..._modules: Modules
): TaxKitClient<Modules> => {
  const lifetime = Scope.makeUnsafe();
  const runtime = Effect.acquireRelease(
    Effect.sync(() => ManagedRuntime.make(layer)),
    (ownedRuntime) => ownedRuntime.disposeEffect
  ).pipe(Effect.provideService(Scope.Scope, lifetime), Effect.runSync);
  const disposed = Ref.makeUnsafe(false);
  const closed = Deferred.makeUnsafe<true, TaxKitClientDisposeError>();
  const safeCalculation = <
    const Id extends CalculatorId,
    const Jurisdiction extends CalculatorJurisdiction,
    const TaxYear extends CalculatorTaxYear,
    const InputSchema extends Schema.Schema<CalculatorRunFacts>,
    const OutputSchema extends Schema.Decoder<CalculatorRunReport>,
  >(
    calculation: SdkCalculation<
      Id,
      Jurisdiction,
      TaxYear,
      InputSchema,
      OutputSchema
    >,
    input: InputSchema["Type"]
  ): Effect.Effect<TaxKitSafeResult<OutputSchema["Type"]>> =>
    Effect.interruptible(
      runtime.contextEffect.pipe(
        Effect.flatMap((context) =>
          calculateReport(calculation, input).pipe(
            Effect.provideContext(context)
          )
        )
      )
    ).pipe(
      Effect.exit,
      Effect.map(
        Exit.match({
          onFailure: (cause) =>
            EffectBoolean.match(Ref.getUnsafe(disposed), {
              onFalse: () =>
                new TaxKitFailure({ error: toTaxKitCalculationError(cause) }),
              onTrue: () => disposedFailure(),
            }),
          onSuccess: (value) => new TaxKitSuccess({ value }),
        })
      )
    );
  const dispose = Ref.getAndSet(disposed, true).pipe(
    Effect.flatMap((alreadyClosed) =>
      EffectBoolean.match(alreadyClosed, {
        onFalse: () =>
          Scope.close(lifetime, Exit.void).pipe(
            Effect.catchCause(() =>
              Effect.fail(
                new TaxKitClientDisposeError({
                  message: "TaxKit client could not be closed",
                })
              )
            ),
            Effect.as(true as const),
            Effect.exit,
            Effect.flatMap((exit) => Deferred.done(closed, exit)),
            Effect.andThen(Deferred.await(closed))
          ),
        onTrue: () => Deferred.await(closed),
      })
    ),
    Effect.asVoid
  );
  return {
    calculations: {
      // A synchronous Ref read prevents registering new work on a closed Scope.
      // Actual work remains interruptible; only encoding its public outcome is
      // protected, so closing never exposes a raw interruption exception.
      calculate: (calculation, input) =>
        EffectBoolean.match(Ref.getUnsafe(disposed), {
          onFalse: () =>
            Effect.runPromise(
              safeCalculation(calculation, input).pipe(
                Effect.flatMap((result) =>
                  Match.value(result).pipe(
                    Match.tag("TaxKitFailure", (failure) =>
                      Effect.fail(failure.error)
                    ),
                    Match.tag("TaxKitSuccess", (success) =>
                      Effect.succeed(success.value)
                    ),
                    Match.exhaustive
                  )
                )
              ),
              {
                onFiberStart: (fiber) => {
                  Fiber.runIn(runtime.scope)(fiber);
                },
                uninterruptible: true,
              }
            ),
          onTrue: () => Effect.runPromise(Effect.fail(disposedFailure().error)),
        }),
      safe: {
        calculate: (calculation, input) =>
          EffectBoolean.match(Ref.getUnsafe(disposed), {
            onFalse: () =>
              Effect.runPromise(safeCalculation(calculation, input), {
                onFiberStart: (fiber) => {
                  Fiber.runIn(runtime.scope)(fiber);
                },
                uninterruptible: true,
              }),
            onTrue: () => Effect.runPromise(Effect.succeed(disposedFailure())),
          }),
      },
    },
    dispose: () => Effect.runPromise(dispose, { uninterruptible: true }),
  };
};
// One-shot helpers own a bounded Scope instead of leaving a hidden runtime alive.
export const calculateSafe = <
  const Id extends CalculatorId,
  const Jurisdiction extends CalculatorJurisdiction,
  const TaxYear extends CalculatorTaxYear,
  const InputSchema extends Schema.Schema<CalculatorRunFacts>,
  const OutputSchema extends Schema.Decoder<CalculatorRunReport>,
>(
  calculation: SdkCalculation<
    Id,
    Jurisdiction,
    TaxYear,
    InputSchema,
    OutputSchema
  >,
  input: InputSchema["Type"]
): ReturnType<
  typeof Effect.runPromise<TaxKitSafeResult<OutputSchema["Type"]>, never>
> =>
  Effect.runPromise(
    calculateReport(calculation, input).pipe(
      Effect.provide(SdkCalculatorServiceLive),
      Effect.exit,
      Effect.map(
        Exit.match({
          onFailure: (cause) =>
            new TaxKitFailure({ error: toTaxKitCalculationError(cause) }),
          onSuccess: (value) => new TaxKitSuccess({ value }),
        })
      )
    )
  );
export const calculate = <
  const Id extends CalculatorId,
  const Jurisdiction extends CalculatorJurisdiction,
  const TaxYear extends CalculatorTaxYear,
  const InputSchema extends Schema.Schema<CalculatorRunFacts>,
  const OutputSchema extends Schema.Decoder<CalculatorRunReport>,
>(
  calculation: SdkCalculation<
    Id,
    Jurisdiction,
    TaxYear,
    InputSchema,
    OutputSchema
  >,
  input: InputSchema["Type"]
): ReturnType<typeof Effect.runPromise<OutputSchema["Type"], never>> =>
  Effect.runPromise(
    calculateReport(calculation, input).pipe(
      Effect.provide(SdkCalculatorServiceLive),
      Effect.catchCause((cause) => Effect.fail(toTaxKitCalculationError(cause)))
    )
  );
