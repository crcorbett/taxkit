import type { CalculatorDefinition, CalculationResult } from "@taxkit/core";
import type { Schema } from "effect";

/** Infer the checked input directly from its owning calculator definition. */
export type CalculationInput<
  Calculation extends { readonly inputSchema: Schema.Top },
> = Calculation["inputSchema"]["Type"];
export type CalculationOutput<
  Calculation extends { readonly outputSchema: Schema.Top },
> = Calculation["outputSchema"]["Type"];

export type CalculationRun<
  Output extends Schema.Top,
  Identity extends Pick<
    CalculatorDefinition<Schema.Top, Schema.Top>,
    "calculatorId" | "jurisdiction" | "taxYear"
  >,
> = CalculationResult<Output["Type"]> &
  Pick<Identity, "calculatorId"> & {
    readonly context: Readonly<Pick<Identity, "jurisdiction" | "taxYear">>;
  };
