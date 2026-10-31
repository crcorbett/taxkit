import {
  describe as effectDescribe,
  expect as effectExpect,
  it as effectIt,
} from "@effect/vitest";
import { Data, Effect, Match, Schema } from "effect";
import { describe, expect, it } from "vitest";

class ExpectedError extends Data.TaggedError("ExpectedError")<{
  readonly cause: string;
}>() {}

const Output = Schema.String;
const encodeOutput = Schema.encodeUnknownResult(Output);

export const acceptedTestApis = {
  describe,
  effectDescribe,
  effectExpect,
  effectIt,
  expect,
  it,
};

export const acceptedService = (
  input: string
): Effect.Effect<string, ExpectedError> => Effect.succeed(input);

export const acceptedTaggedValue = new ExpectedError({ cause: "expected" });

export const acceptedEncodedOutput = encodeOutput("accepted");

export const acceptedPromiseBoundary = Effect.tryPromise({
  catch: (cause) => new ExpectedError({ cause: String(cause) }),
  try: () => Promise.resolve("accepted"),
});

export const acceptedMatch = (value: "first" | "second") =>
  Match.value(value).pipe(
    Match.when("first", () => 1),
    Match.when("second", () => 2),
    Match.exhaustive
  );

export const acceptedRuntime = Effect.runPromise(Effect.succeed("accepted"));

export const acceptedArguments = process.argv;

console.log("portable Effect rule fixture accepted");
