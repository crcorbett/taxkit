import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@whattax/core/graph";
import type { AnyRuleDescriptor } from "@whattax/core/rules";
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

const rulePackSnapshot = (rules: readonly AnyRuleDescriptor[]) =>
  rules.map((rule) => ({
    id: rule.id,
    parameters: (rule.parameters ?? []).map((parameter) => ({
      effectivePeriod: parameter.effectivePeriod,
      id: parameter.id,
      source: parameter.source.kind,
    })),
    provides: rule.provides.map((fact) => fact.id),
    requires: rule.requires.map((fact) => fact.id),
    sources: rule.sources.map((source) => source.kind),
  }));

describe("AU STSL rule graph", () => {
  it("validates the composed PAYG + STSL rule graph", () => {
    const issues = validateRuleGraph({
      inputFacts: [
        GrossPayDescriptor,
        TaxFreeThresholdClaimedDescriptor,
        StslDebtDescriptor,
      ],
      rules: [
        TaxablePayRuleDescriptor,
        PaygWithholdingRuleDescriptor,
        ...AuStslRuleDescriptors,
        NetPayRuleDescriptor,
      ],
    });

    expect(issues).toEqual([]);
  });

  it("surfaces caller question metadata on STSL input facts", () => {
    expect(StslDebtDescriptor.question?.inputKind).toBe("boolean");
  });

  it("captures descriptor snapshots for the published STSL rule pack", () => {
    expect(rulePackSnapshot(AuStslRuleDescriptors)).toMatchInlineSnapshot(`
      [
        {
          "id": "whattax/rules-au-stsl/rule/StslComponent",
          "parameters": [
            {
              "effectivePeriod": {
                "from": "2025-26",
                "to": "2025-26",
              },
              "id": "whattax/rules-au-stsl/parameter/AtoStslTable",
              "source": "ato-publication",
            },
          ],
          "provides": [
            "whattax/rules-au-stsl/fact/StslComponent",
          ],
          "requires": [
            "whattax/rules-au-pay/fact/TaxablePay",
            "whattax/rules-au-stsl/fact/StslDebt",
          ],
          "sources": [
            "ato-publication",
          ],
        },
        {
          "id": "whattax/rules-au-stsl/rule/PayWithholdingsLedgerWithStsl",
          "parameters": [],
          "provides": [
            "whattax/rules-au-pay/fact/PayWithholdingsLedger",
          ],
          "requires": [
            "whattax/rules-au-pay/fact/GrossPay",
            "whattax/rules-au-pay/fact/PaygWithholdingComponent",
            "whattax/rules-au-stsl/fact/StslComponent",
          ],
          "sources": [],
        },
      ]
    `);
  });
});
