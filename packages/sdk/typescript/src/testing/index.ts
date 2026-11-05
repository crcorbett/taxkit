import { Cents, Money, NonNegativeMoney } from "@taxkit/core";
import { TakeHomeScenarioInputSchema } from "@taxkit/rules-au-pay/schemas";

export { CalculationEngine as TaxKitService } from "@taxkit/core";
/** A checked scenario for native Layer substitution and integration tests. */
export const TakeHomePayScenarioFixture = TakeHomeScenarioInputSchema.make({
  grossPay: NonNegativeMoney.make(Money.fromCents(Cents.make(165_400))),
  period: "weekly",
  taxFreeThresholdClaimed: true,
});
