import { Context } from "effect";
import type { Effect } from "effect";

import type { ReleaseCommandExecutionError } from "./errors.js";
import type { ReleaseCheck, ReleaseCommandOutcome } from "./schemas.js";

export class ReleaseCommandRunner extends Context.Service<
  ReleaseCommandRunner,
  {
    readonly execute: (
      check: ReleaseCheck
    ) => Effect.Effect<ReleaseCommandOutcome, ReleaseCommandExecutionError>;
  }
>()("@taxkit/scripts/ReleaseCommandRunner") {}
