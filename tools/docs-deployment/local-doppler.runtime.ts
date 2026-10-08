import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import { Match } from "effect";

import { refuseRetiredDocsDeployment } from "./retirement.runtime.js";

Match.value(import.meta.main).pipe(
  Match.when(true, () =>
    BunRuntime.runMain(refuseRetiredDocsDeployment, {
      disableErrorReporting: true,
    })
  ),
  Match.orElse(() => false)
);
