import { Cents, Money, NonNegativeMoney } from "@taxkit/core";
import { TakeHomeScenarioInputSchema } from "@taxkit/rules-au-pay/schemas";

/** A checked take-home scenario for integration tests. */
export const TakeHomePayScenarioFixture = TakeHomeScenarioInputSchema.make({
  grossPay: NonNegativeMoney.make(Money.fromCents(Cents.make(165_400))),
  period: "weekly",
  taxFreeThresholdClaimed: true,
});
