import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@taxkit/core/graph";
import { ParameterEffectivePeriod } from "@taxkit/core/parameters";
import { DateInterval, IsoDate } from "@taxkit/core/primitives";
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
import { Option, Array as EffectArray, Effect, Schema } from "effect";

const rulePackSnapshot = (rules: readonly AnyRuleDescriptor[]) =>
  Effect.forEach(rules, (rule) =>
    Effect.gen(function* () {
      const parameters = yield* Effect.forEach(rule.parameters, (parameter) =>
        Schema.encodeEffect(ParameterEffectivePeriod)(
          parameter.effectivePeriod
        ).pipe(
          Effect.map((effectivePeriod) => ({
            effectivePeriod,
            id: parameter.id,
            source: parameter.source.kind,
            sourceArtifact: parameter.sourceArtifact.pipe(
              Option.map((artifact) => ({
                checksum: artifact.checksum,
                retrievedOn: artifact.retrievedOn,
                rowCount: artifact.extract.rowCount,
              })),
              Option.getOrUndefined
            ),
          }))
        )
      );
      return {
        id: rule.id,
        parameters,
        provides: EffectArray.map(rule.provides, (fact) => fact.id),
        requires: EffectArray.map(rule.requires, (fact) => fact.id),
        sources: EffectArray.map(rule.sources, (source) => source.kind),
      };
    })
  );

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

  it.effect("captures descriptor snapshots for published pay rule packs", () =>
    Effect.gen(function* () {
      expect({
        base: yield* rulePackSnapshot(AuTakeHomePayRuleDescriptors),
        withSacrifice: yield* rulePackSnapshot(
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
    })
  );

  it("reports missing input facts", () => {
    const issues = validateRuleGraph({
      inputFacts: [GrossPayDescriptor],
      rules: AuTakeHomePayRuleDescriptors,
    });

    expect(EffectArray.map(issues, (issue) => issue.kind)).toContain(
      "missing-provider"
    );
  });

  it("surfaces caller question metadata on input fact descriptors", () => {
    expect(
      GrossPayDescriptor.question.pipe(
        Option.map((question) => question.inputKind),
        Option.getOrUndefined
      )
    ).toBe("money");
    expect(
      TaxFreeThresholdClaimedDescriptor.question.pipe(
        Option.map((question) => question.inputKind),
        Option.getOrUndefined
      )
    ).toBe("boolean");
    expect(
      SalarySacrificeDescriptor.question.pipe(
        Option.map((question) => question.inputKind),
        Option.getOrUndefined
      )
    ).toBe("money");
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

    expect(EffectArray.map(issues, (issue) => issue.kind)).toContain(
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
              effectivePeriod: DateInterval.make({
                from: IsoDate.make("2025-10-01"),
                toExclusive: Option.some(
                  Option.some(IsoDate.make("2026-07-01"))
                ),
              }),
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

    expect(EffectArray.map(issues, (issue) => issue.kind)).toContain(
      "parameter-overlap"
    );
  });
});
