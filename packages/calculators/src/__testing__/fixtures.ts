import { Money, Cents, NonNegativeMoney } from "@taxkit/core/primitives";
import { TakeHomeScenarioInputSchema } from "@taxkit/rules-au-pay/schemas";

import { TakeHomeCalculationRequest } from "../schemas.js";

export const sensitiveSentinel =
  "private-calculator-sentinel-/private/source?credential=hidden";
export const CalculationRequest = TakeHomeCalculationRequest.make({
  calculatorId:
    TakeHomeCalculationRequest.fields.calculatorId.make("au.pay.take-home"),
  payload: {
    facts: TakeHomeScenarioInputSchema.make({
      grossPay: NonNegativeMoney.make(
        new Money({ cents: Cents.make(165_400), currency: "AUD" })
      ),
      period: "weekly",
      taxFreeThresholdClaimed: true,
    }),
  },
});
