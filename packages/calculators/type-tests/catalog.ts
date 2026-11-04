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
