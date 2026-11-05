import type {
  CalculatorDefinition,
  CalculationEngine,
  CalculationError,
} from "@taxkit/core";
import { Effect } from "effect";
import type { Schema } from "effect";

import type { CalculationRun } from "./types.js";

export { decodeInput } from "@taxkit/core";
export { CalculationEngine as TaxKitService } from "@taxkit/core";
export { TaxKitLive } from "./live.layer.js";
export type {
  CalculationInput,
  CalculationOutput,
  CalculationRun,
} from "./types.js";

export type TaxKitEffectRequirements = CalculationEngine;

/** Execute the selected definition over its checked scenario. */
export const calculateRun = <
  Input extends Schema.Top,
  Output extends Schema.Top,
  const Identity extends Pick<
    CalculatorDefinition<Input, Output>,
    "calculatorId" | "jurisdiction" | "taxYear"
  >,
>(
  calculation: CalculatorDefinition<Input, Output> & Identity,
  input: NoInfer<Input["Type"]>
): Effect.Effect<
  CalculationRun<Output, Identity>,
  CalculationError,
  CalculationEngine
> =>
  calculation.calculate(input).pipe(
    Effect.map(
      (run) =>
        ({
          ...run,
          calculatorId: calculation.calculatorId,
          context: {
            jurisdiction: calculation.jurisdiction,
            taxYear: calculation.taxYear,
          },
        }) as const
    ),
    Effect.withSpan("TaxKit.calculateRun")
  );

export const calculateReport = <
  Input extends Schema.Top,
  Output extends Schema.Top,
>(
  calculation: CalculatorDefinition<Input, Output>,
  input: NoInfer<Input["Type"]>
) =>
  calculateRun(calculation, input).pipe(
    Effect.map((run) => run.report),
    Effect.withSpan("TaxKit.calculateReport")
  );
