import { Effect, Match } from "effect";

import { ReleaseCheckFailedError } from "./errors.js";
import type { ReleaseCheck } from "./schemas.js";
import { ReleaseReadinessReport } from "./schemas.js";
import { ReleaseCommandRunner } from "./service.js";

export const runReleaseReadiness = (checks: readonly ReleaseCheck[]) =>
  Effect.gen(function* releaseReadinessProgram() {
    const commandRunner = yield* ReleaseCommandRunner;
    const outcomes = yield* Effect.forEach(
      checks,
      (check) =>
        Effect.gen(function* runReleaseCheck() {
          const outcome = yield* commandRunner.execute(check);

          return yield* Match.value(outcome.exitCode).pipe(
            Match.when(0, () => Effect.succeed(outcome)),
            Match.orElse(() =>
              Effect.fail(new ReleaseCheckFailedError({ outcome }))
            )
          );
        }),
      { concurrency: 1 }
    );

    return new ReleaseReadinessReport({ outcomes });
  });
