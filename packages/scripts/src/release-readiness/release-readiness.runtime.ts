import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Console, Effect, Layer } from "effect";
import * as Path from "effect/Path";

import {
  formatReleaseReadinessError,
  ReleaseWorkspacePathError,
} from "./errors.js";
import { ReleaseCommandRunnerLive } from "./live.layer.js";
import { runReleaseReadiness } from "./program.js";
import {
  makeReleaseReadinessPlan,
  renderReleaseReadinessReport,
} from "./schemas.js";

const workspaceRootUrl = new URL("../../../..", import.meta.url);
const ReleaseReadinessRuntimeLive = ReleaseCommandRunnerLive.pipe(
  Layer.provideMerge(BunServices.layer)
);

const program = Effect.gen(function* releaseReadinessMain() {
  const path = yield* Path.Path;
  const workspaceRoot = yield* path.fromFileUrl(workspaceRootUrl).pipe(
    Effect.mapError(
      (cause) =>
        new ReleaseWorkspacePathError({
          message: cause.message,
          url: workspaceRootUrl.toString(),
        })
    )
  );

  return yield* runReleaseReadiness(makeReleaseReadinessPlan(workspaceRoot));
}).pipe(
  Effect.tap((report) => Console.info(renderReleaseReadinessReport(report))),
  Effect.tapErrorTag("ReleaseCheckFailedError", (error) =>
    Console.error(formatReleaseReadinessError(error))
  ),
  Effect.tapErrorTag("ReleaseCommandExecutionError", (error) =>
    Console.error(formatReleaseReadinessError(error))
  ),
  Effect.tapErrorTag("ReleaseWorkspacePathError", (error) =>
    Console.error(formatReleaseReadinessError(error))
  ),
  Effect.provide(ReleaseReadinessRuntimeLive)
);

BunRuntime.runMain(program);
