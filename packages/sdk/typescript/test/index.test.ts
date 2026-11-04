import { expect, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";
import { AuPayTakeHomeCalculation } from "../src/au.js";
import { calculate, calculateSafe, createClient } from "../src/index.js";
import { TaxKitError } from "../src/errors.js";
import { takeHomeFacts } from "./fixtures.js";

it.effect("uses native Result with an owning JSON codec in the vanilla facade", () => Effect.gen(function* () {
  const report = yield* Effect.promise(() => calculate(AuPayTakeHomeCalculation, takeHomeFacts));
  const result = yield* Effect.promise(() => calculateSafe(AuPayTakeHomeCalculation, takeHomeFacts));
  expect(Result.isSuccess(result)).toBe(true);
  const codec = Schema.toCodecJson(Schema.Result(AuPayTakeHomeCalculation.outputSchema, TaxKitError));
  const encoded = yield* Schema.encodeEffect(codec)(result);
  const restored = yield* Schema.decodeEffect(codec)(encoded);
  expect(restored).toStrictEqual(Result.succeed(report));
}));
it.effect("supports caller-owned async disposal", () => Effect.gen(function* () {
  const client = createClient();
  yield* Effect.promise(() => client.calculate(AuPayTakeHomeCalculation, takeHomeFacts));
  yield* Effect.promise(() => client[Symbol.asyncDispose]());
  const result = yield* Effect.promise(() => client.calculateSafe(AuPayTakeHomeCalculation, takeHomeFacts));
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) expect(result.failure._tag).toBe("TaxKitClientDisposedError");
}));
