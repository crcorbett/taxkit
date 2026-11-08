import { defineCalculator } from "@taxkit/core";
import { Effect, Layer } from "effect";

import { AnnualTaxableIncomeDescriptor } from "../facts/income.js";
import { AuAnnualTaxRuleDescriptors } from "../rule-pack/descriptors.js";
import { AuAnnualTax2025_26_Live } from "../rule-pack/index.js";
import {
  CalculateAnnualTax,
  AnnualTaxScenario,
  AnnualTaxScenarioLive,
} from "./annual-tax.js";
import { AuAnnualTaxContract } from "./schemas.js";

// The static rule pack over the scenario's facts; only the checked scenario is
// supplied per calculation.
const AnnualTax = CalculateAnnualTax.pipe(
  Effect.provide(
    AuAnnualTax2025_26_Live.pipe(Layer.provideMerge(AnnualTaxScenarioLive))
  )
);

export const AuAnnualIncomeTaxCalculation = defineCalculator({
  inputFacts: [AnnualTaxableIncomeDescriptor],
  ruleDescriptors: AuAnnualTaxRuleDescriptors,
  ...AuAnnualTaxContract,
  calculate: (input) =>
    AnnualTax.pipe(Effect.provideService(AnnualTaxScenario, input)),
});
