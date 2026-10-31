import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { Console, Effect } from "effect";
import * as Path from "effect/Path";

import { checkDocumentation } from "./check.boundary.js";

const program = Effect.gen(function* () {
  const path = yield* Path.Path;
  const root = yield* path.fromFileUrl(new URL("../..", import.meta.url));
  const checked = yield* checkDocumentation({
    repositoryRoot: root,
  });
  yield* Console.log(`Documentation check passed for ${checked} documents.`);
}).pipe(
  Effect.tapErrorTag("DocumentationError", (error) =>
    Console.error(["Documentation check failed:", ...error.findings].join("\n"))
  ),
  Effect.provide(BunServices.layer)
);
BunRuntime.runMain(program);
