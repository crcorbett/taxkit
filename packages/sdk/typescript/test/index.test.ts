import { expect, it } from "@effect/vitest";
import {
  Function as EffectFunction,
  Effect,
  Predicate,
  Result,
  Schema,
  Struct,
} from "effect";

import { AuPayTakeHomeCalculation } from "../src/au.js";
import { TaxKitError } from "../src/errors.js";
import { calculate, calculateSafe, createClient } from "../src/index.js";
import { takeHomeFacts } from "./fixtures.js";

it.effect(
  "uses native Result with an owning JSON codec in the vanilla facade",
  () =>
    Effect.gen(function* () {
      const report = yield* Effect.promise(() =>
        calculate(AuPayTakeHomeCalculation, takeHomeFacts)
      );
      const result = yield* Effect.promise(() =>
        calculateSafe(AuPayTakeHomeCalculation, takeHomeFacts)
      );
      EffectFunction.pipe(Result.isSuccess(result), (actual) => {
        expect(actual).toBeTruthy();
      });
      const codec = Schema.toCodecJson(
        Schema.Result(AuPayTakeHomeCalculation.outputSchema, TaxKitError)
      );
      const encoded = yield* Schema.encodeEffect(codec)(result);
      const restored = yield* Schema.decodeEffect(codec)(encoded);
      expect(restored).toStrictEqual(Result.succeed(report));
    })
);
it.effect("supports caller-owned async disposal", () =>
  Effect.gen(function* () {
    const client = createClient();
    yield* Effect.promise(() =>
      client.calculate(AuPayTakeHomeCalculation, takeHomeFacts)
    );
    yield* EffectFunction.pipe(
      client,
      Struct.get(Symbol.asyncDispose),
      Effect.promise
    );
    const result = yield* Effect.promise(() =>
      client.calculateSafe(AuPayTakeHomeCalculation, takeHomeFacts)
    );
    EffectFunction.pipe(Result.isFailure(result), (actual) => {
      expect(actual).toBeTruthy();
    });
    if (Result.isFailure(result)) {
      EffectFunction.pipe(
        Predicate.isTagged(result.failure, "TaxKitClientDisposedError"),
        (actual) => {
          expect(actual).toBeTruthy();
        }
      );
    }
  })
);
