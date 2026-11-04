import { CalculationEngine, CalculationError, defineCalculator } from "@taxkit/core";
import { Effect, Layer, Schema } from "effect";

import { AuTakeHomePay2025_26_Live, AuTakeHomePayWithSacrifice2025_26_Live, AuPayWithholdings2025_26_Live } from "../rule-pack/index.js";
import { AuPayJurisdiction, AuPayTaxYear } from "./metadata.js";
import { TakeHomeWithSacrificeScenarioInput, TakeHomePayReport, TakeHomeScenarioInputSchema, PayWithholdingsLedger } from "./schemas.js";
import { TakeHomeWithSacrificeScenario, TakeHomeWithSacrificeScenarioLive, CalculateTakeHomePay, CalculatePayWithholdings, TakeHomeScenario, TakeHomeScenarioLive } from "./take-home-pay.js";

const context = { jurisdiction: AuPayJurisdiction.make("AU"), taxYear: AuPayTaxYear.make("2025-26") };
export const AuPayTakeHomeCalculation = defineCalculator({
  ...context,
  calculatorId: Schema.Literal("au.pay.take-home").pipe(Schema.brand("taxkit/CalculatorId")).make("au.pay.take-home"),
  inputSchema: TakeHomeScenarioInputSchema,
  outputSchema: TakeHomePayReport,
  errorSchema: CalculationError,
  calculate: (input) => Effect.gen(function* () {
    const engine = yield* CalculationEngine;
    return yield* engine.run({ calculation: CalculateTakeHomePay, layer: AuTakeHomePay2025_26_Live.pipe(
      Layer.provideMerge(TakeHomeScenarioLive), Layer.provide(Layer.succeed(TakeHomeScenario)(input))
    ) });
  }),
});
export const AuPayWithholdingsCalculation = defineCalculator({
  ...context,
  calculatorId: Schema.Literal("au.pay.withholdings").pipe(Schema.brand("taxkit/CalculatorId")).make("au.pay.withholdings"),
  inputSchema: TakeHomeScenarioInputSchema,
  outputSchema: PayWithholdingsLedger,
  errorSchema: CalculationError,
  calculate: (input) => Effect.gen(function* () {
    const engine = yield* CalculationEngine;
    return yield* engine.run({ calculation: CalculatePayWithholdings, layer: AuPayWithholdings2025_26_Live.pipe(
      Layer.provideMerge(TakeHomeScenarioLive), Layer.provide(Layer.succeed(TakeHomeScenario)(input))
    ) });
  }),
});

export const AuPayTakeHomeWithSacrificeCalculation = defineCalculator({
  ...context,
  calculatorId: Schema.Literal("au.pay.take-home-with-sacrifice").pipe(Schema.brand("taxkit/CalculatorId")).make("au.pay.take-home-with-sacrifice"),
  inputSchema: TakeHomeWithSacrificeScenarioInput,
  outputSchema: TakeHomePayReport,
  errorSchema: CalculationError,
  calculate: (input) => Effect.gen(function* () {
    const engine = yield* CalculationEngine;
    return yield* engine.run({ calculation: CalculateTakeHomePay, layer: AuTakeHomePayWithSacrifice2025_26_Live.pipe(
      Layer.provideMerge(TakeHomeWithSacrificeScenarioLive), Layer.provide(Layer.succeed(TakeHomeWithSacrificeScenario)(input))
    ) });
  }),
});
