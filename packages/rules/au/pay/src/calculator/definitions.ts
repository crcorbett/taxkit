import { CalculationEngine, defineCalculator } from "@taxkit/core";
import { Effect, Layer } from "effect";

import {
  GrossPayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "../facts/pay.js";
import { SalarySacrificeDescriptor } from "../facts/sacrifice.js";
import {
  AuTakeHomePayRuleDescriptors,
  AuTakeHomePayWithSacrificeRuleDescriptors,
  TaxablePayRuleDescriptor,
  PaygWithholdingRuleDescriptor,
  PayWithholdingsLedgerRuleDescriptor,
} from "../rule-pack/descriptors.js";
import {
  AuTakeHomePay2025_26_Live,
  AuTakeHomePayWithSacrifice2025_26_Live,
  AuPayWithholdings2025_26_Live,
} from "../rule-pack/index.js";
import {
  AuPayTakeHomeContract,
  AuPayWithholdingsContract,
  AuPayWithSacrificeContract,
} from "./schemas.js";
import {
  TakeHomeWithSacrificeScenario,
  TakeHomeWithSacrificeScenarioLive,
  CalculateTakeHomePay,
  CalculatePayWithholdings,
  TakeHomeScenario,
  TakeHomeScenarioLive,
} from "./take-home-pay.js";

export const AuPayTakeHomeCalculation = defineCalculator({
  inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
  ruleDescriptors: AuTakeHomePayRuleDescriptors,
  ...AuPayTakeHomeContract,
  calculate: (input) =>
    Effect.gen(function* () {
      const engine = yield* CalculationEngine;
      return yield* engine.run({
        calculation: CalculateTakeHomePay,
        layer: AuTakeHomePay2025_26_Live.pipe(
          Layer.provideMerge(TakeHomeScenarioLive),
          Layer.provide(Layer.succeed(TakeHomeScenario)(input))
        ),
      });
    }),
});
export const AuPayWithholdingsCalculation = defineCalculator({
  inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
  ruleDescriptors: [
    TaxablePayRuleDescriptor,
    PaygWithholdingRuleDescriptor,
    PayWithholdingsLedgerRuleDescriptor,
  ],
  ...AuPayWithholdingsContract,
  calculate: (input) =>
    Effect.gen(function* () {
      const engine = yield* CalculationEngine;
      return yield* engine.run({
        calculation: CalculatePayWithholdings,
        layer: AuPayWithholdings2025_26_Live.pipe(
          Layer.provideMerge(TakeHomeScenarioLive),
          Layer.provide(Layer.succeed(TakeHomeScenario)(input))
        ),
      });
    }),
});

export const AuPayTakeHomeWithSacrificeCalculation = defineCalculator({
  inputFacts: [
    GrossPayDescriptor,
    SalarySacrificeDescriptor,
    TaxFreeThresholdClaimedDescriptor,
  ],
  ruleDescriptors: AuTakeHomePayWithSacrificeRuleDescriptors,
  ...AuPayWithSacrificeContract,
  calculate: (input) =>
    Effect.gen(function* () {
      const engine = yield* CalculationEngine;
      return yield* engine.run({
        calculation: CalculateTakeHomePay,
        layer: AuTakeHomePayWithSacrifice2025_26_Live.pipe(
          Layer.provideMerge(TakeHomeWithSacrificeScenarioLive),
          Layer.provide(Layer.succeed(TakeHomeWithSacrificeScenario)(input))
        ),
      });
    }),
});
