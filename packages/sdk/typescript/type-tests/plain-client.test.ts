import { Money, Cents } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";

import { au } from "../src/au.js";
import { TaxKit } from "../src/index.js";

const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

const payClient = TaxKit.createClient(au.modules.pay2025_26);
const auClient = au.createClient();

void TaxKit.calculate(au.calculations.takeHomePay, takeHomeFacts);
void TaxKit.safe.calculate(au.calculations.takeHomePay, takeHomeFacts);
void payClient.calculations.calculate(
  au.calculations.takeHomePay,
  takeHomeFacts
);
void auClient.calculations.calculate(au.calculations.annualIncomeTax, {
  taxableIncome: new Money({ cents: Cents.make(9_000_000), currency: "AUD" }),
});
void au.pay.takeHomePay(takeHomeFacts);
void au.pay.safe.withholdings(takeHomeFacts);
void au.incomeTax.annual({
  taxableIncome: new Money({ cents: Cents.make(9_000_000), currency: "AUD" }),
});

// @ts-expect-error annual income tax is not provided by the pay-only plain client.
void payClient.calculations.calculate(au.calculations.annualIncomeTax, {
  taxableIncome: new Money({ cents: Cents.make(9_000_000), currency: "AUD" }),
});

void TaxKit.calculate(au.calculations.annualIncomeTax, {
  // @ts-expect-error take-home facts cannot be submitted to annual income tax.
  grossPay: new GrossPay({
    amount: new Money({ cents: Cents.make(165_400), currency: "AUD" }),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
});

void au.pay.takeHomePay({
  // @ts-expect-error annual-tax facts cannot be submitted to take-home pay.
  taxableIncome: new Money({ cents: Cents.make(9_000_000), currency: "AUD" }),
});

const payClosed = payClient.dispose();
const auClosed = auClient.dispose();
void payClosed;
void auClosed;

// Selected descriptors retain their specific report fields on client methods.
const takeHome = payClient.calculations.calculate(
  au.calculations.takeHomePay,
  takeHomeFacts
);
type TakeHome = Awaited<typeof takeHome>;
const takeHomeCents = (report: TakeHome) => report.netPay.cents;
void takeHomeCents;
