import { CalculationEngine, CalculationError, defineCalculator } from "@taxkit/core";
import { Effect, Layer } from "effect";
import { AuAnnualTax2025_26_Live } from "../rule-pack/index.js";
import { AuAnnualTaxCalculatorId, AuAnnualTaxJurisdiction, AuAnnualTaxYear } from "./metadata.js";
import { AnnualTaxReport, AnnualTaxScenarioInputSchema } from "./schemas.js";
import { CalculateAnnualTax, AnnualTaxScenario, AnnualTaxScenarioLive } from "./annual-tax.js";

export const AuAnnualIncomeTaxCalculation = defineCalculator({
  calculatorId: AuAnnualTaxCalculatorId.make("au.income-tax.annual"),
  jurisdiction: AuAnnualTaxJurisdiction.make("AU"), taxYear: AuAnnualTaxYear.make("2025-26"),
  inputSchema: AnnualTaxScenarioInputSchema, outputSchema: AnnualTaxReport, errorSchema: CalculationError,
  calculate: (input) => Effect.gen(function* () {
    const engine = yield* CalculationEngine;
    return yield* engine.run({ calculation: CalculateAnnualTax, layer: AuAnnualTax2025_26_Live.pipe(
      Layer.provideMerge(AnnualTaxScenarioLive), Layer.provide(Layer.succeed(AnnualTaxScenario)(input))
    ) });
  }),
});
