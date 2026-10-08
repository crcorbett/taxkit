import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@taxkit/core/graph";
import { ParameterEffectivePeriod } from "@taxkit/core/parameters";
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
import { Array as EffectArray, Effect, Schema, Option } from "effect";

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
    expect(
      StslDebtDescriptor.question.pipe(
        Option.map((question) => question.inputKind),
        Option.getOrUndefined
      )
    ).toBe("boolean");
  });

  it.effect(
    "captures descriptor snapshots for the published STSL rule pack",
    () =>
      Effect.gen(function* () {
        expect(yield* rulePackSnapshot(AuStslRuleDescriptors))
          .toMatchInlineSnapshot(`
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
      })
  );
});
