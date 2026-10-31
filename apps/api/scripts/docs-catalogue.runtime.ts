import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import { DocsImageArchive, DocsPublicCatalogue } from "@taxkit/content/schemas";
import { ContentCatalogue } from "@taxkit/content/service";
import { renderDocsImageArchive } from "@taxkit/og-image/archive";
import { DocsPageRendererLive } from "@taxkit/og-image/takumi";
import { Effect, Layer, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";

import { DocsCatalogueBuildLive } from "../src/build/docs-catalogue.layer.js";

// Writes the checked public catalogue and every page's share image before the
// API compiles. The Worker decodes finished pages and images instead of
// parsing MDX, highlighting code, drawing diagrams or rendering images on a
// request, and carries no image renderer.
export const writeDocsCatalogue = Effect.gen(function* writeDocsCatalogue() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const generated = yield* path.fromFileUrl(
    new URL("../src/generated/", import.meta.url)
  );
  const catalogue = yield* ContentCatalogue.pipe(
    Effect.flatMap(
      Schema.encodeEffect(Schema.fromJsonString(DocsPublicCatalogue))
    )
  );
  const images = yield* renderDocsImageArchive.pipe(
    Effect.flatMap(
      Schema.encodeEffect(
        Schema.fromJsonString(Schema.toCodecJson(DocsImageArchive))
      )
    )
  );
  yield* fs.makeDirectory(generated, { recursive: true });
  yield* fs.writeFileString(
    path.join(generated, "docs-catalogue.json"),
    catalogue
  );
  yield* fs.writeFileString(path.join(generated, "docs-images.json"), images);
}).pipe(
  Effect.provide(Layer.merge(DocsCatalogueBuildLive, DocsPageRendererLive))
);

if (import.meta.main) {
  BunRuntime.runMain(
    writeDocsCatalogue.pipe(Effect.provide(BunServices.layer))
  );
}
