import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@whattax/core/graph";
import { AnnualTaxableIncomeDescriptor } from "../src/facts/income.js";
import { AuAnnualTaxRuleDescriptors } from "../src/rule-pack/descriptors.js";

describe("AU annual tax rule graph", () => {
  it("validates the annual tax rule graph", () => {
    const issues = validateRuleGraph({
      rules: AuAnnualTaxRuleDescriptors,
      inputFacts: [AnnualTaxableIncomeDescriptor],
    });

    expect(issues).toEqual([]);
  });
});
