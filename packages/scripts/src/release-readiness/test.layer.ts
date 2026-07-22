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
import type { ReleaseCheckId, ReleaseTerminalState } from "./schemas.js";
import { ReleaseCommandOutcome, ReleaseDetailArtifact } from "./schemas.js";
import { ReleaseCommandRunner } from "./service.js";

const testDigest = `sha256:${"a".repeat(64)}`;

export class TestCommandOutput extends Data.TaggedClass("TestCommandOutput")<{
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
  readonly terminalState?: ReleaseTerminalState;
}> {}

export class TestCommandStartFailure extends Data.TaggedClass(
  "TestCommandStartFailure"
)<{
  readonly message: string;
  readonly terminalState?: ReleaseTerminalState;
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
                      observedExitCode: null,
                      stderrDetail: null,
                      stdoutDetail: null,
                      terminalState: "start-failure",
                    })
                  ),
                onSome: Match.typeTags<TestCommandResult>()({
                  TestCommandOutput: (output) => {
                    const terminalState =
                      output.terminalState ??
                      (output.exitCode === 0 ? "success" : "non-zero-exit");
                    const outcome = new ReleaseCommandOutcome({
                      check,
                      exitCode: output.exitCode,
                      stderrDetail: new ReleaseDetailArtifact({
                        path: `tmp/release-readiness/${check.id}-stderr.log`,
                        sha256: testDigest,
                      }),
                      stderrExcerpt: output.stderr.slice(0, 1024),
                      stdoutDetail: new ReleaseDetailArtifact({
                        path: `tmp/release-readiness/${check.id}-stdout.log`,
                        sha256: testDigest,
                      }),
                      stdoutExcerpt: output.stdout.slice(0, 1024),
                      terminalState,
                    });

                    return Effect.succeed(outcome);
                  },
                  TestCommandStartFailure: ({ message, terminalState }) =>
                    Effect.fail(
                      new ReleaseCommandExecutionError({
                        check,
                        message,
                        observedExitCode: null,
                        stderrDetail: null,
                        stdoutDetail: null,
                        terminalState: terminalState ?? "start-failure",
                      })
                    ),
                }),
              })
            )
          )
        ),
    });

    return { invocations, layer };
  });
