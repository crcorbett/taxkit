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
import {
  Function as EffectFunction,
  Option,
  Array as EffectArray,
  Effect,
  Schema,
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
describe("AU take-home pay rule graph", () => {
  it("validates the base rule pack graph", () => {
    const issues = validateRuleGraph({
      inputFacts: [GrossPayDescriptor, TaxFreeThresholdClaimedDescriptor],
      rules: AuTakeHomePayRuleDescriptors,
    });
    expect(issues).toStrictEqual([]);
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
    expect(issues).toStrictEqual([]);
  });

  it("pins the base published rule inventory", () => {
    const ids = EffectFunction.pipe(
      AuTakeHomePayRuleDescriptors,
      EffectArray.map((rule) => rule.id)
    );
    expect(ids).toMatchInlineSnapshot(`
   [
     "taxkit/rules-au-pay/rule/TaxablePay",
     "taxkit/rules-au-pay/rule/PaygWithholding",
     "taxkit/rules-au-pay/rule/PayWithholdingsLedger",
     "taxkit/rules-au-pay/rule/NetPay",
   ]
 `);
  });

  it.effect("pins the base TaxablePay descriptor and official parameters", () =>
    Effect.gen(function* () {
      const snapshot = yield* rulePackSnapshot(
        AuTakeHomePayRuleDescriptors
      ).pipe(
        Effect.flatMap((snapshots) =>
          EffectFunction.pipe(
            snapshots,
            EffectArray.findFirst(
              (value) => value.id === "taxkit/rules-au-pay/rule/TaxablePay"
            ),
            Effect.fromOption
          )
        )
      );
      const { parameters: _parameters, ...metadata } = snapshot;
      expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-pay/rule/TaxablePay",
     "provides": [
       "taxkit/rules-au-pay/fact/TaxablePay",
     ],
     "requires": [
       "taxkit/rules-au-pay/fact/GrossPay",
     ],
     "sources": [],
   }
 `);
      expect(snapshot.parameters).toMatchInlineSnapshot(`
[]
`);
    })
  );

  it.effect(
    "pins the base PaygWithholding descriptor and official parameters",
    () =>
      Effect.gen(function* () {
        const snapshot = yield* rulePackSnapshot(
          AuTakeHomePayRuleDescriptors
        ).pipe(
          Effect.flatMap((snapshots) =>
            EffectFunction.pipe(
              snapshots,
              EffectArray.findFirst(
                (value) =>
                  value.id === "taxkit/rules-au-pay/rule/PaygWithholding"
              ),
              Effect.fromOption
            )
          )
        );
        const { parameters: _parameters, ...metadata } = snapshot;
        expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-pay/rule/PaygWithholding",
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
   }
 `);
        expect(snapshot.parameters).toMatchInlineSnapshot(`
   [
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
   ]
 `);
      })
  );

  it.effect(
    "pins the base PayWithholdingsLedger descriptor and official parameters",
    () =>
      Effect.gen(function* () {
        const snapshot = yield* rulePackSnapshot(
          AuTakeHomePayRuleDescriptors
        ).pipe(
          Effect.flatMap((snapshots) =>
            EffectFunction.pipe(
              snapshots,
              EffectArray.findFirst(
                (value) =>
                  value.id === "taxkit/rules-au-pay/rule/PayWithholdingsLedger"
              ),
              Effect.fromOption
            )
          )
        );
        const { parameters: _parameters, ...metadata } = snapshot;
        expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-pay/rule/PayWithholdingsLedger",
     "provides": [
       "taxkit/rules-au-pay/fact/PayWithholdingsLedger",
     ],
     "requires": [
       "taxkit/rules-au-pay/fact/GrossPay",
       "taxkit/rules-au-pay/fact/PaygWithholdingComponent",
     ],
     "sources": [],
   }
 `);
        expect(snapshot.parameters).toMatchInlineSnapshot(`
[]
`);
      })
  );

  it.effect("pins the base NetPay descriptor and official parameters", () =>
    Effect.gen(function* () {
      const snapshot = yield* rulePackSnapshot(
        AuTakeHomePayRuleDescriptors
      ).pipe(
        Effect.flatMap((snapshots) =>
          EffectFunction.pipe(
            snapshots,
            EffectArray.findFirst(
              (value) => value.id === "taxkit/rules-au-pay/rule/NetPay"
            ),
            Effect.fromOption
          )
        )
      );
      const { parameters: _parameters, ...metadata } = snapshot;
      expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-pay/rule/NetPay",
     "provides": [
       "taxkit/rules-au-pay/fact/NetPay",
     ],
     "requires": [
       "taxkit/rules-au-pay/fact/GrossPay",
       "taxkit/rules-au-pay/fact/PayWithholdingsLedger",
     ],
     "sources": [],
   }
 `);
      expect(snapshot.parameters).toMatchInlineSnapshot(`
[]
`);
    })
  );

  it("pins the withSacrifice published rule inventory", () => {
    const ids = EffectFunction.pipe(
      AuTakeHomePayWithSacrificeRuleDescriptors,
      EffectArray.map((rule) => rule.id)
    );
    expect(ids).toMatchInlineSnapshot(`
   [
     "taxkit/rules-au-pay/rule/TaxablePayWithSacrifice",
     "taxkit/rules-au-pay/rule/PaygWithholding",
     "taxkit/rules-au-pay/rule/PayWithholdingsLedger",
     "taxkit/rules-au-pay/rule/NetPayWithSacrifice",
   ]
 `);
  });

  it.effect(
    "pins the withSacrifice TaxablePayWithSacrifice descriptor and official parameters",
    () =>
      Effect.gen(function* () {
        const snapshot = yield* rulePackSnapshot(
          AuTakeHomePayWithSacrificeRuleDescriptors
        ).pipe(
          Effect.flatMap((snapshots) =>
            EffectFunction.pipe(
              snapshots,
              EffectArray.findFirst(
                (value) =>
                  value.id ===
                  "taxkit/rules-au-pay/rule/TaxablePayWithSacrifice"
              ),
              Effect.fromOption
            )
          )
        );
        const { parameters: _parameters, ...metadata } = snapshot;
        expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-pay/rule/TaxablePayWithSacrifice",
     "provides": [
       "taxkit/rules-au-pay/fact/TaxablePay",
     ],
     "requires": [
       "taxkit/rules-au-pay/fact/GrossPay",
       "taxkit/rules-au-pay/fact/SalarySacrifice",
     ],
     "sources": [],
   }
 `);
        expect(snapshot.parameters).toMatchInlineSnapshot(`
[]
`);
      })
  );

  it.effect(
    "pins the withSacrifice PaygWithholding descriptor and official parameters",
    () =>
      Effect.gen(function* () {
        const snapshot = yield* rulePackSnapshot(
          AuTakeHomePayWithSacrificeRuleDescriptors
        ).pipe(
          Effect.flatMap((snapshots) =>
            EffectFunction.pipe(
              snapshots,
              EffectArray.findFirst(
                (value) =>
                  value.id === "taxkit/rules-au-pay/rule/PaygWithholding"
              ),
              Effect.fromOption
            )
          )
        );
        const { parameters: _parameters, ...metadata } = snapshot;
        expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-pay/rule/PaygWithholding",
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
   }
 `);
        expect(snapshot.parameters).toMatchInlineSnapshot(`
   [
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
   ]
 `);
      })
  );

  it.effect(
    "pins the withSacrifice PayWithholdingsLedger descriptor and official parameters",
    () =>
      Effect.gen(function* () {
        const snapshot = yield* rulePackSnapshot(
          AuTakeHomePayWithSacrificeRuleDescriptors
        ).pipe(
          Effect.flatMap((snapshots) =>
            EffectFunction.pipe(
              snapshots,
              EffectArray.findFirst(
                (value) =>
                  value.id === "taxkit/rules-au-pay/rule/PayWithholdingsLedger"
              ),
              Effect.fromOption
            )
          )
        );
        const { parameters: _parameters, ...metadata } = snapshot;
        expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-pay/rule/PayWithholdingsLedger",
     "provides": [
       "taxkit/rules-au-pay/fact/PayWithholdingsLedger",
     ],
     "requires": [
       "taxkit/rules-au-pay/fact/GrossPay",
       "taxkit/rules-au-pay/fact/PaygWithholdingComponent",
     ],
     "sources": [],
   }
 `);
        expect(snapshot.parameters).toMatchInlineSnapshot(`
[]
`);
      })
  );

  it.effect(
    "pins the withSacrifice NetPayWithSacrifice descriptor and official parameters",
    () =>
      Effect.gen(function* () {
        const snapshot = yield* rulePackSnapshot(
          AuTakeHomePayWithSacrificeRuleDescriptors
        ).pipe(
          Effect.flatMap((snapshots) =>
            EffectFunction.pipe(
              snapshots,
              EffectArray.findFirst(
                (value) =>
                  value.id === "taxkit/rules-au-pay/rule/NetPayWithSacrifice"
              ),
              Effect.fromOption
            )
          )
        );
        const { parameters: _parameters, ...metadata } = snapshot;
        expect(metadata).toMatchInlineSnapshot(`
   {
     "id": "taxkit/rules-au-pay/rule/NetPayWithSacrifice",
     "provides": [
       "taxkit/rules-au-pay/fact/NetPay",
     ],
     "requires": [
       "taxkit/rules-au-pay/fact/GrossPay",
       "taxkit/rules-au-pay/fact/PayWithholdingsLedger",
       "taxkit/rules-au-pay/fact/SalarySacrifice",
     ],
     "sources": [],
   }
 `);
        expect(snapshot.parameters).toMatchInlineSnapshot(`
[]
`);
      })
  );

  it("reports missing input facts", () => {
    const issues = validateRuleGraph({
      inputFacts: [GrossPayDescriptor],
      rules: AuTakeHomePayRuleDescriptors,
    });
    EffectFunction.pipe(
      EffectFunction.pipe(
        issues,
        EffectArray.map((issue) => issue.kind)
      ),
      (actual) => {
        expect(actual).toContain("missing-provider");
      }
    );
  });

  it("surfaces caller question metadata on input fact descriptors", () => {
    EffectFunction.pipe(
      GrossPayDescriptor.question.pipe(
        Option.map((question) => question.inputKind),
        Option.getOrUndefined
      ),
      (actual) => {
        expect(actual).toBe("money");
      }
    );
    EffectFunction.pipe(
      TaxFreeThresholdClaimedDescriptor.question.pipe(
        Option.map((question) => question.inputKind),
        Option.getOrUndefined
      ),
      (actual) => {
        expect(actual).toBe("boolean");
      }
    );
    EffectFunction.pipe(
      SalarySacrificeDescriptor.question.pipe(
        Option.map((question) => question.inputKind),
        Option.getOrUndefined
      ),
      (actual) => {
        expect(actual).toBe("money");
      }
    );
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
    EffectFunction.pipe(
      EffectFunction.pipe(
        issues,
        EffectArray.map((issue) => issue.kind)
      ),
      (actual) => {
        expect(actual).toContain("parameter-source-mismatch");
      }
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
    EffectFunction.pipe(
      EffectFunction.pipe(
        issues,
        EffectArray.map((issue) => issue.kind)
      ),
      (actual) => {
        expect(actual).toContain("parameter-overlap");
      }
    );
  });
});
