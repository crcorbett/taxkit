import { PublicCalculatorServiceLive } from "@taxkit/calculators/live";
import { CalculationEngineLive } from "@taxkit/core";
import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";
import { AuPayTakeHomeCalculation } from "@taxkit/sdk/au/effect";
import { calculateRunRequest } from "@taxkit/sdk/effect";
import { Effect, Layer } from "effect";

const TaxKitLayer = PublicCalculatorServiceLive.pipe(
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
}).pipe(Effect.provide(TaxKitLayer));
