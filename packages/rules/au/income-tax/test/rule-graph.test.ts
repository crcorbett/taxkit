import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@whattax/core/graph";
import type { AnyRuleDescriptor } from "@whattax/core/rules";

import { AnnualTaxableIncomeDescriptor } from "../src/facts/income.js";
import { AuAnnualTaxRuleDescriptors } from "../src/rule-pack/descriptors.js";

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

describe("AU annual tax rule graph", () => {
  it("validates the annual tax rule graph", () => {
    const issues = validateRuleGraph({
      inputFacts: [AnnualTaxableIncomeDescriptor],
      rules: AuAnnualTaxRuleDescriptors,
    });

    expect(issues).toEqual([]);
  });

  it("surfaces caller question metadata on annual input facts", () => {
    expect(AnnualTaxableIncomeDescriptor.question?.inputKind).toBe("money");
  });

  it("captures descriptor snapshots for the published annual tax rule pack", () => {
    expect(rulePackSnapshot(AuAnnualTaxRuleDescriptors)).toMatchInlineSnapshot(`
      [
        {
          "id": "whattax/rules-au-income-tax/rule/IncomeTax",
          "parameters": [
            {
              "effectivePeriod": {
                "from": "2025-26",
                "to": "2025-26",
              },
              "id": "whattax/rules-au-income-tax/parameter/AtoIncomeTaxTable",
              "source": "ato-publication",
            },
          ],
          "provides": [
            "whattax/rules-au-income-tax/fact/IncomeTaxComponent",
          ],
          "requires": [
            "whattax/rules-au-income-tax/fact/AnnualTaxableIncome",
          ],
          "sources": [
            "ato-publication",
          ],
        },
        {
          "id": "whattax/rules-au-income-tax/rule/Lito",
          "parameters": [
            {
              "effectivePeriod": {
                "from": "2025-26",
                "to": "2025-26",
              },
              "id": "whattax/rules-au-income-tax/parameter/AtoLitoTable",
              "source": "ato-publication",
            },
          ],
          "provides": [
            "whattax/rules-au-income-tax/fact/LitoComponent",
          ],
          "requires": [
            "whattax/rules-au-income-tax/fact/AnnualTaxableIncome",
          ],
          "sources": [
            "ato-publication",
          ],
        },
        {
          "id": "whattax/rules-au-income-tax/rule/MedicareLevy",
          "parameters": [
            {
              "effectivePeriod": {
                "from": "2025-26",
                "to": "2025-26",
              },
              "id": "whattax/rules-au-income-tax/parameter/AtoMedicareLevyTable",
              "source": "ato-publication",
            },
          ],
          "provides": [
            "whattax/rules-au-income-tax/fact/MedicareLevyComponent",
          ],
          "requires": [
            "whattax/rules-au-income-tax/fact/AnnualTaxableIncome",
          ],
          "sources": [
            "ato-publication",
          ],
        },
        {
          "id": "whattax/rules-au-income-tax/rule/AnnualTaxLedger",
          "parameters": [],
          "provides": [
            "whattax/rules-au-income-tax/fact/AnnualTaxLedger",
          ],
          "requires": [
            "whattax/rules-au-income-tax/fact/IncomeTaxComponent",
            "whattax/rules-au-income-tax/fact/LitoComponent",
            "whattax/rules-au-income-tax/fact/MedicareLevyComponent",
          ],
          "sources": [],
        },
      ]
    `);
  });
});
