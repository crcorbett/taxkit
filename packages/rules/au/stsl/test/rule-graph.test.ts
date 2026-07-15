import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@taxkit/core/graph";
import type { AnyRuleDescriptor } from "@taxkit/core/rules";
import {
  GrossPayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "@taxkit/rules-au-pay/facts";
import {
  NetPayRuleDescriptor,
  PaygWithholdingRuleDescriptor,
  TaxablePayRuleDescriptor,
} from "@taxkit/rules-au-pay/rule-pack";
import { StslDebtDescriptor } from "@taxkit/rules-au-stsl/facts";
import { AuStslRuleDescriptors } from "@taxkit/rules-au-stsl/rule-pack";

const rulePackSnapshot = (rules: readonly AnyRuleDescriptor[]) =>
  rules.map((rule) => ({
    id: rule.id,
    parameters: (rule.parameters ?? []).map((parameter) => ({
      effectivePeriod: parameter.effectivePeriod,
      id: parameter.id,
      source: parameter.source.kind,
      sourceArtifact: parameter.sourceArtifact
        ? {
            checksum: parameter.sourceArtifact.checksum,
            retrievedOn: parameter.sourceArtifact.retrievedOn,
            rowCount: parameter.sourceArtifact.extract.rowCount,
          }
        : undefined,
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
          "id": "taxkit/rules-au-stsl/rule/StslComponent",
          "parameters": [
            {
              "effectivePeriod": {
                "from": "2025-09-24",
                "toExclusive": "2026-07-01",
              },
              "id": "taxkit/rules-au-stsl/parameter/AtoStslTable",
              "source": "ato-publication",
              "sourceArtifact": {
                "checksum": "sha256:59f5c35e2b9c4a05a5c50bdf3d3993e167a57fa11a0d9fd95f0fb7cc9e884f82",
                "retrievedOn": "2026-05-12",
                "rowCount": 4,
              },
            },
          ],
          "provides": [
            "taxkit/rules-au-stsl/fact/StslComponent",
          ],
          "requires": [
            "taxkit/rules-au-pay/fact/TaxablePay",
            "taxkit/rules-au-stsl/fact/StslDebt",
          ],
          "sources": [
            "ato-publication",
          ],
        },
        {
          "id": "taxkit/rules-au-stsl/rule/PayWithholdingsLedgerWithStsl",
          "parameters": [],
          "provides": [
            "taxkit/rules-au-pay/fact/PayWithholdingsLedger",
          ],
          "requires": [
            "taxkit/rules-au-pay/fact/GrossPay",
            "taxkit/rules-au-pay/fact/PaygWithholdingComponent",
            "taxkit/rules-au-stsl/fact/StslComponent",
          ],
          "sources": [],
        },
      ]
    `);
  });
});
