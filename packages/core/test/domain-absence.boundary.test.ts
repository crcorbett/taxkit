import { describe, expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Context,
  Effect,
  Layer,
  Option,
  Record,
  Schema,
  Struct,
} from "effect";

import { CalculationError } from "../src/errors/calculation-error.js";
import {
  FactQuestion,
  FactQuestionId,
  makeFactDescriptor,
} from "../src/facts/descriptor.js";
import { validateRuleGraph } from "../src/graph/rule-graph.js";
import { makeParameterDescriptor } from "../src/parameters/descriptor.js";
import { dateInterval, IsoDate } from "../src/primitives/date.js";
import { makeRuleDescriptor } from "../src/rules/descriptor.js";
import {
  RuleId,
  SourceArtifact,
  SourceChecksum,
  SourceExtract,
  SourceRef,
  TraceNode,
} from "../src/trace/node.js";

class FixtureFact extends Context.Service<FixtureFact, number>()(
  "test/domain-absence/Fact"
) {}
class FixtureParameter extends Context.Service<FixtureParameter, number>()(
  "test/domain-absence/Parameter"
) {}
const source = SourceRef.make({
  kind: "internal-validation",
  reference: "test",
  title: "Test source",
});
const question = new FactQuestion({
  id: FactQuestionId.make("fixture/absence"),
  inputKind: "money",
  prompt: "Enter an amount",
});
const factInput = {
  authority: "derived",
  id: "fixture/fact",
  schema: Schema.Number,
  tag: FixtureFact,
  title: "Fixture fact",
} as const;
const fact = makeFactDescriptor(factInput);
const ruleInput = {
  id: RuleId.make("fixture/rule"),
  layer: Layer.succeed(FixtureFact)(1),
  provides: [fact],
  requires: [],
  sourcePolicy: "not-required",
  sources: [],
  title: "Fixture rule",
} as const;
const traceInput = {
  children: [],
  inputs: { cents: 165_400 },
  result: 165_400,
  ruleId: RuleId.make("fixture/absence"),
  sources: [],
  title: "Compatibility fixture",
} as const;
describe("domain absence representations", () => {
  it.effect(
    "preserves trace key identity and historical bytes in all three forms",
    () =>
      Effect.gen(function* () {
        const samples = [
          {
            bytes:
              '{"_tag":"TraceNode","children":[],"inputs":{"cents":165400},"result":165400,"ruleId":"fixture/absence","sources":[],"title":"Compatibility fixture"}',
            own: false,
            value: TraceNode.make(traceInput),
          },
          {
            bytes:
              '{"_tag":"TraceNode","children":[],"inputs":{"cents":165400},"result":165400,"ruleId":"fixture/absence","sources":[],"title":"Compatibility fixture"}',
            own: true,
            value: TraceNode.make({
              ...traceInput,
              formula: Option.some(Option.none()),
              rounding: Option.some(Option.none()),
            }),
          },
          {
            bytes:
              '{"_tag":"TraceNode","children":[],"formula":"Checked text","inputs":{"cents":165400},"result":165400,"rounding":"round-to-nearest-cent","ruleId":"fixture/absence","sources":[],"title":"Compatibility fixture"}',
            own: true,
            value: TraceNode.make({
              ...traceInput,
              formula: Option.some(Option.some("Checked text")),
              rounding: Option.some(Option.some("round-to-nearest-cent")),
            }),
          },
        ];
        yield* EffectFunction.pipe(
          samples,
          Effect.forEach((sample) =>
            Effect.gen(function* () {
              const encoded = yield* Schema.encodeEffect(TraceNode)(
                sample.value
              );
              expect(
                yield* Schema.encodeEffect(Schema.fromJsonString(TraceNode))(
                  sample.value
                )
              ).toBe(sample.bytes);
              EffectFunction.pipe(
                Object.hasOwn(encoded, "formula"),
                (actual) => {
                  expect(actual).toBe(sample.own);
                }
              );
              EffectFunction.pipe(
                Object.hasOwn(encoded, "rounding"),
                (actual) => {
                  expect(actual).toBe(sample.own);
                }
              );
              const restored = yield* Schema.decodeEffect(TraceNode)(encoded);
              expect({
                restoredFormula: restored.formula,
                restoredRounding: restored.rounding,
              }).toStrictEqual({
                restoredFormula: sample.value.formula,
                restoredRounding: sample.value.rounding,
              });
              const again = yield* Schema.encodeEffect(TraceNode)(restored);
              expect(
                yield* Schema.encodeEffect(Schema.fromJsonString(TraceNode))(
                  restored
                )
              ).toBe(sample.bytes);
              EffectFunction.pipe(Object.hasOwn(again, "formula"), (actual) => {
                expect(actual).toBe(sample.own);
              });
              EffectFunction.pipe(
                Object.hasOwn(again, "rounding"),
                (actual) => {
                  expect(actual).toBe(sample.own);
                }
              );
            })
          )
        );
      })
  );
  it.effect(
    "preserves question help key identity and historical bytes in all three forms",
    () =>
      Effect.gen(function* () {
        const samples = [
          {
            bytes:
              '{"_tag":"FactQuestion","id":"fixture/absence","inputKind":"money","prompt":"Enter an amount"}',
            own: false,
            value: question,
          },
          {
            bytes:
              '{"_tag":"FactQuestion","id":"fixture/absence","inputKind":"money","prompt":"Enter an amount"}',
            own: true,
            value: new FactQuestion({
              ...Struct.pick(question, Struct.keys(FactQuestion.fields)),
              helpText: Option.some(Option.none()),
            }),
          },
          {
            bytes:
              '{"_tag":"FactQuestion","helpText":"Checked text","id":"fixture/absence","inputKind":"money","prompt":"Enter an amount"}',
            own: true,
            value: new FactQuestion({
              ...Struct.pick(question, Struct.keys(FactQuestion.fields)),
              helpText: Option.some(Option.some("Checked text")),
            }),
          },
        ];
        yield* EffectFunction.pipe(
          samples,
          Effect.forEach((sample) =>
            Effect.gen(function* () {
              const encoded = yield* Schema.encodeEffect(FactQuestion)(
                sample.value
              );
              expect(
                yield* Schema.encodeEffect(Schema.fromJsonString(FactQuestion))(
                  sample.value
                )
              ).toBe(sample.bytes);
              EffectFunction.pipe(
                Object.hasOwn(encoded, "helpText"),
                (actual) => {
                  expect(actual).toBe(sample.own);
                }
              );
              const restored =
                yield* Schema.decodeEffect(FactQuestion)(encoded);
              expect(restored.helpText).toStrictEqual(sample.value.helpText);
              const again = yield* Schema.encodeEffect(FactQuestion)(restored);
              expect(
                yield* Schema.encodeEffect(Schema.fromJsonString(FactQuestion))(
                  restored
                )
              ).toBe(sample.bytes);
              EffectFunction.pipe(
                Object.hasOwn(again, "helpText"),
                (actual) => {
                  expect(actual).toBe(sample.own);
                }
              );
            })
          )
        );
      })
  );

  it("keeps checked question identity and collapses only historically absent descriptor inputs", () => {
    expect({
      factQuestion: fact.question,
      optionalQuestion: makeFactDescriptor({
        ...factInput,
        question: undefined,
      }).question,
      question: makeFactDescriptor({
        ...factInput,
        question,
      }).question,
    }).toStrictEqual({
      factQuestion: Option.none(),
      optionalQuestion: Option.none(),
      question: Option.some(question),
    });
    expect(makeFactDescriptor({ ...factInput, question }).schema).toBe(
      Schema.Number
    );
    expect(makeFactDescriptor({ ...factInput, question }).tag).toBe(
      FixtureFact
    );
  });
  it.effect("preserves checked period and artifact values", () =>
    Effect.gen(function* () {
      const period = yield* dateInterval({ from: "2025-07-01" });
      const artifact = new SourceArtifact({
        checksum: SourceChecksum.make("sha256:test"),
        documentVersion: "test",
        extract: new SourceExtract({ rowContract: "TestRow[]", rowCount: 1 }),
        retrievedOn: IsoDate.make("2024-02-29"),
        source,
      });
      const input = {
        effectivePeriod: period,
        id: "fixture/parameter",
        schema: Schema.Number,
        source,
        tag: FixtureParameter,
        title: "Fixture parameter",
      };
      expect({
        sourceArtifact: makeParameterDescriptor(input).sourceArtifact,
        optionalSourceArtifact: makeParameterDescriptor({
          ...input,
          sourceArtifact: undefined,
        }).sourceArtifact,
      }).toStrictEqual({
        sourceArtifact: Option.none(),
        optionalSourceArtifact: Option.none(),
      });
      const provided = makeParameterDescriptor({
        ...input,
        sourceArtifact: artifact,
      });
      expect({
        providedSourceArtifact: provided.sourceArtifact,
        providedEffectivePeriod: provided.effectivePeriod,
      }).toStrictEqual({
        providedSourceArtifact: Option.some(artifact),
        providedEffectivePeriod: period,
      });
      expect(provided.tag).toBe(FixtureParameter);
    })
  );

  it("keeps explicit false and total empty parameter collections", () => {
    const missing = makeRuleDescriptor(ruleInput);
    const absent = makeRuleDescriptor({
      ...ruleInput,
      allowDuplicateProvides: undefined,
    });
    const denied = makeRuleDescriptor({
      ...ruleInput,
      allowDuplicateProvides: false,
    });
    const allowed = makeRuleDescriptor({
      ...ruleInput,
      allowDuplicateProvides: true,
    });
    expect({
      missingAllowDuplicateProvides: missing.allowDuplicateProvides,
      absentAllowDuplicateProvides: absent.allowDuplicateProvides,
      deniedAllowDuplicateProvides: denied.allowDuplicateProvides,
      allowedAllowDuplicateProvides: allowed.allowDuplicateProvides,
      missingParameters: missing.parameters,
      absentParameters: absent.parameters,
    }).toStrictEqual({
      missingAllowDuplicateProvides: Option.none(),
      absentAllowDuplicateProvides: Option.none(),
      deniedAllowDuplicateProvides: Option.some(false),
      allowedAllowDuplicateProvides: Option.some(true),
      missingParameters: [],
      absentParameters: [],
    });
    expect(missing.layer).toBe(ruleInput.layer);
  });

  it("reports multiple unpermitted providers and preserves the explicit permission", () => {
    const duplicate = makeRuleDescriptor({
      ...ruleInput,
      id: RuleId.make("fixture/other"),
    });
    const missing = makeRuleDescriptor(ruleInput);
    const denied = makeRuleDescriptor({
      ...ruleInput,
      allowDuplicateProvides: false,
    });
    const allowed = makeRuleDescriptor({
      ...ruleInput,
      allowDuplicateProvides: true,
    });
    const otherAllowed = makeRuleDescriptor({
      ...ruleInput,
      allowDuplicateProvides: true,
      id: RuleId.make("fixture/other"),
    });
    EffectFunction.pipe(
      validateRuleGraph({ inputFacts: [], rules: [missing, duplicate] }),
      Array.map((issue) => issue.kind),
      (actual) => {
        expect(actual).toContain("duplicate-provider");
      }
    );
    EffectFunction.pipe(
      validateRuleGraph({ inputFacts: [], rules: [denied, duplicate] }),
      Array.map((issue) => issue.kind),
      (actual) => {
        expect(actual).toContain("duplicate-provider");
      }
    );
    EffectFunction.pipe(
      validateRuleGraph({ inputFacts: [], rules: [denied, otherAllowed] }),
      (actual) => {
        expect(actual).toStrictEqual([]);
      }
    );
    EffectFunction.pipe(
      validateRuleGraph({ inputFacts: [], rules: [allowed, otherAllowed] }),
      (actual) => {
        expect(actual).toStrictEqual([]);
      }
    );
  });
});
describe("calculation error diagnostic absence", () => {
  it.effect(
    "preserves original missing, undefined, null and opaque-value forms",
    () =>
      Effect.gen(function* () {
        const forms = [
          {
            bytes:
              '{"_tag":"CalculationError","message":"Fixed fixture failure"}',
            cause: Option.none(),
            ownCause: false,
          },
          {
            bytes:
              '{"_tag":"CalculationError","message":"Fixed fixture failure"}',
            cause: Option.some(Option.none()),
            ownCause: true,
          },
          {
            bytes:
              '{"_tag":"CalculationError","cause":null,"message":"Fixed fixture failure"}',
            cause: Option.some(Option.some(null)),
            ownCause: true,
          },
          {
            bytes:
              '{"_tag":"CalculationError","cause":{"fixture":"safe-representative"},"message":"Fixed fixture failure"}',
            cause: Option.some(Option.some({ fixture: "safe-representative" })),
            ownCause: true,
          },
        ];
        yield* EffectFunction.pipe(
          forms,
          Effect.forEach((form) =>
            Effect.gen(function* () {
              const error = new CalculationError({
                cause: form.cause,
                message: "Fixed fixture failure",
              });
              const encoded =
                yield* Schema.encodeEffect(CalculationError)(error);
              const decoded =
                yield* Schema.decodeEffect(CalculationError)(encoded);
              expect(
                yield* Schema.encodeEffect(
                  Schema.fromJsonString(CalculationError)
                )(error)
              ).toBe(form.bytes);
              EffectFunction.pipe(
                Record.has<string, unknown>(encoded, "cause"),
                (actual) => {
                  expect(actual).toBe(form.ownCause);
                }
              );
              expect({
                decodedCause: decoded.cause,
                encodedError:
                  yield* Schema.encodeEffect(CalculationError)(decoded),
              }).toStrictEqual({
                decodedCause: form.cause,
                encodedError: encoded,
              });
            })
          )
        );
        expect(
          new CalculationError({ message: "Fixed fixture failure" }).cause
        ).toStrictEqual(Option.none());
      })
  );
});
