import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { PullRequestStage } from "@taxkit/observability/stage";
import {
  Function as EffectFunction,
  Array,
  Console,
  Effect,
  Match,
  Option,
  Runtime,
  Schema,
  Stdio,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

// The root `pr:*` scripts and the Checks cleanup guard share this one entry.
// `check` only decodes the stage; the others build, then run native Alchemy.
const Operation = Schema.Literals(["check", "plan", "deploy", "destroy"]);

class PreviewStageUsageError extends Schema.TaggedError<
  PreviewStageUsageError,
  { readonly brand: unique symbol }
>()("PreviewStageUsageError", { message: Schema.String }) {
  // The usage message is printed below; 64 is the conventional usage status.
  override readonly [Runtime.errorExitCode] = 64;
}

class PreviewCommandFailed extends Schema.TaggedError<
  PreviewCommandFailed,
  { readonly brand: unique symbol }
>()("PreviewCommandFailed", { command: Schema.String, exitCode: Schema.Int }) {
  // The child wrote its own diagnostics; keep its exit status.
  override get [Runtime.errorExitCode]() {
    return this.exitCode;
  }
}

const usage = (message: string) =>
  Effect.fail(new PreviewStageUsageError({ message }));

// Run one child with inherited terminal streams; a non-zero status stops.
const run = Effect.fnUntraced(function* ({
  args,
  command,
}: {
  readonly args: readonly string[];
  readonly command: string;
}) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(
    ChildProcess.make(command, args, {
      stderr: "inherit",
      stdin: "inherit",
      stdout: "inherit",
    })
  );
  if (exitCode !== 0) {
    return yield* new PreviewCommandFailed({
      command: [command, ...args].join(" "),
      exitCode,
    });
  }
});

const program = Effect.gen(function* () {
  const stdio = yield* Stdio.Stdio;
  const args = yield* stdio.args;
  const operation = yield* EffectFunction.pipe(
    Array.head(args),
    Option.getOrUndefined,
    Schema.decodeUnknownEffect(Operation),
    Effect.mapError(
      () =>
        new PreviewStageUsageError({
          message: "The preview operation is check, plan, deploy or destroy",
        })
    )
  );
  const script = `pr:${operation}`;
  const stage = yield* EffectFunction.pipe(
    Array.get(args, 1),
    Option.getOrUndefined,
    Schema.decodeUnknownEffect(PullRequestStage),
    Effect.mapError(
      () =>
        new PreviewStageUsageError({
          message: `${script} needs a pr-<number> stage`,
        })
    )
  );
  const forwarded = Array.drop(args, 2);
  if (
    EffectFunction.pipe(
      forwarded,
      Array.some((arg) => arg === "--stage" || arg.startsWith("--stage="))
    )
  ) {
    return yield* usage(`${script} takes the stage only as its first argument`);
  }
  if (operation === "check") {
    return;
  }
  // Plans and destroys import the API's docs catalogue; a deploy builds both.
  yield* run({
    args: Match.value(operation).pipe(
      Match.when("deploy", () => ["run", "build"]),
      Match.orElse(() => ["run", "build", "--filter=api"])
    ),
    command: "bun",
  });
  yield* run({
    args: [operation, "--stage", stage, ...forwarded],
    command: "alchemy",
  });
}).pipe(
  // Each failure is reported once: usage here, children on their own streams.
  Effect.tapErrorTag("PreviewStageUsageError", (error) =>
    Console.error(error.message)
  ),
  Effect.tapErrorTag("PlatformError", (error) =>
    Console.error(`Could not run a preview command: ${error.message}`)
  ),
  Effect.provide(BunServices.layer)
);

BunRuntime.runMain(program, { disableErrorReporting: true });
