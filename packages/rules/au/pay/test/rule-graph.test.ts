import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@whattax/core/graph";
import {
  GrossPayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "../src/facts/pay.js";
import { SalarySacrificeDescriptor } from "../src/facts/sacrifice.js";
import {
  AuTakeHomePayRuleDescriptors,
  AuTakeHomePayWithSacrificeRuleDescriptors,
} from "../src/rule-pack/descriptors.js";

describe("AU take-home pay rule graph", () => {
  it("validates the base rule pack graph", () => {
    const issues = validateRuleGraph({
      rules: AuTakeHomePayRuleDescriptors,
      inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
    });

    expect(issues).toEqual([]);
  });

  it("validates the salary-sacrifice rule pack graph", () => {
    const issues = validateRuleGraph({
      rules: AuTakeHomePayWithSacrificeRuleDescriptors,
      inputFacts: [
        GrossPayDescriptor,
        TaxFreeThresholdClaimedDescriptor,
        SalarySacrificeDescriptor,
      ],
    });

    expect(issues).toEqual([]);
  });

  it("reports missing input facts", () => {
    const issues = validateRuleGraph({
      rules: AuTakeHomePayRuleDescriptors,
      inputFacts: [GrossPayDescriptor],
    });

    expect(issues.map((issue) => issue.kind)).toContain("missing-provider");
  });
});
