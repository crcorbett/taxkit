import { calculate, calculateSafe, createClient } from "../src/index.js";
import { AuPayTakeHomeCalculation, AuAnnualIncomeTaxCalculation, AuPayTakeHomeWithSacrificeCalculation } from "../src/au.js";
import { TakeHomeScenarioInputSchema, TakeHomeWithSacrificeScenarioInput } from "@taxkit/rules-au-pay/schemas";
import { AnnualTaxScenarioInputSchema } from "@taxkit/rules-au-income-tax/schemas";
import { Cents, Money, NonNegativeMoney } from "../src/money.js";

const amount = NonNegativeMoney.make(Money.fromCents(Cents.make(165_400)));
const pay = TakeHomeScenarioInputSchema.make({ grossPay: amount, period: "weekly", taxFreeThresholdClaimed: true });
const annual = AnnualTaxScenarioInputSchema.make({ taxableIncome: amount });
const client = createClient();
const report = client.calculate(AuPayTakeHomeCalculation, pay);
const payReport: Promise<typeof AuPayTakeHomeCalculation.outputSchema.Type> = report;
void payReport; void calculateSafe(AuPayTakeHomeCalculation, pay);
void calculate(AuAnnualIncomeTaxCalculation, annual);
// @ts-expect-error a selected annual calculator cannot accept a pay scenario variable.
void calculate(AuAnnualIncomeTaxCalculation, pay);
// @ts-expect-error raw objects do not establish nominal scenario validation.
void calculate(AuPayTakeHomeCalculation, { grossPay: amount, period: "weekly", taxFreeThresholdClaimed: true });
// @ts-expect-error raw cents are not checked Money.
TakeHomeScenarioInputSchema.make({ grossPay: 165_400, period: "weekly", taxFreeThresholdClaimed: true });
// @ts-expect-error signed money needs nonnegative refinement.
AnnualTaxScenarioInputSchema.make({ taxableIncome: Money.fromCents(Cents.make(-1)) });
// @ts-expect-error unsupported pay period.
TakeHomeScenarioInputSchema.make({ grossPay: amount, period: "daily", taxFreeThresholdClaimed: true });
// @ts-expect-error sacrifice-aware input requires the amount explicitly.
TakeHomeWithSacrificeScenarioInput.make({ grossPay: amount, period: "weekly", taxFreeThresholdClaimed: true });
// @ts-expect-error base scenario cannot satisfy the sacrifice-aware definition.
void calculate(AuPayTakeHomeWithSacrificeCalculation, pay);
type PayReport = Awaited<typeof report>;
const wrongReport = (value: PayReport) => {
  // @ts-expect-error annual field is absent from the selected pay report.
  return value.liability;
};
void wrongReport; void client.dispose();
// @ts-expect-error removed legacy facade is unavailable.
import { TaxKit } from "../src/index.js";
// @ts-expect-error removed result ADT is unavailable.
import { TaxKitSuccess } from "../src/errors.js";
void TaxKit; void TaxKitSuccess;
