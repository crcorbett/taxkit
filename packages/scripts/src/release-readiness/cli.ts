import { Effect, Schema } from "effect";

import { ReleaseReadinessCliError } from "./errors.js";
import { ReleaseReadinessCliArguments } from "./schemas.js";

export const decodeReleaseReadinessCli = (args: readonly string[]) =>
  Schema.decodeUnknownEffect(ReleaseReadinessCliArguments)(args).pipe(
    Effect.map((accepted) => ({
      mode: accepted.length === 0 ? ("candidate" as const) : ("ci" as const),
    })),
    Effect.mapError(
      () => new ReleaseReadinessCliError({ target: "release:check arguments" })
    )
  );
