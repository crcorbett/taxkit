import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@whattax/core/graph";
import { taxYear } from "@whattax/core/primitives";
import type { AnyRuleDescriptor } from "@whattax/core/rules";
import { SourceRef } from "@whattax/core/trace";

import {
  GrossPayDescriptor,
  TaxFreeThresholdClaimedDescriptor,
} from "../src/facts/pay.js";
import { SalarySacrificeDescriptor } from "../src/facts/sacrifice.js";
import { AtoSchedule1TableDescriptor } from "../src/parameters/schedule1.js";
import {
  AuTakeHomePayRuleDescriptors,
  AuTakeHomePayWithSacrificeRuleDescriptors,
  PaygWithholdingRuleDescriptor,
} from "../src/rule-pack/descriptors.js";

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
            "id": "whattax/rules-au-pay/rule/TaxablePay",
            "parameters": [],
            "provides": [
              "whattax/rules-au-pay/fact/TaxablePay",
            ],
            "requires": [
              "whattax/rules-au-pay/fact/GrossPay",
            ],
            "sources": [],
          },
          {
            "id": "whattax/rules-au-pay/rule/PaygWithholding",
            "parameters": [
              {
                "effectivePeriod": {
                  "from": "2025-26",
                  "to": "2025-26",
                },
                "id": "whattax/rules-au-pay/parameter/AtoSchedule1Table",
                "source": "ato-publication",
              },
            ],
            "provides": [
              "whattax/rules-au-pay/fact/PaygWithholdingComponent",
            ],
            "requires": [
              "whattax/rules-au-pay/fact/TaxablePay",
              "whattax/rules-au-pay/fact/TaxFreeThresholdClaimed",
            ],
            "sources": [
              "ato-publication",
            ],
          },
          {
            "id": "whattax/rules-au-pay/rule/PayWithholdingsLedger",
            "parameters": [],
            "provides": [
              "whattax/rules-au-pay/fact/PayWithholdingsLedger",
            ],
            "requires": [
              "whattax/rules-au-pay/fact/GrossPay",
              "whattax/rules-au-pay/fact/PaygWithholdingComponent",
            ],
            "sources": [],
          },
          {
            "id": "whattax/rules-au-pay/rule/NetPay",
            "parameters": [],
            "provides": [
              "whattax/rules-au-pay/fact/NetPay",
            ],
            "requires": [
              "whattax/rules-au-pay/fact/GrossPay",
              "whattax/rules-au-pay/fact/PayWithholdingsLedger",
            ],
            "sources": [],
          },
        ],
        "withSacrifice": [
          {
            "id": "whattax/rules-au-pay/rule/TaxablePayWithSacrifice",
            "parameters": [],
            "provides": [
              "whattax/rules-au-pay/fact/TaxablePay",
            ],
            "requires": [
              "whattax/rules-au-pay/fact/GrossPay",
              "whattax/rules-au-pay/fact/SalarySacrifice",
            ],
            "sources": [],
          },
          {
            "id": "whattax/rules-au-pay/rule/PaygWithholding",
            "parameters": [
              {
                "effectivePeriod": {
                  "from": "2025-26",
                  "to": "2025-26",
                },
                "id": "whattax/rules-au-pay/parameter/AtoSchedule1Table",
                "source": "ato-publication",
              },
            ],
            "provides": [
              "whattax/rules-au-pay/fact/PaygWithholdingComponent",
            ],
            "requires": [
              "whattax/rules-au-pay/fact/TaxablePay",
              "whattax/rules-au-pay/fact/TaxFreeThresholdClaimed",
            ],
            "sources": [
              "ato-publication",
            ],
          },
          {
            "id": "whattax/rules-au-pay/rule/PayWithholdingsLedger",
            "parameters": [],
            "provides": [
              "whattax/rules-au-pay/fact/PayWithholdingsLedger",
            ],
            "requires": [
              "whattax/rules-au-pay/fact/GrossPay",
              "whattax/rules-au-pay/fact/PaygWithholdingComponent",
            ],
            "sources": [],
          },
          {
            "id": "whattax/rules-au-pay/rule/NetPay",
            "parameters": [],
            "provides": [
              "whattax/rules-au-pay/fact/NetPay",
            ],
            "requires": [
              "whattax/rules-au-pay/fact/GrossPay",
              "whattax/rules-au-pay/fact/PayWithholdingsLedger",
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
                from: taxYear("2025-26"),
                to: taxYear("2026-27"),
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
