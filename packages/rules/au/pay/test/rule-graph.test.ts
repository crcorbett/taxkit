import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@whattax/core/graph";
import { SourceRef } from "@whattax/core/trace";

import {
  GrossPayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "../src/facts/pay.js";
import { SalarySacrificeDescriptor } from "../src/facts/sacrifice.js";
import {
  AuTakeHomePayRuleDescriptors,
  AuTakeHomePayWithSacrificeRuleDescriptors,
  PaygWithholdingRuleDescriptor,
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

  it("surfaces caller question metadata on input fact descriptors", () => {
    expect(GrossPayDescriptor.question?.inputKind).toBe("money");
    expect(TaxFreeThresholdClaimedDescriptor.question?.inputKind).toBe(
      "boolean"
    );
    expect(SalarySacrificeDescriptor.question?.inputKind).toBe("money");
  });

  it("reports rule parameter source drift", () => {
    const issues = validateRuleGraph({
      rules: [
        {
          ...PaygWithholdingRuleDescriptor,
          sources: [
            SourceRef.make({
              kind: "ato-publication",
              title: "wrong source",
              reference: "https://example.com/wrong-source",
            }),
          ],
        },
      ],
      inputFacts: [
        GrossPayDescriptor,
        TaxFreeThresholdClaimedDescriptor,
        SalarySacrificeDescriptor,
      ],
    });

    expect(issues.map((issue) => issue.kind)).toContain(
      "parameter-source-mismatch"
    );
  });
});
