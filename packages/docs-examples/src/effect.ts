import { Effect, Layer, Option } from "effect";
import { GrossPay } from "taxkit/au";
import { AuPayTakeHomeCalculation } from "taxkit/au/effect";
import {
  PublicCalculatorServiceLive,
  CalculationEngineLive,
  fromCents,
} from "taxkit/core";
import { calculateRunRequest } from "taxkit/effect";

const TaxKitLayer = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

export const program = fromCents(346_200).pipe(
  Effect.flatMap((amount) =>
    calculateRunRequest(AuPayTakeHomeCalculation, {
      payload: {
        facts: {
          grossPay: new GrossPay({
            amount,
            period: "fortnightly",
          }),
          taxFreeThresholdClaimed: true,
        },
        jurisdiction: Option.some(AuPayTakeHomeCalculation.jurisdiction),
        taxYear: Option.some(AuPayTakeHomeCalculation.taxYear),
      },
    })
  ),
  Effect.provide(TaxKitLayer)
);
