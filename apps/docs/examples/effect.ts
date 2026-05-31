import { aud } from "@whattax/core/primitives";
import { GrossPay } from "@whattax/rules-au-pay";
import { AuPayTakeHomeCalculation } from "@whattax/sdk/au/effect";
import { calculateRunRequest } from "@whattax/sdk/effect";

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
});

if (import.meta.main) {
  console.log(AuPayTakeHomeCalculation.calculatorId);
}
