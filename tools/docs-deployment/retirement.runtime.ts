import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import { Console, Effect, Match } from "effect";

import { DocsDeploymentRetiredError } from "./retirement.schemas.js";

export const refuseRetiredDocsDeployment = Effect.gen(function* () {
  yield* Console.error(
    "The old documentation deployment is retired in this checkout. Recovery: docs/documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json. New API/Website provider operations need their own reviewed procedure and approval."
  );
  return yield* new DocsDeploymentRetiredError({});
});

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(refuseRetiredDocsDeployment, {
      disableErrorReporting: true,
    })
  ),
  Match.orElse(() => false)
);
