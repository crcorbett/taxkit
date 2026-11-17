import type { CalculatorDefinition } from "@taxkit/core/calculators";
import type { CalculationError } from "@taxkit/core/errors";
import { Effect } from "effect";
import type { Schema } from "effect";

import type { CalculationRun } from "./types.js";

export { decodeInput } from "@taxkit/core/calculators";
export type {
  CalculationInput,
  CalculationOutput,
  CalculationRun,
} from "./types.js";

/**
 * Execute the selected definition over its checked scenario. Definitions are
 * closed programs: their rule packs are composed by the owning package, so the
 * returned Effect has no requirements.
 */
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
): Effect.Effect<CalculationRun<Output, Identity>, CalculationError> =>
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
