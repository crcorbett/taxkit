import { NodeServices } from "@effect/platform-node";
import { assert, it } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";
import * as Base64 from "effect/encoding/Base64";

it.effect("embedded font matches the pinned Geist package byte for byte", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const embedded = yield* fs.readFileString(
      yield* path.fromFileUrl(
        new URL("../src/geist-latin.base64.txt", import.meta.url)
      )
    );
    const source = yield* fs.readFile(
      yield* path.fromFileUrl(
        new URL(
          "../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
          import.meta.url
        )
      )
    );
    assert.deepStrictEqual(
      yield* Effect.fromResult(Base64.decode(embedded)),
      source
    );
  }).pipe(Effect.provide(NodeServices.layer))
);
