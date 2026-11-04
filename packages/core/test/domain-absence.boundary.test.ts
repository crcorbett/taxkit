import { describe, expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Array,
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  Struct,
} from "effect";

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
  title: "Checked trace fixture",
} as const;
describe("domain absence representations", () => {
  it.effect("round-trips present and absent trace and question values", () =>
    Effect.gen(function* () {
      const emptyTrace = TraceNode.make(traceInput);
      const fullTrace = TraceNode.make({
        ...traceInput,
        formula: Option.some("Checked text"),
        rounding: Option.some("round-to-nearest-cent"),
      });
      yield* Effect.forEach([emptyTrace, fullTrace], (value) =>
        Effect.gen(function* () {
          const encoded = yield* Schema.encodeEffect(TraceNode)(value);
          const restored = yield* Schema.decodeEffect(TraceNode)(encoded);
          expect(restored.formula).toStrictEqual(value.formula);
          expect(restored.rounding).toStrictEqual(value.rounding);
        })
      );
      yield* Effect.forEach(
        [
          question,
          new FactQuestion({
            ...Struct.pick(question, Struct.keys(FactQuestion.fields)),
            helpText: Option.some("Checked text"),
          }),
        ],
        (value) =>
          Effect.gen(function* () {
            const encoded = yield* Schema.encodeEffect(FactQuestion)(value);
            const restored = yield* Schema.decodeEffect(FactQuestion)(encoded);
            expect(restored.helpText).toStrictEqual(value.helpText);
          })
      );
    })
  );

  it("keeps checked question identity and uses one Option for absent descriptor inputs", () => {
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
