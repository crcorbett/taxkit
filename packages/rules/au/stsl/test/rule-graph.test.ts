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
import {
  Function as EffectFunction,
  Array as EffectArray,
  Effect,
  Schema,
  Option,
} from "effect";

const rulePackSnapshot = (rules: readonly AnyRuleDescriptor[]) =>
  EffectFunction.pipe(
    rules,
    Effect.forEach((rule) =>
      Effect.gen(function* () {
        const parameters = yield* EffectFunction.pipe(
          rule.parameters,
          Effect.forEach((parameter) =>
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
          )
        );
        return {
          id: rule.id,
          parameters,
          provides: EffectFunction.pipe(
            rule.provides,
            EffectArray.map((fact) => fact.id)
          ),
          requires: EffectFunction.pipe(
            rule.requires,
            EffectArray.map((fact) => fact.id)
          ),
          sources: EffectFunction.pipe(
            rule.sources,
            EffectArray.map((source) => source.kind)
          ),
        };
      })
    )
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
    expect(issues).toStrictEqual([]);
  });

  it("surfaces caller question metadata on STSL input facts", () => {
    EffectFunction.pipe(
      StslDebtDescriptor.question.pipe(
        Option.map((question) => question.inputKind),
        Option.getOrUndefined
      ),
      (actual) => {
        expect(actual).toBe("boolean");
      }
    );
  });

  it("pins the published rule inventory", () => {
    const ids = EffectFunction.pipe(
      AuStslRuleDescriptors,
      EffectArray.map((rule) => rule.id)
    );
    expect(ids).toMatchInlineSnapshot(`
   [
     "taxkit/rules-au-stsl/rule/StslComponent",
     "taxkit/rules-au-stsl/rule/PayWithholdingsLedgerWithStsl",
   ]
 `);
  });

  it.effect("pins the StslComponent descriptor and official parameters", () =>
    Effect.gen(function* () {
      const snapshot = yield* rulePackSnapshot(AuStslRuleDescriptors).pipe(
        Effect.flatMap((snapshots) =>
          EffectFunction.pipe(
            snapshots,
            EffectArray.findFirst(
              (value) => value.id === "taxkit/rules-au-stsl/rule/StslComponent"
            ),
            Effect.fromOption
          )
        )
      );
      const { parameters: _parameters, ...metadata } = snapshot;
      expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-stsl/rule/StslComponent",
     "provides": [
       "taxkit/rules-au-stsl/fact/StslComponent",
     ],
     "requires": [
       "taxkit/rules-au-pay/fact/TaxablePay",
       "taxkit/rules-au-stsl/fact/StslDebt",
       "taxkit/rules-au-pay/fact/TaxFreeThresholdClaimed",
     ],
     "sources": [
       "ato-publication",
     ],
   }
 `);
      expect(snapshot.parameters).toMatchInlineSnapshot(`
   [
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
     {
       "effectivePeriod": {
         "from": "2025-09-24",
         "toExclusive": "2026-07-01",
       },
       "id": "taxkit/rules-au-stsl/parameter/AtoStslNoThresholdTable",
       "source": "ato-publication",
       "sourceArtifact": {
         "checksum": "sha256:d8881e3f6deb022166ff371ebc61349486c89e31a72e92dc4fa1e149202e1426",
         "retrievedOn": "2026-10-22",
         "rowCount": 4,
       },
     },
   ]
 `);
    })
  );

  it.effect(
    "pins the PayWithholdingsLedgerWithStsl descriptor and official parameters",
    () =>
      Effect.gen(function* () {
        const snapshot = yield* rulePackSnapshot(AuStslRuleDescriptors).pipe(
          Effect.flatMap((snapshots) =>
            EffectFunction.pipe(
              snapshots,
              EffectArray.findFirst(
                (value) =>
                  value.id ===
                  "taxkit/rules-au-stsl/rule/PayWithholdingsLedgerWithStsl"
              ),
              Effect.fromOption
            )
          )
        );
        const { parameters: _parameters, ...metadata } = snapshot;
        expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-stsl/rule/PayWithholdingsLedgerWithStsl",
     "provides": [
       "taxkit/rules-au-pay/fact/PayWithholdingsLedger",
     ],
     "requires": [
       "taxkit/rules-au-pay/fact/GrossPay",
       "taxkit/rules-au-pay/fact/PaygWithholdingComponent",
       "taxkit/rules-au-stsl/fact/StslComponent",
     ],
     "sources": [],
   }
 `);
        expect(snapshot.parameters).toMatchInlineSnapshot(`
[]
`);
      })
  );
});
