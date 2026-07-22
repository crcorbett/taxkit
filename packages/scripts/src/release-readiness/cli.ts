import { Effect, Schema } from "effect";

import { ReleaseReadinessCliError } from "./errors.js";
import { ReleaseReadinessCli } from "./schemas.js";

const decodeCliInput = (args: readonly string[]) => {
  if (args.length === 0) {
    return { mode: "candidate" };
  }
  if (args.length === 1 && args[0] === "--ci") {
    return { mode: "ci" };
  }
  return { mode: "invalid" };
};

export const decodeReleaseReadinessCli = (args: readonly string[]) =>
  Schema.decodeUnknownEffect(ReleaseReadinessCli)(decodeCliInput(args)).pipe(
    Effect.mapError(
      () => new ReleaseReadinessCliError({ target: "release:check arguments" })
    )
  );
