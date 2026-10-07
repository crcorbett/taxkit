import { Schema } from "effect";

import { CalculatorUse, PageView } from "../schemas.js";

export const AnalyticsObservations = Schema.Struct({
  calculatorUses: Schema.Array(CalculatorUse),
  pageViews: Schema.Array(PageView),
});
export type AnalyticsObservations = typeof AnalyticsObservations.Type;
