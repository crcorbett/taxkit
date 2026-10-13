import { BunRuntime, BunServices } from "@effect/platform-bun";
import { DocsPublicCatalogue } from "@taxkit/content/schemas";
import { Console, Effect, FileSystem, Layer, Path, Schema } from "effect";

import { DocsCatalogueSourceLive } from "./catalogue-source.layer.js";
import { projectPublicCatalogue } from "./catalogue.policy.js";
import { DocsCatalogueBuildError } from "./errors.js";
import { DocsContentServiceLive } from "./live.layer.js";
import { DocsContentService } from "./service.js";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const content = yield* DocsContentService;
  const catalogue = yield* projectPublicCatalogue(
    yield* content.listPages(),
    yield* content.getNavigation()
  );
  const json = yield* Schema.encodeEffect(
    Schema.fromJsonString(DocsPublicCatalogue)
  )(catalogue).pipe(
    Effect.mapError(() => new DocsCatalogueBuildError({ operation: "encode" }))
  );
  const output = yield* path.fromFileUrl(
    new URL("../.source/public-catalogue.json", import.meta.url)
  );
  yield* fs
    .writeFileString(output, json)
    .pipe(
      Effect.mapError(() => new DocsCatalogueBuildError({ operation: "write" }))
    );
  yield* Console.log(
    `Built ${catalogue.pages.length} published documentation pages.`
  );
}).pipe(
  Effect.provide(
    DocsContentServiceLive.pipe(Layer.provide(DocsCatalogueSourceLive))
  ),
  Effect.tapErrorTag("DocsCatalogueBuildError", (error) =>
    Console.error(`Catalogue not written: ${error.operation} failed.`)
  ),
  Effect.provide(BunServices.layer)
);

BunRuntime.runMain(program);
