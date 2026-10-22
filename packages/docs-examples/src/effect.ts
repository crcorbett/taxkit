import { GrossPay } from "@taxkit/sdk/au";
import { AuPayTakeHomeCalculation } from "@taxkit/sdk/au/effect";
import {
  PublicCalculatorServiceLive,
  CalculationEngineLive,
  audFromCents,
} from "@taxkit/sdk/core";
import { calculateRunRequest } from "@taxkit/sdk/effect";
import { Effect, Layer, Option } from "effect";

const TaxKitLayer = PublicCalculatorServiceLive.pipe(
  Layer.provide(CalculationEngineLive)
);

export const program = audFromCents(346_200).pipe(
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
        jurisdiction: Option.some(
          Option.some(AuPayTakeHomeCalculation.jurisdiction)
        ),
        taxYear: Option.some(Option.some(AuPayTakeHomeCalculation.taxYear)),
      },
    })
  ),
  Effect.provide(TaxKitLayer)
);
