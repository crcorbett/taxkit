import { AnnualTaxScenarioInputSchema } from "@taxkit/rules-au-income-tax/schemas";
import {
  TakeHomeScenarioInputSchema,
  TakeHomeWithSacrificeScenarioInput,
} from "@taxkit/rules-au-pay/schemas";

import {
  AuPayTakeHomeCalculation,
  AuAnnualIncomeTaxCalculation,
  AuPayTakeHomeWithSacrificeCalculation,
} from "../src/au.js";
// @ts-expect-error removed result ADT is unavailable.
import { TaxKitSuccess } from "../src/errors.js";
import {
  calculate,
  calculateSafe,
  createClient,
  // @ts-expect-error removed legacy facade is unavailable.
  TaxKit,
} from "../src/index.js";
import { Cents, Money, NonNegativeMoney } from "../src/money.js";

const amount = NonNegativeMoney.make(Money.fromCents(Cents.make(165_400)));
const pay = TakeHomeScenarioInputSchema.make({
  grossPay: amount,
  period: "weekly",
  taxFreeThresholdClaimed: true,
});
const annual = AnnualTaxScenarioInputSchema.make({ taxableIncome: amount });
const client = createClient();
const report = client.calculate(AuPayTakeHomeCalculation, pay);
void report;

void calculateSafe(AuPayTakeHomeCalculation, pay);
void calculate(AuAnnualIncomeTaxCalculation, annual);
// @ts-expect-error a selected annual calculator cannot accept a pay scenario variable.
void calculate(AuAnnualIncomeTaxCalculation, pay);
// @ts-expect-error raw objects do not establish nominal scenario validation.
void calculate(AuPayTakeHomeCalculation, {
  grossPay: amount,
  period: "weekly",
  taxFreeThresholdClaimed: true,
});
TakeHomeScenarioInputSchema.make({
  // @ts-expect-error raw cents are not checked Money.
  grossPay: 165_400,
  period: "weekly",
  taxFreeThresholdClaimed: true,
});
AnnualTaxScenarioInputSchema.make({
  // @ts-expect-error signed money needs nonnegative refinement.
  taxableIncome: Money.fromCents(Cents.make(-1)),
});
TakeHomeScenarioInputSchema.make({
  grossPay: amount,
  // @ts-expect-error unsupported pay period.
  period: "daily",
  taxFreeThresholdClaimed: true,
});
// @ts-expect-error sacrifice-aware input requires the amount explicitly.
TakeHomeWithSacrificeScenarioInput.make({
  grossPay: amount,
  period: "weekly",
  taxFreeThresholdClaimed: true,
});
// @ts-expect-error base scenario cannot satisfy the sacrifice-aware definition.
void calculate(AuPayTakeHomeWithSacrificeCalculation, pay);
type PayReport = Awaited<typeof report>;
// @ts-expect-error annual fields are absent from the selected pay report.
export type WrongReportField = PayReport["liability"];
void client.dispose();
void TaxKit;
void TaxKitSuccess;
