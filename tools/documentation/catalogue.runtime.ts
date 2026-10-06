import { BunRuntime, BunServices } from "@effect/platform-bun";
import { DocsCatalogueSourceLive } from "@taxkit/docs-content/catalogue-source";
import { DocsContentServiceLive } from "@taxkit/docs-content/live";
import { Console, Effect, Layer, Path } from "effect";

import {
  buildPublicCatalogue,
  readCatalogueAcceptance,
  writePublicCatalogue,
} from "./catalogue.build.js";

const program = Effect.gen(function* () {
  const path = yield* Path.Path;
  const repositoryRoot = yield* path.fromFileUrl(
    new URL("../..", import.meta.url)
  );
  // Capture acceptance before constructing the compiler Layer.
  const records = yield* readCatalogueAcceptance(repositoryRoot);
  const catalogue = yield* buildPublicCatalogue(repositoryRoot, records).pipe(
    Effect.provide(
      DocsContentServiceLive.pipe(Layer.provide(DocsCatalogueSourceLive))
    )
  );
  yield* writePublicCatalogue(repositoryRoot, catalogue);
  yield* Console.log(
    `Built ${catalogue.pages.length} accepted documentation pages. This local file does not prove publication or deployment.`
  );
}).pipe(
  Effect.tapErrorTag("DocsCatalogueBuildError", (error) =>
    Console.error(
      error.operation === "no-accepted-pages"
        ? "Catalogue not written: no pages have been accepted. Review the authored pages and bind their exact source hashes before building public output."
        : `Catalogue not written: ${error.operation} failed. Check the page acceptance records and reviewed source files.`
    )
  ),
  Effect.provide(BunServices.layer)
);

BunRuntime.runMain(program);
