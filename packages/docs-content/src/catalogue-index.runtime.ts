import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Path } from "effect";
import { postInstall } from "fumadocs-mdx/vite";

import { DocsSourceError } from "./errors.js";

// The SDK owns source discovery and index generation. Keep this native index
// separate from the Vite index used by the retained docs app.
const program = Effect.gen(function* () {
  const path = yield* Path.Path;
  const configPath = yield* path.fromFileUrl(
    new URL("../source.config.ts", import.meta.url)
  );
  const outDir = yield* path.fromFileUrl(
    new URL("../.source/catalogue", import.meta.url)
  );
  yield* Effect.tryPromise({
    catch: () =>
      new DocsSourceError({
        message: "The catalogue source index could not be generated.",
        operation: "read",
      }),
    try: () =>
      postInstall({
        configPath,
        index: { browser: false, dynamic: false, target: "default" },
        outDir,
      }),
  });
}).pipe(
  Effect.mapError(
    () =>
      new DocsSourceError({
        message: "The catalogue source index could not be generated.",
        operation: "read",
      })
  ),
  Effect.provide(BunServices.layer)
);

BunRuntime.runMain(program);
