import {
  Array,
  Data,
  Effect,
  HashMap,
  Layer,
  Match,
  Option,
  Ref,
} from "effect";

import { ReleaseCommandExecutionError } from "./errors.js";
import type { ReleaseCheckId } from "./schemas.js";
import { ReleaseCommandOutcome } from "./schemas.js";
import { ReleaseCommandRunner } from "./service.js";

export class TestCommandOutput extends Data.TaggedClass("TestCommandOutput")<{
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}> {}

export class TestCommandStartFailure extends Data.TaggedClass(
  "TestCommandStartFailure"
)<{
  readonly message: string;
}> {}

export type TestCommandResult = TestCommandOutput | TestCommandStartFailure;

export const makeReleaseCommandRunnerTest = (
  results: HashMap.HashMap<ReleaseCheckId, TestCommandResult>
) =>
  Effect.gen(function* makeReleaseCommandRunnerTestLayer() {
    const invocations = yield* Ref.make<
      readonly ReleaseCommandOutcome["check"][]
    >([]);
    const layer = Layer.succeed(ReleaseCommandRunner, {
      execute: (check) =>
        Ref.update(invocations, Array.append(check)).pipe(
          Effect.andThen(
            HashMap.get(results, check.id).pipe(
              Option.match({
                onNone: () =>
                  Effect.fail(
                    new ReleaseCommandExecutionError({
                      check,
                      message: `No deterministic result exists for ${check.id}.`,
                    })
                  ),
                onSome: Match.typeTags<TestCommandResult>()({
                  TestCommandOutput: (output) => {
                    const outcome = new ReleaseCommandOutcome({
                      check,
                      exitCode: output.exitCode,
                      stderr: output.stderr,
                      stdout: output.stdout,
                    });

                    return Effect.succeed(outcome);
                  },
                  TestCommandStartFailure: ({ message }) =>
                    Effect.fail(
                      new ReleaseCommandExecutionError({ check, message })
                    ),
                }),
              })
            )
          )
        ),
    });

    return { invocations, layer };
  });
