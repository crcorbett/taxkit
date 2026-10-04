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
    ) => Promise<Calculation["outputSchema"]["Type"]>;
    readonly safe: {
      readonly calculate: <
        const Calculation extends ModuleCalculation<Modules>,
      >(
        calculation: Calculation,
        input: Calculation["inputSchema"]["Type"]
      ) => Promise<TaxKitSafeResult<Calculation["outputSchema"]["Type"]>>;
    };
  };
  readonly dispose: () => Promise<void>;
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
  const runtime = ManagedRuntime.make(layer);
  const disposed = Ref.makeUnsafe(false);
  const closed = Deferred.makeUnsafe<true, TaxKitClientDisposeError>();

  const safeCalculation = <
    const Id extends CalculatorId,
    const Jurisdiction extends CalculatorJurisdiction,
    const TaxYear extends CalculatorTaxYear,
    const InputSchema extends Schema.Schema<CalculatorRunFacts>,
    const OutputSchema extends Schema.Decoder<CalculatorRunReport, never>,
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
            Ref.getUnsafe(disposed)
              ? disposedFailure()
              : new TaxKitFailure({ error: toTaxKitCalculationError(cause) }),
          onSuccess: (value) => new TaxKitSuccess({ value }),
        })
      )
    );

  const dispose = Ref.getAndSet(disposed, true).pipe(
    Effect.flatMap((alreadyClosed) =>
      alreadyClosed
        ? Deferred.await(closed)
        : runtime.disposeEffect.pipe(
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
          )
    ),
    Effect.asVoid
  );

  return {
    calculations: {
      // A synchronous Ref read prevents registering new work on a closed Scope.
      // Actual work remains interruptible; only encoding its public outcome is
      // protected, so closing never exposes a raw interruption exception.
      calculate: (calculation, input) =>
        Ref.getUnsafe(disposed)
          ? Effect.runPromise(Effect.fail(disposedFailure().error))
          : Effect.runPromise(
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
                onFiberStart: Fiber.runIn(runtime.scope),
                uninterruptible: true,
              }
            ),
      safe: {
        calculate: (calculation, input) =>
          Ref.getUnsafe(disposed)
            ? Effect.runPromise(Effect.succeed(disposedFailure()))
            : Effect.runPromise(safeCalculation(calculation, input), {
                onFiberStart: Fiber.runIn(runtime.scope),
                uninterruptible: true,
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
  const OutputSchema extends Schema.Decoder<CalculatorRunReport, never>,
>(
  calculation: SdkCalculation<
    Id,
    Jurisdiction,
    TaxYear,
    InputSchema,
    OutputSchema
  >,
  input: InputSchema["Type"]
): Promise<TaxKitSafeResult<OutputSchema["Type"]>> =>
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
  const OutputSchema extends Schema.Decoder<CalculatorRunReport, never>,
>(
  calculation: SdkCalculation<
    Id,
    Jurisdiction,
    TaxYear,
    InputSchema,
    OutputSchema
  >,
  input: InputSchema["Type"]
): Promise<OutputSchema["Type"]> =>
  Effect.runPromise(
    calculateReport(calculation, input).pipe(
      Effect.provide(SdkCalculatorServiceLive),
      Effect.catchCause((cause) => Effect.fail(toTaxKitCalculationError(cause)))
    )
  );
