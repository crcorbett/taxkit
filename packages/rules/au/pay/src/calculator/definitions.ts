import { defineCalculator } from "@taxkit/core";
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

// Static rule packs over each scenario's facts. Only the checked scenario is
// supplied per calculation; facts are derived in that calculation's own scope.
const TakeHomePay = CalculateTakeHomePay.pipe(
  Effect.provide(
    AuTakeHomePay2025_26_Live.pipe(Layer.provideMerge(TakeHomeScenarioLive))
  )
);
const PayWithholdings = CalculatePayWithholdings.pipe(
  Effect.provide(
    AuPayWithholdings2025_26_Live.pipe(Layer.provideMerge(TakeHomeScenarioLive))
  )
);
const TakeHomePayWithSacrifice = CalculateTakeHomePay.pipe(
  Effect.provide(
    AuTakeHomePayWithSacrifice2025_26_Live.pipe(
      Layer.provideMerge(TakeHomeWithSacrificeScenarioLive)
    )
  )
);

export const AuPayTakeHomeCalculation = defineCalculator({
  inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
  ruleDescriptors: AuTakeHomePayRuleDescriptors,
  ...AuPayTakeHomeContract,
  calculate: (input) =>
    TakeHomePay.pipe(Effect.provideService(TakeHomeScenario, input)),
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
    PayWithholdings.pipe(Effect.provideService(TakeHomeScenario, input)),
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
    TakeHomePayWithSacrifice.pipe(
      Effect.provideService(TakeHomeWithSacrificeScenario, input)
    ),
});
