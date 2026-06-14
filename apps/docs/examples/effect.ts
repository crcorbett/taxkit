import { PublicCalculatorServiceLive } from "@whattax/calculators/live";
import { CalculationEngineLive } from "@whattax/core";
import { aud } from "@whattax/core/primitives";
import { GrossPay } from "@whattax/rules-au-pay";
import { AuPayTakeHomeCalculation } from "@whattax/sdk/au/effect";
import { calculateRunRequest } from "@whattax/sdk/effect";
import { Effect, Layer } from "effect";

const WhatTaxLayer = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

export const program = calculateRunRequest(AuPayTakeHomeCalculation, {
  payload: {
    facts: {
      grossPay: new GrossPay({
        amount: aud(346_200),
        period: "fortnightly",
      }),
      taxFreeThresholdClaimed: true,
    },
    jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
    taxYear: AuPayTakeHomeCalculation.taxYear,
  },
}).pipe(Effect.provide(WhatTaxLayer));
