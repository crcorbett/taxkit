import type { CalculatorDefinition } from "@taxkit/core";
import { CalculationEngine } from "@taxkit/core";
import { Effect } from "effect";
import type { Schema } from "effect";

export { decodeInput } from "@taxkit/core";
export { CalculationEngine as TaxKitService } from "@taxkit/core";
export { TaxKitLive } from "./live.layer.js";
export type { CalculationInput, CalculationOutput } from "./types.js";

export type TaxKitEffectRequirements = CalculationEngine;

/** Execute the selected definition over its checked scenario. */
export const calculateRun = <Input extends Schema.Top, Output extends Schema.Top>(
  calculation: CalculatorDefinition<Input, Output>, input: NoInfer<Input["Type"]>
) => calculation.calculate(input);

export const calculateReport = <Input extends Schema.Top, Output extends Schema.Top>(
  calculation: CalculatorDefinition<Input, Output>, input: NoInfer<Input["Type"]>
) => calculateRun(calculation, input).pipe(Effect.map((run) => run.report));
