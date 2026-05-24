import { aud } from "@whattax/core/primitives";
import { GrossPay } from "@whattax/rules-au-pay";

import { createEffectClient, defineSdkCalculation } from "../src/effect.js";
import {
  AuAnnualIncomeTaxCalculation,
  AuIncomeTax2025_26Module,
  AuPay2025_26Module,
  AuPayTakeHomeCalculation,
} from "../src/testing/index.js";

const payClient = createEffectClient(AuPay2025_26Module);
const fullClient = createEffectClient(
  AuPay2025_26Module,
  AuIncomeTax2025_26Module
);

payClient.calculations.calculate(AuPayTakeHomeCalculation, {
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
});

fullClient.calculations.calculate(AuAnnualIncomeTaxCalculation, {
  taxableIncome: aud(9_000_000),
});

// @ts-expect-error annual income tax is not provided by the pay-only module.
payClient.calculations.calculate(AuAnnualIncomeTaxCalculation, {
  taxableIncome: aud(9_000_000),
});

fullClient.calculations.calculate(AuAnnualIncomeTaxCalculation, {
  // @ts-expect-error take-home facts cannot be submitted to annual tax.
  grossPay: new GrossPay({
    amount: aud(165_400),
    period: "weekly",
  }),
  taxFreeThresholdClaimed: true,
});

payClient.calculations.calculate(AuPayTakeHomeCalculation, {
  // @ts-expect-error annual-tax facts cannot be submitted to take-home pay.
  taxableIncome: aud(9_000_000),
});

defineSdkCalculation({
  calculatorId: AuPayTakeHomeCalculation.calculatorId,
  inputSchema: AuPayTakeHomeCalculation.inputSchema,
  jurisdiction: AuPayTakeHomeCalculation.jurisdiction,
  outputSchema: AuPayTakeHomeCalculation.outputSchema,
  // @ts-expect-error unsupported tax year literals must stay out of descriptors.
  taxYear: "2024-25",
});
