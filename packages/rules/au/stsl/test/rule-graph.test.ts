import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@whattax/core/graph";
import {
  GrossPayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "@whattax/rules-au-pay/facts";
import {
  NetPayRuleDescriptor,
  PaygWithholdingRuleDescriptor,
  TaxablePayRuleDescriptor,
} from "@whattax/rules-au-pay/rule-pack";
import { StslDebtDescriptor } from "../src/facts/stsl.js";
import { AuStslRuleDescriptors } from "../src/rule-pack/descriptors.js";

describe("AU STSL rule graph", () => {
  it("validates the composed PAYG + STSL rule graph", () => {
    const issues = validateRuleGraph({
      rules: [
        TaxablePayRuleDescriptor,
        PaygWithholdingRuleDescriptor,
        ...AuStslRuleDescriptors,
        NetPayRuleDescriptor,
      ],
      inputFacts: [
        GrossPayDescriptor,
        TaxFreeThresholdClaimedDescriptor,
        StslDebtDescriptor,
      ],
    });

    expect(issues).toEqual([]);
  });

  it("surfaces caller question metadata on STSL input facts", () => {
    expect(StslDebtDescriptor.question?.inputKind).toBe("boolean");
  });
});
