import type { AnnualTaxScenarioInput } from "@taxkit/rules-au-income-tax";
import type { TakeHomeScenarioInputSchema } from "@taxkit/rules-au-pay";

import { defineCalculatorCatalogEntry } from "../src/catalog.js";
import type { CalculatorCatalogEntryDefinition } from "../src/catalog.js";

type TakeHomeDefinition = CalculatorCatalogEntryDefinition<
  typeof TakeHomeScenarioInputSchema
>;

declare const takeHomeDefinition: TakeHomeDefinition;
declare const annualTaxContinuation: (
  facts: AnnualTaxScenarioInput
) => ReturnType<TakeHomeDefinition["calculate"]>;

defineCalculatorCatalogEntry(takeHomeDefinition);

defineCalculatorCatalogEntry({
  ...takeHomeDefinition,
  // @ts-expect-error A selected schema can only pair with its own typed continuation.
  calculate: annualTaxContinuation,
});
