import { describe, expect, it } from "@effect/vitest";
import { Array, Context, Effect, Layer, Option, Record, Schema } from "effect";

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
        yield* Effect.forEach(samples, (sample) =>
          Effect.gen(function* () {
            const encoded = yield* Schema.encodeEffect(TraceNode)(sample.value);
            expect(
              yield* Schema.encodeEffect(Schema.fromJsonString(TraceNode))(
                sample.value
              )
            ).toBe(sample.bytes);
            expect(Object.hasOwn(encoded, "formula")).toBe(sample.own);
            expect(Object.hasOwn(encoded, "rounding")).toBe(sample.own);
            const restored = yield* Schema.decodeEffect(TraceNode)(encoded);
            expect(restored.formula).toEqual(sample.value.formula);
            expect(restored.rounding).toEqual(sample.value.rounding);
            const again = yield* Schema.encodeEffect(TraceNode)(restored);
            expect(
              yield* Schema.encodeEffect(Schema.fromJsonString(TraceNode))(
                restored
              )
            ).toBe(sample.bytes);
            expect(Object.hasOwn(again, "formula")).toBe(sample.own);
            expect(Object.hasOwn(again, "rounding")).toBe(sample.own);
          })
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
              ...question,
              helpText: Option.some(Option.none()),
            }),
          },
          {
            bytes:
              '{"_tag":"FactQuestion","helpText":"Checked text","id":"fixture/absence","inputKind":"money","prompt":"Enter an amount"}',
            own: true,
            value: new FactQuestion({
              ...question,
              helpText: Option.some(Option.some("Checked text")),
            }),
          },
        ];
        yield* Effect.forEach(samples, (sample) =>
          Effect.gen(function* () {
            const encoded = yield* Schema.encodeEffect(FactQuestion)(
              sample.value
            );
            expect(
              yield* Schema.encodeEffect(Schema.fromJsonString(FactQuestion))(
                sample.value
              )
            ).toBe(sample.bytes);
            expect(Object.hasOwn(encoded, "helpText")).toBe(sample.own);
            const restored = yield* Schema.decodeEffect(FactQuestion)(encoded);
            expect(restored.helpText).toEqual(sample.value.helpText);
            const again = yield* Schema.encodeEffect(FactQuestion)(restored);
            expect(
              yield* Schema.encodeEffect(Schema.fromJsonString(FactQuestion))(
                restored
              )
            ).toBe(sample.bytes);
            expect(Object.hasOwn(again, "helpText")).toBe(sample.own);
          })
        );
      })
  );
  it("keeps checked question identity and collapses only historically absent descriptor inputs", () => {
    expect(fact.question).toEqual(Option.none());
    expect(
      makeFactDescriptor({ ...factInput, question: undefined }).question
    ).toEqual(Option.none());
    expect(makeFactDescriptor({ ...factInput, question }).question).toEqual(
      Option.some(question)
    );
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
      expect(makeParameterDescriptor(input).sourceArtifact).toEqual(
        Option.none()
      );
      expect(
        makeParameterDescriptor({ ...input, sourceArtifact: undefined })
          .sourceArtifact
      ).toEqual(Option.none());
      const provided = makeParameterDescriptor({
        ...input,
        sourceArtifact: artifact,
      });
      expect(provided.sourceArtifact).toEqual(Option.some(artifact));
      expect(provided.effectivePeriod).toEqual(period);
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
    expect(missing.allowDuplicateProvides).toEqual(Option.none());
    expect(absent.allowDuplicateProvides).toEqual(Option.none());
    expect(denied.allowDuplicateProvides).toEqual(Option.some(false));
    expect(allowed.allowDuplicateProvides).toEqual(Option.some(true));
    expect(missing.parameters).toEqual([]);
    expect(absent.parameters).toEqual([]);
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
    expect(
      Array.map(
        validateRuleGraph({ inputFacts: [], rules: [missing, duplicate] }),
        (issue) => issue.kind
      )
    ).toContain("duplicate-provider");
    expect(
      Array.map(
        validateRuleGraph({ inputFacts: [], rules: [denied, duplicate] }),
        (issue) => issue.kind
      )
    ).toContain("duplicate-provider");
    expect(
      validateRuleGraph({ inputFacts: [], rules: [denied, otherAllowed] })
    ).toEqual([]);
    expect(
      validateRuleGraph({ inputFacts: [], rules: [allowed, otherAllowed] })
    ).toEqual([]);
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
        yield* Effect.forEach(forms, (form) =>
          Effect.gen(function* () {
            const error = new CalculationError({
              cause: form.cause,
              message: "Fixed fixture failure",
            });
            const encoded = yield* Schema.encodeEffect(CalculationError)(error);
            const decoded =
              yield* Schema.decodeEffect(CalculationError)(encoded);
            expect(
              yield* Schema.encodeEffect(
                Schema.fromJsonString(CalculationError)
              )(error)
            ).toBe(form.bytes);
            expect(Record.has<string, unknown>(encoded, "cause")).toBe(
              form.ownCause
            );
            expect(decoded.cause).toEqual(form.cause);
            expect(
              yield* Schema.encodeEffect(CalculationError)(decoded)
            ).toEqual(encoded);
          })
        );
        expect(
          new CalculationError({ message: "Fixed fixture failure" }).cause
        ).toEqual(Option.none());
      })
  );
});
