import { BunRuntime, BunServices } from "@effect/platform-bun";
import { DocsPublicCatalogue } from "@taxkit/content/schemas";
import {
  Array,
  Console,
  Effect,
  FileSystem,
  Layer,
  Path,
  Schema,
} from "effect";

import { DocsCatalogueSourceLive } from "./catalogue-source.layer.js";
import { projectPublicCatalogue } from "./catalogue.policy.js";
import {
  DocsCatalogueBuildError,
  DocsValidationFailedError,
} from "./errors.js";
import { DocsContentServiceLive } from "./live.layer.js";
import { docsPublicLinkProfile } from "./public-links.profile.js";
import { DocsContentService } from "./service.js";
import {
  readCheckedExampleSnapshot,
  validateCheckedExamplePublication,
} from "./validation/checked-example-publication.boundary.js";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const content = yield* DocsContentService;
  const pages = yield* content.listPages();
  const repositoryRoot = yield* path.fromFileUrl(
    new URL("../../../", import.meta.url)
  );
  const snapshot = yield* readCheckedExampleSnapshot(
    repositoryRoot,
    docsPublicLinkProfile
  );
  const exampleIssues = validateCheckedExamplePublication(
    pages,
    snapshot,
    docsPublicLinkProfile
  );
  if (Array.isReadonlyArrayNonEmpty(exampleIssues)) {
    return yield* Effect.fail(
      new DocsValidationFailedError({
        issues: Array.map(exampleIssues, (issue) => issue.message),
      })
    );
  }
  const catalogue = yield* projectPublicCatalogue(
    pages,
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
  return yield* Effect.void;
}).pipe(
  Effect.provide(
    DocsContentServiceLive.pipe(Layer.provide(DocsCatalogueSourceLive))
  ),
  Effect.tapErrorTag("DocsValidationFailedError", (error) =>
    Console.error(Array.join(error.issues, "\n"))
  ),
  Effect.tapErrorTag("DocsCatalogueBuildError", (error) =>
    Console.error(`Catalogue not written: ${error.operation} failed.`)
  ),
  Effect.provide(BunServices.layer)
);

BunRuntime.runMain(program);
