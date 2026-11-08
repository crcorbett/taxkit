import { CalculationEngine, defineCalculator } from "@taxkit/core";
import { Effect, Layer } from "effect";

import { AnnualTaxableIncomeDescriptor } from "../facts/income.js";
import { AuAnnualTax2025_26_Live } from "../rule-pack/au-annual-tax-2025-26.js";
import { AuAnnualTaxRuleDescriptors } from "../rule-pack/descriptors.js";
import {
  CalculateAnnualTax,
  AnnualTaxScenario,
  AnnualTaxScenarioLive,
} from "./annual-tax.js";
import { AuAnnualTaxContract } from "./schemas.js";

export const AuAnnualIncomeTaxCalculation = defineCalculator({
  inputFacts: [AnnualTaxableIncomeDescriptor],
  ruleDescriptors: AuAnnualTaxRuleDescriptors,
  ...AuAnnualTaxContract,
  calculate: (input) =>
    Effect.gen(function* () {
      const engine = yield* CalculationEngine;
      return yield* engine.run({
        calculation: CalculateAnnualTax,
        layer: AuAnnualTax2025_26_Live.pipe(
          Layer.provideMerge(AnnualTaxScenarioLive),
          Layer.provide(Layer.succeed(AnnualTaxScenario)(input))
        ),
      });
    }),
});
