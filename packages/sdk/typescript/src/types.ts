import type { Schema } from "effect";

/** Infer the checked input directly from its owning calculator definition. */
export type CalculationInput<Calculation extends { readonly inputSchema: Schema.Top }> = Calculation["inputSchema"]["Type"];
export type CalculationOutput<Calculation extends { readonly outputSchema: Schema.Top }> = Calculation["outputSchema"]["Type"];
