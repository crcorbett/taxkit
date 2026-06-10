import { BunRuntime } from "@effect/platform-bun";
import { Effect, Option } from "effect";

import { DocsValidationFailedError } from "./errors.js";
import { validateContent, validationSummary } from "./validation/policy.js";

const program = validateContent.pipe(
  Effect.flatMap((result) =>
    validationSummary(result).pipe(
      Option.match({
        onNone: () =>
          Effect.sync(() => {
            console.log(
              `Validated docs content with ${result.issues.length} issue(s).`
            );
          }),
        onSome: (summary) =>
          Effect.fail(
            new DocsValidationFailedError({
              issues: summary.split("\n"),
            })
          ),
      })
    )
  ),
  Effect.catchTag("DocsSourceError", (error) =>
    Effect.sync(() => {
      console.error(error.cause);
      process.exitCode = 1;
    })
  ),
  Effect.catchTag("DocsValidationFailedError", (error) =>
    Effect.sync(() => {
      console.error(error.issues.join("\n"));
      process.exitCode = 1;
    })
  )
);

BunRuntime.runMain(program);
