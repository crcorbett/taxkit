import { NonNegativeMoney, Cents, Money } from "@taxkit/core";
import { TakeHomeScenarioInputSchema } from "@taxkit/rules-au-pay/schemas";
export const takeHomeFacts = TakeHomeScenarioInputSchema.make({
  grossPay: NonNegativeMoney.make(Money.fromCents(Cents.make(165_400))),
  period: "weekly", taxFreeThresholdClaimed: true,
});
