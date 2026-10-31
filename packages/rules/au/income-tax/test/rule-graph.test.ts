import { describe, expect, it } from "@effect/vitest";
import { validateRuleGraph } from "@taxkit/core/graph";
import { ParameterEffectivePeriod } from "@taxkit/core/parameters";
import type { AnyRuleDescriptor } from "@taxkit/core/rules";
import { AnnualTaxableIncomeDescriptor } from "@taxkit/rules-au-income-tax/facts";
import { AuAnnualTaxRuleDescriptors } from "@taxkit/rules-au-income-tax/rule-pack";
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
describe("AU annual tax rule graph", () => {
  it("validates the annual tax rule graph", () => {
    const issues = validateRuleGraph({
      inputFacts: [AnnualTaxableIncomeDescriptor],
      rules: AuAnnualTaxRuleDescriptors,
    });
    expect(issues).toStrictEqual([]);
  });

  it("surfaces caller question metadata on annual input facts", () => {
    EffectFunction.pipe(
      AnnualTaxableIncomeDescriptor.question.pipe(
        Option.map((question) => question.inputKind),
        Option.getOrUndefined
      ),
      (actual) => {
        expect(actual).toBe("money");
      }
    );
  });

  it("pins the published rule inventory", () => {
    const ids = EffectFunction.pipe(
      AuAnnualTaxRuleDescriptors,
      EffectArray.map((rule) => rule.id)
    );
    expect(ids).toMatchInlineSnapshot(`
   [
     "taxkit/rules-au-income-tax/rule/IncomeTax",
     "taxkit/rules-au-income-tax/rule/Lito",
     "taxkit/rules-au-income-tax/rule/MedicareLevy",
     "taxkit/rules-au-income-tax/rule/AnnualTaxLedger",
   ]
 `);
  });

  it.effect("pins the IncomeTax descriptor and official parameters", () =>
    Effect.gen(function* () {
      const snapshot = yield* rulePackSnapshot(AuAnnualTaxRuleDescriptors).pipe(
        Effect.flatMap((snapshots) =>
          EffectFunction.pipe(
            snapshots,
            EffectArray.findFirst(
              (value) =>
                value.id === "taxkit/rules-au-income-tax/rule/IncomeTax"
            ),
            Effect.fromOption
          )
        )
      );
      const { parameters: _parameters, ...metadata } = snapshot;
      expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-income-tax/rule/IncomeTax",
     "provides": [
       "taxkit/rules-au-income-tax/fact/IncomeTaxComponent",
     ],
     "requires": [
       "taxkit/rules-au-income-tax/fact/AnnualTaxableIncome",
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
   ]
 `);
    })
  );

  it.effect("pins the Lito descriptor and official parameters", () =>
    Effect.gen(function* () {
      const snapshot = yield* rulePackSnapshot(AuAnnualTaxRuleDescriptors).pipe(
        Effect.flatMap((snapshots) =>
          EffectFunction.pipe(
            snapshots,
            EffectArray.findFirst(
              (value) => value.id === "taxkit/rules-au-income-tax/rule/Lito"
            ),
            Effect.fromOption
          )
        )
      );
      const { parameters: _parameters, ...metadata } = snapshot;
      expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-income-tax/rule/Lito",
     "provides": [
       "taxkit/rules-au-income-tax/fact/LitoComponent",
     ],
     "requires": [
       "taxkit/rules-au-income-tax/fact/AnnualTaxableIncome",
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
   ]
 `);
    })
  );

  it.effect("pins the MedicareLevy descriptor and official parameters", () =>
    Effect.gen(function* () {
      const snapshot = yield* rulePackSnapshot(AuAnnualTaxRuleDescriptors).pipe(
        Effect.flatMap((snapshots) =>
          EffectFunction.pipe(
            snapshots,
            EffectArray.findFirst(
              (value) =>
                value.id === "taxkit/rules-au-income-tax/rule/MedicareLevy"
            ),
            Effect.fromOption
          )
        )
      );
      const { parameters: _parameters, ...metadata } = snapshot;
      expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-income-tax/rule/MedicareLevy",
     "provides": [
       "taxkit/rules-au-income-tax/fact/MedicareLevyComponent",
     ],
     "requires": [
       "taxkit/rules-au-income-tax/fact/AnnualTaxableIncome",
     ],
     "sources": [
       "legislation",
     ],
   }
 `);
      expect(snapshot.parameters).toMatchInlineSnapshot(`
   [
     {
       "effectivePeriod": {
         "from": "2025-07-01",
         "toExclusive": "2026-07-01",
       },
       "id": "taxkit/rules-au-income-tax/parameter/AtoMedicareLevyTable",
       "source": "legislation",
       "sourceArtifact": {
         "checksum": "sha256:8298b458c6a579ffad9305acf5b4604255c928313654eea58e495164e4478b67",
         "retrievedOn": "2026-10-08",
         "rowCount": 1,
       },
     },
   ]
 `);
    })
  );

  it.effect("pins the AnnualTaxLedger descriptor and official parameters", () =>
    Effect.gen(function* () {
      const snapshot = yield* rulePackSnapshot(AuAnnualTaxRuleDescriptors).pipe(
        Effect.flatMap((snapshots) =>
          EffectFunction.pipe(
            snapshots,
            EffectArray.findFirst(
              (value) =>
                value.id === "taxkit/rules-au-income-tax/rule/AnnualTaxLedger"
            ),
            Effect.fromOption
          )
        )
      );
      const { parameters: _parameters, ...metadata } = snapshot;
      expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-income-tax/rule/AnnualTaxLedger",
     "provides": [
       "taxkit/rules-au-income-tax/fact/AnnualTaxLedger",
     ],
     "requires": [
       "taxkit/rules-au-income-tax/fact/IncomeTaxComponent",
       "taxkit/rules-au-income-tax/fact/LitoComponent",
       "taxkit/rules-au-income-tax/fact/MedicareLevyComponent",
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
