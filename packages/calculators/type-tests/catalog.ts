import { defineCalculator } from "@taxkit/core";
import {
  AnnualTaxScenarioInputSchema,
  AnnualTaxReport,
} from "@taxkit/rules-au-income-tax";
import {
  AuPayTakeHomeCalculation,
  TakeHomeScenarioInputSchema,
} from "@taxkit/rules-au-pay";

import { defineCalculatorCatalogEntry } from "../src/catalog.js";
import type { CalculatorCatalogEntry } from "../src/catalog.js";
import { CalculatorRunRequest, CalculatorRunResponse } from "../src/schemas.js";

type Metadata = Omit<
  CalculatorCatalogEntry,
  | "calculate"
  | "calculatorId"
  | "context"
  | "inputFacts"
  | "inputSchema"
  | "reportSchema"
  | "ruleDescriptors"
>;
declare const metadata: Metadata;
defineCalculatorCatalogEntry({
  ...metadata,
  definition: AuPayTakeHomeCalculation,
});
defineCalculatorCatalogEntry({
  ...metadata,
  definition: AuPayTakeHomeCalculation,
  // @ts-expect-error registrations cannot override an owning input Schema.
  inputSchema: AnnualTaxScenarioInputSchema,
});
defineCalculator({
  ...AuPayTakeHomeCalculation,
  inputSchema: TakeHomeScenarioInputSchema,
  outputSchema: AnnualTaxReport,
  // @ts-expect-error the native executor must return the owning report Type.
  calculate: AuPayTakeHomeCalculation.calculate,
});
// @ts-expect-error the selected ID retains its literal identity.
const wrongIdentity: "au.income-tax.annual" =
  AuPayTakeHomeCalculation.calculatorId;
void wrongIdentity;

declare const dynamicRequest: typeof CalculatorRunRequest.Type;
// @ts-expect-error native matching requires every calculator case.
CalculatorRunRequest.match(dynamicRequest, {});
if (dynamicRequest.calculatorId === "au.pay.take-home") {
  const threshold: boolean =
    dynamicRequest.payload.facts.taxFreeThresholdClaimed;
  void threshold;
  // @ts-expect-error pay request narrowing excludes annual facts.
  void dynamicRequest.payload.facts.taxableIncome;
}
declare const dynamicResponse: typeof CalculatorRunResponse.Type;
// @ts-expect-error report dispatch also requires every case.
CalculatorRunResponse.match(dynamicResponse, {});
if (dynamicResponse.calculatorId === "au.income-tax.annual") {
  const cents: number = dynamicResponse.report.liability.cents;
  void cents;
  // @ts-expect-error annual response narrowing excludes pay fields.
  void dynamicResponse.report.netPay;
}
