import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { DocsPublicCatalogue } from "@taxkit/content/schemas";
import { ContentCatalogue } from "@taxkit/content/service";
import { Effect, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { DocsCatalogueBuildLive } from "./docs-catalogue.layer.js";

// Writes the checked public catalogue before the API compiles, so the Worker
// decodes finished pages at startup instead of parsing MDX, highlighting code
// and drawing diagrams on its first request.
export const writeDocsCatalogue = Effect.gen(function* writeDocsCatalogue() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const target = yield* path.fromFileUrl(
    new URL("../src/generated/docs-catalogue.json", import.meta.url)
  );
  const json = yield* ContentCatalogue.pipe(
    Effect.flatMap(
      Schema.encodeEffect(Schema.fromJsonString(DocsPublicCatalogue))
    )
  );
  yield* fs.makeDirectory(path.dirname(target), { recursive: true });
  yield* fs.writeFileString(target, json);
}).pipe(Effect.provide(DocsCatalogueBuildLive));

if (import.meta.main) {
  BunRuntime.runMain(
    writeDocsCatalogue.pipe(Effect.provide(BunServices.layer))
  );
}
