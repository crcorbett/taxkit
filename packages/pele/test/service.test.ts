import { assert, describe, it } from "@effect/vitest";
import { PeleRenderError } from "@taxkit/pele/errors";
import { PeleLive } from "@taxkit/pele/live";
import { Source, Svg } from "@taxkit/pele/schemas";
import { Pele } from "@taxkit/pele/service";
import {
  Function as EffectFunction,
  Array,
  Effect,
  Option,
  Schema,
} from "effect";
import * as TestClock from "effect/testing/TestClock";

import { PeleTest } from "../src/test.layer.js";

describe("Pele SVG service", () => {
  it.effect("renders diagrams without MDX or publication metadata", () =>
    Effect.gen(function* () {
      const pele = yield* Pele;
      yield* EffectFunction.pipe(
        [
          "flowchart LR\n A[Author] --> B[Reader]",
          "sequenceDiagram\n Alice->>Bob: Hello",
        ],
        Effect.forEach((text) =>
          Effect.gen(function* () {
            const source = yield* Source.makeEffect(text);
            const first = yield* pele.renderSvg({
              source,
              typography: Option.none(),
            });
            const second = yield* pele.renderSvg({
              source,
              typography: Option.none(),
            });
            assert.strictEqual(first, second);
            assert.isTrue(Schema.is(Svg)(first));
            assert.include(first, 'class="pele');
          })
        )
      );
    }).pipe(Effect.provide(PeleLive))
  );

  it.effect("renders Gantt's today marker with the Effect clock", () =>
    Effect.gen(function* () {
      const pele = yield* Pele;
      const source = yield* Source.makeEffect(
        "gantt\n dateFormat YYYY-MM-DD\n section Work\n Build :a, 2026-01-01, 10d"
      );
      // 2026-01-04 UTC, within the chart's explicit date range.
      yield* TestClock.setTime(1_767_484_800_000);
      const first = yield* pele.renderSvg({
        source,
        typography: Option.none(),
      });
      assert.include(first, 'class="pele-today"');
      assert.strictEqual(
        yield* pele.renderSvg({ source, typography: Option.none() }),
        first
      );
      yield* TestClock.adjust("1 day");
      assert.notStrictEqual(
        yield* pele.renderSvg({ source, typography: Option.none() }),
        first
      );
    }).pipe(Effect.provide(PeleLive))
  );

  it.effect.each([
    { reason: "unsupported-diagram", text: "private-source-with-no-diagram" },
    { reason: "syntax", text: "flowchart LR\n A -->" },
    {
      reason: "semantic",
      text: "gantt\n dateFormat YYYY-MM-DD\n section Work\n Build :a, invalid, 10d",
    },
  ])(
    "keeps the $reason code without retaining authored source",
    ({ reason, text }) =>
      Effect.gen(function* () {
        const pele = yield* Pele;
        const source = yield* Source.makeEffect(text);
        const error = yield* pele
          .renderSvg({ source, typography: Option.none() })
          .pipe(Effect.flip);
        assert.isTrue(Schema.is(PeleRenderError)(error));
        assert.strictEqual(error.reason, reason);
        assert.notInclude(error.message, source);
        assert.notProperty(error, "snippet");
        assert.notProperty(error, "source");
        assert.notProperty(error, "cause");
      }).pipe(Effect.provide(PeleLive))
  );

  it.effect("applies the provider's edge limit", () =>
    Effect.gen(function* () {
      const pele = yield* Pele;
      const left = EffectFunction.pipe(
        Array.makeBy(71, (index) => `L${index}`),
        Array.join(" & ")
      );
      const right = EffectFunction.pipe(
        Array.makeBy(71, (index) => `R${index}`),
        Array.join(" & ")
      );
      const source = yield* Source.makeEffect(
        `flowchart LR\n ${left} --> ${right}`
      );
      const error = yield* pele
        .renderSvg({ source, typography: Option.none() })
        .pipe(Effect.flip);
      assert.strictEqual(error.reason, "limit");
    }).pipe(Effect.provide(PeleLive))
  );

  it.effect(
    "provides the same contract through its deterministic test Layer",
    () =>
      Effect.gen(function* () {
        const pele = yield* Pele;
        const source = yield* Source.makeEffect("flowchart LR\n A --> B");
        const svg = yield* pele.renderSvg({
          source,
          typography: Option.none(),
        });
        assert.isTrue(Schema.is(Svg)(svg));
      }).pipe(Effect.provide(PeleTest))
  );
});
