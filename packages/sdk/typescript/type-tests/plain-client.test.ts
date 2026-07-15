import { aud } from "@taxkit/core/primitives";
import { GrossPay } from "@taxkit/rules-au-pay";

import { au } from "../src/au.js";
import { TaxKit } from "../src/index.js";

const takeHomeFacts = {
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
};

const payClient = TaxKit.createClient(au.modules.pay2025_26);
const auClient = au.createClient();

TaxKit.calculate(au.calculations.takeHomePay, takeHomeFacts);
TaxKit.safe.calculate(au.calculations.takeHomePay, takeHomeFacts);
payClient.calculations.calculate(au.calculations.takeHomePay, takeHomeFacts);
auClient.calculations.calculate(au.calculations.annualIncomeTax, {
  taxableIncome: aud(9_000_000),
});
au.pay.takeHomePay(takeHomeFacts);
au.pay.safe.withholdings(takeHomeFacts);
au.incomeTax.annual({ taxableIncome: aud(9_000_000) });

// @ts-expect-error annual income tax is not provided by the pay-only plain client.
payClient.calculations.calculate(au.calculations.annualIncomeTax, {
  taxableIncome: aud(9_000_000),
});

TaxKit.calculate(au.calculations.annualIncomeTax, {
  // @ts-expect-error take-home facts cannot be submitted to annual income tax.
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
});

au.pay.takeHomePay({
  // @ts-expect-error annual-tax facts cannot be submitted to take-home pay.
  taxableIncome: aud(9_000_000),
});
