import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@taxkit/core/graph";
import type { AnyRuleDescriptor } from "@taxkit/core/rules";
import { AnnualTaxableIncomeDescriptor } from "@taxkit/rules-au-income-tax/facts";
import { AuAnnualTaxRuleDescriptors } from "@taxkit/rules-au-income-tax/rule-pack";

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
          "id": "taxkit/rules-au-income-tax/rule/IncomeTax",
          "parameters": [
            {
              "effectivePeriod": {
                "from": "2025-07-01",
                "toExclusive": "2026-07-01",
              },
              "id": "taxkit/rules-au-income-tax/parameter/AtoIncomeTaxTable",
              "source": "ato-publication",
              "sourceArtifact": {
                "checksum": "sha256:7cc3b3d6e7823ff7a9b8f145c2809db0e5f8c8cf19d01c56dbd511f52ff33e63",
                "retrievedOn": "2026-05-12",
                "rowCount": 5,
              },
            },
          ],
          "provides": [
            "taxkit/rules-au-income-tax/fact/IncomeTaxComponent",
          ],
          "requires": [
            "taxkit/rules-au-income-tax/fact/AnnualTaxableIncome",
          ],
          "sources": [
            "ato-publication",
          ],
        },
        {
          "id": "taxkit/rules-au-income-tax/rule/Lito",
          "parameters": [
            {
              "effectivePeriod": {
                "from": "2025-07-01",
                "toExclusive": "2026-07-01",
              },
              "id": "taxkit/rules-au-income-tax/parameter/AtoLitoTable",
              "source": "ato-publication",
              "sourceArtifact": {
                "checksum": "sha256:c31c69c4417f08f7bc9dced2c3a95d80e19885b7ee5e16b8931fe6ea0c761d9f",
                "retrievedOn": "2026-05-12",
                "rowCount": 4,
              },
            },
          ],
          "provides": [
            "taxkit/rules-au-income-tax/fact/LitoComponent",
          ],
          "requires": [
            "taxkit/rules-au-income-tax/fact/AnnualTaxableIncome",
          ],
          "sources": [
            "ato-publication",
          ],
        },
        {
          "id": "taxkit/rules-au-income-tax/rule/MedicareLevy",
          "parameters": [
            {
              "effectivePeriod": {
                "from": "2025-07-01",
                "toExclusive": "2026-07-01",
              },
              "id": "taxkit/rules-au-income-tax/parameter/AtoMedicareLevyTable",
              "source": "ato-publication",
              "sourceArtifact": {
                "checksum": "sha256:d3b8ab27d44a3b0dc9d84b81c09a5f1af0cfa197f9f96deab47d19362195c987",
                "retrievedOn": "2026-05-12",
                "rowCount": 1,
              },
            },
          ],
          "provides": [
            "taxkit/rules-au-income-tax/fact/MedicareLevyComponent",
          ],
          "requires": [
            "taxkit/rules-au-income-tax/fact/AnnualTaxableIncome",
          ],
          "sources": [
            "ato-publication",
          ],
        },
        {
          "id": "taxkit/rules-au-income-tax/rule/AnnualTaxLedger",
          "parameters": [],
          "provides": [
            "taxkit/rules-au-income-tax/fact/AnnualTaxLedger",
          ],
          "requires": [
            "taxkit/rules-au-income-tax/fact/IncomeTaxComponent",
            "taxkit/rules-au-income-tax/fact/LitoComponent",
            "taxkit/rules-au-income-tax/fact/MedicareLevyComponent",
          ],
          "sources": [],
        },
      ]
    `);
  });
});
