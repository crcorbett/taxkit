import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@taxkit/core/graph";
import { isoDate } from "@taxkit/core/primitives";
import type { AnyRuleDescriptor } from "@taxkit/core/rules";
import { SourceRef } from "@taxkit/core/trace";
import {
  GrossPayDescriptor,
  SalarySacrificeDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "@taxkit/rules-au-pay/facts";
import { AtoSchedule1TableDescriptor } from "@taxkit/rules-au-pay/parameters";
import {
  AuTakeHomePayRuleDescriptors,
  AuTakeHomePayWithSacrificeRuleDescriptors,
  PaygWithholdingRuleDescriptor,
} from "@taxkit/rules-au-pay/rule-pack";

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

describe("AU take-home pay rule graph", () => {
  it("validates the base rule pack graph", () => {
    const issues = validateRuleGraph({
      inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
      rules: AuTakeHomePayRuleDescriptors,
    });

    expect(issues).toEqual([]);
  });

  it("validates the salary-sacrifice rule pack graph", () => {
    const issues = validateRuleGraph({
      inputFacts: [
        GrossPayDescriptor,
        TaxFreeThresholdClaimedDescriptor,
        SalarySacrificeDescriptor,
      ],
      rules: AuTakeHomePayWithSacrificeRuleDescriptors,
    });

    expect(issues).toEqual([]);
  });

  it("captures descriptor snapshots for published pay rule packs", () => {
    expect({
      base: rulePackSnapshot(AuTakeHomePayRuleDescriptors),
      withSacrifice: rulePackSnapshot(
        AuTakeHomePayWithSacrificeRuleDescriptors
      ),
    }).toMatchInlineSnapshot(`
      {
        "base": [
          {
            "id": "taxkit/rules-au-pay/rule/TaxablePay",
            "parameters": [],
            "provides": [
              "taxkit/rules-au-pay/fact/TaxablePay",
            ],
            "requires": [
              "taxkit/rules-au-pay/fact/GrossPay",
            ],
            "sources": [],
          },
          {
            "id": "taxkit/rules-au-pay/rule/PaygWithholding",
            "parameters": [
              {
                "effectivePeriod": {
                  "from": "2025-07-01",
                  "toExclusive": "2026-07-01",
                },
                "id": "taxkit/rules-au-pay/parameter/AtoSchedule1Table",
                "source": "ato-publication",
                "sourceArtifact": {
                  "checksum": "sha256:4e65d8a6b04f94b2f7fb7d2f4b219c4ad05fb8a4a9938d7b8fc36c012594c9f5",
                  "retrievedOn": "2026-05-12",
                  "rowCount": 15,
                },
              },
            ],
            "provides": [
              "taxkit/rules-au-pay/fact/PaygWithholdingComponent",
            ],
            "requires": [
              "taxkit/rules-au-pay/fact/TaxablePay",
              "taxkit/rules-au-pay/fact/TaxFreeThresholdClaimed",
            ],
            "sources": [
              "ato-publication",
            ],
          },
          {
            "id": "taxkit/rules-au-pay/rule/PayWithholdingsLedger",
            "parameters": [],
            "provides": [
              "taxkit/rules-au-pay/fact/PayWithholdingsLedger",
            ],
            "requires": [
              "taxkit/rules-au-pay/fact/GrossPay",
              "taxkit/rules-au-pay/fact/PaygWithholdingComponent",
            ],
            "sources": [],
          },
          {
            "id": "taxkit/rules-au-pay/rule/NetPay",
            "parameters": [],
            "provides": [
              "taxkit/rules-au-pay/fact/NetPay",
            ],
            "requires": [
              "taxkit/rules-au-pay/fact/GrossPay",
              "taxkit/rules-au-pay/fact/PayWithholdingsLedger",
            ],
            "sources": [],
          },
        ],
        "withSacrifice": [
          {
            "id": "taxkit/rules-au-pay/rule/TaxablePayWithSacrifice",
            "parameters": [],
            "provides": [
              "taxkit/rules-au-pay/fact/TaxablePay",
            ],
            "requires": [
              "taxkit/rules-au-pay/fact/GrossPay",
              "taxkit/rules-au-pay/fact/SalarySacrifice",
            ],
            "sources": [],
          },
          {
            "id": "taxkit/rules-au-pay/rule/PaygWithholding",
            "parameters": [
              {
                "effectivePeriod": {
                  "from": "2025-07-01",
                  "toExclusive": "2026-07-01",
                },
                "id": "taxkit/rules-au-pay/parameter/AtoSchedule1Table",
                "source": "ato-publication",
                "sourceArtifact": {
                  "checksum": "sha256:4e65d8a6b04f94b2f7fb7d2f4b219c4ad05fb8a4a9938d7b8fc36c012594c9f5",
                  "retrievedOn": "2026-05-12",
                  "rowCount": 15,
                },
              },
            ],
            "provides": [
              "taxkit/rules-au-pay/fact/PaygWithholdingComponent",
            ],
            "requires": [
              "taxkit/rules-au-pay/fact/TaxablePay",
              "taxkit/rules-au-pay/fact/TaxFreeThresholdClaimed",
            ],
            "sources": [
              "ato-publication",
            ],
          },
          {
            "id": "taxkit/rules-au-pay/rule/PayWithholdingsLedger",
            "parameters": [],
            "provides": [
              "taxkit/rules-au-pay/fact/PayWithholdingsLedger",
            ],
            "requires": [
              "taxkit/rules-au-pay/fact/GrossPay",
              "taxkit/rules-au-pay/fact/PaygWithholdingComponent",
            ],
            "sources": [],
          },
          {
            "id": "taxkit/rules-au-pay/rule/NetPay",
            "parameters": [],
            "provides": [
              "taxkit/rules-au-pay/fact/NetPay",
            ],
            "requires": [
              "taxkit/rules-au-pay/fact/GrossPay",
              "taxkit/rules-au-pay/fact/PayWithholdingsLedger",
            ],
            "sources": [],
          },
        ],
      }
    `);
  });

  it("reports missing input facts", () => {
    const issues = validateRuleGraph({
      inputFacts: [GrossPayDescriptor],
      rules: AuTakeHomePayRuleDescriptors,
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
      inputFacts: [
        GrossPayDescriptor,
        TaxFreeThresholdClaimedDescriptor,
        SalarySacrificeDescriptor,
      ],
      rules: [
        {
          ...PaygWithholdingRuleDescriptor,
          sources: [
            SourceRef.make({
              kind: "ato-publication",
              reference: "https://example.com/wrong-source",
              title: "wrong source",
            }),
          ],
        },
      ],
    });

    expect(issues.map((issue) => issue.kind)).toContain(
      "parameter-source-mismatch"
    );
  });

  it("reports overlapping parameter effective periods", () => {
    const overlappingSource = SourceRef.make({
      kind: "ato-publication",
      reference: "https://example.com/overlap",
      title: "overlapping source",
    });
    const issues = validateRuleGraph({
      inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
      rules: [
        PaygWithholdingRuleDescriptor,
        {
          ...PaygWithholdingRuleDescriptor,
          parameters: [
            {
              ...AtoSchedule1TableDescriptor,
              effectivePeriod: {
                from: isoDate("2025-10-01"),
                toExclusive: isoDate("2026-07-01"),
              },
              source: overlappingSource,
            },
          ],
          sources: [
            ...PaygWithholdingRuleDescriptor.sources,
            overlappingSource,
          ],
        },
      ],
    });

    expect(issues.map((issue) => issue.kind)).toContain("parameter-overlap");
  });
});
